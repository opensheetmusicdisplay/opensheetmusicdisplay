import { MusicSheet } from "../../MusicSheet";
import { IXmlElement, IXmlAttribute } from "../../../Common/FileIO/Xml";
import { Slur } from "../../VoiceData/Expressions/ContinuousExpressions/Slur";
import { Note } from "../../VoiceData/Note";
import log from "loglevel";
import { ITextTranslation } from "../../Interfaces/ITextTranslation";
import { PlacementEnum } from "../../VoiceData/Expressions";
import { Glissando } from "../../VoiceData/Glissando";
import { SourceStaffEntry } from "../../VoiceData/SourceStaffEntry";
import { Staff } from "../../VoiceData/Staff";

export class SlurReader {
    private musicSheet: MusicSheet;
    private openSlurDict: { [_: number]: Slur } = {};
    /** Slur stops that were read before their matching start, kept separate from openSlurDict so they don't
     * interfere with normal start-before-stop slurs that reuse the same slur number. See addSlur(). */
    private openStopBeforeStartDict: { [_: number]: Slur } = {};
    /** Open glissandi and slides by staff and number: separate from openSlurDict, so they don't end a slur with the same
     * number, and per staff, because e.g. the standard and the tab staff of a guitar part both write a slide with number 1. */
    private openGlissDicts: Map<Staff, { [_: number]: Slur }> = new Map();
    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
    }
    public addSlur(slurNodes: IXmlElement[], currentNote: Note): void {
        try {
            if (slurNodes) {
                // Process stops before starts within one notations node: a slur can't start and stop on the
                // same note, so a stop refers to an earlier slur. If the start were read first, a stop
                // with the same slur number would wrongly close the slur just opened on this very note as a
                // zero-length slur (e.g. Sibelius can export a start followed by an orphan stop on one note,
                // see test_slurs_long_steep_arc_moonlight_sonata_issue1466.musicxml measure 23).
                // If the stop ends no earlier slur though, the start of its number on this note is a slur whose end
                // isn't attached to a note, see Slur.HasUnattachedEnd.
                const stopNodes: IXmlElement[] = [];
                const otherNodes: IXmlElement[] = [];
                const startNumbers: Set<number> = new Set();
                const numbersStartedBeforeStop: Set<number> = new Set(); // start written before the stop, see the stop case
                for (const slurNode of slurNodes) {
                    const type: string = slurNode.attribute("type")?.value;
                    const slurNumber: number = this.readSlurNumber(slurNode);
                    if (type === "stop") {
                        stopNodes.push(slurNode);
                        if (startNumbers.has(slurNumber)) {
                            numbersStartedBeforeStop.add(slurNumber);
                        }
                    } else {
                        otherNodes.push(slurNode);
                        if (type === "start") {
                            startNumbers.add(slurNumber);
                        }
                    }
                }
                for (const slurNode of stopNodes.concat(otherNodes)) {
                    if (slurNode.attributes().length > 0) {
                        const type: string = slurNode.attribute("type").value;
                        const slurNumber: number = this.readSlurNumber(slurNode);

                        let slurPlacementXml: PlacementEnum = PlacementEnum.NotYetDefined;
                        const placementAttr: Attr = slurNode.attribute("placement");
                        if (placementAttr && placementAttr.value) {
                            if (placementAttr.value === "above") {
                                slurPlacementXml = PlacementEnum.Above;
                            } else if (placementAttr.value === "below") {
                                slurPlacementXml = PlacementEnum.Below;
                            }
                        }
                        const orientationAttr: Attr = slurNode.attribute("orientation"); // alternative for placement, used by Sibelius
                        if (orientationAttr && orientationAttr.value) {
                            if (orientationAttr.value === "over") {
                                slurPlacementXml = PlacementEnum.Above;
                            } else if (orientationAttr.value === "under") {
                                slurPlacementXml = PlacementEnum.Below;
                            }
                        }
                        if (type === "start") {
                            // A cross-staff slur's stop can be read before its start: MusicXML writes the end
                            // note's staff before a <backup> and the start note's staff after it, so for e.g. a
                            // left-hand-to-right-hand slur the stop appears before the start. Such a stop was
                            // deferred to openStopBeforeStartDict; a deferred stop is only valid for the next
                            // start of its number, so we take and clear it here either way.
                            const isSlur: boolean = slurNode.name === "slur";
                            const pendingCrossStaffStop: Slur = isSlur ? this.openStopBeforeStartDict[slurNumber] : undefined;
                            if (isSlur) {
                                delete this.openStopBeforeStartDict[slurNumber];
                            }
                            if (pendingCrossStaffStop && this.isCrossStaffSlurMatch(currentNote, pendingCrossStaffStop.EndNote)) {
                                pendingCrossStaffStop.StartNote = currentNote;
                                pendingCrossStaffStop.PlacementXml = slurPlacementXml;
                                this.linkSlurToNotes(pendingCrossStaffStop);
                            } else {
                                const openDict: { [_: number]: Slur } = isSlur ? this.openSlurDict : this.openGlissDictOfStaff(currentNote);
                                let slur: Slur = openDict[slurNumber];
                                if (!slur || slur.HasUnattachedEnd) {
                                    // an open slur with an unattached end (see below) keeps its start note
                                    slur = new Slur();
                                    openDict[slurNumber] = slur;
                                }
                                slur.StartNote = currentNote;
                                slur.PlacementXml = slurPlacementXml;
                                if (isSlur && pendingCrossStaffStop?.EndNote === currentNote) {
                                    // This note also has a stop of this number that ended no earlier slur (stops are read
                                    // first): Dolet for Sibelius writes a slur whose end isn't attached to a note like this,
                                    // e.g. one running into a repeat barline (#1516). Linked to its start note already, so it
                                    // can be drawn to the barline (see Slur.HasUnattachedEnd), unless a later stop of its
                                    // number ends it (e.g. if the stop on this note was an orphan instead).
                                    slur.HasUnattachedEnd = true;
                                    currentNote.NoteSlurs.push(slur);
                                }
                            }
                        } else if (type === "stop") {
                            const nodeName: string = slurNode.name;
                            if (nodeName === "slide" || nodeName === "glissando") {
                                // TODO for now, we abuse the SlurReader to also process slides and glissandi, to avoid a lot of duplicate code.
                                //   also see variable glissElements later on
                                const openGlissDict: { [_: number]: Slur } = this.openGlissDictOfStaff(currentNote);
                                const slur: Slur = openGlissDict[slurNumber];
                                if (slur && slur.StartNote !== currentNote) {
                                    const startNote: Note = slur.StartNote;
                                    const newGlissando: Glissando = new Glissando(startNote);
                                    newGlissando.AddNote(currentNote);
                                    newGlissando.EndNote = currentNote;
                                    currentNote.NoteGlissando = newGlissando;
                                    delete openGlissDict[slurNumber];
                                }
                            } else {
                                const slur: Slur = this.openSlurDict[slurNumber];
                                // A stop written after a start of its number on this note doesn't end an earlier slur whose
                                // end isn't attached to a note: Dolet writes such slurs one after another with the same
                                // number, so it's this note's own slur whose end isn't attached.
                                const endsOwnSlur: boolean = slur?.HasUnattachedEnd === true && numbersStartedBeforeStop.has(slurNumber);
                                if (slur && slur.StartNote !== currentNote && !endsOwnSlur) {
                                    // normal case: the matching start of this number was read first
                                    slur.EndNote = currentNote;
                                    slur.HasUnattachedEnd = false;
                                    this.linkSlurToNotes(slur);
                                    delete this.openSlurDict[slurNumber];
                                } else if (!slur || endsOwnSlur) {
                                    // No open start with this number (or see endsOwnSlur). Either a cross-staff slur whose
                                    // start is written after the stop (completed in the start branch above), a start on this
                                    // note (a slur whose end isn't attached to a note, see there), or an orphan
                                    // stop with no start (e.g. a slur started on a grace note, whose start is
                                    // skipped by the reader - see VoiceGenerator). Defer it without touching
                                    // openSlurDict, so it can't disturb normal slurs that reuse this number.
                                    const deferredStop: Slur = new Slur();
                                    deferredStop.EndNote = currentNote;
                                    this.openStopBeforeStartDict[slurNumber] = deferredStop;
                                } else {
                                    // The only open slur with this number started on this very note (its stop, if
                                    // any, comes later): this stop can't close it - a slur can't start and stop on
                                    // the same note. Ignore the stop and keep the start open.
                                    log.debug("SlurReader: ignoring slur stop on the same note as its start, measure " +
                                        currentNote.SourceMeasure?.MeasureNumber);
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/SlurError", "Error while reading slur.");
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
        }
    }

    /** The number attribute of a slur, slide or glissando node, 1 if it has none. */
    private readSlurNumber(slurNode: IXmlElement): number {
        let slurNumber: number = 1;
        try {
            const slurNumberAttribute: IXmlAttribute = slurNode.attribute("number");
            if (slurNumberAttribute) {
                slurNumber = parseInt(slurNumberAttribute.value, 10);
            }
        } catch (ex) {
            log.debug("SlurReader.readSlurNumber: ", ex);
        }
        return slurNumber;
    }

    /** The open glissandi and slides of the note's staff, by number (see openGlissDicts). */
    private openGlissDictOfStaff(note: Note): { [_: number]: Slur } {
        const staff: Staff = note.ParentStaffEntry?.ParentStaff;
        let openGlissDict: { [_: number]: Slur } = this.openGlissDicts.get(staff);
        if (!openGlissDict) {
            openGlissDict = {};
            this.openGlissDicts.set(staff, openGlissDict);
        }
        return openGlissDict;
    }

    /** Links a fully-defined slur (both StartNote and EndNote set) to its two notes, unless it duplicates an existing one
     *  (then it's also unlinked from its start note, which a slur that had an unattached end so far is linked to already).
     */
    private linkSlurToNotes(slur: Slur): void {
        const endNote: Note = slur.EndNote;
        const startNoteSlurs: Slur[] = slur.StartNote.NoteSlurs;
        const startNoteIndex: number = startNoteSlurs.indexOf(slur); // see Slur.HasUnattachedEnd
        // check that a slur with the same notes hasn't already been added:
        if (!endNote.isDuplicateSlur(slur)) {
            endNote.NoteSlurs.push(slur);
            if (startNoteIndex === -1) {
                startNoteSlurs.push(slur);
            }
        } else if (startNoteIndex !== -1) {
            startNoteSlurs.splice(startNoteIndex, 1);
        }
    }

    /** Whether a slur stop that was read before its start (endNote) and a later start note (startNote) form a
     * genuine cross-staff slur. A cross-staff slur written end-staff-first has its start and stop on different
     * staves but in the SAME measure (the <backup> that reorders them is within a measure), and runs forward in
     * time (start no later than stop). Requiring all of this rejects orphan stops - e.g. from grace-note slurs
     * whose start is skipped by the reader - which would otherwise be wrongly paired with an unrelated later
     * start that reuses the same slur number (across a barline and/or backwards in time). */
    private isCrossStaffSlurMatch(startNote: Note, endNote: Note): boolean {
        if (!startNote || !endNote) {
            return false;
        }
        const startStaffEntry: SourceStaffEntry = startNote.ParentStaffEntry;
        const endStaffEntry: SourceStaffEntry = endNote.ParentStaffEntry;
        if (!startStaffEntry || !endStaffEntry) {
            return false;
        }
        if (startStaffEntry.ParentStaff === endStaffEntry.ParentStaff) {
            return false; // a cross-staff slur connects two different staves
        }
        if (startNote.SourceMeasure !== endNote.SourceMeasure) {
            return false; // start and stop of a cross-staff slur are in the same measure
        }
        return endStaffEntry.Timestamp.RealValue >= startStaffEntry.Timestamp.RealValue; // slur runs forward in time
    }
}
