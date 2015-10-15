'use strict';

var EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits
  , CronJob = require('cron').CronJob
  , xtend = require('xtend')
  , CRON_EVENTS = require('./events');


/**
 * A CronJob wrapper that adds to the existing "cron" module
 * @param {Object} params
 */
function CronMasterJob (params) {
  if (!params.cronParams) {
    throw new Error('"cronParams" is required option and can include args '+
      'supported by the "cron" module');
  }

  // Wrap a copy of the user's cron function to add features of this module
  // It's important that we wrap a *copy* (created using bind) and not the
  // original to prevent any surprises if they plan to use that function at
  // a later point in time for example
  params.cronParams.onTick = wrapCronFn.bind(this)(
      params.cronParams.onTick.bind(params.cronParams.onTick)
    );

  this._inProgress = false;
  this._thresholdTimer = null;

  this._opts = xtend({
    timeThreshold: (2 * 1000 * 60) // Two minute default warning
  }, params);

  this._cronJob = new CronJob(params.cronParams);
}
module.exports = CronMasterJob;
inherits(CronMasterJob, EventEmitter);


/**
 * The dreaded noop.
 * @return {undefined}
 */
function noop () {
  return undefined;
}


/**
 * Wraps the user supplied cron function to enable this module to
 * provide more features over the cron module
 * @param  {Function} fn
 */
function wrapCronFn (fn) {

  var start = null;

  /**
   * Callback that will be injected into a CronJob function
   * @param  {Error} err     An Error if one occured
   * @param  {Mixed} result Any result of the operation
   */
  function onCronComplete (callback, err, result) {
    var runningTime = Date.now() - start
    this._inProgress = false;
    this.emit(CRON_EVENTS.TICK_COMPLETE, err, result, runningTime);
    callback(err, result, runningTime);
  }

  return (function cronTickFn (callback) {
    callback = callback || noop;

    if (!this._inProgress) {
      start = Date.now();

      // Set the inProgress flag to true
      this._inProgress = true;

      // Need to notify that the cron is starting
      this.emit(CRON_EVENTS.TICK_STARTED);

      // Track the time being taken by the cron job and emit a warning
      // if it's taking too long to complete
      if (this._opts.timeThreshold !== 0 &&
          this._opts.timeThreshold !== Infinity ) {
        this._thresholdTimer = setTimeout(
          this.emit.bind(this, CRON_EVENTS.TIME_WARNING),
          this._opts.timeThreshold
        );
      }

      // Kick off the job and provide a callback to it
      fn(this, onCronComplete.bind(this, callback));
    } else {
      this.emit(CRON_EVENTS.OVERLAPPING_CALL);
    }
  }.bind(this));
}


/**
 * Start this job.
 * @param  {Function} callback
 */
CronMasterJob.prototype.start = function (callback) {
  callback = callback || noop;

  this.emit(CRON_EVENTS.START_REQUESTED);

  this._cronJob.start();

  callback();
};


/**
 * Force the CronJob function to run.
 * @param {Function} [callback]
 */
CronMasterJob.prototype.forceRun = function (callback) {
  this._opts.cronParams.onTick(callback);
};


/**
 * Stops all jobs. If jobs are in progress it will not stop them, you need to
 * do so yourself and then call the passed in callback
 * @param  {Function} callback
 */
CronMasterJob.prototype.stop = function (callback) {
  callback = callback || noop;

  function onStopped () {
    this.emit(CRON_EVENTS.STOPPED);
    callback();
  }

  this.emit(CRON_EVENTS.STOP_REQUESTED);

  this._cronJob.stop();

  if (this._inProgress) {
    // If the cron is on progress then wait to emit the 'stopped' event
    this.once(CRON_EVENTS.TICK_COMPLETE, onStopped.bind(this));
  } else {
    onStopped.bind(this)();
  }
};


