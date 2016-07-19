"use strict";
var IXmlElement = (function () {
    function IXmlElement(elem) {
        this.hasAttributes = false;
        if (elem === undefined) {
            throw new Error("IXmlElement: expected Element, got undefined");
        }
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
        if (!this.attrs) {
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
        var nodes = this.elem.childNodes;
        for (var i = 0, length_1 = nodes.length; i < length_1; i += 1) {
            var node = nodes[i];
            if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() === elementName) {
                return new IXmlElement(node);
            }
        }
    };
    IXmlElement.prototype.elements = function (nodeName) {
        var nodes = this.elem.childNodes;
        var ret = [];
        var nameUnset = nodeName === undefined;
        if (!nameUnset) {
            nodeName = nodeName.toLowerCase();
        }
        for (var i = 0; i < nodes.length; i += 1) {
            var node = nodes[i];
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
