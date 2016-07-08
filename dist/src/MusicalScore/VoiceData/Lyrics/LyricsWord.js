"use strict";
var LyricWord = (function () {
    function LyricWord() {
        this.syllables = [];
    }
    Object.defineProperty(LyricWord.prototype, "Syllables", {
        get: function () {
            return this.syllables;
        },
        enumerable: true,
        configurable: true
    });
    LyricWord.prototype.containsVoiceEntry = function (voiceEntry) {
        for (var idx = 0, len = this.Syllables.length; idx < len; ++idx) {
            var lyricsEntry = this.Syllables[idx];
            if (lyricsEntry.Parent === voiceEntry) {
                return true;
            }
        }
        return false;
    };
    LyricWord.prototype.findLyricEntryInVoiceEntry = function (voiceEntry) {
        for (var idx = 0, len = this.Syllables.length; idx < len; ++idx) {
            var lyricsEntry = this.Syllables[idx];
            if (lyricsEntry.Parent === voiceEntry) {
                return lyricsEntry;
            }
        }
    };
    return LyricWord;
}());
exports.LyricWord = LyricWord;
