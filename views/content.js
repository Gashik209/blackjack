var users_sessions=require(__dirname+"/../lib/users_sessions.js");
var app=require(__dirname+"/../app.js")
var config=require(__dirname+"/../config");
var game=require(__dirname+"/../lib/game.js")
var dbnedb=require(__dirname+"/../lib/dbnedb.js")
var parts=require(__dirname+"/parts.js");
exports.err404=function() {
	return app.fs.readFileSync(__dirname+'/content/err404.ejs', 'utf-8');
}
exports.err500=function() {
	return app.fs.readFileSync(__dirname+'/content/err500.ejs', 'utf-8');
}
exports.main=function() {
	return new Promise(function (resolvemain,reject) {
		var contentView=app.fs.readFileSync(__dirname+'/content/main.ejs', 'utf-8');
		var playersStats=[];
		var promise=new Promise(function (resolve,reject) {
	  		dbnedb.db.usersStat.find({}).sort({bank:-1}).limit(config.get("top_rating")).exec(function (err,docs) {
	  			if(docs.length==0)
	  				resolvemain(app.ejs.render(contentView, {rating:"You can be the first"}));
	  			docs.forEach(function(item,i,arr){
	  				dbnedb.db.users.findOne({_id:item.userId},
					    function(err,data) {
					    	playersStats.push({login:data.username,bank:item.bank});
					    	if(i==arr.length-1)
					    		resolve(playersStats);
					    });
		  		});
		  	});
		});
		promise.then(function(result){
		  		var playersRating="";
		  		result.forEach(function(item,i,arr){
		  			playersRating+="<b>"+item.login+"</b><span>:</span><span>"+item.bank+"</span></br>";
		  			if(i==arr.length-1)
		  				resolvemain(app.ejs.render(contentView, {rating:playersRating}));
		  		});
		  	});
	});
}
exports.profile=function(sessionID) {
	var page;
	var contentView=app.fs.readFileSync(__dirname+'/content/profile.ejs', 'utf-8');
	var promise=users_sessions.autorizedUsers[sessionID].playerInfo();
	return promise.then(function(result){
		var regdate=new Date(result.regdate)
		regdate=regdate.getDate()+"/"+parseInt(1+regdate.getMonth())+"/"+regdate.getFullYear();
		return app.ejs.render(contentView, {
			login:users_sessions.autorizedUsers[sessionID].login,
			avatar:"static/img/avatars/"+users_sessions.autorizedUsers[sessionID].avatar,
			bank:result.bank,
			regDate:regdate,
			played:result.played,
			win:result.win,
			draw:+result.played-+result.win-+result.loose,
			loose:result.loose,
			percWin:result.played>0?Math.ceil((+result.win/+result.played)*100):0,
			maxWin:result.maxwin,
			maxLost:result.maxlost
		});
	});
}
exports.register=function() {
	return app.fs.readFileSync(__dirname+'/content/register.ejs', 'utf-8');
}
exports.signin=function() {
	return app.fs.readFileSync(__dirname+'/content/signin.ejs', 'utf-8');
}
exports.administrate=function() {
	var content="<style>body{color:white;}</style>";
		for(var key in users_sessions.autorizedUsers){
			content+="<b>session :"+key+"</b><br>";
			content+="device: "+users_sessions.autorizedUsers[key].device+"<br>";
			content+="connected: "+users_sessions.autorizedUsers[key].connected+"<br>";
			content+="id: "+users_sessions.autorizedUsers[key].id+"<br>";
			content+="login: "+users_sessions.autorizedUsers[key].login+"<br>";
			content+="socket: "+users_sessions.autorizedUsers[key].socket+"<br>";
			content+="location: "+users_sessions.autorizedUsers[key].location+"<br>";
			content+="bank: "+users_sessions.autorizedUsers[key].bank+"<br>";
			content+="table: "+users_sessions.autorizedUsers[key].table+"<br>";
			content+="ingamePlace: "+users_sessions.autorizedUsers[key].ingamePlace+"<br>";
			content+="<br>";
		}
		content+="<hr><br>";
		for(var key in game.gameTables){
			content+="<b>table :"+key+"</b><br>";
			content+="tableNum: "+game.gameTables[key].tableNum+"<br>";
			content+="tableMinBet: "+game.gameTables[key].tableMinBet+"<br>";
			content+="tableMaxBet: "+game.gameTables[key].tableMaxBet+"<br>";
			content+="created: "+game.gameTables[key].created+"<br>";
			content+="creater: "+game.gameTables[key].creater+"<br>";
			content+="gameStatus: "+game.gameTables[key].gameStatus+"<br>";
			content+="roundNum: "+game.gameTables[key].roundNum+"<br>";
			for(var player in game.gameTables[key].players){
				if(game.gameTables[key].players[player]!=null){
					content+="_____player_"+player+"_sessionID: "+game.gameTables[key].players[player].sessionID+"<br>";
					content+="_____player_"+player+"_bet: "+game.gameTables[key].players[player].bet+"<br>";
					content+="_____player_"+player+"_cards: "+game.gameTables[key].players[player].cards+"<br>";
					content+="_____player_"+player+"_cardScore: "+game.gameTables[key].players[player].cardScore+"<br>";
					content+="_____player_"+player+"_playerStatus: "+game.gameTables[key].players[player].playerStatus+"<br>";
				}
				else{
					content+="player_"+player+": null<br>";
				}
			}
			content+="dealer cards: ";
			for(var dealerCard in game.gameTables[key].dealer.cards){
				content+=game.gameTables[key].dealer.cards[dealerCard]+";";
			}
			content+="<br>dealer score: ";
			content+=game.gameTables[key].dealer.cardScore;
			content+="<br>";
			content+="TableCardDecks:<br>";
			for (var i=0; i<=game.gameTables[key].cardDecks.length-1; i++) {
				content+="Deck "+(i+1)+": ";
				for (var j=game.gameTables[key].cardDecks[i].length-1; j>=0; j--) {
					content+=game.gameTables[key].cardDecks[i][j][0]+"."+game.gameTables[key].cardDecks[i][j][1]+";";
				}
				content+="<br>";
			}
			content+="activeDeck: "+(game.gameTables[key].activeDeck+1)+"<br>";
			content+="<br>";
		}
	return content;
}
exports.adminSignIn=function() {
	return app.fs.readFileSync(__dirname+'/content/adminSignin.ejs', 'utf-8');
}
exports.chooseGame=function(){
	var contentView=app.fs.readFileSync(__dirname+'/content/chooseGame.ejs', 'utf-8');
	var tableView=parts.gameTable();
	var tableContent="";
	game.gameTables.forEach(function(item,i,arr){
		var tableNum=item.tableNum;
		var minBet=item.tableMinBet
		var maxBet=item.tableMaxBet
		var countPlayers=0;
		for (var key in item.players) {
			if(item.players[key]!=null){
				countPlayers++;
			}
		}
		tableContent+=app.ejs.render(tableView, {tableNum:tableNum,minBet:minBet,maxBet:maxBet,players:countPlayers});
	});
	return app.ejs.render(contentView,{gameTables:tableContent});
}
exports.game=function(table) {
	var contentView=app.fs.readFileSync(__dirname+'/content/game.ejs', 'utf-8');
	return app.ejs.render(contentView, {tableNum:table.tableNum,tableMinBet:table.tableMinBet,tableMaxBet:table.tableMaxBet});
}
exports.restorepswd=function(isauth,sessionID) {
	if(!isauth&&users_sessions.autorizedUsers[sessionID].restorepswd==undefined)
		return app.fs.readFileSync(__dirname+'/content/restorepswd.ejs', 'utf-8');
	if(!isauth&&users_sessions.autorizedUsers[sessionID].restorepswd)
		return app.fs.readFileSync(__dirname+'/content/restorepswd_set.ejs', 'utf-8');
}