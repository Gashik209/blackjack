
var dbnedb=require(__dirname+"/dbnedb.js");
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
	this.gameStatus=0;//0-wait for players; 1-wait for bets; 2-wait for turns; 3-difinition winners;
	this.roundNum=0;
	this.players={0:null,1:null,2:null,3:null,4:null};
	this.dealer={place:"dealer",cards:[],cardScore:0};
	this.cardDecks=[];
	this.activeDeck=-1;
}
var Player=function(sessionID,place){
	this.sessionID=sessionID;
	this.avatar=users_sessions.autorizedUsers[sessionID].avatar;
	this.place=place;
	this.bet=0;
	this.cards=[];
	this.cardScore=0;
	this.playerStatus=0;
	//player status info:
	//10-bets stage;11-bets done;12-will trade;13-hit;14-stop trade(stand);24-x2;
	//21-win BJ combination;22-loose(score>21);23-player have 21;25-player have max card;
	//50-win;51-winBJ;52-draw;53-loose;
}
//------------------------create new game table------------------------------
exports.initTable=function(minBet,maxBet,creater){
	if(parseInt(maxBet)<=parseInt(minBet)||minBet%5!=0||maxBet%5!=0)
		return;
	var tableNum=gameTables.length;
	gameTables[tableNum]=new GameTable(tableNum+1,minBet,maxBet,creater);
	gameTables[tableNum].initDeck();
	if(config.get("globalLog"))
		console.log("Table № "+tableNum+": created by "+creater+" on "+new Date());
	if(config.get("game_log"))
		dbnedb.db.game.insert({dateStamp:new Date(),table:tableNum,event:"created by "+creater});
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
GameTable.prototype.checkLengthCardDeck=function(){
	if(this.cardDecks[this.activeDeck].length>=(this.countActivePlayersInGame()+1)*5)
		return;
	this.cardDecks.splice([this.activeDeck],1);
	this.initDeck();
	sockets.dealerInfo(this.tableNum-1,"Shuffling deck "+(this.activeDeck+1));
	this.checkLengthCardDeck();
}
//---------------------calculate cardScore to player or dealer--------------
GameTable.prototype.calcCardScore=function(card,cardScore){
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
	if(card[1]==12&&cardScore>=11)
		return cardScore+=1;
	return cardScore+=cardScoreValue[card[1]];
}
//-----------------------add card to player or dealer---------------------
GameTable.prototype.addCardToPlayer=function(player){
	if(player.place=="dealer"||player.playerStatus==13||player.playerStatus==24){
		var card=this.cardExport()[0];
		player.cards.push(card);
		player.cardScore=this.calcCardScore(card,player.cardScore);
		if(this.dealer.cards.length==2&&player.place=="dealer"){
			sockets.sendCard(this.tableNum-1,player.place,13,13);
		}
		else{
			sockets.sendCard(this.tableNum-1,player.place,card[0],card[1]);
		}
		if(player.place!="dealer")
			return this.definitionPlayerWinLoose(player);
	}
		return this.initTradeRound();
}
//-----------------------get info about players----------------
GameTable.prototype.tableUsersInGame=function(){
	return {0:this.players[0]!=null?{login:users_sessions.autorizedUsers[this.players[0].sessionID].login,avatar:users_sessions.autorizedUsers[this.players[0].sessionID].avatar}:null,
			1:this.players[1]!=null?{login:users_sessions.autorizedUsers[this.players[1].sessionID].login,avatar:users_sessions.autorizedUsers[this.players[1].sessionID].avatar}:null,
			2:this.players[2]!=null?{login:users_sessions.autorizedUsers[this.players[2].sessionID].login,avatar:users_sessions.autorizedUsers[this.players[2].sessionID].avatar}:null,
			3:this.players[3]!=null?{login:users_sessions.autorizedUsers[this.players[3].sessionID].login,avatar:users_sessions.autorizedUsers[this.players[3].sessionID].avatar}:null,
			4:this.players[4]!=null?{login:users_sessions.autorizedUsers[this.players[4].sessionID].login,avatar:users_sessions.autorizedUsers[this.players[4].sessionID].avatar}:null}
}
//-----------------------seat on place---------------------
GameTable.prototype.sitOnPlace=function(place,sessionID){
		if(place<0||place>4||users_sessions.autorizedUsers[sessionID].ingamePlace.length>=config.get("maxPlaceOnTableByUser"))
			return;
		if(this.players[place]==null){
			users_sessions.autorizedUsers[sessionID].incIngamePlace(place);
			this.players[place]=new Player(sessionID,place);
			if(users_sessions.autorizedUsers[sessionID].ingamePlace.length<2)
				sockets.dealerInfo(this.tableNum-1,"Hello "+users_sessions.autorizedUsers[sessionID].login);
			if(config.get("globalLog"))
				console.log("Table № "+this.tableNum+": "+users_sessions.autorizedUsers[sessionID].login+" sit on place "+place+";");
			if(config.get("game_log"))
				dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:users_sessions.autorizedUsers[sessionID].login+" sit on place "+place});
		}
		this.checkGameStatus();
}
GameTable.prototype.standFromPlace=function(place,sessionID){
		if(this.players[place]==null)
			return;
		if(this.players[place].sessionID!=sessionID)
			return;
		if(config.get("globalLog"))
			console.log("Table № "+this.tableNum+": "+"Player "+users_sessions.autorizedUsers[sessionID].login+" leave place "+place+";");
		if(config.get("game_log"))
			dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+users_sessions.autorizedUsers[sessionID].login+" leave place "+place});
		this.players[place]=null;
		users_sessions.autorizedUsers[sessionID].leavePlace(place);
		this.checkGameStatus();
}
GameTable.prototype.leaveTable=function(sessionID){
		if(config.get("globalLog"))
			console.log("Table № "+this.tableNum+": "+"Player "+sessionID+" leave table "+this.tableNum);
		if(config.get("game_log"))
			dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+sessionID+" leave table "+this.tableNum});
		for (var key in this.players) {
			if(this.players[key]!=null){
				if(this.players[key].sessionID==sessionID){//socket disconnetc
					this.players[key]=null;
				}
			}
		}
		if(users_sessions.autorizedUsers[sessionID]!=undefined)//logOut
			users_sessions.autorizedUsers[sessionID].leaveTable();
		this.checkGameStatus();
}
GameTable.prototype.initBetsStage=function(){
	if(this.gameStatus!=0)
		return;
	var promises=[];
	var distinctSessionID={};
	this.roundNum++;
	this.gameStatus=1;
	for (var key in this.players) {
		if(this.players[key]!=null){
			if(distinctSessionID[this.players[key].sessionID]==undefined){
				distinctSessionID[this.players[key]]=this.players[key].sessionID;
				promises.push(users_sessions.autorizedUsers[this.players[key].sessionID].findPlayerBank(this.players[key].sessionID));
			}
			this.players[key].playerStatus=10;
			this.players[key].cards=[];
			this.players[key].cardScore=0;
			this.players[key].bet=0;
		}
	}
	if(config.get("globalLog"))
		console.log("Table № "+this.tableNum+": Round "+this.roundNum+", bets stage for "+this.countActivePlayersInGame()+" player(s);");
	if(config.get("game_log"))
		dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Round "+this.roundNum+", bets stage for "+this.countActivePlayersInGame()+" player(s)"});
	Promise.all(promises).then(function(result){sockets.initBetsStage(result,this.tableNum-1)}.bind(this));
}
GameTable.prototype.checkAllPleyerStatusInBatsStage=function(){
		if(this.gameStatus!=1)
			return;
		for(var key in this.players){
			if(this.players[key]!=null){
				if(this.players[key].playerStatus==10)
					return;
			}
		}
		this.initGameStage();
}
GameTable.prototype.checkGameStatus=function(){
		if(this.countPlayersInGame()>0&&this.gameStatus==0){//start new round
			this.initBetsStage();
		}
		else if (this.countActivePlayersInGame()==0&&this.gameStatus!=0){//restart game (all active players leave places)
			this.gameStatus=0;
			if(config.get("globalLog"))
				console.log("Table № "+this.tableNum+": All players leave table, round "+this.roundNum+" end;");
			if(config.get("game_log"))
				dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"All players leave table, round "+this.roundNum+" end"});
			sockets.destroyCards(this.tableNum-1);
			this.checkGameStatus();
		}
		else if(this.countActivePlayersInGame()>0&&this.gameStatus==1){//stop or continue bet stage
			this.checkAllPleyerStatusInBatsStage();
		}
		else if(this.countActivePlayersInGame()>0&&this.gameStatus==2){//next trade round
			this.initTradeRound();
		}	
}
GameTable.prototype.chipToBank=function(data,sessionID){
		if(this.players[data.place]==null)
			return;
		if(this.gameStatus!=1||!this.players[data.place].playerStatus==10)
			return;
		if(users_sessions.autorizedUsers[sessionID].checkAvaibleBet(data.chipcost))
			return;
		if(this.players[data.place].sessionID==sessionID&&this.players[data.place].bet+data.chipcost<=this.tableMaxBet)
			this.players[data.place].bet+=data.chipcost;
}
GameTable.prototype.betsDone=function(data){
		if(this.gameStatus!=1)
			return;
		if(this.players[data]==null)
			return;
		if(this.players[data].playerStatus!=10||this.players[data].bet<this.tableMinBet)
			return;
		if(config.get("globalLog"))
			console.log("Table № "+this.tableNum+": Player "+data+" made bet: "+this.players[data].bet+";");
		if(config.get("game_log"))
			dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+data+" made bet: "+this.players[data].bet});
		this.players[data].playerStatus=11;
		this.checkAllPleyerStatusInBatsStage(this);
}
GameTable.prototype.initGameStage=function(){
	if(this.gameStatus!=1)
		return this.checkGameStatus();
	if(config.get("globalLog"))
		console.log("Table № "+this.tableNum+": Game stage for "+this.countActivePlayersInGame()+" players;");
	if(config.get("game_log"))
		dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Game stage for "+this.countActivePlayersInGame()+" players"});
	this.gameStatus=2;
	this.dealer.cards=[];
	this.dealer.cardScore=0;
	this.activeDeck++;
	if(this.activeDeck>config.get("card_deck_quantity")-1)
		this.activeDeck=0;
	this.checkLengthCardDeck();
	sockets.dealerInfo(this.tableNum-1,"Card deck "+(this.activeDeck+1));
	for(var key in this.players){//first cards for users
		if(this.players[key]!=null){
			if(this.players[key].playerStatus!=0){
				this.players[key].playerStatus=13;
				this.addCardToPlayer(this.players[key]);
			}

		}
	}
	this.addCardToPlayer(this.dealer);//first card for dealer
	for(var key in this.players){//second cards for users
		if(this.players[key]!=null){
			if(this.players[key].playerStatus!=0){
				this.addCardToPlayer(this.players[key]);
			}
		}
	}
	this.addCardToPlayer(this.dealer);//second card for dealer
}
GameTable.prototype.initTradeRound=function(){
	if(this.dealer.cards.length<2)
		return;
	var tradeStadePlayers=[];
	var hitsPlayers=[];
	for(var key in this.players){
		if(this.players[key]!=null){
			if(this.players[key].playerStatus==12){
				tradeStadePlayers.push(this.players[key].place);
			}
			else if(this.players[key].playerStatus==13){
				hitsPlayers.push(this.players[key].place);
			}
		}
	}
	if(tradeStadePlayers.length==0&&hitsPlayers.length==0&&this.gameStatus==2){
		setTimeout(function() {
			return this.initDealersTurn();
		}.bind(this), config.get("dealer_turn_delay"));
	}
	else if(tradeStadePlayers.length==0){
		hitsPlayers.forEach(function(item,i,arr){
			this.players[item].playerStatus=12;
		}.bind(this));
		return sockets.initTradeRound(hitsPlayers,this.tableNum-1);
	}
}
GameTable.prototype.definitionPlayerWinLoose=function(player){
	if(player.playerStatus==0||player.cards.length<2)
		return this.initTradeRound();
	if(player.cardScore<21&&player.cards.length==config.get("players_max_card_limit")){
		player.playerStatus=25;
		if(config.get("globalLog"))
			console.log("Table № "+this.tableNum+": Player "+player.place+" have "+config.get("players_max_card_limit")+" cards;");
		if(config.get("game_log"))
			dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+player.place+" have "+config.get("players_max_card_limit")+" cards"});
	}
	else if(player.cards.length==2&&player.cardScore==21){
		player.playerStatus=21;
		if(config.get("globalLog"))
			console.log("Table № "+this.tableNum+": Player "+player.place+" have Black Jack!;");
		if(config.get("game_log"))
			dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+player.place+" have Black Jack!"});
	}
	else if(player.cardScore>21){
		player.playerStatus=22;
		if(config.get("globalLog"))
			console.log("Table № "+this.tableNum+": Player "+player.place+" bust with "+player.cardScore+";");
		if(config.get("game_log"))
			dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+player.place+" bust with "+player.cardScore});
	}
	else if(player.cardScore==21){
		player.playerStatus=14;
		if(config.get("globalLog"))
			console.log("Table № "+this.tableNum+": Player "+player.place+" have 21;");
		if(config.get("game_log"))
			dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+player.place+" have 21"});
	}
	else if(player.playerStatus!=24&&player.cardScore<21){
			player.playerStatus=13;
		if(config.get("globalLog")&&player.cards.length>1)
			console.log("Table № "+this.tableNum+": Player "+player.place+" have "+player.cardScore+" and continue TradeRound;");
		if(config.get("game_log"))
			dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+player.place+" have "+player.cardScore+" and continue TradeRound"});
	}
	return this.initTradeRound();
}
GameTable.prototype.countPlayersInGame=function(){
	var countPlayers=0;
	for (var key in this.players) {
		if(this.players[key]!=null)
			countPlayers++;
	}
	return countPlayers;
}
GameTable.prototype.countActivePlayersInGame=function(){
	var countActivePlayers=0;
	for (var key in this.players) {
		if(this.players[key]!=null){
			if(this.players[key].playerStatus!=0)
				countActivePlayers++;
		}
	}
	return countActivePlayers;
}
GameTable.prototype.playerHit=function(place,sessionID){
		if(this.players[place]==null)
			return this.initTradeRound();
		if(this.players[place].sessionID!=sessionID||this.players[place].playerStatus!=12)
			return this.initTradeRound();
		this.players[place].playerStatus=13;
		this.addCardToPlayer(this.players[place]);
}
GameTable.prototype.playerStand=function(place,sessionID){
		if(this.players[place]==null)
			return this.initTradeRound();
		if(this.players[place].sessionID!=sessionID||this.players[place].playerStatus!=12)
			return this.initTradeRound();;
		this.players[place].playerStatus=14;
		if(config.get("globalLog"))
			console.log("Table № "+this.tableNum+": Player "+this.players[place].place+" want STAND with "+this.players[place].cardScore);
		if(config.get("game_log"))
			dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+this.players[place].place+" want STAND with "+this.players[place].cardScore});
		this.initTradeRound();
}
GameTable.prototype.playerX2=function(place,sessionID){
		if(this.players[place]==null)
			return this.initTradeRound();
		if(this.players[place].sessionID!=sessionID||this.players[place].playerStatus!=12)
			return this.initTradeRound();
		if(users_sessions.autorizedUsers[sessionID].checkAvaibleBet(this.players[place].bet))
			return;
		this.players[place].bet=this.players[place].bet*2;
		this.players[place].playerStatus=24;
		if(config.get("globalLog"))
			console.log("Table № "+this.tableNum+": Player "+this.players[place].place+" say X2");
		if(config.get("game_log"))
			dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+this.players[place].place+" say X2"});
		this.addCardToPlayer(this.players[place]);
}
GameTable.prototype.initDealersTurn=function(){
	if(this.gameStatus!=2)
		return;
	for (var key in this.players) {
		if(this.players[key]!=null){
			if(this.players[key].playerStatus!=22&&this.players[key].playerStatus!=0){
				sockets.openSecondDealerCard(this.tableNum-1,this.dealer.cards[1][0],this.dealer.cards[1][1]);
				if(this.dealer.cardScore<17)
					return this.addCardToPlayer(this.dealer);
			}
		}
	}
	if(config.get("globalLog"))
		console.log("Table № "+this.tableNum+": Dealers turn - dealer have "+this.dealer.cardScore);
	if(config.get("game_log"))
		dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Dealers turn - dealer have "+this.dealer.cardScore});
	this.compareCardScore();
}
GameTable.prototype.compareCardScore=function(){
	if(this.gameStatus!=2)
		return;
	//21-win BJ combination;22-loose(score>21);23-player have 21;25-player have max card;14-stop trade(stand);
	//50-win;51-winBJ;52-draw;53-loose;
	for (var key in this.players) {
		if(this.players[key]!=null){
			if(this.players[key].playerStatus!=0){
				if(this.players[key].playerStatus==22){
					this.players[key].playerStatus=53;
				}
				else{
					if(this.dealer.cardScore>21){
						if(this.players[key].playerStatus==21){
							this.players[key].playerStatus=51;
						}
						else{
							this.players[key].playerStatus=50;
						}
					}
					else if(this.dealer.cardScore==21&&this.dealer.cards.length==2){
						if(this.players[key].playerStatus==21){
							this.players[key].playerStatus=52;
						}
						else{
							this.players[key].playerStatus=53;
						}
					}
					else if(this.dealer.cards.length==config.get("players_max_card_limit")){
						if(this.players[key].playerStatus==21){
							this.players[key].playerStatus=51;
						}
						else if(this.players[key].playerStatus==25){
							this.players[key].playerStatus=52;
						}
						else{
							this.players[key].playerStatus=53;
						}
					}
					else{
						if(this.dealer.cardScore>this.players[key].cardScore){
							this.players[key].playerStatus=53;
						}
						else if (this.dealer.cardScore==this.players[key].cardScore){
							if(this.players[key].playerStatus==21){
								this.players[key].playerStatus=51;
							}
							else{
								this.players[key].playerStatus=52;
							}
						}
						else{
							if(this.players[key].playerStatus==21){
								this.players[key].playerStatus=51;
							}
							else{
								this.players[key].playerStatus=50;
							}
						}
					}
				}
			}
		}
	}
	this.endRound();
}
GameTable.prototype.endRound=function(){
	this.gameStatus=3;
	var roundPlayers={};

	for (var key in this.players) {
		if(this.players[key]!=null){
			switch(this.players[key].playerStatus){
				case 0:
					break;
				case 50:this.players[key].bet=this.players[key].bet*2;
					determinateUsersBank(this.players[key].sessionID,this.players[key].bet,0,0);
					sockets.dealerInfo(this.tableNum-1,users_sessions.autorizedUsers[this.players[key].sessionID].login+" win "+this.players[key].bet);
					if(config.get("globalLog"))
						console.log("Table № "+this.tableNum+": Player "+this.players[key].place+" WIN "+this.players[key].bet);
					if(config.get("game_log"))
						dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+this.players[key].place+" WIN "+this.players[key].bet});
					break;
				case 51:this.players[key].bet=this.players[key].bet*3;
					determinateUsersBank(this.players[key].sessionID,this.players[key].bet,0,0);
					sockets.dealerInfo(this.tableNum-1,users_sessions.autorizedUsers[this.players[key].sessionID].login+" has BLack Jack "+this.players[key].bet);
					if(config.get("globalLog"))
						console.log("Table № "+this.tableNum+": Player "+this.players[key].place+" WIN BLack Jack "+this.players[key].bet);
					if(config.get("game_log"))
						dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+this.players[key].place+" WIN BLack Jack "+this.players[key].bet});
					break;
				case 52:
					determinateUsersBank(this.players[key].sessionID,0,this.players[key].bet,0);
					sockets.dealerInfo(this.tableNum-1,users_sessions.autorizedUsers[this.players[key].sessionID].login+" Draw "+this.players[key].bet);
					if(config.get("globalLog"))
						console.log("Table № "+this.tableNum+": Player "+this.players[key].place+" Draw "+this.players[key].bet);
					if(config.get("game_log"))
						dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+this.players[key].place+" Draw "+this.players[key].bet});
					break;
				case 53:
					determinateUsersBank(this.players[key].sessionID,0,0,this.players[key].bet);
					sockets.dealerInfo(this.tableNum-1,users_sessions.autorizedUsers[this.players[key].sessionID].login+" loose "+this.players[key].bet);
					if(config.get("globalLog"))
						console.log("Table № "+this.tableNum+": Player "+this.players[key].place+" loose "+this.players[key].bet);
					if(config.get("game_log"))
						dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"Player "+this.players[key].place+" loose "+this.players[key].bet});			
					break;
			}
		}
	}
	function determinateUsersBank(session,betWin,betDraw,betLoose){
		if(roundPlayers[session]==undefined)
			return roundPlayers[session]={betWin:betWin>0?betWin:betDraw,win:betWin>0?1:0,draw:betDraw>0?1:0,loose:betLoose>0?1:0,maxWin:betWin,maxLost:betLoose,played:1};
		roundPlayers[session].betWin+=betWin>0?betWin:betDraw;
		roundPlayers[session].win+=betWin>0?1:0;
		roundPlayers[session].draw+=betDraw>0?1:0;
		roundPlayers[session].loose+=betLoose>0?1:0;
		if(roundPlayers[session].maxWin<betWin)
			roundPlayers[session].maxWin=betWin;
		if(roundPlayers[session].maxLost<betLoose)
			roundPlayers[session].maxLost=betLoose;
		roundPlayers[session].played++;
	}
	for(var key in roundPlayers){
		users_sessions.autorizedUsers[key].updUserStatistic(roundPlayers[key]);
	}

	if(config.get("globalLog"))
		console.log("Table № "+this.tableNum+": End round in "+config.get("after_round_delay")/1000+" second;");
	if(config.get("game_log"))
		dbnedb.db.game.insert({dateStamp:new Date(),table:this.tableNum,event:"End round in "+config.get("after_round_delay")/1000+" second"});	
	setTimeout(function() {
		this.gameStatus=0;
		sockets.destroyCards(this.tableNum-1);
		this.dealer.cards=[];
		this.dealer.cardScore=0;
		this.checkGameStatus();
	}.bind(this), config.get("after_round_delay"));
}