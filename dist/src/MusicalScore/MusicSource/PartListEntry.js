"use strict";
var PartListEntry = (function () {
    function PartListEntry(musicSheet) {
        this.enrolledTimestamps = [];
        this.visible = true;
        this.musicSheet = musicSheet;
    }
    Object.defineProperty(PartListEntry.prototype, "Visible", {
        get: function () {
            return this.visible;
        },
        set: function (value) {
            this.visible = value;
        },
        enumerable: true,
        configurable: true
    });
    PartListEntry.prototype.getFirstSourceMeasure = function () {
        return this.musicSheet.SourceMeasures[this.startIndex];
    };
    PartListEntry.prototype.getLastSourceMeasure = function () {
        return this.musicSheet.SourceMeasures[this.endIndex];
    };
    return PartListEntry;
}());
exports.PartListEntry = PartListEntry;
