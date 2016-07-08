"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var PartListEntry_1 = require("./PartListEntry");
var fraction_1 = require("../../Common/DataObjects/fraction");
var SourceMusicPart = (function (_super) {
    __extends(SourceMusicPart, _super);
    function SourceMusicPart(musicSheet, startIndex, endIndex) {
        _super.call(this, musicSheet);
        this.musicSheet = musicSheet;
        this.startIndex = startIndex;
        this.endIndex = endIndex;
    }
    Object.defineProperty(SourceMusicPart.prototype, "MeasuresCount", {
        //private startIndex: number;
        //private endIndex: number;
        get: function () {
            return this.endIndex - this.startIndex + 1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMusicPart.prototype, "StartIndex", {
        get: function () {
            return this.startIndex;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMusicPart.prototype, "EndIndex", {
        get: function () {
            return this.endIndex;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMusicPart.prototype, "ParentRepetition", {
        get: function () {
            return this.parentRepetition;
        },
        set: function (value) {
            this.parentRepetition = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMusicPart.prototype, "AbsoluteTimestamp", {
        get: function () {
            return fraction_1.Fraction.createFromFraction(this.musicSheet.SourceMeasures[this.startIndex].AbsoluteTimestamp);
        },
        enumerable: true,
        configurable: true
    });
    SourceMusicPart.prototype.setStartIndex = function (startIndex) {
        this.startIndex = startIndex;
    };
    SourceMusicPart.prototype.setEndIndex = function (index) {
        this.endIndex = index;
    };
    return SourceMusicPart;
}(PartListEntry_1.PartListEntry));
exports.SourceMusicPart = SourceMusicPart;
