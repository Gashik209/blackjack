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