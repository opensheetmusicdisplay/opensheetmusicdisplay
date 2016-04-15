export class MusicSheetReader implements IMusicSheetReader {
    constructor(afterSheetReadingModules: List<IAfterSheetReadingModule>) {
        this.afterSheetReadingModules = afterSheetReadingModules;
        if (this.afterSheetReadingModules == null)
            this.afterSheetReadingModules = new List<IAfterSheetReadingModule>();
        this.repetitionInstructionReader = MusicSymbolModuleFactory.createRepetitionInstructionReader();
        this.repetitionCalculator = MusicSymbolModuleFactory.createRepetitionCalculator();
    }
    private phonicScoreInterface: IPhonicScoreInterface;
    private repetitionInstructionReader: RepetitionInstructionReader;
    private repetitionCalculator: RepetitionCalculator;
    private afterSheetReadingModules: List<IAfterSheetReadingModule>;
    private musicSheet: MusicSheet;
    private completeNumberOfStaves: number = 0;
    private currentMeasure: SourceMeasure;
    private previousMeasure: SourceMeasure;
    private currentFraction: Fraction;
    public get CompleteNumberOfStaves(): number {
        return this.completeNumberOfStaves;
    }
    private static doCalculationsAfterDurationHasBeenSet(instrumentReaders: List<InstrumentReader>): void {
        for (var idx: number = 0, len = instrumentReaders.Count; idx < len; ++idx) {
            var instrumentReader: InstrumentReader = instrumentReaders[idx];
            instrumentReader.doCalculationsAfterDurationHasBeenSet();
        }
    }
    public SetPhonicScoreInterface(phonicScoreInterface: IPhonicScoreInterface): void {
        this.phonicScoreInterface = phonicScoreInterface;
    }
    public ReadMusicSheetParameters(sheetObject: MusicSheetParameterObject, root: IXmlElement, path: string): MusicSheetParameterObject {
        this.musicSheet = new MusicSheet();
        if (root != null) {
            this.addSheetLabels(root, path);
            if (this.musicSheet.Title != null)
                sheetObject.Title = this.musicSheet.Title.Text;
            if (this.musicSheet.Composer != null)
                sheetObject.Composer = this.musicSheet.Composer.Text;
            if (this.musicSheet.Lyricist != null)
                sheetObject.Lyricist = this.musicSheet.Lyricist.Text;
            var partlistNode: IXmlElement = root.Element("part-list");
            var partList: IEnumerable<IXmlElement> = partlistNode.Elements();
            this.createInstrumentGroups(partList);
            for (var idx: number = 0, len = this.musicSheet.Instruments.Count; idx < len; ++idx) {
                var instr: Instrument = this.musicSheet.Instruments[idx];
                sheetObject.InstrumentList.Add(__init(new MusicSheetParameterObject.LibrarySheetInstrument(), { Name: instr.Name }));
            }
        }
        return sheetObject;
    }
    public createMusicSheet(root: IXmlElement, path: string): MusicSheet {
        try {
            return this._createMusicSheet(root, path);
        }
        catch (e) {
            Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheetReader.CreateMusicSheet", e);
            return null;
        }

    }
    public CreateIMusicSheet(root: IXmlElement, path: string): IMusicSheet {
        return this.createMusicSheet(root, path);
    }
    private _createMusicSheet(root: IXmlElement, path: string): MusicSheet {
        var instrumentReaders: List<InstrumentReader> = new List<InstrumentReader>();
        var sourceMeasureCounter: number = 0;
        this.musicSheet = new MusicSheet();
        this.musicSheet.Path = path;
        try {
            if (root != null) {
                this.addSheetLabels(root, path);
                var partlistNode: IXmlElement = root.Element("part-list");
                if (partlistNode != null) {
                    var partInst: IEnumerable<IXmlElement> = root.Elements("part");
                    var partList: IEnumerable<IXmlElement> = partlistNode.Elements();
                    this.initializeReading(partList, partInst, instrumentReaders);
                    var couldReadMeasure: boolean = true;
                    this.currentFraction = new Fraction(0, 1);
                    var guitarPro: boolean = false;
                    var encoding: IXmlElement = root.Element("identification");
                    if (encoding != null)
                        encoding = encoding.Element("encoding");
                    if (encoding != null)
                        encoding = encoding.Element("software");
                    if (encoding != null) {
                        if (encoding.Value == "Guitar Pro 5")
                            guitarPro = true;
                    }
                    while (couldReadMeasure) {
                        if (this.currentMeasure != null && this.currentMeasure.EndsPiece)
                            sourceMeasureCounter = 0;
                        this.currentMeasure = new SourceMeasure(this.completeNumberOfStaves);
                        for (var i: number = 0; i < instrumentReaders.Count; i++) {
                            try {
                                couldReadMeasure = instrumentReaders[i].readNextXmlMeasure(this.currentMeasure, this.currentFraction, guitarPro);
                            }
                            catch (e) {
                                var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/InstrumentError", "Error while reading instruments.");
                                throw new MusicSheetReadingException(errorMsg, e, 0);
                            }

                        }
                        if (couldReadMeasure) {
                            this.musicSheet.addMeasure(this.currentMeasure);
                            this.checkIfRhythmInstructionsAreSetAndEqual(instrumentReaders);
                            this.checkSourceMeasureForNullEntries();
                            this.setSourceMeasureDuration(instrumentReaders, sourceMeasureCounter);
                            MusicSheetReader.doCalculationsAfterDurationHasBeenSet(instrumentReaders);
                            this.currentMeasure.AbsoluteTimestamp = new Fraction(this.currentFraction);
                            this.musicSheet.SheetErrors.TransferTempErrorsToDict(this.currentMeasure.MeasureNumber);
                            this.currentFraction.Add(this.currentMeasure.Duration);
                            this.previousMeasure = this.currentMeasure;
                        }
                    }
                }
            }
            if (this.repetitionInstructionReader != null) {
                this.repetitionInstructionReader.removeRedundantInstructions();
                if (this.repetitionCalculator != null)
                    this.repetitionCalculator.calculateRepetitions(this.musicSheet, this.repetitionInstructionReader.RepetitionInstructions);
            }
            this.musicSheet.checkForInstrumentWithNoVoice();
            this.musicSheet.fillStaffList();
            this.musicSheet.DefaultStartTempoInBpm = this.musicSheet.SheetPlaybackSetting.BeatsPerMinute;
            for (var idx: number = 0, len = this.afterSheetReadingModules.Count; idx < len; ++idx) {
                var afterSheetReadingModule: IAfterSheetReadingModule = this.afterSheetReadingModules[idx];
                afterSheetReadingModule.calculate(this.musicSheet);
            }
        }
        catch (e) {
            Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheetReader._createMusicSheet", "", e);
            return null;
        }

        return this.musicSheet;
    }
    private initializeReading(partList: IEnumerable<IXmlElement>, partInst: IEnumerable<IXmlElement>,
        instrumentReaders: List<InstrumentReader>): void {
        var instrumentDict: Dictionary<string, Instrument> = this.createInstrumentGroups(partList);
        this.completeNumberOfStaves = this.getCompleteNumberOfStavesFromXml(partInst);
        if (partInst.Any()) {
            this.repetitionInstructionReader.MusicSheet = this.musicSheet;
            this.currentFraction = new Fraction(0, 1);
            this.currentMeasure = null;
            this.previousMeasure = null;
        }
        var counter: number = 0;
        var partInstArr: IXmlElement[] = partInst.ToArray();
        for (var idx: number = 0, len = partInstArr.length; idx < len; ++idx) {
            var node: IXmlElement = partInstArr[idx];
            if (node.Attribute("id") != null) {
                var idNode: IXmlAttribute = node.Attribute("id");
                if (idNode != null) {
                    var partInstId: string = idNode.Value;
                    var currentInstrument: Instrument = instrumentDict[partInstId];
                    var xmlMeasureList: IEnumerable<IXmlElement> = node.Elements("measure");
                    var instrumentNumberOfStaves: number = 1;
                    try {
                        instrumentNumberOfStaves = this.getInstrumentNumberOfStavesFromXml(node);
                    }
                    catch (err) {
                        var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/InstrumentStavesNumberError",
                            "Invalid number of staves at instrument: ");
                        this.musicSheet.SheetErrors.Errors.Add(errorMsg + currentInstrument.Name);
                        continue;
                    }

                    currentInstrument.createStaves(instrumentNumberOfStaves);
                    var instrumentReader: InstrumentReader = new InstrumentReader(this.repetitionInstructionReader, xmlMeasureList, currentInstrument);
                    instrumentReaders.Add(instrumentReader);
                    if (this.repetitionInstructionReader != null)
                        this.repetitionInstructionReader.XmlMeasureList[counter] = xmlMeasureList.ToArray();
                    counter++;
                }
            }
        }
    }
    private checkIfRhythmInstructionsAreSetAndEqual(instrumentReaders: List<InstrumentReader>): void {
        var rhythmInstructions: List<RhythmInstruction> = new List<RhythmInstruction>();
        for (var i: number = 0; i < this.completeNumberOfStaves; i++) {
            if (this.currentMeasure.FirstInstructionsStaffEntries[i] != null && this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.Last() instanceof RhythmInstruction)
                rhythmInstructions.Add(<RhythmInstruction>this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.Last());
        }
        var maxRhythmValue: number = 0.0f;
        var index: number = -1;
        for (var idx: number = 0, len = rhythmInstructions.Count; idx < len; ++idx) {
            var rhythmInstruction: RhythmInstruction = rhythmInstructions[idx];
            if (rhythmInstruction.Rhythm.RealValue > maxRhythmValue) {
                if (this.areRhythmInstructionsMixed(rhythmInstructions) && rhythmInstruction.SymbolEnum != RhythmSymbolEnum.NONE)
                    continue;
                maxRhythmValue = rhythmInstruction.Rhythm.RealValue;
                index = rhythmInstructions.IndexOf(rhythmInstruction);
            }
        }
        if (rhythmInstructions.Count > 0 && rhythmInstructions.Count < this.completeNumberOfStaves) {
            var rhythmInstruction: RhythmInstruction = new RhythmInstruction(rhythmInstructions[index]);
            for (var i: number = 0; i < this.completeNumberOfStaves; i++) {
                if (this.currentMeasure.FirstInstructionsStaffEntries[i] != null && !(this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.Last() instanceof RhythmInstruction)) {
                    this.currentMeasure.FirstInstructionsStaffEntries[i].removeAllInstructionsOfType<RhythmInstruction>();
                    this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.Add(new RhythmInstruction(rhythmInstruction));
                }
                if (this.currentMeasure.FirstInstructionsStaffEntries[i] == null) {
                    this.currentMeasure.FirstInstructionsStaffEntries[i] = new SourceStaffEntry(null, null);
                    this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.Add(new RhythmInstruction(rhythmInstruction));
                }
            }
            for (var idx: number = 0, len = instrumentReaders.Count; idx < len; ++idx) {
                var instrumentReader: InstrumentReader = instrumentReaders[idx];
                instrumentReader.ActiveRhythm = rhythmInstruction;
            }
        }
        if (rhythmInstructions.Count == 0 && this.currentMeasure == this.musicSheet.SourceMeasures[0]) {
            var rhythmInstruction: RhythmInstruction = new RhythmInstruction(new Fraction(4, 4, false), 4, 4, RhythmSymbolEnum.NONE);
            for (var i: number = 0; i < this.completeNumberOfStaves; i++) {
                if (this.currentMeasure.FirstInstructionsStaffEntries[i] == null)
                    this.currentMeasure.FirstInstructionsStaffEntries[i] = new SourceStaffEntry(null, null);
                else this.currentMeasure.FirstInstructionsStaffEntries[i].removeAllInstructionsOfType<RhythmInstruction>();
                this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.Add(rhythmInstruction);
            }
            for (var idx: number = 0, len = instrumentReaders.Count; idx < len; ++idx) {
                var instrumentReader: InstrumentReader = instrumentReaders[idx];
                instrumentReader.ActiveRhythm = rhythmInstruction;
            }
        }
        for (var idx: number = 0, len = rhythmInstructions.Count; idx < len; ++idx) {
            var rhythmInstruction: RhythmInstruction = rhythmInstructions[idx];
            if (rhythmInstruction.Rhythm.RealValue < maxRhythmValue) {
                if (this.currentMeasure.FirstInstructionsStaffEntries[rhythmInstructions.IndexOf(rhythmInstruction)].Instructions.Last() instanceof RhythmInstruction) {
                    var rhythm: RhythmInstruction = new RhythmInstruction(rhythmInstructions[index]);
                    this.currentMeasure.FirstInstructionsStaffEntries[rhythmInstructions.IndexOf(rhythmInstruction)].Instructions.RemoveAt(this.currentMeasure.FirstInstructionsStaffEntries[rhythmInstructions.IndexOf(rhythmInstruction)].Instructions.Count - 1);
                    this.currentMeasure.FirstInstructionsStaffEntries[rhythmInstructions.IndexOf(rhythmInstruction)].Instructions.Add(rhythm);
                }
            }
            if (Math.Abs(rhythmInstruction.Rhythm.RealValue - maxRhythmValue) < 0.000001f && rhythmInstruction.SymbolEnum != RhythmSymbolEnum.NONE && this.areRhythmInstructionsMixed(rhythmInstructions))
            {
                rhythmInstruction.SymbolEnum = RhythmSymbolEnum.NONE;
            }
        }
    }
    private areRhythmInstructionsMixed(rhythmInstructions: List<RhythmInstruction>): boolean {
        for (var i: number = 1; i < rhythmInstructions.Count; i++) {
            if (Math.Abs(rhythmInstructions[i].Rhythm.RealValue - rhythmInstructions[0].Rhythm.RealValue) < 0.000001f && rhythmInstructions[i].SymbolEnum != rhythmInstructions[0].SymbolEnum)
            return true;
        }
        return false;
    }
    private setSourceMeasureDuration(instrumentReaders: List<InstrumentReader>, sourceMeasureCounter: number): void {
        var activeRhythm: Fraction = new Fraction(0, 1);
        var instrumentsMaxTieNoteFractions: List<Fraction> = new List<Fraction>();
        for (var idx: number = 0, len = instrumentReaders.Count; idx < len; ++idx) {
            var instrumentReader: InstrumentReader = instrumentReaders[idx];
            instrumentsMaxTieNoteFractions.Add(instrumentReader.MaxTieNoteFraction);
            var activeRythmMeasure: Fraction = instrumentReader.ActiveRhythm.Rhythm;
            if (activeRhythm < activeRythmMeasure)
                activeRhythm = new Fraction(activeRythmMeasure.Numerator, activeRythmMeasure.Denominator, false);
        }
        var instrumentsDurations: List<Fraction> = this.currentMeasure.calculateInstrumentsDuration(this.musicSheet, instrumentsMaxTieNoteFractions);
        var maxInstrumentDuration: Fraction = new Fraction(0, 1);
        for (var idx: number = 0, len = instrumentsDurations.Count; idx < len; ++idx) {
            var instrumentsDuration: Fraction = instrumentsDurations[idx];
            if (maxInstrumentDuration < instrumentsDuration)
                maxInstrumentDuration = instrumentsDuration;
        }
        if (maxInstrumentDuration == activeRhythm) {
            this.checkFractionsForEquivalence(maxInstrumentDuration, activeRhythm);
        }
        else {
            if (maxInstrumentDuration < activeRhythm) {
                maxInstrumentDuration = this.currentMeasure.reverseCheck(this.musicSheet, maxInstrumentDuration);
                this.checkFractionsForEquivalence(maxInstrumentDuration, activeRhythm);
            }
        }
        this.currentMeasure.ImplicitMeasure = this.checkIfMeasureIsImplicit(maxInstrumentDuration, activeRhythm);
        if (!this.currentMeasure.ImplicitMeasure)
            sourceMeasureCounter++;
        this.currentMeasure.Duration = maxInstrumentDuration;
        this.currentMeasure.MeasureNumber = sourceMeasureCounter;
        for (var i: number = 0; i < instrumentsDurations.Count; i++) {
            var instrumentsDuration: Fraction = instrumentsDurations[i];
            if ((this.currentMeasure.ImplicitMeasure && instrumentsDuration != maxInstrumentDuration) || instrumentsDuration != activeRhythm && !this.allInstrumentsHaveSameDuration(instrumentsDurations, maxInstrumentDuration)) {
                var firstStaffIndexOfInstrument: number = this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.musicSheet.Instruments[i]);
                for (var staffIndex: number = 0; staffIndex < this.musicSheet.Instruments[i].Staves.Count; staffIndex++) {
                    if (!this.staffMeasureIsEmpty(firstStaffIndexOfInstrument + staffIndex)) {
                        this.currentMeasure.setErrorInStaffMeasure(firstStaffIndexOfInstrument + staffIndex, true);
                        var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/MissingNotesError", "Given Notes don't correspond to measure duration.");
                        this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                    }
                }
            }
        }
    }
    private checkFractionsForEquivalence(maxInstrumentDuration: Fraction, activeRhythm: Fraction): void {
        if (activeRhythm.Denominator > maxInstrumentDuration.Denominator) {
            var factor: number = activeRhythm.Denominator / maxInstrumentDuration.Denominator;
            maxInstrumentDuration.multiplyWithFactor(factor);
        }
    }
    private checkIfMeasureIsImplicit(maxInstrumentDuration: Fraction, activeRhythm: Fraction): boolean {
        if (this.previousMeasure == null && maxInstrumentDuration < activeRhythm)
            return true;
        if (this.previousMeasure != null)
            return (this.previousMeasure.Duration + maxInstrumentDuration == activeRhythm);
        return false;
    }
    private allInstrumentsHaveSameDuration(instrumentsDurations: List<Fraction>, maxInstrumentDuration: Fraction): boolean {
        var counter: number = 0;
        for (var idx: number = 0, len = instrumentsDurations.Count; idx < len; ++idx) {
            var instrumentsDuration: Fraction = instrumentsDurations[idx];
            if (instrumentsDuration == maxInstrumentDuration)
                counter++;
        }
        if (counter == instrumentsDurations.Count && maxInstrumentDuration != new Fraction(0, 1))
            return true;
        return false;
    }
    private staffMeasureIsEmpty(index: number): boolean {
        var counter: number = 0;
        for (var i: number = 0; i < this.currentMeasure.VerticalSourceStaffEntryContainers.Count; i++)
            if (this.currentMeasure.VerticalSourceStaffEntryContainers[i][index] == null)
                counter++;
        if (counter == this.currentMeasure.VerticalSourceStaffEntryContainers.Count)
            return true;
        return false;
    }
    private checkSourceMeasureForNullEntries(): void {
        for (var i: number = this.currentMeasure.VerticalSourceStaffEntryContainers.Count - 1; i >= 0; i--) {
            for (var j: number = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.Count - 1; j >= 0; j--) {
                var sourceStaffEntry: SourceStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[j];
                if (sourceStaffEntry != null) {
                    for (var k: number = sourceStaffEntry.VoiceEntries.Count - 1; k >= 0; k--) {
                        var voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[k];
                        if (voiceEntry.Notes.Count == 0) {
                            voiceEntry.ParentVoice.VoiceEntries.Remove(voiceEntry);
                            sourceStaffEntry.VoiceEntries.Remove(voiceEntry);
                        }
                    }
                }
                if (sourceStaffEntry != null && sourceStaffEntry.VoiceEntries.Count == 0)
                    this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[j] = null;
            }
        }
        for (var i: number = this.currentMeasure.VerticalSourceStaffEntryContainers.Count - 1; i >= 0; i--) {
            var counter: number = 0;
            for (var idx: number = 0, len = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.Count; idx < len; ++idx) {
                var sourceStaffEntry: SourceStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[idx];
                if (sourceStaffEntry == null)
                    counter++;
            }
            if (counter == this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.Count)
                this.currentMeasure.VerticalSourceStaffEntryContainers.Remove(this.currentMeasure.VerticalSourceStaffEntryContainers[i]);
        }
    }
    private addSheetLabels(root: IXmlElement, filePath: string): void {
        this.readComposer(root);
        this.readTitle(root);
        if (this.musicSheet.Title == null || this.musicSheet.Composer == null)
            this.readTitleAndComposerFromCredits(root);
        if (this.musicSheet.Title == null) {
            try {
                var filename: string = (filePath.Split('/', '\\')).Last();
                var filenameSplits: string[] = filename.Split('.');
                this.musicSheet.Title = new Label(filenameSplits.First());
            }
            catch (ex) {
                Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheetReader.addSheetLabels: ", ex);
            }

        }
    }
    private readComposer(root: IXmlElement): void {
        var identificationNode: IXmlElement = root.Element("identification");
        if (identificationNode != null) {
            var creators: IXmlElement[] = identificationNode.Elements("creator").ToArray();
            for (var idx: number = 0, len = creators.length; idx < len; ++idx) {
                var creator: IXmlElement = creators[idx];
                if (creator.HasAttributes) {
                    if ((from n in creator.Attributes() where n.Value == "composer" select n).Any())
                    {
                        this.musicSheet.Composer = new Label(creator.Value.Trim('\n', '\r'));
                        continue;
                    }
                    if ((from n in creator.Attributes() where n.Value == "lyricist" || n.Value == "poet" select n).Any())
                    this.musicSheet.Lyricist = new Label(creator.Value.Trim('\n', '\r'));
                }
            }
        }
    }
    private readTitleAndComposerFromCredits(root: IXmlElement): void {
        var systemYCoordinates: number = this.computeSystemYCoordinates(root);
        if (systemYCoordinates == 0)
            return
        var largestTitleCreditSize: number = 1;
        var finalTitle: string = null;
        var largestCreditYInfo: number = 0;
        var finalSubtitle: string = null;
        var possibleTitle: string = null;
        var creditElements: IXmlElement[] = root.Elements("credit").ToArray();
        for (var idx: number = 0, len = creditElements.length; idx < len; ++idx) {
            var credit: IXmlElement = creditElements[idx];
            if (credit.Attribute("page") == null)
                return
            if (credit.Attribute("page").Value == "1") {
                var creditChild: IXmlElement = null;
                if (credit != null) {
                    creditChild = credit.Element("credit-words");
                    if (creditChild.Attribute("justify") == null) {
                        break;
                    }
                    var creditJustify: string = creditChild.Attribute("justify").Value;
                    var creditY: string = creditChild.Attribute("default-y").Value;
                    var creditYInfo: number = StringToNumberConverter.ToNumber(creditY);
                    if (creditYInfo > systemYCoordinates) {
                        if (this.musicSheet.Title == null) {
                            var creditSize: string = creditChild.Attribute("font-size").Value;
                            var titleCreditSizeInt: number = StringToNumberConverter.ToNumber(creditSize);
                            if (largestTitleCreditSize < titleCreditSizeInt) {
                                largestTitleCreditSize = titleCreditSizeInt;
                                finalTitle = creditChild.Value;
                            }
                        }
                        if (this.musicSheet.Subtitle == null) {
                            if (creditJustify != "right" && creditJustify != "left") {
                                if (largestCreditYInfo < creditYInfo) {
                                    largestCreditYInfo = creditYInfo;
                                    if (!String.IsNullOrEmpty(possibleTitle)) {
                                        finalSubtitle = possibleTitle;
                                        possibleTitle = creditChild.Value;
                                    }
                                    else {
                                        possibleTitle = creditChild.Value;
                                    }
                                }
                            }
                        }
                        if (!(this.musicSheet.Composer != null && this.musicSheet.Lyricist != null)) {
                            switch (creditJustify) {
                                case "right":
                                    this.musicSheet.Composer = new Label(creditChild.Value.Trim('\n', '\r'));
                                    break;
                                case "left":
                                    this.musicSheet.Lyricist = new Label(creditChild.Value.Trim('\n', '\r'));
                                    break;
                            }
                        }
                    }
                }
            }
        }
        if (this.musicSheet.Title == null && !String.IsNullOrEmpty(finalTitle)) {
            this.musicSheet.Title = new Label(finalTitle.Trim('\n', '\r'));
        }
        if (this.musicSheet.Subtitle == null && !String.IsNullOrEmpty(finalSubtitle)) {
            this.musicSheet.Subtitle = new Label(finalSubtitle.Trim('\n', '\r'));
        }
    }
    private computeSystemYCoordinates(root: IXmlElement): number {
        if (root.Element("defaults") == null)
            return 0;
        var paperHeight: number = 0;
        var topSystemDistance: number = 0;
        var defi: string = root.Element("defaults").Element("page-layout").Element("page-height").Value;
        paperHeight = StringToNumberConverter.ToNumber(defi);
        var found: boolean = false;
        var parts: IXmlElement[] = root.Elements("part").ToArray();
        for (var idx: number = 0, len = parts.length; idx < len; ++idx) {
            var measures: IXmlElement[] = parts[idx].Elements("measure").ToArray();
            for (var idx2: number = 0, len2 = measures.length; idx2 < len2; ++idx2) {
                var measure: IXmlElement = measures[idx2];
                if (measure.Element("print") != null) {
                    var systemLayouts: IXmlElement[] = measure.Element("print").Elements("system-layout").ToArray();
                    for (var idx3: number = 0, len3 = systemLayouts.length; idx3 < len3; ++idx3) {
                        var syslab: IXmlElement = systemLayouts[idx3];
                        if (syslab.Element("top-system-distance") != null) {
                            var topSystemDistanceString: string = syslab.Element("top-system-distance").Value;
                            topSystemDistance = StringToNumberConverter.ToNumber(topSystemDistanceString);
                            found = true;
                            break;
                        }
                    }
                    break;
                }
            }
            if (found == true)
                break;
        }
        if (root.Element("defaults").Element("system-layout") != null) {
            var syslay: IXmlElement = root.Element("defaults").Element("system-layout");
            if (syslay.Element("top-system-distance") != null) {
                var topSystemDistanceString: string = root.Element("defaults").Element("system-layout").Element("top-system-distance").Value;
                topSystemDistance = StringToNumberConverter.ToNumber(topSystemDistanceString);
            }
        }
        if (topSystemDistance == 0)
            return 0;
        return paperHeight - topSystemDistance;
    }
    private readTitle(root: IXmlElement): void {
        var titleNode: IXmlElement = root.Element("work");
        var titleNodeChild: IXmlElement = null;
        if (titleNode != null) {
            titleNodeChild = titleNode.Element("work-title");
            if (titleNodeChild != null && !String.IsNullOrEmpty(titleNodeChild.Value)) {
                this.musicSheet.Title = new Label(titleNodeChild.Value.Trim('\n', '\r'));
            }
        }
        var movementNode: IXmlElement = root.Element("movement-title");
        var finalSubTitle: string = "";
        if (movementNode != null) {
            if (this.musicSheet.Title == null) {
                this.musicSheet.Title = new Label(movementNode.Value.Trim('\n', '\r'));
            }
            else {
                finalSubTitle = movementNode.Value.Trim('\n', '\r');
            }
        }
        if (titleNode != null) {
            var subtitleNodeChild: IXmlElement = titleNode.Element("work-number");
            if (subtitleNodeChild != null) {
                var workNumber: string = subtitleNodeChild.Value;
                if (!String.IsNullOrEmpty(workNumber)) {
                    if (String.IsNullOrEmpty(finalSubTitle)) {
                        finalSubTitle = workNumber;
                    }
                    else {
                        finalSubTitle = finalSubTitle + ", " + workNumber;
                    }
                }
            }
        }
        if (!String.IsNullOrEmpty(finalSubTitle))
            this.musicSheet.Subtitle = new Label(finalSubTitle);
    }
    private createInstrumentGroups(entryList: IEnumerable<IXmlElement>): Dictionary<string, Instrument> {
        var instrumentId: number = 0;
        var instrumentDict: Dictionary<string, Instrument> = new Dictionary<string, Instrument>();
        var currentGroup: InstrumentalGroup = null;
        try {
            var entryArray: IXmlElement[] = entryList.ToArray();
            for (var idx: number = 0, len = entryArray.length; idx < len; ++idx) {
                var node: IXmlElement = entryArray[idx];
                if (node.Name == "score-part") {
                    var instrIdString: string = node.Attribute("id").Value;
                    var instrument: Instrument = new Instrument(instrumentId, instrIdString, this.phonicScoreInterface, this.musicSheet, currentGroup);
                    instrumentId++;
                    var partElements: IXmlElement[] = node.Elements().ToArray();
                    for (var idx2: number = 0, len2 = partElements.length; idx2 < len2; ++idx2) {
                        var partElement: IXmlElement = partElements[idx2];
                        try {
                            if (partElement.Name == "part-name") {
                                instrument.Name = partElement.Value;
                            }
                            else if (partElement.Name == "score-instrument") {
                                var subInstrument: SubInstrument = new SubInstrument(instrument);
                                subInstrument.IdString = partElement.FirstAttribute.Value;
                                instrument.SubInstruments.Add(subInstrument);
                                var subElement: IXmlElement = partElement.Element("instrument-name");
                                if (subElement != null) {
                                    subInstrument.Name = subElement.Value;
                                    subInstrument.setMidiInstrument(subElement.Value);
                                }
                            }
                            else if (partElement.Name == "midi-instrument") {
                                var subInstrument: SubInstrument = instrument.getSubInstrument(partElement.FirstAttribute.Value);
                                for (var idx3: number = 0, len3 = instrument.SubInstruments.Count; idx3 < len3; ++idx3) {
                                    var subInstr: SubInstrument = instrument.SubInstruments[idx3];
                                    if (subInstr.IdString == partElement.Value) {
                                        subInstrument = subInstr;
                                        break;
                                    }
                                }
                                var instrumentElements: IXmlElement[] = partElement.Elements().ToArray();
                                for (var idx3: number = 0, len3 = instrumentElements.length; idx3 < len3; ++idx3) {
                                    var instrumentElement: IXmlElement = instrumentElements[idx3];
                                    try {
                                        if (instrumentElement.Name == "midi-channel") {
                                            if (StringToNumberConverter.ToInteger(instrumentElement.Value) == 10)
                                                instrument.MidiInstrumentId = MidiInstrument.Percussion;
                                        }
                                        else if (instrumentElement.Name == "midi-program") {
                                            if (instrument.SubInstruments.Count > 0 && instrument.MidiInstrumentId != MidiInstrument.Percussion)
                                                subInstrument.MidiInstrumentId = <MidiInstrument>Math.Max(0, StringToNumberConverter.ToInteger(instrumentElement.Value) - 1);
                                        }
                                        else if (instrumentElement.Name == "midi-unpitched") {
                                            subInstrument.FixedKey = Math.Max(0, StringToNumberConverter.ToInteger(instrumentElement.Value));
                                        }
                                        else if (instrumentElement.Name == "volume") {
                                            try {
                                                var result: number = <number>StringToNumberConverter.ToNumber(instrumentElement.Value);
                                                subInstrument.Volume = result / 127.0f;
                                            }
                                            catch (ex) {
                                                Logger.DefaultLogger.LogError(LogLevel.DEBUG, "ExpressionReader.readExpressionParameters", "read volume", ex);
                                            }

                                        }
                                        else if (instrumentElement.Name == "pan") {
                                            try {
                                                var result: number = <number>StringToNumberConverter.ToNumber(instrumentElement.Value);
                                                subInstrument.Pan = result / 64.0f;
                                            }
                                            catch (ex) {
                                                Logger.DefaultLogger.LogError(LogLevel.DEBUG, "ExpressionReader.readExpressionParameters", "read pan", ex);
                                            }

                                        }
                                    }
                                    catch (ex) {
                                        Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheetReader.createInstrumentGroups midi settings: ", ex);
                                    }

                                }
                            }
                        }
                        catch (ex) {
                            Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheetReader.createInstrumentGroups: ", ex);
                        }

                    }
                    if (instrument.SubInstruments.Count == 0) {
                        var subInstrument: SubInstrument = new SubInstrument(instrument);
                        instrument.SubInstruments.Add(subInstrument);
                    }
                    instrumentDict.Add(instrIdString, instrument);
                    if (currentGroup != null) {
                        currentGroup.InstrumentalGroups.Add(instrument);
                        this.musicSheet.Instruments.Add(instrument);
                    }
                    else {
                        this.musicSheet.InstrumentalGroups.Add(instrument);
                        this.musicSheet.Instruments.Add(instrument);
                    }
                }
                else {
                    if ((node.Name == "part-group") && (node.Attribute("type").Value == "start")) {
                        var iG: InstrumentalGroup = new InstrumentalGroup("group", this.musicSheet, currentGroup);
                        if (currentGroup != null)
                            currentGroup.InstrumentalGroups.Add(iG);
                        else this.musicSheet.InstrumentalGroups.Add(iG);
                        currentGroup = iG;
                    }
                    else {
                        if ((node.Name == "part-group") && (node.Attribute("type").Value == "stop")) {
                            if (currentGroup != null) {
                                if (currentGroup.InstrumentalGroups.Count == 1) {
                                    var instr: InstrumentalGroup = currentGroup.InstrumentalGroups[0];
                                    if (currentGroup.Parent != null) {
                                        currentGroup.Parent.InstrumentalGroups.Add(instr);
                                        currentGroup.Parent.InstrumentalGroups.Remove(currentGroup);
                                    }
                                    else {
                                        this.musicSheet.InstrumentalGroups.Add(instr);
                                        this.musicSheet.InstrumentalGroups.Remove(currentGroup);
                                    }
                                }
                                currentGroup = currentGroup.Parent;
                            }
                        }
                    }
                }
            }
        }
        catch (e) {
            var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/InstrumentError", "Error while reading Instruments");
            throw new MusicSheetReadingException(errorMsg, e, 0);
        }

        for (var idx: number = 0, len = this.musicSheet.Instruments.Count; idx < len; ++idx) {
            var instrument: Instrument = this.musicSheet.Instruments[idx];
            if (string.IsNullOrEmpty(instrument.Name)) {
                instrument.Name = "Instr. " + instrument.IdString;
            }
        }
        return instrumentDict;
    }
    private getCompleteNumberOfStavesFromXml(partInst: IEnumerable<IXmlElement>): number {
        var number: number = 0;
        var partInstArr: IXmlElement[] = partInst.ToArray();
        for (var idx: number = 0, len = partInstArr.length; idx < len; ++idx) {
            var partNode: IXmlElement = partInstArr[idx];
            var xmlMeasureList: IEnumerable<IXmlElement> = partNode.Elements("measure");
            if (xmlMeasureList != null) {
                var xmlMeasure: IXmlElement = xmlMeasureList.First();
                if (xmlMeasure != null) {
                    var stavesNode: IXmlElement = xmlMeasure.Element("attributes");
                    if (stavesNode != null)
                        stavesNode = stavesNode.Element("staves");
                    if (stavesNode == null)
                        number++;
                    else {
                        number += StringToNumberConverter.ToInteger(stavesNode.Value);
                    }
                }
            }
        }
        if (number <= 0) {
            var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/StaffError", "Invalid number of staves.");
            throw new MusicSheetReadingException(errorMsg);
        }
        return number;
    }
    private getInstrumentNumberOfStavesFromXml(partNode: IXmlElement): number {
        var number: number = 0;
        var xmlMeasure: IXmlElement = partNode.Element("measure");
        if (xmlMeasure != null) {
            var attributes: IXmlElement = xmlMeasure.Element("attributes");
            var staves: IXmlElement = null;
            if (attributes != null)
                staves = attributes.Element("staves");
            if (attributes == null || staves == null)
                number = 1;
            else {
                number = StringToNumberConverter.ToInteger(staves.Value);
            }
        }
        if (number <= 0) {
            var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/StaffError", "Invalid number of Staves.");
            throw new MusicSheetReadingException(errorMsg);
        }
        return number;
    }
}