"use strict";
var GraphicalMarkedArea = (function () {
    function GraphicalMarkedArea(systemRectangle, labelRectangle, label, settingsLabel) {
        if (labelRectangle === void 0) { labelRectangle = undefined; }
        if (label === void 0) { label = undefined; }
        if (settingsLabel === void 0) { settingsLabel = undefined; }
        this.systemRectangle = systemRectangle;
        this.labelRectangle = labelRectangle;
        this.label = label;
        this.settings = settingsLabel;
    }
    return GraphicalMarkedArea;
}());
exports.GraphicalMarkedArea = GraphicalMarkedArea;
