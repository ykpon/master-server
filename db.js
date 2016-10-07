var config = require('./config.js');
var mysql = require('mysql');
var connection = mysql.createPool(config.db);
module.exports = connection;