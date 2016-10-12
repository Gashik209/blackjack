var router=require(__dirname+"/router.js");
var socket=require(__dirname+"/socket.js");
var pass=require(__dirname+"/passport.js");

exports.server=function(express,http,io,socketcookieParser,bodyParser,favicon,logger,session,passport,LocalStrategy,RememberMeStrategy,config,cookieParser,device) {
	var app=express();
	var http=http.Server(app);
	var io=io(http);
	io.use(socketcookieParser);
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

	router.router(app);
}

