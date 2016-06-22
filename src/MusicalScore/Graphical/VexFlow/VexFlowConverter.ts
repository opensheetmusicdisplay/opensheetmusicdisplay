import {ClefEnum} from "../../VoiceData/Instructions/ClefInstruction";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {VoiceEntry} from "../../VoiceData/VoiceEntry";
import {Pitch} from "../../../Common/DataObjects/pitch";
import {Fraction} from "../../../Common/DataObjects/fraction";
import {RhythmInstruction} from "../../VoiceData/Instructions/RhythmInstruction";
import {RhythmSymbolEnum} from "../../VoiceData/Instructions/RhythmInstruction";
import {KeyInstruction} from "../../VoiceData/Instructions/KeyInstruction";
import {KeyEnum} from "../../VoiceData/Instructions/KeyInstruction";
import {AccidentalEnum} from "../../../Common/DataObjects/pitch";
import {NoteEnum} from "../../../Common/DataObjects/pitch";

import Vex = require("vexflow");

export class VexFlowConverter {
    private static majorMap: {[_: number]: string; } = {
        "0": "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#", 7: "C#",
        8: "G#", "-1": "F", "-8": "Fb", "-7": "Cb", "-6": "Gb", "-5": "Db", "-4": "Ab", "-3": "Eb", "-2": "Bb",
    };
    private static minorMap: {[_: number]: string; } = {
        "1": "E", "7": "A#", "0": "A", "6": "D#", "3": "F#", "-5": "Bb", "-4": "F", "-7": "Ab", "-6": "Eb",
        "-1": "D", "4": "C#", "-3": "C", "-2": "G", "2": "B", "5": "G#", "-8": "Db", "8": "E#",
    };

    public static duration(fraction: Fraction): string {
        // FIXME TODO
        return "q";
    }

    /**
     * Takes a Pitch and returns a string representing a VexFlow pitch,
     * which has the form "b/4", plus its alteration (accidental)
     * @param pitch
     * @returns {string[]}
     */
    public static pitch(pitch: Pitch): [string, string] {
        let fund: string = NoteEnum[pitch.FundamentalNote].toLowerCase();
        let octave: number = pitch.Octave;
        let acc: string = "";

        switch (pitch.Accidental) {
            case AccidentalEnum.NONE:
                break;
            case AccidentalEnum.FLAT:
                acc = "b";
                break;
            case AccidentalEnum.SHARP:
                acc = "#";
                break;
            case AccidentalEnum.DOUBLESHARP:
                acc = "##";
                break;
            case AccidentalEnum.DOUBLEFLAT:
                acc = "bb";
                break;
            default:
        }
        return [fund + acc + "/" + octave, acc];
    }

    public static StaveNote(voiceEntry: VoiceEntry): Vex.Flow.StaveNote {
        let keys: string[] = [];
        let duration: string = VexFlowConverter.duration(voiceEntry.Notes[0].Length);
        let accidentals: string[] = [];
        for (let note of voiceEntry.Notes) {
            let res: [string, string] = VexFlowConverter.pitch(note.Pitch);
            keys.push(res[0]);
            accidentals.push(res[1]);
        }
        let vfnote: Vex.Flow.StaveNote = new Vex.Flow.StaveNote({
            duration: duration,
            keys: keys,
        });
        for (let i: number = 0, len: number = keys.length; i < len; i += 1) {
            let acc: string = accidentals[i];
            if (acc) {
                vfnote.addAccidental(i, new Vex.Flow.Accidental(acc));
            }
        }
        return vfnote;
    }

    public static Clef(clef: ClefInstruction): string {
        let type: string;
        switch (clef.ClefType) {
            case ClefEnum.G:
                type = "treble";
                break;
            case ClefEnum.F:
                type = "bass";
                break;
            case ClefEnum.C:
                type = "baritone-c";
                break;
            case ClefEnum.percussion:
                type = "percussion";
                break;
            case ClefEnum.TAB:
                type = "tab";
                break;
            default:
        }
        return type;
    }

    public static TimeSignature(rhythm: RhythmInstruction): Vex.Flow.TimeSignature {
        let timeSpec: string;
        switch (rhythm.SymbolEnum) {
            case RhythmSymbolEnum.NONE:
                timeSpec = rhythm.Rhythm.Numerator + "/" + rhythm.Rhythm.Denominator;
                break;
            case RhythmSymbolEnum.COMMON:
                timeSpec = "C";
                break;
            case RhythmSymbolEnum.CUT:
                timeSpec = "C|";
                break;
            default:
        }
        return new Vex.Flow.TimeSignature(timeSpec);
    }

    public static keySignature(key: KeyInstruction): string {
        if (key === undefined) {
            return undefined;
        }
        switch (key.Mode) {
            case KeyEnum.none:
                return undefined;
            case KeyEnum.minor:
                return VexFlowConverter.minorMap[key.Key];
            case KeyEnum.major:
                return VexFlowConverter.majorMap[key.Key] + "m";
            default:
        }
    }
}
