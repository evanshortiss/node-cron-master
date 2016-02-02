'use strict';

var format = require('util').format
  , async = require('async')
  , path = require('path')
  , fs = require('fs')
  , jobs = null;


/**
 * CronMasterJob Class accepts a params object to create CronJob wrappers
 * @type {CronMasterJob}
 */
var CronMasterJob = exports.CronMasterJob = require('./lib/cron-master-job');


/**
 * Events that can be bound to.
 * @type {Object}
 */
exports.EVENTS = require('./lib/events');


/**
 * Check are the crons not running by verifying inProgress is false for all
 * @return {Boolean}
 */
exports.hasRunningJobs = function () {
  return (exports.getRunningJobs().length !== 0);
};


/**
 * Get the currently loaded jobs
 * @return {Array}
 */
exports.getJobs = function () {
  return jobs || [];
};


/**
 * Returns any running cron jobs i.e job.inProgress is true (Boolean)
 * @return {Array}
 */
exports.getRunningJobs = function () {
  if (jobs) {
    return jobs.filter(function (j) {
      return j.inProgress;
    });
  } else {
    return [];
  }
};


/**
 * Loads the cron jobs at the specified path.
 * @param  {String}   p
 * @param  {Function} callback
 */
exports.loadJobs = function (p, callback) {

  function requireFile (file, done) {
    try {
      // Ensure we get a unique instance of the job any time it's loaded
      delete require.cache[require.resolve(path.join(p, file))];

      var job = require(path.join(p, file));

      if (job instanceof CronMasterJob) {
        done(null, job);
      } else {
        done(
          new Error(
            format('Invalid job file at "%s". All job files must have ' +
              'module.exports set to a CronMasterJob instance',
              path.join(p, file)
            )
          ),
          null
        );
      }
    } catch (e) {
      done(e, null);
    }
  }

  function requireJobs (files, done) {
    async.map(files, requireFile, done);
  }

  // Always stop and clear existing jobs
  stopJobs(function stopJobsCallback (err) {
    if (err) {
      callback(err, null);
    } else {
      jobs = null;

      async.waterfall([
        fs.readdir.bind(fs, p),
        requireJobs
      ], function loadJobsCallback (err, requiredJobs) {
        if (err) {
          callback(err);
        } else {
          jobs = requiredJobs;
          callback(null, jobs);
        }
      });
    }
  });
};


/**
 * Start all cron jobs that have been loaded
 * @param  {Function} callback
 */
exports.startJobs = function (callback) {
 async.each(jobs, function startJob (j, done) {
    j.start(done);
  }, callback);
};


/**
 * Stop all cron jobs that have been loaded.
 * @param  {Function} callback
 */
var stopJobs = exports.stopJobs = function (callback) {
  async.each(jobs, function stopJob (j, done) {
    j.stop(done);
  }, callback);
};
