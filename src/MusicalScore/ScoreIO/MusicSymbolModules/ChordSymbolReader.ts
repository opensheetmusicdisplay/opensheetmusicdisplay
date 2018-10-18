import {IXmlElement} from "../../../Common/FileIO/Xml";
import {MusicSheet} from "../../MusicSheet";
import {ChordDegreeText, ChordSymbolContainer, ChordSymbolEnum, Degree} from "../../VoiceData/ChordSymbolContainer";
import {AccidentalEnum, NoteEnum, Pitch} from "../../../Common/DataObjects/Pitch";
import {KeyInstruction} from "../../VoiceData/Instructions/KeyInstruction";
import {ITextTranslation} from "../../Interfaces/ITextTranslation";
import * as log from "loglevel";

export class ChordSymbolReader {
    public static readChordSymbol(xmlNode: IXmlElement, musicSheet: MusicSheet, activeKey: KeyInstruction): ChordSymbolContainer {
        const root: IXmlElement = xmlNode.element("root");
        const kind: IXmlElement = xmlNode.element("kind");

        // must be always present
        if (root === undefined || kind === undefined) {
          return undefined;
        }

        const rootStep: IXmlElement = root.element("root-step");
        const rootAlter: IXmlElement = root.element("root-alter");

        // a valid NoteEnum value should be present
        if (rootStep === undefined) {
            return undefined;
        }
        let rootNote: NoteEnum;
        try {
            rootNote = NoteEnum[rootStep.value.trim()];
        } catch (ex) {
            const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ChordSymbolError",
                                                                    "Invalid chord symbol");
            musicSheet.SheetErrors.pushMeasureError(errorMsg);
            log.debug("InstrumentReader.readChordSymbol", errorMsg, ex);
            return undefined;
        }

        // an alteration value isn't necessary
        let rootAlteration: AccidentalEnum = AccidentalEnum.NONE;
        if (rootAlter !== undefined) {
            try {
                rootAlteration = Pitch.AccidentalFromHalfTones(parseInt(rootAlter.value, undefined));
            } catch (ex) {
                const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ChordSymbolError",
                                                                        "Invalid chord symbol");
                musicSheet.SheetErrors.pushMeasureError(errorMsg);
                log.debug("InstrumentReader.readChordSymbol", errorMsg, ex);
            }

        }
        // using default octave value, to be changed later
        const rootPitch: Pitch = new Pitch(rootNote, 1, rootAlteration);
        const kindValue: string = kind.value.trim().replace("-", "");
        let chordKind: ChordSymbolEnum;
        try {
            chordKind = ChordSymbolEnum[kindValue];
        } catch (ex) {
            const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ChordSymbolError",
                                                                    "Invalid chord symbol");
            musicSheet.SheetErrors.pushMeasureError(errorMsg);
            log.debug("InstrumentReader.readChordSymbol", errorMsg, ex);
            return undefined;
        }

        // bass is optional
        let bassPitch: Pitch = undefined;
        const bass: IXmlElement = xmlNode.element("bass");
        if (bass !== undefined) {
            const bassStep: IXmlElement = bass.element("bass-step");
            const bassAlter: IXmlElement = bass.element("bass-alter");
            let bassNote: NoteEnum = NoteEnum.C;
            if (bassStep !== undefined) {
                try {
                    bassNote = NoteEnum[bassStep.value.trim()];
                } catch (ex) {
                    const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ChordSymbolError",
                                                                            "Invalid chord symbol");
                    musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    log.debug("InstrumentReader.readChordSymbol", errorMsg, ex);
                    return undefined;
                }
            }
            let bassAlteration: AccidentalEnum = AccidentalEnum.NONE;
            if (bassAlter !== undefined) {
                try {
                    bassAlteration = Pitch.AccidentalFromHalfTones(parseInt(bassAlter.value, undefined));
                } catch (ex) {
                    const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ChordSymbolError",
                                                                            "Invalid chord symbol");
                    musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    log.debug("InstrumentReader.readChordSymbol", errorMsg, ex);
                }
            }
            bassPitch = new Pitch(bassNote, 1, bassAlteration);
        }

        // degree is optional
        let degree: Degree = undefined;
        const degreeNode: IXmlElement = xmlNode.element("degree");
        if (degreeNode !== undefined) {
            const degreeValue: IXmlElement = degreeNode.element("degree-value");
            const degreeAlter: IXmlElement = degreeNode.element("degree-alter");
            const degreeType: IXmlElement = degreeNode.element("degree-type");
            if (degreeValue === undefined || degreeAlter === undefined || degreeType === undefined) {
              return undefined;
            }

            let value: number;
            try {
                value = parseInt(degreeValue.value.trim(), undefined);
            } catch (ex) {
                const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ChordSymbolError",
                                                                        "Invalid chord symbol");
                musicSheet.SheetErrors.pushMeasureError(errorMsg);
                log.debug("InstrumentReader.readChordSymbol", errorMsg, ex);
                return undefined;
            }

            let alter: AccidentalEnum;
            try {
                alter = Pitch.AccidentalFromHalfTones(parseInt(degreeAlter.value, undefined));
            } catch (ex) {
                const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ChordSymbolError",
                                                                        "Invalid chord symbol");
                musicSheet.SheetErrors.pushMeasureError(errorMsg);
                log.debug("InstrumentReader.readChordSymbol", errorMsg, ex);
                return undefined;
            }

            let text: ChordDegreeText;
            try {
                text = ChordDegreeText[degreeType.value.trim().toLowerCase()];
            } catch (ex) {
                const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ChordSymbolError",
                                                                        "Invalid chord symbol");
                musicSheet.SheetErrors.pushMeasureError(errorMsg);
                log.debug("InstrumentReader.readChordSymbol", errorMsg, ex);
                return undefined;
            }

            degree = new Degree(value, alter, text);
        }
        return new ChordSymbolContainer(rootPitch, chordKind, bassPitch, degree, activeKey);
    }
}
