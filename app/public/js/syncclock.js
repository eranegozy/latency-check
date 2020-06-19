//----------------------------------------------------------
// syncclock.js
// Copyright (c) 2018, Eran Egozy
// Released under the MIT License (http://opensource.org/licenses/MIT)
//----------------------------------------------------------



function ClockEstimatorFilter() {
  var self = this;
  self.samples = [];
  self.loc_ave = 0;
  self.ref_ave = 0;
  
  self.age = 60;
  self.num_samples = 4;
}

ClockEstimatorFilter.prototype.numSamples = function() {
  return this.samples.length;
}

ClockEstimatorFilter.prototype.insert = function(local, ref, lat) {
  var self = this;

  // check if incoming data is very different from what we expect:
  if (self.samples.length > 0) {
    var delta = Math.abs((this.ref_ave - this.loc_ave) - (ref - local));
    // console.log('delta', delta, 'num samples', this.samples.length);
    // if we are off by more than 10 seconds, something went wrong - so start over.
    if (delta > 10) {
      self.samples = [];
    }
  }

  self.samples.push([local, ref, lat]);

  // sort by latency
  self.samples.sort(function (a,b) { return a[2] - b[2]; });

  // remove samples older than self.age seconds
  var thresh = local - self.age;
  self.samples = self.samples.filter(function(x) { return x[0] > thresh; });
  
  // finally, calc params based on current sample data:
  var num = Math.min(self.num_samples, self.samples.length);
  if (num) {
    var loc_sum = 0;
    var ref_sum = 0;
    for (var i = 0; i < num; i++) {
      var s = self.samples[i];
      loc_sum += s[0];
      ref_sum += s[1];
    }
    self.loc_ave = loc_sum / num;
    self.ref_ave = ref_sum / num;
  }
}

ClockEstimatorFilter.prototype.get = function(local) {
  return this.ref_ave + local - this.loc_ave;
}


//-----------------------------------------
// Client-server synchronized clock
//
function SyncClock(socket) {
  var self = this;

  self.socket = socket;
  self.loadProgress = 0;
  self.nextPingTime = 0;

  self.filter = new ClockEstimatorFilter();

  // used only for data analysis
  self.testSamples = [];

  self.latencySamples = []
  self.latencyIdx = 0;

  self.stats = { 'interval': 0, 'min': 0, 'max': 0, 'ave': 0 };


  // handle pong msg (response to clockPing)
  (async() =>{
    for await (let data of socket.receiver('clockPong')){
        // console.log('clockPong', data);

        var localPing = data[0];
        var refTime = data[1];

        var localPong = self.getLocalTime();
        var travelDur = localPong - localPing;
        var localTime = (localPong + localPing) / 2;

        // refTime is the time of the server
        // localTime is the estimate of localTime at the moment when refTime was set.
        //   (assumes travel time to and fro are equal)
        self._process(localTime, refTime, travelDur);
    }
  })();

  // get started, polling every 200 ms
  self.pollID = setInterval(self._poll.bind(self), 200);
}

SyncClock.prototype.disconnect = function() {
  clearInterval(this.pollID);
}

// return the estimated server time. Returns 0 when not yet determined
SyncClock.prototype.getTime = function() {
  if (this.loadProgress == 'done')
    return  this.filter.get( this.getLocalTime() );
  else
    return 0;
}

// get local time in seconds
SyncClock.prototype.getLocalTime = function() {
  if (typeof performance !== 'undefined')
    return 0.001 * performance.now();
  else
    return 0.001 * Date.now();
}

SyncClock.prototype.getLoadProgress = function() {
  return this.loadProgress;
}

// returns min/max/ave latency times for the past N samples representing 'interval' duration of time.
SyncClock.prototype.calcLatencyStats = function() {
  var tMin = 1000000000;
  var tMax = 0;
  var lMin = 1000000000;
  var lMax = 0;
  var lSum = 0;

  for (var i = 0; i < this.latencySamples.length; i++) {
    var t = this.latencySamples[i][0];
    var l = this.latencySamples[i][1];

    tMin = Math.min(tMin, t);
    tMax = Math.max(tMax, t);
    lMin = Math.min(lMin, l);
    lMax = Math.max(lMax, l);
    lSum += l;
  };

  this.stats = { 'interval': tMax - tMin, 'min': lMin, 'max': lMax, 'ave': lSum / this.latencySamples.length };
}


SyncClock.prototype._poll = function() {
  var localNow = this.getLocalTime();

  if (localNow > this.nextPingTime) {
    // console.log('ping: ' + localNow.toFixed(3));
    this.socket.emit('clockPing', this.getLocalTime());
    this.nextPingTime = localNow + 3.0; // largest amount of time to wait before trying another ping.
  }
}

SyncClock.prototype._process = function(localTime, refTime, travelDur) {
  // console.log('_process: ' + localTime.toFixed(3) + ' ' + refTime.toFixed(3) + ' ' + travelDur.toFixed(3));

  // insert new data into filter
  this.filter.insert(localTime, refTime, travelDur);

  // progress - we want 5 samples before providing an estimate
  var numSamples = this.filter.numSamples();
  this.loadProgress = numSamples / 3.0;
  if (this.loadProgress >= 1) {
    this.loadProgress = 'done';
  }

  // store test samples for later data analysis
  // if (this.testSamples.length < 1000) {
  //   var estTime = this.filter.get( localTime );
  //   this.testSamples.push( [localTime, refTime, travelDur, estTime ] );
  // }

  // record travelDur / latency data for later analysis
  this.latencySamples[this.latencyIdx] = [localTime, travelDur];
  this.latencyIdx = (this.latencyIdx + 1) % 5;
  this.calcLatencyStats();

  // generate next pingpong:
  var pingDelay;
  if (numSamples > 20)
    pingDelay = 2.0;
  else if (numSamples > 10)
    pingDelay = 1.0;
  else
    pingDelay = 0.5;

  var delta = pingDelay + Math.random() * pingDelay * 0.1;
  this.nextPingTime = this.getLocalTime() + delta;
}
define (function(require, exports, module){
module.exports.SyncClock = SyncClock;
});
