import {MusicSheet} from "../../MusicSheet";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {MultiTempoExpression} from "../../VoiceData/Expressions/MultiTempoExpression";
import {ContDynamicEnum, ContinuousDynamicExpression} from "../../VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import {ContinuousTempoExpression} from "../../VoiceData/Expressions/ContinuousExpressions/ContinuousTempoExpression";
import {DynamicEnum, InstantaneousDynamicExpression} from "../../VoiceData/Expressions/InstantaneousDynamicExpression";
import {OctaveShift} from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import {Instrument} from "../../Instrument";
import {MultiExpression} from "../../VoiceData/Expressions/MultiExpression";
import {IXmlAttribute, IXmlElement} from "../../../Common/FileIO/Xml";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {InstantaneousTempoExpression} from "../../VoiceData/Expressions/InstantaneousTempoExpression";
import {MoodExpression} from "../../VoiceData/Expressions/MoodExpression";
import {UnknownExpression} from "../../VoiceData/Expressions/UnknownExpression";
import {PlacementEnum} from "../../VoiceData/Expressions/AbstractExpression";
import {TextAlignmentEnum} from "../../../Common/Enums/TextAlignment";
import {ITextTranslation} from "../../Interfaces/ITextTranslation";
import log from "loglevel";
import { FontStyles } from "../../../Common/Enums/FontStyles";
import { RehearsalExpression } from "../../VoiceData/Expressions/RehearsalExpression";
import { Pedal } from "../../VoiceData/Expressions/ContinuousExpressions/Pedal";

export class ExpressionReader {
    private musicSheet: MusicSheet;
    private placement: PlacementEnum;
    private soundTempo: number;
    private soundDynamic: number;
    private divisions: number;
    private offsetDivisions: number;
    private staffNumber: number;
    private globalStaffIndex: number;
    private directionTimestamp: Fraction;
    private currentMultiTempoExpression: MultiTempoExpression;
    private openContinuousDynamicExpressions: ContinuousDynamicExpression[] = [];
    private openContinuousTempoExpression: ContinuousTempoExpression;
    private activeInstantaneousDynamic: InstantaneousDynamicExpression;
    private openOctaveShift: OctaveShift;
    private lastWedge: ContinuousDynamicExpression;
    private WedgeYPosXml: number;
    private openPedal: Pedal;
    constructor(musicSheet: MusicSheet, instrument: Instrument, staffNumber: number) {
        this.musicSheet = musicSheet;
        this.staffNumber = staffNumber;
        this.globalStaffIndex = musicSheet.getGlobalStaffIndexOfFirstStaff(instrument) + (staffNumber - 1);
        this.initialize();
    }
    public getMultiExpression: MultiExpression;
    public readExpressionParameters(xmlNode: IXmlElement, currentInstrument: Instrument, divisions: number,
                                    inSourceMeasureCurrentFraction: Fraction,
                                    inSourceMeasureFormerFraction: Fraction,
                                    currentMeasureIndex: number,
                                    ignoreDivisionsOffset: boolean): void {
        this.initialize();
        this.divisions = divisions;
        const offsetNode: IXmlElement = xmlNode.element("offset");
        if (offsetNode !== undefined && !ignoreDivisionsOffset) {
            try {
                this.offsetDivisions = parseInt(offsetNode.value, 10);
            } catch (ex) {
                const errorMsg: string = "ReaderErrorMessages/ExpressionOffsetError" + ", Invalid expression offset -> set to default.";
                log.debug("ExpressionReader.readExpressionParameters", errorMsg, ex);
                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                this.offsetDivisions = 0;
            }
        }
        this.directionTimestamp = Fraction.createFromFraction(inSourceMeasureCurrentFraction);
        let offsetFraction: Fraction = new Fraction(Math.abs(this.offsetDivisions), divisions * 4);

        if (this.offsetDivisions > 0) {
            if (inSourceMeasureCurrentFraction.RealValue > 0) {
                offsetFraction = Fraction.multiply(Fraction.minus(inSourceMeasureCurrentFraction, inSourceMeasureFormerFraction), offsetFraction);
                this.directionTimestamp = Fraction.plus(offsetFraction, inSourceMeasureCurrentFraction);
            } else { this.directionTimestamp = Fraction.createFromFraction(offsetFraction); }
        } else if (this.offsetDivisions < 0) {
            if (inSourceMeasureCurrentFraction.RealValue > 0) {
                offsetFraction = Fraction.multiply(Fraction.minus(inSourceMeasureCurrentFraction, inSourceMeasureFormerFraction), offsetFraction);
                this.directionTimestamp = Fraction.minus(inSourceMeasureCurrentFraction, offsetFraction);
            } else { this.directionTimestamp = Fraction.createFromFraction(offsetFraction); }
        }

        // read default-y for wedge node
        let newWedgeYPos: number;
        const directionTypeNode: IXmlElement = xmlNode.element("direction-type");
        let wedgeNode: IXmlElement;
        if (directionTypeNode) {
            wedgeNode = directionTypeNode.element("wedge");
            if (wedgeNode) {
                const yPosAttr: IXmlAttribute = wedgeNode.attribute("default-y");
                if (yPosAttr) {
                    newWedgeYPos = this.readPosition(yPosAttr);
                }
            }
        }
        this.WedgeYPosXml = newWedgeYPos;

        const placeAttr: IXmlAttribute = xmlNode.attribute("placement");
        if (placeAttr) {
            try {
                const placementString: string = placeAttr.value;
                if (placementString === "below") {
                    this.placement = PlacementEnum.Below;
                } else if (placementString === "above") {
                    this.placement = PlacementEnum.Above;
                     }
            } catch (ex) {
                const errorMsg: string = ITextTranslation.translateText(  "ReaderErrorMessages/ExpressionPlacementError",
                                                                          "Invalid expression placement -> set to default.");
                log.debug("ExpressionReader.readExpressionParameters", errorMsg, ex);
                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                this.placement = PlacementEnum.Below;
            }
        }
        if (this.placement === PlacementEnum.NotYetDefined) {
            try {
                if (directionTypeNode) {
                    const dynamicsNode: IXmlElement = directionTypeNode.element("dynamics");
                    if (dynamicsNode) {
                        const defAttr: IXmlAttribute = dynamicsNode.attribute("default-y");
                        if (defAttr) {
                            this.readExpressionPlacement(defAttr, "read dynamics y pos");
                        }
                    }
                    if (wedgeNode) {
                        const defAttr: IXmlAttribute = wedgeNode.attribute("default-y");
                        if (defAttr) {
                            this.readExpressionPlacement(defAttr, "read wedge y pos");
                        }
                    }
                    const wordsNode: IXmlElement = directionTypeNode.element("words");
                    if (wordsNode) {
                        const defAttr: IXmlAttribute = wordsNode.attribute("default-y");
                        if (defAttr) {
                            this.readExpressionPlacement(defAttr, "read words y pos");
                        }
                    }
                    const rehearsalNode: IXmlElement = directionTypeNode.element("rehearsal");
                    if (rehearsalNode) {
                        const defAttr: IXmlAttribute = rehearsalNode.attribute("default-y");
                        if (defAttr) {
                            this.readExpressionPlacement(defAttr, "read rehearsal pos");
                        }
                    }
                }
            } catch (ex) {
                const errorMsg: string = ITextTranslation.translateText(  "ReaderErrorMessages/ExpressionPlacementError",
                                                                          "Invalid expression placement. Set to default.");
                log.debug("ExpressionReader.readExpressionParameters", errorMsg, ex);
                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                this.placement = PlacementEnum.Below;
            }

        }
        if (this.placement === PlacementEnum.NotYetDefined) {
            if (currentInstrument.Staves.length > 1) {
                this.placement = PlacementEnum.Below;
            } else if (currentInstrument.HasLyrics) {
                this.placement = PlacementEnum.Above;
                 } else { this.placement = PlacementEnum.Below; }
        }
    }
    public read(directionNode: IXmlElement, currentMeasure: SourceMeasure,
                inSourceMeasureCurrentFraction: Fraction, inSourceMeasurePreviousFraction: Fraction = undefined): void {
        let isTempoInstruction: boolean = false;
        let isDynamicInstruction: boolean = false;

        const timestampFraction: Fraction = inSourceMeasureCurrentFraction.clone();
        const offsetNode: IXmlElement = directionNode.element("offset");
        if (offsetNode?.value) {
          const offsetValue: number = Number.parseInt(offsetNode.value, 10);
          timestampFraction.Add(new Fraction(offsetValue, 4 * this.divisions));
        }
        // this.directionTimestamp = timestampFraction.clone();
        //   this could be correct, but leads to odd differences with Musescore for elements like dim. and wedges.

        const n: IXmlElement = directionNode.element("sound");
        if (n) {
            const tempoAttr: IXmlAttribute = n.attribute("tempo");
            const dynAttr: IXmlAttribute = n.attribute("dynamics");
            if (tempoAttr) {
                // const match: string[] = tempoAttr.value.match(/^(\d+\.?\d{0,9}|\.\d{1,9})$/);
                const match: string[] = tempoAttr.value.match(/^(\d+)(\.\d+)?$/);
                if (match?.length > 0) {
                    this.soundTempo = Math.round(Number.parseFloat(tempoAttr.value));
                } else {
                    log.info("invalid xml tempo: " + tempoAttr.value);
                    this.soundTempo = 100;
                }
                //console.log(`value: ${tempoAttr.value}\n  soundTempo: ${this.soundTempo}`);
                currentMeasure.TempoInBPM = this.soundTempo;
                if (this.musicSheet.DefaultStartTempoInBpm === 0) {
                    this.musicSheet.DefaultStartTempoInBpm = this.soundTempo;
                }
                this.musicSheet.HasBPMInfo = true;
                isTempoInstruction = true;
            }
            if (dynAttr) {
                const match: string[] = dynAttr.value.match(/\d+/);
                this.soundDynamic = match !== undefined ? parseInt(match[0], 10) : 100;
                isDynamicInstruction = true;
            }
        }
        const dirNode: IXmlElement = directionNode.element("direction-type");
        if (!dirNode) {
            return;
        }
        let dirContentNode: IXmlElement = dirNode.element("metronome");
        if (dirContentNode) {
            const beatUnit: IXmlElement = dirContentNode.element("beat-unit");
            // TODO check second "beat-unit", e.g. quarter = half
            const dotted: boolean = dirContentNode.element("beat-unit-dot") !== undefined;
            const bpm: IXmlElement = dirContentNode.element("per-minute");
            // TODO check print-object = false -> don't render invisible metronome mark
            if (beatUnit !== undefined && bpm) {
                const useCurrentFractionForPositioning: boolean = (dirContentNode.hasAttributes && dirContentNode.attribute("default-x") !== undefined);
                if (useCurrentFractionForPositioning) {
                    this.directionTimestamp = Fraction.createFromFraction(timestampFraction);
                }
                const bpmNumber: number = parseFloat(bpm.value);
                this.createNewTempoExpressionIfNeeded(currentMeasure);
                const instantaneousTempoExpression: InstantaneousTempoExpression =
                    new InstantaneousTempoExpression(undefined,
                                                     this.placement,
                                                     this.staffNumber,
                                                     bpmNumber,
                                                     this.currentMultiTempoExpression,
                                                     true);
                instantaneousTempoExpression.parentMeasure = currentMeasure;
                this.soundTempo = bpmNumber;
                // make sure to take dotted beats into account
                currentMeasure.TempoInBPM = this.soundTempo * (dotted?1.5:1);
                if (this.musicSheet.DefaultStartTempoInBpm === 0) {
                    this.musicSheet.DefaultStartTempoInBpm = this.soundTempo;
                }
                this.musicSheet.HasBPMInfo = true;
                instantaneousTempoExpression.dotted = dotted;
                instantaneousTempoExpression.beatUnit = beatUnit.value;
                this.currentMultiTempoExpression.addExpression(instantaneousTempoExpression, "");
                this.currentMultiTempoExpression.CombinedExpressionsText = "test";
            }
            return;
        }

        dirContentNode = dirNode.element("dynamics");
        if (dirContentNode) {
            const fromNotation: boolean = directionNode.element("notations") !== undefined;
            this.interpretInstantaneousDynamics(dirContentNode, currentMeasure, timestampFraction, fromNotation);
            return;
        }

        dirContentNode = dirNode.element("words");
        if (dirContentNode) {
            if (isTempoInstruction) {
                this.createNewTempoExpressionIfNeeded(currentMeasure);
                this.currentMultiTempoExpression.CombinedExpressionsText = dirContentNode.value;
                const instantaneousTempoExpression: InstantaneousTempoExpression =
                    new InstantaneousTempoExpression(dirContentNode.value, this.placement, this.staffNumber, this.soundTempo, this.currentMultiTempoExpression);
                this.currentMultiTempoExpression.addExpression(instantaneousTempoExpression, "");
            } else if (!isDynamicInstruction) {
                this.interpretWords(dirContentNode, currentMeasure, timestampFraction);
            }
            return;
        }

        dirContentNode = dirNode.element("wedge");
        if (dirContentNode) {
            this.interpretWedge(directionNode, dirContentNode, currentMeasure, inSourceMeasurePreviousFraction, currentMeasure.MeasureNumber);
            return;
        }

        dirContentNode = dirNode.element("rehearsal");
        if (dirContentNode) {
            this.interpretRehearsalMark(dirContentNode, currentMeasure, inSourceMeasureCurrentFraction, currentMeasure.MeasureNumber);
            return;
        }
    }
    /** Usually called at end of last measure. */
    public closeOpenExpressions(sourceMeasure: SourceMeasure, timestamp: Fraction): void {
        for (const openCont of this.openContinuousDynamicExpressions) {
            // add to current stafflinked expression // refactor into closeOpenContinuousDynamic?
            this.createNewMultiExpressionIfNeeded(sourceMeasure, openCont.NumberXml, timestamp);

            this.closeOpenContinuousDynamic(openCont, sourceMeasure, timestamp);
        }
        if (this.openContinuousTempoExpression) {
            this.closeOpenContinuousTempo(Fraction.plus(sourceMeasure.AbsoluteTimestamp, timestamp));
        }
    }
    public addOctaveShift(directionNode: IXmlElement, currentMeasure: SourceMeasure, endTimestamp: Fraction): void {
        let octaveStaffNumber: number = 1;
        const staffNode: IXmlElement = directionNode.element("staff");
        if (staffNode) {
            try {
                octaveStaffNumber = parseInt(staffNode.value, 10);
            } catch (ex) {
                const errorMsg: string = ITextTranslation.translateText(  "ReaderErrorMessages/OctaveShiftStaffError",
                                                                          "Invalid octave shift staff number. Set to default");
                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                octaveStaffNumber = 1;
                log.debug("ExpressionReader.addOctaveShift", errorMsg, ex);
            }
        }
        const directionTypeNode: IXmlElement = directionNode.element("direction-type");
        if (directionTypeNode) {
            const octaveShiftNode: IXmlElement = directionTypeNode.element("octave-shift");
            const placement: PlacementEnum = this.readPlacement(directionNode);
            // if (placement === PlacementEnum.NotYetDefined && this.staffNumber === 1) {
            //     placement = PlacementEnum.Above;
            // }
            if (octaveShiftNode !== undefined && octaveShiftNode.hasAttributes) {
                try {
                    const numberXml: number = this.readNumber(octaveShiftNode);
                    if (octaveShiftNode.attribute("size")) {
                        const size: number = parseInt(octaveShiftNode.attribute("size").value, 10);
                        let octave: number = 0;
                        if (size === 8) {
                            octave = 1;
                        } else if (size === 15) {
                            octave = 2;
                             }
                        let type: string = octaveShiftNode.attribute("type")?.value;
                        if (!type) {
                            if (placement === PlacementEnum.Above) {
                                type = "down";
                            } else if (placement === PlacementEnum.Below) {
                                type = "up";
                            }
                        }
                        if (type === "up" || type === "down") { // unfortunately not always given in MusicXML (e.g. Musescore 3.6.2) even though required
                            const octaveShift: OctaveShift = new OctaveShift(type, octave);
                            octaveShift.StaffNumber = octaveStaffNumber;
                            this.getMultiExpression = this.createNewMultiExpressionIfNeeded(
                                currentMeasure, numberXml);
                            this.getMultiExpression.OctaveShiftStart = octaveShift;
                            octaveShift.ParentStartMultiExpression = this.getMultiExpression;
                            this.openOctaveShift = octaveShift;
                        } else if (type === "stop") {
                            if (this.openOctaveShift) {
                                this.getMultiExpression = this.createNewMultiExpressionIfNeeded(
                                    currentMeasure, this.openOctaveShift.numberXml, endTimestamp);
                                const octaveShiftStartExpression: MultiExpression = this.getMultiExpression;
                                octaveShiftStartExpression.OctaveShiftEnd = this.openOctaveShift;
                                this.openOctaveShift.ParentEndMultiExpression = this.getMultiExpression;
                                this.openOctaveShift = undefined;
                            }
                        } // TODO handle type === "continue"?
                        else if (!type) {
                            log.debug("octave-shift missing type in xml");
                        }
                    }
                } catch (ex) {
                    const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/OctaveShiftError", "Error while reading octave shift.");
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    log.debug("ExpressionReader.addOctaveShift", errorMsg, ex);
                }
            }
        }
    }
    public addPedalMarking(directionNode: IXmlElement, currentMeasure: SourceMeasure, endTimestamp: Fraction): void {
        const directionTypeNode: IXmlElement = directionNode.element("direction-type");
        if (directionTypeNode) {
            const pedalNode: IXmlElement = directionTypeNode.element("pedal");
            if (pedalNode !== undefined && pedalNode.hasAttributes) {
                let sign: boolean = false, line: boolean = false;
                try {
                    if (pedalNode.attribute("line")?.value === "yes") {
                        line = true;
                    } else if (pedalNode.attribute("line")?.value === "no"){
                        line = false;
                        //No line implies sign
                        sign = true;
                    } else if (pedalNode.attribute("sign")?.value === "yes") {
                        sign = true;
                    } else { //if (pedalNode.attribute("sign")?.value === "no"){
                        // only assume sign if explicitly given in one way or another
                        sign = false;
                        line = true;
                    }
                    switch (pedalNode.attribute("type").value) {
                        case "start":
                            //ignore duplicate tags (causes issues when pedals aren't terminated)
                            // if (!this.openPedal || !this.openPedal.ParentStartMultiExpression.AbsoluteTimestamp.Equals(endTimestamp)) {
                            //     this.createNewMultiExpressionIfNeeded(currentMeasure, -1);
                            // }
                            // instead, just end open pedal if there already was one, and create new one
                            if (this.openPedal && this.openPedal.IsLine) {
                                // if we don't check IsLine, the Ped. at the end of Dichterliebe overlaps with a *
                                this.endOpenPedal(currentMeasure);
                            }
                            this.createNewMultiExpressionIfNeeded(currentMeasure, -1);
                            this.openPedal = new Pedal(line, sign);
                            this.getMultiExpression.PedalStart = this.openPedal;
                            this.openPedal.ParentStartMultiExpression = this.getMultiExpression;
                        break;
                        case "stop":
                            if (this.openPedal) {
                                this.endOpenPedal(currentMeasure, endTimestamp);
                            }
                        break;
                        case "change":
                            //Ignore non-line pedals
                            if (this.openPedal && this.openPedal.IsLine) {
                                this.openPedal.ChangeEnd = true;
                                this.createNewMultiExpressionIfNeeded(currentMeasure, -1);
                                this.getMultiExpression.PedalEnd = this.openPedal;
                                this.openPedal.ParentEndMultiExpression = this.getMultiExpression;

                                this.createNewMultiExpressionIfNeeded(currentMeasure, -1);
                                this.openPedal = new Pedal(line, sign);
                                this.openPedal.ChangeBegin = true;
                                this.getMultiExpression.PedalStart = this.openPedal;
                                this.openPedal.ParentStartMultiExpression = this.getMultiExpression;
                            }
                        break;
                        case "continue":
                        break;
                        default:
                        break;
                    }
                } catch (ex) {
                    const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/PedalError", "Error while reading pedal.");
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    log.debug("ExpressionReader.addPedalMarking", errorMsg, ex);
                }
            }
        }
    }
    private endOpenPedal(currentMeasure: SourceMeasure, endTimeStamp?: Fraction): void {
        this.createNewMultiExpressionIfNeeded(currentMeasure, -1, endTimeStamp);
        // unfortunately currentMeasure.Duration doesn't exist here yet, so we can't check pedal.EndsStave
        this.getMultiExpression.PedalEnd = this.openPedal;
        this.openPedal.ParentEndMultiExpression = this.getMultiExpression;
        this.openPedal = undefined;
    }
    private initialize(): void {
        this.placement = PlacementEnum.NotYetDefined;
        this.soundTempo = 0;
        this.soundDynamic = 0;
        this.offsetDivisions = 0;
    }
    private readPlacement(node: IXmlElement): PlacementEnum {
        const value: string = node.attribute("placement")?.value;
        if (value === "above") {
            return PlacementEnum.Above;
        } else if (value === "below") {
            return PlacementEnum.Below;
        } else {
            return PlacementEnum.NotYetDefined;
        }
    }
    private readExpressionPlacement(yPosAttr: IXmlAttribute, catchLogMessage: string): void {
        try {
            const y: number = this.readPosition(yPosAttr);
            if (y < 0) {
                this.placement = PlacementEnum.Below;
            } else if (y > 0) {
                this.placement = PlacementEnum.Above;
            }
        } catch (ex) {
            log.debug("ExpressionReader.readExpressionParameters", catchLogMessage, ex);
        }
    }
    private readPosition(posAttr: IXmlAttribute): number {
        try {
            const xOrY: number = parseInt(posAttr.value, 10);
            if (xOrY < 0) {
                this.placement = PlacementEnum.Below;
            } else if (xOrY > 0) {
                this.placement = PlacementEnum.Above;
            }
            return xOrY;
        } catch (ex) {
            log.debug("ExpressionReader.readExpressionParameters", ex);
        }
    }
    private interpretInstantaneousDynamics(dynamicsNode: IXmlElement,
                                           currentMeasure: SourceMeasure,
                                           inSourceMeasureCurrentFraction: Fraction,
                                           fromNotation: boolean): void {
        if (dynamicsNode.hasElements) {
            if (dynamicsNode.hasAttributes && dynamicsNode.attribute("default-x")) {
                this.directionTimestamp = Fraction.createFromFraction(inSourceMeasureCurrentFraction);
            }
            const numberXml: number = this.readNumber(dynamicsNode); // probably never given, just to comply with createExpressionIfNeeded()
            let expressionText: string = dynamicsNode.elements()[0]?.name; // elements can in rare cases still be empty even though hasElements=true, see #1269
            if (expressionText === "other-dynamics") {
                expressionText = dynamicsNode.elements()[0].value;
            }
            if (expressionText) {
                // ToDo: make duplicate recognition an afterReadingModule, as we can't definitively check here if there is a repetition:
                // Compare with the active dynamic expression and only add it if there is a change in dynamic
                // Exception is when a repetition starts here, where the "repeated" dynamic might be desired.
                // see PR #767 where this was removed
                if (currentMeasure.Rules?.IgnoreRepeatedDynamics) {
                    let dynamicEnum: DynamicEnum;
                    try {
                        dynamicEnum = DynamicEnum[expressionText];
                    } catch (err) {
                        const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/DynamicError", "Error while reading dynamic.");
                        this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                        return;
                    }
                    if (this.activeInstantaneousDynamic?.DynEnum === dynamicEnum) {
                        // repeated dynamic
                        return;
                    }
                }
                if (!fromNotation) {
                    this.createNewMultiExpressionIfNeeded(currentMeasure, numberXml);
                } else {
                    this.createNewMultiExpressionIfNeeded(currentMeasure, numberXml,
                        Fraction.createFromFraction(inSourceMeasureCurrentFraction));
                }
                const instantaneousDynamicExpression: InstantaneousDynamicExpression =
                    new InstantaneousDynamicExpression(
                        expressionText,
                        this.soundDynamic,
                        this.placement,
                        this.staffNumber,
                        currentMeasure);
                instantaneousDynamicExpression.InMeasureTimestamp = inSourceMeasureCurrentFraction.clone();
                this.getMultiExpression.addExpression(instantaneousDynamicExpression, "");
                // addExpression unnecessary now?:
                //const multiExpression = this.getMultiExpression(ExpressionType.InstantaneousDynamic, numberXml);
                //multiExpression.addExpression(instantaneousDynamicExpression, "");
                this.initialize();
                if (this.activeInstantaneousDynamic) {
                    this.activeInstantaneousDynamic.DynEnum = instantaneousDynamicExpression.DynEnum;
                } else {
                    this.activeInstantaneousDynamic = new InstantaneousDynamicExpression(expressionText, 0, PlacementEnum.NotYetDefined, 1, currentMeasure);
                }
                //}
            }
        }
    }
    private interpretWords(wordsNode: IXmlElement, currentMeasure: SourceMeasure, inSourceMeasureCurrentFraction: Fraction): void {
        const text: string = wordsNode.value;
        if (currentMeasure.Rules.IgnoreBracketsWords && (
            /^\(\s*\)$/.test(text) || /^\[\s*\]$/.test(text) // (*) and [*]
        )) { // regex: brackets with arbitrary white space in-between
            return;
        }
        let fontStyle: FontStyles;
        const fontStyleAttr: Attr = wordsNode.attribute("font-style");
        let fontStyleText: string;
        let fontWeightText: string;
        let fontColor: string;
        if (fontStyleAttr) {
            fontStyleText = fontStyleAttr.value;
            if (fontStyleText === "italic") {
                fontStyle = FontStyles.Italic;
            }
        }
        const fontWeightAttr: Attr = wordsNode.attribute("font-weight");
        if (fontWeightAttr) {
            fontWeightText = fontWeightAttr.value;
            if (fontWeightText === "bold") {
                fontStyle = FontStyles.Bold;
                if (fontStyleText === "italic") {
                    fontStyle = FontStyles.BoldItalic;
                }
            }
        }
        const colorAttr: Attr = wordsNode.attribute("color");
        if (colorAttr) {
            fontColor = colorAttr.value;
        }
        let defaultYXml: number;
        if (currentMeasure.Rules.PlaceWordsInsideStafflineFromXml) {
            const defaultYString: string = wordsNode.attribute("default-y")?.value;
            if (defaultYString?.length > 0) {
                defaultYXml = Number.parseInt(defaultYString, 10);
            }
        }
        if (text.length > 0) {
            if (wordsNode.hasAttributes && wordsNode.attribute("default-x")) {
                this.directionTimestamp = Fraction.createFromFraction(inSourceMeasureCurrentFraction);
            }
            if (this.checkIfWordsNodeIsRepetitionInstruction(text)) {
                return;
            }
            this.fillMultiOrTempoExpression(text, currentMeasure, inSourceMeasureCurrentFraction, fontStyle, fontColor, defaultYXml);
            this.initialize();
        }
    }
    private readNumber(node: IXmlElement): number {
        let numberXml: number = 1; // default value
        const numberStringXml: string = node.attribute("number")?.value;
        if (numberStringXml) {
            numberXml = Number.parseInt(numberStringXml, 10);
        }
        return numberXml;
    }
    private interpretWedge(directionNode: IXmlElement, wedgeNode: IXmlElement,
        currentMeasure: SourceMeasure, inSourceMeasureCurrentFraction: Fraction, currentMeasureIndex: number): void {
        if (wedgeNode !== undefined && wedgeNode.hasAttributes && wedgeNode.attribute("default-x")) {
            this.directionTimestamp = Fraction.createFromFraction(inSourceMeasureCurrentFraction);
        }
        const wedgeNumberXml: number = this.readNumber(wedgeNode);

        const typeAttributeString: string = wedgeNode.attribute("type")?.value?.toLowerCase();

        // check for duplicate
        if (this.lastWedge && this.lastWedge.parentMeasure.MeasureNumberXML === currentMeasure.MeasureNumberXML &&
                this.lastWedge.StaffNumber === this.staffNumber &&
                this.placement === this.lastWedge.Placement &&
                this.WedgeYPosXml !== undefined &&
                this.lastWedge.YPosXml === this.WedgeYPosXml &&
                this.lastWedge.StartMultiExpression.Timestamp.Equals(this.directionTimestamp) &&
                this.lastWedge.DynamicType === ContDynamicEnum[typeAttributeString]

        ) {
            // duplicate, ignore
            return;
        }
        //Ending needs to use previous fraction, not current.
        //If current is used, when there is a system break it will mess up
        if (typeAttributeString === "stop") {
            this.createNewMultiExpressionIfNeeded(currentMeasure, wedgeNumberXml, inSourceMeasureCurrentFraction);
            this.getMultiExpression.EndOffsetFraction = new Fraction(this.offsetDivisions, this.divisions * 4);
        } else {
            this.createNewMultiExpressionIfNeeded(currentMeasure, wedgeNumberXml);
        }
        this.addWedge(wedgeNode, currentMeasure, inSourceMeasureCurrentFraction);
        this.initialize();
    }
    private interpretRehearsalMark(
        rehearsalNode: IXmlElement, currentMeasure: SourceMeasure,
        inSourceMeasureCurrentFraction: Fraction, currentMeasureIndex: number): void {
        // TODO create multi expression? for now we just need to have a static rehearsal mark though.
        currentMeasure.rehearsalExpression = new RehearsalExpression(rehearsalNode.value, this.placement);
    }
    private createNewMultiExpressionIfNeeded(currentMeasure: SourceMeasure, numberXml: number,
        timestamp: Fraction = undefined): MultiExpression {
        if (!timestamp) {
            timestamp = this.directionTimestamp;
        }
        let existingMultiExpression: MultiExpression = this.getMultiExpression;
        if (!existingMultiExpression ||
            existingMultiExpression &&
            (existingMultiExpression.SourceMeasureParent !== currentMeasure ||
                existingMultiExpression.numberXml !== numberXml ||
                (existingMultiExpression.SourceMeasureParent === currentMeasure && !existingMultiExpression.Timestamp.Equals(timestamp)))) {
                    this.getMultiExpression = existingMultiExpression = new MultiExpression(currentMeasure, Fraction.createFromFraction(timestamp));
                    this.getMultiExpression.numberXml = numberXml;
            currentMeasure.StaffLinkedExpressions[this.globalStaffIndex].push(existingMultiExpression);
        }
        return existingMultiExpression;
    }

    private createNewTempoExpressionIfNeeded(currentMeasure: SourceMeasure): void {
        if (!this.currentMultiTempoExpression ||
            this.currentMultiTempoExpression.SourceMeasureParent !== currentMeasure ||
            this.currentMultiTempoExpression.Timestamp !== this.directionTimestamp) {
            this.currentMultiTempoExpression = new MultiTempoExpression(currentMeasure, Fraction.createFromFraction(this.directionTimestamp));
            currentMeasure.TempoExpressions.push(this.currentMultiTempoExpression);
        }
    }
    private addWedge(wedgeNode: IXmlElement, currentMeasure: SourceMeasure, inSourceMeasureCurrentFraction: Fraction): void {
        if (wedgeNode !== undefined && wedgeNode.hasAttributes) {
            const numberXml: number = this.readNumber(wedgeNode);
            const type: string = wedgeNode.attribute("type").value.toLowerCase();
            try {
                if (type === "crescendo" || type === "diminuendo") {
                    const continuousDynamicExpression: ContinuousDynamicExpression =
                        new ContinuousDynamicExpression(
                            ContDynamicEnum[type],
                            this.placement,
                            this.staffNumber,
                            currentMeasure,
                            numberXml);
                    this.lastWedge = continuousDynamicExpression;
                    this.lastWedge.YPosXml = this.WedgeYPosXml;
                    this.openContinuousDynamicExpressions.push(continuousDynamicExpression);
                    let multiExpression: MultiExpression = this.getMultiExpression;
                    if (!multiExpression) {
                        multiExpression = this.createNewMultiExpressionIfNeeded(currentMeasure, numberXml);
                    }
                    multiExpression.StartingContinuousDynamic = continuousDynamicExpression;
                    continuousDynamicExpression.StartMultiExpression = multiExpression;
                    if (this.activeInstantaneousDynamic !== undefined &&
                        this.activeInstantaneousDynamic.StaffNumber === continuousDynamicExpression.StaffNumber) {
                        this.activeInstantaneousDynamic = undefined;
                    }
                } else if (type === "stop") {
                    for (const openCont of this.openContinuousDynamicExpressions) {
                        if (openCont.NumberXml === numberXml) {
                            // if (openCont.NumberXml === numberXml) { // was there supposed to be another check here? someone wrote the same check twice.
                            this.closeOpenContinuousDynamic(openCont, currentMeasure, inSourceMeasureCurrentFraction);
                        }
                    }
                }
            } catch (ex) {
                const errorMsg: string = "ReaderErrorMessages/WedgeError" + ", Error while reading Crescendo / Diminuendo.";
                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                log.debug("ExpressionReader.addWedge", errorMsg, ex);
            }
        }
    }
    private fillMultiOrTempoExpression(inputString: string, currentMeasure: SourceMeasure, inSourceMeasureCurrentFraction: Fraction,
        fontStyle: FontStyles, fontColor: string, defaultYXml: number = undefined): void {
        if (!inputString) {
            return;
        }
        const tmpInputString: string = inputString.trim();
        // split string at enumerating words or signs
        //const splitStrings: string[] = tmpInputString.split(/([\s,\r\n]and[\s,\r\n]|[\s,\r\n]und[\s,\r\n]|[\s,\r\n]e[\s,\r\n]|[\s,\r\n])+/g);

        //for (const splitStr of splitStrings) {
        this.createExpressionFromString("", tmpInputString, currentMeasure, inSourceMeasureCurrentFraction, inputString, fontStyle, fontColor, defaultYXml);
        //}
    }
    /*
    private splitStringRecursive(input: [string, string], stringSeparators: string[]): [string, string][] {
        let text: string = input[1];
        let lastSeparator: string = input[0];
        let resultList: [string, string][] = [];
        for (let idx: number = 0, len: number = stringSeparators.length; idx < len; ++idx) {
            let stringSeparator: string = stringSeparators[idx];
            if (text.indexOf(stringSeparator) < 0) {
                continue;
            }
            let splitStrings: string[] = text.split(stringSeparator, StringSplitOptions.RemoveEmptyEntries);

            if (splitStrings.length !== 0) {
                resultList.push(...this.splitStringRecursive([lastSeparator, splitStrings[0]], stringSeparators));
                for (let index: number = 1; index < splitStrings.length; index++) {
                    resultList.push(...this.splitStringRecursive([stringSeparator, splitStrings[index]], stringSeparators));
                }
            } else {
                resultList.push(["", stringSeparator]);
            }
            break;
        }
        if (resultList.length === 0) {
            resultList.push(input);
        }
        return resultList;
    }
    */
    private createExpressionFromString(prefix: string, stringTrimmed: string,
                                       currentMeasure: SourceMeasure, inSourceMeasureCurrentFraction, inputString: string,
                                       fontStyle: FontStyles,
                                       fontColor: string,
                                       defaultYXml: number = undefined): boolean {
        if (InstantaneousTempoExpression.isInputStringInstantaneousTempo(stringTrimmed) ||
            ContinuousTempoExpression.isInputStringContinuousTempo(stringTrimmed)) {
            // first check if there is already a tempo expression with the same function
            if (currentMeasure.TempoExpressions.length > 0) {
                for (let idx: number = 0, len: number = currentMeasure.TempoExpressions.length; idx < len; ++idx) {
                    const multiTempoExpression: MultiTempoExpression = currentMeasure.TempoExpressions[idx];
                    if (multiTempoExpression.Timestamp === this.directionTimestamp &&
                        multiTempoExpression.InstantaneousTempo !== undefined &&
                        multiTempoExpression.InstantaneousTempo.Label.indexOf(stringTrimmed) !== -1) {
                        return false;
                    }
                }
            }
            this.createNewTempoExpressionIfNeeded(currentMeasure); // TODO process fontStyle? (also for other expressions)
            this.currentMultiTempoExpression.CombinedExpressionsText = inputString;
            if (InstantaneousTempoExpression.isInputStringInstantaneousTempo(stringTrimmed)) {
                const instantaneousTempoExpression: InstantaneousTempoExpression = new InstantaneousTempoExpression(  stringTrimmed,
                                                                                                                      this.placement,
                                                                                                                      this.staffNumber,
                                                                                                                      this.soundTempo,
                                                                                                                      this.currentMultiTempoExpression);
                instantaneousTempoExpression.ColorXML = fontColor;
                this.currentMultiTempoExpression.addExpression(instantaneousTempoExpression, prefix);
                return true;
            }
            if (ContinuousTempoExpression.isInputStringContinuousTempo(stringTrimmed)) {
                const continuousTempoExpression: ContinuousTempoExpression = new ContinuousTempoExpression(
                    stringTrimmed,
                    this.placement,
                    this.staffNumber,
                    this.currentMultiTempoExpression);
                continuousTempoExpression.ColorXML = fontColor;
                this.currentMultiTempoExpression.addExpression(continuousTempoExpression, prefix);
                return true;
            }
        }
        if (ContinuousDynamicExpression.isInputStringContinuousDynamic(stringTrimmed)) {
            // || InstantaneousDynamicExpression.isInputStringInstantaneousDynamic(stringTrimmed)
            //   looks like <words> never has instantaneous dynamics like p or sf, those are in <dynamics>.
            // if (InstantaneousDynamicExpression.isInputStringInstantaneousDynamic(stringTrimmed)) {
            //     if (this.openContinuousDynamicExpression !== undefined && !this.openContinuousDynamicExpression.EndMultiExpression) {
            //         this.closeOpenContinuousDynamic();
            //     }
            //     const instantaneousDynamicExpression: InstantaneousDynamicExpression =
            //         new InstantaneousDynamicExpression(
            //             stringTrimmed,
            //             this.soundDynamic,
            //             this.placement,
            //             this.staffNumber,
            //             currentMeasure);
            //     this.getMultiExpression.addExpression(instantaneousDynamicExpression, prefix);
            //     return true;
            // }
            // if (ContinuousDynamicExpression.isInputStringContinuousDynamic(stringTrimmed)) {
            const continuousDynamicExpression: ContinuousDynamicExpression =
                new ContinuousDynamicExpression(
                    undefined,
                    this.placement,
                    this.staffNumber,
                    currentMeasure,
                    -1,
                    stringTrimmed);
            continuousDynamicExpression.ColorXML = fontColor;
            const openWordContinuousDynamic: MultiExpression = this.getMultiExpression;
            if (openWordContinuousDynamic) {
                this.closeOpenContinuousDynamic(openWordContinuousDynamic.StartingContinuousDynamic, currentMeasure, inSourceMeasureCurrentFraction);
            }
            this.createNewMultiExpressionIfNeeded(currentMeasure, -1);
            if (this.activeInstantaneousDynamic !== undefined && this.activeInstantaneousDynamic.StaffNumber === continuousDynamicExpression.StaffNumber) {
                this.activeInstantaneousDynamic = undefined;
            }
            this.openContinuousDynamicExpressions.push(continuousDynamicExpression);
            continuousDynamicExpression.StartMultiExpression = this.getMultiExpression;
            this.getMultiExpression.addExpression(continuousDynamicExpression, prefix);
            return true;
        }
        if (MoodExpression.isInputStringMood(stringTrimmed)) {
            const multiExpression: MultiExpression = this.createNewMultiExpressionIfNeeded(currentMeasure, -1);
            currentMeasure.hasMoodExpressions = true;
            const moodExpression: MoodExpression = new MoodExpression(stringTrimmed, this.placement, this.staffNumber);
            moodExpression.fontStyle = fontStyle;
            moodExpression.ColorXML = fontColor;
            multiExpression.addExpression(moodExpression, prefix);
            return true;
        }

        // create unknown:
        const unknownMultiExpression: MultiExpression = this.createNewMultiExpressionIfNeeded(currentMeasure, -1, inSourceMeasureCurrentFraction);
        // check here first if there might be a tempo expression doublette:
        if (currentMeasure.TempoExpressions.length > 0) {
            for (let idx: number = 0, len: number = currentMeasure.TempoExpressions.length; idx < len; ++idx) {
                const multiTempoExpression: MultiTempoExpression = currentMeasure.TempoExpressions[idx];
                if (multiTempoExpression.Timestamp === this.directionTimestamp &&
                    multiTempoExpression.InstantaneousTempo !== undefined &&
                    multiTempoExpression.EntriesList.length > 0 &&
                    !this.hasDigit(stringTrimmed)) {
                        // if at other parts of the score
                        if (this.globalStaffIndex > 0) {
                            // don't add duplicate TempoExpression
                            if (multiTempoExpression.EntriesList[0].label.indexOf(stringTrimmed) >= 0) {
                                return false;
                        } else {
                            break;
                        }
                    }
                }
            }
        }
        let textAlignment: TextAlignmentEnum = TextAlignmentEnum.CenterBottom;
        if (this.musicSheet.Rules.CompactMode) {
            textAlignment = TextAlignmentEnum.LeftBottom;
        }
        const unknownExpression: UnknownExpression = new UnknownExpression(
            stringTrimmed, this.placement, textAlignment, this.staffNumber);
        unknownExpression.fontStyle = fontStyle;
        unknownExpression.ColorXML = fontColor;
        unknownExpression.defaultYXml = defaultYXml;
        unknownMultiExpression.addExpression(unknownExpression, prefix);
        return false;
    }
    private closeOpenContinuousDynamic(openContinuousDynamicExpression: ContinuousDynamicExpression, endMeasure: SourceMeasure, timestamp: Fraction): void {
        if (!openContinuousDynamicExpression) {
            return;
        }
        const numberXml: number = openContinuousDynamicExpression.NumberXml;
        openContinuousDynamicExpression.EndMultiExpression = this.createNewMultiExpressionIfNeeded(
            endMeasure, numberXml, timestamp);
        openContinuousDynamicExpression.StartMultiExpression.EndingContinuousDynamic = openContinuousDynamicExpression;
        this.openContinuousDynamicExpressions = this.openContinuousDynamicExpressions.filter(dyn => dyn !== openContinuousDynamicExpression);
    }
    private closeOpenContinuousTempo(endTimestamp: Fraction): void {
        this.openContinuousTempoExpression.AbsoluteEndTimestamp = endTimestamp;
        this.openContinuousTempoExpression = undefined;
    }
    private checkIfWordsNodeIsRepetitionInstruction(inputString: string): boolean {
        inputString = inputString.trim().toLowerCase();
        if (inputString === "coda" ||
            inputString === "tocoda" ||
            inputString === "to coda" ||
            inputString === "fine" ||
            inputString === "d.c." ||
            inputString === "dacapo" ||
            inputString === "da capo" ||
            inputString === "d.s." ||
            inputString === "dalsegno" ||
            inputString === "dal segno" ||
            inputString === "d.c. al fine" ||
            inputString === "d.s. al fine" ||
            inputString === "d.c. al coda" ||
            inputString === "d.s. al coda") {
            return true;
        }
        return false;
    }
    private hasDigit(input: string): boolean {
        return /\d/.test(input);
    }
}
