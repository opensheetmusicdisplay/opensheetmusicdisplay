import {IXmlElement, IXmlAttribute} from "../../../Common/FileIO/Xml";
import {MusicSheet} from "../../MusicSheet";
import {ChordDegreeText, ChordSymbolContainer, ChordSymbolEnum, Degree} from "../../VoiceData/ChordSymbolContainer";
import {AccidentalEnum, NoteEnum, Pitch} from "../../../Common/DataObjects/Pitch";
import {KeyInstruction} from "../../VoiceData/Instructions/KeyInstruction";
import {ITextTranslation} from "../../Interfaces/ITextTranslation";
import log from "loglevel";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";

export class ChordSymbolReader {
    public static readChordSymbol(xmlNode: IXmlElement, musicSheet: MusicSheet, activeKey: KeyInstruction): ChordSymbolContainer {
        const root: IXmlElement = xmlNode.element("root");
        const kind: IXmlElement = xmlNode.element("kind");
        const numeral: IXmlElement = xmlNode.element("numeral");
        const kindText: IXmlAttribute = kind.attribute("text");

        // must be always present
        if (!root && !numeral) { // function is also possible, but deprecated.
          return undefined;
        }

        // bass is optional
        let bassPitch: Pitch = undefined;
        const bass: IXmlElement = xmlNode.element("bass");
        if (bass) {
            const bassStep: IXmlElement = bass.element("bass-step");
            const bassAlter: IXmlElement = bass.element("bass-alter");
            let bassNote: NoteEnum = NoteEnum.C;
            if (bassStep) {
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
            if (bassAlter) {
                try {
                    bassAlteration = Pitch.AccidentalFromHalfTones(parseInt(bassAlter.value, 10));
                } catch (ex) {
                    const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ChordSymbolError",
                                                                            "Invalid chord symbol");
                    musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    log.debug("InstrumentReader.readChordSymbol", errorMsg, ex);
                }
            }
            bassPitch = new Pitch(bassNote, 1, bassAlteration);
        }

        // degrees are optional
        const degrees: Degree[] = [];
        const degreeNodes: IXmlElement[] = xmlNode.elements("degree");
        for (const degreeNode of degreeNodes) {
            if (degreeNode) {
                const degreeValue: IXmlElement = degreeNode.element("degree-value");
                const degreeAlter: IXmlElement = degreeNode.element("degree-alter");
                const degreeType: IXmlElement = degreeNode.element("degree-type");
                if (!degreeValue || !degreeAlter || !degreeType) {
                    return undefined;
                }

                let value: number;
                try {
                    value = parseInt(degreeValue.value.trim(), 10);
                } catch (ex) {
                    const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ChordSymbolError",
                                                                            "Invalid chord symbol");
                    musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    log.debug("InstrumentReader.readChordSymbol", errorMsg, ex);
                    return undefined;
                }

                let alter: AccidentalEnum;
                try {
                    alter = Pitch.AccidentalFromHalfTones(parseInt(degreeAlter.value, 10));
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
                    const errorMsg: string = ITextTranslation.translateText(
                        "ReaderErrorMessages/ChordSymbolError",
                        "Invalid chord symbol"
                    );
                    musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    log.debug("InstrumentReader.readChordSymbol", errorMsg, ex);
                    return undefined;
                }

                degrees.push(new Degree(value, alter, text));
            }
        }

        let placement: PlacementEnum = ChordSymbolReader.readPlacement(xmlNode); // optional
        if (placement !== PlacementEnum.Below) { // could also be NotYetDefined
            placement = PlacementEnum.Above;
        }
        if (numeral) {
            const numeralElement: IXmlElement = numeral.element("numeral-root");
            const numeralElementText: string = numeralElement?.attribute("text")?.value; // this is optional
            const numeralString: string = numeralElementText ?? numeralElement?.value;
            const container: ChordSymbolContainer = new ChordSymbolContainer(
                undefined, ChordSymbolEnum.none, bassPitch, degrees, musicSheet.Rules, placement
            );
            container.NumeralText = numeralString;
            return container;
        }

        const rootStep: IXmlElement = root.element("root-step");
        const rootAlter: IXmlElement = root.element("root-alter");

        // a valid NoteEnum value should be present
        if (root && !rootStep) {
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
        if (rootAlter) {
            try {
                rootAlteration = Pitch.AccidentalFromHalfTones(parseInt(rootAlter.value, 10));
            } catch (ex) {
                const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ChordSymbolError",
                                                                        "Invalid chord symbol");
                musicSheet.SheetErrors.pushMeasureError(errorMsg);
                log.debug("InstrumentReader.readChordSymbol", errorMsg, ex);
            }
        }

        // using default octave value, to be changed later
        const rootPitch: Pitch = new Pitch(rootNote, 1, rootAlteration);
        // only exists if we have a root node instead of a numeral node

        // kind is optional if there is a numeral (or function (deprecated)) instead
        let kindValue: string = kind.value.trim().replace("-", "");
        if (kindText) {
            switch (kindText.value) {
                case "aug":
                    kindValue = "augmented";
                    break;
                case "dim":
                    kindValue = "diminished";
                    break;
                default:
            }
        }
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

        return new ChordSymbolContainer(rootPitch, chordKind, bassPitch, degrees, musicSheet.Rules, placement);
    }

    static readPlacement(node: IXmlElement): PlacementEnum {
        const value: string = node.attribute("placement")?.value;
        if (value === "above") {
            return PlacementEnum.Above;
        } else if (value === "below") {
            return PlacementEnum.Below;
        } else {
            return PlacementEnum.NotYetDefined;
        }
    }
}
