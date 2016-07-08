"use strict";
var LyricsEntry = (function () {
    function LyricsEntry(text, word, parent) {
        this.text = text;
        this.word = word;
        this.parent = parent;
    }
    Object.defineProperty(LyricsEntry.prototype, "Text", {
        get: function () {
            return this.text;
        },
        set: function (value) {
            this.text = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LyricsEntry.prototype, "Word", {
        get: function () {
            return this.word;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LyricsEntry.prototype, "Parent", {
        get: function () {
            return this.parent;
        },
        set: function (value) {
            this.parent = value;
        },
        enumerable: true,
        configurable: true
    });
    return LyricsEntry;
}());
exports.LyricsEntry = LyricsEntry;
