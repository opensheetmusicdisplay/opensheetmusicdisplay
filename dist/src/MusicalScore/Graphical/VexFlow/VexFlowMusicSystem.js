"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var MusicSystem_1 = require("../MusicSystem");
var SystemLine_1 = require("../SystemLine");
var VexFlowConverter_1 = require("./VexFlowConverter");
//import Vex = require("vexflow");
var VexFlowMusicSystem = (function (_super) {
    __extends(VexFlowMusicSystem, _super);
    function VexFlowMusicSystem(parent, id) {
        _super.call(this, parent, id);
    }
    /**
     * This method creates all the graphical lines and dots needed to render a system line (e.g. bold-thin-dots..).
     * @param xPosition
     * @param lineWidth
     * @param lineType
     * @param linePosition indicates if the line belongs to start or end of measure
     * @param musicSystem
     * @param topMeasure
     * @param bottomMeasure
     */
    VexFlowMusicSystem.prototype.createSystemLine = function (xPosition, lineWidth, lineType, linePosition, musicSystem, topMeasure, bottomMeasure) {
        if (bottomMeasure === void 0) { bottomMeasure = undefined; }
        // ToDo: create line in Vexflow
        if (bottomMeasure) {
            bottomMeasure.lineTo(topMeasure, VexFlowConverter_1.VexFlowConverter.line(lineType));
        }
        return new SystemLine_1.SystemLine(lineType, linePosition, this, topMeasure, bottomMeasure);
    };
    /**
     * Calculates the summed x-width of a possibly given Instrument Brace and/or Group Bracket(s).
     * @returns {number} the x-width
     */
    VexFlowMusicSystem.prototype.calcInstrumentsBracketsWidth = function () {
        return 0;
    };
    /**
     * creates an instrument brace for the given dimension.
     * The height and positioning can be inferred from the given points.
     * @param rightUpper the upper right corner point of the bracket to create
     * @param rightLower the lower right corner point of the bracket to create
     */
    VexFlowMusicSystem.prototype.createInstrumentBracket = function (rightUpper, rightLower) {
        return;
    };
    /**
     * creates an instrument group bracket for the given dimension.
     * There can be cascaded bracket (e.g. a group of 2 in a group of 4) -
     * The recursion depth informs about the current depth level (needed for positioning)
     * @param rightUpper rightUpper the upper right corner point of the bracket to create
     * @param rightLower rightLower the lower right corner point of the bracket to create
     * @param staffHeight
     * @param recursionDepth
     */
    VexFlowMusicSystem.prototype.createGroupBracket = function (rightUpper, rightLower, staffHeight, recursionDepth) {
        return;
    };
    return VexFlowMusicSystem;
}(MusicSystem_1.MusicSystem));
exports.VexFlowMusicSystem = VexFlowMusicSystem;
