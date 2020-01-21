var SCWorker = require('socketcluster/scworker');
var express = require('express');
// var useragent = require('express-useragent')
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var healthChecker = require('sc-framework-health-check');

class Worker extends SCWorker {
  run() {
    console.log('   >> Worker PID:', process.pid);
    var environment = this.options.environment;

    var app = express();
    if (environment === 'dev') {
      // Log every HTTP request.
      // See https://github.com/expressjs/morgan for other available formats.
      app.use(morgan('dev'));
    }
    var httpServer = this.httpServer;
    var scServer = this.scServer;

    if (environment === 'dev') {
      // Log every HTTP request.
      // See https://github.com/expressjs/morgan for other available formats.
      app.use(morgan('dev'));
    }

    // Listen for HTTP GET "/health-check".
    healthChecker.attach(this, app);

    httpServer.on('request', app);

    scServer.on('connection', function (socket) {

      socket.on('disconnect', function () {
        // clearInterval(interval);
      });

    });
    
  }
}

new Worker();
