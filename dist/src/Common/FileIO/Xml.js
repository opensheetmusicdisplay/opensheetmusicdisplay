"use strict";
var IXmlElement = (function () {
    function IXmlElement(elem) {
        this.hasAttributes = false;
        this.elem = elem;
        this.name = elem.nodeName.toLowerCase();
        if (elem.hasAttributes()) {
            this.hasAttributes = true;
            this.firstAttribute = elem.attributes[0];
        }
        this.hasElements = elem.hasChildNodes();
        // Look for a value
        if (elem.childNodes.length === 1 && elem.childNodes[0].nodeType === Node.TEXT_NODE) {
            this.value = elem.childNodes[0].nodeValue;
        }
        else {
            this.value = "";
        }
    }
    IXmlElement.prototype.attribute = function (attributeName) {
        return this.elem.attributes.getNamedItem(attributeName);
    };
    IXmlElement.prototype.attributes = function () {
        if (typeof this.attrs === "undefined") {
            var attributes = this.elem.attributes;
            var attrs = [];
            for (var i = 0; i < attributes.length; i += 1) {
                attrs.push(attributes[i]);
            }
            this.attrs = attrs;
        }
        return this.attrs;
    };
    IXmlElement.prototype.element = function (elementName) {
        return this.elements(elementName)[0];
    };
    IXmlElement.prototype.elements = function (nodeName) {
        var nodes = this.elem.childNodes;
        var ret = [];
        var nameUnset = nodeName === undefined;
        if (!nameUnset) {
            nodeName = nodeName.toLowerCase();
        }
        // console.log("-", nodeName, nodes.length, this.elem.childElementCount, this.elem.getElementsByTagName(nodeName).length);
        // if (nodeName === "measure") {
        //   console.log(this.elem);
        // }
        for (var i = 0; i < nodes.length; i += 1) {
            var node = nodes[i];
            //console.log("node: ", this.elem.nodeName, ">>", node.nodeName, node.nodeType === Node.ELEMENT_NODE);
            if (node.nodeType === Node.ELEMENT_NODE &&
                (nameUnset || node.nodeName.toLowerCase() === nodeName)) {
                ret.push(new IXmlElement(node));
            }
        }
        return ret;
    };
    return IXmlElement;
}());
exports.IXmlElement = IXmlElement;
