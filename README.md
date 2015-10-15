cron-master
===========

cron-master provides a standardised way to manage your Node.js CronJobs created 
using the cron module.

Typically in projects I've seen instances of _CronJob_ from the fantastic cron 
module scattered throughout the codebase meaning they are hard to find and not 
managed in a consistent manner. cron-master encourages the pattern of storing 
all jobs in a single location, and ensures they all follow the same pattern. It 
also adds events to your _CronJob_ instances so you can add generic hooks for 
logging, detecting errors and overlapping calls. 

For example, if you have a job that runs every 5 minutes, did you remember to 
ensure that next time it runs the previous run has completed!? cron-master 
removes the need to check for that case, it simply won't let the same job run 
again until the currently running call has completed.

## Features

* Prevents a two versions of a CronJob running concurrently.
* Provides a structured way to create a manage jobs.
* Enables jobs to emit and receive events, also provides some default events.
* Automatically computes time taken by each CronMasterJob.
* Provides error, and/or result from each job via event.

## Install

Seemples.

```
npm install cron-master --save
```


## API

#### loadJobs(absolutePath, callback)
Loads all jobs contained in the specified folder, and place them under the 
managment of cron-master. Each file in the folder must have module.exports set 
to an instance of CronMasterJob.

The callback should be of the format _function(err, jobs)_. _jobs_ will be an 
Array of the managed jobs that were loaded.

```javascript
var path = require('path')
  , cmaster = require('cron-master');

cmaster.loadJobs(path.join(__dirname, '../', 'my-jobs'), function (err, jobs) {
  if (err) {
    console.error('Failed to load jobs!');
  } else {
    console.log('Loaded %d jobs!', jobs.length);
  }
});
```

#### startJobs(callback)
Starts all jobs that are being managed so that they will be run at the time(s) 
specified by their cron tab. Internally this will call the cron module _start_ 
function for each job.


#### stopJobs(callback)
Stops all jobs being managed so they will no longer execute at the time 
specified by their cron tab. If any jobs are currently in the middle of a tick 
callback won't fire until they're all complete. Internally this will call the 
cron module _stop_ function for each job.


#### EVENTS
A map of the event names, helps avoid spelling errors etc. Events:

* TICK_STARTED - 'tick-started',
* START_REQUESTED - 'start-requested',
* TICK_COMPLETE - 'tick-complete',
* STOP_REQUESTED - 'stop-requested',
* STOPPED - 'stopped',
* TIME_WARNING - 'time-warning',
* OVERLAPPING_CALL - 'overlapping-call'

Usage examples below.


#### CronMasterJob
This is a replacement for _cron.CronJob_ that you usually use but it requires 
parameters to be passed in an Object instead.

The function you usually pass as the _onTick_ to the cron module doesn't take a 
callback, but if using cron-master you must pass a accept a callback into your 
cron _onTick_ function as shown below.

##### CronMasterJob Functions
Each job exposes the following functions for direct use if required:

###### start([callback])
Starts the job so that it will run at the specified time(s).

###### forceRun([callback])
Force the job to run immediately.

###### stop([callback])
Stop the job so that it will not run at the specified time(s).


Here's a trivial example of creating a CronMasterJob:

```javascript

var CronMasterJob = require('cron-master').CronMasterJob;

module.exports = new CronMasterJob({
  
  // Optional. Used to determine when to trigger the 'time-warning'. Fires after
  // the provided number of milliseconds (e.g 2 minutes in the case below) has 
  // passed if the job has not called the done callback
  timeThreshold: (2 * 60 * 1000),

  // Just the usual params that you pass to the "cron" module!
  cronParams: {
    cronTime: '* * * * * *',
    onTick: function (master, done) {
      console.log('Running job!');
      done(null, 'ok');
    }
  }

});

````


## Examples

#### Basic Job

```javascript

var CronMasterJob = require('cron-master').CronMasterJob;

module.exports = new CronMasterJob({
  // The usual params that you pass to the "cron" module go here
  cronParams: {
    cronTime: '* * * * * *',
    onTick: function (master, done) {
      console.log('running job');
      done(null, 'result');
    }
  }
});

```


#### Advanved Job
The job below runs every 2 minutes. Interestingly however, it binds a one time 
event listener to see if the job was requested to stop. If so it will prevent 
further execution and simply skip the business logic.

```javascript

var CronMasterJob = require('cron-master').CronMasterJob  
  , async = require('async')
  , db = require('lib/db-wrapper');

/**
 * Function to call for this cron job.
 * @param  {CronMaster}   master  Reference to the job itself, use for events.
 * @param  {Function}     done    Used to signal the job is finished.
 */
function cronFn (master, done) {
  var stopped = false;

  // Let's use the master to allow this job to be stopped mid process!
  master.once('stop-requested', stopListener);

  function stopListener () {
    stopped = true;
  }

  function letterProcessor (letter, next) {
    if (!stopped) {
      // Do nothing, just skip since a stop was requested
      next();
    } else {
      db.insert(letter, next)l
    }
  }

  async.eachSeries(['a', 'b', 'c'], letterProcessor, function (err) {
    // Remove event bindings to prevent memory leaks!
    master.removeListener('stop-requested', stopListener);

    // Pass the result to the CronMasterJob callback
    done(err);
  });
}

module.exports = new CronMasterJob({
  
  // Optional. Used to determine when to trigger the 'time-warning'. Fires after
  // the provided number of milliseconds (e.g 2 minutes in the case below) has 
  // passed if the job has not called the done callback
  timeThreshold: (2 * 60 * 1000),

  // Just the usual params that you pass to the "cron" module!
  cronParams: {
    cronTime: '00 */2 * * * *',
    onTick: function (master, done) {
      console.log('ran job at %s', new Date().toJSON());
      done();
    }
  }

});
```


#### Adding Events to Jobs

```javascript
var path = require('path')
  , cmaster = require('cron-master');

cmaster.loadJobs(path.join(__dirname, '../', 'my-jobs'), function (err, jobs) {
  if (err) {
    console.error('Failed to load jobs!');
  } else {
    jobs.forEach(function (job) {
      // Using event map for name. 
      // Log output when the job is about to run.
      job.on(cmaster.EVENTS.TICK_STARTED, function () {
        console.log('Job tick starting!');
      });


      // Using String for event name.
      // Log output when the job has complete.
      job.on('tick-complete', function (err, res, time) {
        console.log('Job tick complete in %d!', time);
        if (err) {
          console.error('Error running job: %s', err);
        } else {
          console.log('Job complete. Result: %s', res);
        }
      });
    });
  }
});
```