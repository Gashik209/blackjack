var users_sessions=require(__dirname+"/users_sessions.js");
var pass=require(__dirname+"/passport.js");
var validator=require(__dirname+"/validation.js");
var content=require(__dirname+"/../views/content.js");
var parts=require(__dirname+"/../views/parts.js");
var game=require(__dirname+"/game.js");
var dbnedb=require(__dirname+"/dbnedb.js");
var config=require(__dirname+"/../config");
exports.router=function(app,upload){

	app.use(function(req,res,next){//initUser
		if(users_sessions.autorizedUsers[req.session.id]==undefined)//init session
			users_sessions.newUser(req);
		if(req.isAuthenticated()&&users_sessions.autorizedUsers[req.session.id].login==undefined)//init login
			users_sessions.autorizedUsers[req.session.id].initUserLogin(req.user);
		next();
	});
	//-----------------------------------------------------
	app.get("/"+config.get("admin_account:admin_login_page"),pass.ensureAuthenticated,pass.adminIsAuthenticated,function(req,res) {
	  res.render(__dirname+'/../views/template.ejs',{title:"Admin",header:parts.header(false),footer:parts.footer(false),content:content.adminSignIn()});
	});
	app.get("/admin_administrate",pass.ensureAuthenticated,pass.ensureAdminAuthenticated,function(req,res) {
	  res.render(__dirname+'/../views/template.ejs',{title:"Administrate",header:parts.header(req.isAuthenticated(),users_sessions.autorizedUsers[req.session.id].admin,users_sessions.autorizedUsers[req.session.id].login),footer:parts.footer(req.isAuthenticated(),parts.chat()),content:content.administrate()});
	});
	app.get("/",function(req,res) {
		content.main().then(function(result){
			res.render(__dirname+'/../views/template.ejs',{title:"Main",header:parts.header(req.isAuthenticated(),users_sessions.autorizedUsers[req.session.id].admin,users_sessions.autorizedUsers[req.session.id].login),footer:parts.footer(req.isAuthenticated(),parts.chat()),content:result});
		});
	});
	app.get("/incpass",function(req,res) {
	  res.send("false");
	});
	app.get("/register",pass.alreadyAuthenticated,function(req,res) {
	  	res.render(__dirname+'/../views/template.ejs',{title:"Welcome to Black Jack House",header:parts.header(false),footer:parts.footer(false,parts.chat()),content:content.register()});
	});
	app.get("/restorepswd",pass.alreadyAuthenticated,function(req,res) {
	  	res.render(__dirname+'/../views/template.ejs',{title:"Restore password",header:parts.header(false),footer:parts.footer(false,parts.chat()),content:content.restorepswd(req.isAuthenticated(),req.session.id)});
	});
	app.get("/signin",pass.alreadyAuthenticated,function(req,res) {
	  	res.render(__dirname+'/../views/template.ejs',{title:"Welcome back to Black Jack House",header:parts.header(false),footer:parts.footer(false,parts.chat()),content:content.signin()});
	});
	app.get("/signout",pass.signOut);
	app.get("/profile",pass.ensureAuthenticated,function(req,res){
		content.profile(req.session.id).then(function(result){
			res.render(__dirname+'/../views/template.ejs',{title:"Profile "+users_sessions.autorizedUsers[req.session.id].login,header:parts.header(req.isAuthenticated(),users_sessions.autorizedUsers[req.session.id].admin,users_sessions.autorizedUsers[req.session.id].login),footer:parts.footer(req.isAuthenticated(),parts.chat()),content:result});
		});
	});
	app.get("/chooseGame",pass.ensureAuthenticated,function(req,res){
		res.render(__dirname+'/../views/template.ejs',{title:"Choose game table",header:parts.header(req.isAuthenticated(),users_sessions.autorizedUsers[req.session.id].admin,users_sessions.autorizedUsers[req.session.id].login),footer:parts.footer(req.isAuthenticated(),parts.chat()),content:content.chooseGame()});
	});
	app.get('/BlackJackGame',pass.ensureAuthenticated, function (req,res,next) {
	    var requestTableNum=req.url.split('table=')[1]-1;
	    var table=game.gameTables[requestTableNum];
		if(table==undefined)
			return next();//404page
	   res.render(__dirname+'/../views/template.ejs',{title:"Black Jack - Table "+table.tableNum,header:parts.header(req.isAuthenticated(),users_sessions.autorizedUsers[req.session.id].admin,users_sessions.autorizedUsers[req.session.id].login),footer:parts.footer(req.isAuthenticated(),parts.chat()),content:content.game(table)});
	});
	app.post('/signin',pass.authenticate,pass.authenticateRememberMe,function(req,res){
		res.end();
	});
	app.post('/adminsignin',pass.adminAuthenticate);
	app.post('/register', function (req, res) {
	  validator.validator(req,res);
	});
	app.post('/avatarUpload', function (req, res) {
	  upload(req, res, function(err) {
	  if(err)
	    return;
	  res.redirect("/profile");
	  });
	});
	app.use(function(req,res) {//404
	  res.status(404);
	  res.render(__dirname+'/../views/template.ejs',{title:"Page not found",header:parts.header(req.isAuthenticated(),users_sessions.autorizedUsers[req.session.id].admin,users_sessions.autorizedUsers[req.session.id].login),footer:parts.footer(req.isAuthenticated(),parts.chat()),content:content.err404()});
	});
	app.use(function(err,req,res,next){//500
      if(config.get("system_log"))
        dbnedb.db.system.insert({dateStamp:new Date(),initby:"ERROR",event:err});
      if(config.get("globalLog"))
        console.error(err);
	  res.status(500);
	  res.render(__dirname+'/../views/template.ejs',{title:"Something wrong...",header:parts.header(req.isAuthenticated(),users_sessions.autorizedUsers[req.session.id].admin,users_sessions.autorizedUsers[req.session.id].login),footer:parts.footer(req.isAuthenticated(),parts.chat()),content:content.err500()});
	});
}