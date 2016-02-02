'use strict';

var loader = null
  , expect = require('chai').expect
  , sinon = require('sinon')
  , events = require('lib/events')
  , path = require('path');


describe('Cron Interface', function () {

  function loadValidJobs (done) {
    loader.loadJobs(path.join(__dirname, 'sample-jobs', './valid'), done);
  }

  function stopJobs (done) {
    if (loader) {
      loader.stopJobs(done);
    } else {
      done();
    }
  }

  afterEach(stopJobs);
  beforeEach(stopJobs);

  beforeEach(function () {
    delete require.cache[require.resolve('index.js')];
    loader = require('index.js');
  });

  beforeEach(function (done) {
    loader.stopJobs(done);
  });

  describe('#loadJobs', function () {
    it('Should not load invalid jobs', function (done) {
      loader.loadJobs(
        path.join(__dirname, 'sample-jobs', './invalid'),
        function (err) {
          expect(err).to.be.defined;
          expect(err).to.be.an.instanceof(Error);
          done();
        });
    });

    it('Should load valid jobs successfully', function (done) {
      loadValidJobs(function (err, jobs) {
        expect(err).to.be.null;
        expect(jobs).to.be.an('array');
        expect(jobs).to.have.length(1);
        done();
      });
    });
  });

  describe('#hasRunningJobs', function () {
    it('Should return false', function () {
      expect(loader.hasRunningJobs()).to.be.false;
    });

    it('Should return true', function (done) {
      loadValidJobs(function (err, jobs) {
        expect(err).to.be.null;
        expect(jobs).to.be.an('array');

        jobs.forEach(function (j) {
          j.start();
        });

        setTimeout(function () {
          expect(loader.hasRunningJobs()).to.be.true;
          done();
        }, 1100);
      });
    });
  });

  describe('#getJobs', function () {
    it('Should return 1', function (done) {
      loadValidJobs(function (err) {
        expect(err).to.be.null;
        expect(loader.getJobs()).to.have.length(1);
        done();
      });
    });

    it('Should return 0', function () {
      expect(loader.getJobs()).to.have.length(0);
    });
  });

  describe('#getRunningJobs', function () {
    it('Should return 1 job', function (done) {
      loadValidJobs(function (err, jobs) {
        expect(err).to.be.null;
        expect(jobs).to.be.an('array');

        jobs.forEach(function (j) {
          j.start();
        });

        setTimeout(function () {
          expect(loader.getRunningJobs()).to.have.length(1);
          done();
        }, 1100);
      });
    });

    it('Should return no jobs', function (done) {
      loadValidJobs(function (err, jobs) {
        expect(err).to.be.null;
        expect(jobs).to.be.an('array');

        expect(loader.getRunningJobs()).to.have.length(0);
        done();
      });
    });
  });

  describe('#startJobs', function () {
    it('Should start all jobs', function (done) {
      loadValidJobs(function (err, jobs) {
        expect(err).to.be.null;
        loader.startJobs(function (err) {
          expect(err).to.be.null;

          // The test passes if the job is called
          jobs[0].once(events.TICK_COMPLETE, done);
        });
      });
    });
  });

  describe('#stopJobs', function () {
    it('Should stop jobs', function (done) {
      var tickCount = 0;

      // Load the jobs
      loadValidJobs(function (err, jobs) {
        expect(err).to.be.null;

        var job = jobs[0];

        // Count how many times a job has run (max once per second)
        job.on(events.TICK_COMPLETE, function () {
          tickCount++;
        });

        // Start the job(s)
        loader.startJobs(function (err) {
          expect(err).to.be.null;

          // Wait a litte and then stop the jobs
          setTimeout(function () {
            loader.stopJobs(function () {
              var tickCountAtStopRequest = tickCount;

              // Wait a little and verify the job has been called at most one
              // more time since we called stop. We say just once more since
              // if we call stop while it's in progress it may not abort
              // pending the job logic
              setTimeout(function () {
                expect(tickCount).to.be.below(tickCountAtStopRequest + 1);
                done();
              }, 2500);

            });
          }, 2000)
        });

      });
    });
  });


});
