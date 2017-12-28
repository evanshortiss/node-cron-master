'use strict'

const format = require('util').format
const async = require('async')
const path = require('path')
const fs = require('fs')
const CronMasterJob = require('./lib/cron-master-job')
const EVENTS = require('./lib/events')

/**
 * CronMasterJob Class accepts a params object to create CronJob wrappers
 * @type {CronMasterJob}
 */
exports.CronMasterJob = CronMasterJob

/**
 * Events that can be bound to.
 * @type {Object}
 */
exports.EVENTS = EVENTS

/**
 * Returns a cron job manager instance
 * @return Manager
 */
exports.getInstance = function () {
  let jobs = []

  const manager = {
    /**
     * Check are the crons not running by verifying inProgress is false for all
     * @return {Boolean}
     */
    hasRunningJobs: () => {
      return manager.getRunningJobs().length !== 0
    },

    /**
     * Get the currently loaded jobs
     * @return {Array}
     */
    getJobs: () => {
      return jobs
    },

    /**
     * Returns any running cron jobs i.e job.inProgress is true (Boolean)
     * @return {Array}
     */
    getRunningJobs: () => {
      return jobs.filter(j => j.inProgress)
    },

    /**
     * Start all cron jobs that have been loaded
     * @param  {Function} callback
     */
    startJobs: (callback) => {
      async.each(jobs, function startJob (j, done) {
        j.start(done)
      }, callback)
    },

    /**
     * Stop all cron jobs that have been loaded.
     * @param  {Function} callback
     */
    stopJobs: (callback) => {
      async.each(jobs, function stopJob (j, done) {
        j.stop(done)
      }, callback)
    },

    /**
     * Loads the cron jobs at the specified path.
     * @param  {String}   folder
     * @param  {Function} callback
     */
    loadJobs: (folder, callback) => {
      function requireFile (file, done) {
        // Ensure we get a unique instance of the job any time it's loaded
        delete require.cache[require.resolve(path.join(folder, file))]

        var job = require(path.join(folder, file))

        if (job instanceof CronMasterJob) {
          done(null, job)
        } else {
          done(
            new Error(
              format('Invalid job file at "%s". All job files must have ' +
                'module.exports set to a CronMasterJob instance',
                path.join(folder, file)
              )
            ),
            null
          )
        }
      }

      function requireJobs (files, done) {
        async.map(files, requireFile, done)
      }

      // Always stop and clear existing jobs
      manager.stopJobs(function stopJobsCallback (err) {
        if (err) {
          callback(err, null)
        } else {
          jobs = null

          async.waterfall([
            fs.readdir.bind(fs, folder),
            requireJobs
          ], function loadJobsCallback (err, requiredJobs) {
            if (err) {
              callback(err)
            } else {
              jobs = requiredJobs
              callback(null, jobs)
            }
          })
        }
      })
    }
  }

  return manager
}
