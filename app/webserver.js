var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var request = require('request');
var multer = require('multer');
var fs = require('fs');
var spawn = require('child_process').spawn;
var Xcorr = require('abr-xcorr');

var upload = multer();
var app = express();

var httpServer = this.httpServer;

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

app.post('/xcorr', function(req, res){
  console.log(req.body);
});

port = 3000;
app.listen(port, console.log("Starting Server at port " + port));
