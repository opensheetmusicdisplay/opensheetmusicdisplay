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
import { EngravingRules } from "../EngravingRules";
import { InstantaneousDynamicExpression } from "../../VoiceData/Expressions/InstantaneousDynamicExpression";
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { GraphicalInstantaneousDynamicExpression } from "../GraphicalInstantaneousDynamicExpression";
import { SkyBottomLineCalculator } from "../SkyBottomLineCalculator";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";
import { Staff } from "../../VoiceData/Staff";
import { TextAlignmentEnum, TextAlignment } from "../../../Common/Enums/TextAlignment";

export class VexFlowMusicSheetCalculator extends MusicSheetCalculator {
  /** space needed for a dash for lyrics spacing, calculated once */
  private dashSpace: number;

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
    let elongationFactorForMeasureWidth: number = 1;

    // information we need for the previous lyricsEntries to space the current one
    interface LyricEntryInfo {
      extend: boolean;
      labelWidth: number;
      lyricsXPosition: number;
      sourceNoteDuration: Fraction;
      text: string;
      measureNumber: number;
    }
    // holds lyrics entries for verses i
    interface LyricEntryDict {
      [i: number]: LyricEntryInfo;
    }

    for (const measure of measuresVertical) {
      const lastLyricEntryDict: LyricEntryDict = {}; // holds info about last lyrics entries for all verses j

      // for all staffEntries i, each containing the lyric entry for all verses at that timestamp in the measure
      for (let i: number = 0; i < measure.staffEntries.length; i++) {
        const staffEntry: GraphicalStaffEntry = measure.staffEntries[i];
        if (staffEntry.LyricsEntries.length === 0) {
          continue;
        }
        // for all verses j
        for (let j: number = 0; j < staffEntry.LyricsEntries.length; j++) {
          const lyricsEntry: GraphicalLyricEntry = staffEntry.LyricsEntries[j];
          // const lyricsEntryText = lyricsEntry.LyricsEntry.Text; // for easier debugging
          const lyricAlignment: TextAlignmentEnum = lyricsEntry.GraphicalLabel.Label.textAlignment;
          let minLyricsSpacing: number = EngravingRules.Rules.HorizontalBetweenLyricsDistance;
          // for quarter note in Vexflow, where spacing is halfed for each smaller note duration.

          let lyricOverlapAllowedIntoNextMeasure: number =
            EngravingRules.Rules.LyricOverlapAllowedIntoNextMeasure;
          // TODO allow more overlap if there are no lyrics in next measure

          // spacing for multi-syllable words
          if (lyricsEntry.ParentLyricWord) {
            if (lyricsEntry.LyricsEntry.SyllableIndex > 0) { // syllables after first
              // give a little more spacing for dash between syllables
              minLyricsSpacing = EngravingRules.Rules.BetweenSyllableMinimumDistance;
            }
            const syllables: LyricsEntry[] = lyricsEntry.ParentLyricWord.GetLyricWord.Syllables;
            if (syllables.length > 1) {
              if (lyricsEntry.LyricsEntry.SyllableIndex < syllables.length - 1) {
                // if a middle syllable of a word, give less measure overlap into next measure, to give room for dash
                if (this.dashSpace === undefined) {
                  this.dashSpace = 1.5;
                  // better method, doesn't work:
                  // this.dashLength = new GraphicalLabel(new Label("-"), this.rules.LyricsHeight, TextAlignmentEnum.CenterBottom)
                  //   .PositionAndShape.Size.width; // always returns 0
                }
                lyricOverlapAllowedIntoNextMeasure -= this.dashSpace;
              }
            }
          }

          const lyricsBbox: BoundingBox = lyricsEntry.GraphicalLabel.PositionAndShape;
          const lyricsLabelWidth: number = lyricsBbox.Size.width;
          const staffEntryXPosition: number = (staffEntry as VexFlowStaffEntry).PositionAndShape.RelativePosition.x;
          const lyricsXPosition: number = staffEntryXPosition + lyricsBbox.BorderMarginLeft;

          if (lastLyricEntryDict[j] !== undefined) {
            if (lastLyricEntryDict[j].extend) {
              // TODO handle extend of last entry (extend is stored in lyrics entry of preceding syllable)
              // only necessary for center alignment
            }
          }

          let spacingNeededToLastLyric: number;
          let currentSpacingToLastLyric: number; // undefined for first lyric in measure
          if (lastLyricEntryDict[j]) {
            currentSpacingToLastLyric = lyricsXPosition - lastLyricEntryDict[j].lyricsXPosition;
          }

          let currentSpacingToMeasureEnd: number;
          let spacingNeededToMeasureEnd: number;
          const maxXInMeasure: number = oldMinimumStaffEntriesWidth * elongationFactorForMeasureWidth;

          // when the lyrics are centered, we need to consider spacing differently than when they are left-aligned:
          if (TextAlignment.IsCenterAligned(lyricAlignment)) {
            lyricOverlapAllowedIntoNextMeasure /= 4; // reserve space for overlap from next measure. its first note can't be spaced.
            currentSpacingToMeasureEnd = maxXInMeasure - lyricsXPosition;
            spacingNeededToMeasureEnd = (lyricsLabelWidth / 2) - lyricOverlapAllowedIntoNextMeasure;
            // spacing to last lyric only done if not first lyric in measure:
            if (lastLyricEntryDict[j]) {
              spacingNeededToLastLyric =
                lastLyricEntryDict[j].labelWidth / 2 + lyricsLabelWidth / 2 + minLyricsSpacing;
            }
          } else if (TextAlignment.IsLeft(lyricAlignment)) {
            currentSpacingToMeasureEnd = maxXInMeasure - lyricsXPosition;
            spacingNeededToMeasureEnd = lyricsLabelWidth - lyricOverlapAllowedIntoNextMeasure;
            if (lastLyricEntryDict[j]) {
              spacingNeededToLastLyric = lastLyricEntryDict[j].labelWidth + minLyricsSpacing;
            }
          }

          // get factor of how much we need to stretch the measure to space the current lyric
          let elongationFactorForMeasureWidthForCurrentLyric: number = 1;
          const elongationFactorNeededForMeasureEnd: number =
            spacingNeededToMeasureEnd / currentSpacingToMeasureEnd;
          let elongationFactorNeededForLastLyric: number = 1;
          if (lastLyricEntryDict[j]) { // if previous lyric needs more spacing than measure end, take that spacing
            const lastNoteDuration: Fraction = lastLyricEntryDict[j].sourceNoteDuration;
            elongationFactorNeededForLastLyric = spacingNeededToLastLyric / currentSpacingToLastLyric;
            if (lastNoteDuration.Denominator > 4) {
              elongationFactorNeededForLastLyric *= 1.1; // from 1.2 upwards, this unnecessarily bloats shorter measures
              // spacing in Vexflow depends on note duration, our minSpacing is calibrated for quarter notes
              // if we double the measure length, the distance between eigth notes only gets half of the added length
              // compared to a quarter note.
            }
          }
          elongationFactorForMeasureWidthForCurrentLyric = Math.max(
            elongationFactorNeededForMeasureEnd,
            elongationFactorNeededForLastLyric
          );

          elongationFactorForMeasureWidth = Math.max(
            elongationFactorForMeasureWidth,
            elongationFactorForMeasureWidthForCurrentLyric
          );

          // set up information about this lyric entry of verse j for next lyric entry of verse j
          lastLyricEntryDict[j] = {
            extend: lyricsEntry.LyricsEntry.extend,
            labelWidth: lyricsLabelWidth,
            lyricsXPosition: lyricsXPosition,
            measureNumber: measure.MeasureNumber,
            sourceNoteDuration: lyricsEntry.LyricsEntry.Parent.Notes[0].Length,
            text: lyricsEntry.LyricsEntry.Text,
          };
        }
      }
    }
    return oldMinimumStaffEntriesWidth * elongationFactorForMeasureWidth;
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
}
