"use strict";
var ITextTranslation = (function () {
    function ITextTranslation() {
    }
    ITextTranslation.translateText = function (tag, text) {
        if (this.defaultTextTranslation === undefined) {
            return text;
        }
        //return this.DefaultTextTranslation.translate(tag, text);
    };
    return ITextTranslation;
}());
exports.ITextTranslation = ITextTranslation;
