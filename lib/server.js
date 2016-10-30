var router=require(__dirname+"/router.js");
var users_sessions=require(__dirname+"/users_sessions.js");
var dbnedb=require(__dirname+"/dbnedb.js");
var socket=require(__dirname+"/socket.js");
var pass=require(__dirname+"/passport.js");
var game=require(__dirname+"/game.js");

exports.server=function(express,http,io,socketcookieParser,bodyParser,favicon,logger,session,passport,LocalStrategy,RememberMeStrategy,config,cookieParser,device,multer) {
	var app=express();
	var http=http.Server(app);
	var io=io(http);
	io.use(socketcookieParser());
	socket.socket(io);
	app.disable('x-powered-by');
	app.set('view engine','ejs');
	app.use('/static', express.static(__dirname+'/../static'));
	app.use(favicon(__dirname+'/../static/favicon.ico'));
	app.use(logger('dev'));
	app.use(bodyParser.json());
	app.use(device.capture());
	app.use(cookieParser());
	app.use(session({ secret: config.get("session_secret"),
	                  resave: false,
	                  saveUninitialized: true}));
	pass.pass(passport,LocalStrategy,RememberMeStrategy);
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(passport.authenticate('remember-me'));

	http.listen(process.env.PORT||config.get("port"));
	if(config.get("globalLog"))
		console.log("System: Server start on "+config.get("port")+" at "+new Date());
	if(config.get("system_log"))
		dbnedb.db.system.insert({dateStamp:new Date(),initby:"server",event:"Start on "+config.get("port")});

	pass.removeExpearedSessions();
	
	if(config.get("tables_on_server_start:enable")){//create tables on server start
		var tables=config.get("tables_on_server_start:tables");
		for(var key in tables){
			game.initTable(tables[key].split('/')[0],tables[key].split('/')[1],config.get("tables_on_server_start:name"));
		}
	}
	var storage=multer.diskStorage({//settings upload avatars
	  destination: function (req, file, cb) {
	    cb(null, __dirname+"/../static/img/avatars")
	  },
	  filename: function (req, file, cb) {
	  	var avatarName = req.user.username+'.'+file.originalname.split(".")[1];
	    dbnedb.db.users.update({_id:req.user._id},{$set:{avatar:avatarName}}, {}, function (err, numReplaced) {
	      	if(err){
		      	if(config.get("system_log"))
		        	dbnedb.db.system.insert({dateStamp:new Date(),initby:"ERROR",event:err});
		    }
	      	users_sessions.autorizedUsers[req.session.id].initUserAvatar();
	      	cb(null, avatarName);
	    });
	  }
	});
	var upload=multer({storage:storage,limits:{fileSize:1024*1024}}).single('avatar');

	router.router(app,upload);
}

