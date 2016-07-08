// skeleton by Andrea
"use strict";
var MusicSheetErrors = (function () {
    function MusicSheetErrors() {
        this.measureErrors = {};
        this.errors = [];
        this.tempErrors = [];
    }
    MusicSheetErrors.prototype.finalizeMeasure = function (measureNumber) {
        var list = this.measureErrors[measureNumber];
        if (list === undefined) {
            list = [];
        }
        this.measureErrors[measureNumber] = list.concat(this.tempErrors);
        this.tempErrors = [];
    };
    MusicSheetErrors.prototype.pushMeasureError = function (errorMsg) {
        this.tempErrors.push(errorMsg);
    };
    MusicSheetErrors.prototype.push = function (errorMsg) {
        this.errors.push(errorMsg);
    };
    return MusicSheetErrors;
}());
exports.MusicSheetErrors = MusicSheetErrors;
