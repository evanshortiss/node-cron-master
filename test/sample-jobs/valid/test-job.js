'use strict';

var CronMasterJob = require('lib/cron-master-job');

module.exports = new CronMasterJob({
  cronParams: {
    cronTime: '* * * * * *',
    onTick: function (master, done) {
      done(null, 'ok');
    }
  }
});
