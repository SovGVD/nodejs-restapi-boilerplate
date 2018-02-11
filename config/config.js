var config = {
	API:{ 
		path: "./models/APIhandler.js",
		name: "APIServer1",
		host: "127.0.0.1",
		port: "8081",
		gzip: true,
		crypt: {
			salt: "abcdef",
			key: "12345",
		},
		db: {
			// main DB credentials
		},
		models: {
			docs: {
				id: "docs",
				module: false,
				build: true,
				directory: "./www/static/docs/",
			},
			static: { 
				id: "static",
				module: false,
				enabled: true, 
				route: "/static/",
				directory: "./www/",
				default: "index.html",
			},
			maintenance: {
				id: "maintenance",
				module: false,
				enabled: true,
			},
			demo: { 
				id: "demoAPI",
				module: "demo.js",
				enabled: true,
				db: {
					demoAPI: {
						host: '127.0.0.1',
						db: 'demodb',
					},
				},
			},
			users: { 
				enabled: false, 
			},
			articles: { 
				enabled: false, 
			},
		},
	},
}
module.exports = config;
