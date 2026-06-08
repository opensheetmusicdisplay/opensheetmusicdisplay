import { MusicSheet } from "../../MusicSheet";
import { IXmlElement, IXmlAttribute } from "../../../Common/FileIO/Xml";
import { Slur } from "../../VoiceData/Expressions/ContinuousExpressions/Slur";
import { Note } from "../../VoiceData/Note";
import log from "loglevel";
import { ITextTranslation } from "../../Interfaces/ITextTranslation";
import { PlacementEnum } from "../../VoiceData/Expressions";
import { Glissando } from "../../VoiceData/Glissando";

export class SlurReader {
    private musicSheet: MusicSheet;
    private openSlurDict: { [_: number]: Slur } = {};
    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
    }
    public addSlur(slurNodes: IXmlElement[], currentNote: Note): void {
        try {
            if (slurNodes) {
                for (const slurNode of slurNodes) {
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
                            let slur: Slur = this.openSlurDict[slurNumber];
                            if (!slur) {
                                slur = new Slur();
                                this.openSlurDict[slurNumber] = slur;
                            }
                            slur.StartNote = currentNote;
                            slur.PlacementXml = slurPlacementXml;
                            if (slur.EndNote) {
                                // The stop was read before the start. This happens for cross-staff slurs (e.g. left
                                // hand to right hand): MusicXML writes the end note's staff before a <backup> and the
                                // start note's staff after it, so the slur's stop appears before its start.
                                this.linkSlurToNotes(slur);
                                delete this.openSlurDict[slurNumber];
                            }
                        } else if (type === "stop") {
                            const nodeName: string = slurNode.name;
                            if (nodeName === "slide" || nodeName === "glissando") {
                                // TODO for now, we abuse the SlurReader to also process slides and glissandi, to avoid a lot of duplicate code.
                                //   though we might want to separate the code a bit, at least use its own openGlissDict instead of openSlurDict.
                                //   also see variable glissElements later on
                                const slur: Slur = this.openSlurDict[slurNumber];
                                if (slur) {
                                    const startNote: Note = slur.StartNote;
                                    const newGlissando: Glissando = new Glissando(startNote);
                                    newGlissando.AddNote(currentNote);
                                    newGlissando.EndNote = currentNote;
                                    currentNote.NoteGlissando = newGlissando;
                                    // TODO use its own dict, openSlideDict? Can this cause problems if slur and slide have the same number?
                                    delete this.openSlurDict[slurNumber];
                                }
                            } else {
                                let slur: Slur = this.openSlurDict[slurNumber];
                                if (!slur) {
                                    // The stop was read before the start (cross-staff slur written end-staff-first,
                                    // see the start branch above). Open the slur now and complete it when the start arrives.
                                    slur = new Slur();
                                    this.openSlurDict[slurNumber] = slur;
                                }
                                slur.EndNote = currentNote;
                                if (slur.StartNote) {
                                    this.linkSlurToNotes(slur);
                                    delete this.openSlurDict[slurNumber];
                                }
                                // else: wait for the matching start node to complete the slur
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
}
