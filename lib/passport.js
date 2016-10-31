var dbnedb=require(__dirname+"/dbnedb.js");
var app=require(__dirname+"/../app.js")
var users_sessions=require(__dirname+"/users_sessions.js");
var config=require(__dirname+"/../config");

exports.pass=function(passport,LocalStrategy,RememberMeStrategy){

	passport.serializeUser(function(user, done) {
	  done(null, user);
	});
	passport.deserializeUser(function(user, done) {
	  done(null, user);
	});

	var isValidPassword = function(user, password){
	  return app.bcrypt.compareSync(password, user.password);
	}

	passport.use(new LocalStrategy(
	  function(username, password, done) {
	    process.nextTick(function () {
	      dbnedb.db.users.findOne({'username':username},
	      function(err, user) {
	        if (err) { return done(err); }
	        if (!user) { return done(null, false); }
	        if (!isValidPassword(user, password)) { return done(null, false); }
	        return done(null, user);
	      });
	    });
	  }
	));

	passport.use(new RememberMeStrategy(
		function(token, done) {
		    consumeRememberMeToken(token, function (err, uid) {
		    	if (err) { return done(err); }
		    	if (!uid) { return done(null, false); }
			    dbnedb.db.users.findOne({'_id':uid},function(err, user) {
			    	if (err) { return done(err); }
			    	if (!user) { return done(null, false); }
			    	return done(null, user);
			    });
		    });
		},
		issueToken
	));

	exports.authenticate=passport.authenticate('local',{failureRedirect: '/incpass'});

	exports.authenticateRememberMe=function(req, res, next) {
		if(!req.body.remember_me){ return next(); }
	    issueToken(req.user, function(err, token) {
	    	if (err) { return next(err); }
	    	res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: 1000*60*60*24*1 });//1 day
	    	return next();
	    });
  	}
}

exports.ensureAuthenticated=function(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/signin');
}
exports.alreadyAuthenticated=function(req, res, next) {
  if (!req.isAuthenticated()) { return next(); }
  res.redirect('/');
}
exports.signOut=function(req,res){
	delete users_sessions.autorizedUsers[req.session.id];
	res.clearCookie('remember_me');
	req.logout();
	req.session.destroy();
	res.redirect('/');
}


function issueToken(user, done) {
  var token = randomString(64);
  saveRememberMeToken(token, user._id, function(err) {
    if (err) { return done(err); }
    return done(null, token);

  });
	function randomString(len) {
		function getRandomInt(min, max) {
		  return Math.floor(Math.random() * (max - min + 1)) + min;
		}
		var buf=[];
		var chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		var charlen=chars.length;
		for (var i = 0; i < len; ++i) {
		  buf.push(chars[getRandomInt(0, charlen - 1)]);
		}
		return buf.join('');
	};
}
function saveRememberMeToken(token, uid, fn) {
	var expDate=new Date();
	expDate.setDate(expDate.getDate()+config.get("remember_me_duration"));
	dbnedb.db.sessions.insert([{token:token,userId:uid,expDate:expDate}], function(err) {return err});
	return fn();
}
function consumeRememberMeToken(token, done) {
    dbnedb.db.sessions.findOne({'token':token},
    function(err, session) {
    	if (!session) { return done(null, false); }
    	dbnedb.db.sessions.remove({'token':token}, {}, function (err, numRemoved) {
  			return done(null, session.userId);
		});
    });
}
exports.removeExpearedSessions=function(){
	dbnedb.db.sessions.remove({'expDate':{$lt:new Date()}}, {multi:true}, function (err, numRemoved) {
		if(config.get("globalLog")&&numRemoved)
			console.log("System: Removed "+numRemoved+" old sessions;");
      	if(config.get("system_log"))
        	dbnedb.db.system.insert({dateStamp:new Date(),initby:"users_control",event:"removed "+numRemoved+" old sessions"});
	});
}
exports.adminAuthenticate=function(req,res,next){
	if(req.body.username==config.get("admin_account:login")&&req.body.password==config.get("admin_account:password")){
		users_sessions.autorizedUsers[req.session.id].initUserAdmin();
      	if(config.get("system_log"))
        	dbnedb.db.system.insert({dateStamp:new Date(),initby:"users_control",event:"administrator permission for "+req.user.username});
	}
	res.end();
}
exports.adminIsAuthenticated=function(req,res,next){
	if(users_sessions.autorizedUsers[req.session.id].admin)
		return res.redirect("/admin_administrate");
	next();
}
exports.ensureAdminAuthenticated=function(req,res,next){
	if(users_sessions.autorizedUsers[req.session.id].admin)
		return next();
	res.redirect("/");
}