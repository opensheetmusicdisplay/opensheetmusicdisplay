import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {BoundingBox} from "./BoundingBox";
import {Fraction} from "../../Common/DataObjects/fraction";
import {VerticalGraphicalStaffEntryContainer} from "./VerticalGraphicalStaffEntryContainer";
import {Note} from "../VoiceData/Note";
import {Slur} from "../VoiceData/Expressions/ContinuousExpressions/Slur";
import {Voice} from "../VoiceData/Voice";
import {VoiceEntry} from "../VoiceData/VoiceEntry";
import {LinkedVoice} from "../VoiceData/LinkedVoice";
import {GraphicalTie} from "./GraphicalTie";
import {GraphicalObject} from "./GraphicalObject";
import {StaffMeasure} from "./StaffMeasure";
import {GraphicalNote} from "./GraphicalNote";
import {GraphicalChordSymbolContainer} from "./GraphicalChordSymbolContainer";
import {GraphicalLyricEntry} from "./GraphicalLyricEntry";
import {AbstractGraphicalInstruction} from "./AbstractGraphicalInstruction";
import {GraphicalStaffEntryLink} from "./GraphicalStaffEntryLink";
export class GraphicalStaffEntry extends GraphicalObject {
    private graphicalInstructions: AbstractGraphicalInstruction[] = [];
    private graphicalTies: GraphicalTie[] = [];
    private lyricsEntries: GraphicalLyricEntry[] = [];
    constructor(parentMeasure: StaffMeasure, sourceStaffEntry: SourceStaffEntry = undefined, staffEntryParent: GraphicalStaffEntry = undefined) {
        this.ParentMeasure = parentMeasure;
        this.Notes = [];
        this.GraceStaffEntriesBefore = [];
        this.GraceStaffEntriesAfter = [];
        this.SourceStaffEntry = sourceStaffEntry;
        if (staffEntryParent !== undefined) {
            this.StaffEntryParent = staffEntryParent;
            this.ParentVerticalContainer = staffEntryParent.ParentVerticalContainer;
            this.PositionAndShape = new BoundingBox(staffEntryParent.PositionAndShape, this);
        } else this.PositionAndShape = new BoundingBox(parentMeasure.PositionAndShape, this);
        if (sourceStaffEntry !== undefined)
            this.RelInMeasureTimestamp = sourceStaffEntry.Timestamp;
    }
    public GraphicalChordContainer: GraphicalChordSymbolContainer;
    public GraphicalLink: GraphicalStaffEntryLink;
    public RelInMeasureTimestamp: Fraction;
    public SourceStaffEntry: SourceStaffEntry;
    public ParentMeasure: StaffMeasure;
    public Notes: GraphicalNote[][];
    public GraceStaffEntriesBefore: GraphicalStaffEntry[];
    public GraceStaffEntriesAfter: GraphicalStaffEntry[];
    public StaffEntryParent: GraphicalStaffEntry;
    public ParentVerticalContainer: VerticalGraphicalStaffEntryContainer;
    public get GraphicalInstructions(): AbstractGraphicalInstruction[] {
        return this.graphicalInstructions;
    }
    public get GraphicalTies(): GraphicalTie[] {
        return this.graphicalTies;
    }
    public get LyricsEntries(): GraphicalLyricEntry[] {
        return this.lyricsEntries;
    }
    public getAbsoluteTimestamp(): Fraction {
        let result: Fraction = Fraction.CreateFractionFromFraction(this.ParentMeasure.ParentSourceMeasure.AbsoluteTimestamp);
        if (this.RelInMeasureTimestamp !== undefined)
            result += this.RelInMeasureTimestamp;
        return result;
    }
    public findEndTieGraphicalNoteFromNote(tieNote: Note): GraphicalNote {
        for (let idx: number = 0, len: number = this.Notes.length; idx < len; ++idx) {
            let graphicalNotes: GraphicalNote[] = this.Notes[idx];
            for (let idx2: number = 0, len2: number = graphicalNotes.length; idx2 < len2; ++idx2) {
                let graphicalNote: GraphicalNote = graphicalNotes[idx2];
                let note: Note = graphicalNote.SourceNote;
                if (note.Pitch !== undefined && note.Pitch.FundamentalNote === tieNote.Pitch.FundamentalNote && note.Pitch.Octave === tieNote.Pitch.Octave && note.getAbsoluteTimestamp() === tieNote.getAbsoluteTimestamp())
                    return graphicalNote;
            }
        }
        return undefined;
    }
    public findEndTieGraphicalNoteFromNoteWithStartingSlur(tieNote: Note, slur: Slur): GraphicalNote {
        for (let idx: number = 0, len: number = this.Notes.length; idx < len; ++idx) {
            let graphicalNotes: GraphicalNote[] = this.Notes[idx];
            for (let idx2: number = 0, len2: number = graphicalNotes.length; idx2 < len2; ++idx2) {
                let graphicalNote: GraphicalNote = graphicalNotes[idx2];
                let note: Note = graphicalNote.SourceNote;
                if (note.NoteTie !== undefined && note.NoteSlurs.indexOf(slur) !== -1)
                    return graphicalNote;
            }
        }
        return undefined;
    }
    public findEndTieGraphicalNoteFromNoteWithEndingSlur(tieNote: Note): GraphicalNote {
        for (let idx: number = 0, len: number = this.Notes.length; idx < len; ++idx) {
            let graphicalNotes: GraphicalNote[] = this.Notes[idx];
            for (let idx2: number = 0, len2: number = graphicalNotes.length; idx2 < len2; ++idx2) {
                let graphicalNote: GraphicalNote = graphicalNotes[idx2];
                let note: Note = graphicalNote.SourceNote;
                if (note.Pitch !== undefined && note.Pitch.FundamentalNote === tieNote.Pitch.FundamentalNote && note.Pitch.Octave === tieNote.Pitch.Octave && this.getAbsoluteTimestamp() === tieNote.getAbsoluteTimestamp())
                    return graphicalNote;
            }
        }
        return undefined;
    }
    public findGraphicalNoteFromGraceNote(graceNote: Note): GraphicalNote {
        for (let idx: number = 0, len: number = this.Notes.length; idx < len; ++idx) {
            let graphicalNotes: GraphicalNote[] = this.Notes[idx];
            for (let idx2: number = 0, len2: number = graphicalNotes.length; idx2 < len2; ++idx2) {
                let graphicalNote: GraphicalNote = graphicalNotes[idx2];
                if (graphicalNote.SourceNote === graceNote)
                    return graphicalNote;
            }
        }
        return undefined;
    }
    public findGraphicalNoteFromNote(baseNote: Note): GraphicalNote {
        for (let idx: number = 0, len: number = this.Notes.length; idx < len; ++idx) {
            let graphicalNotes: GraphicalNote[] = this.Notes[idx];
            for (let idx2: number = 0, len2: number = graphicalNotes.length; idx2 < len2; ++idx2) {
                let graphicalNote: GraphicalNote = graphicalNotes[idx2];
                if (graphicalNote.SourceNote === baseNote && this.getAbsoluteTimestamp() === baseNote.getAbsoluteTimestamp())
                    return graphicalNote;
            }
        }
        return undefined;
    }
    public getGraphicalNoteDurationFromVoice(voice: Voice): Fraction {
        for (let idx: number = 0, len: number = this.Notes.length; idx < len; ++idx) {
            let graphicalNotes: GraphicalNote[] = this.Notes[idx];
            if (graphicalNotes[0].SourceNote.ParentVoiceEntry.ParentVoice === voice)
                return graphicalNotes[0].GraphicalNoteLength;
        }
        return new Fraction(0, 1);
    }
    public findLinkedNotes(notLinkedNotes: GraphicalNote[]): void {
        if (this.SourceStaffEntry !== undefined && this.SourceStaffEntry.Link !== undefined) {
            for (let idx: number = 0, len: number = this.Notes.length; idx < len; ++idx) {
                let graphicalNotes: GraphicalNote[] = this.Notes[idx];
                for (let idx2: number = 0, len2: number = graphicalNotes.length; idx2 < len2; ++idx2) {
                    let graphicalNote: GraphicalNote = graphicalNotes[idx2];
                    if (graphicalNote.ParentStaffEntry === this)
                        notLinkedNotes.push(graphicalNote);
                }
            }
        }
    }
    public findVoiceEntryGraphicalNotes(voiceEntry: VoiceEntry): GraphicalNote[] {
        for (let idx: number = 0, len: number = this.Notes.length; idx < len; ++idx) {
            let graphicalNotes: GraphicalNote[] = this.Notes[idx];
            for (let idx2: number = 0, len2: number = graphicalNotes.length; idx2 < len2; ++idx2) {
                let graphicalNote: GraphicalNote = graphicalNotes[idx2];
                if (graphicalNote.SourceNote.ParentVoiceEntry === voiceEntry)
                    return graphicalNotes;
            }
        }
        return undefined;
    }
    public isVoiceEntryPartOfLinkedVoiceEntry(voiceEntry: VoiceEntry): boolean {
        if (this.SourceStaffEntry.Link !== undefined) {
            for (let idx: number = 0, len: number = this.SourceStaffEntry.Link.LinkStaffEntries.length; idx < len; ++idx) {
                let sEntry: SourceStaffEntry = this.SourceStaffEntry.Link.LinkStaffEntries[idx];
                if (sEntry.VoiceEntries.indexOf(voiceEntry) !== -1 && sEntry !== this.SourceStaffEntry)
                    return true;
            }
        }
        return false;
    }
    public getMainVoice(): Voice {
        for (let idx: number = 0, len: number = this.SourceStaffEntry.VoiceEntries.length; idx < len; ++idx) {
            let voiceEntry: VoiceEntry = this.SourceStaffEntry.VoiceEntries[idx];
            if (voiceEntry.ParentVoice.GetType() !== /*typeof*/LinkedVoice)
                return voiceEntry.ParentVoice;
        }
        return this.Notes[0][0].SourceNote.ParentVoiceEntry.ParentVoice;
    }
    public findStaffEntryMinNoteLength(): Fraction {
        let minLength: Fraction = new Fraction(Number.MAX_VALUE, 1);
        for (let idx: number = 0, len: number = this.Notes.length; idx < len; ++idx) {
            let graphicalNotes: GraphicalNote[] = this.Notes[idx];
            for (let idx2: number = 0, len2: number = graphicalNotes.length; idx2 < len2; ++idx2) {
                let graphicalNote: GraphicalNote = graphicalNotes[idx2];
                let calNoteLen: Fraction = graphicalNote.GraphicalNoteLength;
                if (calNoteLen < minLength && calNoteLen.Numerator > 0)
                    minLength = calNoteLen;
            }
        }
        return minLength;
    }
    public findStaffEntryMaxNoteLength(): Fraction {
        let maxLength: Fraction = new Fraction(0, 1);
        for (let idx: number = 0, len: number = this.Notes.length; idx < len; ++idx) {
            let graphicalNotes: GraphicalNote[] = this.Notes[idx];
            for (let idx2: number = 0, len2: number = graphicalNotes.length; idx2 < len2; ++idx2) {
                let graphicalNote: GraphicalNote = graphicalNotes[idx2];
                let calNoteLen: Fraction = graphicalNote.GraphicalNoteLength;
                if (calNoteLen > maxLength && calNoteLen.Numerator > 0)
                    maxLength = calNoteLen;
            }
        }
        return maxLength;
    }
    public findOrCreateGraphicalNotesListFromVoiceEntry(voiceEntry: VoiceEntry): GraphicalNote[] {
        let graphicalNotes: GraphicalNote[];
        if (this.Notes.length === 0) {
            graphicalNotes = [];
            this.Notes.push(graphicalNotes);
        } else {
            for (let i: number = 0; i < this.Notes.length; i++) {
                if (this.Notes[i][0].SourceNote.ParentVoiceEntry.ParentVoice === voiceEntry.ParentVoice)
                    return this.Notes[i];
            }
            graphicalNotes = [];
            this.Notes.push(graphicalNotes);
        }
        return graphicalNotes;
    }
    public findOrCreateGraphicalNotesListFromGraphicalNote(graphicalNote: GraphicalNote): GraphicalNote[] {
        let graphicalNotes: GraphicalNote[];
        let tieStartSourceStaffEntry: SourceStaffEntry = graphicalNote.SourceNote.ParentStaffEntry;
        if (this.SourceStaffEntry !== tieStartSourceStaffEntry)
            graphicalNotes = this.findOrCreateGraphicalNotesListFromVoiceEntry(graphicalNote.SourceNote.ParentVoiceEntry);
        else {
            if (this.Notes.length === 0) {
                graphicalNotes = [];
                this.Notes.push(graphicalNotes);
            } else {
                for (let i: number = 0; i < this.Notes.length; i++) {
                    if (this.Notes[i][0].SourceNote.ParentVoiceEntry.ParentVoice === graphicalNote.SourceNote.ParentVoiceEntry.ParentVoice) {
                        return this.Notes[i];
                    }
                }
                graphicalNotes = [];
                this.Notes.push(graphicalNotes);
            }
        }
        return graphicalNotes;
    }
    public addGraphicalNoteToListAtCorrectYPosition(graphicalNotes: GraphicalNote[], graphicalNote: GraphicalNote): void {
        if (graphicalNotes.length === 0 || graphicalNote.PositionAndShape.RelativePosition.Y < graphicalNotes.Last().PositionAndShape.RelativePosition.Y)
            graphicalNotes.push(graphicalNote);
        else {
            for (let i: number = graphicalNotes.length - 1; i >= 0; i--) {
                if (graphicalNotes[i].PositionAndShape.RelativePosition.Y > graphicalNote.PositionAndShape.RelativePosition.Y) {
                    graphicalNotes.splice(i + 1, 0, graphicalNote);
                    break;
                }
                if (i === 0) {
                    graphicalNotes.splice(0, 0, graphicalNote);
                    break;
                }
            }
        }
    }
}