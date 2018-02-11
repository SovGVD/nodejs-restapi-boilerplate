'use strict'

var fs = require('fs');
var path = require('path');
var marked = require('marked');
var renderer = new marked.Renderer();

marked.setOptions({
	highlight: function (code) {
		return require('highlight.js').highlightAuto(code).value;
	}
});

var API_docs = function () {
	this.logName = "[APIdocs] ";
	this.generate = function (docsFolder) { try {
		var head = '<!docype html>\n<html>\n<head><title>%doctitle%</title>\n<meta charset="utf-8" />\n<link href="css/github-markdown.css" rel="stylesheet" media="screen">\n<link href="css/github.css" rel="stylesheet" media="screen">\n</head>\n' +
				'<body class="markdown-body">\n';
		var foot = '\n</body>\n</html>';
		var dfiles=fs.readdirSync(docsFolder);
		for (var i=0;i<dfiles.length;i++) {
			var f=dfiles[i].split(".");
			var ext=f.pop();
				f=f.join(".");
			if (ext.toLowerCase()=='md') {
				var menu = [];
				renderer.heading = function (menu, text, level) {
					var escapedText = text.toLowerCase().replace(/[^\w]+/g, '-')+"."+menu.length;
					menu.push({id: escapedText, level: level, title: text});
					return '<h' + level + ' id="'+escapedText+'">' + text + '</h' + level + '>';
				}.bind(null, menu);
				
				var mdhtml = '<div style="float:left; min-width: 300px; max-width: 900px; margin: 0 auto; padding: 6px 30px 30px 30px; margin-left:250px; overflow: auto;">'+marked(fs.readFileSync(docsFolder+"/"+f+"."+ext, 'utf8'), { renderer: renderer })+"</div>";

				global.log.debug(this.logName, "Doc file:",docsFolder+"/"+f+"."+ext);
				for (var m=0;m<menu.length;m++) {
					menu[m]='<div style="padding-left:'+(15*(menu[m].level-1))+'px; margin-bottom:3px;"><a href="#'+menu[m].id+'">'+menu[m].title+'</a></div>';
				}
				menu='<div style="float:left; width: 250px; margin: 0 auto; padding: 30px 5px 5px 5px; overflow: auto; height:99%; position: fixed; top:0; left:0;"><nav style="font-size:13px;">'+menu.join("\n")+"<nav></div>";
				fs.writeFileSync(docsFolder+"/"+f+".html", head+menu+mdhtml+foot);
			}
		}
		head=false;
		foot=false;
		dfiles=false;
		ext=false;
		menu=false;
		mdhtml=false;
	return true;
	} catch (e) { return false }}
}
module.exports = API_docs;