'use strict';

var CronMasterJob = require('../../index.js').CronMasterJob;

module.exports = new CronMasterJob({

  // The usual params you can pass to the "cron" module CronJob
  cronParams: {
    cronTime: '* * * * * *',
    onTick: function (job, done) {
      // Create a random time to complete, within 0 - 2 seconds
      var t = Math.floor(Math.random() * 2000);

      setTimeout(function () {
        done(null, 'Example Job Result');
      }, t);
    }
  },

  // Triggers a warning if the job exceeded 1.5 seconds to complete
  timeThreshold: 1500,

  // Some meta data to assist the job/logging
  meta: {
    name: 'example-cron-job'
  }

});
