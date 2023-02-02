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
                        } else if (type === "stop") {
                            const slur: Slur = this.openSlurDict[slurNumber];
                            if (slur) {
                                const nodeName: string = slurNode.name;
                                if (nodeName === "slide" || nodeName === "glissando") {
                                    // TODO for now, we abuse the SlurReader to also process slides and glissandi, to avoid a lot of duplicate code.
                                    //   though we might want to separate the code a bit, at least use its own openGlissDict instead of openSlurDict.
                                    //   also see variable glissElements later on
                                    const startNote: Note = slur.StartNote;
                                    const newGlissando: Glissando = new Glissando(startNote);
                                    newGlissando.AddNote(currentNote);
                                    newGlissando.EndNote = currentNote;
                                    currentNote.NoteGlissando = newGlissando;
                                    // TODO use its own dict, openSlideDict? Can this cause problems if slur and slide have the same number?
                                    delete this.openSlurDict[slurNumber];
                                } else {
                                    slur.EndNote = currentNote;
                                    // check if not already a slur with same notes has been given:
                                    if (!currentNote.isDuplicateSlur(slur)) {
                                        // if not, link slur to notes:
                                        currentNote.NoteSlurs.push(slur);
                                        const slurStartNote: Note = slur.StartNote;
                                        slurStartNote.NoteSlurs.push(slur);
                                    }
                                    delete this.openSlurDict[slurNumber];
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
}
