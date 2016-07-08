"use strict";
var GraphicalLyricWord = (function () {
    function GraphicalLyricWord(lyricWord) {
        this.graphicalLyricsEntries = [];
        this.lyricWord = lyricWord;
        this.initialize();
    }
    Object.defineProperty(GraphicalLyricWord.prototype, "GetLyricWord", {
        get: function () {
            return this.lyricWord;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalLyricWord.prototype, "GraphicalLyricsEntries", {
        get: function () {
            return this.graphicalLyricsEntries;
        },
        set: function (value) {
            this.graphicalLyricsEntries = value;
        },
        enumerable: true,
        configurable: true
    });
    GraphicalLyricWord.prototype.isFilled = function () {
        for (var i = 0; i < this.graphicalLyricsEntries.length; i++) {
            if (this.graphicalLyricsEntries[i] === undefined) {
                return false;
            }
        }
        return true;
    };
    GraphicalLyricWord.prototype.initialize = function () {
        for (var i = 0; i < this.lyricWord.Syllables.length; i++) {
            this.graphicalLyricsEntries.push(undefined);
        }
    };
    return GraphicalLyricWord;
}());
exports.GraphicalLyricWord = GraphicalLyricWord;
