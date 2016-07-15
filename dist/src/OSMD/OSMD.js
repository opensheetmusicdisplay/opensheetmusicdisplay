"use strict";
var Xml_1 = require("./../Common/FileIO/Xml");
var VexFlowMusicSheetCalculator_1 = require("./../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator");
var MusicSheetReader_1 = require("./../MusicalScore/ScoreIO/MusicSheetReader");
var GraphicalMusicSheet_1 = require("./../MusicalScore/Graphical/GraphicalMusicSheet");
var VexFlowMusicSheetDrawer_1 = require("./../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer");
var Cursor_1 = require("./Cursor");
var Mxl_1 = require("../Common/FileIO/Mxl");
//import {Promise} from "es6-promise";
var ResizeHandler_1 = require("./ResizeHandler");
var OSMD = (function () {
    /**
     * The easy way of displaying a MusicXML sheet music file
     * @param container is either the ID, or the actual "div" element which will host the music sheet
     * @autoResize automatically resize the sheet to full page width on window resize
     */
    function OSMD(container, autoResize) {
        if (autoResize === void 0) { autoResize = false; }
        this.zoom = 1.0;
        // Store container element
        if (typeof container === "string") {
            // ID passed
            this.container = document.getElementById(container);
        }
        else if (container && "appendChild" in container) {
            // Element passed
            this.container = container;
        }
        if (!this.container) {
            throw new Error("Please pass a valid div container to OSMD");
        }
        // Create the elements inside the container
        this.heading = document.createElement("div");
        this.canvas = document.createElement("canvas");
        this.canvas.style.zIndex = "0";
        var inner = document.createElement("div");
        inner.style.position = "relative";
        this.container.appendChild(this.heading);
        inner.appendChild(this.canvas);
        this.container.appendChild(inner);
        // Create the drawer
        this.drawer = new VexFlowMusicSheetDrawer_1.VexFlowMusicSheetDrawer(this.heading, this.canvas);
        // Create the cursor
        this.cursor = new Cursor_1.Cursor(inner, this);
        if (autoResize) {
            this.autoResize();
        }
    }
    /**
     * Load a MusicXML file
     * @param content is either the url of a file, or the root node of a MusicXML document, or the string content of a .xml/.mxl file
     */
    OSMD.prototype.load = function (content) {
        // Warning! This function is asynchronous! No error handling is done here.
        // FIXME TODO Refactor with Promises
        this.reset();
        var path = "Unknown path";
        if (typeof content === "string") {
            var str = content;
            if (str.substr(0, 4) === "http") {
                // Retrieve the file at the url
                path = str;
                this.openURL(path);
                return;
            }
            if (str.substr(0, 4) === "\x04\x03\x4b\x50") {
                // This is a zip file, unpack it first
                Mxl_1.openMxl(str).then(this.load, function (err) {
                    throw new Error("OSMD: Invalid MXL file");
                });
                return;
            }
            if (str.substr(0, 5) === "<?xml") {
                // Parse the string representing an xml file
                var parser = new DOMParser();
                content = parser.parseFromString(str, "text/xml");
            }
        }
        if (!content || !content.nodeName) {
            throw new Error("OSMD: Document provided is not valid");
        }
        var elem = content.getElementsByTagName("score-partwise")[0];
        if (elem === undefined) {
            throw new Error("OSMD: Document is not valid partwise MusicXML");
        }
        var score = new Xml_1.IXmlElement(elem);
        var calc = new VexFlowMusicSheetCalculator_1.VexFlowMusicSheetCalculator();
        var reader = new MusicSheetReader_1.MusicSheetReader();
        this.sheet = reader.createMusicSheet(score, path);
        this.graphic = new GraphicalMusicSheet_1.GraphicalMusicSheet(this.sheet, calc);
        this.cursor.init(this.sheet.MusicPartManager, this.graphic);
        return; // Promise.resolve();
    };
    /**
     * Render the music sheet in the container
     */
    OSMD.prototype.render = function () {
        this.resetHeadings();
        if (!this.graphic) {
            throw new Error("OSMD: Before rendering a music sheet, please load a MusicXML file");
        }
        var width = this.container.offsetWidth;
        if (isNaN(width)) {
            throw new Error("OSMD: Before rendering a music sheet, please give the container a width");
        }
        // Set page width
        this.sheet.pageWidth = width / this.zoom / 10.0;
        // Calculate again
        this.graphic.reCalculate();
        // Update Sheet Page
        var height = this.graphic.MusicPages[0].PositionAndShape.BorderBottom * 10.0 * this.zoom;
        this.drawer.resize(width, height);
        this.drawer.scale(this.zoom);
        // Finally, draw
        this.drawer.drawSheet(this.graphic);
        // Update the cursor position
        this.cursor.update();
    };
    /**
     *
     * @param url
     */
    OSMD.prototype.openURL = function (url) {
        throw new Error("OSMD: Not implemented: Load sheet from URL");
        //let JSZipUtils: any;
        //let self: OSMD = this;
        //JSZipUtils.getBinaryContent(url, function (err, data) {
        //    if(err) {
        //        throw err;
        //    }
        //    return self.load(data);
        //});
    };
    /**
     * Clear all the titles from the headings element
     */
    OSMD.prototype.resetHeadings = function () {
        while (this.heading.firstChild) {
            this.heading.removeChild(this.heading.firstChild);
        }
    };
    /**
     * Initialize this object to default values
     * FIXME: Probably unnecessary
     */
    OSMD.prototype.reset = function () {
        this.sheet = undefined;
        this.graphic = undefined;
        this.zoom = 1.0;
        this.resetHeadings();
    };
    /**
     * Attach the appropriate handler to the window.onResize event
     */
    OSMD.prototype.autoResize = function () {
        var self = this;
        ResizeHandler_1.handleResize(function () {
            // empty
        }, function () {
            var width = Math.max(document.documentElement.clientWidth, document.body.scrollWidth, document.documentElement.scrollWidth, document.body.offsetWidth, document.documentElement.offsetWidth);
            self.container.style.width = width + "px";
            self.render();
        });
    };
    return OSMD;
}());
exports.OSMD = OSMD;
