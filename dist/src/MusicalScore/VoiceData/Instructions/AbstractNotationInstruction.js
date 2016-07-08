"use strict";
var AbstractNotationInstruction = (function () {
    function AbstractNotationInstruction(parent) {
        this.parent = parent;
    }
    Object.defineProperty(AbstractNotationInstruction.prototype, "Parent", {
        get: function () {
            return this.parent;
        },
        set: function (value) {
            this.parent = value;
        },
        enumerable: true,
        configurable: true
    });
    return AbstractNotationInstruction;
}());
exports.AbstractNotationInstruction = AbstractNotationInstruction;
