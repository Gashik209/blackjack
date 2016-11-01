var dbnedb=require(__dirname+"/dbnedb.js");
var app=require(__dirname+"/../app.js");
var users_sessions=require(__dirname+"/users_sessions.js");
var config=require(__dirname+"/../config");

exports.validator=function(req,res) {
	switch(req.body.query){
		case "checkLogin":checkLogin(req,res);
			break;
		case "checkEmail":checkEmail(req,res);
			break;
    case "registration":registration(req,res);
      break;
    case "restorepswd":restorepswd(req,res);
      break;
    case "restorepswdch":restorepswdch(req,res);
      break;
    case "changePasswd":passwordChange(req,res);
      break;
    case "changeEmail":emailChange(req,res);
      break;
    case "changeSecret":secretChange(req,res);
      break;
    case "removeAccount":removeAccount(req,res)
	}

  //-------------------------------------------check Login------------------------------------------------
  function checkLogin(req,res){
    var callbackCheckLogin=function(err,data){
        if(data!=null){
          res.send("true");
        }
        else{
          res.send("false");
        }
    }
    dbnedb.db.users.findOne({username:req.body.username},callbackCheckLogin)
  }
  //-------------------------------------------check Email------------------------------------------------
  function checkEmail(req,res){
    var callbackcheckEmail=function(err,data){
        if(data!=null){
          res.send("true");
        }
        else{
          res.send("false");
        }
    }
    dbnedb.db.users.findOne({email:req.body.email},callbackcheckEmail)
  }
  //-------------------------------------------restore pswd-----------------------------------------------
  function restorepswd(req,res){
      if(users_sessions.autorizedUsers[req.session.id].restorepswd!=undefined&&req.user!=undefined)
        return;
    var username=req.body.username;
    var secret=req.body.secret;
    var email=req.body.email;
    function secretCheck(err, data){
      if(!app.bcrypt.compareSync(secret, data.secret))
          return res.send("secretfalse");
      if(email!=data.email)
          return res.send("emailfalse");
      users_sessions.autorizedUsers[req.session.id].restorepswd=true;
      users_sessions.autorizedUsers[req.session.id].login=username;
      res.end();
    }
    if(secretValidation(secret)||userNameValidation(username)||emailValidation(email))
      return dbnedb.db.users.findOne({username:username},secretCheck);
    res.end();
  }
  //-------------------------------------------restore pswd ch-----------------------------------------------
  function restorepswdch(req,res){
      if(!users_sessions.autorizedUsers[req.session.id].restorepswd)
        return;
    var password=req.body.password;
    var username=users_sessions.autorizedUsers[req.session.id].login;
    function passwordChange(err, data){
      password=app.bcrypt.hashSync(password);
      dbnedb.db.users.update({username:username},{$set:{password:password}}, {}, function (err, numReplaced) {
          res.send("/");
      });
      delete users_sessions.autorizedUsers[req.session.id].restorepswd;
      delete users_sessions.autorizedUsers[req.session.id].login;
      if(config.get("globalLog"))
        console.log(username+": change password by restore!");
      if(config.get("system_log"))
        dbnedb.db.system.insert({dateStamp:new Date(),initby:"users_control",event:username+": change password by restore"});
    }
    if(passwordValidation(password))
      return dbnedb.db.users.findOne({username:username},passwordChange);
    res.send("/restorepswd");
  }
  //-------------------------------------------Password Change---------------------------------------------
  function passwordChange(req,res){
    if(!req.isAuthenticated())
      return;
    var username=req.user.username;
    var secret=req.body.secret;
    var password=req.body.password;
    function secretCheck(err, data){
      if(!app.bcrypt.compareSync(secret, data.secret))
          return res.send("false");
      password=app.bcrypt.hashSync(password);
      dbnedb.db.users.update({username:username},{$set:{password:password}}, {}, function (err, numReplaced) {
          res.end();
      });
      if(config.get("globalLog"))
        console.log(username+": change password!");
      if(config.get("system_log"))
        dbnedb.db.system.insert({dateStamp:new Date(),initby:"users_control",event:username+": change password"});
    }
    if(secretValidation(secret)||passwordValidation(password))
      return dbnedb.db.users.findOne({username:username},secretCheck);
    res.end();
  }
  //-------------------------------------------Email Change---------------------------------------------
  function emailChange(req,res){
    if(!req.isAuthenticated())
      return;
    var username=req.user.username;
    var password=req.body.password;
    var email=req.body.email;
    function emailCheck(err,data){
        if(data!=null)
          return res.send("exist");
        dbnedb.db.users.findOne({username:username},passwordCheck);
    }
    function passwordCheck(err,data){
      if(!app.bcrypt.compareSync(password,data.password))
          return res.send("false");
      dbnedb.db.users.update({username:username},{$set:{email:email}}, {}, function (err, numReplaced) {
          res.end();
      });
      if(config.get("globalLog"))
        console.log(username+": change email!");
      if(config.get("system_log"))
        dbnedb.db.system.insert({dateStamp:new Date(),initby:"users_control",event:username+": change email"});
    }
    if(emailValidation(email)||passwordValidation(password))
        return dbnedb.db.users.findOne({email:email},emailCheck);
    res.end();
  }
  //-------------------------------------------changeSecret------------------------------------------------
  function secretChange(req,res){
    if(!req.isAuthenticated())
      return;
    var username=req.user.username;
    var password=req.body.password;
    var secret=req.body.secret;
    function passwordCheck(err,data){
      if(!app.bcrypt.compareSync(password, data.password))
          return res.send("false");
      secret=app.bcrypt.hashSync(secret);
      dbnedb.db.users.update({username:username},{$set:{secret:secret}}, {}, function (err, numReplaced) {
          res.end();
      });
      if(config.get("globalLog"))
        console.log(username+": change secret!");
      if(config.get("system_log"))
        dbnedb.db.system.insert({dateStamp:new Date(),initby:"users_control",event:username+": change secret"});
    }
    if(passwordValidation(password)||secretValidation(secret))
        return dbnedb.db.users.findOne({username:username},passwordCheck);
    res.end();
  }
   //-------------------------------------------removeAccount------------------------------------------------
  function removeAccount(req,res){
    if(!req.isAuthenticated())
      return;
    var username=req.user.username;
    var userid=req.user._id;
    var password=req.body.password;
    var secret=req.body.secret;
    function passwordCheck(err,data){
      if(!app.bcrypt.compareSync(password, data.password))
          return res.send("passfalse");
      if(!app.bcrypt.compareSync(secret, data.secret))
          return res.send("secretfalse");
      res.redirect("/signout");
      dbnedb.db.users.remove({_id:userid}, {}, function (err, numRemoved) {

      });
      dbnedb.db.usersStat.remove({userId:userid}, {}, function (err, numRemoved) {

      });
      if(config.get("globalLog"))
        console.log(username+": remove account!");
      if(config.get("system_log"))
        dbnedb.db.system.insert({dateStamp:new Date(),initby:"users_control",event:username+": remove account"});
    }
    if(passwordValidation(password)||secretValidation(secret))
        return dbnedb.db.users.findOne({username:username},passwordCheck);
    res.end();
  }
  //-------------------------------------------registration------------------------------------------------
  function registration(req,res){
    var username=req.body.username;
    var password=req.body.password;
    var email=req.body.email;
    var secret=req.body.secret;

    function registration(){
      var regdate=new Date();
      regdate.setHours(0, 0, 0, 0, 0);
      password=app.bcrypt.hashSync(password);
      secret=app.bcrypt.hashSync(secret);
      dbnedb.db.users.insert({  
                            username:username,
                            password:password,
                            email:email,
                            secret:secret,
                            avatar:"$undefined.jpg"
                        },function(err, newDoc){
                            dbnedb.db.usersStat.insert({
                                                        userId:newDoc._id,
                                                        regdate:regdate,
                                                        lastvisit:regdate,
                                                        maxwin:0,
                                                        maxlost:0,
                                                        played:0,
                                                        win:0,
                                                        loose:0,
                                                        bank:1000
                            });
                        });
      if(config.get("globalLog"))
        console.log(username+": registration success!");
      if(config.get("system_log"))
        dbnedb.db.system.insert({dateStamp:new Date(),initby:"users_control",event:username+": registration success!"});
      res.send("/");
    }
    function loginCheck(err,data){
        if(data!=null){
          return
        }
        else{
          dbnedb.db.users.findOne({email:email},emailCheck);
        }
    }
    function emailCheck(err,data){
        if(data!=null){
          return
        }
        else{
          registration();
        }
    }

    if(userNameValidation(username)||emailValidation(email)||passwordValidation(password)||secretValidation(secret)){
      dbnedb.db.users.findOne({username:username},loginCheck);
    }
    else{
      res.end();
    }
  }
  //-------------------------------------------fields validation------------------------------------------------
  function userNameValidation(username){
    if (username.match(/^\w{1,}$/g)===null) {
      return false;
    }
    else if(username.match(/^.{4,16}$/g)===null){
      return false;
    }
    else if(username.match(/^[A-z]/)){
      return false;
    }
    return true;
  }
  function emailValidation(email){
    if (email.match(/^([a-z0-9_\.-])+@[a-z0-9-]+\.([a-z]{2,4}\.)?[a-z]{2,4}$/i)===null) {
      return false;
    }
    return true;
  }
  function passwordValidation(password){
    if ((password.match(/[а-яa-z]{1,}/)===null)||(password.match(/[А-ЯA-Z]{1,}/)===null)||(password.match(/[0-9]{1,}/)===null)||(password.match(/^.{4,16}$/g)===null)) {
      return false;
    }
    return true;
  }
  function secretValidation(secret){
    if (req.body.secret.match(/^\w{1,}$/g)===null) {
      return false;
    }
    return true;
  }


}