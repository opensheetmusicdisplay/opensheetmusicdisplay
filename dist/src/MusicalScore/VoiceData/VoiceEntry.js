"use strict";
var fraction_1 = require("../../Common/DataObjects/fraction");
var Note_1 = require("./Note");
var pitch_1 = require("../../Common/DataObjects/pitch");
var OrnamentContainer_1 = require("./OrnamentContainer");
var pitch_2 = require("../../Common/DataObjects/pitch");
var Dictionary_1 = require("typescript-collections/dist/lib/Dictionary");
var VoiceEntry = (function () {
    function VoiceEntry(timestamp, parentVoice, parentSourceStaffEntry) {
        this.notes = [];
        this.articulations = [];
        this.technicalInstructions = [];
        this.lyricsEntries = new Dictionary_1.default();
        this.arpeggiosNotesIndices = [];
        this.timestamp = timestamp;
        this.parentVoice = parentVoice;
        this.parentSourceStaffEntry = parentSourceStaffEntry;
    }
    Object.defineProperty(VoiceEntry.prototype, "ParentSourceStaffEntry", {
        get: function () {
            return this.parentSourceStaffEntry;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VoiceEntry.prototype, "ParentVoice", {
        get: function () {
            return this.parentVoice;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VoiceEntry.prototype, "Timestamp", {
        get: function () {
            return this.timestamp;
        },
        set: function (value) {
            this.timestamp = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VoiceEntry.prototype, "Notes", {
        get: function () {
            return this.notes;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VoiceEntry.prototype, "Articulations", {
        get: function () {
            return this.articulations;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VoiceEntry.prototype, "TechnicalInstructions", {
        get: function () {
            return this.technicalInstructions;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VoiceEntry.prototype, "LyricsEntries", {
        get: function () {
            return this.lyricsEntries;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VoiceEntry.prototype, "ArpeggiosNotesIndices", {
        get: function () {
            return this.arpeggiosNotesIndices;
        },
        set: function (value) {
            this.arpeggiosNotesIndices = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VoiceEntry.prototype, "OrnamentContainer", {
        get: function () {
            return this.ornamentContainer;
        },
        set: function (value) {
            this.ornamentContainer = value;
        },
        enumerable: true,
        configurable: true
    });
    VoiceEntry.isSupportedArticulation = function (articulation) {
        switch (articulation) {
            case ArticulationEnum.accent:
            case ArticulationEnum.strongaccent:
            case ArticulationEnum.invertedstrongaccent:
            case ArticulationEnum.staccato:
            case ArticulationEnum.staccatissimo:
            case ArticulationEnum.spiccato:
            case ArticulationEnum.tenuto:
            case ArticulationEnum.fermata:
            case ArticulationEnum.invertedfermata:
            case ArticulationEnum.breathmark:
            case ArticulationEnum.caesura:
            case ArticulationEnum.lefthandpizzicato:
            case ArticulationEnum.naturalharmonic:
            case ArticulationEnum.snappizzicato:
            case ArticulationEnum.upbow:
            case ArticulationEnum.downbow:
                return true;
            default:
                return false;
        }
    };
    VoiceEntry.prototype.hasTie = function () {
        for (var idx = 0, len = this.Notes.length; idx < len; ++idx) {
            var note = this.Notes[idx];
            if (note.NoteTie !== undefined) {
                return true;
            }
        }
        return false;
    };
    VoiceEntry.prototype.hasSlur = function () {
        for (var idx = 0, len = this.Notes.length; idx < len; ++idx) {
            var note = this.Notes[idx];
            if (note.NoteSlurs.length > 0) {
                return true;
            }
        }
        return false;
    };
    VoiceEntry.prototype.isStaccato = function () {
        for (var idx = 0, len = this.Articulations.length; idx < len; ++idx) {
            var articulation = this.Articulations[idx];
            if (articulation === ArticulationEnum.staccato) {
                return true;
            }
        }
        return false;
    };
    VoiceEntry.prototype.isAccent = function () {
        for (var idx = 0, len = this.Articulations.length; idx < len; ++idx) {
            var articulation = this.Articulations[idx];
            if (articulation === ArticulationEnum.accent || articulation === ArticulationEnum.strongaccent) {
                return true;
            }
        }
        return false;
    };
    VoiceEntry.prototype.getVerseNumberForLyricEntry = function (lyricsEntry) {
        var verseNumber = 1;
        this.lyricsEntries.forEach(function (key, value) {
            if (lyricsEntry === value) {
                verseNumber = key;
            }
        });
        return verseNumber;
    };
    //public createVoiceEntriesForOrnament(activeKey: KeyInstruction): VoiceEntry[] {
    //    return this.createVoiceEntriesForOrnament(this, activeKey);
    //}
    VoiceEntry.prototype.createVoiceEntriesForOrnament = function (voiceEntryWithOrnament, activeKey) {
        if (voiceEntryWithOrnament === undefined) {
            voiceEntryWithOrnament = this;
        }
        var voiceEntries = [];
        if (voiceEntryWithOrnament.ornamentContainer === undefined) {
            return;
        }
        var baseNote = this.notes[0];
        var baselength = baseNote.calculateNoteLengthWithoutTie();
        var baseVoice = voiceEntryWithOrnament.ParentVoice;
        var baseTimestamp = voiceEntryWithOrnament.Timestamp;
        var currentTimestamp = fraction_1.Fraction.createFromFraction(baseTimestamp);
        //let length: Fraction;
        switch (voiceEntryWithOrnament.ornamentContainer.GetOrnament) {
            case OrnamentContainer_1.OrnamentEnum.Trill:
                {
                    var length_1 = new fraction_1.Fraction(baselength.Numerator, baselength.Denominator * 8);
                    var higherPitch = baseNote.Pitch.getTransposedPitch(1);
                    var alteration = activeKey.getAlterationForPitch(higherPitch);
                    if (voiceEntryWithOrnament.OrnamentContainer.AccidentalAbove !== pitch_2.AccidentalEnum.NONE) {
                        alteration = voiceEntryWithOrnament.ornamentContainer.AccidentalAbove;
                    }
                    for (var i = 0; i < 8; i++) {
                        currentTimestamp = fraction_1.Fraction.plus(baseTimestamp, new fraction_1.Fraction(i * length_1.Numerator, length_1.Denominator));
                        if ((i % 2) === 0) {
                            this.createBaseVoiceEntry(currentTimestamp, length_1, baseVoice, baseNote, voiceEntries);
                        }
                        else {
                            this.createAlteratedVoiceEntry(currentTimestamp, length_1, baseVoice, higherPitch, alteration, voiceEntries);
                        }
                    }
                }
                break;
            case OrnamentContainer_1.OrnamentEnum.Turn:
                {
                    var length_2 = new fraction_1.Fraction(baselength.Numerator, baselength.Denominator * 4);
                    var lowerPitch = baseNote.Pitch.getTransposedPitch(-1);
                    var lowerAlteration = activeKey.getAlterationForPitch(lowerPitch);
                    var higherPitch = baseNote.Pitch.getTransposedPitch(1);
                    var higherAlteration = activeKey.getAlterationForPitch(higherPitch);
                    this.createAlteratedVoiceEntry(currentTimestamp, length_2, baseVoice, higherPitch, higherAlteration, voiceEntries);
                    currentTimestamp.Add(length_2);
                    this.createBaseVoiceEntry(currentTimestamp, length_2, baseVoice, baseNote, voiceEntries);
                    currentTimestamp.Add(length_2);
                    this.createAlteratedVoiceEntry(currentTimestamp, length_2, baseVoice, lowerPitch, lowerAlteration, voiceEntries);
                    currentTimestamp.Add(length_2);
                    this.createBaseVoiceEntry(currentTimestamp, length_2, baseVoice, baseNote, voiceEntries);
                }
                break;
            case OrnamentContainer_1.OrnamentEnum.InvertedTurn:
                {
                    var length_3 = new fraction_1.Fraction(baselength.Numerator, baselength.Denominator * 4);
                    var lowerPitch = baseNote.Pitch.getTransposedPitch(-1);
                    var lowerAlteration = activeKey.getAlterationForPitch(lowerPitch);
                    var higherPitch = baseNote.Pitch.getTransposedPitch(1);
                    var higherAlteration = activeKey.getAlterationForPitch(higherPitch);
                    this.createAlteratedVoiceEntry(currentTimestamp, length_3, baseVoice, lowerPitch, lowerAlteration, voiceEntries);
                    currentTimestamp.Add(length_3);
                    this.createBaseVoiceEntry(currentTimestamp, length_3, baseVoice, baseNote, voiceEntries);
                    currentTimestamp.Add(length_3);
                    this.createAlteratedVoiceEntry(currentTimestamp, length_3, baseVoice, higherPitch, higherAlteration, voiceEntries);
                    currentTimestamp.Add(length_3);
                    this.createBaseVoiceEntry(currentTimestamp, length_3, baseVoice, baseNote, voiceEntries);
                }
                break;
            case OrnamentContainer_1.OrnamentEnum.DelayedTurn:
                {
                    var length_4 = new fraction_1.Fraction(baselength.Numerator, baselength.Denominator * 2);
                    var lowerPitch = baseNote.Pitch.getTransposedPitch(-1);
                    var lowerAlteration = activeKey.getAlterationForPitch(lowerPitch);
                    var higherPitch = baseNote.Pitch.getTransposedPitch(1);
                    var higherAlteration = activeKey.getAlterationForPitch(higherPitch);
                    this.createBaseVoiceEntry(currentTimestamp, length_4, baseVoice, baseNote, voiceEntries);
                    currentTimestamp = fraction_1.Fraction.plus(baseTimestamp, length_4);
                    length_4.Denominator = baselength.Denominator * 8;
                    this.createAlteratedVoiceEntry(currentTimestamp, length_4, baseVoice, higherPitch, higherAlteration, voiceEntries);
                    currentTimestamp.Add(length_4);
                    this.createBaseVoiceEntry(currentTimestamp, length_4, baseVoice, baseNote, voiceEntries);
                    currentTimestamp.Add(length_4);
                    this.createAlteratedVoiceEntry(currentTimestamp, length_4, baseVoice, lowerPitch, lowerAlteration, voiceEntries);
                    currentTimestamp.Add(length_4);
                    this.createBaseVoiceEntry(currentTimestamp, length_4, baseVoice, baseNote, voiceEntries);
                }
                break;
            case OrnamentContainer_1.OrnamentEnum.DelayedInvertedTurn:
                {
                    var length_5 = new fraction_1.Fraction(baselength.Numerator, baselength.Denominator * 2);
                    var lowerPitch = baseNote.Pitch.getTransposedPitch(-1);
                    var lowerAlteration = activeKey.getAlterationForPitch(lowerPitch);
                    var higherPitch = baseNote.Pitch.getTransposedPitch(1);
                    var higherAlteration = activeKey.getAlterationForPitch(higherPitch);
                    this.createBaseVoiceEntry(currentTimestamp, length_5, baseVoice, baseNote, voiceEntries);
                    currentTimestamp = fraction_1.Fraction.plus(baseTimestamp, length_5);
                    length_5.Denominator = baselength.Denominator * 8;
                    this.createAlteratedVoiceEntry(currentTimestamp, length_5, baseVoice, lowerPitch, lowerAlteration, voiceEntries);
                    currentTimestamp.Add(length_5);
                    this.createBaseVoiceEntry(currentTimestamp, length_5, baseVoice, baseNote, voiceEntries);
                    currentTimestamp.Add(length_5);
                    this.createAlteratedVoiceEntry(currentTimestamp, length_5, baseVoice, higherPitch, higherAlteration, voiceEntries);
                    currentTimestamp.Add(length_5);
                    this.createBaseVoiceEntry(currentTimestamp, length_5, baseVoice, baseNote, voiceEntries);
                }
                break;
            case OrnamentContainer_1.OrnamentEnum.Mordent:
                {
                    var length_6 = new fraction_1.Fraction(baselength.Numerator, baselength.Denominator * 4);
                    var higherPitch = baseNote.Pitch.getTransposedPitch(1);
                    var alteration = activeKey.getAlterationForPitch(higherPitch);
                    this.createBaseVoiceEntry(currentTimestamp, length_6, baseVoice, baseNote, voiceEntries);
                    currentTimestamp.Add(length_6);
                    this.createAlteratedVoiceEntry(currentTimestamp, length_6, baseVoice, higherPitch, alteration, voiceEntries);
                    length_6.Denominator = baselength.Denominator * 2;
                    currentTimestamp = fraction_1.Fraction.plus(baseTimestamp, length_6);
                    this.createBaseVoiceEntry(currentTimestamp, length_6, baseVoice, baseNote, voiceEntries);
                }
                break;
            case OrnamentContainer_1.OrnamentEnum.InvertedMordent:
                {
                    var length_7 = new fraction_1.Fraction(baselength.Numerator, baselength.Denominator * 4);
                    var lowerPitch = baseNote.Pitch.getTransposedPitch(-1);
                    var alteration = activeKey.getAlterationForPitch(lowerPitch);
                    this.createBaseVoiceEntry(currentTimestamp, length_7, baseVoice, baseNote, voiceEntries);
                    currentTimestamp.Add(length_7);
                    this.createAlteratedVoiceEntry(currentTimestamp, length_7, baseVoice, lowerPitch, alteration, voiceEntries);
                    length_7.Denominator = baselength.Denominator * 2;
                    currentTimestamp = fraction_1.Fraction.plus(baseTimestamp, length_7);
                    this.createBaseVoiceEntry(currentTimestamp, length_7, baseVoice, baseNote, voiceEntries);
                }
                break;
            default:
                throw new RangeError();
        }
        return voiceEntries;
    };
    VoiceEntry.prototype.createBaseVoiceEntry = function (currentTimestamp, length, baseVoice, baseNote, voiceEntries) {
        var voiceEntry = new VoiceEntry(currentTimestamp, baseVoice, baseNote.ParentStaffEntry);
        var pitch = new pitch_1.Pitch(baseNote.Pitch.FundamentalNote, baseNote.Pitch.Octave, baseNote.Pitch.Accidental);
        var note = new Note_1.Note(voiceEntry, undefined, length, pitch);
        voiceEntry.Notes.push(note);
        voiceEntries.push(voiceEntry);
    };
    VoiceEntry.prototype.createAlteratedVoiceEntry = function (currentTimestamp, length, baseVoice, higherPitch, alteration, voiceEntries) {
        var voiceEntry = new VoiceEntry(currentTimestamp, baseVoice, undefined);
        var pitch = new pitch_1.Pitch(higherPitch.FundamentalNote, higherPitch.Octave, alteration);
        var note = new Note_1.Note(voiceEntry, undefined, length, pitch);
        voiceEntry.Notes.push(note);
        voiceEntries.push(voiceEntry);
    };
    return VoiceEntry;
}());
exports.VoiceEntry = VoiceEntry;
(function (ArticulationEnum) {
    ArticulationEnum[ArticulationEnum["accent"] = 0] = "accent";
    ArticulationEnum[ArticulationEnum["strongaccent"] = 1] = "strongaccent";
    ArticulationEnum[ArticulationEnum["invertedstrongaccent"] = 2] = "invertedstrongaccent";
    ArticulationEnum[ArticulationEnum["staccato"] = 3] = "staccato";
    ArticulationEnum[ArticulationEnum["staccatissimo"] = 4] = "staccatissimo";
    ArticulationEnum[ArticulationEnum["spiccato"] = 5] = "spiccato";
    ArticulationEnum[ArticulationEnum["tenuto"] = 6] = "tenuto";
    ArticulationEnum[ArticulationEnum["fermata"] = 7] = "fermata";
    ArticulationEnum[ArticulationEnum["invertedfermata"] = 8] = "invertedfermata";
    ArticulationEnum[ArticulationEnum["breathmark"] = 9] = "breathmark";
    ArticulationEnum[ArticulationEnum["caesura"] = 10] = "caesura";
    ArticulationEnum[ArticulationEnum["lefthandpizzicato"] = 11] = "lefthandpizzicato";
    ArticulationEnum[ArticulationEnum["naturalharmonic"] = 12] = "naturalharmonic";
    ArticulationEnum[ArticulationEnum["snappizzicato"] = 13] = "snappizzicato";
    ArticulationEnum[ArticulationEnum["upbow"] = 14] = "upbow";
    ArticulationEnum[ArticulationEnum["downbow"] = 15] = "downbow";
    ArticulationEnum[ArticulationEnum["scoop"] = 16] = "scoop";
    ArticulationEnum[ArticulationEnum["plop"] = 17] = "plop";
    ArticulationEnum[ArticulationEnum["doit"] = 18] = "doit";
    ArticulationEnum[ArticulationEnum["falloff"] = 19] = "falloff";
    ArticulationEnum[ArticulationEnum["stress"] = 20] = "stress";
    ArticulationEnum[ArticulationEnum["unstress"] = 21] = "unstress";
    ArticulationEnum[ArticulationEnum["detachedlegato"] = 22] = "detachedlegato";
    ArticulationEnum[ArticulationEnum["otherarticulation"] = 23] = "otherarticulation";
})(exports.ArticulationEnum || (exports.ArticulationEnum = {}));
var ArticulationEnum = exports.ArticulationEnum;
