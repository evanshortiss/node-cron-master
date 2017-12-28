'use strict'

const path = require('path')
const cmaster = require('../cron-master')

function initialiseJob (job) {
  console.log('Initialise Job: %s', job.meta.name)

  // Bind event name with your own string...
  job.on('tick-complete', function (err, result, time) {
    if (err) {
      console.error('job tick failed with error', err)
    } else {
      console.log('"%s" completed a tick in %dms', job.meta.name, time)
    }
  })

  // ...or bind using events object provided name
  job.on(cmaster.EVENTS.TIME_WARNING, function () {
    console.log('"%s" is taking longer than expected', job.meta.name)
  })

  job.on(cmaster.EVENTS.OVERLAPPING_CALL, function () {
    console.log('"%s" received a tick/call before the previous tick completed' +
      ' this tick has been ignored and will not run until the first tick ' +
      'has finished.', job.meta.name)
  })
}

const instance = cmaster.getInstance()

// Loads up jobs in the jobs folder
instance.loadJobs(path.join(__dirname, './jobs'), function (err, jobs) {
  if (err) {
    // Something went wrong when loading jobs
    throw err
  } else if (jobs.length === 0) {
    // If no files were found
    throw new Error('No jobs found!')
  } else {
    console.log('Initialising jobs...')

    // Bind job events etc.
    jobs.forEach(initialiseJob)

    // Start the cron timers
    instance.startJobs()
  }
})
