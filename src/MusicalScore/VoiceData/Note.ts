import {VoiceEntry, StemDirectionType} from "./VoiceEntry";
import {SourceStaffEntry} from "./SourceStaffEntry";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {NoteEnum, Pitch} from "../../Common/DataObjects/Pitch";
import {Beam} from "./Beam";
import {Tuplet} from "./Tuplet";
import {Tie} from "./Tie";
import {Staff} from "./Staff";
import {Slur} from "./Expressions/ContinuousExpressions/Slur";
import {NoteState} from "../Graphical/DrawingEnums";
import {Notehead, NoteHeadShape} from "./Notehead";
import {Arpeggio} from "./Arpeggio";
import {NoteType} from "./NoteType";
import { SourceMeasure } from "./SourceMeasure";
import { TechnicalInstruction } from "./Instructions";
import { Glissando } from "../../MusicalScore/VoiceData/Glissando";

/**
 * Represents a single pitch with a duration (length)
 */
export class Note {

    constructor(voiceEntry: VoiceEntry, parentStaffEntry: SourceStaffEntry, length: Fraction, pitch: Pitch, sourceMeasure: SourceMeasure, isRest?: boolean) {
        this.voiceEntry = voiceEntry;
        this.parentStaffEntry = parentStaffEntry;
        this.length = length;
        this.pitch = pitch;
        this.sourceMeasure = sourceMeasure;
        this.isRestFlag = isRest ?? false;
        if (pitch) {
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
    private sourceMeasure: SourceMeasure;
    /** The length/duration given in the <type> tag. different from length for tuplets/tremolos. */
    private typeLength: Fraction;
    /** The NoteType given in the XML, e.g. quarter, which can be a normal quarter or tuplet quarter -> can have different length/fraction */
    private noteTypeXml: NoteType;
    public DotsXml: number;
    /** The amount of notes the tuplet of this note (if there is one) replaces. */
    private normalNotes: number;
    private isRestFlag: boolean;
    public IsWholeMeasureRest: boolean;
    /**
     * The untransposed (!!!) source data.
     */
    private pitch: Pitch;
    /** The transposed pitch, if the score is transposed, otherwise undefined. */
    public TransposedPitch: Pitch;
    public displayStepUnpitched: NoteEnum;
    public displayOctaveUnpitched: number;
    public get NoteAsString(): string {
        return this.pitch.toString();
    }
    private beam: Beam;
    private tuplet: Tuplet;
    private tie: Tie;
    private glissando: Glissando;
    private slurs: Slur[] = [];
    private playbackInstrumentId: string = undefined;
    private notehead: Notehead = undefined;
    /** Custom notehead vexflow code. E.g. "vb" = quarter, "v1d" = whole, "v53" = half, etc. - see tables.js
     * Set this before render() (e.g. after load, before first render).
     */
    public CustomNoteheadVFCode: string;
    /** States whether the note should be displayed. False if xmlNode.attribute("print-object").value = "no". */
    private printObject: boolean = true;
    /** The Arpeggio this note is part of. */
    private arpeggio: Arpeggio;
    /** States whether this is a cue note (Stichnote) (smaller size). */
    private isCueNote: boolean;
    public IsGraceNote: boolean;
    /** The stem direction asked for in XML. Not necessarily final or wanted stem direction. */
    private stemDirectionXml: StemDirectionType;
    /** Tremolo information for this note, e.g. the number of tremolo strokes (16th tremolo = 2 strokes),
     * or the TremoloBetweenNotes object for a tremolo between two notes.
     */
    public TremoloInfo: TremoloInfo;
    /** Color of the stem given in the XML Stem tag. RGB Hexadecimal, like #00FF00.
     * This is not used for rendering, which takes VoiceEntry.StemColor.
     * It is merely given in the note's stem element in XML and stored here for reference.
     * So, to read or change the stem color of a note, modify note.ParentVoiceEntry.StemColor.
     */
    private stemColorXml: string;
    /** Color of the notehead given in the XML Notehead tag. RGB Hexadecimal, like #00FF00.
     * This should not be changed, instead noteheadColor is used and modifiable for Rendering.
     * Needs to be stored here and not in Note.Notehead,
     * because Note.Notehead is undefined for normal Noteheads to save space and time.
     */
    private noteheadColorXml: string;
    /** Color of the notehead currently set/desired for next render. RGB Hexadecimal, like #00FF00.
     * Needs to be stored here and not in Note.Notehead,
     * because Note.Notehead is undefined for normal Noteheads to save space and time.
     */
    private noteheadColor: string;
    private noteheadColorCurrentlyRendered: string;
    public Fingering: TechnicalInstruction; // this is also stored in VoiceEntry.TechnicalInstructions
    public StringInstruction: TechnicalInstruction; // this is also stored in VoiceEntry.TechnicalInstructions
    // note that there is also TabNote.StringNumber, so we can't use that identifier here
    /** Used by GraphicalNote.FromNote(note) and osmd.rules.GNote(note) to get a GraphicalNote from a Note.
     *  Note that we don't want the data model (Note) to be dependent on the graphical implementation (GraphicalNote),
     *    and have (potentially circular) import dependencies of graphical parts, which also applies to other non-graphical classes.
     *    That's why we don't save a GraphicalNote reference directly in Note.
     */
    public NoteToGraphicalNoteObjectId: number; // used with EngravingRules.NoteToGraphicalNoteMap
    /** The xml:id attribute from the MusicXML <note> element, if present. */
    public xmlId?: string;

    public ToStringShort(octaveOffset: number = 0): string {
        if (!this.Pitch || this.isRest()) {
            return "rest"; // Pitch is undefined for rest notes
        }
        return this.Pitch?.ToStringShort(octaveOffset);
    }
    public get ToStringShortGet(): string {
        return this.ToStringShort(0);
    }
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
    public get SourceMeasure(): SourceMeasure {
        return this.sourceMeasure;
    }
    public get TypeLength(): Fraction {
        return this.typeLength;
    }
    public set TypeLength(value: Fraction) {
        this.typeLength = value;
    }
    public get NoteTypeXml(): NoteType {
        return this.noteTypeXml;
    }
    public set NoteTypeXml(value: NoteType) {
        this.noteTypeXml = value;
    }
    public get NormalNotes(): number {
        return this.normalNotes;
    }
    public set NormalNotes(value: number) {
        this.normalNotes = value;
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
    public set Notehead(value: Notehead) {
        this.notehead = value;
    }
    public get Notehead(): Notehead {
        return this.notehead;
    }
    public get NoteTuplet(): Tuplet {
        return this.tuplet;
    }
    public set NoteTuplet(value: Tuplet) {
        this.tuplet = value;
    }
    /** All tuplets this note is part of, from outermost to innermost (for nested tuplets). Usually a single tuplet.
     *  NoteTuplet stays the innermost one for backwards compatibility; this list adds the enclosing tuplet(s). */
    public NoteTuplets: Tuplet[] = [];
    public get NoteGlissando(): Glissando {
        return this.glissando;
    }
    public set NoteGlissando(value: Glissando) {
        this.glissando = value;
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
    public get PrintObject(): boolean {
        return this.printObject;
    }
    public set PrintObject(value: boolean) {
        this.printObject = value;
    }
    /** Whether this note's own notehead is hidden (e.g. print-object="no" or notehead "none") but there is a
     * visible note on the same staff line in another voice at the same staff entry - i.e. a unison whose visible
     * notehead this note shares. Used to keep such a note's beam and stem rendered (the stem still emanates from
     * the shared notehead and joins the beam) instead of dropping it. E.g. an eighth note sharing a notehead with
     * a dotted quarter in Beethoven's Moonlight Sonata 1st mvt. m.37 (test_unison_notehead_moonlight_sonata_measure37). */
    public sharesNoteheadWithVisibleUnisonNote(): boolean {
        if (this.printObject && this.notehead?.Shape !== NoteHeadShape.NONE) {
            return false; // this note's own notehead is visible, nothing to share
        }
        // Grace notes are ornaments before a main note, not a note sounding simultaneously - they share their
        // staff entry with that main note, so don't treat that as a unison (would falsely keep their stem).
        if (!this.pitch || !this.parentStaffEntry || this.voiceEntry?.IsGrace) {
            return false;
        }
        for (const otherVoiceEntry of this.parentStaffEntry.VoiceEntries) {
            if (otherVoiceEntry === this.voiceEntry || otherVoiceEntry.IsGrace) {
                continue;
            }
            for (const otherNote of otherVoiceEntry.Notes) {
                if (otherNote.printObject && otherNote.notehead?.Shape !== NoteHeadShape.NONE && otherNote.pitch &&
                    otherNote.pitch.FundamentalNote === this.pitch.FundamentalNote &&
                    otherNote.pitch.Octave === this.pitch.Octave) {
                    return true; // visible note on the same staff line in another voice
                }
            }
        }
        return false;
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
    public get TremoloStrokes(): number {
        return this.TremoloInfo?.tremoloStrokes;
    }
    public get StemColorXml(): string {
        return this.stemColorXml;
    }
    public set StemColorXml(value: string) {
        this.stemColorXml = value;
    }
    public get NoteheadColorXml(): string {
        return this.noteheadColorXml;
    }
    public set NoteheadColorXml(value: string) {
        this.noteheadColorXml = value;
    }
    /** The desired notehead color for the next render. */
    public get NoteheadColor(): string {
        return this.noteheadColor;
    }
    public set NoteheadColor(value: string) {
        this.noteheadColor = value;
    }
    public get NoteheadColorCurrentlyRendered(): string {
        return this.noteheadColorCurrentlyRendered;
    }
    public set NoteheadColorCurrentlyRendered(value: string) {
        this.noteheadColorCurrentlyRendered = value;
    }

    public isRest(): boolean {
        return this.isRestFlag;
    }

    /** Note: May be dangerous to use if ParentStaffEntry.VerticalContainerParent etc is not set.
     * better calculate this directly when you have access to the note's measure.
     * whole rest: length = measure length. (4/4 in a 4/4 time signature, 3/4 in a 3/4 time signature, 1/4 in a 1/4 time signature, etc.)
     */
    public isWholeRest(): boolean {
        return this.isRest() && this.Length.RealValue === this.sourceMeasure.ActiveTimeSignature.RealValue;
    }

    /** Whether the note fills the whole measure. */
    public isWholeMeasureNote(): boolean {
        return this.Length.RealValue === this.sourceMeasure.ActiveTimeSignature.RealValue;
    }

    public ToString(): string {
        if (this.pitch) {
            return this.Pitch.ToString() + ", length: " + this.length.toString();
        } else {
          return "rest note, length: " + this.length.toString();
        }
    }
    public getAbsoluteTimestamp(): Fraction {
        return Fraction.plus(
            this.voiceEntry.Timestamp,
            this.sourceMeasure.AbsoluteTimestamp
        );
    }
    public isDuplicateSlur(slur: Slur): boolean {
        for (let idx: number = 0, len: number = this.slurs.length; idx < len; ++idx) {
            const noteSlur: Slur = this.slurs[idx];
            if (
              noteSlur.StartNote !== undefined &&
              noteSlur.EndNote !== undefined &&
              slur.StartNote !== undefined &&
              slur.StartNote === noteSlur.StartNote &&
              noteSlur.EndNote === this &&
              slur.PlacementXml === noteSlur.PlacementXml
            ) { return true; }
        }
        return false;
    }
    public hasTabEffects(): boolean {
        return false; // override in TabNote
    }

    public computedSvgId(): string {
        const m: number = this.ParentStaffEntry.VerticalContainerParent.ParentMeasure.MeasureNumber;
        const s: number = this.ParentStaff.idInMusicSheet;
        const v: number = this.ParentVoiceEntry.ParentVoice.VoiceId;
        const i: number = this.ParentVoiceEntry.Notes.indexOf(this);
        return `note-${m}-${s}-${v}-${i}`;
    }
}

export enum Appearance {
    Normal,
    Grace,
    Cue
}

export interface TremoloInfo {
    /** Number of tremolo strokes (e.g. 16th tremolo = 2 strokes).
     * For a tremolo between notes, the number of strokes ("tremolo beams") drawn between the two notes. */
    tremoloStrokes: number;
    /** Buzz roll (type="unmeasured" in XML) */
    tremoloUnmeasured: boolean;
    /** Whether this note starts a tremolo between (two) notes (type="start" in XML). */
    tremoloBetweenNotesStart?: boolean;
    /** Whether this note stops/ends a tremolo between (two) notes (type="stop" in XML). */
    tremoloBetweenNotesStop?: boolean;
    /** The tremolo between (two) notes this note is part of, linking start and stop note.
     * This object is shared between the start note and the stop note,
     * set in VoiceGenerator.handleTremoloBetweenNotes(). */
    tremoloBetweenNotes?: TremoloBetweenNotes;
}

/** A tremolo between two notes, e.g. two alternating half notes with 3 strokes ("tremolo beams") between them,
 * often seen in orchestral string parts. (<tremolo type="start"> and type="stop" in MusicXML)
 * Note that for these tremolos, each note is notated with the full duration of the tremolo,
 * but only played for half of it (e.g. notated two half notes = tremolo over one half note duration),
 * so Note.TypeLength is twice the Note.Length here.
 * The strokes are drawn in VexFlowMusicSheetDrawer.drawTremolosBetweenNotes(). */
export interface TremoloBetweenNotes {
    /** Number of strokes ("tremolo beams") drawn between the two notes. */
    strokes: number;
    /** The first/left note of the tremolo. */
    startNote: Note;
    /** The second/right note of the tremolo. Undefined until the stop note is read. */
    stopNote: Note;
}
