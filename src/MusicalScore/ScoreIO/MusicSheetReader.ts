export class MusicSheetReader implements IMusicSheetReader {
  constructor(afterSheetReadingModules: IAfterSheetReadingModule[]) {
    if (afterSheetReadingModules === undefined) {
      this.afterSheetReadingModules = [];
    } else {
      this.afterSheetReadingModules = afterSheetReadingModules;
    }
    this.repetitionInstructionReader = MusicSymbolModuleFactory.createRepetitionInstructionReader();
    this.repetitionCalculator = MusicSymbolModuleFactory.createRepetitionCalculator();
  }
  private phonicScoreInterface: IPhonicScoreInterface;
  private repetitionInstructionReader: RepetitionInstructionReader;
  private repetitionCalculator: RepetitionCalculator;
  private afterSheetReadingModules: IAfterSheetReadingModule[];
  private musicSheet: MusicSheet;
  private completeNumberOfStaves: number = 0;
  private currentMeasure: SourceMeasure;
  private previousMeasure: SourceMeasure;
  private currentFraction: Fraction;
  public get CompleteNumberOfStaves(): number {
    return this.completeNumberOfStaves;
  }
  private static doCalculationsAfterDurationHasBeenSet(instrumentReaders: InstrumentReader[]): void {
    for (let idx: number = 0, len: number = instrumentReaders.Count; idx < len; ++idx) {
      let instrumentReader: InstrumentReader = instrumentReaders[idx];
      instrumentReader.doCalculationsAfterDurationHasBeenSet();
    }
  }
  public SetPhonicScoreInterface(phonicScoreInterface: IPhonicScoreInterface): void {
    this.phonicScoreInterface = phonicScoreInterface;
  }
  public ReadMusicSheetParameters(sheetObject: MusicSheetParameterObject, root: IXmlElement, path: string): MusicSheetParameterObject {
    this.musicSheet = new MusicSheet();
    if (root !== undefined) {
      this.addSheetLabels(root, path);
      if (this.musicSheet.Title !== undefined) {
        sheetObject.Title = this.musicSheet.Title.Text;
      }
      if (this.musicSheet.Composer !== undefined) {
        sheetObject.Composer = this.musicSheet.Composer.Text;
      }
      if (this.musicSheet.Lyricist !== undefined) {
        sheetObject.Lyricist = this.musicSheet.Lyricist.Text;
      }
      let partlistNode: IXmlElement = root.Element("part-list");
      let partList: IEnumerable<IXmlElement> = partlistNode.Elements();
      this.createInstrumentGroups(partList);
      for (let idx: number = 0, len: number = this.musicSheet.Instruments.Count; idx < len; ++idx) {
        let instr: Instrument = this.musicSheet.Instruments[idx];
        sheetObject.InstrumentList.Add(__init(new MusicSheetParameterObject.LibrarySheetInstrument(), { Name: instr.Name }));
      }
    }
    return sheetObject;
  }
  public createMusicSheet(root: IXmlElement, path: string): MusicSheet {
    try {
      return this._createMusicSheet(root, path);
    } catch (e) {
      Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheetReader.CreateMusicSheet", e);
      return undefined;
    }

  }
  public CreateIMusicSheet(root: IXmlElement, path: string): IMusicSheet {
    return this.createMusicSheet(root, path);
  }
  private _createMusicSheet(root: IXmlElement, path: string): MusicSheet {
    let instrumentReaders: InstrumentReader[] = [];
    let sourceMeasureCounter: number = 0;
    this.musicSheet = new MusicSheet();
    this.musicSheet.Path = path;
    try {
      if (root !== undefined) {
        this.addSheetLabels(root, path);
        let partlistNode: IXmlElement = root.Element("part-list");
        if (partlistNode !== undefined) {
          let partInst: IEnumerable<IXmlElement> = root.Elements("part");
          let partList: IEnumerable<IXmlElement> = partlistNode.Elements();
          this.initializeReading(partList, partInst, instrumentReaders);
          let couldReadMeasure: boolean = true;
          this.currentFraction = new Fraction(0, 1);
          let guitarPro: boolean = false;
          let encoding: IXmlElement = root.Element("identification");
          if (encoding !== undefined) {
            encoding = encoding.Element("encoding");
          }
          if (encoding !== undefined) {
            encoding = encoding.Element("software");
          }
          if (encoding !== undefined && encoding.Value === "Guitar Pro 5") {
            guitarPro = true;
          }
          while (couldReadMeasure) {
            if (this.currentMeasure !== undefined && this.currentMeasure.EndsPiece) {
              sourceMeasureCounter = 0;
            }
            this.currentMeasure = new SourceMeasure(this.completeNumberOfStaves);
            for (let i: number = 0; i < instrumentReaders.Count; i++) {
              try {
                couldReadMeasure = instrumentReaders[i].readNextXmlMeasure(this.currentMeasure, this.currentFraction, guitarPro);
              } catch (e) {
                let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/InstrumentError", "Error while reading instruments.");
                throw new MusicSheetReadingException(errorMsg, e, 0);
              }

            }
            if (couldReadMeasure) {
              this.musicSheet.addMeasure(this.currentMeasure);
              this.checkIfRhythmInstructionsAreSetAndEqual(instrumentReaders);
              this.checkSourceMeasureForundefinedEntries();
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
      if (this.repetitionInstructionReader !== undefined) {
        this.repetitionInstructionReader.removeRedundantInstructions();
        if (this.repetitionCalculator !== undefined) {
          this.repetitionCalculator.calculateRepetitions(this.musicSheet, this.repetitionInstructionReader.RepetitionInstructions);
        }
      }
      this.musicSheet.checkForInstrumentWithNoVoice();
      this.musicSheet.fillStaffList();
      this.musicSheet.DefaultStartTempoInBpm = this.musicSheet.SheetPlaybackSetting.BeatsPerMinute;
      for (let idx: number = 0, len: number = this.afterSheetReadingModules.Count; idx < len; ++idx) {
        let afterSheetReadingModule: IAfterSheetReadingModule = this.afterSheetReadingModules[idx];
        afterSheetReadingModule.calculate(this.musicSheet);
      }
    } catch (e) {
      Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheetReader._createMusicSheet", "", e);
      return undefined;
    }

    return this.musicSheet;
  }

  // Trim from a string also newlines
  private trimString(str: string): string {
    return str.replace(/^\s+|\s+$/g, "");
  }

  private initializeReading(
    partList: IEnumerable<IXmlElement>, partInst: IEnumerable<IXmlElement>,
    instrumentReaders: InstrumentReader[]
  ): void {
    let instrumentDict: Dictionary<string, Instrument> = this.createInstrumentGroups(partList);
    this.completeNumberOfStaves = this.getCompleteNumberOfStavesFromXml(partInst);
    if (partInst.Any()) {
      this.repetitionInstructionReader.MusicSheet = this.musicSheet;
      this.currentFraction = new Fraction(0, 1);
      this.currentMeasure = undefined;
      this.previousMeasure = undefined;
    }
    let counter: number = 0;
    let partInstArr: IXmlElement[] = partInst.ToArray();
    for (let idx: number = 0, len: number = partInstArr.length; idx < len; ++idx) {
      let node: IXmlElement = partInstArr[idx];
      if (node.Attribute("id") !== undefined) {
        let idNode: IXmlAttribute = node.Attribute("id");
        if (idNode !== undefined) {
          let partInstId: string = idNode.Value;
          let currentInstrument: Instrument = instrumentDict[partInstId];
          let xmlMeasureList: IEnumerable<IXmlElement> = node.Elements("measure");
          let instrumentNumberOfStaves: number = 1;
          try {
            instrumentNumberOfStaves = this.getInstrumentNumberOfStavesFromXml(node);
          } catch (err) {
            let errorMsg: string = ITextTranslation.translateText(
              "ReaderErrorMessages/InstrumentStavesNumberError",
              "Invalid number of staves at instrument: "
            );
            this.musicSheet.SheetErrors.Errors.Add(errorMsg + currentInstrument.Name);
            continue;
          }

          currentInstrument.createStaves(instrumentNumberOfStaves);
          let instrumentReader: InstrumentReader = new InstrumentReader(this.repetitionInstructionReader, xmlMeasureList, currentInstrument);
          instrumentReaders.Add(instrumentReader);
          if (this.repetitionInstructionReader !== undefined) {
            this.repetitionInstructionReader.XmlMeasureList[counter] = xmlMeasureList.ToArray();
          }
          counter++;
        }
      }
    }
  }
  private checkIfRhythmInstructionsAreSetAndEqual(instrumentReaders: InstrumentReader[]): void {
    let rhythmInstructions: RhythmInstruction[] = new Array();
    for (let i: number = 0; i < this.completeNumberOfStaves; i++) {
      if (
        this.currentMeasure.FirstInstructionsStaffEntries[i] !== undefined &&
        this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.Last() instanceof RhythmInstruction
      ) {
        rhythmInstructions.Add(<RhythmInstruction>this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.Last());
      }
    }
    let maxRhythmValue: number = 0.0;
    let index: number = -1;
    for (let idx: number = 0, len: number = rhythmInstructions.Count; idx < len; ++idx) {
      let rhythmInstruction: RhythmInstruction = rhythmInstructions[idx];
      if (rhythmInstruction.Rhythm.RealValue > maxRhythmValue) {
        if (this.areRhythmInstructionsMixed(rhythmInstructions) && rhythmInstruction.SymbolEnum !== RhythmSymbolEnum.NONE) { continue; }
        maxRhythmValue = rhythmInstruction.Rhythm.RealValue;
        index = rhythmInstructions.IndexOf(rhythmInstruction);
      }
    }
    if (rhythmInstructions.Count > 0 && rhythmInstructions.Count < this.completeNumberOfStaves) {
      let rhythmInstruction: RhythmInstruction = new RhythmInstruction(rhythmInstructions[index]);
      for (let i: number = 0; i < this.completeNumberOfStaves; i++) {
        if (
          this.currentMeasure.FirstInstructionsStaffEntries[i] !== undefined &&
          !(this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.Last() instanceof RhythmInstruction)
        ) {
          this.currentMeasure.FirstInstructionsStaffEntries[i].removeAllInstructionsOfType<RhythmInstruction>();
          this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.Add(new RhythmInstruction(rhythmInstruction));
        }
        if (this.currentMeasure.FirstInstructionsStaffEntries[i] === undefined) {
          this.currentMeasure.FirstInstructionsStaffEntries[i] = new SourceStaffEntry(undefined, undefined);
          this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.Add(new RhythmInstruction(rhythmInstruction));
        }
      }
      for (let idx: number = 0, len: number = instrumentReaders.Count; idx < len; ++idx) {
        let instrumentReader: InstrumentReader = instrumentReaders[idx];
        instrumentReader.ActiveRhythm = rhythmInstruction;
      }
    }
    if (rhythmInstructions.Count === 0 && this.currentMeasure === this.musicSheet.SourceMeasures[0]) {
      let rhythmInstruction: RhythmInstruction = new RhythmInstruction(new Fraction(4, 4, false), 4, 4, RhythmSymbolEnum.NONE);
      for (let i: number = 0; i < this.completeNumberOfStaves; i++) {
        if (this.currentMeasure.FirstInstructionsStaffEntries[i] === undefined) {
          this.currentMeasure.FirstInstructionsStaffEntries[i] = new SourceStaffEntry(undefined, undefined);
        } else {
          this.currentMeasure.FirstInstructionsStaffEntries[i].removeAllInstructionsOfType<RhythmInstruction>();
        }
        this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.Add(rhythmInstruction);
      }
      for (let idx: number = 0, len: number = instrumentReaders.Count; idx < len; ++idx) {
        let instrumentReader: InstrumentReader = instrumentReaders[idx];
        instrumentReader.ActiveRhythm = rhythmInstruction;
      }
    }
    for (let idx: number = 0, len: number = rhythmInstructions.Count; idx < len; ++idx) {
      let rhythmInstruction: RhythmInstruction = rhythmInstructions[idx];
      if (rhythmInstruction.Rhythm.RealValue < maxRhythmValue) {
        if (this.currentMeasure.FirstInstructionsStaffEntries[rhythmInstructions.IndexOf(rhythmInstruction)].Instructions.Last() instanceof RhythmInstruction) {
          // TODO Test correctness
          let instrs: any = this.currentMeasure.FirstInstructionsStaffEntries[rhythmInstructions.IndexOf(rhythmInstruction)].Instructions;
          instrs[instr.length - 1] = new RhythmInstruction(rhythmInstructions[index];
        }
      }
      if (
        Math.Abs(rhythmInstruction.Rhythm.RealValue - maxRhythmValue) < 0.000001 &&
        rhythmInstruction.SymbolEnum !== RhythmSymbolEnum.NONE &&
        this.areRhythmInstructionsMixed(rhythmInstructions)
      ) {
        rhythmInstruction.SymbolEnum = RhythmSymbolEnum.NONE;
      }
    }
  }
  private areRhythmInstructionsMixed(rhythmInstructions: RhythmInstruction[]): boolean {
    for (let i: number = 1; i < rhythmInstructions.Count; i++) {
      if (
        Math.Abs(rhythmInstructions[i].Rhythm.RealValue - rhythmInstructions[0].Rhythm.RealValue) < 0.000001 &&
      rhythmInstructions[i].SymbolEnum !== rhythmInstructions[0].SymbolEnum
      ) { return true; }
    }
    return false;
  }
  private setSourceMeasureDuration(
    instrumentReaders: InstrumentReader[], sourceMeasureCounter: number
  ): void {
    let activeRhythm: Fraction = new Fraction(0, 1);
    let instrumentsMaxTieNoteFractions: Fraction[] = new Array();
    for (let idx: number = 0, len: number = instrumentReaders.Count; idx < len; ++idx) {
      let instrumentReader: InstrumentReader = instrumentReaders[idx];
      instrumentsMaxTieNoteFractions.Add(instrumentReader.MaxTieNoteFraction);
      let activeRythmMeasure: Fraction = instrumentReader.ActiveRhythm.Rhythm;
      if (activeRhythm < activeRythmMeasure) {
        activeRhythm = new Fraction(activeRythmMeasure.Numerator, activeRythmMeasure.Denominator, false);
      }
    }
    let instrumentsDurations: Fraction[] = this.currentMeasure.calculateInstrumentsDuration(this.musicSheet, instrumentsMaxTieNoteFractions);
    let maxInstrumentDuration: Fraction = new Fraction(0, 1);
    for (let idx: number = 0, len: number = instrumentsDurations.Count; idx < len; ++idx) {
      let instrumentsDuration: Fraction = instrumentsDurations[idx];
      if (maxInstrumentDuration < instrumentsDuration) {
        maxInstrumentDuration = instrumentsDuration;
      }
    }
    if (Fraction.Equal(maxInstrumentDuration, activeRhythm)) {
      this.checkFractionsForEquivalence(maxInstrumentDuration, activeRhythm);
    } else {
      if (maxInstrumentDuration < activeRhythm) {
        maxInstrumentDuration = this.currentMeasure.reverseCheck(this.musicSheet, maxInstrumentDuration);
        this.checkFractionsForEquivalence(maxInstrumentDuration, activeRhythm);
      }
    }
    this.currentMeasure.ImplicitMeasure = this.checkIfMeasureIsImplicit(maxInstrumentDuration, activeRhythm);
    if (!this.currentMeasure.ImplicitMeasure) {
      sourceMeasureCounter++;
    }
    this.currentMeasure.Duration = maxInstrumentDuration;
    this.currentMeasure.MeasureNumber = sourceMeasureCounter;
    for (let i: number = 0; i < instrumentsDurations.Count; i++) {
      let instrumentsDuration: Fraction = instrumentsDurations[i];
      if (
        (this.currentMeasure.ImplicitMeasure && instrumentsDuration !== maxInstrumentDuration) ||
        instrumentsDuration !== activeRhythm && // FIXME
        !this.allInstrumentsHaveSameDuration(instrumentsDurations, maxInstrumentDuration)
      ) {
        let firstStaffIndexOfInstrument: number = this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.musicSheet.Instruments[i]);
        for (let staffIndex: number = 0; staffIndex < this.musicSheet.Instruments[i].Staves.Count; staffIndex++) {
          if (!this.staffMeasureIsEmpty(firstStaffIndexOfInstrument + staffIndex)) {
            this.currentMeasure.setErrorInStaffMeasure(firstStaffIndexOfInstrument + staffIndex, true);
            let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/MissingNotesError", "Given Notes don't correspond to measure duration.");
            this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
          }
        }
      }
    }
  }
  private checkFractionsForEquivalence(maxInstrumentDuration: Fraction, activeRhythm: Fraction): void {
    if (activeRhythm.Denominator > maxInstrumentDuration.Denominator) {
      let factor: number = activeRhythm.Denominator / maxInstrumentDuration.Denominator;
      maxInstrumentDuration.multiplyWithFactor(factor);
    }
  }
  private checkIfMeasureIsImplicit(maxInstrumentDuration: Fraction, activeRhythm: Fraction): boolean {
    if (this.previousMeasure === undefined && maxInstrumentDuration < activeRhythm) { return true; }
    if (this.previousMeasure !== undefined) {
      return (this.previousMeasure.Duration + maxInstrumentDuration === activeRhythm);
    }
    return false;
  }
  private allInstrumentsHaveSameDuration(
    instrumentsDurations: Fraction[], maxInstrumentDuration: Fraction
  ): boolean {
    let counter: number = 0;
    for (let idx: number = 0, len: number = instrumentsDurations.Count; idx < len; ++idx) {
      let instrumentsDuration: Fraction = instrumentsDurations[idx];
      if (instrumentsDuration === maxInstrumentDuration) { counter++; }
    }
    return (counter === instrumentsDurations.Count && maxInstrumentDuration !== new Fraction(0, 1));
  }
  private staffMeasureIsEmpty(index: number): boolean {
    let counter: number = 0;
    for (let i: number = 0; i < this.currentMeasure.VerticalSourceStaffEntryContainers.Count; i++) {
      if (this.currentMeasure.VerticalSourceStaffEntryContainers[i][index] === undefined) { counter++; }
    }
    return (counter === this.currentMeasure.VerticalSourceStaffEntryContainers.Count);
  }
  private checkSourceMeasureForundefinedEntries(): void {
    for (let i: number = this.currentMeasure.VerticalSourceStaffEntryContainers.Count - 1; i >= 0; i--) {
      for (let j: number = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.Count - 1; j >= 0; j--) {
        let sourceStaffEntry: SourceStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[j];
        if (sourceStaffEntry !== undefined) {
          for (let k: number = sourceStaffEntry.VoiceEntries.Count - 1; k >= 0; k--) {
            let voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[k];
            if (voiceEntry.Notes.Count === 0) {
              voiceEntry.ParentVoice.VoiceEntries.Remove(voiceEntry);
              sourceStaffEntry.VoiceEntries.Remove(voiceEntry);
            }
          }
        }
        if (sourceStaffEntry !== undefined && sourceStaffEntry.VoiceEntries.Count === 0) {
          this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[j] = undefined;
        }
      }
    }
    for (let i: number = this.currentMeasure.VerticalSourceStaffEntryContainers.Count - 1; i >= 0; i--) {
      let counter: number = 0;
      for (let idx: number = 0, len: number = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.Count; idx < len; ++idx) {
        let sourceStaffEntry: SourceStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[idx];
        if (sourceStaffEntry === undefined) { counter++; }
      }
      if (counter === this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.Count) {
        this.currentMeasure.VerticalSourceStaffEntryContainers.Remove(this.currentMeasure.VerticalSourceStaffEntryContainers[i]);
      }
    }
  }
  private addSheetLabels(root: IXmlElement, filePath: string): void {
    this.readComposer(root);
    this.readTitle(root);
    if (this.musicSheet.Title === undefined || this.musicSheet.Composer === undefined) {
      this.readTitleAndComposerFromCredits(root);
    }
    if (this.musicSheet.Title === undefined) {
      try {
        let bar_i: number = Math.max(
          0, filePath.lastIndexOf("/"), filePath.lastIndexOf("\\")
        );
        let filename: string = filePath.substr(bar_i);
        let filenameSplits: string[] = filename.split(".", 1);
        this.musicSheet.Title = new Label(filenameSplits[0]);
      } catch (ex) {
        Logger.DefaultLogger.LogError(
          LogLevel.NORMAL, "MusicSheetReader.addSheetLabels: ", ex
        );
      }

    }
  }
  // Checks whether _elem_ has an attribute with value _val_.
  private presentAttrsWithValue(elem: IXmlElement, val: string): boolean {
    for (let attr of elem.Attributes()) {
      if (attr.Value === val) { return true; }
    }
    return false;
  }

  private readComposer(root: IXmlElement): void {
    let identificationNode: IXmlElement = root.Element("identification");
    if (identificationNode !== undefined) {
      let creators: IXmlElement[] = identificationNode.Elements("creator").ToArray();
      for (let idx: number = 0, len: number = creators.length; idx < len; ++idx) {
        let creator: IXmlElement = creators[idx];
        if (creator.HasAttributes) {
          if (this.presentAttrsWithValue("composer")) {
            this.musicSheet.Composer = new Label(MusicSheetReader.String(creator.Value));
            continue;
          }
          if (this.presentAttrsWithValue("lyricist") || this.presentAttrsWithValue("poet")) {
            this.musicSheet.Lyricist = new Label(this.trimString(creator.Value));
          }
        }
      }
    }
  }
  private readTitleAndComposerFromCredits(root: IXmlElement): void {
    let systemYCoordinates: number = this.computeSystemYCoordinates(root);
    if (systemYCoordinates === 0) { return; }
    let largestTitleCreditSize: number = 1;
    let finalTitle: string = undefined;
    let largestCreditYInfo: number = 0;
    let finalSubtitle: string = undefined;
    let possibleTitle: string = undefined;
    let creditElements: IXmlElement[] = root.Elements("credit").ToArray();
    for (let idx: number = 0, len: number = creditElements.length; idx < len; ++idx) {
      let credit: IXmlElement = creditElements[idx];
      if (credit.Attribute("page") === undefined) { return; }
      if (credit.Attribute("page").Value === "1") {
        let creditChild: IXmlElement = undefined;
        if (credit !== undefined) {
          creditChild = credit.Element("credit-words");
          if (creditChild.Attribute("justify") === undefined) {
            break;
          }
          let creditJustify: string = creditChild.Attribute("justify").Value;
          let creditY: string = creditChild.Attribute("default-y").Value;
          let creditYInfo: number = StringToNumberConverter.ToNumber(creditY);
          if (creditYInfo > systemYCoordinates) {
            if (this.musicSheet.Title === undefined) {
              let creditSize: string = creditChild.Attribute("font-size").Value;
              let titleCreditSizeInt: number = StringToNumberConverter.ToNumber(creditSize);
              if (largestTitleCreditSize < titleCreditSizeInt) {
                largestTitleCreditSize = titleCreditSizeInt;
                finalTitle = creditChild.Value;
              }
            }
            if (this.musicSheet.Subtitle === undefined) {
              if (creditJustify !== "right" && creditJustify !== "left") {
                if (largestCreditYInfo < creditYInfo) {
                  largestCreditYInfo = creditYInfo;
                  if (!String.IsundefinedOrEmpty(possibleTitle)) {
                    finalSubtitle = possibleTitle;
                    possibleTitle = creditChild.Value;
                  } else {
                    possibleTitle = creditChild.Value;
                  }
                }
              }
            }
            if (!(this.musicSheet.Composer !== undefined && this.musicSheet.Lyricist !== undefined)) {
              switch (creditJustify) {
                case "right":
                  this.musicSheet.Composer = new Label(this.trimString(creditChild.Value));
                  break;
                case "left":
                  this.musicSheet.Lyricist = new Label(this.trimString(creditChild.Value));
                  break;
                default: break;
              }
            }
          }
        }
      }
    }
    if (this.musicSheet.Title === undefined && !String.IsundefinedOrEmpty(finalTitle)) {
      this.musicSheet.Title = new Label(this.trimString(finalTitle));
    }
    if (this.musicSheet.Subtitle === undefined && !String.IsundefinedOrEmpty(finalSubtitle)) {
      this.musicSheet.Subtitle = new Label(this.trimString(finalSubtitle));
    }
  }
  private computeSystemYCoordinates(root: IXmlElement): number {
    if (root.Element("defaults") === undefined) {
      return 0;
    }
    let paperHeight: number = 0;
    let topSystemDistance: number = 0;
    let defi: string = root.Element("defaults").Element("page-layout").Element("page-height").Value;
    paperHeight = StringToNumberConverter.ToNumber(defi);
    let found: boolean = false;
    let parts: IXmlElement[] = root.Elements("part").ToArray();
    for (let idx: number = 0, len: number = parts.length; idx < len; ++idx) {
      let measures: IXmlElement[] = parts[idx].Elements("measure").ToArray();
      for (let idx2: number = 0, len2: number = measures.length; idx2 < len2; ++idx2) {
        let measure: IXmlElement = measures[idx2];
        if (measure.Element("print") !== undefined) {
          let systemLayouts: IXmlElement[] = measure.Element("print").Elements("system-layout").ToArray();
          for (let idx3: number = 0, len3: number = systemLayouts.length; idx3 < len3; ++idx3) {
            let syslab: IXmlElement = systemLayouts[idx3];
            if (syslab.Element("top-system-distance") !== undefined) {
              let topSystemDistanceString: string = syslab.Element("top-system-distance").Value;
              topSystemDistance = StringToNumberConverter.ToNumber(topSystemDistanceString);
              found = true;
              break;
            }
          }
          break;
        }
      }
      if (found) { break; }
    }
    if (root.Element("defaults").Element("system-layout") !== undefined) {
      let syslay: IXmlElement = root.Element("defaults").Element("system-layout");
      if (syslay.Element("top-system-distance") !== undefined) {
        let topSystemDistanceString: string = root.Element("defaults").Element("system-layout").Element("top-system-distance").Value;
        topSystemDistance = StringToNumberConverter.ToNumber(topSystemDistanceString);
      }
    }
    if (topSystemDistance === 0) { return 0; }
    return paperHeight - topSystemDistance;
  }
  private readTitle(root: IXmlElement): void {
    let titleNode: IXmlElement = root.Element("work");
    let titleNodeChild: IXmlElement = undefined;
    if (titleNode !== undefined) {
      titleNodeChild = titleNode.Element("work-title");
      if (titleNodeChild !== undefined && !String.IsundefinedOrEmpty(titleNodeChild.Value)) {
        this.musicSheet.Title = new Label(this.trimString(titleNodeChild.Value));
      }
    }
    let movementNode: IXmlElement = root.Element("movement-title");
    let finalSubTitle: string = "";
    if (movementNode !== undefined) {
      if (this.musicSheet.Title === undefined) {
        this.musicSheet.Title = new Label(this.trimString(movementNode.Value));
      } else {
        finalSubTitle = this.trimString(movementNode.Value);
      }
    }
    if (titleNode !== undefined) {
      let subtitleNodeChild: IXmlElement = titleNode.Element("work-number");
      if (subtitleNodeChild !== undefined) {
        let workNumber: string = subtitleNodeChild.Value;
        if (!String.IsundefinedOrEmpty(workNumber)) {
          if (String.IsundefinedOrEmpty(finalSubTitle)) {
            finalSubTitle = workNumber;
          } else {
            finalSubTitle = finalSubTitle + ", " + workNumber;
          }
        }
      }
    }
    if (!String.IsundefinedOrEmpty(finalSubTitle)) {
      this.musicSheet.Subtitle = new Label(finalSubTitle);
    }
  }
  private createInstrumentGroups(entryList: IEnumerable<IXmlElement>): Dictionary<string, Instrument> {
    let instrumentId: number = 0;
    let instrumentDict: Dictionary<string, Instrument> = new Dictionary<string, Instrument>();
    let currentGroup: InstrumentalGroup = undefined;
    try {
      let entryArray: IXmlElement[] = entryList.ToArray();
      for (let idx: number = 0, len: number = entryArray.length; idx < len; ++idx) {
        let node: IXmlElement = entryArray[idx];
        if (node.Name === "score-part") {
          let instrIdString: string = node.Attribute("id").Value;
          let instrument: Instrument = new Instrument(instrumentId, instrIdString, this.phonicScoreInterface, this.musicSheet, currentGroup);
          instrumentId++;
          let partElements: IXmlElement[] = node.Elements().ToArray();
          for (let idx2: number = 0, len2: number = partElements.length; idx2 < len2; ++idx2) {
            let partElement: IXmlElement = partElements[idx2];
            try {
              if (partElement.Name === "part-name") {
                instrument.Name = partElement.Value;
              } else if (partElement.Name === "score-instrument") {
                let subInstrument: SubInstrument = new SubInstrument(instrument);
                subInstrument.IdString = partElement.FirstAttribute.Value;
                instrument.SubInstruments.Add(subInstrument);
                let subElement: IXmlElement = partElement.Element("instrument-name");
                if (subElement !== undefined) {
                  subInstrument.Name = subElement.Value;
                  subInstrument.setMidiInstrument(subElement.Value);
                }
              } else if (partElement.Name === "midi-instrument") {
                let subInstrument: SubInstrument = instrument.getSubInstrument(partElement.FirstAttribute.Value);
                for (let idx3: number = 0, len3: number = instrument.SubInstruments.Count; idx3 < len3; ++idx3) {
                  let subInstr: SubInstrument = instrument.SubInstruments[idx3];
                  if (subInstr.IdString === partElement.Value) {
                    subInstrument = subInstr;
                    break;
                  }
                }
                let instrumentElements: IXmlElement[] = partElement.Elements().ToArray();
                for (let idx3: number = 0, len3: number = instrumentElements.length; idx3 < len3; ++idx3) {
                  let instrumentElement: IXmlElement = instrumentElements[idx3];
                  try {
                    if (instrumentElement.Name === "midi-channel") {
                      if (StringToNumberConverter.ToInteger(instrumentElement.Value) === 10) {
                        instrument.MidiInstrumentId = MidiInstrument.Percussion;
                      }
                    } else if (instrumentElement.Name === "midi-program") {
                      if (instrument.SubInstruments.Count > 0 && instrument.MidiInstrumentId !== MidiInstrument.Percussion) {
                        subInstrument.MidiInstrumentId = <MidiInstrument>Math.Max(0, StringToNumberConverter.ToInteger(instrumentElement.Value) - 1);
                      }
                    } else if (instrumentElement.Name === "midi-unpitched") {
                      subInstrument.FixedKey = Math.Max(0, StringToNumberConverter.ToInteger(instrumentElement.Value));
                    } else if (instrumentElement.Name === "volume") {
                      try {
                        let result: number = <number>StringToNumberConverter.ToNumber(instrumentElement.Value);
                        subInstrument.Volume = result / 127.0;
                      } catch (ex) {
                        Logger.DefaultLogger.LogError(LogLevel.DEBUG, "ExpressionReader.readExpressionParameters", "read volume", ex);
                      }

                    } else if (instrumentElement.Name === "pan") {
                      try {
                        let result: number = <number>StringToNumberConverter.ToNumber(instrumentElement.Value);
                        subInstrument.Pan = result / 64.0;
                      } catch (ex) {
                        Logger.DefaultLogger.LogError(LogLevel.DEBUG, "ExpressionReader.readExpressionParameters", "read pan", ex);
                      }

                    }
                  } catch (ex) {
                    Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheetReader.createInstrumentGroups midi settings: ", ex);
                  }

                }
              }
            } catch (ex) {
              Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheetReader.createInstrumentGroups: ", ex);
            }

          }
          if (instrument.SubInstruments.Count === 0) {
            let subInstrument: SubInstrument = new SubInstrument(instrument);
            instrument.SubInstruments.Add(subInstrument);
          }
          instrumentDict.Add(instrIdString, instrument);
          if (currentGroup !== undefined) {
            currentGroup.InstrumentalGroups.Add(instrument);
            this.musicSheet.Instruments.Add(instrument);
          } else {
            this.musicSheet.InstrumentalGroups.Add(instrument);
            this.musicSheet.Instruments.Add(instrument);
          }
        } else {
          if ((node.Name === "part-group") && (node.Attribute("type").Value === "start")) {
            let iG: InstrumentalGroup = new InstrumentalGroup("group", this.musicSheet, currentGroup);
            if (currentGroup !== undefined) {
              currentGroup.InstrumentalGroups.Add(iG);
            } else {
              this.musicSheet.InstrumentalGroups.Add(iG);
            }
            currentGroup = iG;
          } else {
            if ((node.Name === "part-group") && (node.Attribute("type").Value === "stop")) {
              if (currentGroup !== undefined) {
                if (currentGroup.InstrumentalGroups.Count === 1) {
                  let instr: InstrumentalGroup = currentGroup.InstrumentalGroups[0];
                  if (currentGroup.Parent !== undefined) {
                    currentGroup.Parent.InstrumentalGroups.Add(instr);
                    currentGroup.Parent.InstrumentalGroups.Remove(currentGroup);
                  } else {
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
    } catch (e) {
      let errorMsg: string = ITextTranslation.translateText(
        "ReaderErrorMessages/InstrumentError", "Error while reading Instruments"
      );
      throw new MusicSheetReadingException(errorMsg, e, 0);
    }

    for (let idx: number = 0, len: number = this.musicSheet.Instruments.Count; idx < len; ++idx) {
      let instrument: Instrument = this.musicSheet.Instruments[idx];
      if (string.IsundefinedOrEmpty(instrument.Name)) {
        instrument.Name = "Instr. " + instrument.IdString;
      }
    }
    return instrumentDict;
  }
  private getCompleteNumberOfStavesFromXml(partInst: IEnumerable<IXmlElement>): number {
    let number: number = 0;
    let partInstArr: IXmlElement[] = partInst.ToArray();
    for (let idx: number = 0, len: number = partInstArr.length; idx < len; ++idx) {
      let partNode: IXmlElement = partInstArr[idx];
      let xmlMeasureList: IEnumerable<IXmlElement> = partNode.Elements("measure");
      if (xmlMeasureList !== undefined) {
        let xmlMeasure: IXmlElement = xmlMeasureList.First();
        if (xmlMeasure !== undefined) {
          let stavesNode: IXmlElement = xmlMeasure.Element("attributes");
          if (stavesNode !== undefined) {
            stavesNode = stavesNode.Element("staves");
          }
          if (stavesNode === undefined) {
            number++;
          } else {
            number += StringToNumberConverter.ToInteger(stavesNode.Value);
          }
        }
      }
    }
    if (number <= 0) {
      let errorMsg: string = ITextTranslation.translateText(
        "ReaderErrorMessages/StaffError", "Invalid number of staves."
      );
      throw new MusicSheetReadingException(errorMsg);
    }
    return number;
  }
  private getInstrumentNumberOfStavesFromXml(partNode: IXmlElement): number {
    let number: number = 0;
    let xmlMeasure: IXmlElement = partNode.Element("measure");
    if (xmlMeasure !== undefined) {
      let attributes: IXmlElement = xmlMeasure.Element("attributes");
      let staves: IXmlElement = undefined;
      if (attributes !== undefined) {
        staves = attributes.Element("staves");
      }
      if (attributes === undefined || staves === undefined) {
        number = 1;
      } else {
        number = StringToNumberConverter.ToInteger(staves.Value);
      }
    }
    if (number <= 0) {
      let errorMsg: string = ITextTranslation.translateText(
        "ReaderErrorMessages/StaffError", "Invalid number of Staves."
      );
      throw new MusicSheetReadingException(errorMsg);
    }
    return number;
  }
}
