'use strict';

const cluster = require('cluster');
const doThreads = 1;//require('os').cpus().length;
const clearModule = require('clear-module');

// Possibly not a good place to init logger, it will init doThreads+1 times
const SimpleNodeLogger = require('simple-node-logger'),
	opts = {
		timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
	};
	global.log = SimpleNodeLogger.createSimpleLogger( opts );
	global.log.setLevel('all');


var config = require("./config/config");

var _API = require(config.API.path);


if (cluster.isMaster) {
	// Build docs
	if (config.API.models.docs && config.API.models.docs.build) {
		var _API_docs = require("./libs/API_docs.js");
		var API_docs = new _API_docs();
		API_docs.generate(config.API.models.docs.directory);
		API_docs = null;
		_API_docs = null;
		clearModule("./libs/API_docs.js");
	}
	
	var watchdog_timer = false;
	
	function respawn() {
		cluster.fork();
	}
	function restartProcess() {
		clearModule(config.API.path);
		var re_workers = Object.keys(cluster.workers);
		var restart_timer = setInterval( function () {
			if (Object.keys(cluster.workers).length==doThreads) {
				var tokill=re_workers.pop();
				if (tokill) {
					global.log.info("[RESTART] killing #", tokill);
					try {
						cluster.workers[tokill].send({cmd: "close"});
					} catch (e) {
						global.log.fatal("[RESTART] unable to kill #", tokill);
					}
				} else {
					global.log.info("[RESTART] finished ",Object.keys(cluster.workers).length," workers online");
					clearTimeout(restart_timer);
				}
			} 
		} ,100);
	}
	
	function sendToAll(c) {
		for (var i in cluster.workers) {
			try {
				cluster.workers[i].send({cmd: c});
			} catch (e) {  }
		}
	}
		
	function watchdog () {
		if (Object.keys(cluster.workers).length<doThreads) {
			global.log.warn("[Watchdog] ", "respawn process");
			respawn();
		}
	}
	
	function messageHandler(w, msg) {
		if (msg.cmd && msg.cmd === 'restart') {
			global.log.warn("[RESTART] ", "REQUEST TO RESTART from pid=", w.process.pid);
			restartProcess();
		}
	}
	
	// INIT process
	global.log.info("[Master] ", "Start PID=", process.pid);
	cluster.on('message', messageHandler);
	watchdog_timer = setInterval (watchdog, 400);
} else {
	// Start process
	var API = new _API();
		API.init(config.API);
	global.log.debug("[Worker] ", "[",config.API.name,"] PID=", process.pid);
	process.on('message', function (msg) {
		if (msg.cmd=='close') {
			API._processClose();
		}
	});
}
