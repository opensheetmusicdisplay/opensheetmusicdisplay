"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var InstrumentalGroup_1 = require("./InstrumentalGroup");
var Label_1 = require("./Label");
var Staff_1 = require("./VoiceData/Staff");
var Instrument = (function (_super) {
    __extends(Instrument, _super);
    function Instrument(id, idString, musicSheet, parent) {
        _super.call(this, undefined, musicSheet, parent);
        this.transpose = 0;
        this.voices = [];
        this.staves = [];
        this.hasLyrics = false;
        this.hasChordSymbols = false;
        this.lyricVersesNumbers = [];
        this.subInstruments = [];
        this.id = id;
        this.idString = idString;
        this.nameLabel = new Label_1.Label(idString);
    }
    Object.defineProperty(Instrument.prototype, "Voices", {
        get: function () {
            return this.voices;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "Staves", {
        get: function () {
            return this.staves;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "NameLabel", {
        get: function () {
            return this.nameLabel;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "HasLyrics", {
        get: function () {
            return this.hasLyrics;
        },
        set: function (value) {
            this.hasLyrics = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "HasChordSymbols", {
        get: function () {
            return this.hasChordSymbols;
        },
        set: function (value) {
            this.hasChordSymbols = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "LyricVersesNumbers", {
        get: function () {
            return this.lyricVersesNumbers;
        },
        set: function (value) {
            this.lyricVersesNumbers = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "Name", {
        get: function () {
            return this.nameLabel.text;
        },
        set: function (value) {
            this.nameLabel.text = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "IdString", {
        get: function () {
            return this.idString;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "Id", {
        get: function () {
            return this.id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "MidiInstrumentId", {
        get: function () {
            return this.subInstruments[0].midiInstrumentID;
        },
        set: function (value) {
            this.subInstruments[0].midiInstrumentID = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "Volume", {
        get: function () {
            return this.subInstruments[0].volume;
        },
        set: function (value) {
            for (var idx = 0, len = this.subInstruments.length; idx < len; ++idx) {
                var subInstrument = this.subInstruments[idx];
                subInstrument.volume = value;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "PlaybackTranspose", {
        get: function () {
            return this.playbackTranspose;
        },
        set: function (value) {
            this.playbackTranspose = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "SubInstruments", {
        get: function () {
            return this.subInstruments;
        },
        enumerable: true,
        configurable: true
    });
    Instrument.prototype.getSubInstrument = function (subInstrumentIdString) {
        for (var idx = 0, len = this.subInstruments.length; idx < len; ++idx) {
            var subInstrument = this.subInstruments[idx];
            if (subInstrument.idString === subInstrumentIdString) {
                return subInstrument;
            }
        }
        return undefined;
    };
    Object.defineProperty(Instrument.prototype, "Visible", {
        get: function () {
            if (this.voices.length > 0) {
                return this.Voices[0].Visible;
            }
            else {
                return false;
            }
        },
        set: function (value) {
            for (var idx = 0, len = this.Voices.length; idx < len; ++idx) {
                var v = this.Voices[idx];
                v.Visible = value;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "Audible", {
        get: function () {
            var result = false;
            for (var idx = 0, len = this.Voices.length; idx < len; ++idx) {
                var v = this.Voices[idx];
                result = result || v.Audible;
            }
            return result;
        },
        set: function (value) {
            for (var idx = 0, len = this.Voices.length; idx < len; ++idx) {
                var v = this.Voices[idx];
                v.Audible = value;
            }
            for (var idx = 0, len = this.staves.length; idx < len; ++idx) {
                var staff = this.staves[idx];
                staff.audible = value;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instrument.prototype, "Following", {
        get: function () {
            var result = false;
            for (var idx = 0, len = this.Voices.length; idx < len; ++idx) {
                var v = this.Voices[idx];
                result = result || v.Following;
            }
            return result;
        },
        set: function (value) {
            for (var idx = 0, len = this.Voices.length; idx < len; ++idx) {
                var v = this.Voices[idx];
                v.Following = value;
            }
            for (var idx = 0, len = this.staves.length; idx < len; ++idx) {
                var staff = this.staves[idx];
                staff.following = value;
            }
        },
        enumerable: true,
        configurable: true
    });
    Instrument.prototype.SetVoiceAudible = function (voiceId, audible) {
        for (var idx = 0, len = this.Voices.length; idx < len; ++idx) {
            var v = this.Voices[idx];
            if (v.VoiceId === voiceId) {
                v.Audible = audible;
                break;
            }
        }
    };
    Instrument.prototype.SetVoiceFollowing = function (voiceId, following) {
        for (var idx = 0, len = this.Voices.length; idx < len; ++idx) {
            var v = this.Voices[idx];
            if (v.VoiceId === voiceId) {
                v.Following = following;
                break;
            }
        }
    };
    Instrument.prototype.SetStaffAudible = function (staffId, audible) {
        var staff = this.staves[staffId - 1];
        staff.audible = audible;
        if (audible) {
            for (var idx = 0, len = staff.Voices.length; idx < len; ++idx) {
                var v = staff.Voices[idx];
                v.Audible = true;
            }
        }
        else {
            for (var idx = 0, len = staff.Voices.length; idx < len; ++idx) {
                var voice = staff.Voices[idx];
                var isAudibleInOtherStaves = false;
                for (var idx2 = 0, len2 = this.Staves.length; idx2 < len2; ++idx2) {
                    var st = this.Staves[idx2];
                    if (st.Id === staffId || !st.audible) {
                        continue;
                    }
                    for (var idx3 = 0, len3 = st.Voices.length; idx3 < len3; ++idx3) {
                        var v = st.Voices[idx3];
                        if (v === voice) {
                            isAudibleInOtherStaves = true;
                        }
                    }
                }
                if (!isAudibleInOtherStaves) {
                    voice.Audible = false;
                }
            }
        }
    };
    Instrument.prototype.SetStaffFollow = function (staffId, follow) {
        var staff = this.staves[staffId - 1];
        staff.following = follow;
        if (follow) {
            for (var idx = 0, len = staff.Voices.length; idx < len; ++idx) {
                var v = staff.Voices[idx];
                v.Following = true;
            }
        }
        else {
            for (var idx = 0, len = staff.Voices.length; idx < len; ++idx) {
                var voice = staff.Voices[idx];
                var isFollowingInOtherStaves = false;
                for (var idx2 = 0, len2 = this.Staves.length; idx2 < len2; ++idx2) {
                    var st = this.Staves[idx2];
                    if (st.Id === staffId || !st.following) {
                        continue;
                    }
                    for (var idx3 = 0, len3 = st.Voices.length; idx3 < len3; ++idx3) {
                        var v = st.Voices[idx3];
                        if (v === voice) {
                            isFollowingInOtherStaves = true;
                        }
                    }
                }
                if (!isFollowingInOtherStaves) {
                    voice.Following = false;
                }
            }
        }
    };
    Instrument.prototype.areAllVoiceVisible = function () {
        for (var _i = 0, _a = this.Voices; _i < _a.length; _i++) {
            var voice = _a[_i];
            if (!voice.Visible) {
                return false;
            }
        }
        return true;
    };
    Instrument.prototype.createStaves = function (numberOfStaves) {
        for (var i = 0; i < numberOfStaves; i++) {
            this.staves.push(new Staff_1.Staff(this, i + 1));
        }
    };
    return Instrument;
}(InstrumentalGroup_1.InstrumentalGroup));
exports.Instrument = Instrument;
