#!/usr/bin/env node

var fs = require("fs");
var path = require("path");
var browserify = require("browserify");
var args = require('minimist')(process.argv.slice(2));

var b = browserify({ debug: args.debug || false });

var path_to_vexflow = args.path || path.join(__dirname, "node_modules/vexflow/releases/");

console.log("Path to vexflow: " + path_to_vexflow);

if (args["include-vexflow"]) {
	b.add(path.join(path_to_vexflow, 'vexflow-debug.js'));
}

b.add('./src/file1.js');

b.bundle().pipe(fs.createWriteStream("osmd.js"));
