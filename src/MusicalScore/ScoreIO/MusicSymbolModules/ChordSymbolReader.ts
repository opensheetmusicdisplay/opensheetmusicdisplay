import {IXmlElement, IXmlAttribute} from "../../../Common/FileIO/Xml";
import {MusicSheet} from "../../MusicSheet";
import {
    ChordDegreeText,
    ChordSymbolContainer,
    ChordSymbolEnum,
    Degree,
    HarmonyArrangement,
    HarmonyBassArrangement,
    HarmonyChordComponent,
    HarmonySeparator,
} from "../../VoiceData/ChordSymbolContainer";
import {AccidentalEnum, NoteEnum, Pitch} from "../../../Common/DataObjects/Pitch";
import {KeyInstruction} from "../../VoiceData/Instructions/KeyInstruction";
import {ITextTranslation} from "../../Interfaces/ITextTranslation";
import log from "loglevel";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";

export class ChordSymbolReader {
    public static readChordSymbol(xmlNode: IXmlElement, musicSheet: MusicSheet, activeKey: KeyInstruction): ChordSymbolContainer {
        let placement: PlacementEnum = ChordSymbolReader.readPlacement(xmlNode); // optional
        if (placement !== PlacementEnum.Below) { // could also be NotYetDefined
            placement = PlacementEnum.Above;
        }
        const arrangementValue: string = xmlNode.attribute("arrangement")?.value?.toLowerCase();
        const explicitArrangement: HarmonyArrangement = Object.values(HarmonyArrangement)
            .includes(arrangementValue as HarmonyArrangement)
            ? arrangementValue as HarmonyArrangement
            : undefined;
        let bassSeparator: HarmonySeparator;
        const components: HarmonyChordComponent[] = [];
        let current: HarmonyChordComponent;
        const commitCurrent: () => void = (): void => {
            if (current && (current.RootPitch || current.NumeralText !== undefined)) {
                components.push(current);
            }
        };
        const beginComponent: () => HarmonyChordComponent = (): HarmonyChordComponent => {
            commitCurrent();
            current = new HarmonyChordComponent(undefined, ChordSymbolEnum.none, undefined, []);
            return current;
        };

        for (const child of xmlNode.elements()) {
            switch (child.name) {
                case "root":
                    beginComponent().RootPitch = ChordSymbolReader.readPitch(
                        child, "root-step", "root-alter", musicSheet,
                    );
                    break;
                case "numeral":
                    beginComponent().NumeralText = child.element("numeral-root")?.attribute("text")?.value ??
                        child.element("numeral-root")?.value;
                    break;
                case "function":
                    beginComponent().NumeralText = child.value;
                    break;
                case "kind":
                    current = current ?? new HarmonyChordComponent(undefined, ChordSymbolEnum.none, undefined, []);
                    current.ChordKind = ChordSymbolReader.readKind(child);
                    break;
                case "bass":
                    current = current ?? new HarmonyChordComponent(undefined, ChordSymbolEnum.none, undefined, []);
                    current.BassPitch = ChordSymbolReader.readPitch(
                        child, "bass-step", "bass-alter", musicSheet,
                    );
                    current.BassArrangement = ChordSymbolReader.readBassArrangement(child);
                    if (child.element("bass-separator")) {
                        current.BassSeparator = {
                            text: child.element("bass-separator").value?.trim() || undefined,
                            explicit: true,
                        };
                    }
                    break;
                case "degree":
                    current = current ?? new HarmonyChordComponent(undefined, ChordSymbolEnum.none, undefined, []);
                    current.ChordDegrees.push(ChordSymbolReader.readDegree(child));
                    break;
                case "bass-separator": {
                    const separatorText: string = child.attribute("text")?.value ?? child.value?.trim();
                    bassSeparator = {text: separatorText || undefined, explicit: true};
                    if (current) {
                        current.BassSeparator = bassSeparator;
                    }
                    break;
                }
                default:
            }
        }
        commitCurrent();
        const validComponents: HarmonyChordComponent[] = components.filter((component: HarmonyChordComponent): boolean =>
            Boolean(component.RootPitch || component.NumeralText !== undefined),
        );
        if (validComponents.length === 0) {
            return undefined;
        }
        const first: HarmonyChordComponent = validComponents[0];
        return new ChordSymbolContainer(
            first.RootPitch,
            first.ChordKind,
            first.BassPitch,
            first.ChordDegrees,
            musicSheet.Rules,
            placement,
            validComponents,
            explicitArrangement,
            bassSeparator,
        );
    }

    private static readPitch(node: IXmlElement, stepName: string, alterName: string, musicSheet: MusicSheet): Pitch {
        const step: IXmlElement = node.element(stepName);
        if (!step) {
            return undefined;
        }
        const note: NoteEnum = NoteEnum[step.value.trim()];
        if (note === undefined) {
            ChordSymbolReader.reportInvalidChord(musicSheet);
            return undefined;
        }
        const alterNode: IXmlElement = node.element(alterName);
        const accidental: AccidentalEnum = alterNode
            ? Pitch.AccidentalFromHalfTones(parseFloat(alterNode.value))
            : AccidentalEnum.NONE;
        return new Pitch(note, 1, accidental);
    }

    private static readKind(kind: IXmlElement): ChordSymbolEnum {
        const kindText: IXmlAttribute = kind.attribute("text");
        let kindValue: string = kind.value.trim().replace(/-/g, "");
        if (kindText?.value === "aug") {
            kindValue = "augmented";
        } else if (kindText?.value === "dim") {
            kindValue = "diminished";
        }
        return ChordSymbolEnum[kindValue] ?? ChordSymbolEnum.none;
    }

    private static readDegree(degreeNode: IXmlElement): Degree {
        const value: number = parseInt(degreeNode.element("degree-value")?.value, 10);
        const alteration: AccidentalEnum = Pitch.AccidentalFromHalfTones(
            parseFloat(degreeNode.element("degree-alter")?.value ?? "0"),
        );
        const type: ChordDegreeText = ChordDegreeText[
            degreeNode.element("degree-type")?.value?.trim().toLowerCase()
        ];
        return new Degree(value, alteration, type);
    }

    private static readBassArrangement(bass: IXmlElement): HarmonyBassArrangement {
        const value: string = bass.attribute("arrangement")?.value?.toLowerCase();
        return Object.values(HarmonyBassArrangement).includes(value as HarmonyBassArrangement)
            ? value as HarmonyBassArrangement
            : undefined;
    }

    private static reportInvalidChord(musicSheet: MusicSheet): void {
        const errorMsg: string = ITextTranslation.translateText(
            "ReaderErrorMessages/ChordSymbolError",
            "Invalid chord symbol",
        );
        musicSheet.SheetErrors.pushMeasureError(errorMsg);
        log.debug("ChordSymbolReader.readChordSymbol", errorMsg);
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
