export class InstrumentReader {
  constructor(repetitionInstructionReader: RepetitionInstructionReader, xmlMeasureList: IEnumerable<IXmlElement>, instrument: Instrument) {
    this.repetitionInstructionReader = repetitionInstructionReader;
    this.xmlMeasureList = xmlMeasureList.ToArray();
    this.musicSheet = instrument.GetMusicSheet;
    this.instrument = instrument;
    this.activeClefs = new Array(instrument.Staves.Count);
    this.activeClefsHaveBeenInitialized = new Array(instrument.Staves.Count);
    for (let i: number = 0; i < instrument.Staves.Count; i++) {
      this.activeClefsHaveBeenInitialized[i] = false;
    }
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
  private abstractInstructions: List<KeyValuePairClass<number, AbstractNotationInstruction>> =
    new List<KeyValuePairClass<number, AbstractNotationInstruction>>();
  private openChordSymbolContainer: ChordSymbolContainer;
  private expressionReaders: ExpressionReader[];
  private currentVoiceGenerator: VoiceGenerator;
  // private openSlurDict: Dictionary<number, Slur> = new Dictionary<number, Slur>();
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
    if (this.currentXmlMeasureIndex >= this.xmlMeasureList.length) {
      return false;
    }
    this.currentMeasure = currentMeasure;
    this.inSourceMeasureInstrumentIndex = this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.instrument);
    if (this.repetitionInstructionReader !== undefined) {
      this.repetitionInstructionReader.prepareReadingMeasure(currentMeasure, this.currentXmlMeasureIndex);
    }
    let currentFraction: Fraction = new Fraction(0, 1);
    let previousFraction: Fraction = new Fraction(0, 1);
    let divisionsException: boolean = false;
    this.maxTieNoteFraction = new Fraction(0, 1);
    let lastNoteWasGrace: boolean = false;
    try {
      let xmlMeasureListArr: IXmlElement[] = this.xmlMeasureList[this.currentXmlMeasureIndex].Elements().ToArray();
      for (let idx: number = 0, len: number = xmlMeasureListArr.length; idx < len; ++idx) {
        let xmlNode: IXmlElement = xmlMeasureListArr[idx];
        if (xmlNode.Name === "note") {
          if ((xmlNode.HasAttributes && xmlNode.Attribute("print-object") !== undefined && xmlNode.Attribute("print-spacing") !== undefined)) {
            continue;
          }
          let noteStaff: number = 1;
          if (this.instrument.Staves.Count > 1) {
            try {
              if (xmlNode.Element("staff") !== undefined) {
                noteStaff = StringToNumberConverter.ToInteger(xmlNode.Element("staff").Value);
              }
            } catch (ex) {
              Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.readNextXmlMeasure.get staff number", ex);
              noteStaff = 1;
            }

          }
          this.currentStaff = this.instrument.Staves[noteStaff - 1];
          let isChord: boolean = xmlNode.Element("chord") !== undefined;
          if (xmlNode.Element("voice") !== undefined) {
            let noteVoice: number = StringToNumberConverter.ToInteger(xmlNode.Element("voice").Value);
            this.currentVoiceGenerator = this.getOrCreateVoiceGenerator(noteVoice, noteStaff - 1);
          } else {
            if (!isChord || this.currentVoiceGenerator === undefined) {
              this.currentVoiceGenerator = this.getOrCreateVoiceGenerator(1, noteStaff - 1);
            }
          }
          let noteDivisions: number = 0;
          let noteDuration: Fraction = new Fraction(0, 1);
          let isTuplet: boolean = false;
          if (xmlNode.Element("duration") !== undefined) {
            try {
              noteDivisions = StringToNumberConverter.ToInteger(xmlNode.Element("duration").Value);
              noteDuration = new Fraction(noteDivisions, 4 * this.divisions);
              if (noteDivisions === 0) {
                noteDuration = this.getNoteDurationFromTypeNode(xmlNode);
              }
              if (xmlNode.Element("time-modification") !== undefined) {
                noteDuration = this.getNoteDurationForTuplet(xmlNode);
                isTuplet = true;
              }
            } catch (ex) {
              let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError", "Invalid Note Duration.");
              this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
              Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.readNextXmlMeasure", errorMsg, ex);
              continue;
            }

          }
          let restNote: boolean = xmlNode.Element("rest") !== undefined;
          let isGraceNote: boolean = xmlNode.Element("grace") !== undefined || noteDivisions === 0 || isChord && lastNoteWasGrace;
          let musicTimestamp: Fraction = new Fraction(currentFraction);
          if (isChord) {
            musicTimestamp = new Fraction(previousFraction);
          }
          let newContainerCreated: boolean;
          this.currentStaffEntry = this.currentMeasure.findOrCreateStaffEntry(
            musicTimestamp,
            this.inSourceMeasureInstrumentIndex + noteStaff - 1,
            this.currentStaff,
            newContainerCreated,
          );
          if (!this.currentVoiceGenerator.hasVoiceEntry() || !isChord && !isGraceNote && !lastNoteWasGrace || !lastNoteWasGrace && isGraceNote) {
            this.currentVoiceGenerator.createVoiceEntry(musicTimestamp, this.currentStaffEntry, !restNote);
          }
          if (!isGraceNote && !isChord) {
            previousFraction = new Fraction(currentFraction);
            currentFraction.Add(new Fraction(noteDuration));
          }
          if (
            isChord &&
            this.currentStaffEntry !== undefined &&
            this.currentStaffEntry.ParentStaff !== this.currentStaff
          ) {
            this.currentStaffEntry = this.currentVoiceGenerator.checkForStaffEntryLink(
              this.inSourceMeasureInstrumentIndex + noteStaff - 1, this.currentStaff, this.currentStaffEntry, this.currentMeasure
            );
          }
          let beginOfMeasure: boolean = (
            this.currentStaffEntry !== undefined &&
            this.currentStaffEntry.Timestamp !== undefined &&
            this.currentStaffEntry.Timestamp === new Fraction(0, 1) &&
            !this.currentStaffEntry.hasNotes()
          );
          saveAbstractInstructionList(this.instrument.Staves.Count, beginOfMeasure);
          if (this.openChordSymbolContainer !== undefined) {
            this.currentStaffEntry.ChordContainer = this.openChordSymbolContainer;
            this.openChordSymbolContainer = undefined;
          }
          if (this.activeRhythm !== undefined) {
            this.musicSheet.SheetPlaybackSetting.Rhythm = this.activeRhythm.Rhythm;
          }
          if (isTuplet) {
            this.currentVoiceGenerator.read(
              xmlNode, noteDuration.Numerator,
              noteDuration.Denominator, restNote, isGraceNote,
              this.currentStaffEntry, this.currentMeasure,
              measureStartAbsoluteTimestamp,
              this.maxTieNoteFraction, isChord, guitarPro
            );
          } else {
            this.currentVoiceGenerator.read(
            xmlNode, noteDivisions, 4 * this.divisions,
            restNote, isGraceNote, this.currentStaffEntry,
            this.currentMeasure, measureStartAbsoluteTimestamp,
            this.maxTieNoteFraction, isChord, guitarPro
            );
          }
          let notationsNode: IXmlElement = xmlNode.Element("notations");
          if (notationsNode !== undefined && notationsNode.Element("dynamics") !== undefined) {
            let expressionReader: ExpressionReader = this.expressionReaders[this.readExpressionStaffNumber(xmlNode) - 1];
            if (expressionReader !== undefined) {
              expressionReader.readExpressionParameters(
                xmlNode, this.instrument, this.divisions, currentFraction, previousFraction, this.currentMeasure.MeasureNumber, false
              );
              expressionReader.read(
                xmlNode, this.currentMeasure, previousFraction
              );
            }
          }
          lastNoteWasGrace = isGraceNote;
        } else if (xmlNode.Name === "attributes") {
          let divisionsNode: IXmlElement = xmlNode.Element("divisions");
          if (divisionsNode !== undefined) {
            try {
              this.divisions = StringToNumberConverter.ToInteger(divisionsNode.Value);
            } catch (e) {
              let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/DivisionError", "Invalid divisions value at Instrument: ");
              Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.readNextXmlMeasure", errorMsg, e);
              this.divisions = this.readDivisionsFromNotes();
              if (this.divisions > 0) {
                this.musicSheet.SheetErrors.Errors.Add(errorMsg + this.instrument.Name);
              } else {
                divisionsException = true;
                throw new MusicSheetReadingException(errorMsg + this.instrument.Name, 0);
              }
            }

          }
          if (
            xmlNode.Element("divisions") === undefined &&
            this.divisions === 0 &&
            this.currentXmlMeasureIndex === 0
          ) {
            let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/DivisionError", "Invalid divisions value at Instrument: ");
            this.divisions = this.readDivisionsFromNotes();
            if (this.divisions > 0) {
              this.musicSheet.SheetErrors.Errors.Add(errorMsg + this.instrument.Name);
            } else {
              divisionsException = true;
              throw new MusicSheetReadingException(errorMsg + this.instrument.Name, 0);
            }
          }
          this.addAbstractInstruction(xmlNode, guitarPro);
          if (currentFraction === new Fraction(0, 1) && this.isAttributesNodeAtBeginOfMeasure(this.xmlMeasureList[this.currentXmlMeasureIndex], xmlNode)) {
            saveAbstractInstructionList(this.instrument.Staves.Count, true);
          }
          if (this.isAttributesNodeAtEndOfMeasure(this.xmlMeasureList[this.currentXmlMeasureIndex], xmlNode)) {
            this.saveClefInstructionAtEndOfMeasure();
          }
        } else if (xmlNode.Name === "forward") {
          let forFraction: number = StringToNumberConverter.ToInteger(xmlNode.Element("duration").Value);
          currentFraction.Add(new Fraction(forFraction, 4 * this.divisions));
        } else if (xmlNode.Name === "backup") {
          let backFraction: number = StringToNumberConverter.ToInteger(xmlNode.Element("duration").Value);
          currentFraction.Sub(new Fraction(backFraction, 4 * this.divisions));
          if (currentFraction.Numerator < 0) {
            currentFraction = new Fraction(0, 1);
          }
          previousFraction.Sub(new Fraction(backFraction, 4 * this.divisions));
          if (previousFraction.Numerator < 0) {
            previousFraction = new Fraction(0, 1);
          }
        } else if (xmlNode.Name === "direction") {
          let directionTypeNode: IXmlElement = xmlNode.Element("direction-type");
          MetronomeReader.readMetronomeInstructions(xmlNode, this.musicSheet, this.currentXmlMeasureIndex);
          let relativePositionInMeasure: number = Math.Min(1, currentFraction.RealValue);
          if (this.activeRhythm !== undefined && this.activeRhythm.Rhythm !== undefined) {
            relativePositionInMeasure /= this.activeRhythm.Rhythm.RealValue;
          }
          let handeled: boolean = false;
          if (this.repetitionInstructionReader !== undefined) {
            handeled = this.repetitionInstructionReader.handleRepetitionInstructionsFromWordsOrSymbols(directionTypeNode, relativePositionInMeasure);
          }
          if (!handeled) {
            let expressionReader: ExpressionReader = this.expressionReaders[0];
            let staffIndex: number = this.readExpressionStaffNumber(xmlNode) - 1;
            if (staffIndex < this.expressionReaders.Count()) {
              expressionReader = this.expressionReaders[staffIndex];
            }
            if (expressionReader !== undefined) {
              if (directionTypeNode.Element("octave-shift") !== undefined) {
                expressionReader.readExpressionParameters(
                  xmlNode, this.instrument, this.divisions, currentFraction, previousFraction, this.currentMeasure.MeasureNumber, true
                );
                expressionReader.addOctaveShift(xmlNode, this.currentMeasure, new Fraction(previousFraction));
              }
              expressionReader.readExpressionParameters(
                xmlNode, this.instrument, this.divisions, currentFraction, previousFraction, this.currentMeasure.MeasureNumber, false
              );
              expressionReader.read(xmlNode, this.currentMeasure, currentFraction);
            }
          }
        } else if (xmlNode.Name === "barline") {
          if (this.repetitionInstructionReader !== undefined) {
            let measureEndsSystem: boolean = false;
            this.repetitionInstructionReader.handleLineRepetitionInstructions(xmlNode, measureEndsSystem);
            if (measureEndsSystem) {
              this.currentMeasure.BreakSystemAfter = true;
              this.currentMeasure.EndsPiece = true;
            }
          }
        } else if (xmlNode.Name === "sound") {
          MetronomeReader.readTempoInstruction(xmlNode, this.musicSheet, this.currentXmlMeasureIndex);
        } else if (xmlNode.Name === "harmony") {
          this.openChordSymbolContainer = ChordSymbolReader.readChordSymbol(xmlNode, this.musicSheet, this.activeKey);
        }
      }
      for (let j: number = 0; j < this.voiceGeneratorsDict.Count; j++) {
        let keyValuePair: KeyValuePair<number, VoiceGenerator> = this.voiceGeneratorsDict.ElementAt(j);
        let voiceGenerator: VoiceGenerator = keyValuePair.Value;
        voiceGenerator.checkForOpenBeam();
        voiceGenerator.checkForOpenGraceNotes();
      }
      if (this.currentXmlMeasureIndex === this.xmlMeasureList.length - 1) {
        for (let i: number = 0; i < this.instrument.Staves.Count; i++) {
          if (!this.activeClefsHaveBeenInitialized[i]) {
            createDefaultClefInstruction(this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.instrument) + i);
        }}
        if (!this.activeKeyHasBeenInitialized) {
          this.createDefaultKeyInstruction();
        }
        for (let i: number = 0; i < this.expressionReaders.length; i++) {
          let reader: ExpressionReader = this.expressionReaders[i];
          if (reader !== undefined) {
            reader.checkForOpenExpressions(this.currentMeasure, currentFraction);
          }
        }
      }
    } catch (e) {
      if (divisionsException) {
        throw new MusicSheetReadingException(e.Message, e, 0);
      }
      let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/MeasureError", "Error while reading Measure.");
      this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
      Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.readNextXmlMeasure", errorMsg, e);
    }

    this.previousMeasure = this.currentMeasure;
    this.currentXmlMeasureIndex++;
    return true;
  }
  public doCalculationsAfterDurationHasBeenSet(): void {
    for (let j: number = 0; j < this.voiceGeneratorsDict.Count; j++) {
      let keyValuePair: KeyValuePair<number, VoiceGenerator> = this.voiceGeneratorsDict.ElementAt(j);
      let voiceGenerator: VoiceGenerator = keyValuePair.Value;
      voiceGenerator.checkOpenTies();
    }
  }
  private getOrCreateVoiceGenerator(voiceId: number, staffId: number): VoiceGenerator {
    let voiceGenerator: VoiceGenerator;
    let staff: Staff = this.instrument.Staves[staffId];
    if (this.voiceGeneratorsDict.ContainsKey(voiceId)) {
      voiceGenerator = this.voiceGeneratorsDict[voiceId];
      if (!staff.Voices.Contains(voiceGenerator.GetVoice)) {
        staff.Voices.Add(voiceGenerator.GetVoice);
      }
      return voiceGenerator;
    } else {
      if (this.staffMainVoiceGeneratorDict.ContainsKey(staff)) {
        let mainVoiceGenerator: VoiceGenerator = this.staffMainVoiceGeneratorDict[staff];
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

/*
  private createExpressionGenerators(numberOfStaves: number): void {
    this.expressionReaders = new Array(numberOfStaves);
    for (let i: number = 0; i < numberOfStaves; i++)
      this.expressionReaders[i] = MusicSymbolModuleFactory.createExpressionGenerator(this.musicSheet, this.instrument, i + 1);
  }


  private createDefaultClefInstruction(staffIndex: number): void {
    let first: SourceMeasure;
    if (this.musicSheet.SourceMeasures.Count > 0) {
      first = this.musicSheet.SourceMeasures[0];
    } else {
      first = this.currentMeasure;
    }
    let clefInstruction: ClefInstruction = new ClefInstruction(ClefEnum.G, 0, 2);
    let firstStaffEntry: SourceStaffEntry;
    if (first.FirstInstructionsStaffEntries[staffIndex] === undefined) {
      firstStaffEntry = new SourceStaffEntry(undefined, undefined);
      first.FirstInstructionsStaffEntries[staffIndex] = firstStaffEntry;
    } else {
      firstStaffEntry = first.FirstInstructionsStaffEntries[staffIndex];
      firstStaffEntry.removeFirstInstructionOfType<ClefInstruction>();
    }
    clefInstruction.Parent = firstStaffEntry;
    firstStaffEntry.Instructions.Insert(0, clefInstruction);
  }
*/
  private createDefaultKeyInstruction(): void {
    let first: SourceMeasure;
    if (this.musicSheet.SourceMeasures.Count > 0) {
      first = this.musicSheet.SourceMeasures[0];
    } else {
      first = this.currentMeasure;
    }
    let keyInstruction: KeyInstruction = new KeyInstruction(0, KeyEnum.major);
    for (let j: number = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + this.instrument.Staves.Count; j++) {
      if (first.FirstInstructionsStaffEntries[j] === undefined) {
        let firstStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, undefined);
        first.FirstInstructionsStaffEntries[j] = firstStaffEntry;
        keyInstruction.Parent = firstStaffEntry;
        firstStaffEntry.Instructions.Add(keyInstruction);
      } else {
        let firstStaffEntry: SourceStaffEntry = first.FirstInstructionsStaffEntries[j];
        keyInstruction.Parent = firstStaffEntry;
        firstStaffEntry.removeFirstInstructionOfType<KeyInstruction>();
        if (firstStaffEntry.Instructions[0] instanceof ClefInstruction) {
          firstStaffEntry.Instructions.Insert(1, keyInstruction);
        } else {
          firstStaffEntry.Instructions.Insert(0, keyInstruction);
        }
      }
    }
  }
  private isAttributesNodeAtBeginOfMeasure(parentNode: IXmlElement, attributesNode: IXmlElement): boolean {
    let childs: IXmlElement[] = parentNode.Elements().ToArray();
    let attributesNodeIndex: number = 0;
    for (let i: number = 0; i < childs.length; i++) {
      if (childs[i] === attributesNode) {
        attributesNodeIndex = i;
        break;
      }
    }
    if (attributesNodeIndex > 0 && childs[attributesNodeIndex - 1].Name === "backup") {
      return true;
    }
    let firstNoteNodeIndex: number = -1;
    for (let i: number = 0; i < childs.length; i++) {
      if (childs[i].Name === "note") {
        firstNoteNodeIndex = i;
        break;
      }
    }
    return (attributesNodeIndex < firstNoteNodeIndex && firstNoteNodeIndex > 0) || (firstNoteNodeIndex < 0);
  }
  private isAttributesNodeAtEndOfMeasure(parentNode: IXmlElement, attributesNode: IXmlElement): boolean {
    let childs: IXmlElement[] = parentNode.Elements().ToArray();
    let attributesNodeIndex: number = 0;
    for (let i: number = 0; i < childs.length; i++) {
      if (childs[i] === attributesNode) {
        attributesNodeIndex = i;
        break;
      }
    }
    let nextNoteNodeIndex: number = 0;
    for (let i: number = attributesNodeIndex; i < childs.length; i++) {
      if (childs[i].Name === "note") {
        nextNoteNodeIndex = i;
        break;
      }
    }
    return attributesNodeIndex > nextNoteNodeIndex;
  }
  private getNoteDurationFromTypeNode(xmlNode: IXmlElement): Fraction {
    if (xmlNode.Element("type") !== undefined) {
      let typeNode: IXmlElement = xmlNode.Element("type");
      if (typeNode !== undefined) {
        let type: string = typeNode.Value;
        return this.currentVoiceGenerator.getNoteDurationFromType(type);
      }
    }
    return new Fraction(0, 4 * this.divisions);
  }
  private addAbstractInstruction(node: IXmlElement, guitarPro: boolean): void {
    if (node.Element("divisions") !== undefined) {
      if (node.Elements().Count() === 1) { return; }
    }
    let transposeNode: IXmlElement = node.Element("transpose");
    if (transposeNode !== undefined) {
      let chromaticNode: IXmlElement = transposeNode.Element("chromatic");
      if (chromaticNode !== undefined) {
        this.instrument.PlaybackTranspose = StringToNumberConverter.ToInteger(chromaticNode.Value);
      }
    }
    let clefList: IXmlElement[] = node.Elements("clef").ToArray();
    if (clefList.length > 0) {
      for (let idx: number = 0, len: number = clefList.Count(); idx < len; ++idx) {
        let nodeList: IXmlElement = clefList[idx];
        let clefEnum: ClefEnum = ClefEnum.G;
        let line: number = 2;
        let staffNumber: number = 1;
        let clefOctaveOffset: number = 0;
        let lineNode: IXmlElement = nodeList.Element("line");
        let errorMsg: string;
        if (lineNode !== undefined) {
          try {
            line = StringToNumberConverter.ToInteger(lineNode.Value);
          } catch (ex) {
            errorMsg = ITextTranslation.translateText(
              "ReaderErrorMessages/ClefLineError",
              "Invalid clef line given -> using default clef line."
            );
            this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
            line = 2;
            Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.addAbstractInstruction", errorMsg, ex);
          }

        }
        let signNode: IXmlElement = nodeList.Element("sign");
        if (signNode !== undefined) {
          try {
            clefEnum = <ClefEnum>Enum.Parse(/*typeof*/ClefEnum, signNode.Value);
            if (!ClefInstruction.isSupportedClef(clefEnum)) {
              if (clefEnum === ClefEnum.TAB && guitarPro) {
                clefOctaveOffset = -1;
              }
              errorMsg = ITextTranslation.translateText(
                "ReaderErrorMessages/ClefError",
                "Unsupported clef found -> using default clef."
              );
              this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
              clefEnum = ClefEnum.G;
              line = 2;
            }
          } catch (e) {
            errorMsg = ITextTranslation.translateText(
              "ReaderErrorMessages/ClefError",
              "Invalid clef found -> using default clef."
            );
            this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
            clefEnum = ClefEnum.G;
            line = 2;
            Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.addAbstractInstruction", errorMsg, e);
          }

        }
        let clefOctaveNode: IXmlElement = nodeList.Element("clef-octave-change");
        if (clefOctaveNode !== undefined) {
          try {
            clefOctaveOffset = StringToNumberConverter.ToInteger(clefOctaveNode.Value);
          } catch (e) {
            errorMsg = ITextTranslation.translateText(
              "ReaderErrorMessages/ClefOctaveError",
              "Invalid clef octave found -> using default clef octave."
            );
            this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
            clefOctaveOffset = 0;
          }

        }
        if (nodeList.HasAttributes && nodeList.Attributes().First().Name === "number") {
          try {
            staffNumber = StringToNumberConverter.ToInteger(nodeList.Attributes().First().Value);
          } catch (err) {
            errorMsg = ITextTranslation.translateText(
              "ReaderErrorMessages/ClefError",
              "Invalid clef found -> using default clef."
            );
            this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
            staffNumber = 1;
          }
        }

        let clefInstruction: ClefInstruction = new ClefInstruction(clefEnum, clefOctaveOffset, line);
        this.abstractInstructions.Add(new KeyValuePairClass<number, AbstractNotationInstruction>(staffNumber, clefInstruction));
      }
    }
    if (node.Element("key") !== undefined && this.instrument.MidiInstrumentId !== Common.Enums.MidiInstrument.Percussion) {
      let key: number = 0;
      let keyNode: IXmlElement = node.Element("key").Element("fifths");
      if (keyNode !== undefined) {
        try {
          key = <number>StringToNumberConverter.ToInteger(keyNode.Value);
        } catch (ex) {
          let errorMsg: string = ITextTranslation.translateText(
            "ReaderErrorMessages/KeyError",
            "Invalid key found -> set to default."
          );
          this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
          key = 0;
          Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.addAbstractInstruction", errorMsg, ex);
        }

      }
      let keyEnum: KeyEnum = KeyEnum.none;
      let modeNode: IXmlElement = node.Element("key");
      if (modeNode !== undefined) { modeNode = modeNode.Element("mode"); }
      if (modeNode !== undefined) {
        try {
          keyEnum = <KeyEnum>Enum.Parse(/*typeof*/KeyEnum, modeNode.Value);
        } catch (ex) {
          errorMsg = ITextTranslation.translateText(
            "ReaderErrorMessages/KeyError",
            "Invalid key found -> set to default."
          );
          this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
          keyEnum = KeyEnum.major;
          Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.addAbstractInstruction", errorMsg, ex);
        }

      }
      let keyInstruction: KeyInstruction = new KeyInstruction(key, keyEnum);
      this.abstractInstructions.Add(new KeyValuePairClass<number, AbstractNotationInstruction>(1, keyInstruction));
    }
    if (node.Element("time") !== undefined) {
      let symbolEnum: RhythmSymbolEnum = RhythmSymbolEnum.NONE;
      let timeNode: IXmlElement = node.Element("time");
      if (
        timeNode !== undefined &&
        timeNode.HasAttributes &&
        timeNode.Attributes().First() !== undefined
      ) {
        let firstAttr: IXmlAttribute = timeNode.Attributes().First();
        if (firstAttr.Name === "symbol") {
          if (firstAttr.Value === "common") {
            symbolEnum = RhythmSymbolEnum.COMMON;
          } else if (firstAttr.Value === "cut") {
            symbolEnum = RhythmSymbolEnum.CUT;
          }
        }
      }
      let num: number = 0;
      let denom: number = 0;
      let senzaMisura: boolean = (timeNode !== undefined && timeNode.Element("senza-misura") !== undefined);
      let timeList: IXmlElement[] = node.Elements("time").ToArray();
      let beatsList: List<IXmlElement> = new List<IXmlElement>();
      let typeList: List<IXmlElement> = new List<IXmlElement>();
      for (let idx: number = 0, len: number = timeList.length; idx < len; ++idx) {
        let xmlNode: IXmlElement = timeList[idx];
        beatsList.AddRange(xmlNode.Elements("beats"));
        typeList.AddRange(xmlNode.Elements("beat-type"));
      }
      if (!senzaMisura) {
        try {
          if (beatsList !== undefined && beatsList.Count > 0 && typeList !== undefined && beatsList.Count === typeList.Count) {
            let length: number = beatsList.Count();
            let fractions: Fraction[] = new Array(length);
            let maxDenom: number = 0;
            for (let i: number = 0; i < length; i++) {
              let s: string = beatsList[i].Value;
              let n: number = 0;
              let d: number = 0;
              if (s.IndexOf("+") !== -1) {
                let numbers: string[] = s.Split("+");
                for (let idx: number = 0, len: number = numbers.Count(); idx < len; ++idx) {
                  n += StringToNumberConverter.ToInteger(numbers[idx]);
                }
              } else {
                n = StringToNumberConverter.ToInteger(s);
              }
              d = StringToNumberConverter.ToInteger(typeList[i].Value);
              maxDenom = Math.Max(maxDenom, d);
              fractions[i] = new Fraction(n, d, false);
            }
            for (let i: number = 0; i < length; i++) {
              if (fractions[i].Denominator === maxDenom) {
                num += fractions[i].Numerator;
              } else {
                num += (maxDenom / fractions[i].Denominator) * fractions[i].Numerator;
              }
            }
            denom = maxDenom;
          } else {
            num = StringToNumberConverter.ToInteger(node.Element("time").Element("beats").Value);
            denom = StringToNumberConverter.ToInteger(node.Element("time").Element("beat-type").Value);
          }
        } catch (ex) {
          errorMsg = ITextTranslation.translateText("ReaderErrorMessages/RhythmError", "Invalid rhythm found -> set to default.");
          this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
          num = 4;
          denom = 4;
          Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.addAbstractInstruction", errorMsg, ex);
        }

        if ((num === denom === 4) || (num === denom === 2)) {
          symbolEnum = RhythmSymbolEnum.NONE;
        }
        let rhythmInstruction: RhythmInstruction = new RhythmInstruction(
          new Fraction(num, denom, false), num, denom, symbolEnum
        );
        this.abstractInstructions.Add(new KeyValuePairClass<number, AbstractNotationInstruction>(1, rhythmInstruction));
      } else {
        let rhythmInstruction: RhythmInstruction = new RhythmInstruction(new Fraction(4, 4, false), 4, 4, RhythmSymbolEnum.NONE);
        this.abstractInstructions.Add(new KeyValuePairClass<number, AbstractNotationInstruction>(1, rhythmInstruction));
      }
    }
  }
  /*private saveAbstractInstructionList(numberOfStaves: number, beginOfMeasure: boolean): void {
    for (let i: number = this.abstractInstructions.Count - 1; i >= 0; i--) {
      let keyValuePair: KeyValuePairClass<number, AbstractNotationInstruction> = this.abstractInstructions[i];
      if (keyValuePair.value instanceof ClefInstruction) {
        let clefInstruction: ClefInstruction = <ClefInstruction>keyValuePair.value;
        if (this.currentXmlMeasureIndex === 0 || (keyValuePair.key <= this.activeClefs.length && clefInstruction !== this.activeClefs[keyValuePair.key - 1])) {
          if (!beginOfMeasure && this.currentStaffEntry !== undefined && !this.currentStaffEntry.hasNotes() && keyValuePair.key - 1
          === this.instrument.Staves.IndexOf(this.currentStaffEntry.ParentStaff)) {
            let newClefInstruction: ClefInstruction = clefInstruction;
            newClefInstruction.Parent = this.currentStaffEntry;
            this.currentStaffEntry.removeFirstInstructionOfType<ClefInstruction>();
            this.currentStaffEntry.Instructions.Add(newClefInstruction);
            this.activeClefs[keyValuePair.key - 1] = clefInstruction;
            this.abstractInstructions.Remove(keyValuePair);
          } else if (beginOfMeasure) {
            let firstStaffEntry: SourceStaffEntry;
            if (this.currentMeasure !== undefined) {
              let newClefInstruction: ClefInstruction = clefInstruction;
              if (this.currentXmlMeasureIndex === 0) {
                if (this.currentMeasure.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1] === undefined) {
                  firstStaffEntry = new SourceStaffEntry(undefined, undefined);
                  this.currentMeasure.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1] = firstStaffEntry;
                  newClefInstruction.Parent = firstStaffEntry;
                  firstStaffEntry.Instructions.Add(newClefInstruction);
                  this.activeClefsHaveBeenInitialized[keyValuePair.key - 1] = true;
                } else if (this.currentMeasure.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1]
                !==
                undefined && !(this.currentMeasure.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1].Instructions[0]
                 instanceof ClefInstruction)) {
                  firstStaffEntry = this.currentMeasure.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1];
                  newClefInstruction.Parent = firstStaffEntry;
                  firstStaffEntry.removeFirstInstructionOfType<ClefInstruction>();
                  firstStaffEntry.Instructions.Insert(0, newClefInstruction);
                  this.activeClefsHaveBeenInitialized[keyValuePair.key - 1] = true;
                } else {
                  firstStaffEntry = new SourceStaffEntry(undefined, undefined);
                  this.currentMeasure.LastInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1] = lastStaffEntry;
                  newClefInstruction.Parent = lastStaffEntry;
                  lastStaffEntry.Instructions.Add(newClefInstruction);
                }
              } else if (!this.activeClefsHaveBeenInitialized[keyValuePair.key - 1]) {
                let first: SourceMeasure = this.musicSheet.SourceMeasures[0];
                if (first.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1] === undefined) {
                  firstStaffEntry = new SourceStaffEntry(undefined, undefined);
                } else {
                  firstStaffEntry = first.FirstInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1];
                  firstStaffEntry.removeFirstInstructionOfType<ClefInstruction>();
                }
                newClefInstruction.Parent = firstStaffEntry;
                firstStaffEntry.Instructions.Insert(0, newClefInstruction);
                this.activeClefsHaveBeenInitialized[keyValuePair.key - 1] = true;
              } else {
                let lastStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, undefined);
                this.previousMeasure.LastInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1] = lastStaffEntry;
                newClefInstruction.Parent = lastStaffEntry;
                lastStaffEntry.Instructions.Add(newClefInstruction);
              }
              this.activeClefs[keyValuePair.key - 1] = clefInstruction;
              this.abstractInstructions.Remove(keyValuePair);
            }
          }
        }
        if (keyValuePair.key <= this.activeClefs.length && clefInstruction === this.activeClefs[keyValuePair.key - 1])
          this.abstractInstructions.Remove(keyValuePair);
      }
      if (keyValuePair.value instanceof KeyInstruction) {
        let keyInstruction: KeyInstruction = <KeyInstruction>keyValuePair.value;
        if (this.activeKey === undefined || this.activeKey.Key !== keyInstruction.Key) {
          this.activeKey = keyInstruction;
          this.abstractInstructions.Remove(keyValuePair);
          let sourceMeasure: SourceMeasure;
          if (!this.activeKeyHasBeenInitialized) {
            this.activeKeyHasBeenInitialized = true;
            if (this.currentXmlMeasureIndex > 0) {
              sourceMeasure = this.musicSheet.SourceMeasures[0];
            } else {
              sourceMeasure = this.currentMeasure;
            }
          } else {
            sourceMeasure = this.currentMeasure;
          }
          if (sourceMeasure !== undefined) {
            for (let j: number = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + numberOfStaves; j++) {
              let newKeyInstruction: KeyInstruction = keyInstruction;
              if (sourceMeasure.FirstInstructionsStaffEntries[j] === undefined) {
                firstStaffEntry = new SourceStaffEntry(undefined, undefined);
                sourceMeasure.FirstInstructionsStaffEntries[j] = firstStaffEntry;
                newKeyInstruction.Parent = firstStaffEntry;
                firstStaffEntry.Instructions.Add(newKeyInstruction);
              } else {
                firstStaffEntry = sourceMeasure.FirstInstructionsStaffEntries[j];
                newKeyInstruction.Parent = firstStaffEntry;
                firstStaffEntry.removeFirstInstructionOfType<KeyInstruction>();
                if (firstStaffEntry.Instructions.Count === 0) {
                  firstStaffEntry.Instructions.Add(newKeyInstruction);
                } else {
                  if (firstStaffEntry.Instructions[0] instanceof ClefInstruction) {
                    firstStaffEntry.Instructions.Insert(1, newKeyInstruction);
                  } else {
                    firstStaffEntry.Instructions.Insert(0, newKeyInstruction);
                  }
                }
              }
            }
          }
        }
        if (this.activeKey !== undefined && this.activeKey === keyInstruction)
          this.abstractInstructions.Remove(keyValuePair);
      }
      if (keyValuePair.value instanceof RhythmInstruction) {
        let rhythmInstruction: RhythmInstruction = <RhythmInstruction>keyValuePair.value;
        if (this.activeRhythm === undefined || this.activeRhythm !== rhythmInstruction) {
          this.activeRhythm = rhythmInstruction;
          this.abstractInstructions.Remove(keyValuePair);
          if (this.currentMeasure !== undefined) {
            for (let j: number = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + numberOfStaves; j++) {
              let newRhythmInstruction: RhythmInstruction = rhythmInstruction;
              if (this.currentMeasure.FirstInstructionsStaffEntries[j] === undefined) {
                firstStaffEntry = new SourceStaffEntry(undefined, undefined);
                this.currentMeasure.FirstInstructionsStaffEntries[j] = firstStaffEntry;
              } else {
                firstStaffEntry = this.currentMeasure.FirstInstructionsStaffEntries[j];
                firstStaffEntry.removeFirstInstructionOfType<RhythmInstruction>();
              }
              newRhythmInstruction.Parent = firstStaffEntry;
              firstStaffEntry.Instructions.Add(newRhythmInstruction);
            }
          }
        }
        if (this.activeRhythm !== undefined && this.activeRhythm === rhythmInstruction)
          this.abstractInstructions.Remove(keyValuePair);
      }
    }
  }
  */
  private saveClefInstructionAtEndOfMeasure(): void {
    for (let i: number = this.abstractInstructions.Count - 1; i >= 0; i--) {
      let keyValuePair: KeyValuePairClass<number, AbstractNotationInstruction> = this.abstractInstructions[i];
      if (keyValuePair.value instanceof ClefInstruction) {
        let clefInstruction: ClefInstruction = __as__<ClefInstruction>(keyValuePair.value, ClefInstruction);
        if (
          (this.activeClefs[keyValuePair.key - 1] === undefined) ||
          (clefInstruction.ClefType !== this.activeClefs[keyValuePair.key - 1].ClefType || (
            clefInstruction.ClefType === this.activeClefs[keyValuePair.key - 1].ClefType &&
            clefInstruction.Line !== this.activeClefs[keyValuePair.key - 1].Line
          ))) {
          let lastStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, undefined);
          this.currentMeasure.LastInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + keyValuePair.key - 1] = lastStaffEntry;
          let newClefInstruction: ClefInstruction = clefInstruction;
          newClefInstruction.Parent = lastStaffEntry;
          lastStaffEntry.Instructions.Add(newClefInstruction);
          this.activeClefs[keyValuePair.key - 1] = clefInstruction;
          this.abstractInstructions.Remove(keyValuePair);
        }
      }
    }
  }
  private getNoteDurationForTuplet(xmlNode: IXmlElement): Fraction {
    let duration: Fraction = new Fraction(0, 1);
    let typeDuration: Fraction = this.getNoteDurationFromTypeNode(xmlNode);
    if (xmlNode.Element("time-modification") !== undefined) {
      let time: IXmlElement = xmlNode.Element("time-modification");
      if (time !== undefined) {
        if (time.Element("actual-notes") !== undefined && time.Element("normal-notes") !== undefined) {
          let actualNotes: IXmlElement = time.Element("actual-notes");
          let normalNotes: IXmlElement = time.Element("normal-notes");
          if (actualNotes !== undefined && normalNotes !== undefined) {
            let actual: number = StringToNumberConverter.ToInteger(actualNotes.Value);
            let normal: number = StringToNumberConverter.ToInteger(normalNotes.Value);
            duration = new Fraction(normal, actual) * typeDuration;
          }
        }
      }
    }
    return duration;
  }
  private readExpressionStaffNumber(xmlNode: IXmlElement): number {
    let directionStaffNumber: number = 1;
    if (xmlNode.Element("staff") !== undefined) {
      let staffNode: IXmlElement = xmlNode.Element("staff");
      if (staffNode !== undefined) {
        try {
          directionStaffNumber = StringToNumberConverter.ToInteger(staffNode.Value);
        } catch (ex) {
          let errorMsg: string = ITextTranslation.translateText(
            "ReaderErrorMessages/ExpressionStaffError", "Invalid Expression staff number -> set to default."
          );
          this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
          directionStaffNumber = 1;
          Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.readExpressionStaffNumber", errorMsg, ex);
        }

      }
    }
    return directionStaffNumber;
  }
  private readDivisionsFromNotes(): number {
    let divisionsFromNote: number = 0;
    let xmlMeasureIndex: number = this.currentXmlMeasureIndex;
    let read: boolean = false;
    while (!read) {
      let xmlMeasureListArr: IXmlElement[] = this.xmlMeasureList[xmlMeasureIndex].Elements().ToArray();
      for (let idx: number = 0, len: number = xmlMeasureListArr.length; idx < len; ++idx) {
        let xmlNode: IXmlElement = xmlMeasureListArr[idx];
        if (xmlNode.Name === "note" && xmlNode.Element("time-modification") === undefined) {
          if (xmlNode.Element("duration") !== undefined && xmlNode.Element("type") !== undefined) {
            let durationNode: IXmlElement = xmlNode.Element("duration");
            let typeNode: IXmlElement = xmlNode.Element("type");
            if (durationNode !== undefined && typeNode !== undefined) {
              let type: string = typeNode.Value;
              let noteDuration: number = 0;
              try {
                noteDuration = StringToNumberConverter.ToInteger(durationNode.Value);
              } catch (ex) {
                Logger.DefaultLogger.LogError(LogLevel.DEBUG, "InstrumentReader.readDivisionsFromNotes", ex);
                continue;
              }

              switch (type) {
                case "1024th":
                    divisionsFromNote = (noteDuration / 4) * 1024;
                    break;
                case "512th":
                    divisionsFromNote = (noteDuration / 4) * 512;
                    break;
                case "256th":
                    divisionsFromNote = (noteDuration / 4) * 256;
                    break;
                case "128th":
                    divisionsFromNote = (noteDuration / 4) * 128;
                    break;
                case "64th":
                    divisionsFromNote = (noteDuration / 4) * 64;
                    break;
                case "32nd":
                    divisionsFromNote = (noteDuration / 4) * 32;
                    break;
                case "16th":
                    divisionsFromNote = (noteDuration / 4) * 16;
                    break;
                case "eighth":
                    divisionsFromNote = (noteDuration / 4) * 8;
                    break;
                case "quarter":
                    divisionsFromNote = (noteDuration / 4) * 4;
                    break;
                case "half":
                    divisionsFromNote = (noteDuration / 4) * 2;
                    break;
                case "whole":
                    divisionsFromNote = (noteDuration / 4);
                    break;
                case "breve":
                    divisionsFromNote = (noteDuration / 4) / 2;
                    break;
                case "long":
                    divisionsFromNote = (noteDuration / 4) / 4;
                    break;
                case "maxima":
                    divisionsFromNote = (noteDuration / 4) / 8;
                    break;
                default: break;
              }
            }
          }
        }
        if (divisionsFromNote > 0) {
          read = true;
          break;
        }
      }
      if (divisionsFromNote === 0) {
        xmlMeasureIndex++;
        if (xmlMeasureIndex === this.xmlMeasureList.length) {
          let errorMsg: string = ITextTranslation.translateText("ReaderErrorMEssages/DivisionsError", "Invalid divisions value at Instrument: ");
          throw new MusicSheetReadingException(errorMsg + this.instrument.Name, 0);
        }
      }
    }
    return divisionsFromNote;
  }
}

export module InstrumentReader {
  export class KeyValuePairClass<T, TU> {
    constructor(key: T, value: TU) {
      this.key = key;
      this.value = value;
    }
    public key: T;
    public value: TU;
  }
}
