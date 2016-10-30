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
var multer = require('multer');
var favicon = require('serve-favicon');
var logger = require('morgan');
var Datastore = require('nedb');
var socketcookieParser=require("socket.io-cookie-parser");
var ejs = require('ejs');
var config=require(__dirname+"/config");
var cookieParser=require("cookie-parser");
var device = require('express-device');

var dbnedb=require(__dirname+"/lib/dbnedb.js").dbnedb(Datastore,__dirname+"/"+config.get("db:dbusers"),__dirname+"/"+config.get("db:dbusersStat"),__dirname+"/"+config.get("db:dbsessions"),__dirname+"/"+config.get("db:dbchat"),__dirname+"/"+config.get("db:dbgame"),__dirname+"/"+config.get("db:dbsystem"));
var server=require(__dirname+"/lib/server.js").server(express,http,io,socketcookieParser,bodyParser,favicon,logger,session,passport,LocalStrategy,RememberMeStrategy,config,cookieParser,device,multer);

exports.fs=fs;
exports.ejs=ejs;
exports.bcrypt=bcrypt;
