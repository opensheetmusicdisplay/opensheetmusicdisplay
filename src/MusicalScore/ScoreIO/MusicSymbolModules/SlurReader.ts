import { MusicSheet } from "../../MusicSheet";
import { IXmlElement, IXmlAttribute } from "../../../Common/FileIO/Xml";
import { Slur } from "../../VoiceData/Expressions/ContinuousExpressions/Slur";
import { Note } from "../../VoiceData/Note";
import * as log from "loglevel";
import { ITextTranslation } from "../../Interfaces/ITextTranslation";

export class SlurReader {
    private musicSheet: MusicSheet;
    private openSlurDict: { [_: number]: Slur; } = {};
    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
    }
    public addSlur(slurNodes: IXmlElement[], currentNote: Note): void {
        try {
            if (slurNodes !== undefined) {
                for (const slurNode of slurNodes) {
                    if (slurNode.attributes().length > 0) {
                        const type: string = slurNode.attribute("type").value;
                        let slurNumber: number = 1;
                        try {
                            const slurNumberAttribute: IXmlAttribute = slurNode.attribute("number");
                            if (slurNumberAttribute !== undefined) {
                                slurNumber = parseInt(slurNode.attribute("number").value, 10);
                            }
                        } catch (ex) {
                            log.debug("VoiceGenerator.addSlur number: ", ex);
                        }

                        if (type === "start") {
                            let slur: Slur = this.openSlurDict[slurNumber];
                            if (slur === undefined) {
                                slur = new Slur();
                                this.openSlurDict[slurNumber] = slur;
                            }
                            slur.StartNote = currentNote;
                        } else if (type === "stop") {
                            const slur: Slur = this.openSlurDict[slurNumber];
                            if (slur !== undefined) {
                                slur.EndNote = currentNote;
                                // check if not already a slur with same notes has been given:
                                if (!currentNote.checkForDoubleSlur(slur)) {
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
        } catch (err) {
            const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/SlurError", "Error while reading slur.");
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
        }
    }
}
