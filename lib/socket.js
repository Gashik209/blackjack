var users_sessions=require(__dirname+"/users_sessions.js");
var game=require(__dirname+"/game.js");
exports.socket=function(io){
	io.on('connection', function(socket){//--connection
		var sessionID=userSessionId(socket);
		if(users_sessions.autorizedUsers[sessionID]==undefined)
			return;//users_sessions is not defined
		users_sessions.autorizedUsers[sessionID].initUserSocket(socket.id,socket.handshake.headers.referer);//add to users_sessions socket ID
		if(socket.handshake.headers.referer.indexOf('table')+1){
			var table=socket.handshake.headers.referer.split('table=')[1]-1;
			socket.join(table);//join socket room
			users_sessions.autorizedUsers[sessionID].table=table;
			socket.emit('tableInfo',tableUsersInGame(table));
		}
		else{
			socket.join("main");//join socket room
		}

		socket.on("addNewTable",function(data){//--NewTable
			game.initTable(data.minBet,data.maxBet,users_sessions.autorizedUsers[sessionID].login);
			socket.emit('addNewTable');
		});

		socket.on('sitOnPlace', function(place){//--sit on place
			game.gameTables[table].sitOnPlace(place,sessionID);
			io.in(table).emit('tableInfo',tableUsersInGame(table));
		});

		socket.on("chipToBank",function(chipcost){
			game.gameTables[table].chipToBank(chipcost,sessionID);
		});

		socket.on("betsDone",function(){
			game.gameTables[table].betsDone(sessionID);
		});

  		socket.on("disconnect", function(){//socket disconnect
  			if(table!=undefined){
  				game.gameTables[table].leaveTable(sessionID);
  				io.in(table).emit('tableInfo',tableUsersInGame(table));
  			}
 		});

	});
	exports.initTableBets=function(table){
		io.in(table).emit('showButton',"bet");
	}
	exports.sendCard=function(table,player,cardSuit,cardVal){
		io.in(table).emit('sendCard',{player:player,cardSuit:cardSuit,cardVal:cardVal});
	}
	exports.destroyCards=function(table){
		io.in(table).emit('destroyCards');
	}
}
function userSessionId(socket){
	return socket.request.cookies["connect.sid"].split(':')[1].split('.')[0];
}
function tableUsersInGame(table){
	return {0:game.gameTables[table].players[0]!=null?users_sessions.autorizedUsers[game.gameTables[table].players[0].sessionID].login:null,
			1:game.gameTables[table].players[1]!=null?users_sessions.autorizedUsers[game.gameTables[table].players[1].sessionID].login:null,
			2:game.gameTables[table].players[2]!=null?users_sessions.autorizedUsers[game.gameTables[table].players[2].sessionID].login:null,
			3:game.gameTables[table].players[3]!=null?users_sessions.autorizedUsers[game.gameTables[table].players[3].sessionID].login:null,
			4:game.gameTables[table].players[4]!=null?users_sessions.autorizedUsers[game.gameTables[table].players[4].sessionID].login:null}
}