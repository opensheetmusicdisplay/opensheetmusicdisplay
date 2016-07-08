"use strict";
var Voice = (function () {
    function Voice(parent, voiceId) {
        this.voiceEntries = [];
        this.volume = 1;
        this.parent = parent;
        this.visible = true;
        this.audible = true;
        this.following = true;
        this.voiceId = voiceId;
    }
    Object.defineProperty(Voice.prototype, "VoiceEntries", {
        get: function () {
            return this.voiceEntries;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Voice.prototype, "Parent", {
        get: function () {
            return this.parent;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Voice.prototype, "Visible", {
        get: function () {
            return this.visible;
        },
        set: function (value) {
            this.visible = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Voice.prototype, "Audible", {
        get: function () {
            return this.audible;
        },
        set: function (value) {
            this.audible = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Voice.prototype, "Following", {
        get: function () {
            return this.following;
        },
        set: function (value) {
            this.following = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Voice.prototype, "VoiceId", {
        get: function () {
            return this.voiceId;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Voice.prototype, "Volume", {
        get: function () {
            return this.volume;
        },
        set: function (value) {
            this.volume = value;
        },
        enumerable: true,
        configurable: true
    });
    return Voice;
}());
exports.Voice = Voice;
