exports.dbnedb=function(Datastore,dbusers,dbsessions){
	var db={};
	db.users= new Datastore({filename:dbusers, autoload: true});
	db.sessions= new Datastore({filename:dbsessions, autoload: true});
	exports.db=db;
}