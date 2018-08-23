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
import {OctaveEnum, OctaveShift} from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
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
import { VexFlowOctaveShift } from "./VexFlowOctaveShift";
import { VexFlowInstantaneousDynamicExpression } from "./VexFlowInstantaneousDynamicExpression";
import {BoundingBox} from "../BoundingBox";
import { Slur } from "../../VoiceData/Expressions/ContinuousExpressions/Slur";
/* VexFlow Version - for later use
// import { VexFlowSlur } from "./VexFlowSlur";
// import { VexFlowStaffLine } from "./VexFlowStaffLine";
// import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
*/
import { EngravingRules } from "../EngravingRules";
import { InstantaneousDynamicExpression } from "../../VoiceData/Expressions/InstantaneousDynamicExpression";
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { GraphicalInstantaneousDynamicExpression } from "../GraphicalInstantaneousDynamicExpression";
import { SkyBottomLineCalculator } from "../SkyBottomLineCalculator";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";
import { Staff } from "../../VoiceData/Staff";
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
        for (const measure of verticalMeasureList) {
          for (const staffEntry of measure.staffEntries) {
            (<VexFlowStaffEntry>staffEntry).calculateXPosition();
          }
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
   * Prepares the VexFlow formatter for later formatting
   * Does not calculate measure width from lyrics (which is called from MusicSheetCalculator)
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
    const formatter: Vex.Flow.Formatter = new Vex.Flow.Formatter();

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
          if (measure === measures[0]) {
            const vexflowMeasure: VexFlowMeasure = (measure as VexFlowMeasure);
            // prepare format function for voices, will be called later for formatting measure again
            vexflowMeasure.formatVoices = (w: number) => {
                    formatter.format(allVoices, w);
              // formatter.format(allVoices, w, {
              //   align_rests: false, // TODO
              //   // align_rests = true causes a Vexflow Exception for Mozart - An Chloe
              //   // align_rests = false still aligns rests with beams according to Vexflow, but doesn't seem to do anything
              // });
                };
            // format now for minimum width, calculateMeasureWidthFromLyrics later
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
    // calculateMeasureWidthFromLyrics() will be called from MusicSheetCalculator after this
    return minStaffEntriesWidth;
  }

  public calculateMeasureWidthFromLyrics(measuresVertical: GraphicalMeasure[], oldMinimumStaffEntriesWidth: number): number {
    let elongationFactorMeasureWidth: number = 1;

    // information we need for the previous lyricsEntries to space the current one
    interface LyricEntryInfo {
      extend: boolean;
      labelHalfWidth: number;
      staffEntryXPosition: number;
      text: string;
      measureNumber: number;
    }
    // holds lyrics entries for verses i
    interface LyricEntryDict {
      [i: number]: LyricEntryInfo;
    }

    for (const measure of measuresVertical) {
      const lastLyricEntryDict: LyricEntryDict = {}; // holds info about last lyrics entries for all verses

      for (let i: number = 0; i < measure.staffEntries.length; i++) {
        const staffEntry: GraphicalStaffEntry = measure.staffEntries[i];
        if (staffEntry.LyricsEntries.length === 0) {
          continue;
        }
        // for all verses
        for (let j: number = 0; j < staffEntry.LyricsEntries.length; j++) {
          const lyricsEntry: GraphicalLyricEntry = staffEntry.LyricsEntries[j];
          // const lyricsEntryText = lyricsEntry.GetLyricsEntry.Text; // for easier debugging
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

          // if we don't have a previous lyricEntry, skip spacing, just save lastLyricEntry information
          if (lastLyricEntryDict[j] !== undefined) {
            if (lastLyricEntryDict[j].extend) {
              // TODO handle extend of last entry (extend is stored in lyrics entry of preceding syllable)
        }

            const spaceNeededByLyrics: number =
              lastLyricEntryDict[j].labelHalfWidth + lyricsLabelHalfWidth + minLyricsSpacing;

            const staffEntrySpacing: number = staffEntryXPosition - lastLyricEntryDict[j].staffEntryXPosition;
        // get factor of how much we need to stretch the measure to space the current lyric with the last one
            const elongationFactorMeasureWidthForCurrentLabels: number = spaceNeededByLyrics / staffEntrySpacing;
            elongationFactorMeasureWidth = Math.max(elongationFactorMeasureWidth, elongationFactorMeasureWidthForCurrentLabels);
          }
          // TODO for spacing between last lyric of a measure and first lyric of the next measure,
          // we need to look ahead into the next measure, because first note position is not affected
          // by measure elongation. or return this elongation and let MusicSheetCalculator apply it to prev. measure
          // e.g. for Austrian national hymn:
          // if (lyricsEntry.GetLyricsEntry.Text === "kunfts") {
          //   elongationFactorMeasureWidth *= 1.5;
          // }

          // set up last lyric entry information for next measure
          lastLyricEntryDict[j] = {
            extend: lyricsEntry.GetLyricsEntry.extend,
            labelHalfWidth: lyricsLabelHalfWidth,
            measureNumber: measure.MeasureNumber,
            staffEntryXPosition: staffEntryXPosition,
            text: lyricsEntry.GetLyricsEntry.Text,
          };
      }
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

  protected calculateDynamicExpressionsForMultiExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {

    // calculate absolute Timestamp
    const absoluteTimestamp: Fraction = multiExpression.AbsoluteTimestamp;
    const measures: GraphicalMeasure[] = this.graphicalMusicSheet.MeasureList[measureIndex];
    const staffLine: StaffLine = measures[staffIndex].ParentStaffLine;

    if (multiExpression.InstantaneousDynamic) {
        const instantaneousDynamic: InstantaneousDynamicExpression = multiExpression.InstantaneousDynamic;

        const startPosInStaffline: PointF2D = this.getRelativePositionInStaffLineFromTimestamp(
          absoluteTimestamp,
          staffIndex,
          staffLine,
          staffLine.isPartOfMultiStaffInstrument());
        if (Math.abs(startPosInStaffline.x) === 0) {
          startPosInStaffline.x = measures[staffIndex].beginInstructionsWidth + this.rules.RhythmRightMargin;
        }
        const measure: GraphicalMeasure = this.graphicalMusicSheet.MeasureList[measureIndex][staffIndex];
        const graphicalInstantaneousDynamic: VexFlowInstantaneousDynamicExpression = new VexFlowInstantaneousDynamicExpression(
          instantaneousDynamic,
          staffLine,
          measure);
        (measure as VexFlowMeasure).instantaneousDynamics.push(graphicalInstantaneousDynamic);
        this.calculateGraphicalInstantaneousDynamicExpression(graphicalInstantaneousDynamic, staffLine, startPosInStaffline);
    }
  }

  public calculateGraphicalInstantaneousDynamicExpression(graphicalInstantaneousDynamic: VexFlowInstantaneousDynamicExpression,
                                                          staffLine: StaffLine,
                                                          relative: PointF2D): void {
    // // add to StaffLine and set PSI relations
    staffLine.AbstractExpressions.push(graphicalInstantaneousDynamic);
    staffLine.PositionAndShape.ChildElements.push(graphicalInstantaneousDynamic.PositionAndShape);
    if (this.staffLinesWithGraphicalExpressions.indexOf(staffLine) === -1) {
        this.staffLinesWithGraphicalExpressions.push(staffLine);
    }

    // get Margin Dimensions
    const left: number = relative.x + graphicalInstantaneousDynamic.PositionAndShape.BorderMarginLeft;
    const right: number = relative.x + graphicalInstantaneousDynamic.PositionAndShape.BorderMarginRight;
    const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;

    // get possible previous Dynamic
    let previousExpression: GraphicalInstantaneousDynamicExpression = undefined;
    const expressionIndex: number = staffLine.AbstractExpressions.indexOf(graphicalInstantaneousDynamic);
    if (expressionIndex > 0) {
        previousExpression = (staffLine.AbstractExpressions[expressionIndex - 1] as GraphicalInstantaneousDynamicExpression);
    }

    // TODO: Not yet implemented
    // // is previous a ContinuousDynamic?
    // if (previousExpression && previousExpression instanceof GraphicalContinuousDynamicExpression)
    // {
    //     GraphicalContinuousDynamicExpression formerGraphicalContinuousDynamic =
    //         (GraphicalContinuousDynamicExpression)previousExpression;

    //     optimizeFormerContDynamicXPositionForInstDynamic(staffLine, skyBottomLineCalculator,
    //                                                      graphicalInstantaneousDynamic,
    //                                                      formerGraphicalContinuousDynamic, left, right);
    // }
    // // is previous a instantaneousDynamic?
    // else
    if (previousExpression && previousExpression instanceof GraphicalInstantaneousDynamicExpression) {
        //const formerGraphicalInstantaneousDynamic: GraphicalInstantaneousDynamicExpression = previousExpression;

        // optimizeFormerInstDynamicXPositionForInstDynamic(formerGraphicalInstantaneousDynamic,
        //                                                  graphicalInstantaneousDynamic, ref relative, ref left, ref right);
    }// End x-positioning overlap check

    // calculate yPosition according to Placement
    if (graphicalInstantaneousDynamic.InstantaneousDynamic.Placement === PlacementEnum.Above) {
        const skyLineValue: number = skyBottomLineCalculator.getSkyLineMinInRange(left, right);
        let yPosition: number = 0;

        // if StaffLine part of multiStafff Instrument and not the first one, ideal yPosition middle of distance between Staves
        if (staffLine.isPartOfMultiStaffInstrument() && staffLine.ParentStaff !== staffLine.ParentStaff.ParentInstrument.Staves[0]) {
            const formerStaffLine: StaffLine = staffLine.ParentMusicSystem.StaffLines[staffLine.ParentMusicSystem.StaffLines.indexOf(staffLine) - 1];
            const difference: number = staffLine.PositionAndShape.RelativePosition.y -
                               formerStaffLine.PositionAndShape.RelativePosition.y - this.rules.StaffHeight;

            // take always into account the size of the Dynamic
            if (skyLineValue > -difference / 2) {
                yPosition = -difference / 2;
            } else {
                yPosition = skyLineValue - graphicalInstantaneousDynamic.PositionAndShape.BorderMarginBottom;
            }
        } else {
            yPosition = skyLineValue - graphicalInstantaneousDynamic.PositionAndShape.BorderMarginBottom;
        }

        graphicalInstantaneousDynamic.PositionAndShape.RelativePosition = new PointF2D(relative.x, yPosition);
        skyBottomLineCalculator.updateSkyLineInRange(left, right, yPosition + graphicalInstantaneousDynamic.PositionAndShape.BorderMarginTop);
    } else if (graphicalInstantaneousDynamic.InstantaneousDynamic.Placement === PlacementEnum.Below) {
        const bottomLineValue: number = skyBottomLineCalculator.getBottomLineMaxInRange(left, right);
        let yPosition: number = 0;

        // if StaffLine part of multiStafff Instrument and not the last one, ideal yPosition middle of distance between Staves
        const lastStaff: Staff = staffLine.ParentStaff.ParentInstrument.Staves[staffLine.ParentStaff.ParentInstrument.Staves.length - 1];
        if (staffLine.isPartOfMultiStaffInstrument() && staffLine.ParentStaff !== lastStaff) {
            const nextStaffLine: StaffLine = staffLine.ParentMusicSystem.StaffLines[staffLine.ParentMusicSystem.StaffLines.indexOf(staffLine) + 1];
            const difference: number = nextStaffLine.PositionAndShape.RelativePosition.y -
                               staffLine.PositionAndShape.RelativePosition.y - this.rules.StaffHeight;
            const border: number = graphicalInstantaneousDynamic.PositionAndShape.BorderMarginBottom;

            // take always into account the size of the Dynamic
            if (bottomLineValue + border < this.rules.StaffHeight + difference / 2) {
                yPosition = this.rules.StaffHeight + difference / 2;
            } else {
                yPosition = bottomLineValue - graphicalInstantaneousDynamic.PositionAndShape.BorderMarginTop;
            }
        } else {
            yPosition = bottomLineValue - graphicalInstantaneousDynamic.PositionAndShape.BorderMarginTop;
        }

        graphicalInstantaneousDynamic.PositionAndShape.RelativePosition = new PointF2D(relative.x, yPosition);
        skyBottomLineCalculator.updateBottomLineInRange(left, right, yPosition + graphicalInstantaneousDynamic.PositionAndShape.BorderMarginBottom);
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
    // calculate absolute Timestamp and startStaffLine (and EndStaffLine if needed)
    const octaveShift: OctaveShift = multiExpression.OctaveShiftStart;

    const startTimeStamp: Fraction = octaveShift.ParentStartMultiExpression.Timestamp;
    const endTimeStamp: Fraction = octaveShift.ParentEndMultiExpression.Timestamp;

    const startStaffLine: StaffLine = this.graphicalMusicSheet.MeasureList[measureIndex][staffIndex].ParentStaffLine;

    let endMeasure: GraphicalMeasure = undefined;
    if (octaveShift.ParentEndMultiExpression !== undefined) {
        endMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(octaveShift.ParentEndMultiExpression.SourceMeasureParent,
                                                                                           staffIndex);
  }
    let startMeasure: GraphicalMeasure = undefined;
    if (octaveShift.ParentEndMultiExpression !== undefined) {
      startMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(octaveShift.ParentStartMultiExpression.SourceMeasureParent,
                                                                                           staffIndex);
    }

    if (endMeasure !== undefined) {
        // calculate GraphicalOctaveShift and RelativePositions
        const graphicalOctaveShift: VexFlowOctaveShift = new VexFlowOctaveShift(octaveShift, startStaffLine.PositionAndShape);
        startStaffLine.OctaveShifts.push(graphicalOctaveShift);

        // calculate RelativePosition and Dashes
        const startStaffEntry: GraphicalStaffEntry = startMeasure.findGraphicalStaffEntryFromTimestamp(startTimeStamp);
        const endStaffEntry: GraphicalStaffEntry = endMeasure.findGraphicalStaffEntryFromTimestamp(endTimeStamp);

        graphicalOctaveShift.setStartNote(startStaffEntry);

        if (endMeasure.ParentStaffLine !== startMeasure.ParentStaffLine) {
          graphicalOctaveShift.endsOnDifferentStaffLine = true;
          const lastMeasure: GraphicalMeasure = startMeasure.ParentStaffLine.Measures[startMeasure.ParentStaffLine.Measures.length - 1];
          const lastNote: GraphicalStaffEntry = lastMeasure.staffEntries[lastMeasure.staffEntries.length - 1];
          graphicalOctaveShift.setEndNote(lastNote);

          // Now finish the shift on the next line
          const remainingOctaveShift: VexFlowOctaveShift = new VexFlowOctaveShift(octaveShift, endMeasure.PositionAndShape);
          endMeasure.ParentStaffLine.OctaveShifts.push(remainingOctaveShift);
          const firstMeasure: GraphicalMeasure = endMeasure.ParentStaffLine.Measures[0];
          const firstNote: GraphicalStaffEntry = firstMeasure.staffEntries[0];
          remainingOctaveShift.setStartNote(firstNote);
          remainingOctaveShift.setEndNote(endStaffEntry);
        } else {
          graphicalOctaveShift.setEndNote(endStaffEntry);
        }
    } else {
      log.warn("End measure for octave shift is undefined! This should not happen!");
    }
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
    return -1;
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
                                    // extra check for some MusicSheets that have openSlurs (because only the first Page is available -> Recordare files)
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
                                        if (index >= 0) {
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

                        //add the present Staffentry to all open slurs that don't contain this Staffentry already
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
