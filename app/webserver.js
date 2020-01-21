var express = require('express');
var useragent = require('express-useragent')
var serveStatic = require('serve-static');
var path = require('path');
var request = require('request');

var app = express();

 
var httpServer = this.httpServer;

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

app.post('/ua', function(nav){
	// console.log('UA');
	// console.log(nav)
  	console.log(nav.body);
});

app.post('/audio', function(nav){
	console.log("AUDIO");
  	console.log(nav.body);
});
port = 3000;
app.listen(port, console.log("Starting Server at port " + port));



