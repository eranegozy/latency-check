var SCWorker = require('socketcluster/scworker');
var express = require('express');
var useragent = require('express-useragent')
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var healthChecker = require('sc-framework-health-check');

class Worker extends SCWorker {
  run() {
    console.log('   >> Worker PID:', process.pid);
    var environment = this.options.environment;

    var app = express();

    var httpServer = this.httpServer;
    var scServer = this.scServer;

    if (environment === 'dev') {
      // Log every HTTP request.
      // See https://github.com/expressjs/morgan for other available formats.
      app.use(morgan('dev'));
    }
    app.use(serveStatic(path.resolve(__dirname, 'public')));
    app.use(express.urlencoded());
    app.use(express.json());

    app.get('/operator', function(req, res){
      res.sendFile(path.join(__dirname + '/public/password.html'));
    });
    app.post('/controller', function(req, res){

      if (req.body.password == 'lagpolice') res.sendFile(path.join(__dirname + '/public/operator.html'));
      else return res.status(401).send();
    });
    // Listen for HTTP GET "/health-check".
    healthChecker.attach(this, app);

    httpServer.on('request', app);

    /**
     * NOTE: Be sure to replace the following sample logic with your own logic.
     */

    var count = 0;
    // Handle incoming websocket connections and listen for events.
    scServer.on('connection', function (socket) {

      socket.on('sampleClientEvent', function (data) {
        count++;
        console.log('Handled sampleClientEvent', data);
        scServer.exchange.publish('sample', count);
      });

      var interval = setInterval(function () {
        socket.emit('random', {
          number: Math.floor(Math.random() * 5)
        });
      }, 1000);

      socket.on('disconnect', function () {
        clearInterval(interval);
      });

    });
    
  }
}

new Worker();
