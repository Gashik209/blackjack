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
    case "rememberPswd":res.end();
      break;
    case "changePasswd":passwordChange(req,res);
      break;
    case "changeEmail":emailChange(req,res);
      break;
    case "changeSecret":secretChange(req,res);
      break;
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
  //-------------------------------------------Password Change---------------------------------------------
  function passwordChange(req,res){
    var username=users_sessions.autorizedUsers[req.session.id].login;
    var secret=req.body.secret;
    var password=req.body.password;
    function secretCheck(err, data){
      password=app.bcrypt.hashSync(password);
      if(data.secret!=secret){
          res.send("false");
          return
      }
      else{
        dbnedb.db.users.update({username:username},{$set:{password:password}}, {}, function (err, numReplaced) {
          res.send("true");
        });
      }
    }
    if(secretValidation(secret)||passwordValidation(password)){
      dbnedb.db.users.findOne({username:username},secretCheck);
    }
    else{
      res.end();
    }
  }
  //-------------------------------------------Email Change---------------------------------------------
  function emailChange(req,res){
    var username=users_sessions.autorizedUsers[req.session.id].login;
    var password=req.body.password;
    var email=req.body.email;
    function emailCheck(err,data){
        if(data!=null){
          res.send("exist");
          return
        }
        else{
          dbnedb.db.users.findOne({username:username},passwordCheck);
        }
    }
    function passwordCheck(err,data){
      if(!app.bcrypt.compareSync(password, data.password)){
          res.send("false");
          return
      }
      else{
        dbnedb.db.users.update({username:username},{$set:{email:email}}, {}, function (err, numReplaced) {
          res.send("true");
        });
      }
    }
    if(emailValidation(email)||passwordValidation(password)){
      dbnedb.db.users.findOne({email:email},emailCheck);
    }
    else{
       res.end();
    }
  }
  //-------------------------------------------changeSecret------------------------------------------------
  function secretChange(req,res){
    var username=users_sessions.autorizedUsers[req.session.id].login;
    var password=req.body.password;
    var secret=req.body.secret;
    function passwordCheck(err,data){
      if(!app.bcrypt.compareSync(password, data.password)){
          res.send("false");
          return
      }
      else{
        dbnedb.db.users.update({username:username},{$set:{secret:secret}}, {}, function (err, numReplaced) {
          res.send("true");
        });
      }
    }
    if(passwordValidation(password)||secretValidation(secret)){
      dbnedb.db.users.findOne({username:username},passwordCheck);
    }
    else{
      res.end();
    }
  }
  //-------------------------------------------rememberPassword--------------------------------------------
  //-------------------------------------------registration------------------------------------------------
  function registration(req,res){
    var username=req.body.username;
    var password=req.body.password;
    var email=req.body.email;
    var secret=req.body.secret;

    function registration(){
      password=app.bcrypt.hashSync(password);
      dbnedb.db.users.insert({  
                            username:username,
                            password:password,
                            email:email,
                            secret:secret
                        },function(err, newDoc){
                            dbnedb.db.usersStat.insert({
                                                        userId:newDoc._id,
                                                        avatar:"$undefined.jpg",
                                                        regdate:new Date(),
                                                        lastvisit:new Date(),
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








