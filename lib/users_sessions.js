
var dbnedb=require(__dirname+"/dbnedb.js");
var sockets=require(__dirname+"/socket.js");
var autorizedUsers={};
var User=function(req){
	this.id;
	this.connected=new Date();
	this.device=req.device.type;
	this.login;
	this.socket;
	this.location;
	this.table;
	this.bank;
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
}
User.prototype.incIngamePlace=function(place){
	this.ingamePlace.push(place);
}
User.prototype.leaveTable=function(){
	this.ingamePlace=[];
	this.table=undefined;
}
User.prototype.leavePlace=function(place){
	this.ingamePlace.forEach(function(item,i){
		if(item==place){
			this.ingamePlace.splice(i,1);
			
		}
	}.bind(this));
}
User.prototype.updPlayerBank=function(){
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