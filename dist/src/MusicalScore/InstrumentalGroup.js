"use strict";
var InstrumentalGroup = (function () {
    function InstrumentalGroup(name, musicSheet, parent) {
        this.instrumentalGroups = [];
        this.name = name;
        this.musicSheet = musicSheet;
        this.parent = parent;
    }
    Object.defineProperty(InstrumentalGroup.prototype, "InstrumentalGroups", {
        get: function () {
            return this.instrumentalGroups;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstrumentalGroup.prototype, "Parent", {
        get: function () {
            return this.parent;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstrumentalGroup.prototype, "Name", {
        get: function () {
            return this.name;
        },
        set: function (value) {
            this.name = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstrumentalGroup.prototype, "GetMusicSheet", {
        get: function () {
            return this.musicSheet;
        },
        enumerable: true,
        configurable: true
    });
    return InstrumentalGroup;
}());
exports.InstrumentalGroup = InstrumentalGroup;
