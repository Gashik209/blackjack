exports.dbnedb=function(Datastore,dbusers,dbusersStat,dbsessions){
	var db={};
	db.users= new Datastore({filename:dbusers, autoload: true});
	db.usersStat= new Datastore({filename:dbusersStat, autoload: true});
	db.sessions= new Datastore({filename:dbsessions, autoload: true});
	exports.db=db;
}