"use strict";
var Xml_1 = require("../../src/Common/FileIO/Xml");
var TestUtils = (function () {
    function TestUtils() {
    }
    TestUtils.getScore = function (path) {
        var doc = (window.__xml__)[path];
        if (doc === undefined) {
            return;
        }
        var elem = doc.getElementsByTagName("score-partwise")[0];
        if (elem === undefined) {
            return;
        }
        return new Xml_1.IXmlElement(elem);
    };
    return TestUtils;
}());
exports.TestUtils = TestUtils;
