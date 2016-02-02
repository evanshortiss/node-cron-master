'use strict';

var CronMasterJob = require('lib/cron-master-job');

module.exports = new CronMasterJob({
  cronParams: {
    start: false,
    cronTime: '* * * * * *',
    onTick: function (master, done) {
      setTimeout(function () {
        done(null, 'ok');
      }, 1500);
    }
  }
});
