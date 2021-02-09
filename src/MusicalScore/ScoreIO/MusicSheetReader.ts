import {MusicSheet} from "../MusicSheet";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {InstrumentReader} from "./InstrumentReader";
import {IXmlElement} from "../../Common/FileIO/Xml";
import {Instrument} from "../Instrument";
import {ITextTranslation} from "../Interfaces/ITextTranslation";
import {MusicSheetReadingException} from "../Exceptions";
import log from "loglevel";
import {IXmlAttribute} from "../../Common/FileIO/Xml";
import {RhythmInstruction} from "../VoiceData/Instructions/RhythmInstruction";
import {RhythmSymbolEnum} from "../VoiceData/Instructions/RhythmInstruction";
import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {VoiceEntry} from "../VoiceData/VoiceEntry";
import {InstrumentalGroup} from "../InstrumentalGroup";
import {SubInstrument} from "../SubInstrument";
import {MidiInstrument} from "../VoiceData/Instructions/ClefInstruction";
import {AbstractNotationInstruction} from "../VoiceData/Instructions/AbstractNotationInstruction";
import {Label} from "../Label";
import {MusicSymbolModuleFactory} from "./MusicSymbolModuleFactory";
import {IAfterSheetReadingModule} from "../Interfaces/IAfterSheetReadingModule";
import {RepetitionInstructionReader} from "./MusicSymbolModules/RepetitionInstructionReader";
import {RepetitionCalculator} from "./MusicSymbolModules/RepetitionCalculator";
import {EngravingRules} from "../Graphical/EngravingRules";
import { ReaderPluginManager } from "./ReaderPluginManager";

export class MusicSheetReader /*implements IMusicSheetReader*/ {

    constructor(afterSheetReadingModules: IAfterSheetReadingModule[] = undefined, rules: EngravingRules = new EngravingRules()) {
     if (!afterSheetReadingModules) {
       this.afterSheetReadingModules = [];
     } else {
       this.afterSheetReadingModules = afterSheetReadingModules;
     }
     this.repetitionInstructionReader = MusicSymbolModuleFactory.createRepetitionInstructionReader();
     this.repetitionCalculator = MusicSymbolModuleFactory.createRepetitionCalculator();
     this.rules = rules;
    }

    private repetitionInstructionReader: RepetitionInstructionReader;
    private repetitionCalculator: RepetitionCalculator;
    private afterSheetReadingModules: IAfterSheetReadingModule[];
    private musicSheet: MusicSheet;
    private completeNumberOfStaves: number = 0;
    private currentMeasure: SourceMeasure;
    private previousMeasure: SourceMeasure;
    private currentFraction: Fraction;
    private pluginManager: ReaderPluginManager = new ReaderPluginManager();
    public rules: EngravingRules;

    public get PluginManager(): ReaderPluginManager {
        return this.pluginManager;
    }

    public get CompleteNumberOfStaves(): number {
        return this.completeNumberOfStaves;
    }

    private static doCalculationsAfterDurationHasBeenSet(instrumentReaders: InstrumentReader[]): void {
        for (const instrumentReader of instrumentReaders) {
            instrumentReader.doCalculationsAfterDurationHasBeenSet();
        }
    }

    /**
     * Read a music XML file and saves the values in the MusicSheet class.
     * @param root
     * @param path
     * @returns {MusicSheet}
     */
    public createMusicSheet(root: IXmlElement, path: string): MusicSheet {
        try {
            return this._createMusicSheet(root, path);
        } catch (e) {
            log.error("MusicSheetReader.CreateMusicSheet", e);
            return undefined;
        }
    }

    private _removeFromArray(list: any[], elem: any): void {
        const i: number = list.indexOf(elem);
        if (i !== -1) {
            list.splice(i, 1);
        }
    }

    // Trim from a string also newlines
    private trimString(str: string): string {
        return str.replace(/^\s+|\s+$/g, "");
    }

    private _lastElement<T>(list: T[]): T {
        return list[list.length - 1];
    }

    //public SetPhonicScoreInterface(phonicScoreInterface: IPhonicScoreInterface): void {
    //  this.phonicScoreInterface = phonicScoreInterface;
    //}
    //public ReadMusicSheetParameters(sheetObject: MusicSheetParameterObject, root: IXmlElement, path: string): MusicSheetParameterObject {
    //  this.musicSheet = new MusicSheet();
    //  if (root) {
    //    this.pushSheetLabels(root, path);
    //    if (this.musicSheet.Title) {
    //      sheetObject.Title = this.musicSheet.Title.text;
    //    }
    //    if (this.musicSheet.Composer) {
    //      sheetObject.Composer = this.musicSheet.Composer.text;
    //    }
    //    if (this.musicSheet.Lyricist) {
    //      sheetObject.Lyricist = this.musicSheet.Lyricist.text;
    //    }
    //    let partlistNode: IXmlElement = root.element("part-list");
    //    let partList: IXmlElement[] = partlistNode.elements();
    //    this.createInstrumentGroups(partList);
    //    for (let idx: number = 0, len: number = this.musicSheet.Instruments.length; idx < len; ++idx) {
    //      let instr: Instrument = this.musicSheet.Instruments[idx];
    //      sheetObject.InstrumentList.push(__init(new MusicSheetParameterObject.LibrarySheetInstrument(), { name: instr.name }));
    //    }
    //  }
    //  return sheetObject;
    //}

    private _createMusicSheet(root: IXmlElement, path: string): MusicSheet {
        const instrumentReaders: InstrumentReader[] = [];
        let sourceMeasureCounter: number = 0;
        this.musicSheet = new MusicSheet();
        this.musicSheet.Path = path;
        this.musicSheet.Rules = this.rules;
        if (!root) {
            throw new MusicSheetReadingException("Undefined root element");
        }
        this.pushSheetLabels(root, path);
        const partlistNode: IXmlElement = root.element("part-list");
        if (!partlistNode) {
            throw new MusicSheetReadingException("Undefined partListNode");
        }

        const partInst: IXmlElement[] = root.elements("part");
        const partList: IXmlElement[] = partlistNode.elements();
        this.initializeReading(partList, partInst, instrumentReaders);
        let couldReadMeasure: boolean = true;
        this.currentFraction = new Fraction(0, 1);
        let octavePlusOneEncoding: boolean = false; // GuitarPro and Sibelius give octaves -1 apparently
        let encoding: IXmlElement = root.element("identification");
        if (encoding) {
            encoding = encoding.element("encoding");
        }
        if (encoding) {
            encoding = encoding.element("software");
        }
        if (encoding !== undefined && (encoding.value === "Guitar Pro 5")) { //|| encoding.value.startsWith("Sibelius")
            octavePlusOneEncoding = true;
        }

        while (couldReadMeasure) {
            // TODO changing this.rules.PartAndSystemAfterFinalBarline requires a reload of the piece for measure numbers to be updated
            if (this.currentMeasure !== undefined && this.currentMeasure.HasEndLine && this.rules.NewPartAndSystemAfterFinalBarline) {
                sourceMeasureCounter = 0;
            }
            this.currentMeasure = new SourceMeasure(this.completeNumberOfStaves, this.musicSheet.Rules);
            for (const instrumentReader of instrumentReaders) {
                try {
                    couldReadMeasure = couldReadMeasure && instrumentReader.readNextXmlMeasure(
                        this.currentMeasure, this.currentFraction, octavePlusOneEncoding);
                } catch (e) {
                    const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/InstrumentError", "Error while reading instruments.");
                    throw new MusicSheetReadingException(errorMsg, e);
                }

            }
            if (couldReadMeasure) {
                this.musicSheet.addMeasure(this.currentMeasure);
                this.checkIfRhythmInstructionsAreSetAndEqual(instrumentReaders);
                this.checkSourceMeasureForNullEntries();
                sourceMeasureCounter = this.setSourceMeasureDuration(instrumentReaders, sourceMeasureCounter);
                MusicSheetReader.doCalculationsAfterDurationHasBeenSet(instrumentReaders);
                this.currentMeasure.AbsoluteTimestamp = this.currentFraction.clone();
                this.musicSheet.SheetErrors.finalizeMeasure(this.currentMeasure.MeasureNumber);
                this.currentFraction.Add(this.currentMeasure.Duration);
                this.previousMeasure = this.currentMeasure;
            }
        }

        if (this.repetitionInstructionReader) {
            this.repetitionInstructionReader.removeRedundantInstructions();
            if (this.repetitionCalculator) {
                this.repetitionCalculator.calculateRepetitions(this.musicSheet, this.repetitionInstructionReader.repetitionInstructions);
            }
        }
        this.musicSheet.checkForInstrumentWithNoVoice();
        this.musicSheet.fillStaffList();
        //this.musicSheet.DefaultStartTempoInBpm = this.musicSheet.SheetPlaybackSetting.BeatsPerMinute;
        for (let idx: number = 0, len: number = this.afterSheetReadingModules.length; idx < len; ++idx) {
         const afterSheetReadingModule: IAfterSheetReadingModule = this.afterSheetReadingModules[idx];
         afterSheetReadingModule.calculate(this.musicSheet);
        }

        //this.musicSheet.DefaultStartTempoInBpm = this.musicSheet.SourceMeasures[0].TempoInBPM;
        this.musicSheet.userStartTempoInBPM = this.musicSheet.userStartTempoInBPM || this.musicSheet.DefaultStartTempoInBpm;

        return this.musicSheet;
    }

    private initializeReading(partList: IXmlElement[], partInst: IXmlElement[], instrumentReaders: InstrumentReader[]): void {
        const instrumentDict: { [_: string]: Instrument } = this.createInstrumentGroups(partList);
        this.completeNumberOfStaves = this.getCompleteNumberOfStavesFromXml(partInst);
        if (partInst.length !== 0) {
            this.repetitionInstructionReader.MusicSheet = this.musicSheet;
            this.currentFraction = new Fraction(0, 1);
            this.currentMeasure = undefined;
            this.previousMeasure = undefined;
        }
        let counter: number = 0;
        for (const node of partInst) {
            const idNode: IXmlAttribute = node.attribute("id");
            if (idNode) {
                const currentInstrument: Instrument = instrumentDict[idNode.value];
                const xmlMeasureList: IXmlElement[] = node.elements("measure");
                let instrumentNumberOfStaves: number = 1;
                try {
                    instrumentNumberOfStaves = this.getInstrumentNumberOfStavesFromXml(node);
                } catch (err) {
                    const errorMsg: string = ITextTranslation.translateText(
                        "ReaderErrorMessages/InstrumentStavesNumberError",
                        "Invalid number of staves at instrument: "
                    );
                    this.musicSheet.SheetErrors.push(errorMsg + currentInstrument.Name);
                    continue;
                }

                currentInstrument.createStaves(instrumentNumberOfStaves);
                instrumentReaders.push(new InstrumentReader(this.pluginManager, this.repetitionInstructionReader, xmlMeasureList, currentInstrument));
                if (this.repetitionInstructionReader) {
                    this.repetitionInstructionReader.xmlMeasureList[counter] = xmlMeasureList;
                }
                counter++;
            }
        }
    }

    /**
     * Check if all (should there be any apart from the first Measure) [[RhythmInstruction]]s in the [[SourceMeasure]] are the same.
     *
     * If not, then the max [[RhythmInstruction]] (Fraction) is set to all staves.
     * Also, if it happens to have the same [[RhythmInstruction]]s in RealValue but given in Symbol AND Fraction, then the Fraction prevails.
     * @param instrumentReaders
     */
    private checkIfRhythmInstructionsAreSetAndEqual(instrumentReaders: InstrumentReader[]): void {
        const rhythmInstructions: RhythmInstruction[] = [];
        for (let i: number = 0; i < this.completeNumberOfStaves; i++) {
            if (this.currentMeasure.FirstInstructionsStaffEntries[i]) {
                const last: AbstractNotationInstruction = this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions[
                this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.length - 1
                    ];
                if (last instanceof RhythmInstruction) {
                    rhythmInstructions.push(<RhythmInstruction>last);
                }
            }
        }
        let maxRhythmValue: number = 0.0;
        let index: number = -1;
        for (let idx: number = 0, len: number = rhythmInstructions.length; idx < len; ++idx) {
            const rhythmInstruction: RhythmInstruction = rhythmInstructions[idx];
            if (rhythmInstruction.Rhythm.RealValue > maxRhythmValue) {
                if (this.areRhythmInstructionsMixed(rhythmInstructions) && rhythmInstruction.SymbolEnum !== RhythmSymbolEnum.NONE) {
                    continue;
                }
                maxRhythmValue = rhythmInstruction.Rhythm.RealValue;
                index = rhythmInstructions.indexOf(rhythmInstruction);
            }
        }
        if (rhythmInstructions.length > 0 && rhythmInstructions.length < this.completeNumberOfStaves) {
            const rhythmInstruction: RhythmInstruction = rhythmInstructions[index].clone();
            for (let i: number = 0; i < this.completeNumberOfStaves; i++) {
                if (
                    this.currentMeasure.FirstInstructionsStaffEntries[i] !== undefined &&
                    !(this._lastElement(this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions) instanceof RhythmInstruction)
                ) {
                    this.currentMeasure.FirstInstructionsStaffEntries[i].removeAllInstructionsOfTypeRhythmInstruction();
                    this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.push(rhythmInstruction.clone());
                }
                if (!this.currentMeasure.FirstInstructionsStaffEntries[i]) {
                    this.currentMeasure.FirstInstructionsStaffEntries[i] = new SourceStaffEntry(undefined, undefined);
                    this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.push(rhythmInstruction.clone());
                }
            }
            for (let idx: number = 0, len: number = instrumentReaders.length; idx < len; ++idx) {
                const instrumentReader: InstrumentReader = instrumentReaders[idx];
                instrumentReader.ActiveRhythm = rhythmInstruction;
            }
        }
        if (rhythmInstructions.length === 0 && this.currentMeasure === this.musicSheet.SourceMeasures[0]) {
            const rhythmInstruction: RhythmInstruction = new RhythmInstruction(new Fraction(4, 4, 0, false), RhythmSymbolEnum.NONE);
            for (let i: number = 0; i < this.completeNumberOfStaves; i++) {
                if (!this.currentMeasure.FirstInstructionsStaffEntries[i]) {
                    this.currentMeasure.FirstInstructionsStaffEntries[i] = new SourceStaffEntry(undefined, undefined);
                } else {
                    this.currentMeasure.FirstInstructionsStaffEntries[i].removeAllInstructionsOfTypeRhythmInstruction();
                }
                this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.push(rhythmInstruction);
            }
            for (let idx: number = 0, len: number = instrumentReaders.length; idx < len; ++idx) {
                const instrumentReader: InstrumentReader = instrumentReaders[idx];
                instrumentReader.ActiveRhythm = rhythmInstruction;
            }
        }
        for (let idx: number = 0, len: number = rhythmInstructions.length; idx < len; ++idx) {
            const rhythmInstruction: RhythmInstruction = rhythmInstructions[idx];
            if (rhythmInstruction.Rhythm.RealValue < maxRhythmValue) {
                if (this._lastElement(
                        this.currentMeasure.FirstInstructionsStaffEntries[rhythmInstructions.indexOf(rhythmInstruction)].Instructions
                    ) instanceof RhythmInstruction) {
                    // TODO Test correctness
                    const instrs: AbstractNotationInstruction[] =
                        this.currentMeasure.FirstInstructionsStaffEntries[rhythmInstructions.indexOf(rhythmInstruction)].Instructions;
                    instrs[instrs.length - 1] = rhythmInstructions[index].clone();
                }
            }
            if (
                Math.abs(rhythmInstruction.Rhythm.RealValue - maxRhythmValue) < 0.000001 &&
                rhythmInstruction.SymbolEnum !== RhythmSymbolEnum.NONE &&
                this.areRhythmInstructionsMixed(rhythmInstructions)
            ) {
                rhythmInstruction.SymbolEnum = RhythmSymbolEnum.NONE;
            }
        }
    }

    /**
     * True in case of 4/4 and COMMON TIME (or 2/2 and CUT TIME)
     * @param rhythmInstructions
     * @returns {boolean}
     */
    private areRhythmInstructionsMixed(rhythmInstructions: RhythmInstruction[]): boolean {
        for (let i: number = 1; i < rhythmInstructions.length; i++) {
            if (
                Math.abs(rhythmInstructions[i].Rhythm.RealValue - rhythmInstructions[0].Rhythm.RealValue) < 0.000001 &&
                rhythmInstructions[i].SymbolEnum !== rhythmInstructions[0].SymbolEnum
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Set the [[Measure]]'s duration taking into account the longest [[Instrument]] duration and the active Rhythm read from XML.
     * @param instrumentReaders
     * @param sourceMeasureCounter
     * @returns {number}
     */
    private setSourceMeasureDuration(instrumentReaders: InstrumentReader[], sourceMeasureCounter: number): number {
        let activeRhythm: Fraction = new Fraction(0, 1);
        const instrumentsMaxTieNoteFractions: Fraction[] = [];
        for (const instrumentReader of instrumentReaders) {
            instrumentsMaxTieNoteFractions.push(instrumentReader.MaxTieNoteFraction);
            const activeRythmMeasure: Fraction = instrumentReader.ActiveRhythm.Rhythm;
            if (activeRhythm.lt(activeRythmMeasure)) {
                activeRhythm = new Fraction(activeRythmMeasure.Numerator, activeRythmMeasure.Denominator, 0, false);
            }
        }
        const instrumentsDurations: Fraction[] = this.currentMeasure.calculateInstrumentsDuration(this.musicSheet, instrumentsMaxTieNoteFractions);
        let maxInstrumentDuration: Fraction = new Fraction(0, 1);
        for (const instrumentsDuration of instrumentsDurations) {
            if (maxInstrumentDuration.lt(instrumentsDuration)) {
                maxInstrumentDuration = instrumentsDuration;
            }
        }
        if (Fraction.Equal(maxInstrumentDuration, activeRhythm)) {
            this.checkFractionsForEquivalence(maxInstrumentDuration, activeRhythm);
        } else {
            if (maxInstrumentDuration.lt(activeRhythm)) {
                maxInstrumentDuration = this.currentMeasure.reverseCheck(this.musicSheet, maxInstrumentDuration);
                this.checkFractionsForEquivalence(maxInstrumentDuration, activeRhythm);
            }
        }
        this.currentMeasure.ImplicitMeasure = this.checkIfMeasureIsImplicit(maxInstrumentDuration, activeRhythm);
        if (!this.currentMeasure.ImplicitMeasure) {
            sourceMeasureCounter++;
        }
        this.currentMeasure.Duration = maxInstrumentDuration; // can be 1/1 in a 4/4 time signature
        this.currentMeasure.ActiveTimeSignature = activeRhythm;
        this.currentMeasure.MeasureNumber = sourceMeasureCounter;
        for (let i: number = 0; i < instrumentsDurations.length; i++) {
            const instrumentsDuration: Fraction = instrumentsDurations[i];
            if (
                (this.currentMeasure.ImplicitMeasure && instrumentsDuration !== maxInstrumentDuration) ||
                !Fraction.Equal(instrumentsDuration, activeRhythm) &&
                !this.allInstrumentsHaveSameDuration(instrumentsDurations, maxInstrumentDuration)
            ) {
                const firstStaffIndexOfInstrument: number = this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.musicSheet.Instruments[i]);
                for (let staffIndex: number = 0; staffIndex < this.musicSheet.Instruments[i].Staves.length; staffIndex++) {
                    if (!this.graphicalMeasureIsEmpty(firstStaffIndexOfInstrument + staffIndex)) {
                        this.currentMeasure.setErrorInGraphicalMeasure(firstStaffIndexOfInstrument + staffIndex, true);
                        const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/MissingNotesError",
                                                                                "Given Notes don't correspond to measure duration.");
                        this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    }
                }
            }
        }
        return sourceMeasureCounter;
    }

    /**
     * Check the Fractions for Equivalence and if so, sets maxInstrumentDuration's members accordingly.
     * *
     * Example: if maxInstrumentDuration = 1/1 and sourceMeasureDuration = 4/4, maxInstrumentDuration becomes 4/4.
     * @param maxInstrumentDuration
     * @param activeRhythm
     */
    private checkFractionsForEquivalence(maxInstrumentDuration: Fraction, activeRhythm: Fraction): void {
        if (activeRhythm.Denominator > maxInstrumentDuration.Denominator) {
            const factor: number = activeRhythm.Denominator / maxInstrumentDuration.Denominator;
            maxInstrumentDuration.expand(factor);
        }
    }

    /**
     * Handle the case of an implicit [[SourceMeasure]].
     * @param maxInstrumentDuration
     * @param activeRhythm
     * @returns {boolean}
     */
    private checkIfMeasureIsImplicit(maxInstrumentDuration: Fraction, activeRhythm: Fraction): boolean {
        if (!this.previousMeasure && maxInstrumentDuration.lt(activeRhythm)) {
            return true;
        }
        if (this.previousMeasure) {
            return Fraction.plus(this.previousMeasure.Duration, maxInstrumentDuration).Equals(activeRhythm);
        }
        return false;
    }

    /**
     * Check the Duration of all the given Instruments.
     * @param instrumentsDurations
     * @param maxInstrumentDuration
     * @returns {boolean}
     */
    private allInstrumentsHaveSameDuration(instrumentsDurations: Fraction[], maxInstrumentDuration: Fraction): boolean {
        let counter: number = 0;
        for (let idx: number = 0, len: number = instrumentsDurations.length; idx < len; ++idx) {
            const instrumentsDuration: Fraction = instrumentsDurations[idx];
            if (instrumentsDuration.Equals(maxInstrumentDuration)) {
                counter++;
            }
        }
        return (counter === instrumentsDurations.length && maxInstrumentDuration !== new Fraction(0, 1));
    }

    private graphicalMeasureIsEmpty(index: number): boolean {
        let counter: number = 0;
        for (let i: number = 0; i < this.currentMeasure.VerticalSourceStaffEntryContainers.length; i++) {
            if (!this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[index]) {
                counter++;
            }
        }
        return (counter === this.currentMeasure.VerticalSourceStaffEntryContainers.length);
    }

    /**
     * Check a [[SourceMeasure]] for possible empty / undefined entries ([[VoiceEntry]], [[SourceStaffEntry]], VerticalContainer)
     * (caused from TieAlgorithm removing EndTieNote) and removes them if completely empty / null
     */
    private checkSourceMeasureForNullEntries(): void {
        for (let i: number = this.currentMeasure.VerticalSourceStaffEntryContainers.length - 1; i >= 0; i--) {
            for (let j: number = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.length - 1; j >= 0; j--) {
                const sourceStaffEntry: SourceStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[j];
                if (sourceStaffEntry) {
                    for (let k: number = sourceStaffEntry.VoiceEntries.length - 1; k >= 0; k--) {
                        const voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[k];
                        if (voiceEntry.Notes.length === 0) {
                            this._removeFromArray(voiceEntry.ParentVoice.VoiceEntries, voiceEntry);
                            this._removeFromArray(sourceStaffEntry.VoiceEntries, voiceEntry);
                        }
                    }
                }
                if (sourceStaffEntry !== undefined && sourceStaffEntry.VoiceEntries.length === 0) {
                    this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[j] = undefined;
                }
            }
        }
        for (let i: number = this.currentMeasure.VerticalSourceStaffEntryContainers.length - 1; i >= 0; i--) {
            let counter: number = 0;
            for (let idx: number = 0, len: number = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.length; idx < len; ++idx) {
                const sourceStaffEntry: SourceStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[idx];
                if (!sourceStaffEntry) {
                    counter++;
                }
            }
            if (counter === this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.length) {
                this._removeFromArray(this.currentMeasure.VerticalSourceStaffEntryContainers, this.currentMeasure.VerticalSourceStaffEntryContainers[i]);
            }
        }
    }

    /**
     * Read the XML file and creates the main sheet Labels.
     * @param root
     * @param filePath
     */
    private pushSheetLabels(root: IXmlElement, filePath: string): void {
        this.readComposer(root);
        this.readTitle(root);
        try {
            if (!this.musicSheet.Title || !this.musicSheet.Composer) {
                this.readTitleAndComposerFromCredits(root); // this can also throw an error
            }
        } catch (ex) {
            log.info("MusicSheetReader.pushSheetLabels", "readTitleAndComposerFromCredits", ex);
        }
        try {
            if (!this.musicSheet.Title) {
                const barI: number = Math.max(
                    0, filePath.lastIndexOf("/"), filePath.lastIndexOf("\\")
                );
                const filename: string = filePath.substr(barI);
                const filenameSplits: string[] = filename.split(".", 1);
                this.musicSheet.Title = new Label(filenameSplits[0]);
            }
        } catch (ex) {
            log.info("MusicSheetReader.pushSheetLabels", "read title from file name", ex);
        }
    }

    // Checks whether _elem_ has an attribute with value _val_.
    private presentAttrsWithValue(elem: IXmlElement, val: string): boolean {
        for (const attr of elem.attributes()) {
            if (attr.value === val) {
                return true;
            }
        }
        return false;
    }

    private readComposer(root: IXmlElement): void {
        const identificationNode: IXmlElement = root.element("identification");
        if (identificationNode) {
            const creators: IXmlElement[] = identificationNode.elements("creator");
            for (let idx: number = 0, len: number = creators.length; idx < len; ++idx) {
                const creator: IXmlElement = creators[idx];
                if (creator.hasAttributes) {
                    if (this.presentAttrsWithValue(creator, "composer")) {
                        this.musicSheet.Composer = new Label(this.trimString(creator.value));
                        continue;
                    }
                    if (this.presentAttrsWithValue(creator, "lyricist") || this.presentAttrsWithValue(creator, "poet")) {
                        this.musicSheet.Lyricist = new Label(this.trimString(creator.value));
                    }
                }
            }
        }
    }

    private readTitleAndComposerFromCredits(root: IXmlElement): void {
        const systemYCoordinates: number = this.computeSystemYCoordinates(root);
        if (systemYCoordinates === 0) {
            return;
        }
        let largestTitleCreditSize: number = 1;
        let finalTitle: string = undefined;
        let largestCreditYInfo: number = 0;
        let finalSubtitle: string = undefined;
        let possibleTitle: string = undefined;
        const creditElements: IXmlElement[] = root.elements("credit");
        for (let idx: number = 0, len: number = creditElements.length; idx < len; ++idx) {
            const credit: IXmlElement = creditElements[idx];
            if (!credit.attribute("page")) {
                return;
            }
            if (credit.attribute("page").value === "1") {
                let creditChild: IXmlElement = undefined;
                if (credit) {
                    creditChild = credit.element("credit-words");
                    if (!creditChild.attribute("justify")) {
                        break;
                    }
                    const creditJustify: string = creditChild.attribute("justify")?.value;
                    const creditY: string = creditChild.attribute("default-y")?.value;
                    // eslint-disable-next-line no-null/no-null
                    const creditYGiven: boolean = creditY !== undefined && creditY !== null;
                    const creditYInfo: number = creditYGiven ? parseFloat(creditY) : Number.MIN_VALUE;
                    if (creditYGiven && creditYInfo > systemYCoordinates) {
                        if (!this.musicSheet.Title) {
                            const creditSize: string = creditChild.attribute("font-size").value;
                            const titleCreditSizeInt: number = parseFloat(creditSize);
                            if (largestTitleCreditSize < titleCreditSizeInt) {
                                largestTitleCreditSize = titleCreditSizeInt;
                                finalTitle = creditChild.value;
                            }
                        }
                        if (!this.musicSheet.Subtitle) {
                            if (creditJustify !== "right" && creditJustify !== "left") {
                                if (largestCreditYInfo < creditYInfo) {
                                    largestCreditYInfo = creditYInfo;
                                    if (possibleTitle) {
                                        finalSubtitle = possibleTitle;
                                        possibleTitle = creditChild.value;
                                    } else {
                                        possibleTitle = creditChild.value;
                                    }
                                }
                            }
                        }
                        if (!(this.musicSheet.Composer !== undefined && this.musicSheet.Lyricist)) {
                            switch (creditJustify) {
                                case "right":
                                    this.musicSheet.Composer = new Label(this.trimString(creditChild.value));
                                    break;
                                case "left":
                                    this.musicSheet.Lyricist = new Label(this.trimString(creditChild.value));
                                    break;
                                default:
                                    break;
                            }
                        }
                    }
                }
            }
        }
        if (!this.musicSheet.Title && finalTitle) {
            this.musicSheet.Title = new Label(this.trimString(finalTitle));
        }
        if (!this.musicSheet.Subtitle && finalSubtitle) {
            this.musicSheet.Subtitle = new Label(this.trimString(finalSubtitle));
        }
    }

    private computeSystemYCoordinates(root: IXmlElement): number {
        if (!root.element("defaults")) {
            return 0;
        }
        let paperHeight: number = 0;
        let topSystemDistance: number = 0;
        try {
            const defi: string = root.element("defaults").element("page-layout").element("page-height").value;
            paperHeight = parseFloat(defi);
        } catch (e) {
            log.info("MusicSheetReader.computeSystemYCoordinates(): couldn't find page height, not reading title/composer.");
            return 0;
        }
        let found: boolean = false;
        const parts: IXmlElement[] = root.elements("part");
        for (let idx: number = 0, len: number = parts.length; idx < len; ++idx) {
            const measures: IXmlElement[] = parts[idx].elements("measure");
            for (let idx2: number = 0, len2: number = measures.length; idx2 < len2; ++idx2) {
                const measure: IXmlElement = measures[idx2];
                if (measure.element("print")) {
                    const systemLayouts: IXmlElement[] = measure.element("print").elements("system-layout");
                    for (let idx3: number = 0, len3: number = systemLayouts.length; idx3 < len3; ++idx3) {
                        const syslab: IXmlElement = systemLayouts[idx3];
                        if (syslab.element("top-system-distance")) {
                            const topSystemDistanceString: string = syslab.element("top-system-distance").value;
                            topSystemDistance = parseFloat(topSystemDistanceString);
                            found = true;
                            break;
                        }
                    }
                    break;
                }
            }
            if (found) {
                break;
            }
        }
        if (root.element("defaults").element("system-layout")) {
            const syslay: IXmlElement = root.element("defaults").element("system-layout");
            if (syslay.element("top-system-distance")) {
                const topSystemDistanceString: string = root.element("defaults").element("system-layout").element("top-system-distance").value;
                topSystemDistance = parseFloat(topSystemDistanceString);
            }
        }
        if (topSystemDistance === 0) {
            return 0;
        }
        return paperHeight - topSystemDistance;
    }

    private readTitle(root: IXmlElement): void {
        const titleNode: IXmlElement = root.element("work");
        let titleNodeChild: IXmlElement = undefined;
        if (titleNode) {
            titleNodeChild = titleNode.element("work-title");
            if (titleNodeChild && titleNodeChild.value) {
                this.musicSheet.Title = new Label(this.trimString(titleNodeChild.value));
            }
        }
        const movementNode: IXmlElement = root.element("movement-title");
        let finalSubTitle: string = "";
        if (movementNode) {
            if (!this.musicSheet.Title) {
                this.musicSheet.Title = new Label(this.trimString(movementNode.value));
            } else {
                finalSubTitle = this.trimString(movementNode.value);
            }
        }
        if (titleNode) {
            const subtitleNodeChild: IXmlElement = titleNode.element("work-number");
            if (subtitleNodeChild) {
                const workNumber: string = subtitleNodeChild.value;
                if (workNumber) {
                    if (finalSubTitle === "") {
                        finalSubTitle = workNumber;
                    } else {
                        finalSubTitle = finalSubTitle + ", " + workNumber;
                    }
                }
            }
        }
        if (finalSubTitle
        ) {
            this.musicSheet.Subtitle = new Label(finalSubTitle);
        }
    }

    /**
     * Build the [[InstrumentalGroup]]s and [[Instrument]]s.
     * @param entryList
     * @returns {{}}
     */
    private createInstrumentGroups(entryList: IXmlElement[]): { [_: string]: Instrument } {
        let instrumentId: number = 0;
        const instrumentDict: { [_: string]: Instrument } = {};
        let currentGroup: InstrumentalGroup;
        try {
            const entryArray: IXmlElement[] = entryList;
            for (let idx: number = 0, len: number = entryArray.length; idx < len; ++idx) {
                const node: IXmlElement = entryArray[idx];
                if (node.name === "score-part") {
                    const instrIdString: string = node.attribute("id").value;
                    const instrument: Instrument = new Instrument(instrumentId, instrIdString, this.musicSheet, currentGroup);
                    instrumentId++;
                    const partElements: IXmlElement[] = node.elements();
                    for (let idx2: number = 0, len2: number = partElements.length; idx2 < len2; ++idx2) {
                        const partElement: IXmlElement = partElements[idx2];
                        try {
                            if (partElement.name === "part-name") {
                                instrument.Name = partElement.value;
                                if (partElement.attribute("print-object") &&
                                   partElement.attribute("print-object").value === "no") {
                                    instrument.NameLabel.print = false;
                                }
                            } else if (partElement.name === "part-abbreviation") {
                                instrument.PartAbbreviation = partElement.value;
                            } else if (partElement.name === "score-instrument") {
                                const subInstrument: SubInstrument = new SubInstrument(instrument);
                                subInstrument.idString = partElement.firstAttribute.value;
                                instrument.SubInstruments.push(subInstrument);
                                const subElement: IXmlElement = partElement.element("instrument-name");
                                if (subElement) {
                                    subInstrument.name = subElement.value;
                                    subInstrument.setMidiInstrument(subElement.value);
                                }
                            } else if (partElement.name === "midi-instrument") {
                                let subInstrument: SubInstrument = instrument.getSubInstrument(partElement.firstAttribute.value);
                                for (let idx3: number = 0, len3: number = instrument.SubInstruments.length; idx3 < len3; ++idx3) {
                                    const subInstr: SubInstrument = instrument.SubInstruments[idx3];
                                    if (subInstr.idString === partElement.value) {
                                        subInstrument = subInstr;
                                        break;
                                    }
                                }
                                const instrumentElements: IXmlElement[] = partElement.elements();
                                for (let idx3: number = 0, len3: number = instrumentElements.length; idx3 < len3; ++idx3) {
                                    const instrumentElement: IXmlElement = instrumentElements[idx3];
                                    try {
                                        if (instrumentElement.name === "midi-channel") {
                                            if (parseInt(instrumentElement.value, 10) === 10) {
                                                instrument.MidiInstrumentId = MidiInstrument.Percussion;
                                            }
                                        } else if (instrumentElement.name === "midi-program") {
                                            if (instrument.SubInstruments.length > 0 && instrument.MidiInstrumentId !== MidiInstrument.Percussion) {
                                                subInstrument.midiInstrumentID = <MidiInstrument>Math.max(0, parseInt(instrumentElement.value, 10) - 1);
                                            }
                                        } else if (instrumentElement.name === "midi-unpitched") {
                                            subInstrument.fixedKey = Math.max(0, parseInt(instrumentElement.value, 10));
                                        } else if (instrumentElement.name === "volume") {
                                            try {
                                                const result: number = parseFloat(instrumentElement.value);
                                                subInstrument.volume = result / 127.0;
                                            } catch (ex) {
                                                log.debug("ExpressionReader.readExpressionParameters", "read volume", ex);
                                            }

                                        } else if (instrumentElement.name === "pan") {
                                            try {
                                                const result: number = parseFloat(instrumentElement.value);
                                                subInstrument.pan = result / 64.0;
                                            } catch (ex) {
                                                log.debug("ExpressionReader.readExpressionParameters", "read pan", ex);
                                            }

                                        }
                                    } catch (ex) {
                                        log.info("MusicSheetReader.createInstrumentGroups midi settings: ", ex);
                                    }

                                }
                            }
                        } catch (ex) {
                            log.info("MusicSheetReader.createInstrumentGroups: ", ex);
                        }

                    }
                    if (instrument.SubInstruments.length === 0) {
                        const subInstrument: SubInstrument = new SubInstrument(instrument);
                        instrument.SubInstruments.push(subInstrument);
                    }
                    instrumentDict[instrIdString] = instrument;
                    if (currentGroup) {
                        currentGroup.InstrumentalGroups.push(instrument);
                        this.musicSheet.Instruments.push(instrument);
                    } else {
                        this.musicSheet.InstrumentalGroups.push(instrument);
                        this.musicSheet.Instruments.push(instrument);
                    }
                } else {
                    if ((node.name === "part-group") && (node.attribute("type").value === "start")) {
                        const iG: InstrumentalGroup = new InstrumentalGroup("group", this.musicSheet, currentGroup);
                        if (currentGroup) {
                            currentGroup.InstrumentalGroups.push(iG);
                        } else {
                            this.musicSheet.InstrumentalGroups.push(iG);
                        }
                        currentGroup = iG;
                    } else {
                        if ((node.name === "part-group") && (node.attribute("type").value === "stop")) {
                            if (currentGroup) {
                                if (currentGroup.InstrumentalGroups.length === 1) {
                                    const instr: InstrumentalGroup = currentGroup.InstrumentalGroups[0];
                                    if (currentGroup.Parent) {
                                        currentGroup.Parent.InstrumentalGroups.push(instr);
                                        this._removeFromArray(currentGroup.Parent.InstrumentalGroups, currentGroup);
                                    } else {
                                        this.musicSheet.InstrumentalGroups.push(instr);
                                        this._removeFromArray(this.musicSheet.InstrumentalGroups, currentGroup);
                                    }
                                }
                                currentGroup = currentGroup.Parent;
                            }
                        }
                    }
                }
            }
        } catch (e) {
            const errorMsg: string = ITextTranslation.translateText(
                "ReaderErrorMessages/InstrumentError", "Error while reading Instruments"
            );
            throw new MusicSheetReadingException(errorMsg, e);
        }

        for (let idx: number = 0, len: number = this.musicSheet.Instruments.length; idx < len; ++idx) {
            const instrument: Instrument = this.musicSheet.Instruments[idx];
            if (!instrument.Name) {
                instrument.Name = "Instr. " + instrument.IdString;
            }
        }
        return instrumentDict;
    }

    /**
     * Read from each xmlInstrumentPart the first xmlMeasure in order to find out the [[Instrument]]'s number of Staves
     * @param partInst
     * @returns {number} - Complete number of Staves for all Instruments.
     */
    private getCompleteNumberOfStavesFromXml(partInst: IXmlElement[]): number {
        let num: number = 0;
        for (const partNode of partInst) {
            const xmlMeasureList: IXmlElement[] = partNode.elements("measure");
            if (xmlMeasureList.length > 0) {
                const xmlMeasure: IXmlElement = xmlMeasureList[0];
                if (xmlMeasure) {
                    let stavesNode: IXmlElement = xmlMeasure.element("attributes");
                    if (stavesNode) {
                        stavesNode = stavesNode.element("staves");
                    }
                    if (!stavesNode) {
                        num++;
                    } else {
                        num += parseInt(stavesNode.value, 10);
                    }
                }
            }
        }
        if (isNaN(num) || num <= 0) {
            const errorMsg: string = ITextTranslation.translateText(
                "ReaderErrorMessages/StaffError", "Invalid number of staves."
            );
            throw new MusicSheetReadingException(errorMsg);
        }
        return num;
    }

    /**
     * Read from XML for a single [[Instrument]] the first xmlMeasure in order to find out the Instrument's number of Staves.
     * @param partNode
     * @returns {number}
     */
    private getInstrumentNumberOfStavesFromXml(partNode: IXmlElement): number {
        let num: number = 0;
        const xmlMeasure: IXmlElement = partNode.element("measure");
        if (xmlMeasure) {
            const attributes: IXmlElement = xmlMeasure.element("attributes");
            let staves: IXmlElement = undefined;
            if (attributes) {
                staves = attributes.element("staves");
            }
            if (!attributes || !staves) {
                num = 1;
            } else {
                num = parseInt(staves.value, 10);
            }
        }
        if (isNaN(num) || num <= 0) {
            const errorMsg: string = ITextTranslation.translateText(
                "ReaderErrorMessages/StaffError", "Invalid number of Staves."
            );
            throw new MusicSheetReadingException(errorMsg);
        }
        return num;
    }

}
