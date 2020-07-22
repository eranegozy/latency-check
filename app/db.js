const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'latency.db'
  });
const http = require('http');
const express = require('express');

let httpServer = http.createServer();
let expressApp = express();

expressApp.use(express.urlencoded());
expressApp.use(express.json());
expressApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
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
        await Latency.sync();
        let data = await Latency.create(req.body)
        console.log(data);
    } catch (e) {
        console.log(e);
    }
    res.sendStatus(200);
});

(async ()=> {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

      } catch (error) {
        console.error('Unable to connect to the database:', error);
      }
})();

expressApp.listen(3000, ()=>console.log("DB Server listening on port 3000"));