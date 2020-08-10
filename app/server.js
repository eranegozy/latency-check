const http = require('http');
const eetase = require('eetase');
const socketClusterServer = require('socketcluster-server');
const express = require('express');
const serveStatic = require('serve-static');
const path = require('path');
const morgan = require('morgan');
const uuid = require('uuid');
const sccBrokerClient = require('scc-broker-client');

const ENVIRONMENT = process.env.ENV || 'dev';
const SOCKETCLUSTER_PORT = process.env.PORT || process.env.SOCKETCLUSTER_PORT || 8000;
const SOCKETCLUSTER_WS_ENGINE = process.env.SOCKETCLUSTER_WS_ENGINE || 'ws';
const SOCKETCLUSTER_SOCKET_CHANNEL_LIMIT = Number(process.env.SOCKETCLUSTER_SOCKET_CHANNEL_LIMIT) || 1000;
const SOCKETCLUSTER_LOG_LEVEL = process.env.SOCKETCLUSTER_LOG_LEVEL || 2;

const SCC_INSTANCE_ID = uuid.v4();
const SCC_STATE_SERVER_HOST = process.env.SCC_STATE_SERVER_HOST || null;
const SCC_STATE_SERVER_PORT = process.env.SCC_STATE_SERVER_PORT || null;
const SCC_MAPPING_ENGINE = process.env.SCC_MAPPING_ENGINE || null;
const SCC_CLIENT_POOL_SIZE = process.env.SCC_CLIENT_POOL_SIZE || null;
const SCC_AUTH_KEY = process.env.SCC_AUTH_KEY || null;
const SCC_INSTANCE_IP = process.env.SCC_INSTANCE_IP || null;
const SCC_INSTANCE_IP_FAMILY = process.env.SCC_INSTANCE_IP_FAMILY || null;
const SCC_STATE_SERVER_CONNECT_TIMEOUT = Number(process.env.SCC_STATE_SERVER_CONNECT_TIMEOUT) || null;
const SCC_STATE_SERVER_ACK_TIMEOUT = Number(process.env.SCC_STATE_SERVER_ACK_TIMEOUT) || null;
const SCC_STATE_SERVER_RECONNECT_RANDOMNESS = Number(process.env.SCC_STATE_SERVER_RECONNECT_RANDOMNESS) || null;
const SCC_PUB_SUB_BATCH_DURATION = Number(process.env.SCC_PUB_SUB_BATCH_DURATION) || null;
const SCC_BROKER_RETRY_DELAY = Number(process.env.SCC_BROKER_RETRY_DELAY) || null;

const { Sequelize, DataTypes} = require('sequelize');
let sequelize;

let agOptions = {};
var gBootTime = Date.now();

if (process.env.SOCKETCLUSTER_OPTIONS) {
  let envOptions = JSON.parse(process.env.SOCKETCLUSTER_OPTIONS);
  Object.assign(agOptions, envOptions);
}

let httpServer = eetase(http.createServer());
let agServer = socketClusterServer.attach(httpServer, agOptions);

let expressApp = express();
if (ENVIRONMENT === 'dev') {
  // Log every HTTP request. See https://github.com/expressjs/morgan for other
  // available formats.
    sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'latency.db'
  });
  expressApp.use(morgan('dev'));
} else {
    sequelize = new Sequelize(process.env.DATABASE_URL);
}
expressApp.use(serveStatic(path.resolve(__dirname, 'public')));
expressApp.use(express.urlencoded());
expressApp.use(express.json());

expressApp.get('/operator', function(req, res){
    res.sendFile(path.join(__dirname + '/public/password.html'));
});

expressApp.get('/results', function(req, res){
    res.sendFile(path.join(__dirname + '/public/results.html'));
});
    
expressApp.post('/controller', function(req, res){
    if (req.body.password == 'lagpolice') {
        res.sendFile(path.join(__dirname + '/public/operator.html'));
    } else {
        return res.status(401).send();
    }
});

expressApp.post('/ua', function(req, res){
    console.log(req.body);
    res.status(200).send('OK');
});
// Add GET /health-check express route
expressApp.get('/health-check', function(req, res) {
  res.status(200).send('OK');
});

//DB
const Latency = sequelize.define('Latency', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    averageOperatorLag: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    averageClientLag: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    averageDifference: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    clientPlatform: {
        type: DataTypes.STRING,
        allowNull: false
    },
    clientUA: {
        type: DataTypes.STRING,
        allowNull: false
    },
    clientSoundDevice: {
        type: DataTypes.STRING,
    }

},
{
    freezeTableName: true, 
    timestamps: true,
    updatedAt: false
});

expressApp.post('/recordTest', async(req, res) => {
    console.log(req.body);
    try{
        await Latency.sync({alter: true});
        let data = await Latency.create(req.body)
        // console.log(data);
        res.sendStatus(200);
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
    
});

expressApp.post('/results', async function(req, res){
    // Find all users
    const things = await Latency.findAll();
    console.log("All users:", JSON.stringify(things, null, 2));
    res.status(200).send(things);
    // res.status(200).send(JSON.stringify(things, null, 2));
});

(async ()=> {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

      } catch (error) {
        console.error('Unable to connect to the database:', error);
      }
})();



// HTTP request handling loop.
(async () => {
  for await (let requestData of httpServer.listener('request')) {
    expressApp.apply(null, requestData);
  }
})();

// SocketCluster/WebSocket connection handling loop.
var clients = new Array(26).fill(0);
(async () => {
  for await (let {socket} of agServer.listener('connection')) {

        syncclock.SyncClockServerMsgHandler(socket, getTime);
        let clientID = "A";
        let num = clientID.charCodeAt(0) - 65;
        while (clients[num] != 0 || num >= 26){
            num += 1;
            clientID = String.fromCharCode(clientID.charCodeAt(0) + 1);
        }
        clients[num] = clientID;
        
        (async () => {
            for await (let data of socket.listener('disconnect')) {
                agServer.exchange.transmitPublish("disconnected", {"clientID": clientID, "socketID": socket.id});
                clients[num] = 0;
            }
        })();

        (async () => {
            for await (let data of socket.receiver('firstClick')) {
                await agServer.exchange.transmitPublish("updateID", {"clientID": clientID, "socketID": socket.id});
                console.log(data);
                await agServer.exchange.transmitPublish("connected", {"clientID": clientID, "socketID": socket.id, "userAgent": data});
            }
        })();
  }
})();

function getTime() {
    return (Date.now() - gBootTime) * 0.001;
}

var syncclock = {
    SyncClockServerMsgHandler : function(socket, getTimeFunc) {
        (async () => {
            for await (let localPing of socket.receiver('clockPing')){
                var refTime = getTimeFunc();
                socket.transmit('clockPong', [localPing, refTime]);
            }
        })();
    }
}

httpServer.listen(SOCKETCLUSTER_PORT);

if (SOCKETCLUSTER_LOG_LEVEL >= 1) {
  (async () => {
    for await (let {error} of agServer.listener('error')) {
      console.error(error);
    }
  })();
}

if (SOCKETCLUSTER_LOG_LEVEL >= 2) {
  console.log(
    `   ${colorText('[Active]', 32)} SocketCluster worker with PID ${process.pid} is listening on port ${SOCKETCLUSTER_PORT}`
  );

  (async () => {
    for await (let {warning} of agServer.listener('warning')) {
      console.warn(warning);
    }
  })();
}

function colorText(message, color) {
  if (color) {
    return `\x1b[${color}m${message}\x1b[0m`;
  }
  return message;
}

if (SCC_STATE_SERVER_HOST) {
  // Setup broker client to connect to SCC.
  let sccClient = sccBrokerClient.attach(agServer.brokerEngine, {
    instanceId: SCC_INSTANCE_ID,
    instancePort: SOCKETCLUSTER_PORT,
    instanceIp: SCC_INSTANCE_IP,
    instanceIpFamily: SCC_INSTANCE_IP_FAMILY,
    pubSubBatchDuration: SCC_PUB_SUB_BATCH_DURATION,
    stateServerHost: SCC_STATE_SERVER_HOST,
    stateServerPort: SCC_STATE_SERVER_PORT,
    mappingEngine: SCC_MAPPING_ENGINE,
    clientPoolSize: SCC_CLIENT_POOL_SIZE,
    authKey: SCC_AUTH_KEY,
    stateServerConnectTimeout: SCC_STATE_SERVER_CONNECT_TIMEOUT,
    stateServerAckTimeout: SCC_STATE_SERVER_ACK_TIMEOUT,
    stateServerReconnectRandomness: SCC_STATE_SERVER_RECONNECT_RANDOMNESS,
    brokerRetryDelay: SCC_BROKER_RETRY_DELAY
  });

  if (SOCKETCLUSTER_LOG_LEVEL >= 1) {
    (async () => {
      for await (let {error} of sccClient.listener('error')) {
        error.name = 'SCCError';
        console.error(error);
      }
    })();
  }
}
