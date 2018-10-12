import {Instrument} from "../Instrument";
import {MusicSheet} from "../MusicSheet";
import {VoiceGenerator} from "./VoiceGenerator";
import {Staff} from "../VoiceData/Staff";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {RhythmInstruction} from "../VoiceData/Instructions/RhythmInstruction";
import {AbstractNotationInstruction} from "../VoiceData/Instructions/AbstractNotationInstruction";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {IXmlElement} from "../../Common/FileIO/Xml";
import {ITextTranslation} from "../Interfaces/ITextTranslation";
import {MusicSheetReadingException} from "../Exceptions";
import {ClefEnum} from "../VoiceData/Instructions/ClefInstruction";
import {RhythmSymbolEnum} from "../VoiceData/Instructions/RhythmInstruction";
import {KeyEnum} from "../VoiceData/Instructions/KeyInstruction";
import {IXmlAttribute} from "../../Common/FileIO/Xml";
import {ChordSymbolContainer} from "../VoiceData/ChordSymbolContainer";
import * as log from "loglevel";
import {MidiInstrument} from "../VoiceData/Instructions/ClefInstruction";
import {ChordSymbolReader} from "./MusicSymbolModules/ChordSymbolReader";
import {ExpressionReader} from "./MusicSymbolModules/ExpressionReader";
import {RepetitionInstructionReader} from "./MusicSymbolModules/RepetitionInstructionReader";
import {SlurReader} from "./MusicSymbolModules/SlurReader";
import {StemDirectionType} from "../VoiceData/VoiceEntry";
//import Dictionary from "typescript-collections/dist/lib/Dictionary";

// FIXME: The following classes are missing
//type ChordSymbolContainer = any;
//type SlurReader = any;
//type RepetitionInstructionReader = any;
//declare class MusicSymbolModuleFactory {
//  public static createSlurReader(x: any): any;
//}
//
//class MetronomeReader {
//  public static addMetronomeSettings(xmlNode: IXmlElement, musicSheet: MusicSheet): void { }
//  public static readMetronomeInstructions(xmlNode: IXmlElement, musicSheet: MusicSheet, currentXmlMeasureIndex: number): void { }
//  public static readTempoInstruction(soundNode: IXmlElement, musicSheet: MusicSheet, currentXmlMeasureIndex: number): void { }
//}
//
//class ChordSymbolReader {
//  public static readChordSymbol(xmlNode:IXmlElement, musicSheet:MusicSheet, activeKey:any): void {
//  }
//}


/**
 * An InstrumentReader is used during the reading phase to keep parsing new measures from the MusicXML file
 * with the readNextXmlMeasure method.
 */
export class InstrumentReader {

  constructor(repetitionInstructionReader: RepetitionInstructionReader, xmlMeasureList: IXmlElement[], instrument: Instrument) {
      this.repetitionInstructionReader = repetitionInstructionReader;
      this.xmlMeasureList = xmlMeasureList;
      this.musicSheet = instrument.GetMusicSheet;
      this.instrument = instrument;
      this.activeClefs = new Array(instrument.Staves.length);
      this.activeClefsHaveBeenInitialized = new Array(instrument.Staves.length);
      for (let i: number = 0; i < instrument.Staves.length; i++) {
        this.activeClefsHaveBeenInitialized[i] = false;
      }
      this.createExpressionGenerators(instrument.Staves.length);
      this.slurReader = new SlurReader(this.musicSheet);
  }

  private repetitionInstructionReader: RepetitionInstructionReader;
  private xmlMeasureList: IXmlElement[];
  private musicSheet: MusicSheet;
  private slurReader: SlurReader;
  private instrument: Instrument;
  private voiceGeneratorsDict: { [n: number]: VoiceGenerator; } = {};
  private staffMainVoiceGeneratorDict: { [staffId: number]: VoiceGenerator } = {};
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
  private abstractInstructions: [number, AbstractNotationInstruction][] = [];
  private openChordSymbolContainer: ChordSymbolContainer;
  private expressionReaders: ExpressionReader[];
  private currentVoiceGenerator: VoiceGenerator;
  //private openSlurDict: { [n: number]: Slur; } = {};
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

  /**
   * Main CreateSheet: read the next XML Measure and save all data to the given [[SourceMeasure]].
   * @param currentMeasure
   * @param measureStartAbsoluteTimestamp - Using this instead of currentMeasure.AbsoluteTimestamp as it isn't set yet
   * @param guitarPro
   * @returns {boolean}
   */
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
      const xmlMeasureListArr: IXmlElement[] = this.xmlMeasureList[this.currentXmlMeasureIndex].elements();
      for (const xmlNode of xmlMeasureListArr) {
        if (xmlNode.name === "note") {
          let printObject: boolean = true;
          if (xmlNode.hasAttributes && xmlNode.attribute("print-object") &&
              xmlNode.attribute("print-object").value === "no") {
              printObject = false; // note will not be rendered, but still parsed for Playback etc.
              // if (xmlNode.attribute("print-spacing")) {
              //   if (xmlNode.attribute("print-spacing").value === "yes" {
              //     // TODO give spacing for invisible notes even when not displayed. might be hard with Vexflow formatting
          }
          let noteStaff: number = 1;
          if (this.instrument.Staves.length > 1) {
            if (xmlNode.element("staff") !== undefined) {
              noteStaff = parseInt(xmlNode.element("staff").value, 10);
              if (isNaN(noteStaff)) {
                log.debug("InstrumentReader.readNextXmlMeasure.get staff number");
                noteStaff = 1;
              }
            }
          }

          this.currentStaff = this.instrument.Staves[noteStaff - 1];
          const isChord: boolean = xmlNode.element("chord") !== undefined;
          if (xmlNode.element("voice") !== undefined) {
            const noteVoice: number = parseInt(xmlNode.element("voice").value, 10);
            this.currentVoiceGenerator = this.getOrCreateVoiceGenerator(noteVoice, noteStaff - 1);
          } else {
            if (!isChord || this.currentVoiceGenerator === undefined) {
              this.currentVoiceGenerator = this.getOrCreateVoiceGenerator(1, noteStaff - 1);
            }
          }
          let noteDivisions: number = 0;
          let noteDuration: Fraction = new Fraction(0, 1);
          let isTuplet: boolean = false;
          if (xmlNode.element("duration") !== undefined) {
            noteDivisions = parseInt(xmlNode.element("duration").value, 10);
            if (!isNaN(noteDivisions)) {
              noteDuration = new Fraction(noteDivisions, 4 * this.divisions);
              if (noteDivisions === 0) {
                noteDuration = this.getNoteDurationFromTypeNode(xmlNode);
              }
              if (xmlNode.element("time-modification") !== undefined) {
                noteDuration = this.getNoteDurationForTuplet(xmlNode);
                isTuplet = true;
              }
            } else {
              const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError", "Invalid Note Duration.");
              this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
              log.debug("InstrumentReader.readNextXmlMeasure", errorMsg);
              continue;
            }
          }

          const restNote: boolean = xmlNode.element("rest") !== undefined;
          //log.info("New note found!", noteDivisions, noteDuration.toString(), restNote);

          const isGraceNote: boolean = xmlNode.element("grace") !== undefined || noteDivisions === 0 || isChord && lastNoteWasGrace;
          let graceNoteSlash: boolean = false;
          let graceSlur: boolean = false;
          if (isGraceNote) {
            const graceNode: IXmlElement = xmlNode.element("grace");
            if (graceNode && graceNode.attributes()) {
              if (graceNode.attribute("slash")) {
                const slash: string = graceNode.attribute("slash").value;
                if (slash === "yes") {
                  graceNoteSlash = true;
                }
              }
            }

            noteDuration = this.getNoteDurationFromTypeNode(xmlNode);

            const notationNode: IXmlElement = xmlNode.element("notations");
            if (notationNode !== undefined) {
              if (notationNode.element("slur") !== undefined) {
                graceSlur = true;
                // grace slurs could be non-binary, but VexFlow.GraceNoteGroup modifier system is currently only boolean for slurs.
              }
            }
          }

          // check for cue note
          let isCueNote: boolean = false;
          const typeNode: IXmlElement = xmlNode.element("type");
          if (typeNode !== undefined) {
            const sizeAttr: Attr = typeNode.attribute("size");
            if (sizeAttr !== undefined && sizeAttr !== null) {
              if (sizeAttr.value === "cue") {
                isCueNote = true;
              }
            }
          }

          // check stem element
          let stemDirectionXml: StemDirectionType = StemDirectionType.Undefined;
          const stemNode: IXmlElement = xmlNode.element("stem");
          if (stemNode !== undefined) {
            switch (stemNode.value) {
              case "down":
                stemDirectionXml = StemDirectionType.Down;
                break;
              case "up":
                stemDirectionXml = StemDirectionType.Up;
                break;
              case "double":
                stemDirectionXml = StemDirectionType.Double;
                break;
              case "none":
                stemDirectionXml = StemDirectionType.None;
                break;
              default:
                stemDirectionXml = StemDirectionType.Undefined;
            }
          }

          let musicTimestamp: Fraction = currentFraction.clone();
          if (isChord) {
            musicTimestamp = previousFraction.clone();
          }
          this.currentStaffEntry = this.currentMeasure.findOrCreateStaffEntry(
            musicTimestamp,
            this.inSourceMeasureInstrumentIndex + noteStaff - 1,
            this.currentStaff
          ).staffEntry;
          //log.info("currentStaffEntry", this.currentStaffEntry, this.currentMeasure.VerticalSourceStaffEntryContainers.length);

          if (!this.currentVoiceGenerator.hasVoiceEntry()
            || (!isChord && !isGraceNote && !lastNoteWasGrace)
            || (isGraceNote && !lastNoteWasGrace)
            || (isGraceNote && !isChord)
            || (!isGraceNote && lastNoteWasGrace)
          ) {
            this.currentVoiceGenerator.createVoiceEntry(musicTimestamp, this.currentStaffEntry, !restNote && !isGraceNote,
                                                        isGraceNote, graceNoteSlash, graceSlur);
          }
          if (!isGraceNote && !isChord) {
            previousFraction = currentFraction.clone();
            currentFraction.Add(noteDuration);
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
          const beginOfMeasure: boolean = (
            this.currentStaffEntry !== undefined &&
            this.currentStaffEntry.Timestamp !== undefined &&
            this.currentStaffEntry.Timestamp.Equals(new Fraction(0, 1)) && !this.currentStaffEntry.hasNotes()
          );
          this.saveAbstractInstructionList(this.instrument.Staves.length, beginOfMeasure);
          if (this.openChordSymbolContainer !== undefined) {
            this.currentStaffEntry.ChordContainer = this.openChordSymbolContainer;
            this.openChordSymbolContainer = undefined;
          }
          if (this.activeRhythm !== undefined) {
            // (*) this.musicSheet.SheetPlaybackSetting.Rhythm = this.activeRhythm.Rhythm;
          }
          if (!isTuplet && !isGraceNote) {
            noteDuration = new Fraction(noteDivisions, 4 * this.divisions);
          }
          this.currentVoiceGenerator.read(
            xmlNode, noteDuration, restNote,
            this.currentStaffEntry, this.currentMeasure,
            measureStartAbsoluteTimestamp,
            this.maxTieNoteFraction, isChord, guitarPro, printObject, isCueNote, stemDirectionXml
          );

          const notationsNode: IXmlElement = xmlNode.element("notations");
          if (notationsNode !== undefined && notationsNode.element("dynamics") !== undefined) {
            const expressionReader: ExpressionReader = this.expressionReaders[this.readExpressionStaffNumber(xmlNode) - 1];
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
        } else if (xmlNode.name === "attributes") {
          const divisionsNode: IXmlElement = xmlNode.element("divisions");
          if (divisionsNode !== undefined) {
            this.divisions = parseInt(divisionsNode.value, 10);
            if (isNaN(this.divisions)) {
              const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/DivisionError",
                                                                      "Invalid divisions value at Instrument: ");
              log.debug("InstrumentReader.readNextXmlMeasure", errorMsg);
              this.divisions = this.readDivisionsFromNotes();
              if (this.divisions > 0) {
                this.musicSheet.SheetErrors.push(errorMsg + this.instrument.Name);
              } else {
                divisionsException = true;
                throw new MusicSheetReadingException(errorMsg + this.instrument.Name);
              }
            }

          }
          if (
            xmlNode.element("divisions") === undefined &&
            this.divisions === 0 &&
            this.currentXmlMeasureIndex === 0
          ) {
            const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/DivisionError", "Invalid divisions value at Instrument: ");
            this.divisions = this.readDivisionsFromNotes();
            if (this.divisions > 0) {
              this.musicSheet.SheetErrors.push(errorMsg + this.instrument.Name);
            } else {
              divisionsException = true;
              throw new MusicSheetReadingException(errorMsg + this.instrument.Name);
            }
          }
          this.addAbstractInstruction(xmlNode, guitarPro);
          if (currentFraction.Equals(new Fraction(0, 1)) &&
            this.isAttributesNodeAtBeginOfMeasure(this.xmlMeasureList[this.currentXmlMeasureIndex], xmlNode)) {
            this.saveAbstractInstructionList(this.instrument.Staves.length, true);
          }
          if (this.isAttributesNodeAtEndOfMeasure(this.xmlMeasureList[this.currentXmlMeasureIndex], xmlNode)) {
            this.saveClefInstructionAtEndOfMeasure();
          }
        } else if (xmlNode.name === "forward") {
          const forFraction: number = parseInt(xmlNode.element("duration").value, 10);
          currentFraction.Add(new Fraction(forFraction, 4 * this.divisions));
        } else if (xmlNode.name === "backup") {
          const backFraction: number = parseInt(xmlNode.element("duration").value, 10);
          currentFraction.Sub(new Fraction(backFraction, 4 * this.divisions));
          if (currentFraction.IsNegative()) {
            currentFraction = new Fraction(0, 1);
          }
          previousFraction.Sub(new Fraction(backFraction, 4 * this.divisions));
          if (previousFraction.IsNegative()) {
            previousFraction = new Fraction(0, 1);
          }
        } else if (xmlNode.name === "direction") {
          const directionTypeNode: IXmlElement = xmlNode.element("direction-type");
          // (*) MetronomeReader.readMetronomeInstructions(xmlNode, this.musicSheet, this.currentXmlMeasureIndex);
          let relativePositionInMeasure: number = Math.min(1, currentFraction.RealValue);
          if (this.activeRhythm !== undefined && this.activeRhythm.Rhythm !== undefined) {
            relativePositionInMeasure /= this.activeRhythm.Rhythm.RealValue;
          }
          let handeled: boolean = false;
          if (this.repetitionInstructionReader !== undefined) {
            handeled = this.repetitionInstructionReader.handleRepetitionInstructionsFromWordsOrSymbols( directionTypeNode,
                                                                                                        relativePositionInMeasure);
          }
          if (!handeled) {
           let expressionReader: ExpressionReader = this.expressionReaders[0];
           const staffIndex: number = this.readExpressionStaffNumber(xmlNode) - 1;
           if (staffIndex < this.expressionReaders.length) {
             expressionReader = this.expressionReaders[staffIndex];
           }
           if (expressionReader !== undefined) {
             if (directionTypeNode.element("octave-shift") !== undefined) {
               expressionReader.readExpressionParameters(
                 xmlNode, this.instrument, this.divisions, currentFraction, previousFraction, this.currentMeasure.MeasureNumber, true
               );
               expressionReader.addOctaveShift(xmlNode, this.currentMeasure, previousFraction.clone());
             }
             expressionReader.readExpressionParameters(
               xmlNode, this.instrument, this.divisions, currentFraction, previousFraction, this.currentMeasure.MeasureNumber, false
             );
             expressionReader.read(xmlNode, this.currentMeasure, currentFraction);
           }
          }
        } else if (xmlNode.name === "barline") {
          if (this.repetitionInstructionReader !== undefined) {
           const measureEndsSystem: boolean = false;
           this.repetitionInstructionReader.handleLineRepetitionInstructions(xmlNode, measureEndsSystem);
           if (measureEndsSystem) {
             this.currentMeasure.BreakSystemAfter = true;
             this.currentMeasure.endsPiece = true;
           }
          }
        } else if (xmlNode.name === "sound") {
          // (*) MetronomeReader.readTempoInstruction(xmlNode, this.musicSheet, this.currentXmlMeasureIndex);
        } else if (xmlNode.name === "harmony") {
                    this.openChordSymbolContainer = ChordSymbolReader.readChordSymbol(xmlNode, this.musicSheet, this.activeKey);
        }
      }
      for (const j in this.voiceGeneratorsDict) {
        if (this.voiceGeneratorsDict.hasOwnProperty(j)) {
          const voiceGenerator: VoiceGenerator = this.voiceGeneratorsDict[j];
          voiceGenerator.checkForOpenBeam();
        }
      }
      if (this.currentXmlMeasureIndex === this.xmlMeasureList.length - 1) {
        for (let i: number = 0; i < this.instrument.Staves.length; i++) {
          if (!this.activeClefsHaveBeenInitialized[i]) {
            this.createDefaultClefInstruction(this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.instrument) + i);
          }
        }
        if (!this.activeKeyHasBeenInitialized) {
          this.createDefaultKeyInstruction();
        }

        for (let i: number = 0; i < this.expressionReaders.length; i++) {
         const reader: ExpressionReader = this.expressionReaders[i];
         if (reader !== undefined) {
           reader.checkForOpenExpressions(this.currentMeasure, currentFraction);
      }
        }
      }
    } catch (e) {
      if (divisionsException) {
        throw new MusicSheetReadingException(e.Message);
      }
      const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/MeasureError", "Error while reading Measure.");
      this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
      log.debug("InstrumentReader.readNextXmlMeasure", errorMsg, e);
    }

    this.previousMeasure = this.currentMeasure;
    this.currentXmlMeasureIndex += 1;
    return true;
  }

  public doCalculationsAfterDurationHasBeenSet(): void {
    for (const j in this.voiceGeneratorsDict) {
      if (this.voiceGeneratorsDict.hasOwnProperty(j)) {
        this.voiceGeneratorsDict[j].checkOpenTies();
      }
    }
  }

  /**
   * Get or create the passing [[VoiceGenerator]].
   * @param voiceId
   * @param staffId
   * @returns {VoiceGenerator}
   */
  private getOrCreateVoiceGenerator(voiceId: number, staffId: number): VoiceGenerator {
    const staff: Staff = this.instrument.Staves[staffId];
    let voiceGenerator: VoiceGenerator = this.voiceGeneratorsDict[voiceId];
    if (voiceGenerator !== undefined) {
      if (staff.Voices.indexOf(voiceGenerator.GetVoice) === -1) {
        staff.Voices.push(voiceGenerator.GetVoice);
      }
    } else {
      const mainVoiceGenerator: VoiceGenerator = this.staffMainVoiceGeneratorDict[staffId];
      if (mainVoiceGenerator !== undefined) {
        voiceGenerator = new VoiceGenerator(this.instrument, voiceId, this.slurReader, mainVoiceGenerator.GetVoice);
        staff.Voices.push(voiceGenerator.GetVoice);
        this.voiceGeneratorsDict[voiceId] = voiceGenerator;
      } else {
        voiceGenerator = new VoiceGenerator(this.instrument, voiceId, this.slurReader);
        staff.Voices.push(voiceGenerator.GetVoice);
        this.voiceGeneratorsDict[voiceId] = voiceGenerator;
        this.staffMainVoiceGeneratorDict[staffId] = voiceGenerator;
      }
    }
    return voiceGenerator;
  }


  private createExpressionGenerators(numberOfStaves: number): void {
     this.expressionReaders = new Array(numberOfStaves);
     for (let i: number = 0; i < numberOfStaves; i++) {
      this.expressionReaders[i] = new ExpressionReader(this.musicSheet, this.instrument, i + 1);
     }
  }

  /**
   * Create the default [[ClefInstruction]] for the given staff index.
   * @param staffIndex
   */
  private createDefaultClefInstruction(staffIndex: number): void {
    let first: SourceMeasure;
    if (this.musicSheet.SourceMeasures.length > 0) {
      first = this.musicSheet.SourceMeasures[0];
    } else {
      first = this.currentMeasure;
    }
    const clefInstruction: ClefInstruction = new ClefInstruction(ClefEnum.G, 0, 2);
    let firstStaffEntry: SourceStaffEntry;
    if (first.FirstInstructionsStaffEntries[staffIndex] === undefined) {
      firstStaffEntry = new SourceStaffEntry(undefined, undefined);
      first.FirstInstructionsStaffEntries[staffIndex] = firstStaffEntry;
    } else {
      firstStaffEntry = first.FirstInstructionsStaffEntries[staffIndex];
      firstStaffEntry.removeFirstInstructionOfTypeClefInstruction();
    }
    clefInstruction.Parent = firstStaffEntry;
    firstStaffEntry.Instructions.splice(0, 0, clefInstruction);
  }

  /**
   * Create the default [[KeyInstruction]] in case no [[KeyInstruction]] is given in the whole [[Instrument]].
   */
  private createDefaultKeyInstruction(): void {
    let first: SourceMeasure;
    if (this.musicSheet.SourceMeasures.length > 0) {
      first = this.musicSheet.SourceMeasures[0];
    } else {
      first = this.currentMeasure;
    }
    const keyInstruction: KeyInstruction = new KeyInstruction(undefined, 0, KeyEnum.major);
    for (let j: number = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + this.instrument.Staves.length; j++) {
      if (first.FirstInstructionsStaffEntries[j] === undefined) {
        const firstStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, undefined);
        first.FirstInstructionsStaffEntries[j] = firstStaffEntry;
        keyInstruction.Parent = firstStaffEntry;
        firstStaffEntry.Instructions.push(keyInstruction);
      } else {
        const firstStaffEntry: SourceStaffEntry = first.FirstInstructionsStaffEntries[j];
        keyInstruction.Parent = firstStaffEntry;
        firstStaffEntry.removeFirstInstructionOfTypeKeyInstruction();
        if (firstStaffEntry.Instructions[0] instanceof ClefInstruction) {
          firstStaffEntry.Instructions.splice(1, 0, keyInstruction);
        } else {
          firstStaffEntry.Instructions.splice(0, 0, keyInstruction);
        }
      }
    }
  }

  /**
   * Check if the given attributesNode is at the begin of a XmlMeasure.
   * @param parentNode
   * @param attributesNode
   * @returns {boolean}
   */
  private isAttributesNodeAtBeginOfMeasure(parentNode: IXmlElement, attributesNode: IXmlElement): boolean {
    const children: IXmlElement[] = parentNode.elements();
    const attributesNodeIndex: number = children.indexOf(attributesNode); // FIXME | 0
    if (attributesNodeIndex > 0 && children[attributesNodeIndex - 1].name === "backup") {
      return true;
    }
    let firstNoteNodeIndex: number = -1;
    for (let i: number = 0; i < children.length; i++) {
      if (children[i].name === "note") {
        firstNoteNodeIndex = i;
        break;
      }
    }
    return (attributesNodeIndex < firstNoteNodeIndex && firstNoteNodeIndex > 0) || (firstNoteNodeIndex < 0);
  }

  /**
   * Check if the given attributesNode is at the end of a XmlMeasure.
   * @param parentNode
   * @param attributesNode
   * @returns {boolean}
   */
  private isAttributesNodeAtEndOfMeasure(parentNode: IXmlElement, attributesNode: IXmlElement): boolean {
    const childs: IXmlElement[] = parentNode.elements().slice();
    let attributesNodeIndex: number = 0;
    for (let i: number = 0; i < childs.length; i++) {
      if (childs[i] === attributesNode) {
        attributesNodeIndex = i;
        break;
      }
    }
    let nextNoteNodeIndex: number = 0;
    for (let i: number = attributesNodeIndex; i < childs.length; i++) {
      if (childs[i].name === "note") {
        nextNoteNodeIndex = i;
        break;
      }
    }
    return attributesNodeIndex > nextNoteNodeIndex;
  }

  /**
   * Called only when no noteDuration is given in XML.
   * @param xmlNode
   * @returns {Fraction}
   */
  private getNoteDurationFromTypeNode(xmlNode: IXmlElement): Fraction {
    const typeNode: IXmlElement = xmlNode.element("type");
    if (typeNode !== undefined) {
      const type: string = typeNode.value;
      return this.currentVoiceGenerator.getNoteDurationFromType(type);
    }
    return new Fraction(0, 4 * this.divisions);
  }

  /**
   * Add (the three basic) Notation Instructions to a list
   * @param node
   * @param guitarPro
   */
  private addAbstractInstruction(node: IXmlElement, guitarPro: boolean): void {
    if (node.element("divisions") !== undefined) {
      if (node.elements().length === 1) {
        return;
      }
    }
    const transposeNode: IXmlElement = node.element("transpose");
    if (transposeNode !== undefined) {
      const chromaticNode: IXmlElement = transposeNode.element("chromatic");
      if (chromaticNode !== undefined) {
        this.instrument.PlaybackTranspose = parseInt(chromaticNode.value, 10);
      }
    }
    const clefList: IXmlElement[] = node.elements("clef");
    let errorMsg: string;
    if (clefList.length > 0) {
      for (let idx: number = 0, len: number = clefList.length; idx < len; ++idx) {
        const nodeList: IXmlElement = clefList[idx];
        let clefEnum: ClefEnum = ClefEnum.G;
        let line: number = 2;
        let staffNumber: number = 1;
        let clefOctaveOffset: number = 0;
        const lineNode: IXmlElement = nodeList.element("line");
        if (lineNode !== undefined) {
          try {
            line = parseInt(lineNode.value, 10);
          } catch (ex) {
            errorMsg = ITextTranslation.translateText(
              "ReaderErrorMessages/ClefLineError",
              "Invalid clef line given -> using default clef line."
            );
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
            line = 2;
            log.debug("InstrumentReader.addAbstractInstruction", errorMsg, ex);
          }

        }
        const signNode: IXmlElement = nodeList.element("sign");
        if (signNode !== undefined) {
          try {
            clefEnum = ClefEnum[signNode.value];
            if (!ClefInstruction.isSupportedClef(clefEnum)) {
              if (clefEnum === ClefEnum.TAB && guitarPro) {
                clefOctaveOffset = -1;
              }
              errorMsg = ITextTranslation.translateText(
                "ReaderErrorMessages/ClefError",
                "Unsupported clef found -> using default clef."
              );
              this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
              clefEnum = ClefEnum.G;
              line = 2;
            }
          } catch (e) {
            errorMsg = ITextTranslation.translateText(
              "ReaderErrorMessages/ClefError",
              "Invalid clef found -> using default clef."
            );
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
            clefEnum = ClefEnum.G;
            line = 2;
            log.debug("InstrumentReader.addAbstractInstruction", errorMsg, e);
          }

        }
        const clefOctaveNode: IXmlElement = nodeList.element("clef-octave-change");
        if (clefOctaveNode !== undefined) {
          try {
            clefOctaveOffset = parseInt(clefOctaveNode.value, 10);
          } catch (e) {
            errorMsg = ITextTranslation.translateText(
              "ReaderErrorMessages/ClefOctaveError",
              "Invalid clef octave found -> using default clef octave."
            );
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
            clefOctaveOffset = 0;
          }

        }
        if (nodeList.hasAttributes && nodeList.attributes()[0].name === "number") {
          try {
            staffNumber = parseInt(nodeList.attributes()[0].value, 10);
          } catch (err) {
            errorMsg = ITextTranslation.translateText(
              "ReaderErrorMessages/ClefError",
              "Invalid clef found -> using default clef."
            );
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
            staffNumber = 1;
          }
        }

        const clefInstruction: ClefInstruction = new ClefInstruction(clefEnum, clefOctaveOffset, line);
        this.abstractInstructions.push([staffNumber, clefInstruction]);
      }
    }
    if (node.element("key") !== undefined && this.instrument.MidiInstrumentId !== MidiInstrument.Percussion) {
      let key: number = 0;
      const keyNode: IXmlElement = node.element("key").element("fifths");
      if (keyNode !== undefined) {
        try {
          key = parseInt(keyNode.value, 10);
        } catch (ex) {
          errorMsg = ITextTranslation.translateText(
            "ReaderErrorMessages/KeyError",
            "Invalid key found -> set to default."
          );
          this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
          key = 0;
          log.debug("InstrumentReader.addAbstractInstruction", errorMsg, ex);
        }

      }
      let keyEnum: KeyEnum = KeyEnum.none;
      let modeNode: IXmlElement = node.element("key");
      if (modeNode !== undefined) {
        modeNode = modeNode.element("mode");
      }
      if (modeNode !== undefined) {
        try {
          keyEnum = KeyEnum[modeNode.value];
        } catch (ex) {
          errorMsg = ITextTranslation.translateText(
            "ReaderErrorMessages/KeyError",
            "Invalid key found -> set to default."
          );
          this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
          keyEnum = KeyEnum.major;
          log.debug("InstrumentReader.addAbstractInstruction", errorMsg, ex);
        }
      }
      const keyInstruction: KeyInstruction = new KeyInstruction(undefined, key, keyEnum);
      this.abstractInstructions.push([1, keyInstruction]);
    }
    if (node.element("time") !== undefined) {
      const timeNode: IXmlElement = node.element("time");
      let symbolEnum: RhythmSymbolEnum = RhythmSymbolEnum.NONE;
      let timePrintObject: boolean = true;
      if (timeNode !== undefined && timeNode.hasAttributes) {
        const symbolAttribute: IXmlAttribute = timeNode.attribute("symbol");
        if (symbolAttribute) {
          if (symbolAttribute.value === "common") {
            symbolEnum = RhythmSymbolEnum.COMMON;
          } else if (symbolAttribute.value === "cut") {
            symbolEnum = RhythmSymbolEnum.CUT;
          }
        }

        const printObjectAttribute: IXmlAttribute = timeNode.attribute("print-object");
        if (printObjectAttribute) {
          if (printObjectAttribute.value === "no") {
            timePrintObject = false;
          }
        }
      }

      let num: number = 0;
      let denom: number = 0;
      const senzaMisura: boolean = (timeNode !== undefined && timeNode.element("senza-misura") !== undefined);
      const timeList: IXmlElement[] = node.elements("time");
      const beatsList: IXmlElement[] = [];
      const typeList: IXmlElement[] = [];
      for (let idx: number = 0, len: number = timeList.length; idx < len; ++idx) {
        const xmlNode: IXmlElement = timeList[idx];
        beatsList.push.apply(beatsList, xmlNode.elements("beats"));
        typeList.push.apply(typeList, xmlNode.elements("beat-type"));
      }
      if (!senzaMisura) {
        try {
          if (beatsList !== undefined && beatsList.length > 0 && typeList !== undefined && beatsList.length === typeList.length) {
            const length: number = beatsList.length;
            const fractions: Fraction[] = new Array(length);
            let maxDenom: number = 0;
            for (let i: number = 0; i < length; i++) {
              const s: string = beatsList[i].value;
              let n: number = 0;
              let d: number = 0;
              if (s.indexOf("+") !== -1) {
                const numbers: string[] = s.split("+");
                for (let idx: number = 0, len: number = numbers.length; idx < len; ++idx) {
                  n += parseInt(numbers[idx], 10);
                }
              } else {
                n = parseInt(s, 10);
              }
              d = parseInt(typeList[i].value, 10);
              maxDenom = Math.max(maxDenom, d);
              fractions[i] = new Fraction(n, d, 0, false);
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
            num = parseInt(node.element("time").element("beats").value, 10);
            denom = parseInt(node.element("time").element("beat-type").value, 10);
          }
        } catch (ex) {
          errorMsg = ITextTranslation.translateText("ReaderErrorMessages/RhythmError", "Invalid rhythm found -> set to default.");
          this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
          num = 4;
          denom = 4;
          log.debug("InstrumentReader.addAbstractInstruction", errorMsg, ex);
        }

        const newRhythmInstruction: RhythmInstruction = new RhythmInstruction(
          new Fraction(num, denom, 0, false), symbolEnum
        );
        newRhythmInstruction.PrintObject = timePrintObject;
        this.abstractInstructions.push([1, newRhythmInstruction]);
      } else {
        this.abstractInstructions.push([1, new RhythmInstruction(new Fraction(4, 4, 0, false), RhythmSymbolEnum.NONE)]);
      }
    }
  }

  /**
   * Save the current AbstractInstructions to the corresponding [[StaffEntry]]s.
   * @param numberOfStaves
   * @param beginOfMeasure
   */
  private saveAbstractInstructionList(numberOfStaves: number, beginOfMeasure: boolean): void {
    for (let i: number = this.abstractInstructions.length - 1; i >= 0; i--) {
      const pair: [number, AbstractNotationInstruction] = this.abstractInstructions[i];
      const key: number = pair[0];
      const value: AbstractNotationInstruction = pair[1];
      if (value instanceof ClefInstruction) {
        const clefInstruction: ClefInstruction = <ClefInstruction>value;
        if (this.currentXmlMeasureIndex === 0 || (key <= this.activeClefs.length && clefInstruction !== this.activeClefs[key - 1])) {
          if (!beginOfMeasure && this.currentStaffEntry !== undefined && !this.currentStaffEntry.hasNotes() && key - 1
            === this.instrument.Staves.indexOf(this.currentStaffEntry.ParentStaff)) {
            const newClefInstruction: ClefInstruction = clefInstruction;
            newClefInstruction.Parent = this.currentStaffEntry;
            this.currentStaffEntry.removeFirstInstructionOfTypeClefInstruction();
            this.currentStaffEntry.Instructions.push(newClefInstruction);
            this.activeClefs[key - 1] = clefInstruction;
            this.abstractInstructions.splice(i, 1);
          } else if (beginOfMeasure) {
            let firstStaffEntry: SourceStaffEntry;
            if (this.currentMeasure !== undefined) {
              const newClefInstruction: ClefInstruction = clefInstruction;
              const sseIndex: number = this.inSourceMeasureInstrumentIndex + key - 1;
              const firstSse: SourceStaffEntry = this.currentMeasure.FirstInstructionsStaffEntries[sseIndex];
              if (this.currentXmlMeasureIndex === 0) {
                if (firstSse === undefined) {
                  firstStaffEntry = new SourceStaffEntry(undefined, undefined);
                  this.currentMeasure.FirstInstructionsStaffEntries[sseIndex] = firstStaffEntry;
                  newClefInstruction.Parent = firstStaffEntry;
                  firstStaffEntry.Instructions.push(newClefInstruction);
                  this.activeClefsHaveBeenInitialized[key - 1] = true;
                } else if (this.currentMeasure.FirstInstructionsStaffEntries[sseIndex]
                  !==
                  undefined && !(firstSse.Instructions[0] instanceof ClefInstruction)) {
                  firstStaffEntry = firstSse;
                  newClefInstruction.Parent = firstStaffEntry;
                  firstStaffEntry.removeFirstInstructionOfTypeClefInstruction();
                  firstStaffEntry.Instructions.splice(0, 0, newClefInstruction);
                  this.activeClefsHaveBeenInitialized[key - 1] = true;
                } else {
                  const lastStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, undefined);
                  this.currentMeasure.LastInstructionsStaffEntries[sseIndex] = lastStaffEntry;
                  newClefInstruction.Parent = lastStaffEntry;
                  lastStaffEntry.Instructions.push(newClefInstruction);
                }
              } else if (!this.activeClefsHaveBeenInitialized[key - 1]) {
                const first: SourceMeasure = this.musicSheet.SourceMeasures[0];
                if (first.FirstInstructionsStaffEntries[sseIndex] === undefined) {
                  firstStaffEntry = new SourceStaffEntry(undefined, undefined);
                } else {
                  firstStaffEntry = first.FirstInstructionsStaffEntries[sseIndex];
                  firstStaffEntry.removeFirstInstructionOfTypeClefInstruction();
                }
                newClefInstruction.Parent = firstStaffEntry;
                firstStaffEntry.Instructions.splice(0, 0, newClefInstruction);
                this.activeClefsHaveBeenInitialized[key - 1] = true;
              } else {
                const lastStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, undefined);
                this.previousMeasure.LastInstructionsStaffEntries[sseIndex] = lastStaffEntry;
                newClefInstruction.Parent = lastStaffEntry;
                lastStaffEntry.Instructions.push(newClefInstruction);
              }
              this.activeClefs[key - 1] = clefInstruction;
              this.abstractInstructions.splice(i, 1);
            }
          }
        } else if (key <= this.activeClefs.length && clefInstruction === this.activeClefs[key - 1]) {
          this.abstractInstructions.splice(i, 1);
        }
      }
      if (value instanceof KeyInstruction) {
        const keyInstruction: KeyInstruction = <KeyInstruction>value;
        if (this.activeKey === undefined || this.activeKey.Key !== keyInstruction.Key) {
          this.activeKey = keyInstruction;
          this.abstractInstructions.splice(i, 1);
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
              const newKeyInstruction: KeyInstruction = keyInstruction;
              if (sourceMeasure.FirstInstructionsStaffEntries[j] === undefined) {
                const firstStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, undefined);
                sourceMeasure.FirstInstructionsStaffEntries[j] = firstStaffEntry;
                newKeyInstruction.Parent = firstStaffEntry;
                firstStaffEntry.Instructions.push(newKeyInstruction);
              } else {
                const firstStaffEntry: SourceStaffEntry = sourceMeasure.FirstInstructionsStaffEntries[j];
                newKeyInstruction.Parent = firstStaffEntry;
                firstStaffEntry.removeFirstInstructionOfTypeKeyInstruction();
                if (firstStaffEntry.Instructions.length === 0) {
                  firstStaffEntry.Instructions.push(newKeyInstruction);
                } else {
                  if (firstStaffEntry.Instructions[0] instanceof ClefInstruction) {
                    firstStaffEntry.Instructions.splice(1, 0, newKeyInstruction);
                  } else {
                    firstStaffEntry.Instructions.splice(0, 0, newKeyInstruction);
                  }
                }
              }
            }
          }
        } else {
          this.abstractInstructions.splice(i, 1);
        }
      }
      if (value instanceof RhythmInstruction) {
        const rhythmInstruction: RhythmInstruction = <RhythmInstruction>value;
        if (this.activeRhythm === undefined || this.activeRhythm !== rhythmInstruction) {
          this.activeRhythm = rhythmInstruction;
          this.abstractInstructions.splice(i, 1);
          if (this.currentMeasure !== undefined) {
            for (let j: number = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + numberOfStaves; j++) {
              const newRhythmInstruction: RhythmInstruction = rhythmInstruction;
              let firstStaffEntry: SourceStaffEntry;
              if (this.currentMeasure.FirstInstructionsStaffEntries[j] === undefined) {
                firstStaffEntry = new SourceStaffEntry(undefined, undefined);
                this.currentMeasure.FirstInstructionsStaffEntries[j] = firstStaffEntry;
              } else {
                firstStaffEntry = this.currentMeasure.FirstInstructionsStaffEntries[j];
                firstStaffEntry.removeFirstInstructionOfTypeRhythmInstruction();
              }
              newRhythmInstruction.Parent = firstStaffEntry;
              firstStaffEntry.Instructions.push(newRhythmInstruction);
            }
          }
        } else {
          this.abstractInstructions.splice(i, 1);
        }
      }
    }
  }

  /**
   * Save any ClefInstruction given - exceptionally - at the end of the currentMeasure.
   */
  private saveClefInstructionAtEndOfMeasure(): void {
    for (let i: number = this.abstractInstructions.length - 1; i >= 0; i--) {
      const key: number = this.abstractInstructions[i][0];
      const value: AbstractNotationInstruction = this.abstractInstructions[i][1];
      if (value instanceof ClefInstruction) {
        const clefInstruction: ClefInstruction = <ClefInstruction>value;
        if (
          (this.activeClefs[key - 1] === undefined) ||
          (clefInstruction.ClefType !== this.activeClefs[key - 1].ClefType || (
            clefInstruction.ClefType === this.activeClefs[key - 1].ClefType &&
            clefInstruction.Line !== this.activeClefs[key - 1].Line
          ))) {
          const lastStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, undefined);
          this.currentMeasure.LastInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + key - 1] = lastStaffEntry;
          const newClefInstruction: ClefInstruction = clefInstruction;
          newClefInstruction.Parent = lastStaffEntry;
          lastStaffEntry.Instructions.push(newClefInstruction);
          this.activeClefs[key - 1] = clefInstruction;
          this.abstractInstructions.splice(i, 1);
        }
      }
    }
  }

  /**
   * In case of a [[Tuplet]], read NoteDuration from type.
   * @param xmlNode
   * @returns {Fraction}
   */
  private getNoteDurationForTuplet(xmlNode: IXmlElement): Fraction {
    let duration: Fraction = new Fraction(0, 1);
    const typeDuration: Fraction = this.getNoteDurationFromTypeNode(xmlNode);
    if (xmlNode.element("time-modification") !== undefined) {
      const time: IXmlElement = xmlNode.element("time-modification");
      if (time !== undefined) {
        if (time.element("actual-notes") !== undefined && time.element("normal-notes") !== undefined) {
          const actualNotes: IXmlElement = time.element("actual-notes");
          const normalNotes: IXmlElement = time.element("normal-notes");
          if (actualNotes !== undefined && normalNotes !== undefined) {
            const actual: number = parseInt(actualNotes.value, 10);
            const normal: number = parseInt(normalNotes.value, 10);
            duration = new Fraction(normal * typeDuration.Numerator, actual * typeDuration.Denominator);
          }
        }
      }
    }
    return duration;
  }

  private readExpressionStaffNumber(xmlNode: IXmlElement): number {
   let directionStaffNumber: number = 1;
   if (xmlNode.element("staff") !== undefined) {
     const staffNode: IXmlElement = xmlNode.element("staff");
     if (staffNode !== undefined) {
       try {
         directionStaffNumber = parseInt(staffNode.value, 10);
       } catch (ex) {
         const errorMsg: string = ITextTranslation.translateText(
           "ReaderErrorMessages/ExpressionStaffError", "Invalid Expression staff number -> set to default."
         );
         this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
         directionStaffNumber = 1;
         log.debug("InstrumentReader.readExpressionStaffNumber", errorMsg, ex);
       }

     }
   }
   return directionStaffNumber;
  }

  /**
   * Calculate the divisions value from the type and duration of the first MeasureNote that makes sense
   * (meaning itself hasn't any errors and it doesn't belong to a [[Tuplet]]).
   *
   * If all the MeasureNotes belong to a [[Tuplet]], then we read the next XmlMeasure (and so on...).
   * If we have reached the end of the [[Instrument]] and still the divisions aren't set, we throw an exception
   * @returns {number}
   */
  private readDivisionsFromNotes(): number {
    let divisionsFromNote: number = 0;
    let xmlMeasureIndex: number = this.currentXmlMeasureIndex;
    let read: boolean = false;
    while (!read) {
      const xmlMeasureListArr: IXmlElement[] = this.xmlMeasureList[xmlMeasureIndex].elements();
      for (let idx: number = 0, len: number = xmlMeasureListArr.length; idx < len; ++idx) {
        const xmlNode: IXmlElement = xmlMeasureListArr[idx];
        if (xmlNode.name === "note" && xmlNode.element("time-modification") === undefined) {
          const durationNode: IXmlElement = xmlNode.element("duration");
          const typeNode: IXmlElement = xmlNode.element("type");
          if (durationNode !== undefined && typeNode !== undefined) {
            const type: string = typeNode.value;
            let noteDuration: number = 0;
            try {
              noteDuration = parseInt(durationNode.value, 10);
            } catch (ex) {
              log.debug("InstrumentReader.readDivisionsFromNotes", ex);
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
              default:
                break;
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
          const errorMsg: string = ITextTranslation.translateText("ReaderErrorMEssages/DivisionsError", "Invalid divisions value at Instrument: ");
          throw new MusicSheetReadingException(errorMsg + this.instrument.Name);
        }
      }
    }
    return divisionsFromNote;
  }
}
