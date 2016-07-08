"use strict";
var Xml_1 = require("./Common/FileIO/Xml");
var VexFlowMusicSheetCalculator_1 = require("./MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator");
var MusicSheetReader_1 = require("./MusicalScore/ScoreIO/MusicSheetReader");
var GraphicalMusicSheet_1 = require("./MusicalScore/Graphical/GraphicalMusicSheet");
var VexFlowMusicSheetDrawer_1 = require("./MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer");
var VexFlowTextMeasurer_1 = require("./MusicalScore/Graphical/VexFlow/VexFlowTextMeasurer");
var MusicSheetAPI = (function () {
    function MusicSheetAPI() {
        this.zoom = 1.0;
        this.unit = 10;
        return;
    }
    MusicSheetAPI.prototype.load = function (sheet) {
        var score = new Xml_1.IXmlElement(sheet.getElementsByTagName("score-partwise")[0]);
        var calc = new VexFlowMusicSheetCalculator_1.VexFlowMusicSheetCalculator();
        var reader = new MusicSheetReader_1.MusicSheetReader();
        this.sheet = reader.createMusicSheet(score, "path missing");
        this.graphic = new GraphicalMusicSheet_1.GraphicalMusicSheet(this.sheet, calc);
        this.display();
    };
    MusicSheetAPI.prototype.setCanvas = function (canvas) {
        this.canvas = canvas;
        this.drawer = new VexFlowMusicSheetDrawer_1.VexFlowMusicSheetDrawer(canvas, new VexFlowTextMeasurer_1.VexFlowTextMeasurer());
    };
    MusicSheetAPI.prototype.setWidth = function (width) {
        if (width === this.width) {
            return;
        }
        this.width = width;
        this.display();
    };
    MusicSheetAPI.prototype.scale = function (k) {
        this.zoom = k;
        this.display();
    };
    MusicSheetAPI.prototype.display = function () {
        if (this.width === undefined) {
            return;
        }
        if (this.canvas === undefined) {
            return;
        }
        if (this.sheet === undefined) {
            return;
        }
        this.sheet.pageWidth = this.width / this.zoom / this.unit;
        this.graphic.reCalculate();
        // Update Sheet Page
        var height = this.graphic.MusicPages[0].PositionAndShape.BorderBottom * this.unit * this.zoom;
        this.drawer.resize(this.width, height);
        // Fix the label problem
        this.drawer.translate(0, 100);
        this.drawer.scale(this.zoom);
        this.drawer.drawSheet(this.graphic);
    };
    MusicSheetAPI.prototype.free = function () {
        this.canvas = undefined;
        this.sheet = undefined;
        return;
    };
    return MusicSheetAPI;
}());
exports.MusicSheetAPI = MusicSheetAPI;
window.osmd = {
    "MusicSheet": MusicSheetAPI,
};
