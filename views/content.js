var app=require(__dirname+"/../app.js")
var game=require(__dirname+"/../lib/game.js")
var parts=require(__dirname+"/parts.js");
exports.err404=function() {
	return app.fs.readFileSync(__dirname+'/content/err404.ejs', 'utf-8');
}
exports.err500=function() {
	return app.fs.readFileSync(__dirname+'/content/err500.ejs', 'utf-8');
}
exports.main=function() {
	return app.fs.readFileSync(__dirname+'/content/main.ejs', 'utf-8');
}
exports.register=function() {
	return app.fs.readFileSync(__dirname+'/content/register.ejs', 'utf-8');
}
exports.signin=function() {
	return app.fs.readFileSync(__dirname+'/content/signin.ejs', 'utf-8');
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