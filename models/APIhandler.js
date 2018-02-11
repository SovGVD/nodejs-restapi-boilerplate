'use strict'

const restify = require('restify'); const restifyErrors = require('restify-errors'); const restifyErrorsOptions = require('restify-errors-options'); const restifyCorsMiddleware = require('restify-cors-middleware');
const crypto = require('crypto'); const crypto_algorithm = 'aes-256-ctr';	// choose your algorithm
const validator = require('validator'); const uuidv4 = require('uuid/v4'); const uuidv1 = require('uuid/v1');
const clearModule = require('clear-module');

const cors = restifyCorsMiddleware({
    origins: ['*','null'],
    allowHeaders: ['Authorization'],
})

var API = function () {
	this.version="1.0.0";
	this.config = false;
	this.db = false;
	this.APIserver = false;
	this.logName = "API";
	this.APIclasses={ };
	this.APImodules={ };

	this.init = function (_config,_db) {
		this.config = _config;
		if (_db) {
			this.db = _db;
		} else {
			this.initDB(this.config.db);
		}
		this.logName = "APIserver ["+this.config.name+"] ";
		
		for (var m in this.config.models) { if (this.config.models[m] && this.config.models[m].module!==false) {
			if (this.config.models[m].enabled) {
				clearModule(__dirname+"/API/"+this.config.models[m].module);
				this.APIclasses[m] = require(__dirname+"/API/"+this.config.models[m].module);
				this.APImodules[(this.config.models[m].id)] = new this.APIclasses[m];
				this.APImodules[(this.config.models[m].id)].init(this, this.config.models[m]);
			}
		}}
		this.initAPIserver();
	}

	this.initDB = function (config) {
		// INIT some db, like mysql or mongodb
		//this.db = someDB
	}

	this._processClose = function () {
		global.log.info(this.logName, "*** Clear modules and close process ***");
		for (var m in this.config.models) { if (this.config.models[m] && this.config.models[m].module!==false) {
			if (this.config.models[m].enabled) {
				clearModule(__dirname+"/API/"+this.config.models[m].module);
				this.APIclasses[m] = false;
				this.APImodules[(this.config.models[m].id)] = false;
			}
		}}
		this.APIserver.close();
		process.exit();
	}


	this.initAPIserver = function () {
		this.APIserver = restify.createServer({ name: this.config.name });
		restifyErrorsOptions.add('errors');
		this.APIserver.pre(restify.pre.sanitizePath()); 
		this.APIserver.use(restify.plugins.fullResponse());
		this.APIserver.pre(cors.preflight);
		this.APIserver.use(cors.actual);
		if (this.config.gzip) {
			global.log.info(this.logName, "Enable GZIP");
			this.APIserver.use(restify.plugins.gzipResponse());
		}
		// limit (per second by ip) to prevent DDoS (http://restify.com/docs/plugins-api/)
		this.APIserver.use(restify.plugins.throttle({
			burst: 100,
			rate: 50,
			ip: true,
			overrides: {
				'127.0.0.1': {
					rate: 0,
					burst: 0
				}
			}
		}));
		this.APIserver.use(restify.plugins.bodyParser());
		this.APIserver.use(restify.plugins.authorizationParser());
		
		// access check
		this.APIserver.use(function (req, res, next) {
			global.log.info(this.logName, "[URL] [",req.url,"]");
			if ((this.config.models.static.enabled && (req.url+"/").indexOf(this.config.models.static.route)!==0) || this.config.models.static.enabled==false) {
				if (req.authorization && req.authorization.scheme=='Bearer') {
					// Bearer authorization
					req.authorization.credentials = this._stripName(req.authorization.credentials);
					this._APIBearerAuthorization (
						req.authorization.credentials,
						function () { next(); }.bind(this),
						function () { next(this._APINotAuthorizedError()); }.bind(this)
					);
				} else if (req.authorization && req.authorization.scheme=='Basic' && req.authorization.basic.username!='' && req.authorization.basic.password!='') {
					// Basic authorization
					this._APIBasicAuthorization (
						req.authorization.basic.username, req.authorization.basic.password,
						function (login_settings) { next(); }.bind(this),
						function () { next(this._APINotAuthorizedError()); }.bind(this)
					);
				} else {
					next(this._APINotAuthorizedError());
				}
			} else {
				next();
			}
		}.bind(this));
		
		// API methods

		for (var m in this.config.models) { if (this.config.models[m] && this.config.models[m].module!==false) {
			if (this.config.models[m].enabled) {
				this.APImodules[(this.config.models[m].id)].initMethods();
			}
		}}

		if (this.config.models.static.enabled) {
			global.log.info(this.logName, "Static files [enabled]");
			this.APIserver.get(new RegExp(this.config.models.static.route+"?.*","u"), restify.plugins.serveStatic({
				directory: this.config.models.static.directory,
				default: this.config.models.static.default,
				checkIfModified: true,
			}));
		} else {
			global.log.debug(this.logName, "Static files [disabled]");
		}

		if (this.config.models.maintenance.enabled) {
			global.log.info(this.logName, "Maintenance methods [enabled]");
			this.APIserver.get("/maintenance/restart/", function (req, res, next) { 
				var c = { cmd: 'restart' };
				process.send(c);
				this.send(req,res,this._APIsend_success("ok",c),next);
			}.bind(this));
		} else {
			global.log.debug(this.logName, "Maintenance methods [disabled]");
		}
		
		this.APIserver.listen(this.config.port, this.config.host, function() {
			global.log.info(this.logName, " server [",this.APIserver.name,"] at [",this.APIserver.url,"]");
		}.bind(this));
	}

	// API authorization
	this._APIBearerAuthorization = function (token, _cb_success, _cb_fail) {
		// TODO: your authorization method
		if (token == 'hello') {
			_cb_success();
		} else {
			_cb_fail();
		}
	}
	this._APIBasicAuthorization = function (username, password, _cb_success, _cb_fail) {
		// TODO: your authorization method
		if (username == 'demo' && password == '123') {
			_cb_success();
		} else {
			_cb_fail();
		}
	}
	
	// API methods
	this._APINotAuthorizedError = function () {
		return new restifyErrors.NotAuthorizedError();
	}


	this.APIsend = function (d) {
		if (d.code === true) {
			this.send(d.req,d.res, this._APIsend_success(d.code, d.data, d.extra), d.next);
		} else {
			this.send(d.req,d.res, this._APIsend_success(d.code, d.errors), d.next);
		}
	}

	this._APIsend_success = function (code, data, extra) {
		return {code: code, message: data, extra: extra};
	}

	this._APIsend_error = function (code, error) {
		return {code: code, message: "some API error", errors: errors};
	}

	this.send = function (req,res,v,_next) {
		// best place for logging any requests and it's result
		res.send(v);
		_next;
	}

	this._ts = function () {
		return parseInt(new Date().getTime()/1000);
	}

	this._genereateRandomByUUID = function () {
		return (uuidv4()+uuidv1()).replace(/-/g,"");
	}

	this._generateRandomByAlphabet = function (l) {
		var s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234567890";
		var out="";
		for (var i=0; i<l;i++) {
			out+=s[parseInt((Math.random()*s.length))]
		}
		return out;
	}

	this._passwordHash = function(plaintext) {
		return crypto.createHash('sha1').update(this.config.crypt.salt+plaintext).digest('hex');
	}

	this._encrypt = function (text){
		var cipher = crypto.createCipher(crypto_algorithm,this.config.crypt.key);
		var crypted = cipher.update(text,'utf8','base64');
		crypted += cipher.final('base64');
		return crypted;
	}

	this._decrypt = function(text){
		var decipher = crypto.createDecipher(crypto_algorithm,this.config.crypt.key);
		var dec = decipher.update(text,'base64','utf8');
		dec += decipher.final('utf8');
		return dec;
	}

	this._stripName = function (v) {
		return v+"".replace(/[^a-zA-Z0-9_]/g,'');	// Update depends on your safe strings/token/keys
	}

}
module.exports = API;
