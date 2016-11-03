var chat=require(__dirname+"/chat.js");
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
		});

		socket.on('sitOnPlace', function(place){//--sit on place
			game.gameTables[table].sitOnPlace(place,sessionID);
			io.in(table).emit('tableInfo',game.gameTables[table].tableUsersInGame());
		});
		socket.on('standFromPlace', function(place){//--sit on place
			game.gameTables[table].standFromPlace(place,sessionID);
			io.in(table).emit('tableInfo',game.gameTables[table].tableUsersInGame());
		});
		socket.on("chipToBank",function(data){
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
		socket.on("x2",function(data){
			game.gameTables[table].playerX2(data,sessionID);
		});
		socket.on("chat",function(msg){
			chat.chat(sessionID,table,msg);
		});
		socket.on("playerInfo",function(place){
			if(game.gameTables[table]==undefined)
				return;
			if(game.gameTables[table].players[place]==null)
				return;
			users_sessions.autorizedUsers[sessionID].playerInfo(users_sessions.autorizedUsers[game.gameTables[table].players[place].sessionID].id).then(function(result){
				socket.emit('playerInfo', {login:users_sessions.autorizedUsers[game.gameTables[table].players[place].sessionID].login,bank:result.bank,played:result.played,percWin:result.played>0?Math.ceil((+result.win/+result.played)*100):0});
			});
		});
  		socket.on("disconnect", function(){//socket disconnect
  			if(table!=undefined){
  				game.gameTables[table].leaveTable(sessionID);
  				io.in(table).emit('tableInfo',game.gameTables[table].tableUsersInGame());
  			}
 		});

	});
	exports.initBetsStage=function(data,table){
		io.in(table).emit("betsStage",data);
	}
	exports.sendCard=function(table,player,cardSuit,cardVal){
		io.in(table).emit('sendCard',{player:player,cardSuit:cardSuit,cardVal:cardVal});
	}
	exports.initTradeRound=function(players,table,activeDeck){
		io.in(table).emit('initTradeRound',players,activeDeck);
	}
	exports.destroyCards=function(table){
		io.in(table).emit('destroyCards');
	}
	exports.openSecondDealerCard=function(table,cardSuit,cardVal){
		io.in(table).emit('openSecondDealerCard',{cardSuit:cardSuit,cardVal:cardVal});
	}
	exports.chat=function(table,login,msg){
		io.in(table).emit('chat',login,msg);
	}
	exports.chatPrivate=function(socketId,login,msg){
		io.to(socketId).emit('chat',login,msg);
	}
	exports.dealerInfo=function(table,msg){
		io.in(table).emit('dealerInfo',msg,2000);
	}
}
function userSessionId(socket){
	return socket.request.cookies["connect.sid"].split(':')[1].split('.')[0];
}