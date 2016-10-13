
var users_sessions=require(__dirname+"/users_sessions.js");
var sockets=require(__dirname+"/socket.js");
var config=require(__dirname+"/../config");
var gameTables=[];
exports.gameTables=gameTables;

var GameTable = function(tableNum,minBet,maxBet,creater){
	this.tableNum=tableNum;
	this.tableMinBet=minBet;
	this.tableMaxBet=maxBet;
	this.created=new Date();
	this.creater=creater;
	this.gameStatus=0;//0-wait for players; 1-wait for bets; 2-wait for turns; 
	this.roundNum=0;
	this.players={0:null,1:null,2:null,3:null,4:null};
	this.dealer={};
	this.cardDecks=[];
	this.activeDeck=0;
	this.activePlayer=0;
}
var Player=function(sessionID){
	this.sessionID=sessionID;
	this.active=false;
	this.bet=0;
	this.win=0;
}
//------------------------create new game table------------------------------
exports.initTable=function(minBet,maxBet,creater){
	var tableNum=gameTables.length;
	gameTables[tableNum]=new GameTable(tableNum+1,minBet,maxBet,creater);
	gameTables[tableNum].initDeck();
	if(config.get("globalLog"))
		console.log("Table № "+tableNum+" created;");
}
//-----------------------create card decks---------------------------------------
GameTable.prototype.initDeck=function() {
	while (this.cardDecks.length<config.get("card_deck_quantity")){//quantity of cards deck(default 5)
		this.cardDecks.push(createCardDeck());
	}
	function createCardDeck(){
		var carddeck=[];
		for (var i = 0; i < 4; i++) {
			for (var j = 0; j <= 12; j++) {
				var l=carddeck.length;
				carddeck[l]=[];
				carddeck[l][0]=i;
				carddeck[l][1]=j;
			}
		}
		return carddeck;
	}
}
//-----------------------export random card from deck-----------------------
GameTable.prototype.cardExport=function(cardDeck){
	var position=Math.round((Math.random()*((this.cardDecks[cardDeck].length-1)-0)+0));
	return this.cardDecks[cardDeck].splice(position, 1);
}
//-----------------------seat on place---------------------
GameTable.prototype.sitOnPlace=function(place,sessionID){
		if(place<0||place>4||users_sessions.autorizedUsers[sessionID].ingamePlace.length>=config.get("maxPlaceOnTableByUser"))
			return;
		if(this.players[place]==null){
			users_sessions.autorizedUsers[sessionID].incIngamePlace(place);
			this.players[place]=new Player(sessionID);
			if(config.get("globalLog"))
				console.log(users_sessions.autorizedUsers[sessionID].login+" sit on "+place);
		}
		this.firstPlayerOnTable();
}
GameTable.prototype.leaveTable=function(sessionID){
		if(config.get("globalLog"))
			console.log("Player "+sessionID+" leave table "+this.tableNum);
		for (var key in this.players) {
			if(this.players[key]!=null){
				if(this.players[key].sessionID==sessionID){
					this.players[key]=null;
				}
			}
		}
		// users_sessions.autorizedUsers[sessionID].ingamePlace.forEach(function(item){this.players[item]=null}.bind(this));
		if(users_sessions.autorizedUsers[sessionID]!=undefined)
			users_sessions.autorizedUsers[sessionID].leaveTable();
		this.countIngamePlayersAndUpdGameStatus(sessionID);
}
GameTable.prototype.firstPlayerOnTable=function(){
	if(this.gameStatus==0){
		this.initBetsStage();
	}
}
GameTable.prototype.initBetsStage=function(){
	var promises=[];
	var distinctSessionID={};
	this.roundNum++;
	this.gameStatus=1;
	for (var key in this.players) {
		if(this.players[key]!=null&&distinctSessionID[this.players[key]]!=true){
			distinctSessionID[this.players[key]]=true;
			promises.push(users_sessions.autorizedUsers[this.players[key].sessionID].updPlayerBank(this.players[key].sessionID));
			this.players[key].active=true;
			this.players[key].bet=0;
		}
	}
	Promise.all(promises).then(function(result){sockets.initTableBets(result,this.tableNum-1)}.bind(this));
}
GameTable.prototype.countIngamePlayersAndUpdGameStatus=function(sessionID){
		var countPlayers=0;
		for (var key in this.players) {
			if(this.players[key]!=null)
				countPlayers++;
		}
		if(countPlayers==0){//all players leave table
			this.gameStatus=0;
			return;
		}
		if(this.gameStatus==1)//player leave table on Bets stage
			this.betsDone(sessionID);
		
}
GameTable.prototype.chipToBank=function(chipcost,sessionID){
		console.log(this.players);
		// if(this.players[sessionID].active==false)
		// 	return;
		// this.players[sessionID].bet+=chipcost;
}
GameTable.prototype.betsDone=function(sessionID){
		// if(this.gameStatus!=1||this.players[key].bet==undefined||users_sessions.autorizedUsers[sessionID].table!=this.tableNum-1)
		// 	return;
		// for (var key in this.players) {
		// 	if(this.players[key]==sessionID)
		// 		this.players[key].betsDone=true;
		// }
}