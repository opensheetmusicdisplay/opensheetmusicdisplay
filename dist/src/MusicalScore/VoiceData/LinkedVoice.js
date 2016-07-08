"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Voice_1 = require("./Voice");
var LinkedVoice = (function (_super) {
    __extends(LinkedVoice, _super);
    function LinkedVoice(parent, voiceId, master) {
        _super.call(this, parent, voiceId);
        this.master = master;
    }
    Object.defineProperty(LinkedVoice.prototype, "Master", {
        get: function () {
            return this.master;
        },
        enumerable: true,
        configurable: true
    });
    return LinkedVoice;
}(Voice_1.Voice));
exports.LinkedVoice = LinkedVoice;
