
var dbnedb=require(__dirname+"/dbnedb.js");
var config=require(__dirname+"/../config");
var sockets=require(__dirname+"/socket.js");
var autorizedUsers={};
var User=function(req){
	this.admin=false;
	this.id;
	this.connected=new Date();
	this.device=req.device.type;
	this.login;
	this.avatar;
	this.socket;
	this.location;
	this.table;
	this.bank;
	this.played;
	this.win;
	this.loose;
	this.maxWin;
	this.maxLost;
	this.ingamePlace=[];
}
exports.newUser=function(req){
	autorizedUsers[req.session.id]=new User(req);
}
exports.autorizedUsers=autorizedUsers;
User.prototype.initUserSocket=function(socketID,location){
	this.socket=socketID;
	this.location=location;
}
User.prototype.initUserLogin=function(user){
	this.login=user.username;
	this.id=user._id;
	this.initUserAvatar();
	this.initUserStats();
	this.initActivity();
}
User.prototype.initUserAvatar=function(){
	dbnedb.db.users.findOne({'_id':this.id},
	    function(err, data) {
	      	this.avatar=data.avatar;
	    }.bind(this));
}
User.prototype.initUserStats=function(){
	dbnedb.db.usersStat.findOne({'userId':this.id},
	    function(err, data) {
	      	this.played=data.played;
			this.win=data.win;
			this.loose=data.loose;
			this.maxWin=data.maxwin;
			this.maxLost=data.maxlost;
	    }.bind(this));
}
User.prototype.initUserAdmin=function(){
	this.admin=true;
}
User.prototype.playerInfo=function(userId){
	userId=userId||this.id;
	return new Promise(function (resolve, reject) {
		dbnedb.db.usersStat.findOne({'userId':userId},
		    function(err, data) {
		      	resolve (data);
		    });
	});
}
User.prototype.incIngamePlace=function(place){
	this.ingamePlace.push(place);
}
User.prototype.leaveTable=function(){
	if(this.bank!=undefined)
		this.updDbUserStatictic();
	this.ingamePlace=[];
	this.table=undefined;
}
User.prototype.leavePlace=function(place){
	this.ingamePlace.forEach(function(item,i){
		if(item==place)
			this.ingamePlace.splice(i,1);
	}.bind(this));
	if(this.ingamePlace.leangth==0&&this.bank!=undefined)
		this.updDbUserStatictic();
}
User.prototype.findPlayerBank=function(){
	return new Promise(function (resolve, reject) {
		dbnedb.db.usersStat.findOne({'userId':this.id},
		    function(err, data) {
		      	this.bank=data.bank;
		      	resolve ({bank:this.bank,login:this.login});
		    }.bind(this));
	}.bind(this));
}
User.prototype.checkAvaibleBet=function(chipCost){
	if(chipCost>this.bank)
		return true;
	this.bank-=chipCost;
}
User.prototype.updUserStatistic=function(statistic){
	this.bank+=statistic.betWin;
	this.win+=statistic.win;
	this.loose+=statistic.loose;
	if(this.maxWin<statistic.maxWin)
		this.maxWin=statistic.maxWin;
	if(this.maxLost<statistic.maxLost)
		this.maxLost=statistic.maxLost;
	this.played+=statistic.played;
	this.updDbUserStatictic();
}
User.prototype.updDbUserStatictic=function(){
    dbnedb.db.usersStat.update({userId:this.id},{$set:{bank:this.bank,win:this.win,loose:this.loose,maxwin:this.maxWin,maxlost:this.maxLost,played:this.played}}, {}, function (err, numReplaced) {
      if(err)  	console.error(err);
    });
}
User.prototype.initActivity=function(){
	var today=new Date();
    today.setHours(0,0,0,0,0);
	dbnedb.db.usersStat.findOne({'userId':this.id},
		    function(err, data) {
		    	if(today>data.lastvisit){
		    		var bonus=activityBonus(config.get("activity_bonus:min"),config.get("activity_bonus:max"));
				    dbnedb.db.usersStat.update({userId:this.id},{$set:{lastvisit:today,bank:parseInt(data.bank+bonus)}}, {}, function (err, numReplaced) {
				      	if(err)	console.error(err);
				      	setTimeout(function() {
				      		sockets.chatPrivate(this.socket,"System","Activity bonus "+bonus);
				      	}.bind(this), 1000);
				    }.bind(this));
				}
		    }.bind(this));
	function activityBonus(min,max){
		return Math.round(Math.random()*((max-min)+min));
	}
}