"use strict";
var VexFlowConverter_1 = require("./VexFlowConverter");
/**
 * Created by Matthias on 21.06.2016.
 */
var VexFlowTextMeasurer = (function () {
    function VexFlowTextMeasurer() {
        var canvas = document.createElement("canvas");
        this.context = canvas.getContext("2d");
    }
    VexFlowTextMeasurer.prototype.computeTextWidthToHeightRatio = function (text, font, style) {
        this.context.font = VexFlowConverter_1.VexFlowConverter.font(20, style, font);
        return this.context.measureText(text).width / 20;
    };
    return VexFlowTextMeasurer;
}());
exports.VexFlowTextMeasurer = VexFlowTextMeasurer;
