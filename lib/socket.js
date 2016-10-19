
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
			socket.emit('tableInfo',game.gameTables[table].tableUsersInGame());
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
			io.in(table).emit('tableInfo',game.gameTables[table].tableUsersInGame());
		});

		socket.on("chipToBank",function(data){
			// console.log(data.place+";"+data.chipcost);
			game.gameTables[table].chipToBank(data,sessionID);
		});

		socket.on("betsDone",function(data){
			game.gameTables[table].betsDone(data,sessionID);
		});
		socket.on("hit",function(data){
			game.gameTables[table].playerHit(data,sessionID);
		});
		socket.on("stand",function(data){
			game.gameTables[table].playerStand(data,sessionID);
		});

  		socket.on("disconnect", function(){//socket disconnect
  			if(table!=undefined){
  				game.gameTables[table].leaveTable(sessionID);
  				io.in(table).emit('tableInfo',game.gameTables[table].tableUsersInGame());
  			}
 		});

	});
	exports.initBetsStage=function(result,table){
		io.in(table).emit("betsStage",result);
	}
	exports.sendCard=function(table,player,cardSuit,cardVal){
		io.in(table).emit('sendCard',{player:player,cardSuit:cardSuit,cardVal:cardVal});
	}
	exports.initTradeButtons=function(sessionID,place){
		io.to(users_sessions.autorizedUsers[sessionID].socket).emit('initTradeButtons',place);
	}
	exports.destroyCards=function(table){
		io.in(table).emit('destroyCards');
	}
	exports.openSecondDealerCard=function(table,cardSuit,cardVal){
		io.in(table).emit('openSecondDealerCard',{cardSuit:cardSuit,cardVal:cardVal});
	}
}
function userSessionId(socket){
	return socket.request.cookies["connect.sid"].split(':')[1].split('.')[0];
}