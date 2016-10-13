var express = require('express');
var http = require('http');
var io = require('socket.io');
var bcrypt=require('bcrypt-nodejs');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var RememberMeStrategy = require('passport-remember-me').Strategy;
var session = require('express-session');
var bodyParser = require('body-parser');
var fs = require('fs');
// var multer = require('multer');//for upload files
var favicon = require('serve-favicon');
var logger = require('morgan');
var Datastore = require('nedb');
var socketcookieParser = require('socket.io-cookie');
var ejs = require('ejs');
var config=require(__dirname+"/config");
var cookieParser=require("cookie-parser");
var device = require('express-device');


var server=require(__dirname+"/lib/server.js").server(express,http,io,socketcookieParser,bodyParser,favicon,logger,session,passport,LocalStrategy,RememberMeStrategy,config,cookieParser,device);
var dbnedb=require(__dirname+"/lib/dbnedb.js").dbnedb(Datastore,__dirname+"/"+config.get("db:dbusers"),__dirname+"/"+config.get("db:dbusersStat"),__dirname+"/"+config.get("db:dbsessions"));

exports.fs=fs;
exports.ejs=ejs;
exports.bcrypt=bcrypt;



var game=require(__dirname+"/lib/game.js");
	game.initTable(5,50,"system");
	game.initTable(10,100,"system");