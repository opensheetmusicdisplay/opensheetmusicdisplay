import { LinkedVoice } from "../VoiceData/LinkedVoice";
import { Voice } from "../VoiceData/Voice";
import { MusicSheet } from "../MusicSheet";
import { VoiceEntry, StemDirectionType } from "../VoiceData/VoiceEntry";
import { Note, TremoloInfo } from "../VoiceData/Note";
import { SourceMeasure } from "../VoiceData/SourceMeasure";
import { SourceStaffEntry } from "../VoiceData/SourceStaffEntry";
import { Beam } from "../VoiceData/Beam";
import { Tie } from "../VoiceData/Tie";
import { TieTypes } from "../../Common/Enums/";
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
import log from "loglevel";
import { Pitch } from "../../Common/DataObjects/Pitch";
import { IXmlAttribute } from "../../Common/FileIO/Xml";
import { CollectionUtil } from "../../Util/CollectionUtil";
import { ArticulationReader } from "./MusicSymbolModules/ArticulationReader";
import { SlurReader } from "./MusicSymbolModules/SlurReader";
import { Notehead } from "../VoiceData/Notehead";
import { Arpeggio, ArpeggioType } from "../VoiceData/Arpeggio";
import { NoteType, NoteTypeHandler } from "../VoiceData/NoteType";
import { TabNote } from "../VoiceData/TabNote";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { ReaderPluginManager } from "./ReaderPluginManager";
import { Instrument } from "../Instrument";

export class VoiceGenerator {
  private static readonly pendingTieStopsByStaff: WeakMap<Staff, PendingTieStop[]> = new WeakMap<Staff, PendingTieStop[]>();

  constructor(pluginManager: ReaderPluginManager, staff: Staff, voiceId: number, slurReader: SlurReader, mainVoice: Voice = undefined) {
    this.staff = staff;
    this.instrument = staff.ParentInstrument;
    this.musicSheet = this.instrument.GetMusicSheet;
    this.slurReader = slurReader;
    this.pluginManager = pluginManager;
    if (mainVoice) {
      this.voice = new LinkedVoice(this.instrument, voiceId, mainVoice);
    } else {
      this.voice = new Voice(this.instrument, voiceId);
    }
    this.instrument.Voices.push(this.voice); // apparently necessary for cursor.next(), for "cursor with hidden instrument" test
    this.staff.Voices.push(this.voice);
    this.lyricsReader = new LyricsReader(this.musicSheet);
    this.articulationReader = new ArticulationReader(this.musicSheet.Rules);
  }

  public pluginManager: ReaderPluginManager; // currently only used in audio player
  private slurReader: SlurReader;
  private lyricsReader: LyricsReader;
  private articulationReader: ArticulationReader;
  private musicSheet: MusicSheet;
  private voice: Voice;
  private currentVoiceEntry: VoiceEntry;
  private currentNote: Note;
  private currentMeasure: SourceMeasure;
  private currentStaffEntry: SourceStaffEntry;
  private staff: Staff;
  private instrument: Instrument;
  // private lastBeamTag: string = "";
  private openBeams: Beam[] = []; // works like a stack, with push and pop
  private beamNumberOffset: number = 0;
  private get openTieDict(): { [_: number]: Tie } { return this.staff.openTieDict; }
  private currentOctaveShift: number = 0;
  private tupletDict: { [_: number]: Tuplet } = {};
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
   * @param octavePlusOne Software like Guitar Pro gives one octave too low, so we need to add one
   * @param printObject whether the note should be rendered (true) or invisible (false)
   * @returns {Note}
   */
  public read(noteNode: IXmlElement, noteDuration: Fraction, typeDuration: Fraction, noteTypeXml: NoteType, normalNotes: number, restNote: boolean,
              parentStaffEntry: SourceStaffEntry, parentMeasure: SourceMeasure,
              measureStartAbsoluteTimestamp: Fraction, maxTieNoteFraction: Fraction, chord: boolean, octavePlusOne: boolean,
              printObject: boolean, isCueNote: boolean, isGraceNote: boolean, stemDirectionXml: StemDirectionType, tremoloInfo: TremoloInfo,
              stemColorXml: string, noteheadColorXml: string,
              dotsXml: number): Note {
    this.currentStaffEntry = parentStaffEntry;
    this.currentMeasure = parentMeasure;
    //log.debug("read called:", restNote);

    try {
      this.currentNote = restNote
        ? this.addRestNote(noteNode.element("rest"), noteDuration, noteTypeXml, typeDuration, normalNotes, printObject, isCueNote, noteheadColorXml)
        : this.addSingleNote(noteNode, noteDuration, noteTypeXml, typeDuration, normalNotes, chord, octavePlusOne,
                             printObject, isCueNote, isGraceNote, stemDirectionXml, tremoloInfo, stemColorXml, noteheadColorXml);
      this.currentNote.DotsXml = dotsXml;
      // read lyrics
      const lyricElements: IXmlElement[] = noteNode.elements("lyric");
      if (this.lyricsReader !== undefined && lyricElements) {
        this.lyricsReader.addLyricEntry(lyricElements, this.currentVoiceEntry);
        this.voice.Parent.HasLyrics = true;
      }
      let hasTupletCommand: boolean = false;
      const notationNode: IXmlElement = noteNode.element("notations");
      if (notationNode) {
        // read articulations
        if (this.articulationReader) {
          this.readArticulations(notationNode, this.currentVoiceEntry, this.currentNote);
        }
        // read slurs
        const slurElements: IXmlElement[] = notationNode.elements("slur");
        const slideElements: IXmlElement[] = notationNode.elements("slide");
        const glissElements: IXmlElement[] = notationNode.elements("glissando");
        if (this.slurReader !== undefined &&
            (slurElements.length > 0 || slideElements.length > 0) &&
            !this.currentNote.ParentVoiceEntry.IsGrace) {
          this.slurReader.addSlur(slurElements, this.currentNote);
          if (slideElements.length > 0) {
            this.slurReader.addSlur(slideElements, this.currentNote);
          }
          if (glissElements.length > 0) {
            this.slurReader.addSlur(glissElements, this.currentNote);
          }
        }
        // read Tuplets
        const tupletElements: IXmlElement[] = notationNode.elements("tuplet");
        if (tupletElements.length > 0) {
          this.openTupletNumber = this.addTuplet(noteNode, tupletElements);
          hasTupletCommand = true;
        }
        // check for Arpeggios
        const arpeggioNode: IXmlElement = notationNode.element("arpeggiate");
        if (arpeggioNode !== undefined) {
          let currentArpeggio: Arpeggio;
          if (this.currentVoiceEntry.Arpeggio) { // add note to existing Arpeggio
            currentArpeggio = this.currentVoiceEntry.Arpeggio;
          } else { // create new Arpeggio
            let arpeggioAlreadyExists: boolean = false;
            for (const voiceEntry of this.currentStaffEntry.VoiceEntries) {
              if (voiceEntry.Arpeggio) {
                arpeggioAlreadyExists = true;
                currentArpeggio = voiceEntry.Arpeggio;
                // TODO handle multiple arpeggios across multiple voices at same timestamp

                // this.currentVoiceEntry.Arpeggio = currentArpeggio; // register the arpeggio in the current voice entry as well?
                //   but then we duplicate information, and may have to take care not to render it multiple times

                // we already have an arpeggio in another voice, at the current timestamp. add the notes there.
                break;
              }
            }
            if (!arpeggioAlreadyExists) {
                let arpeggioType: ArpeggioType = ArpeggioType.ARPEGGIO_DIRECTIONLESS;
                const directionAttr: Attr = arpeggioNode.attribute("direction");
                if (directionAttr) {
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
          }
          currentArpeggio.addNote(this.currentNote);
        }
        // check for Ties - must be the last check
        const tiedNodeList: IXmlElement[] = notationNode.elements("tied");
        if (tiedNodeList.length > 0) {
          this.addTie(tiedNodeList, measureStartAbsoluteTimestamp, maxTieNoteFraction, TieTypes.SIMPLE);
        }
        //"check for slides, they are the same as Ties but with a different connection"
        //  correction: slide can have a different end note (e.g. guitar) -> should be handled like slur rather than tie
        // const slideNodeList: IXmlElement[] = notationNode.elements("slide");
        // if (slideNodeList.length > 0) {
        //   this.addTie(slideNodeList, measureStartAbsoluteTimestamp, maxTieNoteFraction, TieTypes.SLIDE);
        // }
        //check for guitar specific symbols:
        const technicalNode: IXmlElement = notationNode.element("technical");
        if (technicalNode) {
          const hammerNodeList: IXmlElement[] = technicalNode.elements("hammer-on");
          if (hammerNodeList.length > 0) {
            this.addTie(hammerNodeList, measureStartAbsoluteTimestamp, maxTieNoteFraction, TieTypes.HAMMERON);
          }
          const pulloffNodeList: IXmlElement[] = technicalNode.elements("pull-off");
          if (pulloffNodeList.length > 0) {
            this.addTie(pulloffNodeList, measureStartAbsoluteTimestamp, maxTieNoteFraction, TieTypes.PULLOFF);
          }
        }

        // remove open ties, if there is already a gap between the last tie note and now.
        // TODO this deletes valid ties, see #1097
        // const openTieDict: { [_: number]: Tie } = this.openTieDict;
        // for (const key in openTieDict) {
        //   if (openTieDict.hasOwnProperty(key)) {
        //     const tie: Tie = openTieDict[key];
        //     if (Fraction.plus(tie.StartNote.ParentStaffEntry.Timestamp, tie.Duration).lt(this.currentStaffEntry.Timestamp)) {
        //       delete openTieDict[key];
        //     }
        //   }
        // }
      }
      // time-modification yields tuplet in currentNote
      // mustn't execute method, if this is the Note where the Tuplet has been created
      if (noteNode.element("time-modification") !== undefined && !hasTupletCommand) {
        this.handleTimeModificationNode(noteNode);
      }
    } catch (err) {
      log.warn(err);
      const errorMsg: string = ITextTranslation.translateText(
        "ReaderErrorMessages/NoteError", "Ignored erroneous Note."
      );
      this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
      this.musicSheet.SheetErrors.pushMeasureError(err);
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
    if (!currentStaffEntry) {
      currentStaffEntry = new SourceStaffEntry(verticalSourceStaffEntryContainer, currentStaff);
      verticalSourceStaffEntryContainer.StaffEntries[index] = currentStaffEntry;
    }
    currentStaffEntry.VoiceEntries.push(this.currentVoiceEntry);
    staffEntryLink.LinkStaffEntries.push(currentStaffEntry);
    currentStaffEntry.Link = staffEntryLink;
    return currentStaffEntry;
  }

  public checkForOpenBeam(): void {
    if (this.openBeams.length > 0 && this.currentNote) {
      this.handleOpenBeam();
    }
  }

  /** Check/delete open ties that don't exceed measure duration. Currently unused as it's incorrect, see below. */
  public checkOpenTies(): void {
    const openTieDict: { [key: number]: Tie } = this.openTieDict;
    for (const key in openTieDict) {
      if (openTieDict.hasOwnProperty(key)) {
        const tie: Tie = openTieDict[key];
        if (Fraction.plus(tie.StartNote.ParentStaffEntry.Timestamp, tie.Duration)
          .lt(tie.StartNote.SourceMeasure.Duration)) {
          delete openTieDict[key];
          // TODO the assumption that an open tie can be deleted if it doesn't exceed the measure duration is incorrect,
          //   see #1530 or Mozart K570 measure 42, simplified into test sample test_tie_missing_k570.musicxml
        }
      }
    }
  }

  public hasVoiceEntry(): boolean {
    return this.currentVoiceEntry !== undefined;
  }

  private readArticulations(notationNode: IXmlElement, currentVoiceEntry: VoiceEntry, currentNote: Note): void {
    const articNode: IXmlElement = notationNode.element("articulations");
    if (articNode) {
      this.articulationReader.addArticulationExpression(articNode, currentVoiceEntry);
    }
    const fermaNode: IXmlElement = notationNode.element("fermata");
    if (fermaNode) {
      this.articulationReader.addFermata(fermaNode, currentVoiceEntry);
    }
    const tecNode: IXmlElement = notationNode.element("technical");
    if (tecNode) {
      this.articulationReader.addTechnicalArticulations(tecNode, currentVoiceEntry, currentNote);
    }
    const ornaNode: IXmlElement = notationNode.element("ornaments");
    if (ornaNode) {
      this.articulationReader.addOrnament(ornaNode, currentVoiceEntry);
      // const tremoloNode: IXmlElement = ornaNode.element("tremolo");
      // tremolo should be and is added per note, not per VoiceEntry. see addSingleNote()
    }

  }

  /**
   * Create a new [[Note]] and adds it to the currentVoiceEntry
   * @param node
   * @param noteDuration
   * @param divisions
   * @param chord
   * @param octavePlusOne Software like Guitar Pro gives one octave too low, so we need to add one
   * @returns {Note}
   */
  private addSingleNote(node: IXmlElement, noteDuration: Fraction, noteTypeXml: NoteType, typeDuration: Fraction,
                        normalNotes: number, chord: boolean, octavePlusOne: boolean,
                        printObject: boolean, isCueNote: boolean, isGraceNote: boolean, stemDirectionXml: StemDirectionType, tremoloInfo: TremoloInfo,
                        stemColorXml: string, noteheadColorXml: string): Note {
    //log.debug("addSingleNote called");
    let noteAlter: number = 0;
    let accidentalValue: string;
    let noteAccidental: AccidentalEnum = AccidentalEnum.NONE;
    let noteStep: NoteEnum = NoteEnum.C;
    let displayStepUnpitched: NoteEnum = NoteEnum.C;
    let noteOctave: number = 0;
    let displayOctaveUnpitched: number = 0;
    let playbackInstrumentId: string = undefined;
    let noteheadShapeXml: string = undefined;
    let noteheadFilledXml: boolean = undefined; // if undefined, the final filled parameter will be calculated from duration

    const xmlnodeElementsArr: IXmlElement[] = node.elements();
    for (let idx: number = 0, len: number = xmlnodeElementsArr.length; idx < len; ++idx) {
      const noteElement: IXmlElement = xmlnodeElementsArr[idx];
      try {
        if (noteElement.name === "pitch") {
          const noteElementsArr: IXmlElement[] = noteElement.elements();
          for (let idx2: number = 0, len2: number = noteElementsArr.length; idx2 < len2; ++idx2) {
            const pitchElement: IXmlElement = noteElementsArr[idx2];
            noteheadShapeXml = undefined; // reinitialize for each pitch
            noteheadFilledXml = undefined;
            try {
              if (pitchElement.name === "step") {
                noteStep = NoteEnum[pitchElement.value];
                if (noteStep === undefined) { // don't replace undefined check
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
          accidentalValue = noteElement.value;
          if (accidentalValue === "natural") {
            noteAccidental = AccidentalEnum.NATURAL;
            // following accidentals: ambiguous in alter value
          } else if (accidentalValue === "slash-flat") {
            noteAccidental = AccidentalEnum.SLASHFLAT;
          } else if (accidentalValue === "slash-quarter-sharp") {
            noteAccidental = AccidentalEnum.SLASHQUARTERSHARP;
          } else if (accidentalValue === "slash-sharp") {
            noteAccidental = AccidentalEnum.SLASHSHARP;
          } else if (accidentalValue === "double-slash-flat") {
            noteAccidental = AccidentalEnum.DOUBLESLASHFLAT;
          } else if (accidentalValue === "sori") {
            noteAccidental = AccidentalEnum.SORI;
          } else if (accidentalValue === "koron") {
            noteAccidental = AccidentalEnum.KORON;
          }
        } else if (noteElement.name === "unpitched") {
          const displayStepElement: IXmlElement = noteElement.element("display-step");
          const octave: IXmlElement = noteElement.element("display-octave");
          if (octave) {
            noteOctave = parseInt(octave.value, 10);
            displayOctaveUnpitched = noteOctave - 3;
            if (octavePlusOne) {
              noteOctave += 1;
            }
            if (this.instrument.Staves[0].StafflineCount === 1) {
              displayOctaveUnpitched += 1;
            }
          }
          if (displayStepElement) {
            noteStep = NoteEnum[displayStepElement.value.toUpperCase()];
            let octaveShift: number = 0;
            let noteValueShift: number = this.musicSheet.Rules.PercussionXMLDisplayStepNoteValueShift;
            if (this.instrument.Staves[0].StafflineCount === 1) {
              noteValueShift -= 3; // for percussion one line scores, we need to set the notes 3 lines lower
            }
            [displayStepUnpitched, octaveShift] = Pitch.lineShiftFromNoteEnum(noteStep, noteValueShift);
            displayOctaveUnpitched += octaveShift;
          }
        } else if (noteElement.name === "instrument") {
          if (noteElement.firstAttribute) {
            playbackInstrumentId = noteElement.firstAttribute.value;
          }
        } else if (noteElement.name === "notehead") {
          noteheadShapeXml = noteElement.value;
          if (noteElement.attribute("filled")) {
            noteheadFilledXml = noteElement.attribute("filled").value === "yes";
          }
        }
      } catch (ex) {
        log.info("VoiceGenerator.addSingleNote: ", ex);
      }
    }

    noteOctave -= Pitch.OctaveXmlDifference;
    const pitch: Pitch = new Pitch(noteStep, noteOctave, noteAccidental, accidentalValue);
    const noteLength: Fraction = Fraction.createFromFraction(noteDuration);
    let note: Note = undefined;
    let stringNumber: number = -1; //1 to always recognize as valid tab note
    let fretNumber: number = -1; //0 to always recognize as valid tab note
    const bends: {bendalter: number, direction: string}[] = [];
    // check for guitar tabs:
    const notationNode: IXmlElement = node.element("notations");
    if (notationNode) {
      const technicalNode: IXmlElement = notationNode.element("technical");
      if (technicalNode) {
        const stringNode: IXmlElement = technicalNode.element("string");
        if (stringNode) {
          stringNumber = parseInt(stringNode.value, 10);
        }
        const fretNode: IXmlElement = technicalNode.element("fret");
        if (fretNode) {
          fretNumber = parseInt(fretNode.value, 10);
        }
        const bendElementsArr: IXmlElement[] = technicalNode.elements("bend");
        bendElementsArr.forEach(function (bend: IXmlElement): void {
            const bendalterNote: IXmlElement = bend.element("bend-alter");
            const releaseNode: IXmlElement = bend.element("release");
            if (releaseNode !== undefined) {
              bends.push({bendalter: parseInt (bendalterNote.value, 10), direction: "down"});
            } else {
              bends.push({bendalter: parseInt (bendalterNote.value, 10), direction: "up"});
            }
          });
      }
    }

    if (stringNumber < 0 || fretNumber < 0) {
      // create normal Note
      note = new Note(this.currentVoiceEntry, this.currentStaffEntry, noteLength, pitch, this.currentMeasure);
    } else {
      // create TabNote
      note = new TabNote(this.currentVoiceEntry, this.currentStaffEntry, noteLength, pitch, this.currentMeasure,
                         stringNumber, fretNumber, bends);
    }

    this.addNoteInfo(note, noteTypeXml, printObject, isCueNote, normalNotes,
                     displayStepUnpitched, displayOctaveUnpitched,
                     noteheadColorXml, noteheadColorXml);
    note.TypeLength = typeDuration;
    note.IsGraceNote = isGraceNote;
    note.StemDirectionXml = stemDirectionXml; // maybe unnecessary, also in VoiceEntry
    note.TremoloInfo = tremoloInfo;
    note.PlaybackInstrumentId = playbackInstrumentId;
    if ((noteheadShapeXml !== undefined && noteheadShapeXml !== "normal") || noteheadFilledXml !== undefined) {
      note.Notehead = new Notehead(note, noteheadShapeXml, noteheadFilledXml);
    } // if normal, leave note head undefined to save processing/runtime
    if (stemDirectionXml === StemDirectionType.None) {
      stemColorXml = "#00000000";  // just setting this to transparent for now
    }
    this.currentVoiceEntry.Notes.push(note);
    this.currentVoiceEntry.StemDirectionXml = stemDirectionXml;
    if (stemColorXml) {
      this.currentVoiceEntry.StemColorXml = stemColorXml;
      this.currentVoiceEntry.StemColor = stemColorXml;
      note.StemColorXml = stemColorXml;
    }
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
  private addRestNote(node: IXmlElement, noteDuration: Fraction, noteTypeXml: NoteType, typeDuration: Fraction,
                      normalNotes: number, printObject: boolean, isCueNote: boolean, noteheadColorXml: string): Note {
    const restFraction: Fraction = Fraction.createFromFraction(noteDuration);
    const displayStepElement: IXmlElement = node.element("display-step");
    const octaveElement: IXmlElement = node.element("display-octave");
    let displayStep: NoteEnum;
    let displayOctave: number;
    let pitch: Pitch = undefined;
    if (displayStepElement && octaveElement) {
        displayStep = NoteEnum[displayStepElement.value.toUpperCase()];
        displayOctave = parseInt(octaveElement.value, 10);
        pitch = new Pitch(displayStep, displayOctave, AccidentalEnum.NONE, undefined, true);
    }
    const restNote: Note = new Note(this.currentVoiceEntry, this.currentStaffEntry, restFraction, pitch, this.currentMeasure, true);
    this.addNoteInfo(restNote, noteTypeXml, printObject, isCueNote, normalNotes, displayStep, displayOctave, noteheadColorXml, noteheadColorXml);
    restNote.TypeLength = typeDuration; // needed for tuplet note type information
    //  (e.g. quarter rest - but length different due to tuplet). see MusicSheetCalculator.calculateTupletNumbers()
    this.currentVoiceEntry.Notes.push(restNote);
    if (this.openBeams.length > 0) {
      this.openBeams.last().ExtendedNoteList.push(restNote);
    }
    return restNote;
  }

  // common for "normal" notes and rest notes
  private addNoteInfo(note: Note, noteTypeXml: NoteType, printObject: boolean, isCueNote: boolean, normalNotes: number,
                      displayStep: NoteEnum, displayOctave: number,
                      noteheadColorXml: string, noteheadColor: string): void {
      // common for normal notes and rest note
      note.NoteTypeXml = noteTypeXml;
      note.PrintObject = printObject;
      note.IsCueNote = isCueNote;
      note.NormalNotes = normalNotes; // how many rhythmical notes the notes replace (e.g. for tuplets), see xml "actual-notes" and "normal-notes"
      note.displayStepUnpitched = displayStep;
      note.displayOctaveUnpitched = displayOctave;
      note.NoteheadColorXml = noteheadColorXml; // color set in Xml, shouldn't be changed.
      note.NoteheadColor = noteheadColorXml; // color currently used
      // add TypeLength for rest notes like with Note?
      // add IsGraceNote for rest notes like with Notes?
      // add PlaybackInstrumentId for rest notes?
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
      if (beamAttr) {
        let beamNumber: number = parseInt(beamAttr.value, 10);
        const mainBeamNode: IXmlElement[] = node.elements("beam");
        const currentBeamTag: string = mainBeamNode[0].value;
        if (mainBeamNode) {
          if (currentBeamTag === "begin") {
            if (beamNumber === this.openBeams.last()?.BeamNumber) {
              // beam with same number already existed (error in XML), bump beam number
              this.beamNumberOffset++;
              beamNumber += this.beamNumberOffset;
            } else if (this.openBeams.last()) {
                this.handleOpenBeam();
            }
            this.openBeams.push(new Beam(beamNumber, this.beamNumberOffset));
          } else {
            beamNumber += this.beamNumberOffset;
          }
        }
        let sameVoiceEntry: boolean = false;
        if (!(beamNumber > 0 && beamNumber <= this.openBeams.length) || !this.openBeams[beamNumber - 1]) {
          log.debug("[OSMD] invalid beamnumber"); // this shouldn't happen, probably error in this method
          return;
        }
        for (let idx: number = 0, len: number = this.openBeams[beamNumber - 1].Notes.length; idx < len; ++idx) {
          const beamNote: Note = this.openBeams[beamNumber - 1].Notes[idx];
          if (this.currentVoiceEntry === beamNote.ParentVoiceEntry) {
            sameVoiceEntry = true;
          }
        }
        if (!sameVoiceEntry) {
          const openBeam: Beam = this.openBeams[beamNumber - 1];
          openBeam.addNoteToBeam(note);
          // Detect secondary beam breaks: a higher beam level ends while beam #1 continues.
          // VexFlow's breakSecondaryAt extends the beam TO the break index then stops,
          // so we record the index of the last note in the outgoing secondary group.
          if (currentBeamTag === "continue" && mainBeamNode.length > 1) {
            for (let i: number = 1; i < mainBeamNode.length; i++) {
              if (mainBeamNode[i].value === "end") {
                const noteIndex: number = openBeam.Notes.length - 1;
                if (noteIndex > 0) {
                  openBeam.SecondaryBreakIndices.push(noteIndex);
                }
                break;
              }
            }
          }
          // const lastBeamNote: Note = openBeam.Notes.last();
          // const graceStatusChanged: boolean = (lastBeamNote?.IsCueNote || lastBeamNote?.IsGraceNote) !== (note.IsCueNote) || (note.IsGraceNote);
          if (currentBeamTag === "end") {
            this.endBeam();
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

  private endBeam(): void {
    this.openBeams.pop(); // pop the last open beam from the stack. the latest openBeam will be the one before that now
    this.beamNumberOffset = Math.max(0, this.beamNumberOffset - 1);
  }

  /**
   * Check for open [[Beam]]s at end of [[SourceMeasure]] and closes them explicity.
   */
  private handleOpenBeam(): void {
    const openBeam: Beam = this.openBeams.last();
    if (openBeam.Notes.length === 0) {
      // TODO why is there such a beam? sample: test_percussion_display_step_from_xml
      this.endBeam(); // otherwise beamLastNote.ParentStaffEntry will throw an undefined error
      return;
    }
    if (openBeam.Notes.length === 1) {
      const beamNote: Note = openBeam.Notes[0];
      beamNote.NoteBeam = undefined;
      this.endBeam();
      return;
    }
    if (this.currentNote === CollectionUtil.last(openBeam.Notes)) {
      this.endBeam();
    } else {
      const beamLastNote: Note = CollectionUtil.last(openBeam.Notes);
      const beamLastNoteStaffEntry: SourceStaffEntry = beamLastNote.ParentStaffEntry;
      const horizontalIndex: number = this.currentMeasure.getVerticalContainerIndexByTimestamp(beamLastNoteStaffEntry.Timestamp);
      const verticalIndex: number = beamLastNoteStaffEntry.VerticalContainerParent.StaffEntries.indexOf(beamLastNoteStaffEntry);
      if (horizontalIndex < this.currentMeasure.VerticalSourceStaffEntryContainers.length - 1) {
        const nextStaffEntry: SourceStaffEntry = this.currentMeasure
          .VerticalSourceStaffEntryContainers[horizontalIndex + 1]
          .StaffEntries[verticalIndex];
        if (nextStaffEntry) {
          for (let idx: number = 0, len: number = nextStaffEntry.VoiceEntries.length; idx < len; ++idx) {
            const voiceEntry: VoiceEntry = nextStaffEntry.VoiceEntries[idx];
            if (voiceEntry.ParentVoice === this.voice) {
              const candidateNote: Note = voiceEntry.Notes[0];
              if (candidateNote.Length.lte(new Fraction(1, 8))) {
                this.openBeams.last().addNoteToBeam(candidateNote);
                this.endBeam();
              } else {
                this.endBeam();
              }
            }
          }
        }
      } else {
        this.endBeam();
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
    let bracketed: boolean = false; // true if bracket=yes given, otherwise false
    let bracketedXmlValue: boolean = undefined; // Exact xml bracket value given: true for bracket=yes, false for bracket=no, undefined if not given.
    // TODO refactor this to not duplicate lots of code for the cases tupletNodeList.length == 1 and > 1
    if (tupletNodeList !== undefined && tupletNodeList.length > 1) {
      let timeModNode: IXmlElement = node.element("time-modification");
      if (timeModNode) {
        timeModNode = timeModNode.element("actual-notes");
      }
      const tupletNodeListArr: IXmlElement[] = tupletNodeList;
      for (let idx: number = 0, len: number = tupletNodeListArr.length; idx < len; ++idx) {
        const tupletNode: IXmlElement = tupletNodeListArr[idx];
        if (tupletNode !== undefined && tupletNode.attributes()) {
          const bracketAttr: Attr = tupletNode.attribute("bracket");
          if (bracketAttr && bracketAttr.value === "yes") {
            bracketed = true;
            bracketedXmlValue = true;
          } else if (bracketAttr && bracketAttr.value === "no") {
            bracketedXmlValue = false;
          }
          let ratioed: boolean = this.musicSheet.Rules.TupletsRatioed;
          const showNumberAttr: Attr = tupletNode.attribute("show-number");
          if (showNumberAttr && showNumberAttr.value === "both" && this.musicSheet.Rules.TupletsRatioedUseXMLValue) {
            ratioed = true;
          }

          const showNumberNoneGiven: boolean = this.readShowNumberNoneGiven(tupletNode);

          const type: Attr = tupletNode.attribute("type");
          if (type && type.value === "start") {
            let tupletNumber: number = 1;
            if (tupletNode.attribute("number")) {
              tupletNumber = parseInt(tupletNode.attribute("number").value, 10);
            }
            let tupletLabelNumber: number = 0;
            if (timeModNode) {
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
            tuplet.Ratioed = ratioed;
            tuplet.BracketedXmlValue = bracketedXmlValue;
            tuplet.ShowNumberNoneGivenInXml = showNumberNoneGiven;
            //Default to above
            tuplet.tupletLabelNumberPlacement = PlacementEnum.Above;
            //If we ever encounter a placement attribute for this tuplet, should override.
            //Even previous placement attributes for the tuplet
            const placementAttr: Attr = tupletNode.attribute("placement");
            if (placementAttr) {
              if (placementAttr.value === "below") {
                tuplet.tupletLabelNumberPlacement = PlacementEnum.Below;
              }
              tuplet.PlacementFromXml = true;
            }
            if (this.tupletDict[tupletNumber]) {
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
            if (tuplet) {
              const placementAttr: Attr = tupletNode.attribute("placement");
              if (placementAttr) {
                if (placementAttr.value === "below") {
                  tuplet.tupletLabelNumberPlacement = PlacementEnum.Below;
                }  else {
                  tuplet.tupletLabelNumberPlacement = PlacementEnum.Above;
                }
                tuplet.PlacementFromXml = true;
              }
              const subnotelist: Note[] = [];
              subnotelist.push(this.currentNote);
              tuplet.Notes.push(subnotelist);
              //If our placement hasn't been from XML, check all the notes in the tuplet
              //Search for the first non-rest and use it's stem direction
              if (!tuplet.PlacementFromXml) {
                let foundNonRest: boolean = false;
                for (const subList of tuplet.Notes) {
                  for (const note of subList) {
                    if (!note.isRest()) {
                      if(note.StemDirectionXml === StemDirectionType.Down) {
                        tuplet.tupletLabelNumberPlacement = PlacementEnum.Below;
                      } else {
                        tuplet.tupletLabelNumberPlacement = PlacementEnum.Above;
                      }
                      foundNonRest = true;
                      break;
                    }
                  }
                  if (foundNonRest) {
                    break;
                  }
                }
              }
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
    } else if (tupletNodeList[0]) {
      const n: IXmlElement = tupletNodeList[0];
      if (n.hasAttributes) {
        const type: string = n.attribute("type").value;
        let tupletnumber: number = 1;
        if (n.attribute("number")) {
          tupletnumber = parseInt(n.attribute("number").value, 10);
        }
        const noTupletNumbering: boolean = isNaN(tupletnumber);
        const showNumberNoneGiven: boolean = this.readShowNumberNoneGiven(n);

        const bracketAttr: Attr = n.attribute("bracket");
        if (bracketAttr && bracketAttr.value === "yes") {
          bracketed = true;
          bracketedXmlValue = true;
        } else if (bracketAttr && bracketAttr.value === "no") {
          bracketedXmlValue = false;
        }
        let ratioed: boolean = this.musicSheet.Rules.TupletsRatioed;
        const showNumberAttr: Attr = n.attribute("show-number");
        if (showNumberAttr && showNumberAttr.value === "both" && this.musicSheet.Rules.TupletsRatioedUseXMLValue) {
          ratioed = true;
        }
        if (type === "start") {
          let tupletLabelNumber: number = 0;
          let timeModNode: IXmlElement = node.element("time-modification");
          if (timeModNode) {
            timeModNode = timeModNode.element("actual-notes");
          }
          if (timeModNode) {
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
          if (!tuplet) {
            tuplet = this.tupletDict[tupletnumber] = new Tuplet(tupletLabelNumber, bracketed);
            tuplet.Ratioed = ratioed;
            tuplet.BracketedXmlValue = bracketedXmlValue;
            tuplet.ShowNumberNoneGivenInXml = showNumberNoneGiven;
            //Default to above
            tuplet.tupletLabelNumberPlacement = PlacementEnum.Above;
          }
          //If we ever encounter a placement attribute for this tuplet, should override.
          //Even previous placement attributes for the tuplet
          const placementAttr: Attr = n.attribute("placement");
          if (placementAttr) {
            if (placementAttr.value === "below") {
              tuplet.tupletLabelNumberPlacement = PlacementEnum.Below;
            } else {
              //Just in case
              tuplet.tupletLabelNumberPlacement = PlacementEnum.Above;
            }
            tuplet.PlacementFromXml = true;
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
          if (tuplet) {
            const placementAttr: Attr = n.attribute("placement");
            if (placementAttr) {
              if (placementAttr.value === "below") {
                tuplet.tupletLabelNumberPlacement = PlacementEnum.Below;
              } else {
                tuplet.tupletLabelNumberPlacement = PlacementEnum.Above;
              }
              tuplet.PlacementFromXml = true;
            }
            const subnotelist: Note[] = [];
            subnotelist.push(this.currentNote);
            tuplet.Notes.push(subnotelist);
            //If our placement hasn't been from XML, check all the notes in the tuplet
            //Search for the first non-rest and use it's stem direction
            if (!tuplet.PlacementFromXml) {
              let foundNonRest: boolean = false;
              for (const subList of tuplet.Notes) {
                for (const note of subList) {
                  if (!note.isRest()) {
                    if(note.StemDirectionXml === StemDirectionType.Down) {
                      tuplet.tupletLabelNumberPlacement = PlacementEnum.Below;
                    } else {
                      tuplet.tupletLabelNumberPlacement = PlacementEnum.Above;
                    }
                    foundNonRest = true;
                    break;
                  }
                }
                if (foundNonRest) {
                  break;
                }
              }
            }
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

  private readShowNumberNoneGiven(tupletNode: IXmlElement): boolean {
    const showNumber: Attr = tupletNode.attribute("show-number");
    if (showNumber?.value) {
      if (showNumber.value === "none") {
        return true;
      }
    }
    return false;
  }

  /**
   * This method handles the time-modification IXmlElement for the Tuplet case (tupletNotes not at begin/end of Tuplet).
   * @param noteNode
   */
  private handleTimeModificationNode(noteNode: IXmlElement): void {
    if (this.tupletDict[this.openTupletNumber]) {
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
      if (firstNote.NoteTuplet) {
        const tuplet: Tuplet = firstNote.NoteTuplet;
        const notes: Note[] = CollectionUtil.last(tuplet.Notes);
        notes.push(this.currentNote);
        this.currentNote.NoteTuplet = tuplet;
      }
    }
  }

  private addTie(tieNodeList: IXmlElement[], measureStartAbsoluteTimestamp: Fraction, maxTieNoteFraction: Fraction, tieType: TieTypes): void {
    if (tieNodeList) {
      if (tieNodeList.length === 1) {
        const tieNode: IXmlElement = tieNodeList[0];
        if (tieNode !== undefined && tieNode.attributes()) {
          const tieDirection: PlacementEnum = this.getTieDirection(tieNode);
          const tieNumberFromXml: number | undefined = this.getTieNumber(tieNode);

          const type: string = tieNode.attribute("type").value;
          try {
            if (type === "start") {
              const pendingStop: PendingTieStop | undefined = this.findPendingTieStopForStart(
                this.currentNote, tieNumberFromXml, tieType
              );
              if (pendingStop) {
                const resolvedTie: Tie = new Tie(this.currentNote, tieType);
                resolvedTie.AddNote(pendingStop.note);
                resolvedTie.TieNumber = tieNumberFromXml ?? pendingStop.tieNumber ?? this.getNextAvailableNumberForTie();
                resolvedTie.TieDirection = tieDirection;
                resolvedTie.TieDirectionFromXml = tieDirection === PlacementEnum.Above || tieDirection === PlacementEnum.Below;
                this.removePendingTieStop(pendingStop);
                return;
              }
              // Keep existing unnumbered ties open.
              // MusicXML can emit another start of the same pitch later in the note stream
              // (e.g. due to backup/voice ordering) before an earlier stop appears.
              // Removing the older tie here causes wrong tie pairings.
              if (tieNumberFromXml !== undefined) {
                const num: number = this.findCurrentNoteInTieDict(this.currentNote, tieNumberFromXml, tieType);
                if (num >= 0 && this.openTieDict[num]?.TieNumber === tieNumberFromXml) {
                  delete this.openTieDict[num];
                }
              }
              const newTieNumber: number = this.getNextAvailableNumberForTie();
              const tie: Tie = new Tie(this.currentNote, tieType);
              this.openTieDict[newTieNumber] = tie;
              tie.TieNumber = tieNumberFromXml ?? newTieNumber;
              tie.TieDirection = tieDirection;
              tie.TieDirectionFromXml = tieDirection === PlacementEnum.Above || tieDirection === PlacementEnum.Below;
            } else if (type === "stop") {
              const tieNumber: number = this.findCurrentNoteInTieDict(this.currentNote, tieNumberFromXml, tieType);
              const tie: Tie = this.openTieDict[tieNumber];
              if (tie) {
                tie.AddNote(this.currentNote);
                delete this.openTieDict[tieNumber];
              } else {
                this.getPendingTieStops().push({
                  note: this.currentNote,
                  tieNumber: tieNumberFromXml,
                  tieType: tieType
                });
              }
            }
          } catch (err) {
            const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/TieError", "Error while reading tie.");
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
          }

        }
      } else if (tieNodeList.length === 2) { // stop+start
        const stopNode: IXmlElement | undefined = tieNodeList.find(node => node.attribute("type")?.value === "stop");
        const tieNumberFromXml: number | undefined = this.getTieNumber(stopNode);
        const tieNumber: number = this.findCurrentNoteInTieDict(this.currentNote, tieNumberFromXml, tieType);
        if (tieNumber >= 0) {
          const tie: Tie = this.openTieDict[tieNumber];
          tie.AddNote(this.currentNote);
          for (const tieNode of tieNodeList) {
            const type: string = tieNode.attribute("type").value;
            if (type === "start") {
              const placement: PlacementEnum = this.getTieDirection(tieNode);
              tie.NoteIndexToTieDirection[tie.Notes.length - 1] = placement;
            }
          }
        }
      }
    }
  }

  private getTieDirection(tieNode: IXmlElement): PlacementEnum {
    let tieDirection: PlacementEnum = PlacementEnum.NotYetDefined;
    // read tie direction/placement from XML
    const placementAttr: IXmlAttribute = tieNode.attribute("placement");
    if (placementAttr) {
      if (placementAttr.value === "above") {
        tieDirection = PlacementEnum.Above;
      } else if (placementAttr.value === "below") {
        tieDirection = PlacementEnum.Below;
      }
    }
    // tie direction can also be given like this:
    const orientationAttr: IXmlAttribute = tieNode.attribute("orientation");
    if (orientationAttr) {
      if (orientationAttr.value === "over") {
        tieDirection = PlacementEnum.Above;
      } else if (orientationAttr.value === "under") {
        tieDirection = PlacementEnum.Below;
      }
    }
    return tieDirection;
  }

  /**
   * Read tie number from MusicXML, if present.
   */
  private getTieNumber(tieNode: IXmlElement | undefined): number | undefined {
    if (!tieNode) {
      return undefined;
    }
    const numberAttr: IXmlAttribute = tieNode.attribute("number");
    if (!numberAttr) {
      return undefined;
    }
    const parsed: number = Number.parseInt(numberAttr.value, 10);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    return parsed;
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
  private findCurrentNoteInTieDict(candidateNote: Note, requestedTieNumber?: number, tieType?: TieTypes): number {
    const openTieDict: { [_: number]: Tie } = this.openTieDict;
    const candidateVoiceId: number | undefined = candidateNote?.ParentVoiceEntry?.ParentVoice?.VoiceId;
    const candidateOrderValue: number | undefined = this.getSafeNoteOrderValue(candidateNote);
    const candidateStaffId: number | undefined = candidateNote?.ParentStaffEntry?.ParentStaff?.Id;
    type MatchedTieCandidate = {
      key: number;
      exactTieNumber: boolean;
      sameVoice: boolean;
      sameStaff: boolean;
      sameAccidental: boolean;
      delta: number | undefined;
      isPastOrEqual: boolean;
    };
    const matchedCandidates: MatchedTieCandidate[] = [];
    for (const key in openTieDict) {
      if (openTieDict.hasOwnProperty(key)) {
        const tie: Tie = openTieDict[key];
        const referenceNote: Note = tie.Notes[tie.Notes.length - 1] ?? tie.StartNote;
        if (tieType !== undefined && tie.Type !== tieType) {
          continue;
        }
        const tieTabNote: TabNote = referenceNote as TabNote;
        const tieCandidateNote: TabNote = candidateNote as TabNote;
        const tieReferencePitch: Pitch = referenceNote?.Pitch;
        const matchByPitch: boolean = tieReferencePitch?.FundamentalNote === candidateNote.Pitch?.FundamentalNote
          && tieReferencePitch?.Octave === candidateNote.Pitch?.Octave;
        const matchByTabString: boolean = tieTabNote.StringNumberTab !== undefined
          && tieCandidateNote.StringNumberTab !== undefined
          && tieTabNote.StringNumberTab === tieCandidateNote.StringNumberTab;
        if (!matchByPitch && !matchByTabString) {
          continue;
        }
        const tieVoiceId: number | undefined = referenceNote?.ParentVoiceEntry?.ParentVoice?.VoiceId;
        const tieStaffId: number | undefined = referenceNote?.ParentStaffEntry?.ParentStaff?.Id;
        const sameVoice: boolean = candidateVoiceId !== undefined && tieVoiceId === candidateVoiceId;
        const sameStaff: boolean = candidateStaffId !== undefined && tieStaffId === candidateStaffId;
        const sameAccidental: boolean = tieReferencePitch?.Accidental === candidateNote.Pitch?.Accidental;
        const tieStartOrderValue: number | undefined = this.getSafeNoteOrderValue(referenceNote);
        let delta: number | undefined = undefined;
        let isPastOrEqual: boolean = false;
        if (Number.isFinite(candidateOrderValue) && Number.isFinite(tieStartOrderValue)) {
          delta = candidateOrderValue - tieStartOrderValue;
          isPastOrEqual = delta >= -Fraction.FloatInaccuracyTolerance;
        }
        matchedCandidates.push({
          key: parseInt(key, 10),
          exactTieNumber: requestedTieNumber !== undefined && tie.TieNumber === requestedTieNumber,
          sameVoice: sameVoice,
          sameStaff: sameStaff,
          sameAccidental: sameAccidental,
          delta: delta,
          isPastOrEqual: isPastOrEqual
        });
      }
    }
    if (matchedCandidates.length === 0) {
      return -1;
    }
    matchedCandidates.sort((a: MatchedTieCandidate, b: MatchedTieCandidate): number => {
      if (a.exactTieNumber !== b.exactTieNumber) {
        return a.exactTieNumber ? -1 : 1;
      }
      const aHasDelta: boolean = Number.isFinite(a.delta);
      const bHasDelta: boolean = Number.isFinite(b.delta);
      if (aHasDelta !== bHasDelta) {
        return aHasDelta ? -1 : 1;
      }
      if (aHasDelta && bHasDelta) {
        if (a.isPastOrEqual !== b.isPastOrEqual) {
          return a.isPastOrEqual ? -1 : 1;
        }
      }
      if (a.sameVoice !== b.sameVoice) {
        return a.sameVoice ? -1 : 1;
      }
      if (a.sameStaff !== b.sameStaff) {
        return a.sameStaff ? -1 : 1;
      }
      if (a.sameAccidental !== b.sameAccidental) {
        return a.sameAccidental ? -1 : 1;
      }
      // Prefer the oldest opened tie as final fallback (stable FIFO matching).
      return a.key - b.key;
    });
    return matchedCandidates[0].key;
  }

  private getSafeNoteOrderValue(note: Note | undefined): number | undefined {
    const absoluteTimestamp: number | undefined = this.getSafeNoteAbsoluteTimestampRealValue(note);
    if (Number.isFinite(absoluteTimestamp)) {
      return absoluteTimestamp;
    }
    const measureNumber: number | undefined = note?.SourceMeasure?.MeasureNumber;
    const voiceTimestamp: Fraction | undefined = note?.ParentVoiceEntry?.Timestamp;
    if (!Number.isFinite(measureNumber) || !voiceTimestamp) {
      return undefined;
    }
    return measureNumber + voiceTimestamp.RealValue;
  }

  private getSafeNoteAbsoluteTimestampRealValue(note: Note | undefined): number | undefined {
    const voiceTimestamp: Fraction | undefined = note?.ParentVoiceEntry?.Timestamp;
    const measureTimestamp: Fraction | undefined = note?.SourceMeasure?.AbsoluteTimestamp;
    if (!voiceTimestamp || !measureTimestamp) {
      return undefined;
    }
    return Fraction.plus(voiceTimestamp, measureTimestamp).RealValue;
  }

  private getPendingTieStops(): PendingTieStop[] {
    let pendingStops: PendingTieStop[] = VoiceGenerator.pendingTieStopsByStaff.get(this.staff);
    if (!pendingStops) {
      pendingStops = [];
      VoiceGenerator.pendingTieStopsByStaff.set(this.staff, pendingStops);
    }
    return pendingStops;
  }

  private removePendingTieStop(stopToRemove: PendingTieStop): void {
    const pendingStops: PendingTieStop[] = this.getPendingTieStops();
    const index: number = pendingStops.indexOf(stopToRemove);
    if (index >= 0) {
      pendingStops.splice(index, 1);
    }
  }

  private findPendingTieStopForStart(candidateStartNote: Note, requestedTieNumber?: number, tieType?: TieTypes): PendingTieStop | undefined {
    const pendingStops: PendingTieStop[] = this.getPendingTieStops();
    const candidateVoiceId: number | undefined = candidateStartNote?.ParentVoiceEntry?.ParentVoice?.VoiceId;
    const candidateStaffId: number | undefined = candidateStartNote?.ParentStaffEntry?.ParentStaff?.Id;
    const candidateOrderValue: number | undefined = this.getSafeNoteOrderValue(candidateStartNote);
    type MatchingPendingStop = {
      pendingStop: PendingTieStop;
      exactTieNumber: boolean;
      sameVoice: boolean;
      sameStaff: boolean;
      sameAccidental: boolean;
      delta: number | undefined;
      isFutureOrEqual: boolean;
    };
    const matches: MatchingPendingStop[] = [];
    for (const pendingStop of pendingStops) {
      if (tieType !== undefined && pendingStop.tieType !== tieType) {
        continue;
      }
      const pendingPitch: Pitch = pendingStop.note?.Pitch;
      const matchByPitch: boolean = pendingPitch?.FundamentalNote === candidateStartNote.Pitch?.FundamentalNote
        && pendingPitch?.Octave === candidateStartNote.Pitch?.Octave;
      const pendingTabNote: TabNote = pendingStop.note as TabNote;
      const candidateTabNote: TabNote = candidateStartNote as TabNote;
      const matchByTabString: boolean = pendingTabNote.StringNumberTab !== undefined
        && candidateTabNote.StringNumberTab !== undefined
        && pendingTabNote.StringNumberTab === candidateTabNote.StringNumberTab;
      if (!matchByPitch && !matchByTabString) {
        continue;
      }
      const pendingVoiceId: number | undefined = pendingStop.note?.ParentVoiceEntry?.ParentVoice?.VoiceId;
      const pendingStaffId: number | undefined = pendingStop.note?.ParentStaffEntry?.ParentStaff?.Id;
      const sameVoice: boolean = candidateVoiceId !== undefined && pendingVoiceId === candidateVoiceId;
      const sameStaff: boolean = candidateStaffId !== undefined && pendingStaffId === candidateStaffId;
      const sameAccidental: boolean = pendingPitch?.Accidental === candidateStartNote.Pitch?.Accidental;
      const pendingOrderValue: number | undefined = this.getSafeNoteOrderValue(pendingStop.note);
      let delta: number | undefined = undefined;
      let isFutureOrEqual: boolean = false;
      if (Number.isFinite(candidateOrderValue) && Number.isFinite(pendingOrderValue)) {
        delta = pendingOrderValue - candidateOrderValue;
        isFutureOrEqual = delta >= -Fraction.FloatInaccuracyTolerance;
        if (!isFutureOrEqual) {
          // A pending stop older than the start note cannot belong to this tie.
          continue;
        }
      }
      matches.push({
        pendingStop: pendingStop,
        exactTieNumber: requestedTieNumber !== undefined && pendingStop.tieNumber === requestedTieNumber,
        sameVoice: sameVoice,
        sameStaff: sameStaff,
        sameAccidental: sameAccidental,
        delta: delta,
        isFutureOrEqual: isFutureOrEqual
      });
    }
    if (matches.length === 0) {
      return undefined;
    }
    matches.sort((a: MatchingPendingStop, b: MatchingPendingStop): number => {
      if (a.exactTieNumber !== b.exactTieNumber) {
        return a.exactTieNumber ? -1 : 1;
      }
      const aHasDelta: boolean = Number.isFinite(a.delta);
      const bHasDelta: boolean = Number.isFinite(b.delta);
      if (aHasDelta !== bHasDelta) {
        return aHasDelta ? -1 : 1;
      }
      if (aHasDelta && bHasDelta) {
        if (a.isFutureOrEqual !== b.isFutureOrEqual) {
          return a.isFutureOrEqual ? -1 : 1;
        }
      }
      if (a.sameVoice !== b.sameVoice) {
        return a.sameVoice ? -1 : 1;
      }
      if (a.sameStaff !== b.sameStaff) {
        return a.sameStaff ? -1 : 1;
      }
      if (a.sameAccidental !== b.sameAccidental) {
        return a.sameAccidental ? -1 : 1;
      }
      if (aHasDelta && bHasDelta) {
        const aDist: number = Math.abs(a.delta);
        const bDist: number = Math.abs(b.delta);
        if (aDist !== bDist) {
          return aDist - bDist;
        }
      }
      return 0;
    });
    return matches[0].pendingStop;
  }

  /**
   * Calculate the normal duration of a [[Tuplet]] note.
   * @param xmlNode
   * @returns {any}
   */
  private getTupletNoteDurationFromType(xmlNode: IXmlElement): Fraction {
    if (xmlNode.element("type")) {
      const typeNode: IXmlElement = xmlNode.element("type");
      if (typeNode) {
        const type: string = typeNode.value;
        try {
          return NoteTypeHandler.getNoteDurationFromType(type);
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

interface PendingTieStop {
  note: Note;
  tieNumber?: number;
  tieType: TieTypes;
}
