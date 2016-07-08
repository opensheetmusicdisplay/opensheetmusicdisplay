"use strict";
var TextAlignment_1 = require("../Common/Enums/TextAlignment");
var Fonts_1 = require("../Common/Enums/Fonts");
var Label = (function () {
    function Label(text, alignment, font) {
        if (text === void 0) { text = ""; }
        if (alignment === void 0) { alignment = TextAlignment_1.TextAlignment.LeftBottom; }
        if (font === void 0) { font = Fonts_1.Fonts.TimesNewRoman; }
        this.text = text;
        this.textAlignment = alignment;
        this.font = font;
    }
    Label.prototype.ToString = function () {
        return this.text;
    };
    return Label;
}());
exports.Label = Label;
