// sudo apt-get install libjpeg-dev libgif-dev libcairo2-dev
// npm install
//
// patch vexflow-debug.js:
// var jsdom = require("jsdom");
// var { JSDOM } = jsdom;
// var dom = new JSDOM('<html><body><div id="svg-container"></div></body></html>');
// var window = dom.window;
// var document = window.document;
//
// run with node node-demo.js

var { OpenSheetMusicDisplay } = require('../build/opensheetmusicdisplay');
var { DOMParser, XMLSerializer } = require('xmldom');
var jsdom = require("jsdom");
var fs = require("fs");
var { JSDOM } = jsdom;

var dom = new JSDOM('<html><body><div id="svg-container"></div></body></html>');
var window = dom.window;
var document = window.document;
var divContainer = dom.window.document.body.children[0];
var osmd = new OpenSheetMusicDisplay(divContainer);

var xmlParser = new DOMParser();
var xDoc = undefined;

fs.readFile("/home/benni/opensheetmusicdisplay/demo/Beethoven_AnDieFerneGeliebte.xml", "utf8", function(err, data) {
  if(err) {
    console.log(err);
  }else{
    xDoc = xmlParser.parseFromString(data, 'text/xml');
    console.log("Reading worked")
    osmd.load(xDoc);
    // console.log(osmd)
    osmd.render();
    console.log(osmd.backend.getContext().svg);
    var s = new XMLSerializer();
    var d = osmd.backend.getContext().svg;
    var str = s.serializeToString(d);
    fs.writeFile("output.svg", osmd.canvas.innerHTML, 'utf8', function(err) {
      if(err) {
          return console.log(err);
      } else {
        console.log("The file was saved!");
      }
  }); 
  }
});
