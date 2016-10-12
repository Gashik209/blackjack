var users_sessions=require(__dirname+"/users_sessions.js");
var pass=require(__dirname+"/passport.js");
var validator=require(__dirname+"/validation.js");
var content=require(__dirname+"/../views/content.js");
var parts=require(__dirname+"/../views/parts.js");
var game=require(__dirname+"/game.js");
exports.router=function(app){

	app.use(function(req,res,next){//initUser
		if(users_sessions.autorizedUsers[req.session.id]==undefined)//init session
			users_sessions.newUser(req);
		if(req.isAuthenticated()&&users_sessions.autorizedUsers[req.session.id].login==undefined)//init login
			users_sessions.autorizedUsers[req.session.id].initUserLogin(req.user);
		next();
	});
	//--------------------DEVELOP URL-----------------------
	app.get("/develop",function(req,res) {
		var content="";
		for(var key in users_sessions.autorizedUsers){
			content+="<b>session :"+key+"</b><br>";
			content+="device: "+users_sessions.autorizedUsers[key].device+"<br>";
			content+="connected: "+users_sessions.autorizedUsers[key].connected+"<br>";
			content+="id: "+users_sessions.autorizedUsers[key].id+"<br>";
			content+="login: "+users_sessions.autorizedUsers[key].login+"<br>";
			content+="socket: "+users_sessions.autorizedUsers[key].socket+"<br>";
			content+="location: "+users_sessions.autorizedUsers[key].location+"<br>";
			content+="table: "+users_sessions.autorizedUsers[key].table+"<br>";
			content+="ingamePlace: "+users_sessions.autorizedUsers[key].ingamePlace+"<br>";
			content+="<br>";
		}
		content+="<hr><br>";
		for(var key in game.gameTables){
			content+="<b>table :"+key+"</b><br>";
			content+="tableNum: "+game.gameTables[key].tableNum+"<br>";
			content+="tableMinBet: "+game.gameTables[key].tableMinBet+"<br>";
			content+="tableMaxBet: "+game.gameTables[key].tableMaxBet+"<br>";
			content+="created: "+game.gameTables[key].created+"<br>";
			content+="creater: "+game.gameTables[key].creater+"<br>";
			content+="gameStatus: "+game.gameTables[key].gameStatus+"<br>";
			content+="roundNum: "+game.gameTables[key].roundNum+"<br>";
			for(var player in game.gameTables[key].players){
				content+="player"+player+": "+game.gameTables[key].players[player]+"<br>";
			}
			content+="dealer: ";
			for(var dealerCard in game.gameTables[key].dealer){
				content+=game.gameTables[key].dealer[dealerCard]+",";
			}
			content+="<br>";
			content+="cardDecks:<br>";
			for (var i=game.gameTables[key].cardDecks.length-1; i>=0; i--) {
				for (var j=game.gameTables[key].cardDecks[i].length-1; j>=0; j--) {
					content+=game.gameTables[key].cardDecks[i][j][0]+"."+game.gameTables[key].cardDecks[i][j][1]+";";
				}
				content+="<br>";
			}
			content+="activeDeck: "+game.gameTables[key].activeDeck+"<br>";
			content+="roundBank: "+game.gameTables[key].roundBank+"<br>";
			content+="<br>";
		}
	  res.send(content);
	});
	//-----------------------------------------------------
	app.get("/",function(req,res) {
	  res.render(__dirname+'/../views/template.ejs',{title:"Main",header:parts.header(req.isAuthenticated(),users_sessions.autorizedUsers[req.session.id].login),footer:parts.footer(req.isAuthenticated(),parts.chat()),content:content.main()});
	});
	app.get("/register",pass.alreadyAuthenticated,function(req,res) {
	  	res.render(__dirname+'/../views/template.ejs',{title:"Welcome to Black Jack House",header:parts.header(false),footer:parts.footer(false,parts.chat()),content:content.register()});
	});
	app.get("/signin",pass.alreadyAuthenticated,function(req,res) {
	  	res.render(__dirname+'/../views/template.ejs',{title:"Welcome back to Black Jack House",header:parts.header(false),footer:parts.footer(false,parts.chat()),content:content.signin()});
	});
	app.get("/signout",pass.signOut);
	app.get("/chooseGame",pass.ensureAuthenticated,function(req,res){
		res.render(__dirname+'/../views/template.ejs',{title:"Choose game table",header:parts.header(req.isAuthenticated(),users_sessions.autorizedUsers[req.session.id].login),footer:parts.footer(req.isAuthenticated(),parts.chat()),content:content.chooseGame()});
	});
	app.get('/BlackJackGame',pass.ensureAuthenticated, function (req,res,next) {
	    var requestTableNum=req.url.split('table=')[1]-1;
	    var table=game.gameTables[requestTableNum];
		if(table==undefined)
			return next();//404page
	   res.render(__dirname+'/../views/template.ejs',{title:"Black Jack - Table "+table,header:parts.header(req.isAuthenticated(),users_sessions.autorizedUsers[req.session.id].login),footer:parts.footer(req.isAuthenticated(),parts.chat()),content:content.game(table)});
	});
	app.post('/signUp',pass.authenticate,pass.authenticateRememberMe,function(req,res){
		res.end();
	});
	app.post('/register', function (req, res) {
	  validator.validator(req,res);
	});
	app.use(function(req,res) {//404
	  res.status(404);
	  res.render(__dirname+'/../views/template.ejs',{title:"Page not found",header:parts.header(req.isAuthenticated(),users_sessions.autorizedUsers[req.session.id].login),footer:parts.footer(req.isAuthenticated(),parts.chat()),content:content.err404()});
	});
	app.use(function(err,req,res,next){//500
	  console.error(err);
	  res.status(500);
	  res.render(__dirname+'/../views/template.ejs',{title:"Something wrong...",header:parts.header(req.isAuthenticated(),users_sessions.autorizedUsers[req.session.id].login),footer:parts.footer(req.isAuthenticated(),parts.chat()),content:content.err500()});
	  // res.render(__dirname+'/../views/template.ejs',{title:"Something wrong...",header:parts.header(false,"zz"),footer:parts.footer(false,parts.chat()),content:content.err500()});
	});
}