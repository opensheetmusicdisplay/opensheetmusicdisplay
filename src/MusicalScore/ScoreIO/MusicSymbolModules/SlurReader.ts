import { MusicSheet } from "../../MusicSheet";
import { IXmlElement, IXmlAttribute } from "../../../Common/FileIO/Xml";
import { Slur } from "../../VoiceData/Expressions/ContinuousExpressions/Slur";
import { Note } from "../../VoiceData/Note";
import log from "loglevel";
import { ITextTranslation } from "../../Interfaces/ITextTranslation";
import { PlacementEnum } from "../../VoiceData/Expressions";
import { Glissando } from "../../VoiceData/Glissando";
import { SourceStaffEntry } from "../../VoiceData/SourceStaffEntry";

export class SlurReader {
    private musicSheet: MusicSheet;
    private openSlurDict: { [_: number]: Slur } = {};
    /** Slur stops that were read before their matching start, kept separate from openSlurDict so they don't
     * interfere with normal start-before-stop slurs that reuse the same slur number. See addSlur(). */
    private openStopBeforeStartDict: { [_: number]: Slur } = {};
    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
    }
    public addSlur(slurNodes: IXmlElement[], currentNote: Note): void {
        try {
            if (slurNodes) {
                // Process stops before starts within one notations node: a slur can't start and stop on the
                // same note, so a stop always refers to an earlier slur. If the start were read first, a stop
                // with the same slur number would wrongly close the slur just opened on this very note as a
                // zero-length slur (e.g. Sibelius can export a start followed by an orphan stop on one note,
                // see test_slurs_long_steep_arc_moonlight_sonata_issue1466.musicxml measure 23).
                const stopNodes: IXmlElement[] = [];
                const otherNodes: IXmlElement[] = [];
                for (const slurNode of slurNodes) {
                    if (slurNode.attribute("type")?.value === "stop") {
                        stopNodes.push(slurNode);
                    } else {
                        otherNodes.push(slurNode);
                    }
                }
                for (const slurNode of stopNodes.concat(otherNodes)) {
                    if (slurNode.attributes().length > 0) {
                        const type: string = slurNode.attribute("type").value;
                        let slurNumber: number = 1;
                        try {
                            const slurNumberAttribute: IXmlAttribute = slurNode.attribute("number");
                            if (slurNumberAttribute) {
                                slurNumber = parseInt(slurNode.attribute("number").value, 10);
                            }
                        } catch (ex) {
                            log.debug("VoiceGenerator.addSlur number: ", ex);
                        }

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
                                let slur: Slur = this.openSlurDict[slurNumber];
                                if (!slur) {
                                    slur = new Slur();
                                    this.openSlurDict[slurNumber] = slur;
                                }
                                slur.StartNote = currentNote;
                                slur.PlacementXml = slurPlacementXml;
                            }
                        } else if (type === "stop") {
                            const nodeName: string = slurNode.name;
                            if (nodeName === "slide" || nodeName === "glissando") {
                                // TODO for now, we abuse the SlurReader to also process slides and glissandi, to avoid a lot of duplicate code.
                                //   though we might want to separate the code a bit, at least use its own openGlissDict instead of openSlurDict.
                                //   also see variable glissElements later on
                                const slur: Slur = this.openSlurDict[slurNumber];
                                if (slur && slur.StartNote !== currentNote) {
                                    const startNote: Note = slur.StartNote;
                                    const newGlissando: Glissando = new Glissando(startNote);
                                    newGlissando.AddNote(currentNote);
                                    newGlissando.EndNote = currentNote;
                                    currentNote.NoteGlissando = newGlissando;
                                    // TODO use its own dict, openSlideDict? Can this cause problems if slur and slide have the same number?
                                    delete this.openSlurDict[slurNumber];
                                }
                            } else {
                                const slur: Slur = this.openSlurDict[slurNumber];
                                if (slur && slur.StartNote !== currentNote) {
                                    // normal case: the matching start of this number was read first
                                    slur.EndNote = currentNote;
                                    this.linkSlurToNotes(slur);
                                    delete this.openSlurDict[slurNumber];
                                } else if (!slur) {
                                    // No open start with this number. Either a cross-staff slur whose start is
                                    // written after the stop (completed in the start branch above), or an orphan
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

    /** Links a fully-defined slur (both StartNote and EndNote set) to its two notes, unless it duplicates an existing one. */
    private linkSlurToNotes(slur: Slur): void {
        const endNote: Note = slur.EndNote;
        // check that a slur with the same notes hasn't already been added:
        if (!endNote.isDuplicateSlur(slur)) {
            endNote.NoteSlurs.push(slur);
            slur.StartNote.NoteSlurs.push(slur);
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
