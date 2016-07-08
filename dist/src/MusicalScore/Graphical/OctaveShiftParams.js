"use strict";
var OctaveShiftParams = (function () {
    function OctaveShiftParams(openOctaveShift, absoluteStartTimestamp, absoluteEndTimestamp) {
        this.getOpenOctaveShift = openOctaveShift;
        this.getAbsoluteStartTimestamp = absoluteStartTimestamp;
        this.getAbsoluteEndTimestamp = absoluteEndTimestamp;
    }
    return OctaveShiftParams;
}());
exports.OctaveShiftParams = OctaveShiftParams;
