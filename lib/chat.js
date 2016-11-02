var dbnedb=require(__dirname+"/dbnedb.js");
var sockets=require(__dirname+"/socket.js");
var config=require(__dirname+"/../config");
var users_sessions=require(__dirname+"/users_sessions.js");
exports.chat=function(sessionID,table,msg){
	if(msg.substr(0,8)=="private["){
		to=msg.split("[")[1].split("]")[0];
		for(var item in users_sessions.autorizedUsers){
			if(to==users_sessions.autorizedUsers[item].login)
				return sockets.chatPrivate(users_sessions.autorizedUsers[item].socket,users_sessions.autorizedUsers[sessionID].login,msg.split("]")[1])
		}	
	}
	else{
		if(table!=undefined){
			sockets.chat(table,users_sessions.autorizedUsers[sessionID].login,msg);
		}
		else{
			sockets.chat("main",users_sessions.autorizedUsers[sessionID].login,msg);
		}
	}
	if(config.get("globalLog")){
		if(table!=undefined){
			console.log("Chat Table № "+table+": "+users_sessions.autorizedUsers[sessionID].login+" - "+msg+";");
		}
		else{
			console.log("Chat Main: "+users_sessions.autorizedUsers[sessionID].login+" - "+msg+";");
		}
	}
	if(config.get("chat_log")){
		if(table!=undefined)
			var place="Table № "+table;
		var place="Main";
        dbnedb.db.chat.insert({
                                sendtime:new Date(),
                                place:place,
                                sender_id:users_sessions.autorizedUsers[sessionID].id,
                                login:users_sessions.autorizedUsers[sessionID].login,
                                message:msg
        });
	}
				

}
