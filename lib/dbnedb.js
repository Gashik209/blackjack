exports.dbnedb=function(Datastore,dbusers,dbusersStat,dbsessions,dbchat,dbgame,dbsystem){
	var db={};
	db.users= new Datastore({filename:dbusers, autoload: true});
	db.usersStat= new Datastore({filename:dbusersStat, autoload: true});
	db.sessions= new Datastore({filename:dbsessions, autoload: true});
	db.chat= new Datastore({filename:dbchat, autoload: true});
	db.game= new Datastore({filename:dbgame, autoload: true});
	db.system= new Datastore({filename:dbsystem, autoload: true});
	exports.db=db;
}