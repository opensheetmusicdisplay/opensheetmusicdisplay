"use strict";
var GraphicalTie = (function () {
    function GraphicalTie(tie, start, end) {
        if (start === void 0) { start = undefined; }
        if (end === void 0) { end = undefined; }
        this.tie = tie;
        this.startNote = start;
        this.endNote = end;
    }
    Object.defineProperty(GraphicalTie.prototype, "GetTie", {
        get: function () {
            return this.tie;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalTie.prototype, "StartNote", {
        get: function () {
            return this.startNote;
        },
        set: function (value) {
            this.startNote = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalTie.prototype, "EndNote", {
        get: function () {
            return this.endNote;
        },
        set: function (value) {
            this.endNote = value;
        },
        enumerable: true,
        configurable: true
    });
    return GraphicalTie;
}());
exports.GraphicalTie = GraphicalTie;
