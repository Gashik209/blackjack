var dbnedb=require(__dirname+"/dbnedb.js");
var app=require(__dirname+"/../app.js")
var users_sessions=require(__dirname+"/users_sessions.js");

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

	exports.authenticate=passport.authenticate('local',{failureRedirect: '/signUp'});

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
  res.redirect('/signup');
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
	dbnedb.db.sessions.insert([{token:token,userId:uid}], function(err) {return err});
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
