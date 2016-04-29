import {MusicSheet} from "../MusicSheet";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {Fraction} from "../../Common/DataObjects/fraction";
import {InstrumentReader} from "./InstrumentReader";
import {IXmlElement} from "../../Common/FileIO/Xml";
import {Instrument} from "../Instrument";
import {ITextTranslation} from "../Interfaces/ITextTranslation";
import {MusicSheetReadingException} from "../Exceptions";
import {logging} from "../../Common/logging";
import {IXmlAttribute} from "../../Common/FileIO/Xml";
import {RhythmInstruction} from "../VoiceData/Instructions/RhythmInstruction";
import {RhythmSymbolEnum} from "../VoiceData/Instructions/RhythmInstruction";
import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {VoiceEntry} from "../VoiceData/VoiceEntry";
import {Label} from "../Label";
import {InstrumentalGroup} from "../InstrumentalGroup";
import {SubInstrument} from "../SubInstrument";
import {MidiInstrument} from "../VoiceData/Instructions/ClefInstruction";
import {AbstractNotationInstruction} from "../VoiceData/Instructions/AbstractNotationInstruction";

type RepetitionInstructionReader = any;

export class MusicSheetReader /*implements IMusicSheetReader*/ {

  //constructor(afterSheetReadingModules: IAfterSheetReadingModule[]) {
  //  if (afterSheetReadingModules === undefined) {
  //    this.afterSheetReadingModules = [];
  //  } else {
  //    this.afterSheetReadingModules = afterSheetReadingModules;
  //  }
  //  this.repetitionInstructionReader = MusicSymbolModuleFactory.createRepetitionInstructionReader();
  //  this.repetitionCalculator = MusicSymbolModuleFactory.createRepetitionCalculator();
  //}

  private repetitionInstructionReader: RepetitionInstructionReader;
  // private repetitionCalculator: RepetitionCalculator;
  // private afterSheetReadingModules: IAfterSheetReadingModule[];
  private musicSheet: MusicSheet;
  private completeNumberOfStaves: number = 0;
  private currentMeasure: SourceMeasure;
  private previousMeasure: SourceMeasure;
  private currentFraction: Fraction;

  public get CompleteNumberOfStaves(): number {
    return this.completeNumberOfStaves;
  }
  private static doCalculationsAfterDurationHasBeenSet(instrumentReaders: InstrumentReader[]): void {
    for (let instrumentReader of instrumentReaders) {
      instrumentReader.doCalculationsAfterDurationHasBeenSet();
    }
  }

  //public SetPhonicScoreInterface(phonicScoreInterface: IPhonicScoreInterface): void {
  //  this.phonicScoreInterface = phonicScoreInterface;
  //}
  //public ReadMusicSheetParameters(sheetObject: MusicSheetParameterObject, root: IXmlElement, path: string): MusicSheetParameterObject {
  //  this.musicSheet = new MusicSheet();
  //  if (root !== undefined) {
  //    this.pushSheetLabels(root, path);
  //    if (this.musicSheet.Title !== undefined) {
  //      sheetObject.Title = this.musicSheet.Title.Text;
  //    }
  //    if (this.musicSheet.Composer !== undefined) {
  //      sheetObject.Composer = this.musicSheet.Composer.Text;
  //    }
  //    if (this.musicSheet.Lyricist !== undefined) {
  //      sheetObject.Lyricist = this.musicSheet.Lyricist.Text;
  //    }
  //    let partlistNode: IXmlElement = root.Element("part-list");
  //    let partList: IXmlElement[] = partlistNode.Elements();
  //    this.createInstrumentGroups(partList);
  //    for (let idx: number = 0, len: number = this.musicSheet.Instruments.length; idx < len; ++idx) {
  //      let instr: Instrument = this.musicSheet.Instruments[idx];
  //      sheetObject.InstrumentList.push(__init(new MusicSheetParameterObject.LibrarySheetInstrument(), { Name: instr.Name }));
  //    }
  //  }
  //  return sheetObject;
  //}
  public createMusicSheet(root: IXmlElement, path: string): MusicSheet {
    try {
      return this._createMusicSheet(root, path);
    } catch (e) {
      logging.log("MusicSheetReader.CreateMusicSheet", e);
    }

  }
  //public CreateIMusicSheet(root: IXmlElement, path: string): IMusicSheet {
  //  return this.createMusicSheet(root, path);
  //}

  private _removeFromArray(list: any[], elem: any) {
    let i: number = list.indexOf(elem);
    if (i !== -1) {
      list.splice(i, 1);
    }
  }

  private _createMusicSheet(root: IXmlElement, path: string): MusicSheet {
    let instrumentReaders: InstrumentReader[] = [];
    let sourceMeasureCounter: number = 0;
    this.musicSheet = new MusicSheet();
    this.musicSheet.Path = path;
    try {
      if (root !== undefined) {
        // this.pushSheetLabels(root, path); // FIXME Andrea
        let partlistNode: IXmlElement = root.Element("part-list");
        if (partlistNode !== undefined) {
          let partInst: IXmlElement[] = root.Elements("part");
          let partList: IXmlElement[] = partlistNode.Elements();
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
            for (let instrumentReader of instrumentReaders) {
              try {
                couldReadMeasure = instrumentReader.readNextXmlMeasure(this.currentMeasure, this.currentFraction, guitarPro);
              } catch (e) {
                let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/InstrumentError", "Error while reading instruments.");
                throw new MusicSheetReadingException(errorMsg, e);
              }

            }
            if (couldReadMeasure) {
              this.musicSheet.addMeasure(this.currentMeasure);
              this.checkIfRhythmInstructionsAreSetAndEqual(instrumentReaders);
              this.checkSourceMeasureForundefinedEntries();
              this.setSourceMeasureDuration(instrumentReaders, sourceMeasureCounter);
              MusicSheetReader.doCalculationsAfterDurationHasBeenSet(instrumentReaders);
              this.currentMeasure.AbsoluteTimestamp = this.currentFraction.clone();
              this.musicSheet.SheetErrors.TransferTempErrorsToDict(this.currentMeasure.MeasureNumber);
              this.currentFraction.Add(this.currentMeasure.Duration);
              this.previousMeasure = this.currentMeasure;
            }
          }
        }
      }
      //if (this.repetitionInstructionReader !== undefined) {
      //  this.repetitionInstructionReader.removeRedundantInstructions();
      //  if (this.repetitionCalculator !== undefined) {
      //    this.repetitionCalculator.calculateRepetitions(this.musicSheet, this.repetitionInstructionReader.RepetitionInstructions);
      //  }
      //}
      this.musicSheet.checkForInstrumentWithNoVoice();
      this.musicSheet.fillStaffList();
      //this.musicSheet.DefaultStartTempoInBpm = this.musicSheet.SheetPlaybackSetting.BeatsPerMinute;
      //for (let idx: number = 0, len: number = this.afterSheetReadingModules.length; idx < len; ++idx) {
      //  let afterSheetReadingModule: IAfterSheetReadingModule = this.afterSheetReadingModules[idx];
      //  afterSheetReadingModule.calculate(this.musicSheet);
      //}
    } catch (e) {
      logging.log("MusicSheetReader._createMusicSheet", e);
    }

    return this.musicSheet;
  }

  // Trim from a string also newlines
  private trimString(str: string): string {
    return str.replace(/^\s+|\s+$/g, "");
  }

  private _lastElement<T>(list: T[]): T {
    return list[list.length -1];
  }

  private initializeReading(
    partList: IXmlElement[], partInst: IXmlElement[], instrumentReaders: InstrumentReader[]
  ): void {
    let instrumentDict: { [_:string]: Instrument; } = this.createInstrumentGroups(partList);
    this.completeNumberOfStaves = this.getCompleteNumberOfStavesFromXml(partInst);
    if (partInst.length !== 0) {
      // (*) this.repetitionInstructionReader.MusicSheet = this.musicSheet;
      this.currentFraction = new Fraction(0, 1);
      this.currentMeasure = undefined;
      this.previousMeasure = undefined;
    }
    let counter: number = 0;
    let partInstArr: IXmlElement[] = partInst.slice();
    for (let idx: number = 0, len: number = partInstArr.length; idx < len; ++idx) {
      let node: IXmlElement = partInstArr[idx];
      if (node.Attribute("id") !== undefined) {
        let idNode: IXmlAttribute = node.Attribute("id");
        if (idNode !== undefined) {
          let partInstId: string = idNode.Value;
          let currentInstrument: Instrument = instrumentDict[partInstId];
          let xmlMeasureList: IXmlElement[] = node.Elements("measure");
          let instrumentNumberOfStaves: number = 1;
          try {
            instrumentNumberOfStaves = this.getInstrumentNumberOfStavesFromXml(node);
          } catch (err) {
            let errorMsg: string = ITextTranslation.translateText(
              "ReaderErrorMessages/InstrumentStavesNumberError",
              "Invalid number of staves at instrument: "
            );
            this.musicSheet.SheetErrors.push(errorMsg + currentInstrument.Name);
            continue;
          }

          currentInstrument.createStaves(instrumentNumberOfStaves);
          let instrumentReader: InstrumentReader = new InstrumentReader(this.repetitionInstructionReader, xmlMeasureList, currentInstrument);
          instrumentReaders.push(instrumentReader);
          //if (this.repetitionInstructionReader !== undefined) {
          //  this.repetitionInstructionReader.XmlMeasureList[counter] = xmlMeasureList;
          //}
          counter++;
        }
      }
    }
  }
  private checkIfRhythmInstructionsAreSetAndEqual(instrumentReaders: InstrumentReader[]): void {
    let rhythmInstructions: RhythmInstruction[] = [];
    for (let i: number = 0; i < this.completeNumberOfStaves; i++) {
      if (this.currentMeasure.FirstInstructionsStaffEntries[i] !== undefined) {
        let last = this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions[this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.length - 1];
        if (last instanceof RhythmInstruction) {
          rhythmInstructions.push(<RhythmInstruction>last);
        }
      }
    }
    let maxRhythmValue: number = 0.0;
    let index: number = -1;
    for (let idx: number = 0, len: number = rhythmInstructions.length; idx < len; ++idx) {
      let rhythmInstruction: RhythmInstruction = rhythmInstructions[idx];
      if (rhythmInstruction.Rhythm.RealValue > maxRhythmValue) {
        if (this.areRhythmInstructionsMixed(rhythmInstructions) && rhythmInstruction.SymbolEnum !== RhythmSymbolEnum.NONE) { continue; }
        maxRhythmValue = rhythmInstruction.Rhythm.RealValue;
        index = rhythmInstructions.indexOf(rhythmInstruction);
      }
    }
    if (rhythmInstructions.length > 0 && rhythmInstructions.length < this.completeNumberOfStaves) {
      let rhythmInstruction: RhythmInstruction = rhythmInstructions[index].clone();
      for (let i: number = 0; i < this.completeNumberOfStaves; i++) {
        if (
          this.currentMeasure.FirstInstructionsStaffEntries[i] !== undefined &&
          !(this._lastElement(this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions) instanceof RhythmInstruction)
        ) {
          this.currentMeasure.FirstInstructionsStaffEntries[i].removeAllInstructionsOfTypeRhythmInstruction();
          this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.push(rhythmInstruction.clone());
        }
        if (this.currentMeasure.FirstInstructionsStaffEntries[i] === undefined) {
          this.currentMeasure.FirstInstructionsStaffEntries[i] = new SourceStaffEntry(undefined, undefined);
          this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.push(rhythmInstruction.clone());
        }
      }
      for (let idx: number = 0, len: number = instrumentReaders.length; idx < len; ++idx) {
        let instrumentReader: InstrumentReader = instrumentReaders[idx];
        instrumentReader.ActiveRhythm = rhythmInstruction;
      }
    }
    if (rhythmInstructions.length === 0 && this.currentMeasure === this.musicSheet.SourceMeasures[0]) {
      let rhythmInstruction: RhythmInstruction = new RhythmInstruction(new Fraction(4, 4, false), 4, 4, RhythmSymbolEnum.NONE);
      for (let i: number = 0; i < this.completeNumberOfStaves; i++) {
        if (this.currentMeasure.FirstInstructionsStaffEntries[i] === undefined) {
          this.currentMeasure.FirstInstructionsStaffEntries[i] = new SourceStaffEntry(undefined, undefined);
        } else {
          this.currentMeasure.FirstInstructionsStaffEntries[i].removeAllInstructionsOfTypeRhythmInstruction();
        }
        this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.push(rhythmInstruction);
      }
      for (let idx: number = 0, len: number = instrumentReaders.length; idx < len; ++idx) {
        let instrumentReader: InstrumentReader = instrumentReaders[idx];
        instrumentReader.ActiveRhythm = rhythmInstruction;
      }
    }
    for (let idx: number = 0, len: number = rhythmInstructions.length; idx < len; ++idx) {
      let rhythmInstruction: RhythmInstruction = rhythmInstructions[idx];
      if (rhythmInstruction.Rhythm.RealValue < maxRhythmValue) {
        if (this._lastElement(this.currentMeasure.FirstInstructionsStaffEntries[rhythmInstructions.indexOf(rhythmInstruction)].Instructions) instanceof RhythmInstruction) {
          // TODO Test correctness
          let instrs: AbstractNotationInstruction[] = this.currentMeasure.FirstInstructionsStaffEntries[rhythmInstructions.indexOf(rhythmInstruction)].Instructions;
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
  private areRhythmInstructionsMixed(rhythmInstructions: RhythmInstruction[]): boolean {
    for (let i: number = 1; i < rhythmInstructions.length; i++) {
      if (
        Math.abs(rhythmInstructions[i].Rhythm.RealValue - rhythmInstructions[0].Rhythm.RealValue) < 0.000001 &&
      rhythmInstructions[i].SymbolEnum !== rhythmInstructions[0].SymbolEnum
      ) { return true; }
    }
    return false;
  }
  private setSourceMeasureDuration(
    instrumentReaders: InstrumentReader[], sourceMeasureCounter: number
  ): void {
    let activeRhythm: Fraction = new Fraction(0, 1);
    let instrumentsMaxTieNoteFractions: Fraction[] = [];
    for (let idx: number = 0, len: number = instrumentReaders.length; idx < len; ++idx) {
      let instrumentReader: InstrumentReader = instrumentReaders[idx];
      instrumentsMaxTieNoteFractions.push(instrumentReader.MaxTieNoteFraction);
      let activeRythmMeasure: Fraction = instrumentReader.ActiveRhythm.Rhythm;
      if (activeRhythm < activeRythmMeasure) {
        activeRhythm = new Fraction(activeRythmMeasure.Numerator, activeRythmMeasure.Denominator, false);
      }
    }
    let instrumentsDurations: Fraction[] = this.currentMeasure.calculateInstrumentsDuration(this.musicSheet, instrumentsMaxTieNoteFractions);
    let maxInstrumentDuration: Fraction = new Fraction(0, 1);
    for (let idx: number = 0, len: number = instrumentsDurations.length; idx < len; ++idx) {
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
    for (let i: number = 0; i < instrumentsDurations.length; i++) {
      let instrumentsDuration: Fraction = instrumentsDurations[i];
      if (
        (this.currentMeasure.ImplicitMeasure && instrumentsDuration !== maxInstrumentDuration) ||
        instrumentsDuration !== activeRhythm && // FIXME
        !this.allInstrumentsHaveSameDuration(instrumentsDurations, maxInstrumentDuration)
      ) {
        let firstStaffIndexOfInstrument: number = this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.musicSheet.Instruments[i]);
        for (let staffIndex: number = 0; staffIndex < this.musicSheet.Instruments[i].Staves.length; staffIndex++) {
          if (!this.staffMeasureIsEmpty(firstStaffIndexOfInstrument + staffIndex)) {
            this.currentMeasure.setErrorInStaffMeasure(firstStaffIndexOfInstrument + staffIndex, true);
            let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/MissingNotesError", "Given Notes don't correspond to measure duration.");
            this.musicSheet.SheetErrors.pushTemp(errorMsg);
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
      return Fraction.plus(this.previousMeasure.Duration, maxInstrumentDuration).CompareTo(activeRhythm) === 0;
    }
    return false;
  }
  private allInstrumentsHaveSameDuration(
    instrumentsDurations: Fraction[], maxInstrumentDuration: Fraction
  ): boolean {
    let counter: number = 0;
    for (let idx: number = 0, len: number = instrumentsDurations.length; idx < len; ++idx) {
      let instrumentsDuration: Fraction = instrumentsDurations[idx];
      if (instrumentsDuration === maxInstrumentDuration) { counter++; }
    }
    return (counter === instrumentsDurations.length && maxInstrumentDuration !== new Fraction(0, 1));
  }
  private staffMeasureIsEmpty(index: number): boolean {
    let counter: number = 0;
    for (let i: number = 0; i < this.currentMeasure.VerticalSourceStaffEntryContainers.length; i++) {
      if (this.currentMeasure.VerticalSourceStaffEntryContainers[i][index] === undefined) { counter++; }
    }
    return (counter === this.currentMeasure.VerticalSourceStaffEntryContainers.length);
  }
  private checkSourceMeasureForundefinedEntries(): void {
    for (let i: number = this.currentMeasure.VerticalSourceStaffEntryContainers.length - 1; i >= 0; i--) {
      for (let j: number = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.length - 1; j >= 0; j--) {
        let sourceStaffEntry: SourceStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[j];
        if (sourceStaffEntry !== undefined) {
          for (let k: number = sourceStaffEntry.VoiceEntries.length - 1; k >= 0; k--) {
            let voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[k];
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
        let sourceStaffEntry: SourceStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[idx];
        if (sourceStaffEntry === undefined) { counter++; }
      }
      if (counter === this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.length) {
        this._removeFromArray(this.currentMeasure.VerticalSourceStaffEntryContainers, this.currentMeasure.VerticalSourceStaffEntryContainers[i]);
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
        logging.log("MusicSheetReader.pushSheetLabels: ", ex);
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
      let creators: IXmlElement[] = identificationNode.Elements("creator");
      for (let idx: number = 0, len: number = creators.length; idx < len; ++idx) {
        let creator: IXmlElement = creators[idx];
        if (creator.HasAttributes) {
          if (this.presentAttrsWithValue(creator, "composer")) {
            this.musicSheet.Composer = new Label(this.trimString(creator.Value));
            continue;
          }
          if (this.presentAttrsWithValue(creator, "lyricist") || this.presentAttrsWithValue(creator, "poet")) {
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
    let creditElements: IXmlElement[] = root.Elements("credit");
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
          let creditYInfo: number = parseFloat(creditY);
          if (creditYInfo > systemYCoordinates) {
            if (this.musicSheet.Title === undefined) {
              let creditSize: string = creditChild.Attribute("font-size").Value;
              let titleCreditSizeInt: number = parseFloat(creditSize);
              if (largestTitleCreditSize < titleCreditSizeInt) {
                largestTitleCreditSize = titleCreditSizeInt;
                finalTitle = creditChild.Value;
              }
            }
            if (this.musicSheet.Subtitle === undefined) {
              if (creditJustify !== "right" && creditJustify !== "left") {
                if (largestCreditYInfo < creditYInfo) {
                  largestCreditYInfo = creditYInfo;
                  if (possibleTitle) {
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
    if (this.musicSheet.Title === undefined && finalTitle) {
      this.musicSheet.Title = new Label(this.trimString(finalTitle));
    }
    if (this.musicSheet.Subtitle === undefined && finalSubtitle) {
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
    paperHeight = parseFloat(defi);
    let found: boolean = false;
    let parts: IXmlElement[] = root.Elements("part");
    for (let idx: number = 0, len: number = parts.length; idx < len; ++idx) {
      let measures: IXmlElement[] = parts[idx].Elements("measure");
      for (let idx2: number = 0, len2: number = measures.length; idx2 < len2; ++idx2) {
        let measure: IXmlElement = measures[idx2];
        if (measure.Element("print") !== undefined) {
          let systemLayouts: IXmlElement[] = measure.Element("print").Elements("system-layout");
          for (let idx3: number = 0, len3: number = systemLayouts.length; idx3 < len3; ++idx3) {
            let syslab: IXmlElement = systemLayouts[idx3];
            if (syslab.Element("top-system-distance") !== undefined) {
              let topSystemDistanceString: string = syslab.Element("top-system-distance").Value;
              topSystemDistance = parseFloat(topSystemDistanceString);
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
        topSystemDistance = parseFloat(topSystemDistanceString);
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
      if (titleNodeChild !== undefined && titleNodeChild.Value) {
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
        if (workNumber) {
          if (finalSubTitle) {
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
  private createInstrumentGroups(entryList: IXmlElement[]): { [_: string]: Instrument; } {
    let instrumentId: number = 0;
    let instrumentDict: { [_: string]: Instrument; } = {};
    let currentGroup: InstrumentalGroup = undefined;
    try {
      let entryArray: IXmlElement[] = entryList;
      for (let idx: number = 0, len: number = entryArray.length; idx < len; ++idx) {
        let node: IXmlElement = entryArray[idx];
        if (node.Name === "score-part") {
          let instrIdString: string = node.Attribute("id").Value;
          let instrument: Instrument = new Instrument(instrumentId, instrIdString, this.musicSheet, currentGroup);
          instrumentId++;
          let partElements: IXmlElement[] = node.Elements();
          for (let idx2: number = 0, len2: number = partElements.length; idx2 < len2; ++idx2) {
            let partElement: IXmlElement = partElements[idx2];
            try {
              if (partElement.Name === "part-name") {
                instrument.Name = partElement.Value;
              } else if (partElement.Name === "score-instrument") {
                let subInstrument: SubInstrument = new SubInstrument(instrument);
                subInstrument.IdString = partElement.FirstAttribute.Value;
                instrument.SubInstruments.push(subInstrument);
                let subElement: IXmlElement = partElement.Element("instrument-name");
                if (subElement !== undefined) {
                  subInstrument.Name = subElement.Value;
                  subInstrument.setMidiInstrument(subElement.Value);
                }
              } else if (partElement.Name === "midi-instrument") {
                let subInstrument: SubInstrument = instrument.getSubInstrument(partElement.FirstAttribute.Value);
                for (let idx3: number = 0, len3: number = instrument.SubInstruments.length; idx3 < len3; ++idx3) {
                  let subInstr: SubInstrument = instrument.SubInstruments[idx3];
                  if (subInstr.IdString === partElement.Value) {
                    subInstrument = subInstr;
                    break;
                  }
                }
                let instrumentElements: IXmlElement[] = partElement.Elements();
                for (let idx3: number = 0, len3: number = instrumentElements.length; idx3 < len3; ++idx3) {
                  let instrumentElement: IXmlElement = instrumentElements[idx3];
                  try {
                    if (instrumentElement.Name === "midi-channel") {
                      if (parseInt(instrumentElement.Value) === 10) {
                        instrument.MidiInstrumentId = MidiInstrument.Percussion;
                      }
                    } else if (instrumentElement.Name === "midi-program") {
                      if (instrument.SubInstruments.length > 0 && instrument.MidiInstrumentId !== MidiInstrument.Percussion) {
                        subInstrument.MidiInstrumentId = <MidiInstrument>Math.max(0, parseInt(instrumentElement.Value) - 1);
                      }
                    } else if (instrumentElement.Name === "midi-unpitched") {
                      subInstrument.FixedKey = Math.max(0, parseInt(instrumentElement.Value));
                    } else if (instrumentElement.Name === "volume") {
                      try {
                        let result: number = <number>parseFloat(instrumentElement.Value);
                        subInstrument.Volume = result / 127.0;
                      } catch (ex) {
                        logging.debug("ExpressionReader.readExpressionParameters", "read volume", ex);
                      }

                    } else if (instrumentElement.Name === "pan") {
                      try {
                        let result: number = <number>parseFloat(instrumentElement.Value);
                        subInstrument.Pan = result / 64.0;
                      } catch (ex) {
                        logging.debug("ExpressionReader.readExpressionParameters", "read pan", ex);
                      }

                    }
                  } catch (ex) {
                    logging.log("MusicSheetReader.createInstrumentGroups midi settings: ", ex);
                  }

                }
              }
            } catch (ex) {
              logging.log("MusicSheetReader.createInstrumentGroups: ", ex);
            }

          }
          if (instrument.SubInstruments.length === 0) {
            let subInstrument: SubInstrument = new SubInstrument(instrument);
            instrument.SubInstruments.push(subInstrument);
          }
          instrumentDict[instrIdString] = instrument;
          if (currentGroup !== undefined) {
            currentGroup.InstrumentalGroups.push(instrument);
            this.musicSheet.Instruments.push(instrument);
          } else {
            this.musicSheet.InstrumentalGroups.push(instrument);
            this.musicSheet.Instruments.push(instrument);
          }
        } else {
          if ((node.Name === "part-group") && (node.Attribute("type").Value === "start")) {
            let iG: InstrumentalGroup = new InstrumentalGroup("group", this.musicSheet, currentGroup);
            if (currentGroup !== undefined) {
              currentGroup.InstrumentalGroups.push(iG);
            } else {
              this.musicSheet.InstrumentalGroups.push(iG);
            }
            currentGroup = iG;
          } else {
            if ((node.Name === "part-group") && (node.Attribute("type").Value === "stop")) {
              if (currentGroup !== undefined) {
                if (currentGroup.InstrumentalGroups.length === 1) {
                  let instr: InstrumentalGroup = currentGroup.InstrumentalGroups[0];
                  if (currentGroup.Parent !== undefined) {
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
      let errorMsg: string = ITextTranslation.translateText(
        "ReaderErrorMessages/InstrumentError", "Error while reading Instruments"
      );
      throw new MusicSheetReadingException(errorMsg, e);
    }

    for (let idx: number = 0, len: number = this.musicSheet.Instruments.length; idx < len; ++idx) {
      let instrument: Instrument = this.musicSheet.Instruments[idx];
      if (!instrument.Name) {
        instrument.Name = "Instr. " + instrument.IdString;
      }
    }
    return instrumentDict;
  }
  private getCompleteNumberOfStavesFromXml(partInst: IXmlElement[]): number {
    let number: number = 0;
    let partInstArr: IXmlElement[] = partInst;
    for (let idx: number = 0, len: number = partInstArr.length; idx < len; ++idx) {
      let partNode: IXmlElement = partInstArr[idx];
      let xmlMeasureList: IXmlElement[] = partNode.Elements("measure");
      if (xmlMeasureList !== undefined) {
        let xmlMeasure: IXmlElement = xmlMeasureList[0];
        if (xmlMeasure !== undefined) {
          let stavesNode: IXmlElement = xmlMeasure.Element("attributes");
          if (stavesNode !== undefined) {
            stavesNode = stavesNode.Element("staves");
          }
          if (stavesNode === undefined) {
            number++;
          } else {
            number += parseInt(stavesNode.Value);
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
        number = parseInt(staves.Value);
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
