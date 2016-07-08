"use strict";
(function (DrawingMode) {
    DrawingMode[DrawingMode["All"] = 0] = "All";
    DrawingMode[DrawingMode["NoOverlays"] = 1] = "NoOverlays";
    DrawingMode[DrawingMode["Leadsheet"] = 2] = "Leadsheet";
})(exports.DrawingMode || (exports.DrawingMode = {}));
var DrawingMode = exports.DrawingMode;
(function (MusicSymbolDrawingStyle) {
    MusicSymbolDrawingStyle[MusicSymbolDrawingStyle["Normal"] = 0] = "Normal";
    MusicSymbolDrawingStyle[MusicSymbolDrawingStyle["Disabled"] = 1] = "Disabled";
    MusicSymbolDrawingStyle[MusicSymbolDrawingStyle["Selected"] = 2] = "Selected";
    MusicSymbolDrawingStyle[MusicSymbolDrawingStyle["Clickable"] = 3] = "Clickable";
    MusicSymbolDrawingStyle[MusicSymbolDrawingStyle["PlaybackSymbols"] = 4] = "PlaybackSymbols";
    MusicSymbolDrawingStyle[MusicSymbolDrawingStyle["FollowSymbols"] = 5] = "FollowSymbols";
    MusicSymbolDrawingStyle[MusicSymbolDrawingStyle["QFeedbackNotFound"] = 6] = "QFeedbackNotFound";
    MusicSymbolDrawingStyle[MusicSymbolDrawingStyle["QFeedbackOk"] = 7] = "QFeedbackOk";
    MusicSymbolDrawingStyle[MusicSymbolDrawingStyle["QFeedbackPerfect"] = 8] = "QFeedbackPerfect";
    MusicSymbolDrawingStyle[MusicSymbolDrawingStyle["Debug1"] = 9] = "Debug1";
    MusicSymbolDrawingStyle[MusicSymbolDrawingStyle["Debug2"] = 10] = "Debug2";
    MusicSymbolDrawingStyle[MusicSymbolDrawingStyle["Debug3"] = 11] = "Debug3";
})(exports.MusicSymbolDrawingStyle || (exports.MusicSymbolDrawingStyle = {}));
var MusicSymbolDrawingStyle = exports.MusicSymbolDrawingStyle;
(function (PhonicScoreModes) {
    PhonicScoreModes[PhonicScoreModes["Following"] = 0] = "Following";
    PhonicScoreModes[PhonicScoreModes["Midi"] = 1] = "Midi";
    PhonicScoreModes[PhonicScoreModes["Manual"] = 2] = "Manual";
})(exports.PhonicScoreModes || (exports.PhonicScoreModes = {}));
var PhonicScoreModes = exports.PhonicScoreModes;
