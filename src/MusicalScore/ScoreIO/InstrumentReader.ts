export class InstrumentReader {
    constructor(repetitionInstructionReader: RepetitionInstructionReader, xmlMeasureList: IEnumerable<IXmlElement>, instrument: Instrument) {
        this.repetitionInstructionReader = repetitionInstructionReader;
        this.xmlMeasureList = xmlMeasureList.ToArray();
        this.musicSheet = instrument.GetMusicSheet;
        this.instrument = instrument;
        this.activeClefs = new Array(instrument.Staves.Count);
        this.activeClefsHaveBeenInitialized = new Array(instrument.Staves.Count);
        for (var i: number = 0; i < instrument.Staves.Count; i++)
            this.activeClefsHaveBeenInitialized[i] = false;
        createExpressionGenerators(instrument.Staves.Count);
        this.slurReader = MusicSymbolModuleFactory.createSlurReader(this.musicSheet);
    }
    private repetitionInstructionReader: RepetitionInstructionReader;
    private xmlMeasureList: IXmlElement[];
    private musicSheet: MusicSheet;
    private slurReader: SlurReader;
    private instrument: Instrument;
    private voiceGeneratorsDict: Dictionary<number, VoiceGenerator> = new Dictionary<number, VoiceGenerator>();
    private staffMainVoiceGeneratorDict: Dictionary<Staff, VoiceGenerator> = new Dictionary<Staff, VoiceGenerator>();
    private inSourceMeasureInstrumentIndex: number;
    private divisions: number = 0;
    private currentMeasure: SourceMeasure;
    private previousMeasure: SourceMeasure;
    private currentXmlMeasureIndex: number = 0;
    private currentStaff: Staff;
    private currentStaffEntry: SourceStaffEntry;
    private activeClefs: ClefInstruction[];
    private activeKey: KeyInstruction;
    private activeRhythm: RhythmInstruction;
    private activeClefsHaveBeenInitialized: boolean[];
    private activeKeyHasBeenInitialized: boolean = false;
    private abstractInstructions: List<KeyValuePairClass<number, AbstractNotationInstruction>> = new List<KeyValuePairClass<number, AbstractNotationInstruction>>();
    private openChordSymbolContainer: ChordSymbolContainer;
    private expressionReaders: ExpressionReader[];
    private currentVoiceGenerator: VoiceGenerator;
    private openSlurDict: Dictionary<number, Slur> = new Dictionary<number, Slur>();
    private maxTieNoteFraction: Fraction;
    public get ActiveKey(): KeyInstruction {
        return this.activeKey;
    }
    public get MaxTieNoteFraction(): Fraction {
        return this.maxTieNoteFraction;
    }
    public get ActiveRhythm(): RhythmInstruction {
        return this.activeRhythm;
    }
    public set ActiveRhythm(value: RhythmInstruction) {
        this.activeRhythm = value;
    }
    public readNextXmlMeasure(currentMeasure: SourceMeasure, measureStartAbsoluteTimestamp: Fraction, guitarPro: boolean): boolean {
        if (this.currentXmlMeasureIndex >= this.xmlMeasureList.length)
            return false;
        this.currentMeasure = currentMeasure;
        this.inSourceMeasureInstrumentIndex = this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.instrument);
        if (this.repetitionInstructionReader != null)
            this.repetitionInstructionReader.prepareReadingMeasure(currentMeasure, this.currentXmlMeasureIndex);
        var currentFraction: Fraction = new Fraction(0, 1);
        var previousFraction: Fraction = new Fraction(0, 1);
        var divisionsException: boolean = false;
        this.maxTieNoteFraction = new Fraction(0, 1);
        var lastNoteWasGrace: boolean = false;
        try {
            var xmlMeasureListArr: IXmlElement[] = this.xmlMeasureList[this.currentXmlMeasureIndex].Elements().ToArray();
            for (var idx: number = 0, len = xmlMeasureListArr.length; idx < len; ++idx) {
                var xmlNode: IXmlElement = xmlMeasureListArr[idx];
                if (xmlNode.Name == "note") {
                    if ((xmlNode.HasAttributes && xmlNode.Attribute("print-object") != null && xmlNode.Attribute("print-spacing") != null)) {
                        continue;
                    }
                    var noteStaff: number = 1;
                    if (this.instrument.Staves.Count > 1) {
                        try {
                            if (xmlNode.Element("staff") != null)
                                noteStaff = StringToNumberConverter.ToInteger(xmlNode.Element("staff").Value);
                        }
                        catch (ex) {
                            Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.readNextXmlMeasure.get staff number", ex);
                            noteStaff = 1;
                        }

                    }
                    this.currentStaff = this.instrument.Staves[noteStaff - 1];
                    var isChord: boolean = xmlNode.Element("chord") != null;
                    if (xmlNode.Element("voice") != null) {
                        var noteVoice: number = StringToNumberConverter.ToInteger(xmlNode.Element("voice").Value);
                        this.currentVoiceGenerator = this.getOrCreateVoiceGenerator(noteVoice, noteStaff - 1);
                    }
                    else {
                        if (!isChord || this.currentVoiceGenerator == null)
                            this.currentVoiceGenerator = this.getOrCreateVoiceGenerator(1, noteStaff - 1);
                    }
                    var noteDivisions: number = 0;
                    var noteDuration: Fraction = new Fraction(0, 1);
                    var isTuplet: boolean = false;
                    if (xmlNode.Element("duration") != null) {
                        try {
                            noteDivisions = StringToNumberConverter.ToInteger(xmlNode.Element("duration").Value);
                            noteDuration = new Fraction(noteDivisions, 4 * this.divisions);
                            if (noteDivisions == 0) {
                                noteDuration = this.getNoteDurationFromTypeNode(xmlNode);
                            }
                            if (xmlNode.Element("time-modification") != null) {
                                noteDuration = this.getNoteDurationForTuplet(xmlNode);
                                isTuplet = true;
                            }
                        }
                        catch (ex) {
                            var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError", "Invalid Note Duration.");
                            this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                            Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.readNextXmlMeasure", errorMsg, ex);
                            continue;
                        }

                    }
                    var restNote: boolean = xmlNode.Element("rest") != null;
                    var isGraceNote: boolean = xmlNode.Element("grace") != null || noteDivisions == 0 || isChord && lastNoteWasGrace;
                    var musicTimestamp: Fraction = new Fraction(currentFraction);
                    if (isChord)
                        musicTimestamp = new Fraction(previousFraction);
                    var newContainerCreated: boolean;
                    this.currentStaffEntry = this.currentMeasure.findOrCreateStaffEntry(musicTimestamp,
                        this.inSourceMeasureInstrumentIndex + noteStaff - 1, this.currentStaff, newContainerCreated);
                    if (!this.currentVoiceGenerator.hasVoiceEntry() || !isChord && !isGraceNote && !lastNoteWasGrace || !lastNoteWasGrace && isGraceNote) {
                        this.currentVoiceGenerator.createVoiceEntry(musicTimestamp, this.currentStaffEntry, !restNote);
                    }
                    if (!isGraceNote && !isChord) {
                        previousFraction = new Fraction(currentFraction);
                        currentFraction.Add(new Fraction(noteDuration));
                    }
                    if (isChord) {
                        if (this.currentStaffEntry != null && this.currentStaffEntry.ParentStaff != this.currentStaff)
                            this.currentStaffEntry = this.currentVoiceGenerator.checkForStaffEntryLink(this.inSourceMeasureInstrumentIndex + noteStaff - 1, this.currentStaff, this.currentStaffEntry, this.currentMeasure);
                    }
                    var beginOfMeasure: boolean = (this.currentStaffEntry != null && this.currentStaffEntry.Timestamp != null && this.currentStaffEntry.Timestamp == new Fraction(0, 1) && !this.currentStaffEntry.hasNotes());
                    saveAbstractInstructionList(this.instrument.Staves.Count, beginOfMeasure);
                    if (this.openChordSymbolContainer != null) {
                        this.currentStaffEntry.ChordContainer = this.openChordSymbolContainer;
                        this.openChordSymbolContainer = null;
                    }
                    if (this.activeRhythm != null)
                        this.musicSheet.SheetPlaybackSetting.Rhythm = this.activeRhythm.Rhythm;
                    if (isTuplet)
                        this.currentVoiceGenerator.read(xmlNode, noteDuration.Numerator, noteDuration.Denominator,
                            restNote, isGraceNote, this.currentStaffEntry, this.currentMeasure,
                            measureStartAbsoluteTimestamp, this.maxTieNoteFraction, isChord, guitarPro);
                    else this.currentVoiceGenerator.read(xmlNode, noteDivisions, 4 * this.divisions, restNote, isGraceNote,
                        this.currentStaffEntry, this.currentMeasure, measureStartAbsoluteTimestamp,
                        this.maxTieNoteFraction, isChord, guitarPro);
                    var notationsNode: IXmlElement = xmlNode.Element("notations");
                    if (notationsNode != null && notationsNode.Element("dynamics") != null) {
                        var expressionReader: ExpressionReader = this.expressionReaders[this.readExpressionStaffNumber(xmlNode) - 1];
                        if (expressionReader != null) {
                            expressionReader.readExpressionParameters(xmlNode, this.instrument, this.divisions, currentFraction, previousFraction, this.currentMeasure.MeasureNumber, false);
                            expressionReader.read(xmlNode, this.currentMeasure, previousFraction);
                        }
                    }
                    lastNoteWasGrace = isGraceNote;
                }
                else if (xmlNode.Name == "attributes") {
                    var divisionsNode: IXmlElement = xmlNode.Element("divisions");
                    if (divisionsNode != null) {
                        try {
                            this.divisions = StringToNumberConverter.ToInteger(divisionsNode.Value);
                        }
                        catch (e) {
                            var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/DivisionError", "Invalid divisions value at Instrument: ");
                            Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.readNextXmlMeasure", errorMsg, e);
                            this.divisions = this.readDivisionsFromNotes();
                            if (this.divisions > 0)
                                this.musicSheet.SheetErrors.Errors.Add(errorMsg + this.instrument.Name);
                            else {
                                divisionsException = true;
                                throw new MusicSheetReadingException(errorMsg + this.instrument.Name, 0);
                            }
                        }

                    }
                    if (xmlNode.Element("divisions") == null && this.divisions == 0 && this.currentXmlMeasureIndex == 0) {
                        var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/DivisionError", "Invalid divisions value at Instrument: ");
                        this.divisions = this.readDivisionsFromNotes();
                        if (this.divisions > 0)
                            this.musicSheet.SheetErrors.Errors.Add(errorMsg + this.instrument.Name);
                        else {
                            divisionsException = true;
                            throw new MusicSheetReadingException(errorMsg + this.instrument.Name, 0);
                        }
                    }
                    this.addAbstractInstruction(xmlNode, guitarPro);
                    if (currentFraction == new Fraction(0, 1) && this.isAttributesNodeAtBeginOfMeasure(this.xmlMeasureList[this.currentXmlMeasureIndex], xmlNode))
                        saveAbstractInstructionList(this.instrument.Staves.Count, true);
                    if (this.isAttributesNodeAtEndOfMeasure(this.xmlMeasureList[this.currentXmlMeasureIndex], xmlNode))
                        this.saveClefInstructionAtEndOfMeasure();
                }
                else if (xmlNode.Name == "forward") {
                    var forFraction: number = StringToNumberConverter.ToInteger(xmlNode.Element("duration").Value);
                    currentFraction.Add(new Fraction(forFraction, 4 * this.divisions));
                }
                else if (xmlNode.Name == "backup") {
                    var backFraction: number = StringToNumberConverter.ToInteger(xmlNode.Element("duration").Value);
                    currentFraction.Sub(new Fraction(backFraction, 4 * this.divisions));
                    if (currentFraction.Numerator < 0)
                        currentFraction = new Fraction(0, 1);
                    previousFraction.Sub(new Fraction(backFraction, 4 * this.divisions));
                    if (previousFraction.Numerator < 0)
                        previousFraction = new Fraction(0, 1);
                }
                else if (xmlNode.Name == "direction") {
                    var directionTypeNode: IXmlElement = xmlNode.Element("direction-type");
                    MetronomeReader.readMetronomeInstructions(xmlNode, this.musicSheet, this.currentXmlMeasureIndex);
                    var relativePositionInMeasure: number = Math.Min(1, currentFraction.RealValue);
                    if (this.activeRhythm != null && this.activeRhythm.Rhythm != null)
                        relativePositionInMeasure /= this.activeRhythm.Rhythm.RealValue;
                    var handeled: boolean = false;
                    if (this.repetitionInstructionReader != null)
                        handeled = this.repetitionInstructionReader.handleRepetitionInstructionsFromWordsOrSymbols(directionTypeNode, relativePositionInMeasure);
                    if (!handeled) {
                        var expressionReader: ExpressionReader = this.expressionReaders[0];
                        var staffIndex: number = this.readExpressionStaffNumber(xmlNode) - 1;
                        if (staffIndex < this.expressionReaders.Count())
                            expressionReader = this.expressionReaders[staffIndex];
                        if (expressionReader != null) {
                            if (directionTypeNode.Element("octave-shift") != null) {
                                expressionReader.readExpressionParameters(xmlNode, this.instrument, this.divisions, currentFraction, previousFraction, this.currentMeasure.MeasureNumber, true);
                                expressionReader.addOctaveShift(xmlNode, this.currentMeasure, new Fraction(previousFraction));
                            }
                            expressionReader.readExpressionParameters(xmlNode, this.instrument, this.divisions, currentFraction, previousFraction, this.currentMeasure.MeasureNumber, false);
                            expressionReader.read(xmlNode, this.currentMeasure, currentFraction);
                        }
                    }
                }
                else if (xmlNode.Name == "barline") {
                    if (this.repetitionInstructionReader != null) {
                        var measureEndsSystem: boolean = false;
                        this.repetitionInstructionReader.handleLineRepetitionInstructions(xmlNode, measureEndsSystem);
                        if (measureEndsSystem) {
                            this.currentMeasure.BreakSystemAfter = true;
                            this.currentMeasure.EndsPiece = true;
                        }
                    }
                }
                else if (xmlNode.Name == "sound") {
                    MetronomeReader.readTempoInstruction(xmlNode, this.musicSheet, this.currentXmlMeasureIndex);
                }
                else if (xmlNode.Name == "harmony") {
                    this.openChordSymbolContainer = ChordSymbolReader.readChordSymbol(xmlNode, this.musicSheet, this.activeKey);
                }
            }
            for (var j: number = 0; j < this.voiceGeneratorsDict.Count; j++) {
                var keyValuePair: KeyValuePair<number, VoiceGenerator> = this.voiceGeneratorsDict.ElementAt(j);
                var voiceGenerator: VoiceGenerator = keyValuePair.Value;
                voiceGenerator.checkForOpenBeam();
                voiceGenerator.checkForOpenGraceNotes();
            }
            if (this.currentXmlMeasureIndex == this.xmlMeasureList.length - 1) {
                for (var i: number = 0; i < this.instrument.Staves.Count; i++)
                    if (!this.activeClefsHaveBeenInitialized[i])
                        createDefaultClefInstruction(this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.instrument) + i);
                if (!this.activeKeyHasBeenInitialized)
                    this.createDefaultKeyInstruction();
                for (var i: number = 0; i < this.expressionReaders.length; i++) {
                    var reader: ExpressionReader = this.expressionReaders[i];
                    if (reader != null)
                        reader.checkForOpenExpressions(this.currentMeasure, currentFraction);
                }
            }
        }
        catch (e) {
            if (divisionsException) {
                throw new MusicSheetReadingException(e.Message, e, 0);
            }
            var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/MeasureError", "Error while reading Measure.");
            this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
            Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.readNextXmlMeasure", errorMsg, e);
        }

        this.previousMeasure = this.currentMeasure;
        this.currentXmlMeasureIndex++;
        return true;
    }
    public doCalculationsAfterDurationHasBeenSet(): void {
        for (var j: number = 0; j < this.voiceGeneratorsDict.Count; j++) {
            var keyValuePair: KeyValuePair<number, VoiceGenerator> = this.voiceGeneratorsDict.ElementAt(j);
            var voiceGenerator: VoiceGenerator = keyValuePair.Value;
            voiceGenerator.checkOpenTies();
        }
    }
    private getOrCreateVoiceGenerator(voiceId: number, staffId: number): VoiceGenerator {
        var voiceGenerator: VoiceGenerator;
        var staff: Staff = this.instrument.Staves[staffId];
        if (this.voiceGeneratorsDict.ContainsKey(voiceId)) {
            voiceGenerator = this.voiceGeneratorsDict[voiceId];
            if (!staff.Voices.Contains(voiceGenerator.GetVoice))
                staff.Voices.Add(voiceGenerator.GetVoice);
            return voiceGenerator;
        }
        else {
            if (this.staffMainVoiceGeneratorDict.ContainsKey(staff)) {
                var mainVoiceGenerator: VoiceGenerator = this.staffMainVoiceGeneratorDict[staff];
                voiceGenerator = new VoiceGenerator(this.instrument, voiceId, this.slurReader, mainVoiceGenerator.GetVoice);
                staff.Voices.Add(voiceGenerator.GetVoice);
                this.voiceGeneratorsDict.Add(voiceId, voiceGenerator);
                return voiceGenerator;
            }
            voiceGenerator = new VoiceGenerator(this.instrument, voiceId, this.slurReader);
            staff.Voices.Add(voiceGenerator.GetVoice);
            this.voiceGeneratorsDict.Add(voiceId, voiceGenerator);
            this.staffMainVoiceGeneratorDict.Add(staff, voiceGenerator);
            return voiceGenerator;
        }
    }
    private createExpressionGenerators(numberOfStaves: number): void {
        this.expressionReaders = new Array(numberOfStaves);
        for (var i: number = 0; i < numberOfStaves; i++)
            this.expressionReaders[i] = MusicSymbolModuleFactory.createExpressionGenerator(this.musicSheet, this.instrument, i + 1);
    }
    private createDefaultClefInstruction(staffIndex: number): void {
        var first: SourceMeasure;
        if (this.musicSheet.SourceMeasures.Count > 0)
            first = this.musicSheet.SourceMeasures[0];
        else first = this.currentMeasure;
        var clefInstruction: ClefInstruction = new ClefInstruction(ClefEnum.G, 0, 2);
        var firstStaffEntry: SourceStaffEntry;
        if (first.FirstInstructionsStaffEntries[staffIndex] == null) {
            firstStaffEntry = new SourceStaffEntry(null, null);
            first.FirstInstructionsStaffEntries[staffIndex] = firstStaffEntry;
        }
        else {
            firstStaffEntry = first.FirstInstructionsStaffEntries[staffIndex];
            firstStaffEntry.removeFirstInstructionOfType<ClefInstruction>();
        }
        clefInstruction.Parent = firstStaffEntry;
        firstStaffEntry.Instructions.Insert(0, clefInstruction);
    }
    private createDefaultKeyInstruction(): void {
        var first: SourceMeasure;
        if (this.musicSheet.SourceMeasures.Count > 0)
            first = this.musicSheet.SourceMeasures[0];
        else first = this.currentMeasure;
        var keyInstruction: KeyInstruction = new KeyInstruction(0, KeyEnum.major);
        for (var j: number = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + this.instrument.Staves.Count; j++) {
            if (first.FirstInstructionsStaffEntries[j] == null) {
                var firstStaffEntry: SourceStaffEntry = new SourceStaffEntry(null, null);
                first.FirstInstructionsStaffEntries[j] = firstStaffEntry;
                keyInstruction.Parent = firstStaffEntry;
                firstStaffEntry.Instructions.Add(keyInstruction);
            }
            else {
                var firstStaffEntry: SourceStaffEntry = first.FirstInstructionsStaffEntries[j];
                keyInstruction.Parent = firstStaffEntry;
                firstStaffEntry.removeFirstInstructionOfType<KeyInstruction>();
                if (firstStaffEntry.Instructions[0] instanceof ClefInstruction)
                    firstStaffEntry.Instructions.Insert(1, keyInstruction);
                else firstStaffEntry.Instructions.Insert(0, keyInstruction);
            }
        }
    }
    private isAttributesNodeAtBeginOfMeasure(parentNode: IXmlElement, attributesNode: IXmlElement): boolean {
        var childs: IXmlElement[] = parentNode.Elements().ToArray();
        var attributesNodeIndex: number = 0;
        for (var i: number = 0; i < childs.length; i++) {
            if (childs[i] == attributesNode) {
                attributesNodeIndex = i;
                break;
            }
        }
        if (attributesNodeIndex > 0 && childs[attributesNodeIndex - 1].Name == "backup")
            return true;
        var firstNoteNodeIndex: number = -1;
        for (var i: number = 0; i < childs.length; i++) {
            if (childs[i].Name == "note") {
                firstNoteNodeIndex = i;
                break;
            }
        }
        if ((attributesNodeIndex < firstNoteNodeIndex && firstNoteNodeIndex > 0) || (firstNoteNodeIndex < 0))
            return true;
        return false;
    }
    private isAttributesNodeAtEndOfMeasure(parentNode: IXmlElement, attributesNode: IXmlElement): boolean {
        var childs: IXmlElement[] = parentNode.Elements().ToArray();
        var attributesNodeIndex: number = 0;
        for (var i: number = 0; i < childs.length; i++) {
            if (childs[i] == attributesNode) {
                attributesNodeIndex = i;
                break;
            }
        }
        var nextNoteNodeIndex: number = 0;
        for (var i: number = attributesNodeIndex; i < childs.length; i++) {
            if (childs[i].Name == "note") {
                nextNoteNodeIndex = i;
                break;
            }
        }
        if (attributesNodeIndex > nextNoteNodeIndex)
            return true;
        return false;
    }
    private getNoteDurationFromTypeNode(xmlNode: IXmlElement): Fraction {
        if (xmlNode.Element("type") != null) {
            var typeNode: IXmlElement = xmlNode.Element("type");
            if (typeNode != null) {
                var type: string = typeNode.Value;
                return this.currentVoiceGenerator.getNoteDurationFromType(type);
            }
        }
        return new Fraction(0, 4 * this.divisions);
    }
    private addAbstractInstruction(node: IXmlElement, guitarPro: boolean): void {
        if (node.Element("divisions") != null) {
            if (node.Elements().Count() == 1)
                return
        }
        var transposeNode: IXmlElement = node.Element("transpose");
        if (transposeNode != null) {
            var chromaticNode: IXmlElement = transposeNode.Element("chromatic");
            if (chromaticNode != null)
                this.instrument.PlaybackTranspose = StringToNumberConverter.ToInteger(chromaticNode.Value);
        }
        var clefList: IXmlElement[] = node.Elements("clef").ToArray();
        if (clefList.length > 0) {
            for (var idx: number = 0, len = clefList.Count(); idx < len; ++idx) {
                var nodeList: IXmlElement = clefList[idx];
                var clefEnum: ClefEnum = ClefEnum.G;
                var line: number = 2;
                var staffNumber: number = 1;
                var clefOctaveOffset: number = 0;
                var lineNode: IXmlElement = nodeList.Element("line");
                if (lineNode != null) {
                    try {
                        line = StringToNumberConverter.ToInteger(lineNode.Value);
                    }
                    catch (ex) {
                        var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ClefLineError",
                            "Invalid clef line given -> using default clef line.");
                        this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                        line = 2;
                        Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.addAbstractInstruction", errorMsg, ex);
                    }

                }
                var signNode: IXmlElement = nodeList.Element("sign");
                if (signNode != null) {
                    try {
                        clefEnum = <ClefEnum>Enum.Parse(/*typeof*/ClefEnum, signNode.Value);
                        if (!ClefInstruction.isSupportedClef(clefEnum)) {
                            if (clefEnum == ClefEnum.TAB && guitarPro) {
                                clefOctaveOffset = -1;
                            }
                            var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ClefError",
                                "Unsupported clef found -> using default clef.");
                            this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                            clefEnum = ClefEnum.G;
                            line = 2;
                        }
                    }
                    catch (e) {
                        var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ClefError",
                            "Invalid clef found -> using default clef.");
                        this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                        clefEnum = ClefEnum.G;
                        line = 2;
                        Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.addAbstractInstruction", errorMsg, e);
                    }

                }
                var clefOctaveNode: IXmlElement = nodeList.Element("clef-octave-change");
                if (clefOctaveNode != null) {
                    try {
                        clefOctaveOffset = StringToNumberConverter.ToInteger(clefOctaveNode.Value);
                    }
                    catch (e) {
                        var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ClefOctaveError",
                            "Invalid clef octave found -> using default clef octave.");
                        this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                        clefOctaveOffset = 0;
                    }

                }
                if (nodeList.HasAttributes)
                    if (nodeList.Attributes().First().Name == "number") {
                        try {
                            staffNumber = StringToNumberConverter.ToInteger(nodeList.Attributes().First().Value);
                        }
                        catch (err) {
                            var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ClefError",
                                "Invalid clef found -> using default clef.");
                            this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                            staffNumber = 1;
                        }

                    }
                var clefInstruction: ClefInstruction = new ClefInstruction(clefEnum, clefOctaveOffset, line);
                this.abstractInstructions.Add(new KeyValuePairClass<number, AbstractNotationInstruction>(staffNumber, clefInstruction));
            }
        }
        if (node.Element("key") != null && this.instrument.MidiInstrumentId != Common.Enums.MidiInstrument.Percussion) {
            var key: number = 0;
            var keyNode: IXmlElement = node.Element("key").Element("fifths");
            if (keyNode != null) {
                try {
                    key = <number>StringToNumberConverter.ToInteger(keyNode.Value);
                }
                catch (ex) {
                    var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/KeyError",
                        "Invalid key found -> set to default.");
                    this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                    key = 0;
                    Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.addAbstractInstruction", errorMsg, ex);
                }

            }
            var keyEnum: KeyEnum = KeyEnum.none;
            var modeNode: IXmlElement = node.Element("key");
            if (modeNode != null)
                modeNode = modeNode.Element("mode");
            if (modeNode != null) {
                try {
                    keyEnum = <KeyEnum>Enum.Parse(/*typeof*/KeyEnum, modeNode.Value);
                }
                catch (ex) {
                    var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/KeyError",
                        "Invalid key found -> set to default.");
                    this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                    keyEnum = KeyEnum.major;
                    Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.addAbstractInstruction", errorMsg, ex);
                }

            }
            var keyInstruction: KeyInstruction = new KeyInstruction(key, keyEnum);
            this.abstractInstructions.Add(new KeyValuePairClass<number, AbstractNotationInstruction>(1, keyInstruction));
        }
        if (node.Element("time") != null) {
            var symbolEnum: RhythmSymbolEnum = RhythmSymbolEnum.NONE;
            var timeNode: IXmlElement = node.Element("time");
            if (timeNode != null)
                if (timeNode.HasAttributes)
                    if (timeNode.Attributes().First() != null) {
                        var firstAttr: IXmlAttribute = timeNode.Attributes().First();
                        if (firstAttr.Name == "symbol") {
                            if (firstAttr.Value == "common")
                                symbolEnum = RhythmSymbolEnum.COMMON;
                            else if (firstAttr.Value == "cut")
                                symbolEnum = RhythmSymbolEnum.CUT;
                        }
                    }
            var num: number = 0;
            var denom: number = 0;
            var senzaMisura: boolean = (timeNode != null && timeNode.Element("senza-misura") != null);
            var timeList: IXmlElement[] = node.Elements("time").ToArray();
            var beatsList: List<IXmlElement> = new List<IXmlElement>();
            var typeList: List<IXmlElement> = new List<IXmlElement>();
            for (var idx: number = 0, len = timeList.length; idx < len; ++idx) {
                var xmlNode: IXmlElement = timeList[idx];
                beatsList.AddRange(xmlNode.Elements("beats"));
                typeList.AddRange(xmlNode.Elements("beat-type"));
            }
            if (!senzaMisura) {
                try {
                    if (beatsList != null && beatsList.Count > 0 && typeList != null && beatsList.Count == typeList.Count) {
                        var length: number = beatsList.Count();
                        var fractions: Fraction[] = new Array(length);
                        var maxDenom: number = 0;
                        for (var i: number = 0; i < length; i++) {
                            var s: string = beatsList[i].Value;
                            var n: number = 0;
                            var d: number = 0;
                            if (s.IndexOf("+") != -1) {
                                var numbers: string[] = s.Split('+');
                                for (var idx: number = 0, len = numbers.Count(); idx < len; ++idx) {
                                    var number: String = numbers[idx];
                                    n += StringToNumberConverter.ToInteger(number);
                                }
                            }
                            else n = StringToNumberConverter.ToInteger(s);
                            d = StringToNumberConverter.ToInteger(typeList[i].Value);
                            maxDenom = Math.Max(maxDenom, d);
                            fractions[i] = new Fraction(n, d, false);
                        }
                        for (var i: number = 0; i < length; i++) {
                            if (fractions[i].Denominator == maxDenom)
                                num += fractions[i].Numerator;
                            else num += (maxDenom / fractions[i].Denominator) * fractions[i].Numerator;
                        }
                        denom = maxDenom;
                    }
                    else {
                        num = StringToNumberConverter.ToInteger(node.Element("time").Element("beats").Value);
                        denom = StringToNumberConverter.ToInteger(node.Element("time").Element("beat-type").Value);
                    }
                }
                catch (ex) {
                    var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/RhythmError", "Invalid rhythm found -> set to default.");
                    this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                    num = 4;
                    denom = 4;
                    Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.addAbstractInstruction", errorMsg, ex);
                }

                var measure: Fraction = new Fraction(num, denom, false);
                if (symbolEnum != RhythmSymbolEnum.NONE && (measure != new Fraction(4, 4) || measure != new Fraction(2, 2)))
                    symbolEnum = RhythmSymbolEnum.NONE;
                var rhythmInstruction: RhythmInstruction = new RhythmInstruction(measure, num, denom, symbolEnum);
                this.abstractInstructions.Add(new KeyValuePairClass<number, AbstractNotationInstruction>(1, rhythmInstruction));
            }
            else {
                var rhythmInstruction: RhythmInstruction = new RhythmInstruction(new Fraction(4, 4, false), 4, 4, RhythmSymbolEnum.NONE);
                this.abstractInstructions.Add(new KeyValuePairClass<number, AbstractNotationInstruction>(1, rhythmInstruction));
            }
        }
    }
    private saveAbstractInstructionList(numberOfStaves: number, beginOfMeasure: boolean): void {
        for (var i: number = this.abstractInstructions.Count - 1; i >= 0; i--) {
            var keyValuePair: KeyValuePairClass<number, AbstractNotationInstruction> = this.abstractInstructions[i];
            if (keyValuePair.value instanceof ClefInstruction) {
                var clefInstruction: ClefInstruction = <ClefInstruction>keyValuePair.value;
                if (this.currentXmlMeasureIndex == 0 || (keyValuePair.key <= this.activeClefs.length && clefInstruction != this.activeClefs[keyValuePair.key - 1])) {
                    if (!beginOfMeasure && this.currentStaffEntry != null && !this.currentStaffEntry.hasNotes() && keyValuePair.key - 1 == this.instrument.Staves.IndexOf(this.currentStaffEntry.ParentStaff)) {
                        var newClefInstruction: ClefInstruction = clefInstruction;
                        newClefInstruction.Parent = this.currentStaffEntry;
                        this.currentStaffEntry.removeFirstInstructionOfType<ClefInstruction>();
                        this.currentStaffEntry.Instructions.Add(newClefInstruction);
                        this.activeClefs[keyValuePair.key - 1] = clefInstruction;
                        this.abstractInstructions.Remove(keyValuePair);
                    }
                    else if (beginOfMeasure) {
                        if (this.currentMeasure != null) {
                            var newClefInstruction: ClefInstruction = clefInstruction;
                            if (this.currentXmlMeasureIndex == 0) {
                                if (this.currentMeasure.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1] == null) {
                                    var firstStaffEntry: SourceStaffEntry = new SourceStaffEntry(null, null);
                                    this.currentMeasure.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1] = firstStaffEntry;
                                    newClefInstruction.Parent = firstStaffEntry;
                                    firstStaffEntry.Instructions.Add(newClefInstruction);
                                    this.activeClefsHaveBeenInitialized[keyValuePair.key - 1] = true;
                                }
                                else if (this.currentMeasure.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1] != null && !(this.currentMeasure.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1].Instructions[0] instanceof ClefInstruction)) {
                                    var firstStaffEntry: SourceStaffEntry = this.currentMeasure.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1];
                                    newClefInstruction.Parent = firstStaffEntry;
                                    firstStaffEntry.removeFirstInstructionOfType<ClefInstruction>();
                                    firstStaffEntry.Instructions.Insert(0, newClefInstruction);
                                    this.activeClefsHaveBeenInitialized[keyValuePair.key - 1] = true;
                                }
                                else {
                                    var lastStaffEntry: SourceStaffEntry = new SourceStaffEntry(null, null);
                                    this.currentMeasure.LastInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1] = lastStaffEntry;
                                    newClefInstruction.Parent = lastStaffEntry;
                                    lastStaffEntry.Instructions.Add(newClefInstruction);
                                }
                            }
                            else if (!this.activeClefsHaveBeenInitialized[keyValuePair.key - 1]) {
                                var first: SourceMeasure = this.musicSheet.SourceMeasures[0];
                                var firstStaffEntry: SourceStaffEntry;
                                if (first.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1] == null)
                                    firstStaffEntry = new SourceStaffEntry(null, null);
                                else {
                                    firstStaffEntry = first.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1];
                                    firstStaffEntry.removeFirstInstructionOfType<ClefInstruction>();
                                }
                                newClefInstruction.Parent = firstStaffEntry;
                                firstStaffEntry.Instructions.Insert(0, newClefInstruction);
                                this.activeClefsHaveBeenInitialized[keyValuePair.key - 1] = true;
                            }
                            else {
                                var lastStaffEntry: SourceStaffEntry = new SourceStaffEntry(null, null);
                                this.previousMeasure.LastInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1] = lastStaffEntry;
                                newClefInstruction.Parent = lastStaffEntry;
                                lastStaffEntry.Instructions.Add(newClefInstruction);
                            }
                            this.activeClefs[keyValuePair.key - 1] = clefInstruction;
                            this.abstractInstructions.Remove(keyValuePair);
                        }
                    }
                }
                if (keyValuePair.key <= this.activeClefs.length && clefInstruction == this.activeClefs[keyValuePair.key - 1])
                    this.abstractInstructions.Remove(keyValuePair);
            }
            if (keyValuePair.value instanceof KeyInstruction) {
                var keyInstruction: KeyInstruction = <KeyInstruction>keyValuePair.value;
                if (this.activeKey == null || this.activeKey.Key != keyInstruction.Key) {
                    this.activeKey = keyInstruction;
                    this.abstractInstructions.Remove(keyValuePair);
                    var sourceMeasure: SourceMeasure;
                    if (!this.activeKeyHasBeenInitialized) {
                        this.activeKeyHasBeenInitialized = true;
                        if (this.currentXmlMeasureIndex > 0)
                            sourceMeasure = this.musicSheet.SourceMeasures[0];
                        else sourceMeasure = this.currentMeasure;
                    }
                    else sourceMeasure = this.currentMeasure;
                    if (sourceMeasure != null) {
                        for (var j: number = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + numberOfStaves; j++) {
                            var newKeyInstruction: KeyInstruction = keyInstruction;
                            if (sourceMeasure.FirstInstructionsStaffEntries[j] == null) {
                                var firstStaffEntry: SourceStaffEntry = new SourceStaffEntry(null, null);
                                sourceMeasure.FirstInstructionsStaffEntries[j] = firstStaffEntry;
                                newKeyInstruction.Parent = firstStaffEntry;
                                firstStaffEntry.Instructions.Add(newKeyInstruction);
                            }
                            else {
                                var firstStaffEntry: SourceStaffEntry = sourceMeasure.FirstInstructionsStaffEntries[j];
                                newKeyInstruction.Parent = firstStaffEntry;
                                firstStaffEntry.removeFirstInstructionOfType<KeyInstruction>();
                                if (firstStaffEntry.Instructions.Count == 0) {
                                    firstStaffEntry.Instructions.Add(newKeyInstruction);
                                }
                                else {
                                    if (firstStaffEntry.Instructions[0] instanceof ClefInstruction)
                                        firstStaffEntry.Instructions.Insert(1, newKeyInstruction);
                                    else firstStaffEntry.Instructions.Insert(0, newKeyInstruction);
                                }
                            }
                        }
                    }
                }
                if (this.activeKey != null && this.activeKey == keyInstruction)
                    this.abstractInstructions.Remove(keyValuePair);
            }
            if (keyValuePair.value instanceof RhythmInstruction) {
                var rhythmInstruction: RhythmInstruction = <RhythmInstruction>keyValuePair.value;
                if (this.activeRhythm == null || this.activeRhythm != rhythmInstruction) {
                    this.activeRhythm = rhythmInstruction;
                    this.abstractInstructions.Remove(keyValuePair);
                    if (this.currentMeasure != null) {
                        for (var j: number = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + numberOfStaves; j++) {
                            var newRhythmInstruction: RhythmInstruction = rhythmInstruction;
                            var firstStaffEntry: SourceStaffEntry;
                            if (this.currentMeasure.FirstInstructionsStaffEntries[j] == null) {
                                firstStaffEntry = new SourceStaffEntry(null, null);
                                this.currentMeasure.FirstInstructionsStaffEntries[j] = firstStaffEntry;
                            }
                            else {
                                firstStaffEntry = this.currentMeasure.FirstInstructionsStaffEntries[j];
                                firstStaffEntry.removeFirstInstructionOfType<RhythmInstruction>();
                            }
                            newRhythmInstruction.Parent = firstStaffEntry;
                            firstStaffEntry.Instructions.Add(newRhythmInstruction);
                        }
                    }
                }
                if (this.activeRhythm != null && this.activeRhythm == rhythmInstruction)
                    this.abstractInstructions.Remove(keyValuePair);
            }
        }
    }
    private saveClefInstructionAtEndOfMeasure(): void {
        for (var i: number = this.abstractInstructions.Count - 1; i >= 0; i--) {
            var keyValuePair: KeyValuePairClass<number, AbstractNotationInstruction> = this.abstractInstructions[i];
            if (keyValuePair.value instanceof ClefInstruction) {
                var clefInstruction: ClefInstruction = __as__<ClefInstruction>(keyValuePair.value, ClefInstruction);
                if ((this.activeClefs[keyValuePair.key - 1] == null) || (this.activeClefs[keyValuePair.key - 1] != null && (clefInstruction.ClefType != this.activeClefs[keyValuePair.key - 1].ClefType || (clefInstruction.ClefType == this.activeClefs[keyValuePair.key - 1].ClefType && clefInstruction.Line != this.activeClefs[keyValuePair.key - 1].Line)))) {
                    var lastStaffEntry: SourceStaffEntry = new SourceStaffEntry(null, null);
                    this.currentMeasure.LastInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1] = lastStaffEntry;
                    var newClefInstruction: ClefInstruction = clefInstruction;
                    newClefInstruction.Parent = lastStaffEntry;
                    lastStaffEntry.Instructions.Add(newClefInstruction);
                    this.activeClefs[keyValuePair.key - 1] = clefInstruction;
                    this.abstractInstructions.Remove(keyValuePair);
                }
            }
        }
    }
    private getNoteDurationForTuplet(xmlNode: IXmlElement): Fraction {
        var duration: Fraction = new Fraction(0, 1);
        var typeDuration: Fraction = this.getNoteDurationFromTypeNode(xmlNode);
        if (xmlNode.Element("time-modification") != null) {
            var time: IXmlElement = xmlNode.Element("time-modification");
            if (time != null) {
                if (time.Element("actual-notes") != null && time.Element("normal-notes") != null) {
                    var actualNotes: IXmlElement = time.Element("actual-notes");
                    var normalNotes: IXmlElement = time.Element("normal-notes");
                    if (actualNotes != null && normalNotes != null) {
                        var actual: number = StringToNumberConverter.ToInteger(actualNotes.Value);
                        var normal: number = StringToNumberConverter.ToInteger(normalNotes.Value);
                        duration = new Fraction(normal, actual) * typeDuration;
                    }
                }
            }
        }
        return duration;
    }
    private readExpressionStaffNumber(xmlNode: IXmlElement): number {
        var directionStaffNumber: number = 1;
        if (xmlNode.Element("staff") != null) {
            var staffNode: IXmlElement = xmlNode.Element("staff");
            if (staffNode != null) {
                try {
                    directionStaffNumber = StringToNumberConverter.ToInteger(staffNode.Value);
                }
                catch (ex) {
                    var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/ExpressionStaffError", "Invalid Expression staff number -> set to default.");
                    this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                    directionStaffNumber = 1;
                    Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.readExpressionStaffNumber", errorMsg, ex);
                }

            }
        }
        return directionStaffNumber;
    }
    private readDivisionsFromNotes(): number {
        var divisionsFromNote: number = 0;
        var xmlMeasureIndex: number = this.currentXmlMeasureIndex;
        var read: boolean = false;
        while (!read) {
            var xmlMeasureListArr: IXmlElement[] = this.xmlMeasureList[xmlMeasureIndex].Elements().ToArray();
            for (var idx: number = 0, len = xmlMeasureListArr.length; idx < len; ++idx) {
                var xmlNode: IXmlElement = xmlMeasureListArr[idx];
                if (xmlNode.Name == "note" && xmlNode.Element("time-modification") == null) {
                    if (xmlNode.Element("duration") != null && xmlNode.Element("type") != null) {
                        var durationNode: IXmlElement = xmlNode.Element("duration");
                        var typeNode: IXmlElement = xmlNode.Element("type");
                        if (durationNode != null && typeNode != null) {
                            var type: string = typeNode.Value;
                            var noteDuration: number = 0;
                            try {
                                noteDuration = StringToNumberConverter.ToInteger(durationNode.Value);
                            }
                            catch (ex) {
                                Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.readDivisionsFromNotes", ex);
                                continue;
                            }

                            switch (type) {
                                case "1024th":
                                    {
                                        divisionsFromNote = (noteDuration / 4) * 1024;
                                        break;
                                    }
                                case "512th":
                                    {
                                        divisionsFromNote = (noteDuration / 4) * 512;
                                        break;
                                    }
                                case "256th":
                                    {
                                        divisionsFromNote = (noteDuration / 4) * 256;
                                        break;
                                    }
                                case "128th":
                                    {
                                        divisionsFromNote = (noteDuration / 4) * 128;
                                        break;
                                    }
                                case "64th":
                                    {
                                        divisionsFromNote = (noteDuration / 4) * 64;
                                        break;
                                    }
                                case "32nd":
                                    {
                                        divisionsFromNote = (noteDuration / 4) * 32;
                                        break;
                                    }
                                case "16th":
                                    {
                                        divisionsFromNote = (noteDuration / 4) * 16;
                                        break;
                                    }
                                case "eighth":
                                    {
                                        divisionsFromNote = (noteDuration / 4) * 8;
                                        break;
                                    }
                                case "quarter":
                                    {
                                        divisionsFromNote = (noteDuration / 4) * 4;
                                        break;
                                    }
                                case "half":
                                    {
                                        divisionsFromNote = (noteDuration / 4) * 2;
                                        break;
                                    }
                                case "whole":
                                    {
                                        divisionsFromNote = (noteDuration / 4);
                                        break;
                                    }
                                case "breve":
                                    {
                                        divisionsFromNote = (noteDuration / 4) / 2;
                                        break;
                                    }
                                case "long":
                                    {
                                        divisionsFromNote = (noteDuration / 4) / 4;
                                        break;
                                    }
                                case "maxima":
                                    {
                                        divisionsFromNote = (noteDuration / 4) / 8;
                                        break;
                                    }
                                default:
                                    {
                                        break;
                                    }
                            }
                        }
                    }
                }
                if (divisionsFromNote > 0) {
                    read = true;
                    break;
                }
            }
            if (divisionsFromNote == 0) {
                xmlMeasureIndex++;
                if (xmlMeasureIndex == this.xmlMeasureList.length) {
                    var errorMsg: string = ITextTranslation.translateText("ReaderErrorMEssages/DivisionsError", "Invalid divisions value at Instrument: ");
                    throw new MusicSheetReadingException(errorMsg + this.instrument.Name, 0);
                }
            }
        }
        return divisionsFromNote;
    }
}
export module InstrumentReader {
    export class KeyValuePairClass<T, TU>
    {
        constructor(key: T, value: TU) {
            this.key = key;
            this.value = value;
        }
        public key: T;
        public value: TU;
    }
}