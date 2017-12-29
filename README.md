cron-master
===========

[![build-status](https://travis-ci.org/evanshortiss/node-cron-master.svg?branch=master)
](https://travis-ci.org/evanshortiss/node-cron-master)[![npm version](https://badge.fury.io/js/cron-master.svg)
](https://badge.fury.io/js/cron-master.svg)[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)
](https://standardjs.com)[![!Dependency Scan](https://snyk.io/test/github/evanshortiss/node-cron-master/badge.svg)
](https://snyk.io/org/evanshortiss/project/982f8d62-ce8e-4620-a1bf-b270166f7bac)[![TypeScript](https://badges.frapsoft.com/typescript/version/typescript-next.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)


cron-master provides a standardised way to manage your Node.js CronJobs created
using the cron module.

Typically in projects we'll see instances of _CronJob_ from the fantastic `cron`
module scattered throughout the codebase meaning they're hard to find and not
managed in a consistent manner. cron-master encourages the pattern of storing
all jobs in a single location, and ensures they all follow the same pattern. It
also adds events to your _CronJob_ instances so you can add generic hooks for
logging, detecting errors, and preventing overlapping calls that can cause
unpredictable results.

For example, if you have a job that runs every 5 minutes, did you remember to
ensure that next time it runs the previous run has completed!? cron-master
removes the need to check for that case, it simply won't let the same job run
again until the currently running call has completed.

## Features

* Prevents a the same CronJob running more than once concurrently.
* Provides a structured way to create a manage jobs.
* Enables jobs to emit and receive events, also provides useful default events.
* Automatically computes time taken by each CronJob to complete.
* Provides an error and/or result from each job via an event and/or callback.

## Install

Seemples!

```
npm install cron-master --save
```


## API

### module.getInstance()
Factory function that returns manager instances.

```js
const cmaster = require('cron-master');

// This is our instance
const instance = cmaster.getInstance()
```

### instance.loadJobs(absolutePath, callback)
Loads all jobs contained in the specified folder, and place them under the
managment of cron-master. Each file in the folder must have module.exports set
to an instance of CronMasterJob.

As of version 0.2.0 the jobs are not cached. This means if you call load jobs
a second time with the same jobs, a new instance of the file containing the job
will be loaded. This means the _require.cache_ for the specifc cron files your
loading is deleted to prevent conflicts

The callback should be of the format _function(err, jobs)_. _jobs_ will be an
Array of the managed jobs that were loaded.

```javascript
const path = require('path')
const cmaster = require('cron-master');
const manager = cmaster()

instance.loadJobs(path.join(__dirname, '../', 'my-jobs'), function (err, jobs) {
  if (err) {
    console.error('Failed to load jobs!');
  } else {
    console.log('Loaded %d jobs!', jobs.length);
  }
});
```


#### instance.hasRunningJobs()
Returns a boolean indicating if any jobs are currently running.

#### instance.getJobs()
Get an Array containing all currently loaded jobs.

#### instance.getRunningJobs()
Get an Array containing all currently running jobs.

#### instance.startJobs(callback)
Starts all jobs that are being managed so that they will be run at the time
specified by their cron tab. Internally this will call the cron module _start_
function for each job.

#### instance.stopJobs(callback)
Stops all jobs being managed so they will no longer execute at the time
specified by their cron tab. If any jobs are currently in the middle of a tick
callback won't fire until they're all complete. Internally this will call the
cron module _stop_ function for each job. You can short circuit your job
function to stop early by by using the STOP_REQUESTED event, examples below.

### module.EVENTS
A map of the event names, helps avoid spelling errors etc. Events:

* TICK_STARTED - 'tick-started',
* START_REQUESTED - 'start-requested',
* TICK_COMPLETE - 'tick-complete',
* STOP_REQUESTED - 'stop-requested',
* STOPPED - 'stopped',
* TIME_WARNING - 'time-warning',
* OVERLAPPING_CALL - 'overlapping-call'

Usage examples are included below.


### module.CronMasterJob
This is a replacement for _cron.CronJob_ (the `cron` module from npm) that you
usually use. It requires parameters to be passed in an Object.

The function you usually pass as the _onTick_ parameter the cron module doesn't
take a callback, but when using cron-master you must accept a callback into
your cron _onTick_ function as shown below.

Each job exposes the following functions for direct use if required:

#### instance.start([callback])
Starts the job so that it will run at the specified time(s).

#### instance.forceRun([callback])
Force the job to run immediately even if already running.

#### instance.run([callback])
Run the job if it is not currently in progress.

#### instance.stop([callback])
Stop the job so that it will not run at the specified time(s).


Here's a trivial example of creating a CronMasterJob:

```javascript

var CronMasterJob = require('cron-master').CronMasterJob;

module.exports = new CronMasterJob({

  // Optional. Used to determine when to trigger the 'time-warning'. Fires after
  // the provided number of milliseconds (e.g 2 minutes in the case below) has
  // passed if the job has not called the done callback
  timeThreshold: 2 * 60 * 1000,

  // Optional. Can be used to add useful meta data for a job
  meta: {
    name: 'Test Job'
  },

  // Just the usual params that you pass to the "cron" module!
  cronParams: {
    cronTime: '* * * * * *',
    onTick: function (job, done) {
      console.log('Running job!');
      done(null, 'ok');
    }
  }

});
```


## Examples

### Basic Job

```javascript

var CronMasterJob = require('cron-master').CronMasterJob;

module.exports = new CronMasterJob({
  // The usual params that you pass to the "cron" module go here
  cronParams: {
    cronTime: '* * * * * *',
    onTick: function (job, done) {
      console.log('running job');
      done(null, 'result');
    }
  }
});

```


### Adding Events to Jobs

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
          console.error('Error running job %s: %s', job.meta.name, err);
        } else {
          console.log('Job complete. Result: %s', res);
        }
      });

      job.on(events.TIME_WARNING, function () {
        console.log('Job has %s exceeded expected run time!', job.meta.name);
      });

      job.on('overlapping-call', function () {
        console.log(
          'Job %s attempting to run before previous tick is complete!',
          job.meta.name
        );
      });
    });
  }
});
```


### Advanved Job with Short Circuit
The job below runs every 2 minutes. Interestingly however, it binds a one time
event listener to see if the job was requested to stop. If so it will prevent
further execution and simply skip the business logic.

```javascript

const CronMasterJob = require('cron-master').CronMasterJob  
const async = require('async')
const db = require('lib/db-wrapper')

/**
 * Function to call for this cron job.
 * @param  {CronMaster}   job     Reference to the job itself, use for events.
 * @param  {Function}     done    Used to signal the job is finished.
 */
function cronFn (job, done) {
  var stopped = false;

  // Let's use the job events to allow this job to be stopped mid process!
  job.once('stop-requested', stopListener);

  function stopListener () {
    stopped = true;
  }

  function letterProcessor (letter, next) {
    if (!stopped) {
      // Do nothing, just skip since a stop was requested
      next();
    } else {
      db.insert(letter, next);
    }
  }

  async.eachSeries(['a', 'b', 'c'], letterProcessor, function (err) {
    // Remove event bindings to prevent memory leaks!
    job.removeListener('stop-requested', stopListener);

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
    onTick: cronFn
  }

});
```

## Changelog

### 1.0.1
* Remove `EVENTS` from typings
* Fix return type for `loadJobs` in typings
* Fix `CronMasterJobOptions` to accept `meta` and `cronParams`

### 1.0.0
* Changed public interface
* Added TypeScript typings
* Updated tests to use Jest
* Added coverage
* Added Synk
* Added StandardJS formatting

### 0.3.0
* Renamed the _forceRun_ function to _run_ to reflect it's true behaviour
* Added _run_ function that will only run a job if it is not already running

### 0.2.0
* Delete require cache for each job loaded
* Add function _hasRunningJobs()_
* Add function _getJobs()_
* Add function _getRunningJobs()_
* Improve test cases

### 0.1.0
* Initial release
