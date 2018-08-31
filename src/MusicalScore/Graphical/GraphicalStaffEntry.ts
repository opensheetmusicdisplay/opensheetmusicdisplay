import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {BoundingBox} from "./BoundingBox";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {VerticalGraphicalStaffEntryContainer} from "./VerticalGraphicalStaffEntryContainer";
import {Note} from "../VoiceData/Note";
import {Slur} from "../VoiceData/Expressions/ContinuousExpressions/Slur";
import {Voice} from "../VoiceData/Voice";
import {VoiceEntry} from "../VoiceData/VoiceEntry";
import {GraphicalTie} from "./GraphicalTie";
import {GraphicalObject} from "./GraphicalObject";
import {GraphicalMeasure} from "./GraphicalMeasure";
import {GraphicalNote} from "./GraphicalNote";
import {GraphicalChordSymbolContainer} from "./GraphicalChordSymbolContainer";
import {GraphicalLyricEntry} from "./GraphicalLyricEntry";
import {AbstractGraphicalInstruction} from "./AbstractGraphicalInstruction";
import {GraphicalStaffEntryLink} from "./GraphicalStaffEntryLink";
import {CollectionUtil} from "../../Util/CollectionUtil";
import { GraphicalVoiceEntry } from "./GraphicalVoiceEntry";
import { MusicSheetCalculator } from "./MusicSheetCalculator";

/**
 * The graphical counterpart of a [[SourceStaffEntry]].
 */
export abstract class GraphicalStaffEntry extends GraphicalObject {
    constructor(parentMeasure: GraphicalMeasure, sourceStaffEntry: SourceStaffEntry = undefined, staffEntryParent: GraphicalStaffEntry = undefined) {
        super();
        this.parentMeasure = parentMeasure;
        this.graphicalVoiceEntries = [];
        this.sourceStaffEntry = sourceStaffEntry;
        if (staffEntryParent !== undefined) {
            this.staffEntryParent = staffEntryParent;
            this.parentVerticalContainer = staffEntryParent.parentVerticalContainer;
            this.PositionAndShape = new BoundingBox(this, staffEntryParent.PositionAndShape);
        } else {
            this.PositionAndShape = new BoundingBox(this, parentMeasure.PositionAndShape);
        }
        if (sourceStaffEntry !== undefined) {
            this.relInMeasureTimestamp = sourceStaffEntry.Timestamp;
        }
    }

    public graphicalChordContainer: GraphicalChordSymbolContainer;
    public graphicalLink: GraphicalStaffEntryLink;

    // Extra member needed, as tie notes have no direct source entry with the right time stamp.
    public relInMeasureTimestamp: Fraction;
    public sourceStaffEntry: SourceStaffEntry;
    public parentMeasure: GraphicalMeasure;
    public graphicalVoiceEntries: GraphicalVoiceEntry[];
    public staffEntryParent: GraphicalStaffEntry;
    public parentVerticalContainer: VerticalGraphicalStaffEntryContainer;

    private graphicalInstructions: AbstractGraphicalInstruction[] = [];
    private graphicalTies: GraphicalTie[] = [];
    private lyricsEntries: GraphicalLyricEntry[] = [];

    public get GraphicalInstructions(): AbstractGraphicalInstruction[] {
        return this.graphicalInstructions;
    }

    public get GraphicalTies(): GraphicalTie[] {
        return this.graphicalTies;
    }

    public get LyricsEntries(): GraphicalLyricEntry[] {
        return this.lyricsEntries;
    }

    public set LyricsEntries(value: GraphicalLyricEntry[]) {
        this.lyricsEntries = value;
    }

    /**
     * Calculate the absolute Timestamp.
     * @returns {Fraction}
     */
    public getAbsoluteTimestamp(): Fraction {
        const result: Fraction = this.parentMeasure.parentSourceMeasure.AbsoluteTimestamp.clone();
        if (this.relInMeasureTimestamp !== undefined) {
            result.Add(this.relInMeasureTimestamp);
        }
        return result;
    }

    /**
     * Search through all the GraphicalNotes to find the suitable one for a TieEndNote.
     * @param tieNote
     * @returns {any}
     */
    public findEndTieGraphicalNoteFromNote(tieNote: Note): GraphicalNote {
        for (const gve of this.graphicalVoiceEntries) {
            for (const graphicalNote of gve.notes) {
                const note: Note = graphicalNote.sourceNote;
                if (!note.isRest()
                    && note.Pitch.FundamentalNote === tieNote.Pitch.FundamentalNote
                    && note.Pitch.Octave === tieNote.Pitch.Octave
                    && note.getAbsoluteTimestamp().Equals(tieNote.getAbsoluteTimestamp())) {
                    return graphicalNote;
                }
            }
        }
        return undefined;
    }

    /**
     * Search through all [[GraphicalNote]]s to find the suitable one for an StartSlurNote (that 's also an EndTieNote).
     * @param tieNote
     * @param slur
     * @returns {any}
     */
    public findEndTieGraphicalNoteFromNoteWithStartingSlur(tieNote: Note, slur: Slur): GraphicalNote {
        if (tieNote === undefined) {
            return undefined;
        }
        for (const gve of this.graphicalVoiceEntries) {
            if (gve.parentVoiceEntry !== tieNote.ParentVoiceEntry) {
                continue;
            }
            for (const graphicalNote of gve.notes) {
                const note: Note = graphicalNote.sourceNote;
                if (note.NoteTie !== undefined && note.NoteSlurs.indexOf(slur) !== -1) {
                    return graphicalNote;
                }
            }
        }
        return undefined;
    }

    public findGraphicalNoteFromGraceNote(graceNote: Note): GraphicalNote {
        if (graceNote === undefined) {
            return undefined;
        }
        for (const gve of this.graphicalVoiceEntries) {
            if (gve.parentVoiceEntry !== graceNote.ParentVoiceEntry) {
                continue;
            }
            for (const graphicalNote of gve.notes) {
                if (graphicalNote.sourceNote === graceNote) {
                    return graphicalNote;
                }
            }
        }
        return undefined;
    }

    public findGraphicalNoteFromNote(note: Note): GraphicalNote {
        if (note === undefined) {
            return undefined;
        }
        for (const gve of this.graphicalVoiceEntries) {
            if (gve.parentVoiceEntry !== note.ParentVoiceEntry) {
                continue;
            }
            for (const graphicalNote of gve.notes) {
                if (graphicalNote.sourceNote === note && this.getAbsoluteTimestamp().Equals(note.getAbsoluteTimestamp())) {
                    return graphicalNote;
                }
            }
        }
        return undefined;
    }

    public getGraphicalNoteDurationFromVoice(voice: Voice): Fraction {
        for (const gve of this.graphicalVoiceEntries) {
            if (gve.parentVoiceEntry.ParentVoice !== voice) {
                continue;
            }
            return gve.notes[0].graphicalNoteLength;
        }
        return new Fraction(0, 1);
    }

    /**
     * Find the [[StaffEntry]]'s [[GraphicalNote]]s that correspond to the given [[VoiceEntry]]'s [[Note]]s.
     * @param voiceEntry
     * @returns {any}
     */
    public findVoiceEntryGraphicalNotes(voiceEntry: VoiceEntry): GraphicalNote[] {
        for (const gve of this.graphicalVoiceEntries) {
            if (gve.parentVoiceEntry === voiceEntry) {
                return gve.notes;
            }
        }
        return undefined;
    }

    /**
     * Check if the given [[VoiceEntry]] is part of the [[StaffEntry]]'s Linked [[VoiceEntry]].
     * @param voiceEntry
     * @returns {boolean}
     */
    public isVoiceEntryPartOfLinkedVoiceEntry(voiceEntry: VoiceEntry): boolean {
        if (this.sourceStaffEntry.Link !== undefined) {
            for (let idx: number = 0, len: number = this.sourceStaffEntry.Link.LinkStaffEntries.length; idx < len; ++idx) {
                const sEntry: SourceStaffEntry = this.sourceStaffEntry.Link.LinkStaffEntries[idx];
                if (sEntry.VoiceEntries.indexOf(voiceEntry) !== -1 && sEntry !== this.sourceStaffEntry) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Return the [[StaffEntry]]'s Minimum NoteLength.
     * @returns {Fraction}
     */
    public findStaffEntryMinNoteLength(): Fraction {
        let minLength: Fraction = new Fraction(Number.MAX_VALUE, 1);
        for (const gve of this.graphicalVoiceEntries) {
            for (const graphicalNote of gve.notes) {
                const calNoteLen: Fraction = graphicalNote.graphicalNoteLength;
                if (calNoteLen.lt(minLength) && calNoteLen.GetExpandedNumerator() > 0) {
                    minLength = calNoteLen;
                }
            }
        }
        return minLength;
    }

    public findStaffEntryMaxNoteLength(): Fraction {
        let maxLength: Fraction = new Fraction(0, 1);
        for (const gve of this.graphicalVoiceEntries) {
            for (const graphicalNote of gve.notes) {
                const calNoteLen: Fraction = graphicalNote.graphicalNoteLength;
                if (maxLength.lt(calNoteLen)  && calNoteLen.GetExpandedNumerator() > 0) {
                    maxLength = calNoteLen;
                }
            }
        }
        return maxLength;
    }

    /**
     * Find or creates the list of [[GraphicalNote]]s in case of a [[VoiceEntry]] (not from TiedNote).
     * @param voiceEntry
     * @returns {GraphicalNote[]}
     */
    public findOrCreateGraphicalVoiceEntry(voiceEntry: VoiceEntry): GraphicalVoiceEntry {
        for (const gve of this.graphicalVoiceEntries) {
            if (gve.parentVoiceEntry === voiceEntry) {
                return gve;
            }
        }
        // if not found in list, create new one and add to list:
        const graphicalVoiceEntry: GraphicalVoiceEntry = MusicSheetCalculator.symbolFactory.createVoiceEntry(voiceEntry, this);
        this.graphicalVoiceEntries.push(graphicalVoiceEntry);

        return graphicalVoiceEntry;
    }

    /**
     * Find or creates the list of [[GraphicalNote]]s in case of a TiedNote.
     * @param graphicalNote
     * @returns {GraphicalNote[]}
     */
    public findOrCreateGraphicalVoiceEntryFromGraphicalNote(graphicalNote: GraphicalNote): GraphicalVoiceEntry {
        for (const gve of this.graphicalVoiceEntries) {
            if (gve === graphicalNote.parentVoiceEntry) {
                return gve;
            }
        }
        // if not found in list, create new one and add to list:
        const graphicalVoiceEntry: GraphicalVoiceEntry = MusicSheetCalculator.symbolFactory.createVoiceEntry(graphicalNote.sourceNote.ParentVoiceEntry, this);
        this.graphicalVoiceEntries.push(graphicalVoiceEntry);

        return graphicalVoiceEntry;
    }

    /**
     * Insert the [[GraphicalNote]] to the correct index of the [[GraphicalNote]]s list,
     * so that the order of the [[GraphicalNote]]'s in the list corresponds to the [[VoiceEntry]]'s [[Note]]s order.
     * (needed when adding Tie-EndNotes).
     * @param graphicalNotes
     * @param graphicalNote
     */
    public addGraphicalNoteToListAtCorrectYPosition(gve: GraphicalVoiceEntry, graphicalNote: GraphicalNote): void {
        const graphicalNotes: GraphicalNote[] = gve.notes;
        if (graphicalNotes.length === 0 ||
            graphicalNote.PositionAndShape.RelativePosition.y < CollectionUtil.last(graphicalNotes).PositionAndShape.RelativePosition.Y) {
            graphicalNotes.push(graphicalNote);
        } else {
            for (let i: number = graphicalNotes.length - 1; i >= 0; i--) {
                if (graphicalNotes[i].PositionAndShape.RelativePosition.y > graphicalNote.PositionAndShape.RelativePosition.y) {
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

    /**
     * Returns true if this staff entry has only rests
     */
    public hasOnlyRests(): boolean {
        const hasOnlyRests: boolean = true;
        for (const gve of this.graphicalVoiceEntries) {
            for (const graphicalNote of gve.notes) {
                const note: Note = graphicalNote.sourceNote;
                if (!note.isRest()) {
                    return false;
                }
            }
        }
        return hasOnlyRests;
    }
}
