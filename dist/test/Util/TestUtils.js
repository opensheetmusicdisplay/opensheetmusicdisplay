"use strict";
/**
 * This class collects useful methods to interact with test data.
 * During tests, XML and MXL documents are preprocessed by karma,
 * and this is some helper code to retrieve them.
 */
var TestUtils = (function () {
    function TestUtils() {
    }
    TestUtils.getScore = function (name) {
        var path = "test/data/" + name + ".xml";
        return (window.__xml__)[path];
    };
    TestUtils.getMXL = function (scoreName) {
        var path = "test/data/" + scoreName + ".mxl";
        return (window.__raw__)[path];
    };
    /**
     * Retrieve from a XML document the first element with name "score-partwise"
     * @param doc is the XML Document
     * @returns {Element}
     */
    TestUtils.getPartWiseElement = function (doc) {
        var nodes = doc.childNodes;
        for (var i = 0, length_1 = nodes.length; i < length_1; i += 1) {
            var node = nodes[i];
            if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() === "score-partwise") {
                return node;
            }
        }
    };
    return TestUtils;
}());
exports.TestUtils = TestUtils;
