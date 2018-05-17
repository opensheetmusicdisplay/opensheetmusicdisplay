var opensheetmusicdisplay = require('../build/opensheetmusicdisplay')
var jsdom = require("jsdom");
var { JSDOM } = jsdom;

var window = (new JSDOM("")).window;
var document = (new JSDOM("")).window;
var dom = new JSDOM(`<body>
  <div id="svg-container"></div>
</body>`);
var divContainer = dom.window.document.body.children[0];

console.log(opensheetmusicdisplay.OpenSheetMusicDisplay(divContainer))