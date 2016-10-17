
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
	this.dealer={place:"dealer",cards:[],cardScore:0};
	this.cardDecks=[];
	this.activeDeck=-1;
	this.activePlayer=0;
}
var Player=function(sessionID,place){
	this.sessionID=sessionID;
	this.place=place;
	this.active=false;
	this.bet=0;
	this.cards=[];
	this.cardScore=0;
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
GameTable.prototype.cardExport=function(){
	var position=Math.round((Math.random()*((this.cardDecks[this.activeDeck].length-1)-0)+0));
	return this.cardDecks[this.activeDeck].splice(position, 1);
}
//---------------------calculate cardScore to player or dealer--------------
GameTable.prototype.calcCardScore=function(card,player){
	var cardScoreValue={
		0:2,//2
		1:3,//3
		2:4,//4
		3:5,//5
		4:6,//6
		5:7,//7
		6:8,//8
		7:9,//9
		8:10,//10
		9:10,//jacket
		10:10,//queen
		11:10,//king
		12:11//ace
	}
	if(card[1]==12&&player.cardScore>11)
		player.cardScore+=1;
	player.cardScore+=cardScoreValue[card[1]];
}
//-----------------------add card to player or dealer---------------------
GameTable.prototype.addCardToPlayer=function(player){
	var card=this.cardExport()[0];
	player.cards.push(card);
	this.calcCardScore(card,player);
	// if(player.cardScore>21){
	// 	player.win=0;
	// }
	if(this.dealer.cards.length==2&&player.place=="dealer"){
		console.log(this.dealer.cards.length);
		sockets.sendCard(this.tableNum-1,player.place,13,13);
	}
	else{
		sockets.sendCard(this.tableNum-1,player.place,card[0],card[1]);
	}
}
//-----------------------get info about players----------------
GameTable.prototype.tableUsersInGame=function(){
	return {0:this.players[0]!=null?users_sessions.autorizedUsers[this.players[0].sessionID].login:null,
			1:this.players[1]!=null?users_sessions.autorizedUsers[this.players[1].sessionID].login:null,
			2:this.players[2]!=null?users_sessions.autorizedUsers[this.players[2].sessionID].login:null,
			3:this.players[3]!=null?users_sessions.autorizedUsers[this.players[3].sessionID].login:null,
			4:this.players[4]!=null?users_sessions.autorizedUsers[this.players[4].sessionID].login:null}
}
//-----------------------seat on place---------------------
GameTable.prototype.sitOnPlace=function(place,sessionID){
		if(place<0||place>4||users_sessions.autorizedUsers[sessionID].ingamePlace.length>=config.get("maxPlaceOnTableByUser"))
			return;
		if(this.players[place]==null){
			users_sessions.autorizedUsers[sessionID].incIngamePlace(place);
			this.players[place]=new Player(sessionID,place);
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
	Promise.all(promises).then(function(result){sockets.initBetsStage(result,this.tableNum-1)}.bind(this));
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
GameTable.prototype.chipToBank=function(data,sessionID){
		if(this.gameStatus!=1||!this.players[data.place].active)
			return;
		if(users_sessions.autorizedUsers[sessionID].checkAvaibleBet(data.chipcost))
			return;
		this.players[data.place].bet+=data.chipcost;
}
GameTable.prototype.betsDone=function(data,sessionID){
		if(!this.players[data].active||this.gameStatus!=1||!this.players[data].bet)
			return;
		this.players[data].active=false;
		for(var key in this.players){
			if(this.players[key]!=null){
				if(this.players[key].active)
					return;
			}
		}
		this.initGameStage();
}
GameTable.prototype.initGameStage=function(){
	this.dealer.cards=[];
	this.dealer.cardScore=0;
	this.activeDeck++;
	if(this.activeDeck>config.get("card_deck_quantity")-1)
		this.activeDeck=0;
	this.addCardToPlayer(this.dealer);//first card for dealer
	console.log(this.dealer.cards+"!!"+this.dealer.cardScore);
	for(var key in this.players){//first cars for users
		if(this.players[key]!=null){
			this.addCardToPlayer(this.players[key]);
			console.log(this.players[key].cards+"!!"+this.players[key].cardScore);
		}
	}
	this.addCardToPlayer(this.dealer);//second card for dealer
	console.log(this.dealer.cards+"!!"+this.dealer.cardScore);
	for(var key in this.players){//second cars for users
		if(this.players[key]!=null){
			this.addCardToPlayer(this.players[key]);
			console.log(this.players[key].cards+"!!"+this.players[key].cardScore);
		}
	}
}
