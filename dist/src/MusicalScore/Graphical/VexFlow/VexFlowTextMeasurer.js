"use strict";
/**
 * Created by Matthias on 21.06.2016.
 */
var VexFlowTextMeasurer = (function () {
    function VexFlowTextMeasurer() {
        var canvas = document.createElement("canvas");
        this.context = canvas.getContext("2d");
        this.context.font = "20px 'Times New Roman'";
    }
    VexFlowTextMeasurer.prototype.computeTextWidthToHeightRatio = function (text, font, style) {
        var size = this.context.measureText(text);
        return size.width / 20;
    };
    return VexFlowTextMeasurer;
}());
exports.VexFlowTextMeasurer = VexFlowTextMeasurer;
