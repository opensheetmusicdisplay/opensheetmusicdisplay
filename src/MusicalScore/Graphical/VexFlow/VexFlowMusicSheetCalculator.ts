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
import { EngravingRules } from "../EngravingRules";

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
    // let lastLyricsEntryText: string = ""; // for easier debug purposes
    // let lyricsEntryText: string = ""; // for easier debug purposes
    // let lyricExtend: boolean = false; // for easier debug purposes
    let elongationFactorMeasureWidth: number = 1;
    for (const measure of measuresVertical) {
      // sort staffEntries by position, so that we always compare neighboring staffEntries
      const staffEntriesSorted: GraphicalStaffEntry[] = measure.staffEntries.sort(
        (a: GraphicalStaffEntry, b: GraphicalStaffEntry) => {
        return a.PositionAndShape.RelativePosition.x - b.PositionAndShape.RelativePosition.x;
      });
      for (let i: number = 0; i < staffEntriesSorted.length; i++) {
        const staffEntry: GraphicalStaffEntry = staffEntriesSorted[i];
        if (staffEntry.LyricsEntries.length === 0) {
          continue;
        }
        // TODO choose biggest lyrics entry or handle each separately and take maximum elongation
        const lyricsEntry: GraphicalLyricEntry = staffEntry.LyricsEntries[0];
        if (lyricsEntry.GetLyricsEntry.extend) {
          // TODO handle extend, belongs to same lyrics entry as current word
          // lyricExtend = true;
        }
        // lyricsEntryText = lyricsEntry.GetLyricsEntry.Text;
        let minLyricsSpacing: number = EngravingRules.Rules.HorizontalBetweenLyricsDistance;

        // spacing for multi-syllable words
        if (lyricsEntry.ParentLyricWord) {
          if (lyricsEntry.GetLyricsEntry.SyllableIndex > 0) { // syllables after first
            // give a little more spacing for dash between syllables
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
        // lastLyricsEntryText = lyricsEntryText;
        // lyricExtend = false; // reset for next measure
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
}
