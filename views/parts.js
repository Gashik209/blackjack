var app=require(__dirname+"/../app.js")
exports.header=function(isauth,isadmin,login) {
	var tempview=app.fs.readFileSync(__dirname+'/parts/header.ejs', 'utf-8');
	return app.ejs.render(tempview, {isauth:isauth,isadmin:isadmin,login:login});
}
exports.footer=function(isauth,chat) {
	var tempview=app.fs.readFileSync(__dirname+'/parts/footer.ejs', 'utf-8');
	return app.ejs.render(tempview, {isauth:isauth,chat:chat});
}
exports.chat=function() {
	return app.fs.readFileSync(__dirname+'/parts/chat.ejs', 'utf-8');
}
exports.gameTable=function(){
	return app.fs.readFileSync(__dirname+'/parts/gameTable.ejs', 'utf-8');
}		