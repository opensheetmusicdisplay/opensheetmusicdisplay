import {MusicSheetCalculator} from "../MusicSheetCalculator";
import {VexFlowGraphicalSymbolFactory} from "./VexFlowGraphicalSymbolFactory";
import {GraphicalMeasure} from "../GraphicalMeasure";
import {StaffLine} from "../StaffLine";
import {VoiceEntry} from "../../VoiceData/VoiceEntry";
import {GraphicalNote} from "../GraphicalNote";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {GraphicalTie} from "../GraphicalTie";
import {Tie} from "../../VoiceData/Tie";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {MultiExpression} from "../../VoiceData/Expressions/MultiExpression";
import {RepetitionInstruction} from "../../VoiceData/Instructions/RepetitionInstruction";
import {Beam} from "../../VoiceData/Beam";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {OctaveEnum} from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {LyricWord} from "../../VoiceData/Lyrics/LyricsWord";
import {OrnamentContainer} from "../../VoiceData/OrnamentContainer";
import {ArticulationEnum} from "../../VoiceData/VoiceEntry";
import {Tuplet} from "../../VoiceData/Tuplet";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {VexFlowTextMeasurer} from "./VexFlowTextMeasurer";
import Vex = require("vexflow");
import * as log from "loglevel";
import {unitInPixels} from "./VexFlowMusicSheetDrawer";
import {VexFlowGraphicalNote} from "./VexFlowGraphicalNote";
import {TechnicalInstruction} from "../../VoiceData/Instructions/TechnicalInstruction";
import {GraphicalLyricEntry} from "../GraphicalLyricEntry";
import {GraphicalLabel} from "../GraphicalLabel";
import {LyricsEntry} from "../../VoiceData/Lyrics/LyricsEntry";
import {GraphicalLyricWord} from "../GraphicalLyricWord";
import {VexFlowStaffEntry} from "./VexFlowStaffEntry";
import {BoundingBox} from "../BoundingBox";
import { Slur } from "../../VoiceData/Expressions/ContinuousExpressions/Slur";
/* VexFlow Version - for later use
// import { VexFlowSlur } from "./VexFlowSlur";
// import { VexFlowStaffLine } from "./VexFlowStaffLine";
// import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
*/
import { EngravingRules } from "../EngravingRules";
import { GraphicalSlur } from "../GraphicalSlur";

export class VexFlowMusicSheetCalculator extends MusicSheetCalculator {

  constructor() {
    super();
    MusicSheetCalculator.symbolFactory = new VexFlowGraphicalSymbolFactory();
    MusicSheetCalculator.TextMeasurer = new VexFlowTextMeasurer();
  }

  protected clearRecreatedObjects(): void {
    super.clearRecreatedObjects();
    for (const graphicalMeasures of this.graphicalMusicSheet.MeasureList) {
      for (const graphicalMeasure of graphicalMeasures) {
        (<VexFlowMeasure>graphicalMeasure).clean();
      }
    }
  }

    protected formatMeasures(): void {
      for (const verticalMeasureList of this.graphicalMusicSheet.MeasureList) {
        const firstMeasure: VexFlowMeasure = verticalMeasureList[0] as VexFlowMeasure;
        // first measure has formatting method as lambda function object, but formats all measures. TODO this could be refactored
        firstMeasure.format();
        for (const staffEntry of firstMeasure.staffEntries) {
                    (<VexFlowStaffEntry>staffEntry).calculateXPosition();
                }
            }
        }

  //protected clearSystemsAndMeasures(): void {
  //    for (let measure of measures) {
  //
  //    }
  //}

  /**
   * Calculates the x layout of the staff entries within the staff measures belonging to one source measure.
   * All staff entries are x-aligned throughout all vertically aligned staff measures.
   * This method is called within calculateXLayout.
   * The staff entries are aligned with minimum needed x distances.
   * The MinimumStaffEntriesWidth of every measure will be set - needed for system building.
   * Here: prepares the VexFlow formatter for later formatting
   * @param measures
   * @returns the minimum required x width of the source measure (=list of staff measures)
   */
  protected calculateMeasureXLayout(measures: GraphicalMeasure[]): number {
    // Finalize beams
    /*for (let measure of measures) {
     (measure as VexFlowMeasure).finalizeBeams();
     (measure as VexFlowMeasure).finalizeTuplets();
     }*/
    // Format the voices
    const allVoices: Vex.Flow.Voice[] = [];
    const formatter: Vex.Flow.Formatter = new Vex.Flow.Formatter({align_rests: true,
    });

    for (const measure of measures) {
        const mvoices:  { [voiceID: number]: Vex.Flow.Voice; } = (measure as VexFlowMeasure).vfVoices;
        const voices: Vex.Flow.Voice[] = [];
        for (const voiceID in mvoices) {
            if (mvoices.hasOwnProperty(voiceID)) {
                voices.push(mvoices[voiceID]);
                allVoices.push(mvoices[voiceID]);
            }
        }
        if (voices.length === 0) {
            log.warn("Found a measure with no voices... Continuing anyway.", mvoices);
            continue;
        }
        // all voices that belong to one stave are collectively added to create a common context in VexFlow.
        formatter.joinVoices(voices);
    }

    let minStaffEntriesWidth: number = 200;
    if (allVoices.length > 0) {
        // FIXME: The following ``+ 5.0'' is temporary: it was added as a workaround for
        // FIXME: a more relaxed formatting of voices
        minStaffEntriesWidth = formatter.preCalculateMinTotalWidth(allVoices) / unitInPixels + 5.0;
        // firstMeasure.formatVoices = (w: number) => {
        //     formatter.format(allVoices, w);
        // };
        MusicSheetCalculator.setMeasuresMinStaffEntriesWidth(measures, minStaffEntriesWidth);
        for (const measure of measures) {
          measure.PositionAndShape.BorderRight = minStaffEntriesWidth;
          if (measure === measures[0]) {
            const vexflowMeasure: VexFlowMeasure = (measure as VexFlowMeasure);
            // prepare format function for voices, will be called later for formatting measure again
            vexflowMeasure.formatVoices = (w: number) => {
                    formatter.format(allVoices, w);
                };
            // format now for minimum width
            vexflowMeasure.formatVoices(minStaffEntriesWidth * unitInPixels);
          } else {
            (measure as VexFlowMeasure).formatVoices = undefined;
            }
        }
    }

    for (const graphicalMeasure of measures) {
      for (const staffEntry of graphicalMeasure.staffEntries) {
        // here the measure modifiers are not yet set, therefore the begin instruction width will be empty
        (<VexFlowStaffEntry>staffEntry).calculateXPosition();
  }
    }
    // update measure width from lyrics formatting
    minStaffEntriesWidth = this.calculateMeasureWidthFromLyrics(measures, minStaffEntriesWidth);
    return minStaffEntriesWidth;
  }

  public calculateMeasureWidthFromLyrics(measuresVertical: GraphicalMeasure[], oldMinimumStaffEntriesWidth: number): number {
    let lastLyricsLabelHalfWidth: number = 0; // TODO lyrics entries may not be ordered correctly, create a dictionary
    let lastStaffEntryXPosition: number = 0;
    let elongationFactorMeasureWidth: number = 1;
    for (const measure of measuresVertical) {
      for (let i: number = 0; i < measure.staffEntries.length; i++) {
        const staffEntry: GraphicalStaffEntry = measure.staffEntries[i];
        if (staffEntry.LyricsEntries.length === 0) {
          continue;
        }
        // TODO choose biggest lyrics entry or handle each separately and take maximum elongation
        const lyricsEntry: GraphicalLyricEntry = staffEntry.LyricsEntries[0];
        let minLyricsSpacing: number = EngravingRules.Rules.HorizontalBetweenLyricsDistance;

        if (lyricsEntry.ParentLyricWord) {
          if (lyricsEntry.GetLyricsEntry.SyllableIndex > 0) {
            // give a little more spacing so that the dash between syllables fits
            minLyricsSpacing = EngravingRules.Rules.BetweenSyllabelMinimumDistance;
          }
        }

        const lyricsBbox: BoundingBox = lyricsEntry.GraphicalLabel.PositionAndShape;
        const lyricsLabelHalfWidth: number = lyricsBbox.Size.width / 2;
        const staffEntryXPosition: number = (staffEntry as VexFlowStaffEntry).PositionAndShape.RelativePosition.x;

        if (i === 0) {
          lastStaffEntryXPosition = staffEntryXPosition;
          lastLyricsLabelHalfWidth = lyricsLabelHalfWidth;
          // ignore first lyrics of measure
          // TODO spacing the first lyrics compared to the last measure's last lyrics entry
          // will require more sophisticated lastLyrics variable setting because of vertical order
          continue;
        }

        const spaceNeededByLyrics: number =
          lastLyricsLabelHalfWidth + lyricsLabelHalfWidth + minLyricsSpacing;

        const staffEntrySpacing: number = staffEntryXPosition - lastStaffEntryXPosition;
        // get factor of how much we need to stretch the measure to space the current lyric with the last one
        const elongationFactorMeasureWidthForCurrentLabels: number = spaceNeededByLyrics / staffEntrySpacing;
        elongationFactorMeasureWidth = Math.max(elongationFactorMeasureWidth, elongationFactorMeasureWidthForCurrentLabels);

        // set up last measure information for next measure
        lastStaffEntryXPosition = staffEntryXPosition;
        lastLyricsLabelHalfWidth = lyricsLabelHalfWidth;
      }
    }
    return oldMinimumStaffEntriesWidth * elongationFactorMeasureWidth;
  }

  protected createGraphicalTie(tie: Tie, startGse: GraphicalStaffEntry, endGse: GraphicalStaffEntry,
                               startNote: GraphicalNote, endNote: GraphicalNote): GraphicalTie {
    return new GraphicalTie(tie, startNote, endNote);
  }


  protected updateStaffLineBorders(staffLine: StaffLine): void {
      staffLine.SkyBottomLineCalculator.updateStaffLineBorders();
  }

  protected graphicalMeasureCreatedCalculations(measure: GraphicalMeasure): void {
    (measure as VexFlowMeasure).graphicalMeasureCreatedCalculations();
  }

  /**
   * Can be used to calculate articulations, stem directions, helper(ledger) lines, and overlapping note x-displacement.
   * Is Excecuted per voice entry of a staff entry.
   * After that layoutStaffEntry is called.
   * @param voiceEntry
   * @param graphicalNotes
   * @param graphicalStaffEntry
   * @param hasPitchedNote
   */
  protected layoutVoiceEntry(voiceEntry: VoiceEntry, graphicalNotes: GraphicalNote[], graphicalStaffEntry: GraphicalStaffEntry,
                             hasPitchedNote: boolean): void {
    return;
  }

  /**
   * Do all layout calculations that have to be done per staff entry, like dots, ornaments, arpeggios....
   * This method is called after the voice entries are handled by layoutVoiceEntry().
   * @param graphicalStaffEntry
   */
  protected layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
    (graphicalStaffEntry.parentMeasure as VexFlowMeasure).layoutStaffEntry(graphicalStaffEntry);
  }

  /**
   * calculates the y positions of the staff lines within a system and
   * furthermore the y positions of the systems themselves.
   */
  protected calculateSystemYLayout(): void {
    for (const graphicalMusicPage of this.graphicalMusicSheet.MusicPages) {
            for (const musicSystem of graphicalMusicPage.MusicSystems) {
                this.optimizeDistanceBetweenStaffLines(musicSystem);
          }

          // set y positions of systems using the previous system and a fixed distance.
            this.calculateMusicSystemsRelativePositions(graphicalMusicPage);
        }
      }

  /**
   * Is called at the begin of the method for creating the vertically aligned staff measures belonging to one source measure.
   */
  protected initGraphicalMeasuresCreation(): void {
    return;
  }

  /**
   * add here all given articulations to the VexFlowGraphicalStaffEntry and prepare them for rendering.
   * @param articulations
   * @param voiceEntry
   * @param graphicalStaffEntry
   */
  protected layoutArticulationMarks(articulations: ArticulationEnum[], voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
    // uncomment this when implementing:
    // let vfse: VexFlowStaffEntry = (graphicalStaffEntry as VexFlowStaffEntry);

    return;
  }

    /**
     * Calculate the shape (Bezier curve) for this tie.
     * @param tie
     * @param tieIsAtSystemBreak
     */
  protected layoutGraphicalTie(tie: GraphicalTie, tieIsAtSystemBreak: boolean): void {
    const startNote: VexFlowGraphicalNote = (tie.StartNote as VexFlowGraphicalNote);
    const endNote: VexFlowGraphicalNote = (tie.EndNote as VexFlowGraphicalNote);

    let vfStartNote: Vex.Flow.StaveNote = undefined;
    let startNoteIndexInTie: number = 0;
    if (startNote !== undefined) {
      vfStartNote = startNote.vfnote[0];
      startNoteIndexInTie = startNote.vfnote[1];
    }

    let vfEndNote: Vex.Flow.StaveNote = undefined;
    let endNoteIndexInTie: number = 0;
    if (endNote !== undefined) {
      vfEndNote = endNote.vfnote[0];
      endNoteIndexInTie = endNote.vfnote[1];
    }

    if (tieIsAtSystemBreak) {
      // split tie into two ties:
      const vfTie1: Vex.Flow.StaveTie = new Vex.Flow.StaveTie({
        first_indices: [startNoteIndexInTie],
        first_note: vfStartNote
      });
      const measure1: VexFlowMeasure = (startNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
      measure1.vfTies.push(vfTie1);

      const vfTie2: Vex.Flow.StaveTie = new Vex.Flow.StaveTie({
        last_indices: [endNoteIndexInTie],
        last_note: vfEndNote
      });
      const measure2: VexFlowMeasure = (endNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
      measure2.vfTies.push(vfTie2);
    } else {
      // normal case
      const vfTie: Vex.Flow.StaveTie = new Vex.Flow.StaveTie({
        first_indices: [startNoteIndexInTie],
        first_note: vfStartNote,
        last_indices: [endNoteIndexInTie],
        last_note: vfEndNote
      });
      const measure: VexFlowMeasure = (endNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
      measure.vfTies.push(vfTie);
    }
  }

    /**
     * Calculate a single OctaveShift for a [[MultiExpression]].
     * @param sourceMeasure
     * @param multiExpression
     * @param measureIndex
     * @param staffIndex
     */
  protected calculateSingleOctaveShift(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
    return;
  }

    /**
     * Calculate all the textual and symbolic [[RepetitionInstruction]]s (e.g. dal segno) for a single [[SourceMeasure]].
     * @param repetitionInstruction
     * @param measureIndex
     */
  protected calculateWordRepetitionInstruction(repetitionInstruction: RepetitionInstruction, measureIndex: number): void {
      // find first visible StaffLine
      let uppermostMeasure: VexFlowMeasure = undefined;
      const measures: VexFlowMeasure[]  = <VexFlowMeasure[]>this.graphicalMusicSheet.MeasureList[measureIndex];
      for (let idx: number = 0, len: number = measures.length; idx < len; ++idx) {
        const graphicalMeasure: VexFlowMeasure = measures[idx];
        if (graphicalMeasure.ParentStaffLine !== undefined && graphicalMeasure.ParentStaff.ParentInstrument.Visible) {
            uppermostMeasure = <VexFlowMeasure>graphicalMeasure;
            break;
        }
      }
      // ToDo: feature/Repetitions
      // now create corresponding graphical symbol or Text in VexFlow:
      // use top measure and staffline for positioning.
      if (uppermostMeasure !== undefined) {
        uppermostMeasure.addWordRepetition(repetitionInstruction);
      }
    }

  protected calculateMoodAndUnknownExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
    return;
  }

    /**
     * Check if the tied graphical note belongs to any beams or tuplets and react accordingly.
     * @param tiedGraphicalNote
     * @param beams
     * @param activeClef
     * @param octaveShiftValue
     * @param graphicalStaffEntry
     * @param duration
     * @param openTie
     * @param isLastTieNote
     */
  protected handleTiedGraphicalNote(tiedGraphicalNote: GraphicalNote, beams: Beam[], activeClef: ClefInstruction,
                                    octaveShiftValue: OctaveEnum, graphicalStaffEntry: GraphicalStaffEntry, duration: Fraction,
                                    openTie: Tie, isLastTieNote: boolean): void {
    return;
  }

  /**
   * Is called if a note is part of a beam.
   * @param graphicalNote
   * @param beam
   * @param openBeams a list of all currently open beams
   */
  protected handleBeam(graphicalNote: GraphicalNote, beam: Beam, openBeams: Beam[]): void {
    (graphicalNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure).handleBeam(graphicalNote, beam);
  }

  protected handleVoiceEntryLyrics(voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry, lyricWords: LyricWord[]): void {
      voiceEntry.LyricsEntries.forEach((key: number, lyricsEntry: LyricsEntry) => {
          const graphicalLyricEntry: GraphicalLyricEntry = new GraphicalLyricEntry(lyricsEntry,
                                                                                   graphicalStaffEntry,
                                                                                   this.rules.LyricsHeight,
                                                                                   this.rules.StaffHeight);

          graphicalStaffEntry.LyricsEntries.push(graphicalLyricEntry);

          // create corresponding GraphicalLabel
          const graphicalLabel: GraphicalLabel = graphicalLyricEntry.GraphicalLabel;
          graphicalLabel.setLabelPositionAndShapeBorders();

          if (lyricsEntry.Word !== undefined) {
              const lyricsEntryIndex: number = lyricsEntry.Word.Syllables.indexOf(lyricsEntry);
              let index: number = lyricWords.indexOf(lyricsEntry.Word);
              if (index === -1) {
                  lyricWords.push(lyricsEntry.Word);
                  index = lyricWords.indexOf(lyricsEntry.Word);
              }

              if (this.graphicalLyricWords.length === 0 || index > this.graphicalLyricWords.length - 1) {
                  const graphicalLyricWord: GraphicalLyricWord = new GraphicalLyricWord(lyricsEntry.Word);

                  graphicalLyricEntry.ParentLyricWord = graphicalLyricWord;
                  graphicalLyricWord.GraphicalLyricsEntries[lyricsEntryIndex] = graphicalLyricEntry;
                  this.graphicalLyricWords.push(graphicalLyricWord);
              } else {
                  const graphicalLyricWord: GraphicalLyricWord = this.graphicalLyricWords[index];

                  graphicalLyricEntry.ParentLyricWord = graphicalLyricWord;
                  graphicalLyricWord.GraphicalLyricsEntries[lyricsEntryIndex] = graphicalLyricEntry;

                  if (graphicalLyricWord.isFilled()) {
                      lyricWords.splice(index, 1);
                      this.graphicalLyricWords.splice(this.graphicalLyricWords.indexOf(graphicalLyricWord), 1);
                  }
              }
          }
      });
  }

  protected handleVoiceEntryOrnaments(ornamentContainer: OrnamentContainer, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
    return;
  }

  /**
   * Add articulations to the given vexflow staff entry.
   * @param articulations
   * @param voiceEntry
   * @param graphicalStaffEntry
   */
  protected handleVoiceEntryArticulations(articulations: ArticulationEnum[],
                                          voiceEntry: VoiceEntry, staffEntry: GraphicalStaffEntry): void {
    // uncomment this when implementing:
    // let vfse: VexFlowStaffEntry = (graphicalStaffEntry as VexFlowStaffEntry);

    return;
  }

  /**
   * Add technical instructions to the given vexflow staff entry.
   * @param technicalInstructions
   * @param voiceEntry
   * @param staffEntry
   */
  protected handleVoiceEntryTechnicalInstructions(technicalInstructions: TechnicalInstruction[],
                                                  voiceEntry: VoiceEntry, staffEntry: GraphicalStaffEntry): void {
    // uncomment this when implementing:
    // let vfse: VexFlowStaffEntry = (graphicalStaffEntry as VexFlowStaffEntry);
    return;
  }

  /**
   * Is called if a note is part of a tuplet.
   * @param graphicalNote
   * @param tuplet
   * @param openTuplets a list of all currently open tuplets
   */
  protected handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet, openTuplets: Tuplet[]): void {
    (graphicalNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure).handleTuplet(graphicalNote, tuplet);
  }

  /**
   * Find the Index of the item of the array of all VexFlow Slurs that holds a specified slur
   * @param gSlurs
   * @param slur
   */
  public findIndexGraphicalSlurFromSlur(gSlurs: GraphicalSlur[], slur: Slur): number {
    for (let slurIndex: number = 0; slurIndex < gSlurs.length; slurIndex++) {
        if (gSlurs[slurIndex].slur === slur) {
            return slurIndex;
        }
    }
  }
  /* VexFlow Version - for later use
  public findIndexVFSlurFromSlur(vfSlurs: VexFlowSlur[], slur: Slur): number {
        for (let slurIndex: number = 0; slurIndex < vfSlurs.length; slurIndex++) {
            if (vfSlurs[slurIndex].vfSlur === slur) {
                return slurIndex;
            }
        }
  }
  */

  // Generate all Graphical Slurs and attach them to the staffline
  protected calculateSlurs(): void {
    const openSlursDict: { [staffId: number]: GraphicalSlur[]; } = {};
    for (const graphicalMeasure of this.graphicalMusicSheet.MeasureList[0]) { //let i: number = 0; i < this.graphicalMusicSheet.MeasureList[0].length; i++) {
      openSlursDict[graphicalMeasure.ParentStaff.idInMusicSheet] = [];
    }

    /* VexFlow Version - for later use
    // Generate an empty dictonary to index an array of VexFlowSlur classes
    const vfOpenSlursDict: { [staffId: number]: VexFlowSlur[]; } = {}; //VexFlowSlur[]; } = {};
    // use first SourceMeasure to get all graphical measures to know how many staves are currently visible in this musicsheet
    // foreach stave: create an empty array. It can later hold open slurs.
    // Measure how many staves are visible and reserve space for them.
    for (const graphicalMeasure of this.graphicalMusicSheet.MeasureList[0]) { //let i: number = 0; i < this.graphicalMusicSheet.MeasureList[0].length; i++) {
        vfOpenSlursDict[graphicalMeasure.ParentStaff.idInMusicSheet] = [];
    }
    */

    for (const gmPage of this.graphicalMusicSheet.MusicPages) {
        for (const musicSystem  of gmPage.MusicSystems) {
            for (const staffLine of musicSystem.StaffLines) {
                // if a graphical slur reaches out of the last musicsystem, we have to create another graphical slur reaching into this musicsystem
                // (one slur needs 2 graphical slurs)
                const openGraphicalSlurs: GraphicalSlur[] = openSlursDict[staffLine.ParentStaff.idInMusicSheet];
                for (let slurIndex: number = 0; slurIndex < openGraphicalSlurs.length; slurIndex++) {
                  const oldGSlur: GraphicalSlur = openGraphicalSlurs[slurIndex];
                  const newGSlur: GraphicalSlur = new GraphicalSlur(oldGSlur.slur); //Graphicalslur.createFromSlur(oldSlur);
                  newGSlur.slur.StartNote = undefined;
                  staffLine.addSlurToStaffline(newGSlur); // every VFSlur is added to the array in the VFStaffline!
                  openGraphicalSlurs[slurIndex] = newGSlur;
                }

                /* VexFlow Version - for later use
                const vfOpenSlurs: VexFlowSlur[] = vfOpenSlursDict[staffLine.ParentStaff.idInMusicSheet];
                const vfStaffLine: VexFlowStaffLine = <VexFlowStaffLine> staffLine;
                for (let slurIndex: number = 0; slurIndex < vfOpenSlurs.length; slurIndex++) {
                    const oldVFSlur: VexFlowSlur = vfOpenSlurs[slurIndex];
                    const newVFSlur: VexFlowSlur = VexFlowSlur.createFromVexflowSlur(oldVFSlur);
                    newVFSlur.vfStartNote = undefined;
                    vfStaffLine.addVFSlurToVFStaffline(newVFSlur); // every VFSlur is added to the array in the VFStaffline!
                    vfOpenSlurs[slurIndex] = newVFSlur;
                }
                */

                // add reference of slur array to the VexFlowStaffline class
                for (const graphicalMeasure of staffLine.Measures) {
                    for (const graphicalStaffEntry of graphicalMeasure.staffEntries) {
                        // for (var idx5: number = 0, len5 = graphicalStaffEntry.GraceStaffEntriesBefore.Count; idx5 < len5; ++idx5) {
                        //     var graceStaffEntry: GraphicalStaffEntry = graphicalStaffEntry.GraceStaffEntriesBefore[idx5];
                        //     if (graceStaffEntry.Notes[0][0].SourceNote.NoteSlurs.Count > 0) {
                        //         var graceNote: Note = graceStaffEntry.Notes[0][0].SourceNote;
                        //         graceStaffEntry.RelInMeasureTimestamp = Fraction.createFromFraction(graphicalStaffEntry.RelInMeasureTimestamp);
                        //         for (var idx6: number = 0, len6 = graceNote.NoteSlurs.Count; idx6 < len6; ++idx6) {
                        //             var graceNoteSlur: Slur = graceNote.NoteSlurs[idx6];
                        //             if (graceNoteSlur.StartNote == graceNote) {
                        //                 var vfSlur: VexFlowSlur = new VexFlowSlur(graceNoteSlur);
                        //                 vfSlur.GraceStart = true;
                        //                 staffLine.GraphicalSlurs.Add(vfSlur);
                        //                 openGraphicalSlurs[i].Add(vfSlur);
                        //                 for (var j: number = graphicalStaffEntry.GraceStaffEntriesBefore.IndexOf(graceStaffEntry);
                        //                     j < graphicalStaffEntry.GraceStaffEntriesBefore.Count; j++)
                        //                        vfSlur.StaffEntries.Add(<PsStaffEntry>graphicalStaffEntry.GraceStaffEntriesBefore[j]);
                        //             }
                        //             if (graceNote == graceNoteSlur.EndNote) {
                        //                 var vfSlur: VexFlowSlur = findGraphicalSlurFromSlur(openGraphicalSlurs[i], graceNoteSlur);
                        //                 if (vfSlur != null) {
                        //                     vfSlur.GraceEnd = true;
                        //                     openGraphicalSlurs[i].Remove(vfSlur);
                        //                     for (var j: number = 0; j <= graphicalStaffEntry.GraceStaffEntriesBefore.IndexOf(graceStaffEntry); j++)
                        //                         vfSlur.StaffEntries.Add(<PsStaffEntry>graphicalStaffEntry.GraceStaffEntriesBefore[j]);
                        //                 }
                        //             }
                        //         }
                        //     }
                        // }
                        // loop over "normal" notes (= no gracenotes)
                        for (const graphicalVoiceEntry of graphicalStaffEntry.graphicalVoiceEntries) {
                            for (const graphicalNote of graphicalVoiceEntry.notes) {
                                for (const slur of graphicalNote.sourceNote.NoteSlurs) {
                                    if (slur.EndNote === undefined || slur.StartNote === undefined) {
                                        continue;
                                    }
                                    // add new VexFlowSlur to List
                                    if (slur.StartNote === graphicalNote.sourceNote) {
                                        if (graphicalNote.sourceNote.NoteTie !== undefined) {
                                            if (graphicalNote.parentVoiceEntry.parentStaffEntry.getAbsoluteTimestamp() !==
                                            graphicalNote.sourceNote.NoteTie.StartNote.getAbsoluteTimestamp()) {
                                                break;
                                            }
                                        }

                                        // Add a Graphical Slur to the staffline, if the recent note is the Startnote of a slur
                                        const gSlur: GraphicalSlur = new GraphicalSlur(slur);
                                        openGraphicalSlurs.push(gSlur);
                                        staffLine.addSlurToStaffline(gSlur);

                                        /* VexFlow Version - for later use
                                        const vfSlur: VexFlowSlur = new VexFlowSlur(slur);
                                        vfOpenSlurs.push(vfSlur); //add open... adding / removing is JUST DONE in the open... array
                                        vfSlur.vfStartNote = (graphicalVoiceEntry as VexFlowVoiceEntry).vfStaveNote;
                                        vfStaffLine.addVFSlurToVFStaffline(vfSlur); // every VFSlur is added to the array in the VFStaffline!
                                        */
                                    }
                                    if (slur.EndNote === graphicalNote.sourceNote) {
                                        // Remove the Graphical Slur from the staffline if the note is the Endnote of a slur
                                        const index: number = this.findIndexGraphicalSlurFromSlur(openGraphicalSlurs, slur);
                                        if (index !== undefined) {
                                            // save Voice Entry in VFSlur and then remove it from array of open VFSlurs
                                            const gSlur: GraphicalSlur = openGraphicalSlurs[index];
                                            if (gSlur.staffEntries.indexOf(graphicalStaffEntry) === -1) {
                                              gSlur.staffEntries.push(graphicalStaffEntry);
                                            }

                                            openGraphicalSlurs.splice(index, 1);
                                        }

                                        /* VexFlow Version - for later use
                                        const vfIndex: number = this.findIndexVFSlurFromSlur(vfOpenSlurs, slur);
                                        if (vfIndex !== undefined) {
                                            // save Voice Entry in VFSlur and then remove it from array of open VFSlurs
                                            const vfSlur: VexFlowSlur = vfOpenSlurs[vfIndex];
                                            vfSlur.vfEndNote = (graphicalVoiceEntry as VexFlowVoiceEntry).vfStaveNote;
                                            vfSlur.createVexFlowCurve();
                                            vfOpenSlurs.splice(vfIndex, 1);
                                        }
                                        */
                                    }
                                }
                            }
                        }
                        // for (var idx5: number = 0, len5 = graphicalStaffEntry.GraceStaffEntriesAfter.Count; idx5 < len5; ++idx5) {
                        //     var graceStaffEntry: GraphicalStaffEntry = graphicalStaffEntry.GraceStaffEntriesAfter[idx5];
                        //     if (graceStaffEntry.Notes[0][0].SourceNote.NoteSlurs.Count > 0) {
                        //         var graceNote: Note = graceStaffEntry.Notes[0][0].SourceNote;
                        //         graceStaffEntry.RelInMeasureTimestamp = Fraction.createFromFraction(graphicalStaffEntry.RelInMeasureTimestamp);
                        //         for (var idx6: number = 0, len6 = graceNote.NoteSlurs.Count; idx6 < len6; ++idx6) {
                        //             var graceNoteSlur: Slur = graceNote.NoteSlurs[idx6];
                        //             if (graceNoteSlur.StartNote == graceNote) {
                        //                 var vfSlur: VexFlowSlur = new VexFlowSlur(graceNoteSlur);
                        //                 vfSlur.GraceStart = true;
                        //                 staffLine.GraphicalSlurs.Add(vfSlur);
                        //                 openGraphicalSlurs[i].Add(vfSlur);
                        //                 for (var j: number = graphicalStaffEntry.GraceStaffEntriesAfter.IndexOf(graceStaffEntry);
                        //                      j < graphicalStaffEntry.GraceStaffEntriesAfter.Count; j++)
                        //                        vfSlur.StaffEntries.Add(<PsStaffEntry>graphicalStaffEntry.GraceStaffEntriesAfter[j]);
                        //             }
                        //             if (graceNote == graceNoteSlur.EndNote) {
                        //                 var vfSlur: VexFlowSlur = findGraphicalSlurFromSlur(openGraphicalSlurs[i], graceNoteSlur);
                        //                 if (vfSlur != null) {
                        //                     vfSlur.GraceEnd = true;
                        //                     openGraphicalSlurs[i].Remove(vfSlur);
                        //                     vfSlur.StaffEntries.Add(<PsStaffEntry>graphicalStaffEntry);
                        //                     for (var j: number = 0; j <= graphicalStaffEntry.GraceStaffEntriesAfter.IndexOf(graceStaffEntry); j++)
                        //                         vfSlur.StaffEntries.Add(<PsStaffEntry>graphicalStaffEntry.GraceStaffEntriesAfter[j]);
                        //                 }
                        //             }
                        //         }
                        //     }
                        // }

                        //add the present Staffentry to all these slurs that contain this Staffentry
                        for (const gSlur of openGraphicalSlurs) {
                          if (gSlur.staffEntries.indexOf(graphicalStaffEntry) === -1) {
                            gSlur.staffEntries.push(graphicalStaffEntry);
                          }
                        }
                    } // loop over StaffEntries
                } // loop over Measures
            } // loop over StaffLines

                // Attach vfSlur array to the vfStaffline to be drawn
                //vfStaffLine.SlursInVFStaffLine = vfSlurs;
        } // loop over MusicSystems
    } // loop over MusicPages

    // order slurs that were saved to the Staffline
    for (const graphicalMusicPage of this.graphicalMusicSheet.MusicPages) {
        for (const musicSystem of graphicalMusicPage.MusicSystems) {
            for (const staffLine of musicSystem.StaffLines) {
                for (const gSlur of staffLine.GraphicalSlurs) {
                    if (gSlur.slur.isCrossed()) {
                        continue;
                    }
                    gSlur.calculateCurve(this.rules);
                }
            }
        }
    }
  }
}
