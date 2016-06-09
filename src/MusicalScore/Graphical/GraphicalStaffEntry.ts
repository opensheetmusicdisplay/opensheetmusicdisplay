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
export class GraphicalStaffEntry extends GraphicalObject {
    private graphicalInstructions: List<AbstractGraphicalInstruction> = new List<AbstractGraphicalInstruction>();
    private graphicalTies: List<GraphicalTie> = new List<GraphicalTie>();
    private lyricsEntries: List<GraphicalLyricEntry> = new List<GraphicalLyricEntry>();
    constructor(parentMeasure: StaffMeasure, sourceStaffEntry: SourceStaffEntry = null, staffEntryParent: GraphicalStaffEntry = null) {
        this.ParentMeasure = parentMeasure;
        this.Notes = new List<List<GraphicalNote>>();
        this.GraceStaffEntriesBefore = new List<GraphicalStaffEntry>();
        this.GraceStaffEntriesAfter = new List<GraphicalStaffEntry>();
        this.SourceStaffEntry = sourceStaffEntry;
        if (staffEntryParent != null) {
            this.StaffEntryParent = staffEntryParent;
            this.ParentVerticalContainer = staffEntryParent.ParentVerticalContainer;
            this.PositionAndShape = new BoundingBox(staffEntryParent.PositionAndShape, this);
        }
        else this.PositionAndShape = new BoundingBox(parentMeasure.PositionAndShape, this);
        if (sourceStaffEntry != null)
            this.RelInMeasureTimestamp = sourceStaffEntry.Timestamp;
    }
    public GraphicalChordContainer: GraphicalChordSymbolContainer;
    public GraphicalLink: GraphicalStaffEntryLink;
    public RelInMeasureTimestamp: Fraction;
    public SourceStaffEntry: SourceStaffEntry;
    public ParentMeasure: StaffMeasure;
    public Notes: List<List<GraphicalNote>>;
    public GraceStaffEntriesBefore: List<GraphicalStaffEntry>;
    public GraceStaffEntriesAfter: List<GraphicalStaffEntry>;
    public StaffEntryParent: GraphicalStaffEntry;
    public ParentVerticalContainer: VerticalGraphicalStaffEntryContainer;
    public get GraphicalInstructions(): List<AbstractGraphicalInstruction> {
        return this.graphicalInstructions;
    }
    public get GraphicalTies(): List<GraphicalTie> {
        return this.graphicalTies;
    }
    public get LyricsEntries(): List<GraphicalLyricEntry> {
        return this.lyricsEntries;
    }
    public getAbsoluteTimestamp(): Fraction {
        var result: Fraction = Fraction.CreateFractionFromFraction(this.ParentMeasure.ParentSourceMeasure.AbsoluteTimestamp);
        if (this.RelInMeasureTimestamp != null)
            result += this.RelInMeasureTimestamp;
        return result;
    }
    public findEndTieGraphicalNoteFromNote(tieNote: Note): GraphicalNote {
        for (var idx: number = 0, len = this.Notes.Count; idx < len; ++idx) {
            var graphicalNotes: List<GraphicalNote> = this.Notes[idx];
            for (var idx2: number = 0, len2 = graphicalNotes.Count; idx2 < len2; ++idx2) {
                var graphicalNote: GraphicalNote = graphicalNotes[idx2];
                var note: Note = graphicalNote.SourceNote;
                if (note.Pitch != null && note.Pitch.FundamentalNote == tieNote.Pitch.FundamentalNote && note.Pitch.Octave == tieNote.Pitch.Octave && note.getAbsoluteTimestamp() == tieNote.getAbsoluteTimestamp())
                    return graphicalNote;
            }
        }
        return null;
    }
    public findEndTieGraphicalNoteFromNoteWithStartingSlur(tieNote: Note, slur: Slur): GraphicalNote {
        for (var idx: number = 0, len = this.Notes.Count; idx < len; ++idx) {
            var graphicalNotes: List<GraphicalNote> = this.Notes[idx];
            for (var idx2: number = 0, len2 = graphicalNotes.Count; idx2 < len2; ++idx2) {
                var graphicalNote: GraphicalNote = graphicalNotes[idx2];
                var note: Note = graphicalNote.SourceNote;
                if (note.NoteTie != null && note.NoteSlurs.Contains(slur))
                    return graphicalNote;
            }
        }
        return null;
    }
    public findEndTieGraphicalNoteFromNoteWithEndingSlur(tieNote: Note): GraphicalNote {
        for (var idx: number = 0, len = this.Notes.Count; idx < len; ++idx) {
            var graphicalNotes: List<GraphicalNote> = this.Notes[idx];
            for (var idx2: number = 0, len2 = graphicalNotes.Count; idx2 < len2; ++idx2) {
                var graphicalNote: GraphicalNote = graphicalNotes[idx2];
                var note: Note = graphicalNote.SourceNote;
                if (note.Pitch != null && note.Pitch.FundamentalNote == tieNote.Pitch.FundamentalNote && note.Pitch.Octave == tieNote.Pitch.Octave && this.getAbsoluteTimestamp() == tieNote.getAbsoluteTimestamp())
                    return graphicalNote;
            }
        }
        return null;
    }
    public findGraphicalNoteFromGraceNote(graceNote: Note): GraphicalNote {
        for (var idx: number = 0, len = this.Notes.Count; idx < len; ++idx) {
            var graphicalNotes: List<GraphicalNote> = this.Notes[idx];
            for (var idx2: number = 0, len2 = graphicalNotes.Count; idx2 < len2; ++idx2) {
                var graphicalNote: GraphicalNote = graphicalNotes[idx2];
                if (graphicalNote.SourceNote == graceNote)
                    return graphicalNote;
            }
        }
        return null;
    }
    public findGraphicalNoteFromNote(baseNote: Note): GraphicalNote {
        for (var idx: number = 0, len = this.Notes.Count; idx < len; ++idx) {
            var graphicalNotes: List<GraphicalNote> = this.Notes[idx];
            for (var idx2: number = 0, len2 = graphicalNotes.Count; idx2 < len2; ++idx2) {
                var graphicalNote: GraphicalNote = graphicalNotes[idx2];
                if (graphicalNote.SourceNote == baseNote && this.getAbsoluteTimestamp() == baseNote.getAbsoluteTimestamp())
                    return graphicalNote;
            }
        }
        return null;
    }
    public getGraphicalNoteDurationFromVoice(voice: Voice): Fraction {
        for (var idx: number = 0, len = this.Notes.Count; idx < len; ++idx) {
            var graphicalNotes: List<GraphicalNote> = this.Notes[idx];
            if (graphicalNotes[0].SourceNote.ParentVoiceEntry.ParentVoice == voice)
                return graphicalNotes[0].GraphicalNoteLength;
        }
        return new Fraction(0, 1);
    }
    public findLinkedNotes(notLinkedNotes: List<GraphicalNote>): void {
        if (this.SourceStaffEntry != null && this.SourceStaffEntry.Link != null) {
            for (var idx: number = 0, len = this.Notes.Count; idx < len; ++idx) {
                var graphicalNotes: List<GraphicalNote> = this.Notes[idx];
                for (var idx2: number = 0, len2 = graphicalNotes.Count; idx2 < len2; ++idx2) {
                    var graphicalNote: GraphicalNote = graphicalNotes[idx2];
                    if (graphicalNote.ParentStaffEntry == this)
                        notLinkedNotes.Add(graphicalNote);
                }
            }
        }
    }
    public findVoiceEntryGraphicalNotes(voiceEntry: VoiceEntry): List<GraphicalNote> {
        for (var idx: number = 0, len = this.Notes.Count; idx < len; ++idx) {
            var graphicalNotes: List<GraphicalNote> = this.Notes[idx];
            for (var idx2: number = 0, len2 = graphicalNotes.Count; idx2 < len2; ++idx2) {
                var graphicalNote: GraphicalNote = graphicalNotes[idx2];
                if (graphicalNote.SourceNote.ParentVoiceEntry == voiceEntry)
                    return graphicalNotes;
            }
        }
        return null;
    }
    public isVoiceEntryPartOfLinkedVoiceEntry(voiceEntry: VoiceEntry): boolean {
        if (this.SourceStaffEntry.Link != null) {
            for (var idx: number = 0, len = this.SourceStaffEntry.Link.LinkStaffEntries.Count; idx < len; ++idx) {
                var sEntry: SourceStaffEntry = this.SourceStaffEntry.Link.LinkStaffEntries[idx];
                if (sEntry.VoiceEntries.Contains(voiceEntry) && sEntry != this.SourceStaffEntry)
                    return true;
            }
        }
        return false;
    }
    public getMainVoice(): Voice {
        for (var idx: number = 0, len = this.SourceStaffEntry.VoiceEntries.Count; idx < len; ++idx) {
            var voiceEntry: VoiceEntry = this.SourceStaffEntry.VoiceEntries[idx];
            if (voiceEntry.ParentVoice.GetType() != /*typeof*/LinkedVoice)
                return voiceEntry.ParentVoice;
        }
        return this.Notes[0][0].SourceNote.ParentVoiceEntry.ParentVoice;
    }
    public findStaffEntryMinNoteLength(): Fraction {
        var minLength: Fraction = new Fraction(Int32.MaxValue, 1);
        for (var idx: number = 0, len = this.Notes.Count; idx < len; ++idx) {
            var graphicalNotes: List<GraphicalNote> = this.Notes[idx];
            for (var idx2: number = 0, len2 = graphicalNotes.Count; idx2 < len2; ++idx2) {
                var graphicalNote: GraphicalNote = graphicalNotes[idx2];
                var calNoteLen: Fraction = graphicalNote.GraphicalNoteLength;
                if (calNoteLen < minLength && calNoteLen.Numerator > 0)
                    minLength = calNoteLen;
            }
        }
        return minLength;
    }
    public findStaffEntryMaxNoteLength(): Fraction {
        var maxLength: Fraction = new Fraction(0, 1);
        for (var idx: number = 0, len = this.Notes.Count; idx < len; ++idx) {
            var graphicalNotes: List<GraphicalNote> = this.Notes[idx];
            for (var idx2: number = 0, len2 = graphicalNotes.Count; idx2 < len2; ++idx2) {
                var graphicalNote: GraphicalNote = graphicalNotes[idx2];
                var calNoteLen: Fraction = graphicalNote.GraphicalNoteLength;
                if (calNoteLen > maxLength && calNoteLen.Numerator > 0)
                    maxLength = calNoteLen;
            }
        }
        return maxLength;
    }
    public findOrCreateGraphicalNotesListFromVoiceEntry(voiceEntry: VoiceEntry): List<GraphicalNote> {
        var graphicalNotes: List<GraphicalNote>;
        if (this.Notes.Count == 0) {
            graphicalNotes = new List<GraphicalNote>();
            this.Notes.Add(graphicalNotes);
        }
        else {
            for (var i: number = 0; i < this.Notes.Count; i++) {
                if (this.Notes[i][0].SourceNote.ParentVoiceEntry.ParentVoice == voiceEntry.ParentVoice)
                    return this.Notes[i];
            }
            graphicalNotes = new List<GraphicalNote>();
            this.Notes.Add(graphicalNotes);
        }
        return graphicalNotes;
    }
    public findOrCreateGraphicalNotesListFromGraphicalNote(graphicalNote: GraphicalNote): List<GraphicalNote> {
        var graphicalNotes: List<GraphicalNote>;
        var tieStartSourceStaffEntry: SourceStaffEntry = graphicalNote.SourceNote.ParentStaffEntry;
        if (this.SourceStaffEntry != tieStartSourceStaffEntry)
            graphicalNotes = this.findOrCreateGraphicalNotesListFromVoiceEntry(graphicalNote.SourceNote.ParentVoiceEntry);
        else {
            if (this.Notes.Count == 0) {
                graphicalNotes = new List<GraphicalNote>();
                this.Notes.Add(graphicalNotes);
            }
            else {
                for (var i: number = 0; i < this.Notes.Count; i++) {
                    if (this.Notes[i][0].SourceNote.ParentVoiceEntry.ParentVoice == graphicalNote.SourceNote.ParentVoiceEntry.ParentVoice) {
                        return this.Notes[i];
                    }
                }
                graphicalNotes = new List<GraphicalNote>();
                this.Notes.Add(graphicalNotes);
            }
        }
        return graphicalNotes;
    }
    public addGraphicalNoteToListAtCorrectYPosition(graphicalNotes: List<GraphicalNote>, graphicalNote: GraphicalNote): void {
        if (graphicalNotes.Count == 0 || graphicalNote.PositionAndShape.RelativePosition.Y < graphicalNotes.Last().PositionAndShape.RelativePosition.Y)
            graphicalNotes.Add(graphicalNote);
        else {
            for (var i: number = graphicalNotes.Count - 1; i >= 0; i--) {
                if (graphicalNotes[i].PositionAndShape.RelativePosition.Y > graphicalNote.PositionAndShape.RelativePosition.Y) {
                    graphicalNotes.Insert(i + 1, graphicalNote);
                    break;
                }
                if (i == 0) {
                    graphicalNotes.Insert(0, graphicalNote);
                    break;
                }
            }
        }
    }
}