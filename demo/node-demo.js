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

// get all the ressources needed
var { OpenSheetMusicDisplay } = require('../build/opensheetmusicdisplay');
var { DOMParser } = require('xmldom');
var jsdom = require("jsdom");
var fs = require("fs");
var { JSDOM } = jsdom;

// create a virtual DOM
var dom = new JSDOM('<html><body><div id="svg-container"></div></body></html>');
var window = dom.window;
var document = window.document;
var divContainer = dom.window.document.body.children[0];

// create OSMD instance
var osmd = new OpenSheetMusicDisplay(divContainer);

var xmlParser = new DOMParser();
var xDoc = undefined;

// Load the demo file
fs.readFile("/home/benni/opensheetmusicdisplay/demo/Beethoven_AnDieFerneGeliebte.xml", "utf8", function(err, data) {
  if(err) {
    console.log(err);
  }else{
    xDoc = xmlParser.parseFromString(data, 'text/xml');
    console.log("Reading worked")
    // Send it to OSMD
    osmd.load(xDoc);
    // Let OSMD render
    osmd.render();    
    console.log(osmd.backend.getContext().svg);
    // Get the inner HTML and write it to a file
    // NOTE: This will add some more garbage at the end of the SVG file. I was too lazy
    // to write another filter :)
    fs.writeFile("output.svg", osmd.canvas.innerHTML, 'utf8', function(err) {
      if(err) {
        return console.log(err);
      } else {
        console.log("The file was saved!");
      }
  }); 
  }
});
