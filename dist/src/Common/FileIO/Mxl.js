"use strict";
var Xml_1 = require("./Xml");
var es6_promise_1 = require("es6-promise");
var JSZip = require("jszip");
// Usage for extractSheetMusicFromMxl:
// extractSheetFromMxl(" *** binary content *** ").then(
//   (score: IXmlElement) => {
//     // Success! use the score here!
//   },
//   (error: any) => {
//     // There was an error.
//     // Handle it here.
//   }
// )
function extractSheetFromMxl(data) {
    "use strict";
    var zip = new JSZip();
    // asynchronously load zip file and process it - with Promises
    return zip.loadAsync(data).then(function (_) {
        return zip.file("META-INF/container.xml").async("string");
    }, function (err) {
        throw err;
    }).then(function (content) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(content, "text/xml");
        var rootFile = doc.getElementsByTagName("rootfile")[0].getAttribute("full-path");
        return zip.file(rootFile).async("string");
    }, function (err) {
        throw err;
    }).then(function (content) {
        var parser = new DOMParser();
        var xml = parser.parseFromString(content, "text/xml");
        var doc = new Xml_1.IXmlElement(xml.documentElement);
        return es6_promise_1.Promise.resolve(doc);
    }, function (err) {
        throw err;
    }).then(function (content) {
        return es6_promise_1.Promise.resolve(content);
    }, function (err) {
        throw new Error("extractSheetFromMxl: " + err.message);
    });
}
exports.extractSheetFromMxl = extractSheetFromMxl;
function openMxl(data) {
    "use strict";
    var zip = new JSZip();
    // asynchronously load zip file and process it - with Promises
    return zip.loadAsync(data).then(function (_) {
        return zip.file("META-INF/container.xml").async("string");
    }, function (err) {
        throw err;
    });
}
exports.openMxl = openMxl;
