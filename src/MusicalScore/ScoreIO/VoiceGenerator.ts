import { Instrument } from "../Instrument";
import { LinkedVoice } from "../VoiceData/LinkedVoice";
import { Voice } from "../VoiceData/Voice";
import { MusicSheet } from "../MusicSheet";
import { VoiceEntry, StemDirectionType } from "../VoiceData/VoiceEntry";
import { Note } from "../VoiceData/Note";
import { SourceMeasure } from "../VoiceData/SourceMeasure";
import { SourceStaffEntry } from "../VoiceData/SourceStaffEntry";
import { Beam } from "../VoiceData/Beam";
import { Tie } from "../VoiceData/Tie";
import { Tuplet } from "../VoiceData/Tuplet";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { IXmlElement } from "../../Common/FileIO/Xml";
import { ITextTranslation } from "../Interfaces/ITextTranslation";
import { LyricsReader } from "../ScoreIO/MusicSymbolModules/LyricsReader";
import { MusicSheetReadingException } from "../Exceptions";
import { AccidentalEnum } from "../../Common/DataObjects/Pitch";
import { NoteEnum } from "../../Common/DataObjects/Pitch";
import { Staff } from "../VoiceData/Staff";
import { StaffEntryLink } from "../VoiceData/StaffEntryLink";
import { VerticalSourceStaffEntryContainer } from "../VoiceData/VerticalSourceStaffEntryContainer";
import * as log from "loglevel";
import { Pitch } from "../../Common/DataObjects/Pitch";
import { IXmlAttribute } from "../../Common/FileIO/Xml";
import { CollectionUtil } from "../../Util/CollectionUtil";
import { ArticulationReader } from "./MusicSymbolModules/ArticulationReader";
import { SlurReader } from "./MusicSymbolModules/SlurReader";
import { NoteHead } from "../VoiceData/NoteHead";
import { Arpeggio, ArpeggioType } from "../VoiceData/Arpeggio";

export class VoiceGenerator {
  constructor(instrument: Instrument, voiceId: number, slurReader: SlurReader, mainVoice: Voice = undefined) {
    this.musicSheet = instrument.GetMusicSheet;
    this.slurReader = slurReader;
    if (mainVoice !== undefined) {
      this.voice = new LinkedVoice(instrument, voiceId, mainVoice);
    } else {
      this.voice = new Voice(instrument, voiceId);
    }
    instrument.Voices.push(this.voice);
    this.lyricsReader = new LyricsReader(this.musicSheet);
    this.articulationReader = new ArticulationReader();
  }

  private slurReader: SlurReader;
  private lyricsReader: LyricsReader;
  private articulationReader: ArticulationReader;
  private musicSheet: MusicSheet;
  private voice: Voice;
  private currentVoiceEntry: VoiceEntry;
  private currentNote: Note;
  private currentMeasure: SourceMeasure;
  private currentStaffEntry: SourceStaffEntry;
  private lastBeamTag: string = "";
  private openBeam: Beam;
  private openTieDict: { [_: number]: Tie; } = {};
  private currentOctaveShift: number = 0;
  private tupletDict: { [_: number]: Tuplet; } = {};
  private openTupletNumber: number = 0;

  public get GetVoice(): Voice {
    return this.voice;
  }

  public get OctaveShift(): number {
    return this.currentOctaveShift;
  }

  public set OctaveShift(value: number) {
    this.currentOctaveShift = value;
  }

  /**
   * Create new [[VoiceEntry]], add it to given [[SourceStaffEntry]] and if given so, to [[Voice]].
   * @param musicTimestamp
   * @param parentStaffEntry
   * @param addToVoice
   * @param isGrace States whether the new VoiceEntry (only) has grace notes
   */
  public createVoiceEntry(musicTimestamp: Fraction, parentStaffEntry: SourceStaffEntry, addToVoice: boolean,
                          isGrace: boolean = false, graceNoteSlash: boolean = false, graceSlur: boolean = false): void {
    this.currentVoiceEntry = new VoiceEntry(musicTimestamp.clone(), this.voice, parentStaffEntry, isGrace, graceNoteSlash, graceSlur);
    if (addToVoice) {
      this.voice.VoiceEntries.push(this.currentVoiceEntry);
    }
    if (parentStaffEntry.VoiceEntries.indexOf(this.currentVoiceEntry) === -1) {
      parentStaffEntry.VoiceEntries.push(this.currentVoiceEntry);
    }
  }

  /**
   * Create [[Note]]s and handle Lyrics, Articulations, Beams, Ties, Slurs, Tuplets.
   * @param noteNode
   * @param noteDuration
   * @param divisions
   * @param restNote
   * @param parentStaffEntry
   * @param parentMeasure
   * @param measureStartAbsoluteTimestamp
   * @param maxTieNoteFraction
   * @param chord
   * @param guitarPro
   * @param printObject whether the note should be rendered (true) or invisible (false)
   * @returns {Note}
   */
  public read(noteNode: IXmlElement, noteDuration: Fraction, restNote: boolean,
              parentStaffEntry: SourceStaffEntry, parentMeasure: SourceMeasure,
              measureStartAbsoluteTimestamp: Fraction, maxTieNoteFraction: Fraction, chord: boolean, guitarPro: boolean,
              printObject: boolean, isCueNote: boolean, stemDirectionXml: StemDirectionType): Note {
    this.currentStaffEntry = parentStaffEntry;
    this.currentMeasure = parentMeasure;
    //log.debug("read called:", restNote);
    try {
      this.currentNote = restNote
        ? this.addRestNote(noteDuration, printObject, isCueNote)
        : this.addSingleNote(noteNode, noteDuration, chord, guitarPro, printObject, isCueNote, stemDirectionXml);
      // read lyrics
      const lyricElements: IXmlElement[] = noteNode.elements("lyric");
      if (this.lyricsReader !== undefined && lyricElements !== undefined) {
        this.lyricsReader.addLyricEntry(lyricElements, this.currentVoiceEntry);
        this.voice.Parent.HasLyrics = true;
      }
      let hasTupletCommand: boolean = false;
      const notationNode: IXmlElement = noteNode.element("notations");
      if (notationNode !== undefined) {
        // read articulations
        if (this.articulationReader !== undefined) {
          this.readArticulations(notationNode, this.currentVoiceEntry);
        }
        // read slurs
        const slurElements: IXmlElement[] = notationNode.elements("slur");
        if (this.slurReader !== undefined &&
            slurElements.length > 0 &&
            !this.currentNote.ParentVoiceEntry.IsGrace) {
          this.slurReader.addSlur(slurElements, this.currentNote);
        }
        // read Tuplets
        const tupletElements: IXmlElement[] = notationNode.elements("tuplet");
        if (tupletElements.length > 0) {
          this.openTupletNumber = this.addTuplet(noteNode, tupletElements);
          hasTupletCommand = true;
        }
        // check for Arpeggios
        const arpeggioNode: IXmlElement = notationNode.element("arpeggiate");
        if (arpeggioNode !== undefined && !this.currentVoiceEntry.IsGrace) {
          let currentArpeggio: Arpeggio;
          if (this.currentVoiceEntry.Arpeggio !== undefined) { // add note to existing Arpeggio
            currentArpeggio = this.currentVoiceEntry.Arpeggio;
          } else { // create new Arpeggio
            let arpeggioType: ArpeggioType;
            const directionAttr: Attr = arpeggioNode.attribute("direction");
            if (directionAttr !== null) {
              switch (directionAttr.value) {
                case "up":
                  arpeggioType = ArpeggioType.ROLL_UP;
                  break;
                case "down":
                  arpeggioType = ArpeggioType.ROLL_DOWN;
                  break;
                default:
                  arpeggioType = ArpeggioType.ARPEGGIO_DIRECTIONLESS;
              }
            }

            currentArpeggio = new Arpeggio(this.currentVoiceEntry, arpeggioType);
            this.currentVoiceEntry.Arpeggio = currentArpeggio;
          }
          currentArpeggio.addNote(this.currentNote);
        }
        // check for Ties - must be the last check
        const tiedNodeList: IXmlElement[] = notationNode.elements("tied");
        if (tiedNodeList.length > 0) {
          this.addTie(tiedNodeList, measureStartAbsoluteTimestamp, maxTieNoteFraction);
        }

        // remove open ties, if there is already a gap between the last tie note and now.
        const openTieDict: { [_: number]: Tie; } = this.openTieDict;
        for (const key in openTieDict) {
          if (openTieDict.hasOwnProperty(key)) {
            const tie: Tie = openTieDict[key];
            if (Fraction.plus(tie.StartNote.ParentStaffEntry.Timestamp, tie.Duration).lt(this.currentStaffEntry.Timestamp)) {
              delete openTieDict[key];
            }
          }
        }
      }
      // time-modification yields tuplet in currentNote
      // mustn't execute method, if this is the Note where the Tuplet has been created
      if (noteNode.element("time-modification") !== undefined && !hasTupletCommand) {
        this.handleTimeModificationNode(noteNode);
      }
    } catch (err) {
      const errorMsg: string = ITextTranslation.translateText(
        "ReaderErrorMessages/NoteError", "Ignored erroneous Note."
      );
      this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
    }

    return this.currentNote;
  }

  /**
   * Create a new [[StaffEntryLink]] and sets the currenstStaffEntry accordingly.
   * @param index
   * @param currentStaff
   * @param currentStaffEntry
   * @param currentMeasure
   * @returns {SourceStaffEntry}
   */
  public checkForStaffEntryLink(index: number, currentStaff: Staff, currentStaffEntry: SourceStaffEntry, currentMeasure: SourceMeasure): SourceStaffEntry {
    const staffEntryLink: StaffEntryLink = new StaffEntryLink(this.currentVoiceEntry);
    staffEntryLink.LinkStaffEntries.push(currentStaffEntry);
    currentStaffEntry.Link = staffEntryLink;
    const linkMusicTimestamp: Fraction = this.currentVoiceEntry.Timestamp.clone();
    const verticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = currentMeasure.getVerticalContainerByTimestamp(linkMusicTimestamp);
    currentStaffEntry = verticalSourceStaffEntryContainer.StaffEntries[index];
    if (currentStaffEntry === undefined) {
      currentStaffEntry = new SourceStaffEntry(verticalSourceStaffEntryContainer, currentStaff);
      verticalSourceStaffEntryContainer.StaffEntries[index] = currentStaffEntry;
    }
    currentStaffEntry.VoiceEntries.push(this.currentVoiceEntry);
    staffEntryLink.LinkStaffEntries.push(currentStaffEntry);
    currentStaffEntry.Link = staffEntryLink;
    return currentStaffEntry;
  }

  public checkForOpenBeam(): void {
    if (this.openBeam !== undefined && this.currentNote !== undefined) {
      this.handleOpenBeam();
    }
  }

  public checkOpenTies(): void {
    const openTieDict: { [key: number]: Tie } = this.openTieDict;
    for (const key in openTieDict) {
      if (openTieDict.hasOwnProperty(key)) {
        const tie: Tie = openTieDict[key];
        if (Fraction.plus(tie.StartNote.ParentStaffEntry.Timestamp, tie.Duration)
          .lt(tie.StartNote.ParentStaffEntry.VerticalContainerParent.ParentMeasure.Duration)) {
          delete openTieDict[key];
        }
      }
    }
  }

  public hasVoiceEntry(): boolean {
    return this.currentVoiceEntry !== undefined;
  }

  /**
   *
   * @param type
   * @returns {Fraction} - a Note's Duration from a given type (type must be valid).
   */
  public getNoteDurationFromType(type: string): Fraction {
    switch (type) {
      case "1024th":
        return new Fraction(1, 1024);
      case "512th":
        return new Fraction(1, 512);
      case "256th":
        return new Fraction(1, 256);
      case "128th":
        return new Fraction(1, 128);
      case "64th":
        return new Fraction(1, 64);
      case "32th":
      case "32nd":
        return new Fraction(1, 32);
      case "16th":
        return new Fraction(1, 16);
      case "eighth":
        return new Fraction(1, 8);
      case "quarter":
        return new Fraction(1, 4);
      case "half":
        return new Fraction(1, 2);
      case "whole":
        return new Fraction(1, 1);
      case "breve":
        return new Fraction(2, 1);
      case "long":
        return new Fraction(4, 1);
      case "maxima":
        return new Fraction(8, 1);
      default: {
        const errorMsg: string = ITextTranslation.translateText(
          "ReaderErrorMessages/NoteDurationError", "Invalid note duration."
        );
        throw new MusicSheetReadingException(errorMsg);
      }
    }
  }

  private readArticulations(notationNode: IXmlElement, currentVoiceEntry: VoiceEntry): void {
    const articNode: IXmlElement = notationNode.element("articulations");
    if (articNode !== undefined) {
      this.articulationReader.addArticulationExpression(articNode, currentVoiceEntry);
    }
    const fermaNode: IXmlElement = notationNode.element("fermata");
    if (fermaNode !== undefined) {
      this.articulationReader.addFermata(fermaNode, currentVoiceEntry);
    }
    const tecNode: IXmlElement = notationNode.element("technical");
    if (tecNode !== undefined) {
      this.articulationReader.addTechnicalArticulations(tecNode, currentVoiceEntry);
    }
    const ornaNode: IXmlElement = notationNode.element("ornaments");
    if (ornaNode !== undefined) {
      this.articulationReader.addOrnament(ornaNode, currentVoiceEntry);
    }
  }

  /**
   * Create a new [[Note]] and adds it to the currentVoiceEntry
   * @param node
   * @param noteDuration
   * @param divisions
   * @param chord
   * @param guitarPro
   * @returns {Note}
   */
  private addSingleNote(node: IXmlElement, noteDuration: Fraction, chord: boolean, guitarPro: boolean,
                        printObject: boolean, isCueNote: boolean, stemDirectionXml: StemDirectionType): Note {
    //log.debug("addSingleNote called");
    let noteAlter: number = 0;
    let noteAccidental: AccidentalEnum = AccidentalEnum.NONE;
    let noteStep: NoteEnum = NoteEnum.C;
    let noteOctave: number = 0;
    let playbackInstrumentId: string = undefined;
    let noteHeadShapeXml: string = undefined;
    let noteHeadFilledXml: boolean = undefined; // if undefined, the final filled parameter will be calculated from duration

    const xmlnodeElementsArr: IXmlElement[] = node.elements();
    for (let idx: number = 0, len: number = xmlnodeElementsArr.length; idx < len; ++idx) {
      const noteElement: IXmlElement = xmlnodeElementsArr[idx];
      try {
        if (noteElement.name === "pitch") {
          const noteElementsArr: IXmlElement[] = noteElement.elements();
          for (let idx2: number = 0, len2: number = noteElementsArr.length; idx2 < len2; ++idx2) {
            const pitchElement: IXmlElement = noteElementsArr[idx2];
            noteHeadShapeXml = undefined; // reinitialize for each pitch
            noteHeadFilledXml = undefined;
            try {
              if (pitchElement.name === "step") {
                noteStep = NoteEnum[pitchElement.value];
                if (noteStep === undefined) {
                  const errorMsg: string = ITextTranslation.translateText(
                    "ReaderErrorMessages/NotePitchError",
                    "Invalid pitch while reading note."
                  );
                  this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                  throw new MusicSheetReadingException(errorMsg, undefined);
                }
              } else if (pitchElement.name === "alter") {
                noteAlter = parseFloat(pitchElement.value);
                if (isNaN(noteAlter)) {
                  const errorMsg: string = ITextTranslation.translateText(
                    "ReaderErrorMessages/NoteAlterationError", "Invalid alteration while reading note."
                  );
                  this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                  throw new MusicSheetReadingException(errorMsg, undefined);
                }
                noteAccidental = Pitch.AccidentalFromHalfTones(noteAlter); // potentially overwritten by "accidental" noteElement
              } else if (pitchElement.name === "octave") {
                noteOctave = parseInt(pitchElement.value, 10);
                if (isNaN(noteOctave)) {
                  const errorMsg: string = ITextTranslation.translateText(
                    "ReaderErrorMessages/NoteOctaveError", "Invalid octave value while reading note."
                  );
                  this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                  throw new MusicSheetReadingException(errorMsg, undefined);
                }
              }
            } catch (ex) {
              log.info("VoiceGenerator.addSingleNote read Step: ", ex.message);
            }

          }
        } else if (noteElement.name === "accidental") {
          const accidentalValue: string = noteElement.value;
          if (accidentalValue === "natural") {
            noteAccidental = AccidentalEnum.NATURAL;
          }
        } else if (noteElement.name === "unpitched") {
          const displayStep: IXmlElement = noteElement.element("display-step");
          if (displayStep !== undefined) {
            noteStep = NoteEnum[displayStep.value.toUpperCase()];
          }
          const octave: IXmlElement = noteElement.element("display-octave");
          if (octave !== undefined) {
            noteOctave = parseInt(octave.value, 10);
            if (guitarPro) {
              noteOctave += 1;
            }
          }
        } else if (noteElement.name === "instrument") {
          if (noteElement.firstAttribute !== undefined) {
            playbackInstrumentId = noteElement.firstAttribute.value;
          }
        }
        if (noteElement.name === "notehead") {
          noteHeadShapeXml = noteElement.value;
          if (noteElement.attribute("filled") !== null) {
            noteHeadFilledXml = noteElement.attribute("filled").value === "yes";
          }
        }
      } catch (ex) {
        log.info("VoiceGenerator.addSingleNote: ", ex);
      }
    }

    noteOctave -= Pitch.OctaveXmlDifference;
    const pitch: Pitch = new Pitch(noteStep, noteOctave, noteAccidental);
    const noteLength: Fraction = Fraction.createFromFraction(noteDuration);
    const note: Note = new Note(this.currentVoiceEntry, this.currentStaffEntry, noteLength, pitch);
    note.PrintObject = printObject;
    note.IsCueNote = isCueNote;
    note.StemDirectionXml = stemDirectionXml;
    note.PlaybackInstrumentId = playbackInstrumentId;
    if (noteHeadShapeXml !== undefined && noteHeadShapeXml !== "normal") {
      note.NoteHead = new NoteHead(note, noteHeadShapeXml, noteHeadFilledXml);
    } // if normal, leave note head undefined to save processing/runtime
    this.currentVoiceEntry.Notes.push(note);
    this.currentVoiceEntry.WantedStemDirectionXml = stemDirectionXml;
    if (node.elements("beam") && !chord) {
      this.createBeam(node, note);
    }
    return note;
  }

  /**
   * Create a new rest note and add it to the currentVoiceEntry.
   * @param noteDuration
   * @param divisions
   * @returns {Note}
   */
  private addRestNote(noteDuration: Fraction, printObject: boolean = true, isCueNote: boolean = false): Note {
    const restFraction: Fraction = Fraction.createFromFraction(noteDuration);
    const restNote: Note = new Note(this.currentVoiceEntry, this.currentStaffEntry, restFraction, undefined);
    restNote.PrintObject = printObject;
    restNote.IsCueNote = isCueNote;
    this.currentVoiceEntry.Notes.push(restNote);
    if (this.openBeam !== undefined) {
      this.openBeam.ExtendedNoteList.push(restNote);
    }
    return restNote;
  }

  /**
   * Handle the currentVoiceBeam.
   * @param node
   * @param note
   */
  private createBeam(node: IXmlElement, note: Note): void {
    try {
      const beamNode: IXmlElement = node.element("beam");
      let beamAttr: IXmlAttribute = undefined;
      if (beamNode !== undefined && beamNode.hasAttributes) {
        beamAttr = beamNode.attribute("number");
      }
      if (beamAttr !== undefined) {
        const beamNumber: number = parseInt(beamAttr.value, 10);
        const mainBeamNode: IXmlElement[] = node.elements("beam");
        const currentBeamTag: string = mainBeamNode[0].value;
        if (beamNumber === 1 && mainBeamNode !== undefined) {
          if (currentBeamTag === "begin" && this.lastBeamTag !== currentBeamTag) {
              if (this.openBeam !== undefined) {
                this.handleOpenBeam();
              }
              this.openBeam = new Beam();
            }
          this.lastBeamTag = currentBeamTag;
        }
        let sameVoiceEntry: boolean = false;
        if (this.openBeam === undefined) {
            return;
          }
        for (let idx: number = 0, len: number = this.openBeam.Notes.length; idx < len; ++idx) {
            const beamNote: Note = this.openBeam.Notes[idx];
            if (this.currentVoiceEntry === beamNote.ParentVoiceEntry) {
              sameVoiceEntry = true;
            }
          }
        if (!sameVoiceEntry) {
            this.openBeam.addNoteToBeam(note);
            if (currentBeamTag === "end" && beamNumber === 1) {
              this.openBeam = undefined;
            }
          }
        }
    } catch (e) {
      const errorMsg: string = ITextTranslation.translateText(
        "ReaderErrorMessages/BeamError", "Error while reading beam."
      );
      this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
      throw new MusicSheetReadingException("", e);
    }

  }

  /**
   * Check for open [[Beam]]s at end of [[SourceMeasure]] and closes them explicity.
   */
  private handleOpenBeam(): void {
    if (this.openBeam.Notes.length === 1) {
      const beamNote: Note = this.openBeam.Notes[0];
      beamNote.NoteBeam = undefined;
      this.openBeam = undefined;
      return;
    }
    if (this.currentNote === CollectionUtil.last(this.openBeam.Notes)) {
      this.openBeam = undefined;
    } else {
      const beamLastNote: Note = CollectionUtil.last(this.openBeam.Notes);
      const beamLastNoteStaffEntry: SourceStaffEntry = beamLastNote.ParentStaffEntry;
      const horizontalIndex: number = this.currentMeasure.getVerticalContainerIndexByTimestamp(beamLastNoteStaffEntry.Timestamp);
      const verticalIndex: number = beamLastNoteStaffEntry.VerticalContainerParent.StaffEntries.indexOf(beamLastNoteStaffEntry);
      if (horizontalIndex < this.currentMeasure.VerticalSourceStaffEntryContainers.length - 1) {
        const nextStaffEntry: SourceStaffEntry = this.currentMeasure
          .VerticalSourceStaffEntryContainers[horizontalIndex + 1]
          .StaffEntries[verticalIndex];
        if (nextStaffEntry !== undefined) {
          for (let idx: number = 0, len: number = nextStaffEntry.VoiceEntries.length; idx < len; ++idx) {
            const voiceEntry: VoiceEntry = nextStaffEntry.VoiceEntries[idx];
            if (voiceEntry.ParentVoice === this.voice) {
              const candidateNote: Note = voiceEntry.Notes[0];
              if (candidateNote.Length.lte(new Fraction(1, 8))) {
                this.openBeam.addNoteToBeam(candidateNote);
                this.openBeam = undefined;
              } else {
                this.openBeam = undefined;
              }
            }
          }
        }
      } else {
        this.openBeam = undefined;
      }
    }
  }

  /**
   * Create a [[Tuplet]].
   * @param node
   * @param tupletNodeList
   * @returns {number}
   */
  private addTuplet(node: IXmlElement, tupletNodeList: IXmlElement[]): number {
    let bracketed: boolean = false; // xml bracket attribute value
    if (tupletNodeList !== undefined && tupletNodeList.length > 1) {
      let timeModNode: IXmlElement = node.element("time-modification");
      if (timeModNode !== undefined) {
        timeModNode = timeModNode.element("actual-notes");
      }
      const tupletNodeListArr: IXmlElement[] = tupletNodeList;
      for (let idx: number = 0, len: number = tupletNodeListArr.length; idx < len; ++idx) {
        const tupletNode: IXmlElement = tupletNodeListArr[idx];
        if (tupletNode !== undefined && tupletNode.attributes()) {
          const bracketAttr: Attr = tupletNode.attribute("bracket");
          if (bracketAttr && bracketAttr.value === "yes") {
            bracketed = true;
          }
          const type: Attr = tupletNode.attribute("type");
          if (type && type.value === "start") {
            let tupletNumber: number = 1;
            if (tupletNode.attribute("number")) {
              tupletNumber = parseInt(tupletNode.attribute("number").value, 10);
            }
            let tupletLabelNumber: number = 0;
            if (timeModNode !== undefined) {
              tupletLabelNumber = parseInt(timeModNode.value, 10);
              if (isNaN(tupletLabelNumber)) {
                const errorMsg: string = ITextTranslation.translateText(
                  "ReaderErrorMessages/TupletNoteDurationError", "Invalid tuplet note duration."
                );
                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                throw new MusicSheetReadingException(errorMsg, undefined);
              }

            }
            const tuplet: Tuplet = new Tuplet(tupletLabelNumber, bracketed);
            if (this.tupletDict[tupletNumber] !== undefined) {
              delete this.tupletDict[tupletNumber];
              if (Object.keys(this.tupletDict).length === 0) {
                this.openTupletNumber = 0;
              } else if (Object.keys(this.tupletDict).length > 1) {
                this.openTupletNumber--;
              }
            }
            this.tupletDict[tupletNumber] = tuplet;
            const subnotelist: Note[] = [];
            subnotelist.push(this.currentNote);
            tuplet.Notes.push(subnotelist);
            tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
            this.currentNote.NoteTuplet = tuplet;
            this.openTupletNumber = tupletNumber;
          } else if (type.value === "stop") {
            let tupletNumber: number = 1;
            if (tupletNode.attribute("number")) {
              tupletNumber = parseInt(tupletNode.attribute("number").value, 10);
            }
            const tuplet: Tuplet = this.tupletDict[tupletNumber];
            if (tuplet !== undefined) {
              const subnotelist: Note[] = [];
              subnotelist.push(this.currentNote);
              tuplet.Notes.push(subnotelist);
              tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
              this.currentNote.NoteTuplet = tuplet;
              delete this.tupletDict[tupletNumber];
              if (Object.keys(this.tupletDict).length === 0) {
                this.openTupletNumber = 0;
              } else if (Object.keys(this.tupletDict).length > 1) {
                this.openTupletNumber--;
              }
            }
          }
        }
      }
    } else if (tupletNodeList[0] !== undefined) {
      const n: IXmlElement = tupletNodeList[0];
      if (n.hasAttributes) {
        const type: string = n.attribute("type").value;
        let tupletnumber: number = 1;
        if (n.attribute("number")) {
          tupletnumber = parseInt(n.attribute("number").value, 10);
        }
        const noTupletNumbering: boolean = isNaN(tupletnumber);

        const bracketAttr: Attr = n.attribute("bracket");
        if (bracketAttr && bracketAttr.value === "yes") {
          bracketed = true;
        }

        if (type === "start") {
          let tupletLabelNumber: number = 0;
          let timeModNode: IXmlElement = node.element("time-modification");
          if (timeModNode !== undefined) {
            timeModNode = timeModNode.element("actual-notes");
          }
          if (timeModNode !== undefined) {
            tupletLabelNumber = parseInt(timeModNode.value, 10);
            if (isNaN(tupletLabelNumber)) {
              const errorMsg: string = ITextTranslation.translateText(
                "ReaderErrorMessages/TupletNoteDurationError", "Invalid tuplet note duration."
              );
              this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
              throw new MusicSheetReadingException(errorMsg);
            }

          }
          if (noTupletNumbering) {
            this.openTupletNumber++;
            tupletnumber = this.openTupletNumber;
          }
          let tuplet: Tuplet = this.tupletDict[tupletnumber];
          if (tuplet === undefined) {
            tuplet = this.tupletDict[tupletnumber] = new Tuplet(tupletLabelNumber, bracketed);
          }
          const subnotelist: Note[] = [];
          subnotelist.push(this.currentNote);
          tuplet.Notes.push(subnotelist);
          tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
          this.currentNote.NoteTuplet = tuplet;
          this.openTupletNumber = tupletnumber;
        } else if (type === "stop") {
          if (noTupletNumbering) {
            tupletnumber = this.openTupletNumber;
          }
          const tuplet: Tuplet = this.tupletDict[this.openTupletNumber];
          if (tuplet !== undefined) {
            const subnotelist: Note[] = [];
            subnotelist.push(this.currentNote);
            tuplet.Notes.push(subnotelist);
            tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
            this.currentNote.NoteTuplet = tuplet;
            if (Object.keys(this.tupletDict).length === 0) {
              this.openTupletNumber = 0;
            } else if (Object.keys(this.tupletDict).length > 1) {
              this.openTupletNumber--;
            }
            delete this.tupletDict[tupletnumber];
          }
        }
      }
    }
    return this.openTupletNumber;
  }

  /**
   * This method handles the time-modification IXmlElement for the Tuplet case (tupletNotes not at begin/end of Tuplet).
   * @param noteNode
   */
  private handleTimeModificationNode(noteNode: IXmlElement): void {
    if (this.tupletDict[this.openTupletNumber] !== undefined) {
      try {
        // Tuplet should already be created
        const tuplet: Tuplet = this.tupletDict[this.openTupletNumber];
        const notes: Note[] = CollectionUtil.last(tuplet.Notes);
        const lastTupletVoiceEntry: VoiceEntry = notes[0].ParentVoiceEntry;
        let noteList: Note[];
        if (lastTupletVoiceEntry.Timestamp.Equals(this.currentVoiceEntry.Timestamp)) {
          noteList = notes;
        } else {
          noteList = [];
          tuplet.Notes.push(noteList);
          tuplet.Fractions.push(this.getTupletNoteDurationFromType(noteNode));
        }
        noteList.push(this.currentNote);
        this.currentNote.NoteTuplet = tuplet;
      } catch (ex) {
        const errorMsg: string = ITextTranslation.translateText(
          "ReaderErrorMessages/TupletNumberError", "Invalid tuplet number."
        );
        this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
        throw ex;
      }

    } else if (this.currentVoiceEntry.Notes.length > 0) {
      const firstNote: Note = this.currentVoiceEntry.Notes[0];
      if (firstNote.NoteTuplet !== undefined) {
        const tuplet: Tuplet = firstNote.NoteTuplet;
        const notes: Note[] = CollectionUtil.last(tuplet.Notes);
        notes.push(this.currentNote);
        this.currentNote.NoteTuplet = tuplet;
      }
    }
  }

  private addTie(tieNodeList: IXmlElement[], measureStartAbsoluteTimestamp: Fraction, maxTieNoteFraction: Fraction): void {
    if (tieNodeList !== undefined) {
      if (tieNodeList.length === 1) {
        const tieNode: IXmlElement = tieNodeList[0];
        if (tieNode !== undefined && tieNode.attributes()) {
          const type: string = tieNode.attribute("type").value;
          try {
            if (type === "start") {
              const num: number = this.findCurrentNoteInTieDict(this.currentNote);
              if (num < 0) {
                delete this.openTieDict[num];
              }
              const newTieNumber: number = this.getNextAvailableNumberForTie();
              const tie: Tie = new Tie(this.currentNote);
              this.openTieDict[newTieNumber] = tie;
            } else if (type === "stop") {
              const tieNumber: number = this.findCurrentNoteInTieDict(this.currentNote);
              const tie: Tie = this.openTieDict[tieNumber];
              if (tie !== undefined) {
                tie.AddNote(this.currentNote);
                if (maxTieNoteFraction.lt(Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length))) {
                  maxTieNoteFraction = Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length);
                }
                delete this.openTieDict[tieNumber];
              }
            }
          } catch (err) {
            const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/TieError", "Error while reading tie.");
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
          }

        }
      } else if (tieNodeList.length === 2) {
        const tieNumber: number = this.findCurrentNoteInTieDict(this.currentNote);
        if (tieNumber >= 0) {
          const tie: Tie = this.openTieDict[tieNumber];
          tie.AddNote(this.currentNote);
          if (maxTieNoteFraction.lt(Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length))) {
            maxTieNoteFraction = Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length);
          }
        }
      }
    }
  }

  /**
   * Find the next free int (starting from 0) to use as key in TieDict.
   * @returns {number}
   */
  private getNextAvailableNumberForTie(): number {
    const keys: string[] = Object.keys(this.openTieDict);
    if (keys.length === 0) {
      return 1;
    }
    keys.sort((a, b) => (+a - +b)); // FIXME Andrea: test
    for (let i: number = 0; i < keys.length; i++) {
      if ("" + (i + 1) !== keys[i]) {
        return i + 1;
      }
    }
    return +(keys[keys.length - 1]) + 1;
  }

  /**
   * Search the tieDictionary for the corresponding candidateNote to the currentNote (same FundamentalNote && Octave).
   * @param candidateNote
   * @returns {number}
   */
  private findCurrentNoteInTieDict(candidateNote: Note): number {
    const openTieDict: { [_: number]: Tie; } = this.openTieDict;
    for (const key in openTieDict) {
      if (openTieDict.hasOwnProperty(key)) {
        const tie: Tie = openTieDict[key];
        if (tie.Pitch.FundamentalNote === candidateNote.Pitch.FundamentalNote && tie.Pitch.Octave === candidateNote.Pitch.Octave) {
          return +key;
        }
      }
    }
    return -1;
  }

  /**
   * Calculate the normal duration of a [[Tuplet]] note.
   * @param xmlNode
   * @returns {any}
   */
  private getTupletNoteDurationFromType(xmlNode: IXmlElement): Fraction {
    if (xmlNode.element("type") !== undefined) {
      const typeNode: IXmlElement = xmlNode.element("type");
      if (typeNode !== undefined) {
        const type: string = typeNode.value;
        try {
          return this.getNoteDurationFromType(type);
        } catch (e) {
          const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError", "Invalid note duration.");
          this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
          throw new MusicSheetReadingException("", e);
        }

      }
    }
    return undefined;
  }
}
