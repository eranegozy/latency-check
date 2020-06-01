var SCWorker = require('socketcluster/scworker');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var healthChecker = require('sc-framework-health-check');

class Worker extends SCWorker {
  run() {
    console.log('   >> Worker PID:', process.pid);
    var environment = this.options.environment;

    var app = express();
    app.use(serveStatic(path.resolve(__dirname, 'public')));
    app.use(express.urlencoded());
    app.use(express.json());

    app.get('/operator', function(req, res){
        res.sendFile(path.join(__dirname + '/public/password.html'));
      });
      
    app.post('/controller', function(req, res){
        if (req.body.password == 'lagpolice') {
        res.sendFile(path.join(__dirname + '/public/operator.html'));
        } else {
            return res.status(401).send();
        }
    });
    
    app.post('/ua', function(nav){
        console.log(nav.body);
    });

    

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
    let port = 3000;
    app.listen(port, console.log("Starting Server at port " + port));

  }
  
}

new Worker();
