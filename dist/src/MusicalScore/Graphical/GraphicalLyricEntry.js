"use strict";
var GraphicalLabel_1 = require("./GraphicalLabel");
var Label_1 = require("../Label");
var TextAlignment_1 = require("../../Common/Enums/TextAlignment");
var PointF2D_1 = require("../../Common/DataObjects/PointF2D");
var GraphicalLyricEntry = (function () {
    function GraphicalLyricEntry(lyricsEntry, graphicalStaffEntry, lyricsHeight, staffHeight) {
        this.lyricsEntry = lyricsEntry;
        this.graphicalStaffEntry = graphicalStaffEntry;
        this.graphicalLabel = new GraphicalLabel_1.GraphicalLabel(new Label_1.Label(lyricsEntry.Text), lyricsHeight, TextAlignment_1.TextAlignment.CenterBottom, graphicalStaffEntry.PositionAndShape);
        this.graphicalLabel.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(0.0, staffHeight);
    }
    Object.defineProperty(GraphicalLyricEntry.prototype, "GetLyricsEntry", {
        get: function () {
            return this.lyricsEntry;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalLyricEntry.prototype, "ParentLyricWord", {
        get: function () {
            return this.graphicalLyricWord;
        },
        set: function (value) {
            this.graphicalLyricWord = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalLyricEntry.prototype, "GraphicalLabel", {
        get: function () {
            return this.graphicalLabel;
        },
        set: function (value) {
            this.graphicalLabel = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalLyricEntry.prototype, "StaffEntryParent", {
        get: function () {
            return this.graphicalStaffEntry;
        },
        set: function (value) {
            this.graphicalStaffEntry = value;
        },
        enumerable: true,
        configurable: true
    });
    return GraphicalLyricEntry;
}());
exports.GraphicalLyricEntry = GraphicalLyricEntry;
