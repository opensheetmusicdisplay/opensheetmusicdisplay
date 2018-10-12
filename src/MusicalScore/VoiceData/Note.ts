import {VoiceEntry, StemDirectionType} from "./VoiceEntry";
import {SourceStaffEntry} from "./SourceStaffEntry";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {Pitch} from "../../Common/DataObjects/Pitch";
import {Beam} from "./Beam";
import {Tuplet} from "./Tuplet";
import {Tie} from "./Tie";
import {Staff} from "./Staff";
import {Slur} from "./Expressions/ContinuousExpressions/Slur";
import {NoteState} from "../Graphical/DrawingEnums";
import {NoteHead} from "./NoteHead";
import {Arpeggio} from "./Arpeggio";

/**
 * Represents a single pitch with a duration (length)
 */
export class Note {

    constructor(voiceEntry: VoiceEntry, parentStaffEntry: SourceStaffEntry, length: Fraction, pitch: Pitch) {
        this.voiceEntry = voiceEntry;
        this.parentStaffEntry = parentStaffEntry;
        this.length = length;
        this.pitch = pitch;
        if (pitch !== undefined) {
            this.halfTone = pitch.getHalfTone();
        } else {
          this.halfTone = 0;
        }
    }

    /**
     * The transposed (!!!) HalfTone of this note.
     */
    public halfTone: number;
    public state: NoteState;
    private voiceEntry: VoiceEntry;
    private parentStaffEntry: SourceStaffEntry;
    private length: Fraction;
    /**
     * The untransposed (!!!) source data.
     */
    private pitch: Pitch;
    private beam: Beam;
    private tuplet: Tuplet;
    private tie: Tie;
    private slurs: Slur[] = [];
    private playbackInstrumentId: string = undefined;
    private noteHead: NoteHead = undefined;
    /** States whether the note should be displayed. False if xmlNode.attribute("print-object").value = "no". */
    private printObject: boolean = true;
    /** The Arpeggio this note is part of. */
    private arpeggio: Arpeggio;
    /** States whether this is a cue note (Stichnote) (smaller size). */
    private isCueNote: boolean;
    /** The stem direction asked for in XML. Not necessarily final or wanted stem direction. */
    private stemDirectionXml: StemDirectionType;

    public get ParentVoiceEntry(): VoiceEntry {
        return this.voiceEntry;
    }
    public set ParentVoiceEntry(value: VoiceEntry) {
        this.voiceEntry = value;
    }
    public get ParentStaffEntry(): SourceStaffEntry {
        return this.parentStaffEntry;
    }
    public get ParentStaff(): Staff {
        return this.parentStaffEntry.ParentStaff;
    }
    public get Length(): Fraction {
        return this.length;
    }
    public set Length(value: Fraction) {
        this.length = value;
    }
    public get Pitch(): Pitch {
        return this.pitch;
    }
    public get NoteBeam(): Beam {
        return this.beam;
    }
    public set NoteBeam(value: Beam) {
        this.beam = value;
    }
    public get NoteTuplet(): Tuplet {
        return this.tuplet;
    }
    public set NoteTuplet(value: Tuplet) {
        this.tuplet = value;
    }
    public get NoteTie(): Tie {
        return this.tie;
    }
    public set NoteTie(value: Tie) {
        this.tie = value;
    }
    public get NoteSlurs(): Slur[] {
        return this.slurs;
    }
    public set NoteSlurs(value: Slur[]) {
        this.slurs = value;
    }
    public get PlaybackInstrumentId(): string {
        return this.playbackInstrumentId;
    }
    public set PlaybackInstrumentId(value: string) {
        this.playbackInstrumentId = value;
    }
    public set NoteHead(value: NoteHead) {
        this.noteHead = value;
    }
    public get NoteHead(): NoteHead {
        return this.noteHead;
    }
    public get PrintObject(): boolean {
        return this.printObject;
    }
    public set PrintObject(value: boolean) {
        this.printObject = value;
    }
    public get Arpeggio(): Arpeggio {
        return this.arpeggio;
    }
    public set Arpeggio(value: Arpeggio) {
        this.arpeggio = value;
    }
    public get IsCueNote(): boolean {
        return this.isCueNote;
    }
    public set IsCueNote(value: boolean) {
        this.isCueNote = value;
    }
    public get StemDirectionXml(): StemDirectionType {
        return this.stemDirectionXml;
    }
    public set StemDirectionXml(value: StemDirectionType) {
        this.stemDirectionXml = value;
    }

    public isRest(): boolean {
        return this.Pitch === undefined;
    }

    public ToString(): string {
        if (this.pitch !== undefined) {
            return this.Pitch.ToString() + ", length: " + this.length.toString();
        } else {
          return "rest note, length: " + this.length.toString();
        }
    }
    public getAbsoluteTimestamp(): Fraction {
        return Fraction.plus(
            this.voiceEntry.Timestamp,
            this.parentStaffEntry.VerticalContainerParent.ParentMeasure.AbsoluteTimestamp
        );
    }
    public checkForDoubleSlur(slur: Slur): boolean {
        for (let idx: number = 0, len: number = this.slurs.length; idx < len; ++idx) {
            const noteSlur: Slur = this.slurs[idx];
            if (
              noteSlur.StartNote !== undefined &&
              noteSlur.EndNote !== undefined &&
              slur.StartNote !== undefined &&
              slur.StartNote === noteSlur.StartNote &&
              noteSlur.EndNote === this
            ) { return true; }
        }
        return false;
    }
}

export enum Appearance {
    Normal,
    Grace,
    Cue
}
