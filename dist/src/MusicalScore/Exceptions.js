"use strict";
var MusicSheetReadingException = (function () {
    function MusicSheetReadingException(message, e) {
        //super(message);
        this.message = message;
        if (e !== undefined) {
            this.message += " " + e.toString();
        }
    }
    return MusicSheetReadingException;
}());
exports.MusicSheetReadingException = MusicSheetReadingException;
var ArgumentOutOfRangeException = (function () {
    function ArgumentOutOfRangeException(message) {
        //super(message);
        this.message = message;
    }
    return ArgumentOutOfRangeException;
}());
exports.ArgumentOutOfRangeException = ArgumentOutOfRangeException;
var InvalidEnumArgumentException = (function () {
    function InvalidEnumArgumentException(message) {
        this.message = message;
    }
    return InvalidEnumArgumentException;
}());
exports.InvalidEnumArgumentException = InvalidEnumArgumentException;
