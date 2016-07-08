import { VoiceEntry } from "./VoiceEntry";
import { SourceStaffEntry } from "./SourceStaffEntry";
import { Fraction } from "../../Common/DataObjects/fraction";
import { Pitch } from "../../Common/DataObjects/pitch";
import { Beam } from "./Beam";
import { Tuplet } from "./Tuplet";
import { Tie } from "./Tie";
import { Staff } from "./Staff";
import { Slur } from "./Expressions/ContinuousExpressions/Slur";
import { NoteState } from "../Graphical/DrawingEnums";
export declare class Note {
    constructor(voiceEntry: VoiceEntry, parentStaffEntry: SourceStaffEntry, length: Fraction, pitch: Pitch);
    halfTone: number;
    state: NoteState;
    private voiceEntry;
    private parentStaffEntry;
    private length;
    private pitch;
    private beam;
    private tuplet;
    private tie;
    private slurs;
    private graceNoteSlash;
    private playbackInstrumentId;
    GraceNoteSlash: boolean;
    ParentVoiceEntry: VoiceEntry;
    ParentStaffEntry: SourceStaffEntry;
    ParentStaff: Staff;
    Length: Fraction;
    Pitch: Pitch;
    NoteBeam: Beam;
    NoteTuplet: Tuplet;
    NoteTie: Tie;
    NoteSlurs: Slur[];
    PlaybackInstrumentId: string;
    calculateNoteLengthWithoutTie(): Fraction;
    calculateNoteOriginalLength(originalLength?: Fraction): Fraction;
    calculateNoteLengthWithDots(): Fraction;
    calculateNumberOfNeededDots(fraction?: Fraction): number;
    ToString(): string;
    getAbsoluteTimestamp(): Fraction;
    checkForDoubleSlur(slur: Slur): boolean;
}
export declare enum Appearance {
    Normal = 0,
    Grace = 1,
    Cue = 2,
}
