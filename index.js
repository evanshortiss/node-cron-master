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
var CronMasterJob = exports.CronMasterJob = require('lib/cron-master-job');


/**
 * Events that can be bound to.
 * @type {Object}
 */
exports.EVENTS = require('lib/events');


/**
 * Loads the cron jobs at the specified path.
 * @param  {String}   p
 * @param  {Function} callback
 */
exports.loadJobs = function (p, callback) {

  function requireFile (file, done) {
    try {
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
