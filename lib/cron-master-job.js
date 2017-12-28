'use strict'

const EventEmitter = require('events').EventEmitter
const inherits = require('util').inherits
const CronJob = require('cron').CronJob
const xtend = Object.assign
const CRON_EVENTS = require('./events')

/**
 * A CronJob wrapper that adds to the existing "cron" module
 * @param {Object} params
 */
function CronMasterJob (params) {
  if (!params.cronParams) {
    throw new Error('"cronParams" is required option and can include args ' +
      'supported by the "cron" module')
  }

  this.originalTickFn = params.cronParams.onTick.bind(params.cronParams.onTick)

  // Wrap a copy of the user's cron function to add features of this module
  // It's important that we wrap a *copy* (created using bind) and not the
  // original to prevent any surprises if they plan to use that function at
  // a later point in time for example
  params.cronParams.onTick = wrapCronFn.bind(this)(
    params.cronParams.onTick.bind(params.cronParams.onTick)
  )

  this.meta = params.meta || {}

  this._opts = xtend({
    timeThreshold: (2 * 1000 * 60), // Two minute default warning
    meta: {}
  }, params)

  this.meta = this._opts.meta
  this.inProgress = false

  this._thresholdTimer = null
  this._cronJob = new CronJob(params.cronParams)
}
module.exports = CronMasterJob
inherits(CronMasterJob, EventEmitter)

/**
 * The dreaded noop.
 * @return {undefined}
 */
function noop () {
  return undefined
}

/**
 * Wraps the user supplied cron function to enable this module to
 * provide more features over the cron module
 * @param  {Function} fn
 */
function wrapCronFn (fn) {
  var start = null

  /**
   * Callback that will be injected into a CronJob function
   * @param  {Error} err     An Error if one occured
   * @param  {Mixed} result Any result of the operation
   */
  function onCronComplete (callback, err, result) {
    var runningTime = Date.now() - start

    // Ensure we clear the threshold timer
    clearTimeout(this._thresholdTimer)

    // Flag the job as no longer running
    this.inProgress = false

    this.emit(CRON_EVENTS.TICK_COMPLETE, err, result, runningTime)
    callback(err, result, runningTime)
  }

  return (function cronTickFn (callback) {
    callback = callback || noop

    if (!this.inProgress) {
      start = Date.now()

      // Set the inProgress flag to true
      this.inProgress = true

      // Need to notify that the cron is starting
      this.emit(CRON_EVENTS.TICK_STARTED)

      /* istanbul ignore else */
      if (this._opts.timeThreshold !== 0 && this._opts.timeThreshold !== Infinity) {
        // Track the time being taken by the cron job and emit a warning
        // if it's taking too long to complete
        this._thresholdTimer = setTimeout(
          this.emit.bind(this, CRON_EVENTS.TIME_WARNING),
          this._opts.timeThreshold
        )
      }

      // Kick off the job and provide a callback to it
      fn(this, onCronComplete.bind(this, callback))
    } else {
      this.emit(CRON_EVENTS.OVERLAPPING_CALL)
    }
  }.bind(this))
}

/**
 * Start this job.
 * @param  {Function} callback
 */
CronMasterJob.prototype.start = function (callback) {
  callback = callback || noop

  this.emit(CRON_EVENTS.START_REQUESTED)

  this._cronJob.start()

  callback()
}

/**
 * Force run the job, even if it is already in progress.
 * @param  {Function} callback
 */
CronMasterJob.prototype.forceRun = function (callback) {
  callback = callback || noop

  this.originalTickFn(this, callback)
}

/**
 * Run the CronJob function. Will not run if it is already in progress.
 * @param {Function} callback
 */
CronMasterJob.prototype.run = function (callback) {
  this._opts.cronParams.onTick(callback)
}

/**
 * Stops all jobs. If jobs are in progress it will not stop them, you need to
 * do so yourself and then call the passed in callback
 * @param  {Function} callback
 */
CronMasterJob.prototype.stop = function (callback) {
  callback = callback || noop

  function onStopped () {
    this.emit(CRON_EVENTS.STOPPED)
    callback()
  }

  this.emit(CRON_EVENTS.STOP_REQUESTED)

  this._cronJob.stop()

  if (this.inProgress) {
    // If the cron is on progress then wait to emit the 'stopped' event
    this.once(CRON_EVENTS.TICK_COMPLETE, onStopped.bind(this))
  } else {
    onStopped.bind(this)()
  }
}
