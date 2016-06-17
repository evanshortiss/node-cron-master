'use strict';

var CronMasterJob = require('lib/cron-master-job')
  , events = require('lib/events')
  , expect = require('chai').expect
  , sinon = require('sinon')
  , dfCron = null;


describe('Cron Master', function () {

  beforeEach(stopDefaultCron)
  afterEach(stopDefaultCron)

  function stopDefaultCron (done) {
    if (dfCron) {
      dfCron.stop(done);
    } else {
      done();
    }
  }

  function getDefaultCron () {
    dfCron = new CronMasterJob({
      cronParams: {
        cronTime: '* * * * * *',
        onTick: function (master, done) {
          done(null, 'ok');
        }
      }
    });

    return dfCron;
  }

  describe('#CronMasterJob', function () {

    it('Should create an instance with defaults', function () {
      var inst = getDefaultCron();

      expect(inst.meta).to.be.an('object');
      expect(inst.inProgress).to.be.false;
      expect(inst._thresholdTimer).to.be.null;
      expect(inst._opts).to.be.an('object');
      expect(inst._opts.timeThreshold).to.be.a('number');
      expect(inst._cronJob).to.be.an.instanceof(require('cron').CronJob);
    });

    it('Should create an instance with custom params', function () {
      var t = 500000;
      var inst = new CronMasterJob({
        timeThreshold: t,
        cronParams: {
          cronTime: '* * * * * *',
          onTick: function (manager, finished) {
            setTimeout(function () {
              finished();
            });
          }
        }
      });

      expect(inst._opts.timeThreshold).to.equal(t);
      inst.stop();
    });

    it('Should throw an error due to missing cron params', function () {
      expect(function () {
        return new CronMasterJob({});
      }).to.throw(Error);
    });

  });

  describe('#run', function () {
    it('Should run successfully with a callback', function (done) {
      getDefaultCron().run(function (err, result) {
        expect(err).to.be.null;
        expect(result).to.equal('ok');
        done();
      });
    });

    it('Should run successfully without a callback', function () {
      getDefaultCron().run();
    });

    it('should not run if already in progress', function () {
      var tickSpy = sinon.spy();
      var job = new CronMasterJob({
        cronParams: {
          cronTime: '* * * * * *',
          start: false,
          onTick: tickSpy
        }
      });

      job.run();
      job.run();

      expect(tickSpy.callCount).to.equal(1);
    });
  });

  describe('#forceRun', function () {
    it('should not run, even if already in progress', function () {
      var tickSpy = sinon.spy();
      var job = new CronMasterJob({
        cronParams: {
          cronTime: '* * * * * *',
          start: false,
          onTick: tickSpy
        }
      });

      job.forceRun();
      job.forceRun();

      expect(tickSpy.callCount).to.equal(2);
    });
  });

  describe('#CRON_EVENTS', function () {
    it('Should trigger the main tick events', function (done) {
      var inst = new CronMasterJob({
        timeThreshold: 500, // The cron taking over 500ms will trigger an event
        cronParams: {
          cronTime: '* * * * * *',
          onTick: function (manager, finished) {
            setTimeout(function () {
              finished(null, 'ok');
            }, 1500); // Simulate a long running task that takes longer than
                      // the actual cron frequency
          }
        }
      });

      var finSpy = sinon.spy()
        , startReqSpy = sinon.spy()
        , startSpy = sinon.spy()
        , timeSpy = sinon.spy()
        , overlapSpy = sinon.spy();

      inst.on(events.TICK_COMPLETE, finSpy);
      inst.on(events.TICK_STARTED, startSpy);
      inst.on(events.START_REQUESTED, startReqSpy);
      inst.on(events.TIME_WARNING, timeSpy);
      inst.on(events.OVERLAPPING_CALL, overlapSpy);

      inst.start();

      setTimeout(function () {
        // Could be called many times
        expect(finSpy.called).to.be.true;
        expect(startSpy.called).to.be.true;

        // Shoulf only be called once given our timings
        expect(timeSpy.calledOnce).to.be.true;
        expect(overlapSpy.calledOnce).to.be.true;
        expect(startReqSpy.calledOnce).to.be.true;

        expect(finSpy.getCall(0).args[0]).to.be.null;
        expect(finSpy.getCall(0).args[1]).to.equal('ok');
        expect(finSpy.getCall(0).args[2]).to.be.a('number');

        inst.stop();
        done();
      }, 3000);
    })
  });


  describe('#start', function () {

    it('Should run successfully without a callback', function () {
      var inst = getDefaultCron();
      inst.start();
    });

    it('Should run successfully with a callback', function (done) {
      var inst = getDefaultCron();
      inst.start(done);
    });

    it('Should emit START_REQUESTED event', function (done) {
      var inst = getDefaultCron()
        , spy = sinon.spy();

      inst.on(events.START_REQUESTED, spy)
      inst.start();

      expect(spy.calledOnce).to.be.true;
      done();
    });

  });


  describe('#stop', function () {

    it('Should run successfully without a callback', function () {
      var inst = getDefaultCron();
      inst.stop();
    });

    it('Should run successfully with a callback', function (done) {
      var inst = getDefaultCron();
      inst.stop(done);
    });

    it('Should emit STOPPED event', function (done) {
      var inst = getDefaultCron()
        , spy = sinon.spy();

      inst.on(events.STOPPED, spy)
      inst.stop();

      expect(spy.calledOnce).to.be.true;
      done();
    });

    it('Should emit stop events in the correct order', function (done) {
      var inst = new CronMasterJob({
        cronParams: {
          cronTime: '* * * * * *',
          onTick: function (manager, finished) {
            setTimeout(function () {
              finished();
            });
          }
        }
      });

      var stoppedSpy = sinon.spy()
        , tickSpy = sinon.spy()
        , stopReqSpy = sinon.spy();

      inst.on(events.STOPPED, stoppedSpy);
      inst.on(events.TICK_COMPLETE, tickSpy);
      inst.on(events.STOP_REQUESTED, stopReqSpy);

      inst.start();

      setTimeout(function () {
        inst.stop();

        setTimeout(function () {
          // This could be called more than once since cron runs each second
          expect(tickSpy.called).to.be.true;
          expect(stoppedSpy.calledOnce).to.be.true;
          expect(stopReqSpy.calledOnce).to.be.true;

          expect(tickSpy.calledBefore(stoppedSpy)).to.be.true;
          expect(stopReqSpy.calledBefore(stoppedSpy)).to.be.true;

          done();
        }, 1200);  // Needs to wait over 1 sec to ensure cron tick is complete

      }, 1200);  // Needs to wait over 1 sec to ensure cron tick is complete
    });

  });

});
