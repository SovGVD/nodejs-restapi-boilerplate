/*
    API module example
*/
'use strict'

var API_demoAPI = function () {
	this.version="0.0.2";
	this.parent = false;

	this.init = function (_parent, _config) {
		this.parent = _parent;
		this.config = _config;
		this.logName = _parent.logName + "[Demo] ";
	}

	this.initMethods = function () {
		global.log.info(this.logName, "Init methods");
		this.parent.APIserver.get("/demo/:id/", function (req, res, next) {
			this.APIdemo(req, res, next);
		}.bind(this) );
	}


	this.APIdemo = function (req, res, next) {
		var d = {
			req: req,
			res: res,
			next: next,
			code: false,
			data: {
				"ID": req.params.id
			},
			extra: { 
				"awesome": true 
			},
			errors:[ ]
		}
		if (req.params.id>0) {
			d.code = true;
		} else {
			d.errors.push({field:"ID", message:"ID must be greater than zero"});
		}
		this.parent.APIsend(d);
	}
}

module.exports = API_demoAPI;