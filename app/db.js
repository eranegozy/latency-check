const { Sequelize, DataTypes} = require('sequelize');
// const sequelize = new Sequelize({
//     dialect: 'sqlite',
//     storage: 'latency.db'
//   });
console.log(process.env.DATABASE_URL);
// const sequelize = new Sequelize(process.env.DATABASE_URL);
const sequelize = new Sequelize({
    database: 'jwln',
    username: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres'
});
const http = require('http');
const express = require('express');

// let httpServer = http.createServer();
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
        res.sendStatus(200);
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
    
});

(async ()=> {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

      } catch (error) {
        console.error('Unable to connect to the database:', error);
      }
})();

expressApp.listen(process.env.PORT, ()=>console.log(`DB Server listening on port ${process.env.PORT}`));