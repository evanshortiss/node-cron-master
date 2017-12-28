'use strict'

/* eslint no-unused-expressions: 0 */

const expect = require('chai').expect
const events = require('lib/events')
const path = require('path')
const cmaster = require('../cron-master')

describe('#loader', () => {
  let loader = null

  const loadValidJobs = (done) => {
    loader.loadJobs(path.join(__dirname, 'sample-jobs', 'valid'), done)
  }

  const stopJobs = (done) => {
    if (loader) {
      loader.stopJobs(done)
    } else {
      done()
    }
  }

  // Stop previous loader jobs
  afterEach(stopJobs)
  beforeEach(stopJobs)

  // Create a new loader
  beforeEach(() => {
    loader = cmaster.getInstance()
  })

  describe('#loadJobs', () => {
    it('should not load invalid jobs', (done) => {
      loader.loadJobs(
        path.join(__dirname, 'sample-jobs', 'invalid'),
        (err) => {
          expect(err).to.be.defined
          expect(err).to.be.an.instanceof(Error)
          done()
        })
    })

    it('should load valid jobs successfully', (done) => {
      loadValidJobs((err, jobs) => {
        expect(err).to.be.null
        expect(jobs).to.be.an('array')
        expect(jobs).to.have.length(1)
        done()
      })
    })
  })

  describe('#hasRunningJobs', () => {
    it('should return false', () => {
      expect(loader.hasRunningJobs()).to.be.false
    })

    it('should return true', (done) => {
      loadValidJobs((err, jobs) => {
        expect(err).to.be.null
        expect(jobs).to.be.an('array')

        jobs.forEach((j) => {
          j.start()
        })

        setTimeout(() => {
          expect(loader.hasRunningJobs()).to.be.true
          done()
        }, 1100)
      })
    })
  })

  describe('#getJobs', () => {
    it('should return 1', (done) => {
      loadValidJobs((err) => {
        expect(err).to.be.null
        expect(loader.getJobs()).to.have.length(1)
        done()
      })
    })

    it('should return 0', () => {
      expect(loader.getJobs()).to.have.length(0)
    })
  })

  describe('#getRunningJobs', () => {
    it('should return 1 job', (done) => {
      loadValidJobs((err, jobs) => {
        expect(err).to.be.null
        expect(jobs).to.be.an('array')

        jobs.forEach((j) => {
          j.start()
        })

        setTimeout(() => {
          expect(loader.getRunningJobs()).to.have.length(1)
          done()
        }, 1100)
      })
    })

    it('should return no jobs', (done) => {
      loadValidJobs((err, jobs) => {
        expect(err).to.be.null
        expect(jobs).to.be.an('array')

        expect(loader.getRunningJobs()).to.have.length(0)
        done()
      })
    })
  })

  describe('#startJobs', () => {
    it('should start all jobs', (done) => {
      loadValidJobs((err, jobs) => {
        expect(err).to.be.null
        loader.startJobs((err) => {
          expect(err).to.be.null

          // The test passes if the job is called
          jobs[0].once(events.TICK_COMPLETE, done)
        })
      })
    })
  })

  describe('#stopJobs', () => {
    it('should stop jobs', (done) => {
      var tickCount = 0

      // Load the jobs
      loadValidJobs((err, jobs) => {
        expect(err).to.be.null

        var job = jobs[0]

        // Count how many times a job has run (max once per second)
        job.on(events.TICK_COMPLETE, () => {
          tickCount++
        })
        // Start the job(s)
        loader.startJobs((err) => {
          expect(err).to.be.null

          // Wait a litte and then stop the jobs
          setTimeout(() => {
            loader.stopJobs(() => {
              var tickCountAtStopRequest = tickCount

              // Wait a little and verify the job has been called at most one
              // more time since we called stop. We say just once more since
              // if we call stop while it's in progress it may not abort
              // pending the job logic
              setTimeout(() => {
                expect(tickCount).to.be.below(tickCountAtStopRequest + 1)
                done()
              }, 2000)
            })
          }, 2000)
        })
      })
    })
  })
})
