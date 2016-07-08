"use strict";
var ClefInstruction_1 = require("./VoiceData/Instructions/ClefInstruction");
var SubInstrument = (function () {
    function SubInstrument(parentInstrument) {
        this.parentInstrument = parentInstrument;
        this.fixedKey = -1;
        this.name = this.parseMidiInstrument(this.parentInstrument.Name);
        this.midiInstrumentID = SubInstrument.midiInstrument[this.name];
        this.volume = 1.0;
    }
    Object.defineProperty(SubInstrument.prototype, "ParentInstrument", {
        get: function () {
            return this.parentInstrument;
        },
        enumerable: true,
        configurable: true
    });
    SubInstrument.isPianoInstrument = function (instrument) {
        return (instrument === ClefInstruction_1.MidiInstrument.Acoustic_Grand_Piano
            || instrument === ClefInstruction_1.MidiInstrument.Bright_Acoustic_Piano
            || instrument === ClefInstruction_1.MidiInstrument.Electric_Grand_Piano
            || instrument === ClefInstruction_1.MidiInstrument.Electric_Piano_1
            || instrument === ClefInstruction_1.MidiInstrument.Electric_Piano_2);
    };
    SubInstrument.prototype.setMidiInstrument = function (instrumentType) {
        this.midiInstrumentID = SubInstrument.midiInstrument[this.parseMidiInstrument(instrumentType)];
    };
    SubInstrument.prototype.parseMidiInstrument = function (instrumentType) {
        // FIXME: test this function
        try {
            if (instrumentType) {
                var tmpName = instrumentType.toLowerCase().trim();
                for (var key in SubInstrument.midiInstrument) {
                    if (tmpName.indexOf(key) !== -1) {
                        return key;
                    }
                }
            }
            if (this.parentInstrument.Name) {
                var tmpName = this.parentInstrument.Name.toLowerCase().trim();
                for (var key in SubInstrument.midiInstrument) {
                    if (tmpName.indexOf(key) !== -1) {
                        return key;
                    }
                }
            }
        }
        catch (e) {
            console.log("Error parsing MIDI Instrument. Default to Grand Piano."); // FIXME
        }
        return "unnamed";
    };
    SubInstrument.midiInstrument = {
        "cello": ClefInstruction_1.MidiInstrument.Cello,
        "violon-c": ClefInstruction_1.MidiInstrument.Cello,
        "contrabass": ClefInstruction_1.MidiInstrument.Contrabass,
        "kontrabass": ClefInstruction_1.MidiInstrument.Contrabass,
        "clarinet": ClefInstruction_1.MidiInstrument.Clarinet,
        "klarinette": ClefInstruction_1.MidiInstrument.Clarinet,
        "flute": ClefInstruction_1.MidiInstrument.Flute,
        "flöte": ClefInstruction_1.MidiInstrument.Flute,
        "frenchhorn": ClefInstruction_1.MidiInstrument.French_Horn,
        "guitar": ClefInstruction_1.MidiInstrument.Acoustic_Guitar_nylon,
        "gitarre": ClefInstruction_1.MidiInstrument.Acoustic_Guitar_nylon,
        "harp": ClefInstruction_1.MidiInstrument.Orchestral_Harp,
        "harfe": ClefInstruction_1.MidiInstrument.Orchestral_Harp,
        "oboe": ClefInstruction_1.MidiInstrument.Oboe,
        "organ": ClefInstruction_1.MidiInstrument.Church_Organ,
        "orgue": ClefInstruction_1.MidiInstrument.Church_Organ,
        "orgel": ClefInstruction_1.MidiInstrument.Church_Organ,
        "piano": ClefInstruction_1.MidiInstrument.Acoustic_Grand_Piano,
        "klavier": ClefInstruction_1.MidiInstrument.Acoustic_Grand_Piano,
        "piccolo": ClefInstruction_1.MidiInstrument.Piccolo,
        "strings": ClefInstruction_1.MidiInstrument.String_Ensemble_1,
        "streicher": ClefInstruction_1.MidiInstrument.String_Ensemble_1,
        "steeldrum": ClefInstruction_1.MidiInstrument.Steel_Drums,
        "trombone": ClefInstruction_1.MidiInstrument.Trombone,
        "posaune": ClefInstruction_1.MidiInstrument.Trombone,
        "brass": ClefInstruction_1.MidiInstrument.Trombone,
        "trumpet": ClefInstruction_1.MidiInstrument.Trumpet,
        "trompete": ClefInstruction_1.MidiInstrument.Trumpet,
        "tpt": ClefInstruction_1.MidiInstrument.Trumpet,
        "tuba": ClefInstruction_1.MidiInstrument.Tuba,
        "sax": ClefInstruction_1.MidiInstrument.Tenor_Sax,
        "viola": ClefInstruction_1.MidiInstrument.Viola,
        "bratsche": ClefInstruction_1.MidiInstrument.Viola,
        "violin": ClefInstruction_1.MidiInstrument.Violin,
        "violon.": ClefInstruction_1.MidiInstrument.Violin,
        "woodblock": ClefInstruction_1.MidiInstrument.Woodblock,
        "alt": ClefInstruction_1.MidiInstrument.Synth_Voice,
        "alto": ClefInstruction_1.MidiInstrument.Synth_Voice,
        "tenor": ClefInstruction_1.MidiInstrument.Synth_Voice,
        "bariton": ClefInstruction_1.MidiInstrument.Synth_Voice,
        "baritone": ClefInstruction_1.MidiInstrument.Synth_Voice,
        "bass": ClefInstruction_1.MidiInstrument.Synth_Voice,
        "sopran": ClefInstruction_1.MidiInstrument.Synth_Voice,
        "voice": ClefInstruction_1.MidiInstrument.Synth_Voice,
        "recorder": ClefInstruction_1.MidiInstrument.Recorder,
        "blockflöte": ClefInstruction_1.MidiInstrument.Recorder,
        "banjo": ClefInstruction_1.MidiInstrument.Banjo,
        "drums": ClefInstruction_1.MidiInstrument.Percussion,
        "percussion": ClefInstruction_1.MidiInstrument.Percussion,
        "schlagzeug": ClefInstruction_1.MidiInstrument.Percussion,
        "schlagwerk": ClefInstruction_1.MidiInstrument.Percussion,
        "unnamed": ClefInstruction_1.MidiInstrument.Acoustic_Grand_Piano,
    };
    return SubInstrument;
}());
exports.SubInstrument = SubInstrument;
