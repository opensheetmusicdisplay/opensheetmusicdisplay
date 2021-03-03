import { MusicSheetCalculator } from "../MusicSheetCalculator";
import { VexFlowGraphicalSymbolFactory } from "./VexFlowGraphicalSymbolFactory";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { StaffLine } from "../StaffLine";
import { VoiceEntry } from "../../VoiceData/VoiceEntry";
import { GraphicalNote } from "../GraphicalNote";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { GraphicalTie } from "../GraphicalTie";
import { Tie } from "../../VoiceData/Tie";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { MultiExpression } from "../../VoiceData/Expressions/MultiExpression";
import { RepetitionInstruction } from "../../VoiceData/Instructions/RepetitionInstruction";
import { Beam } from "../../VoiceData/Beam";
import { ClefInstruction } from "../../VoiceData/Instructions/ClefInstruction";
import { OctaveEnum, OctaveShift } from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { Fraction } from "../../../Common/DataObjects/Fraction";
import { LyricWord } from "../../VoiceData/Lyrics/LyricsWord";
import { OrnamentContainer } from "../../VoiceData/OrnamentContainer";
import { Articulation } from "../../VoiceData/Articulation";
import { Tuplet } from "../../VoiceData/Tuplet";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { VexFlowTextMeasurer } from "./VexFlowTextMeasurer";
import Vex from "vexflow";
import log from "loglevel";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";
import { VexFlowGraphicalNote } from "./VexFlowGraphicalNote";
import { TechnicalInstruction } from "../../VoiceData/Instructions/TechnicalInstruction";
import { GraphicalLyricEntry } from "../GraphicalLyricEntry";
import { GraphicalLabel } from "../GraphicalLabel";
import { LyricsEntry } from "../../VoiceData/Lyrics/LyricsEntry";
import { GraphicalLyricWord } from "../GraphicalLyricWord";
import { VexFlowStaffEntry } from "./VexFlowStaffEntry";
import { VexFlowOctaveShift } from "./VexFlowOctaveShift";
import { VexFlowInstantaneousDynamicExpression } from "./VexFlowInstantaneousDynamicExpression";
import { Slur } from "../../VoiceData/Expressions/ContinuousExpressions/Slur";
/* VexFlow Version - for later use
// import { VexFlowSlur } from "./VexFlowSlur";
// import { VexFlowStaffLine } from "./VexFlowStaffLine";
// import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
*/
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { TextAlignmentEnum, TextAlignment } from "../../../Common/Enums/TextAlignment";
import { GraphicalSlur } from "../GraphicalSlur";
import { BoundingBox } from "../BoundingBox";
import { ContinuousDynamicExpression } from "../../VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { VexFlowContinuousDynamicExpression } from "./VexFlowContinuousDynamicExpression";
import { InstantaneousTempoExpression, TempoEnum } from "../../VoiceData/Expressions/InstantaneousTempoExpression";
import { AlignRestOption } from "../../../OpenSheetMusicDisplay/OSMDOptions";
import { VexFlowStaffLine } from "./VexFlowStaffLine";
import { EngravingRules } from "../EngravingRules";
import { VexflowStafflineNoteCalculator } from "./VexflowStafflineNoteCalculator";
import { MusicSystem } from "../MusicSystem";
import { NoteTypeHandler } from "../../VoiceData/NoteType";
import { VexFlowConverter } from "./VexFlowConverter";
import { TabNote } from "../../VoiceData/TabNote";
import { PlacementEnum } from "../../VoiceData/Expressions";
import { GraphicalChordSymbolContainer } from "../GraphicalChordSymbolContainer";
import { RehearsalExpression } from "../../VoiceData/Expressions/RehearsalExpression";

export class VexFlowMusicSheetCalculator extends MusicSheetCalculator {
  /** space needed for a dash for lyrics spacing, calculated once */
  private dashSpace: number;
  public beamsNeedUpdate: boolean = false;

  constructor(rules: EngravingRules) {
    super();
    this.rules = rules;
    MusicSheetCalculator.symbolFactory = new VexFlowGraphicalSymbolFactory();
    MusicSheetCalculator.TextMeasurer = new VexFlowTextMeasurer(this.rules);
    MusicSheetCalculator.stafflineNoteCalculator = new VexflowStafflineNoteCalculator(this.rules);

    // prepare Vexflow font (doesn't affect Vexflow 1.x). It seems like this has to be done here for now, otherwise it's too slow for the generateImages script.
    //   (first image will have the non-updated font, in this case the Vexflow default Bravura, while we want Gonville here)
    if (this.rules.DefaultVexFlowNoteFont?.toLowerCase() === "gonville") {
      (Vex.Flow as any).DEFAULT_FONT_STACK = [(Vex.Flow as any).Fonts?.Gonville, (Vex.Flow as any).Fonts?.Bravura, (Vex.Flow as any).Fonts?.Custom];
    } else if (this.rules.DefaultVexFlowNoteFont?.toLowerCase() === "petaluma") {
      (Vex.Flow as any).DEFAULT_FONT_STACK = [(Vex.Flow as any).Fonts?.Petaluma, (Vex.Flow as any).Fonts?.Gonville, (Vex.Flow as any).Fonts?.Bravura];
    }
    // else keep new vexflow default Bravura (more cursive, bold)
  }

  protected clearRecreatedObjects(): void {
    super.clearRecreatedObjects();
    MusicSheetCalculator.stafflineNoteCalculator = new VexflowStafflineNoteCalculator(this.rules);
    for (const graphicalMeasures of this.graphicalMusicSheet.MeasureList) {
      for (const graphicalMeasure of graphicalMeasures) {
        (<VexFlowMeasure>graphicalMeasure)?.clean();
      }
    }
  }

  protected formatMeasures(): void {
    // let totalFinalizeBeamsTime: number = 0;
    for (const verticalMeasureList of this.graphicalMusicSheet.MeasureList) {
      if (!verticalMeasureList || !verticalMeasureList[0]) {
        continue;
      }
      const firstMeasure: VexFlowMeasure = verticalMeasureList[0] as VexFlowMeasure;
      // first measure has formatting method as lambda function object, but formats all measures. TODO this could be refactored
      firstMeasure.format();
      for (const measure of verticalMeasureList) {
        for (const staffEntry of measure.staffEntries) {
          (<VexFlowStaffEntry>staffEntry).calculateXPosition();
        }
        // const t0: number = performance.now();
        if (true || this.beamsNeedUpdate) {
          // finalizeBeams takes a few milliseconds, so we can save some performance here sometimes,
          // but we'd have to check for every setting change that would affect beam rendering. See #843
          (measure as VexFlowMeasure).finalizeBeams(); // without this, when zooming a lot (e.g. 250%), beams keep their old, now wrong slope.
          // totalFinalizeBeamsTime += performance.now() - t0;
          // console.log("Total calls to finalizeBeams in VexFlowMusicSheetCalculator took " + totalFinalizeBeamsTime + " milliseconds.");
        }
      }
    }
    this.beamsNeedUpdate = false;
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
    const visibleMeasures: GraphicalMeasure[] = [];
    for (const measure of measures) {
      if (measure) {
        visibleMeasures.push(measure);
      }
    }
    if (visibleMeasures.length === 0) { // e.g. after Multiple Rest measures (VexflowMultiRestMeasure)
      return 0;
    }
    measures = visibleMeasures;

    // Format the voices
    const allVoices: Vex.Flow.Voice[] = [];
    const formatter: Vex.Flow.Formatter = new Vex.Flow.Formatter({
      // maxIterations: 2,
      softmaxFactor: this.rules.SoftmaxFactorVexFlow // this setting is only applied in Vexflow 3.x. also this needs @types/vexflow ^3.0.0
    });

    let maxStaffEntries: number = measures[0].staffEntries.length;
    let maxStaffEntriesPlusAccidentals: number = 1;
    for (const measure of measures) {
      if (!measure) {
        continue;
      }
      let measureAccidentals: number = 0;
      for (const staffEntry of measure.staffEntries) {
        measureAccidentals += (staffEntry as VexFlowStaffEntry).setMaxAccidentals(); // staffEntryAccidentals
      }
      // TODO the if is a TEMP change to show pure diff for pickup measures, should be done for all measures, but increases spacing
      if (measure.parentSourceMeasure.ImplicitMeasure) {
        maxStaffEntries = Math.max(measure.staffEntries.length, maxStaffEntries);
        maxStaffEntriesPlusAccidentals = Math.max(measure.staffEntries.length + measureAccidentals, maxStaffEntriesPlusAccidentals);
      }
      const mvoices: { [voiceID: number]: Vex.Flow.Voice } = (measure as VexFlowMeasure).vfVoices;
      const voices: Vex.Flow.Voice[] = [];
      for (const voiceID in mvoices) {
        if (mvoices.hasOwnProperty(voiceID)) {
          voices.push(mvoices[voiceID]);
          allVoices.push(mvoices[voiceID]);
        }
      }

      if (voices.length === 0) {
        log.debug("Found a measure with no voices. Continuing anyway.", mvoices);
        // no need to log this, measures with no voices/notes are fine. see OSMDOptions.fillEmptyMeasuresWithWholeRest
        continue;
      }
      // all voices that belong to one stave are collectively added to create a common context in VexFlow.
      formatter.joinVoices(voices);
    }

    let minStaffEntriesWidth: number = 12; // a typical measure has roughly a length of 3*StaffHeight (3*4 = 12)
    const parentSourceMeasure: SourceMeasure = measures[0].parentSourceMeasure;

    if (allVoices.length > 0) {
      // the voicing space bonus addition makes the voicing more relaxed. With a bonus of 0 the notes are basically completely squeezed together.
      const staffEntryFactor: number = 0.3;

      minStaffEntriesWidth = formatter.preCalculateMinTotalWidth(allVoices) / unitInPixels
      * this.rules.VoiceSpacingMultiplierVexflow
      + this.rules.VoiceSpacingAddendVexflow
      + maxStaffEntries * staffEntryFactor; // TODO use maxStaffEntriesPlusAccidentals here as well, adjust spacing
      if (parentSourceMeasure?.ImplicitMeasure) {
        // shrink width in the ratio that the pickup measure is shorter compared to a full measure('s time signature):
        minStaffEntriesWidth = parentSourceMeasure.Duration.RealValue / parentSourceMeasure.ActiveTimeSignature.RealValue * minStaffEntriesWidth;
        // e.g. a 1/4 pickup measure in a 3/4 time signature should be 1/4 / 3/4 = 1/3 as long (a third)
        // it seems like this should be respected by staffEntries.length and preCaculateMinTotalWidth, but apparently not,
        //   without this the pickup measures were always too long.

        // add more than the original staffEntries scaling again: (removing it above makes it too short)
        if (maxStaffEntries > 1) { // not necessary for only 1 StaffEntry
          minStaffEntriesWidth += maxStaffEntriesPlusAccidentals * staffEntryFactor * 1.5; // don't scale this for implicit measures
          // in fact overscale it, this needs a lot of space the more staffEntries (and modifiers like accidentals) there are
        }
        minStaffEntriesWidth *= this.rules.PickupMeasureWidthMultiplier;
      }

        // TODO this could use some fine-tuning. currently using *1.5 + 1 by default, results in decent spacing.
      // firstMeasure.formatVoices = (w: number) => {
      //     formatter.format(allVoices, w);
      // };
      MusicSheetCalculator.setMeasuresMinStaffEntriesWidth(measures, minStaffEntriesWidth);

      const formatVoicesDefault: (w: number, p: VexFlowMeasure) => void = (w, p) => {
        formatter.formatToStave(allVoices, p.getVFStave());
      };
      const formatVoicesAlignRests: (w: number,  p: VexFlowMeasure) => void = (w, p) => {
        formatter.formatToStave(allVoices, p.getVFStave(), {
          align_rests: true,
          context: undefined
        });
      };

      for (const measure of measures) {
        // determine whether to align rests
        if (this.rules.AlignRests === AlignRestOption.Never) {
          (measure as VexFlowMeasure).formatVoices = formatVoicesDefault;
        } else if (this.rules.AlignRests === AlignRestOption.Always) {
          (measure as VexFlowMeasure).formatVoices = formatVoicesAlignRests;
        } else if (this.rules.AlignRests === AlignRestOption.Auto) {
          let alignRests: boolean = false;
          for (const staffEntry of measure.staffEntries) {
            let collidableVoiceEntries: number = 0;
            let numberOfRests: number = 0;
            for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
              if (!voiceEntry.parentVoiceEntry.IsGrace) {
                if (voiceEntry && voiceEntry.notes && voiceEntry.notes[0] && voiceEntry.notes[0].sourceNote) {// TODO null chaining, TS 3.7
                  if (voiceEntry.notes[0].sourceNote.PrintObject) { // only respect collision when not invisible
                    collidableVoiceEntries++;
                  }
                }
              }
              if (voiceEntry && voiceEntry.notes && voiceEntry.notes[0] && voiceEntry.notes[0].sourceNote) {// TODO null chaining, TS 3.7
                if (voiceEntry.notes[0].sourceNote.isRest() && voiceEntry.notes[0].sourceNote.PrintObject) {
                  numberOfRests++; // only align rests if there is actually a rest (which could collide)
                }
              }
              if (collidableVoiceEntries > 1 && numberOfRests >= 1) {
                // TODO could add further checks like if any of the already checked voice entries actually collide
                alignRests = true;
                break;
              }
            }
            if (alignRests) {
              break;
            }
          }

          // set measure's format function
          if (alignRests) {
            (measure as VexFlowMeasure).formatVoices = formatVoicesAlignRests;
          } else {
            (measure as VexFlowMeasure).formatVoices = formatVoicesDefault;
          }
        }

        // format first measure with minimum width
        if (measure === measures[0]) {
          const vexflowMeasure: VexFlowMeasure = (measure as VexFlowMeasure);
          // prepare format function for voices, will be called later for formatting measure again
          //vexflowMeasure.formatVoices = formatVoicesDefault;

          // format now for minimum width, calculateMeasureWidthFromLyrics later
          vexflowMeasure.formatVoices(minStaffEntriesWidth * unitInPixels, vexflowMeasure);
        } else {
          //(measure as VexFlowMeasure).formatVoices = undefined;
          // TODO why was the formatVoices function disabled for other measures? would now disable the new align rests option.
        }
      }
    }

    for (const graphicalMeasure of measures) {
      if (!graphicalMeasure) {
        continue;
      }
      for (const staffEntry of graphicalMeasure.staffEntries) {
        // here the measure modifiers are not yet set, therefore the begin instruction width will be empty
        (<VexFlowStaffEntry>staffEntry).calculateXPosition();
      }
    }
    // calculateMeasureWidthFromLyrics() will be called from MusicSheetCalculator after this
    return minStaffEntriesWidth;
  }

  private calculateElongationFactor(containers: (GraphicalLyricEntry|GraphicalChordSymbolContainer)[], staffEntry: GraphicalStaffEntry, lastEntryDict: any,
                                    oldMinimumStaffEntriesWidth: number, elongationFactorForMeasureWidth: number,
                                    measureNumber: number, oldMinSpacing: number, nextMeasureOverlap: number): number {
    let newElongationFactorForMeasureWidth: number = elongationFactorForMeasureWidth;
    let currentContainerIndex: number = 0;

    for (const container of containers) {
      const alignment: TextAlignmentEnum = container.GraphicalLabel.Label.textAlignment;
      let minSpacing: number = oldMinSpacing;

      let overlapAllowedIntoNextMeasure: number = nextMeasureOverlap;

      if (container instanceof GraphicalLyricEntry && container.ParentLyricWord) {
        // spacing for multi-syllable words
        if (container.LyricsEntry.SyllableIndex > 0) { // syllables after first
          // give a little more spacing for dash between syllables
          minSpacing = this.rules.BetweenSyllableMinimumDistance;
          if (TextAlignment.IsCenterAligned(alignment)) {
            minSpacing += 1.0; // TODO check for previous lyric alignment too. though center is not standard
            // without this, there's not enough space for dashes between long syllables on eigth notes
          }
        }
        const syllables: LyricsEntry[] = container.ParentLyricWord.GetLyricWord.Syllables;
        if (syllables.length > 1) {
          if (container.LyricsEntry.SyllableIndex < syllables.length - 1) {
            // if a middle syllable of a word, give less measure overlap into next measure, to give room for dash
            if (this.dashSpace === undefined) { // don't replace undefined check
              this.dashSpace = 1.5;
              // better method, doesn't work:
              // this.dashLength = new GraphicalLabel(new Label("-"), this.rules.LyricsHeight, TextAlignmentEnum.CenterBottom)
              //   .PositionAndShape.Size.width; // always returns 0
            }
            overlapAllowedIntoNextMeasure -= this.dashSpace;
          }
        }
      }

      const bBox: BoundingBox = container instanceof GraphicalLyricEntry ? container.GraphicalLabel.PositionAndShape : container.PositionAndShape;
      const labelWidth: number = bBox.Size.width;
      const staffEntryXPosition: number = (staffEntry as VexFlowStaffEntry).PositionAndShape.RelativePosition.x;
      const xPosition: number = staffEntryXPosition + bBox.BorderMarginLeft;

      if (lastEntryDict[currentContainerIndex] !== undefined) {
        if (lastEntryDict[currentContainerIndex].extend) {
          // TODO handle extend of last entry (extend is stored in lyrics entry of preceding syllable)
          // only necessary for center alignment
        }
      }

      let spacingNeededToLastContainer: number;
      let currentSpacingToLastContainer: number; // undefined for first container in measure
      if (lastEntryDict[currentContainerIndex]) {
        currentSpacingToLastContainer = xPosition - lastEntryDict[currentContainerIndex].xPosition;
      }

      let currentSpacingToMeasureEnd: number;
      let spacingNeededToMeasureEnd: number;
      const maxXInMeasure: number = oldMinimumStaffEntriesWidth * elongationFactorForMeasureWidth;

      if (TextAlignment.IsCenterAligned(alignment)) {
        overlapAllowedIntoNextMeasure /= 4; // reserve space for overlap from next measure. its first note can't be spaced.
        currentSpacingToMeasureEnd = maxXInMeasure - xPosition;
        spacingNeededToMeasureEnd = (labelWidth / 2) - overlapAllowedIntoNextMeasure;
        // spacing to last lyric only done if not first lyric in measure:
        if (lastEntryDict[currentContainerIndex]) {
          spacingNeededToLastContainer =
            lastEntryDict[currentContainerIndex].labelWidth / 2 + labelWidth / 2 + minSpacing;
        }
      } else if (TextAlignment.IsLeft(alignment)) {
        currentSpacingToMeasureEnd = maxXInMeasure - xPosition;
        spacingNeededToMeasureEnd = labelWidth - overlapAllowedIntoNextMeasure;
        if (lastEntryDict[currentContainerIndex]) {
          spacingNeededToLastContainer = lastEntryDict[currentContainerIndex].labelWidth + minSpacing;
        }
      }

      // get factor of how much we need to stretch the measure to space the current lyric
      let elongationFactorForMeasureWidthForCurrentContainer: number = 1;
      const elongationFactorNeededForMeasureEnd: number =
        spacingNeededToMeasureEnd / currentSpacingToMeasureEnd;
      let elongationFactorNeededForLastContainer: number = 1;

      if (container instanceof GraphicalLyricEntry && container.LyricsEntry) {
        if (lastEntryDict[currentContainerIndex]) { // if previous lyric needs more spacing than measure end, take that spacing
          const lastNoteDuration: Fraction = lastEntryDict[currentContainerIndex].sourceNoteDuration;
          elongationFactorNeededForLastContainer = spacingNeededToLastContainer / currentSpacingToLastContainer;
          if ((lastNoteDuration.Denominator) > 4) {
            elongationFactorNeededForLastContainer *= 1.1; // from 1.2 upwards, this unnecessarily bloats shorter measures
            // spacing in Vexflow depends on note duration, our minSpacing is calibrated for quarter notes
            // if we double the measure length, the distance between eigth notes only gets half of the added length
            // compared to a quarter note.
          }
        }
      } else if (lastEntryDict[currentContainerIndex]) {
        elongationFactorNeededForLastContainer =
        spacingNeededToLastContainer / currentSpacingToLastContainer;
      }

      elongationFactorForMeasureWidthForCurrentContainer = Math.max(
        elongationFactorNeededForMeasureEnd,
        elongationFactorNeededForLastContainer
      );

      newElongationFactorForMeasureWidth = Math.max(
        newElongationFactorForMeasureWidth,
        elongationFactorForMeasureWidthForCurrentContainer
      );

      let overlap: number = Math.max((spacingNeededToLastContainer - currentSpacingToLastContainer) || 0, 0);
      if (lastEntryDict[currentContainerIndex]) {
        overlap += lastEntryDict[currentContainerIndex].cumulativeOverlap;
      }

      // set up information about this lyric entry of verse j for next lyric entry of verse j
      lastEntryDict[currentContainerIndex] = {
        cumulativeOverlap: overlap,
        extend: container instanceof GraphicalLyricEntry ? container.LyricsEntry.extend : false,
        labelWidth: labelWidth,
        measureNumber: measureNumber,
        sourceNoteDuration: container instanceof GraphicalLyricEntry ? (container.LyricsEntry && container.LyricsEntry.Parent.Notes[0].Length) : false,
        text: container instanceof GraphicalLyricEntry ? container.LyricsEntry.Text : container.GraphicalLabel.Label.text,
        xPosition: xPosition,
      };

      currentContainerIndex++;
    }

    return newElongationFactorForMeasureWidth;
  }

  public calculateElongationFactorFromStaffEntries(staffEntries: GraphicalStaffEntry[], oldMinimumStaffEntriesWidth: number,
                                                  elongationFactorForMeasureWidth: number, measureNumber: number): number {
    interface EntryInfo {
      cumulativeOverlap: number;
      extend: boolean;
      labelWidth: number;
      xPosition: number;
      sourceNoteDuration: Fraction;
      text: string;
      measureNumber: number;
    }
    // holds lyrics entries for verses i
    interface EntryDict {
      [i: number]: EntryInfo;
    }

    let newElongationFactorForMeasureWidth: number = elongationFactorForMeasureWidth;

    const lastLyricEntryDict: EntryDict = {}; // holds info about last lyric entries for all verses j???
    const lastChordEntryDict: EntryDict = {}; // holds info about last chord entries for all verses j???

    // for all staffEntries i, each containing the lyric entry for all verses at that timestamp in the measure
    for (const staffEntry of staffEntries) {
      if (staffEntry.LyricsEntries.length > 0) {
        newElongationFactorForMeasureWidth =
          this.calculateElongationFactor(
            staffEntry.LyricsEntries,
            staffEntry,
            lastLyricEntryDict,
            oldMinimumStaffEntriesWidth,
            newElongationFactorForMeasureWidth,
            measureNumber,
            this.rules.HorizontalBetweenLyricsDistance,
            this.rules.LyricOverlapAllowedIntoNextMeasure,
          );
      }
      if (staffEntry.graphicalChordContainers.length > 0) {
        newElongationFactorForMeasureWidth =
          this.calculateElongationFactor(
            staffEntry.graphicalChordContainers,
            staffEntry,
            lastChordEntryDict,
            oldMinimumStaffEntriesWidth,
            newElongationFactorForMeasureWidth,
            measureNumber,
            this.rules.ChordSymbolXSpacing,
            this.rules.ChordOverlapAllowedIntoNextMeasure,
          );
      }
    }

    return newElongationFactorForMeasureWidth;
  }

  public calculateMeasureWidthFromStaffEntries(measuresVertical: GraphicalMeasure[], oldMinimumStaffEntriesWidth: number): number {
    let elongationFactorForMeasureWidth: number = 1;

    for (const measure of measuresVertical) {
      if (!measure || measure.staffEntries.length === 0) {
        continue;
      }

      elongationFactorForMeasureWidth =
        this.calculateElongationFactorFromStaffEntries(
          measure.staffEntries,
          oldMinimumStaffEntriesWidth,
          elongationFactorForMeasureWidth,
          measure.MeasureNumber,
        );

    }
    elongationFactorForMeasureWidth = Math.min(elongationFactorForMeasureWidth, this.rules.MaximumLyricsElongationFactor);
    // TODO check when this is > 2.0. there seems to be an error here where this is unnecessarily > 2 in Beethoven Geliebte.

    const newMinimumStaffEntriesWidth: number = oldMinimumStaffEntriesWidth * elongationFactorForMeasureWidth;

    return newMinimumStaffEntriesWidth;
  }

  protected createGraphicalTie(tie: Tie, startGse: GraphicalStaffEntry, endGse: GraphicalStaffEntry,
                               startNote: GraphicalNote, endNote: GraphicalNote): GraphicalTie {
    return new GraphicalTie(tie, startNote, endNote);
  }


  protected updateStaffLineBorders(staffLine: StaffLine): void {
    staffLine.SkyBottomLineCalculator.updateStaffLineBorders();
  }

  protected graphicalMeasureCreatedCalculations(measure: GraphicalMeasure): void {
    (measure as VexFlowMeasure).rules = this.rules;
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
      for (let i: number = 0; i < graphicalNotes.length; i++) {
        graphicalNotes[i] = MusicSheetCalculator.stafflineNoteCalculator.positionNote(graphicalNotes[i]);
      }
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
  protected layoutArticulationMarks(articulations: Articulation[], voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
    // uncomment this when implementing:
    // let vfse: VexFlowStaffEntry = (graphicalStaffEntry as VexFlowStaffEntry);

    return;
  }

  /**
   * Calculate the shape (Bezier curve) for this tie.
   * @param tie
   * @param tieIsAtSystemBreak
   * @param isTab Whether this tie is for a tab note (guitar tabulature)
   */
  protected layoutGraphicalTie(tie: GraphicalTie, tieIsAtSystemBreak: boolean, isTab: boolean): void {
    const startNote: VexFlowGraphicalNote = (tie.StartNote as VexFlowGraphicalNote);
    const endNote: VexFlowGraphicalNote = (tie.EndNote as VexFlowGraphicalNote);

    let vfStartNote: Vex.Flow.StemmableNote  = undefined;
    let startNoteIndexInTie: number = 0;
    if (startNote && startNote.vfnote && startNote.vfnote.length >= 2) {
      vfStartNote = startNote.vfnote[0];
      startNoteIndexInTie = startNote.vfnote[1];
    }

    let vfEndNote: Vex.Flow.StemmableNote  = undefined;
    let endNoteIndexInTie: number = 0;
    if (endNote && endNote.vfnote && endNote.vfnote.length >= 2) {
      vfEndNote = endNote.vfnote[0];
      endNoteIndexInTie = endNote.vfnote[1];
    }

    if (tieIsAtSystemBreak) {
      // split tie into two ties:
      if (vfStartNote) { // first_note or last_note must be not null in Vexflow
        const vfTie1: Vex.Flow.StaveTie = new Vex.Flow.StaveTie({
          first_indices: [startNoteIndexInTie],
          first_note: vfStartNote
        });
        const measure1: VexFlowMeasure = (startNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
        measure1.vfTies.push(vfTie1);
      }

      if (vfEndNote) {
        const vfTie2: Vex.Flow.StaveTie = new Vex.Flow.StaveTie({
          last_indices: [endNoteIndexInTie],
          last_note: vfEndNote
        });
        const measure2: VexFlowMeasure = (endNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
        measure2.vfTies.push(vfTie2);
      }
    } else {
      // normal case
      if (vfStartNote || vfEndNote) { // one of these must be not null in Vexflow
        let vfTie: any;
        if (isTab) {
          if (tie.Tie.Type === "S") {
            //calculate direction
            const startTieNote: TabNote = <TabNote> tie.StartNote.sourceNote;
            const endTieNote: TabNote = <TabNote> tie.EndNote.sourceNote;
            let slideDirection: number = 1;
            if (startTieNote.FretNumber > endTieNote.FretNumber) {
              slideDirection = -1;
            }
            vfTie = new Vex.Flow.TabSlide(
              {
                first_indices: [startNoteIndexInTie],
                first_note: vfStartNote,
                last_indices: [endNoteIndexInTie],
                last_note: vfEndNote,
              },
              slideDirection
            );
          } else {
            vfTie = new Vex.Flow.TabTie(
              {
                first_indices: [startNoteIndexInTie],
                first_note: vfStartNote,
                last_indices: [endNoteIndexInTie],
                last_note: vfEndNote,
              },
              tie.Tie.Type
            );
          }

        } else { // not Tab (guitar), normal StaveTie
          vfTie = new Vex.Flow.StaveTie({
            first_indices: [startNoteIndexInTie],
            first_note: vfStartNote,
            last_indices: [endNoteIndexInTie],
            last_note: vfEndNote
          });
        }

        const measure: VexFlowMeasure = (endNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
        measure.vfTies.push(vfTie);
      }
    }
  }

  protected calculateDynamicExpressionsForMultiExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
    if (measureIndex < this.rules.MinMeasureToDrawIndex || measureIndex > this.rules.MaxMeasureToDrawIndex) {
      return;
      // we do already use the min/max in MusicSheetCalculator.calculateDynamicsExpressions,
      // but this may be necessary for StaffLinkedExpressions, not tested.
    }

    // calculate absolute Timestamp
    const absoluteTimestamp: Fraction = multiExpression.AbsoluteTimestamp;
    const measures: GraphicalMeasure[] = this.graphicalMusicSheet.MeasureList[measureIndex];
    const staffLine: StaffLine = measures[staffIndex].ParentStaffLine;
    const startMeasure: GraphicalMeasure = measures[staffIndex];

    const startPosInStaffline: PointF2D = this.getRelativePositionInStaffLineFromTimestamp(
      absoluteTimestamp,
      staffIndex,
      staffLine,
      staffLine?.isPartOfMultiStaffInstrument());

    const dynamicStartPosition: PointF2D = startPosInStaffline;
    if (startPosInStaffline.x <= 0) {
      dynamicStartPosition.x = startMeasure.beginInstructionsWidth + this.rules.RhythmRightMargin;
    }

    if (multiExpression.InstantaneousDynamic) {
      const graphicalInstantaneousDynamic: VexFlowInstantaneousDynamicExpression = new VexFlowInstantaneousDynamicExpression(
        multiExpression.InstantaneousDynamic,
        staffLine,
        startMeasure);
      this.calculateGraphicalInstantaneousDynamicExpression(graphicalInstantaneousDynamic, dynamicStartPosition);
    }
    if (multiExpression.StartingContinuousDynamic) {
      const continuousDynamic: ContinuousDynamicExpression = multiExpression.StartingContinuousDynamic;
      const graphicalContinuousDynamic: VexFlowContinuousDynamicExpression = new VexFlowContinuousDynamicExpression(
        multiExpression.StartingContinuousDynamic,
        staffLine,
        startMeasure.parentSourceMeasure);
      graphicalContinuousDynamic.StartMeasure = startMeasure;

      if (!graphicalContinuousDynamic.IsVerbal && continuousDynamic.EndMultiExpression) {
        try {
        this.calculateGraphicalContinuousDynamic(graphicalContinuousDynamic, dynamicStartPosition);
        } catch (e) {
          // TODO this sometimes fails when the measure range to draw doesn't include all the dynamic's measures, method needs to be adjusted
          //   see calculateGraphicalContinuousDynamic(), also in MusicSheetCalculator.

        }
      } else if (graphicalContinuousDynamic.IsVerbal) {
        this.calculateGraphicalVerbalContinuousDynamic(graphicalContinuousDynamic, dynamicStartPosition);
      } else {
        log.warn("This continuous dynamic is not covered");
      }
    }
  }

  protected createMetronomeMark(metronomeExpression: InstantaneousTempoExpression): void {
    // note: sometimes MeasureNumber is 0 here, e.g. in Christbaum, maybe because of pickup measure (auftakt)
    const measureNumber: number = Math.max(metronomeExpression.ParentMultiTempoExpression.SourceMeasureParent.MeasureNumber - 1, 0);
    const staffNumber: number = Math.max(metronomeExpression.StaffNumber - 1, 0);
    const firstMetronomeMark: boolean = measureNumber === 0 && staffNumber === 0;
    const vfStave: Vex.Flow.Stave = (this.graphicalMusicSheet.MeasureList[measureNumber][staffNumber] as VexFlowMeasure).getVFStave();
    //vfStave.addModifier(new Vex.Flow.StaveTempo( // needs Vexflow PR
    let vexflowDuration: string = "q";
    if (metronomeExpression.beatUnit) {
      const duration: Fraction = NoteTypeHandler.getNoteDurationFromType(metronomeExpression.beatUnit);
      vexflowDuration = VexFlowConverter.duration(duration, false);
    }

    let yShift: number = this.rules.MetronomeMarkYShift;
    let hasExpressionsAboveStaffline: boolean = false;
    for (const expression of metronomeExpression.parentMeasure.TempoExpressions) {
      const isMetronomeExpression: boolean = expression.InstantaneousTempo?.Enum === TempoEnum.metronomeMark;
      if (expression.getPlacementOfFirstEntry() === PlacementEnum.Above &&
          !isMetronomeExpression) {
        hasExpressionsAboveStaffline = true;
        break;
      }
    }
    if (hasExpressionsAboveStaffline) {
      yShift -= 1.4;
      // TODO improve this with proper skyline / collision detection. unfortunately we don't have a skyline here yet.
      // let maxSkylineBeginning: number = 0;
      // for (let i = 0; i < skyline.length / 1; i++) { // search in first 3rd, disregard end of measure
      //   maxSkylineBeginning = Math.max(skyline[i], maxSkylineBeginning);
      // }
      // console.log('max skyline: ' + maxSkylineBeginning);
    }
    const skyline: number[] = this.graphicalMusicSheet.MeasureList[0][0].ParentStaffLine.SkyLine;
    vfStave.setTempo(
      {
          bpm: metronomeExpression.TempoInBpm,
          dots: metronomeExpression.dotted,
          duration: vexflowDuration
      },
      yShift * unitInPixels);
       // -50, -30), 0); //needs Vexflow PR
       //.setShiftX(-50);
    const xShift: number = firstMetronomeMark ? this.rules.MetronomeMarkXShift * unitInPixels : 0;
    (<any>vfStave.getModifiers()[vfStave.getModifiers().length - 1]).setShiftX(
      xShift
    );
    // TODO calculate bounding box of metronome mark instead of hacking skyline to fix lyricist collision
    skyline[0] = Math.min(skyline[0], -4.5 + yShift);
    // somehow this is called repeatedly in Clementi, so skyline[0] = Math.min instead of -=
  }

  protected calculateRehearsalMark(measure: SourceMeasure): void {
    const rehearsalExpression: RehearsalExpression = measure.rehearsalExpression;
    if (!rehearsalExpression) {
      return;
    }
    const firstMeasureNumber: number = this.graphicalMusicSheet.MeasureList[0][0].MeasureNumber; // 0 for pickup, 1 otherwise
    const measureNumber: number = Math.max(measure.MeasureNumber - firstMeasureNumber, 0);
    const staffNumber: number = 0;
    const vfStave: Vex.Flow.Stave = (this.graphicalMusicSheet.MeasureList[measureNumber][staffNumber] as VexFlowMeasure).getVFStave();
    const yOffset: number = -this.rules.RehearsalMarkYOffsetDefault - this.rules.RehearsalMarkYOffset;
    let xOffset: number = this.rules.RehearsalMarkXOffsetDefault + this.rules.RehearsalMarkXOffset;
    if (measure.IsSystemStartMeasure) {
      xOffset += this.rules.RehearsalMarkXOffsetSystemStartMeasure;
    }
    // const section: Vex.Flow.StaveSection = new Vex.Flow.StaveSection(rehearsalExpression.label, vfStave.getX(), yOffset);
    // (vfStave as any).modifiers.push(section);
    const fontSize: number = this.rules.RehearsalMarkFontSize;
    (vfStave as any).setSection(rehearsalExpression.label, yOffset, xOffset, fontSize); // fontSize is an extra argument from VexFlowPatch
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
    const endTimeStamp: Fraction = octaveShift.ParentEndMultiExpression?.Timestamp;

    const minMeasureToDrawIndex: number = this.rules.MinMeasureToDrawIndex;
    const maxMeasureToDrawIndex: number = this.rules.MaxMeasureToDrawIndex;

    let startStaffLine: StaffLine = this.graphicalMusicSheet.MeasureList[measureIndex][staffIndex].ParentStaffLine;
    if (!startStaffLine) { // fix for rendering range set. all of these can probably done cleaner.
      startStaffLine = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex].ParentStaffLine;
    }

    let endMeasure: GraphicalMeasure = undefined;
    if (octaveShift.ParentEndMultiExpression) {
      endMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(octaveShift.ParentEndMultiExpression.SourceMeasureParent,
                                                                                         staffIndex);
    } else {
      endMeasure = this.graphicalMusicSheet.getLastGraphicalMeasureFromIndex(staffIndex, true); // get last rendered measure
    }
    if (endMeasure.MeasureNumber > maxMeasureToDrawIndex + 1) { // octaveshift ends in measure not rendered
      endMeasure = this.graphicalMusicSheet.getLastGraphicalMeasureFromIndex(staffIndex, true);
    }
    let startMeasure: GraphicalMeasure = undefined;
    if (octaveShift.ParentEndMultiExpression) {
      startMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(octaveShift.ParentStartMultiExpression.SourceMeasureParent,
                                                                                           staffIndex);
    } else {
      startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
    }
    if (startMeasure.MeasureNumber < minMeasureToDrawIndex + 1) { // octaveshift starts before range of measures selected to render
      startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
    }

    if (startMeasure.MeasureNumber < minMeasureToDrawIndex + 1 ||
        startMeasure.MeasureNumber > maxMeasureToDrawIndex + 1 ||
        endMeasure.MeasureNumber < minMeasureToDrawIndex + 1 ||
        endMeasure.MeasureNumber > maxMeasureToDrawIndex + 1) {
      // octave shift completely out of drawing range, don't draw anything
      return;
    }

    let endStaffLine: StaffLine = endMeasure.ParentStaffLine;
    if (!endStaffLine) {
      endStaffLine = startStaffLine;
    }

    if (endMeasure && startStaffLine && endStaffLine) {
      // calculate GraphicalOctaveShift and RelativePositions
      const graphicalOctaveShift: VexFlowOctaveShift = new VexFlowOctaveShift(octaveShift, startStaffLine.PositionAndShape);
      if (!graphicalOctaveShift.startNote) { // fix for rendering range set
        let startGse: GraphicalStaffEntry;
        for (const gse of startMeasure.staffEntries) {
          if (gse) {
            startGse = gse;
            break;
          } // sometimes the first graphical staff entry is undefined, not sure why.
        }
        if (!startGse) {
          return; // couldn't find a start staffentry, don't draw the octave shift
        }
        graphicalOctaveShift.setStartNote(startGse);
        if (!graphicalOctaveShift.startNote) {
          return; // couldn't find a start note, don't draw the octave shift
        }
      }
      if (!graphicalOctaveShift.endNote) { // fix for rendering range set
        let endGse: GraphicalStaffEntry;
        for (let i: number = endMeasure.staffEntries.length - 1; i >= 0; i++) {
          // search backwards from end of measure
          if (endMeasure.staffEntries[i]) {
            endGse = endMeasure.staffEntries[i];
            break;
          }
        }
        graphicalOctaveShift.setEndNote(endGse);
        if (!graphicalOctaveShift.endNote) {
          return;
        }
      }
      // calculate RelativePosition and Dashes
      let startStaffEntry: GraphicalStaffEntry = startMeasure.findGraphicalStaffEntryFromTimestamp(startTimeStamp);
      if (!startStaffEntry) { // fix for rendering range set
        startStaffEntry = startMeasure.staffEntries[0];
      }
      let endStaffEntry: GraphicalStaffEntry = endMeasure.findGraphicalStaffEntryFromTimestamp(endTimeStamp);
      if (!endStaffEntry) { // fix for rendering range set
        endStaffEntry = endMeasure.staffEntries[endMeasure.staffEntries.length - 1];
      }
      graphicalOctaveShift.setStartNote(startStaffEntry);

      if (endStaffLine !== startStaffLine) {
        graphicalOctaveShift.endsOnDifferentStaffLine = true;
        let lastMeasureOfFirstShift: GraphicalMeasure = startStaffLine.Measures[startStaffLine.Measures.length - 1];
        if (lastMeasureOfFirstShift === undefined) { // TODO handle this case correctly (when drawUpToMeasureNumber etc set)
          lastMeasureOfFirstShift = endMeasure;
        }
        const lastNoteOfFirstShift: GraphicalStaffEntry = lastMeasureOfFirstShift.staffEntries[lastMeasureOfFirstShift.staffEntries.length - 1];
        graphicalOctaveShift.setEndNote(lastNoteOfFirstShift);

        const systemsInBetweenCount: number = endStaffLine.ParentMusicSystem.Id - startStaffLine.ParentMusicSystem.Id;
        if (systemsInBetweenCount > 0) {
          //Loop through the stafflines in between to the end
          for (let i: number = startStaffLine.ParentMusicSystem.Id; i < endStaffLine.ParentMusicSystem.Id; i++) {
            const idx: number = i + 1;
            const nextShiftMusicSystem: MusicSystem = this.musicSystems[idx];
            const nextShiftStaffline: StaffLine = nextShiftMusicSystem.StaffLines[staffIndex];
            const nextShiftFirstMeasure: GraphicalMeasure = nextShiftStaffline.Measures[0];
            // Shift starts on the first measure
            const nextOctaveShift: VexFlowOctaveShift = new VexFlowOctaveShift(octaveShift, nextShiftFirstMeasure.PositionAndShape);

            if (i < systemsInBetweenCount) {
              nextOctaveShift.endsOnDifferentStaffLine = true;
            }

            let nextShiftLastMeasure: GraphicalMeasure = nextShiftStaffline.Measures[nextShiftStaffline.Measures.length - 1];
            const firstNote: GraphicalStaffEntry = nextShiftFirstMeasure.staffEntries[0];
            let lastNote: GraphicalStaffEntry = nextShiftLastMeasure.staffEntries[nextShiftLastMeasure.staffEntries.length - 1];

            //If the is the ending staffline, this endMeasure is the end of the shift
            if (endMeasure.ParentStaffLine === nextShiftStaffline) {
              nextShiftLastMeasure = endMeasure;
              lastNote = endStaffEntry;
            }

            nextOctaveShift.setStartNote(firstNote);
            nextOctaveShift.setEndNote(lastNote);
            nextShiftStaffline.OctaveShifts.push(nextOctaveShift);
            this.calculateOctaveShiftSkyBottomLine(firstNote, lastNote, nextOctaveShift, nextShiftStaffline);
          }
        }

        this.calculateOctaveShiftSkyBottomLine(startStaffEntry, lastNoteOfFirstShift, graphicalOctaveShift, startStaffLine);
      } else {
        graphicalOctaveShift.setEndNote(endStaffEntry);
        this.calculateOctaveShiftSkyBottomLine(startStaffEntry, endStaffEntry, graphicalOctaveShift, startStaffLine);
      }
      startStaffLine.OctaveShifts.push(graphicalOctaveShift);
    } else {
      log.warn("End measure or staffLines for octave shift are undefined! This should not happen!");
    }
  }

  private calculateOctaveShiftSkyBottomLine(startStaffEntry: GraphicalStaffEntry, endStaffEntry: GraphicalStaffEntry,
                                            vfOctaveShift: VexFlowOctaveShift, parentStaffline: StaffLine): void {

    let startXOffset: number = startStaffEntry.PositionAndShape.Size.width;
    let endXOffset: number = endStaffEntry.PositionAndShape.Size.width;

    //Vexflow renders differently with rests
    if (startStaffEntry.hasOnlyRests()) {
      startXOffset = -startXOffset;
    } else {
      startXOffset /= 2;
    }

    if (!endStaffEntry.hasOnlyRests()) {
      endXOffset /= 2;
    } else {
      endXOffset *= 2;
    }

    if (startStaffEntry === endStaffEntry) {
      endXOffset *= 2;
    }
    const startX: number = startStaffEntry.PositionAndShape.AbsolutePosition.x - startXOffset;
    const stopX: number = endStaffEntry.PositionAndShape.AbsolutePosition.x + endXOffset;
    vfOctaveShift.PositionAndShape.Size.width = startX - stopX;
    const textBracket: Vex.Flow.TextBracket = vfOctaveShift.getTextBracket();
    const fontSize: number = (textBracket as any).font.size / 10;

    if ((<any>textBracket).position === Vex.Flow.TextBracket.Positions.TOP) {
      const headroom: number = Math.ceil(parentStaffline.SkyBottomLineCalculator.getSkyLineMinInRange(startX, stopX));
      if (headroom === Infinity) { // will cause Vexflow error
        return;
      }
      (textBracket.start.getStave().options as any).top_text_position = Math.abs(headroom);
      parentStaffline.SkyBottomLineCalculator.updateSkyLineInRange(startX, stopX, headroom - fontSize * 2);
    } else {
      const footroom: number = parentStaffline.SkyBottomLineCalculator.getBottomLineMaxInRange(startX, stopX);
      if (footroom === Infinity) { // will cause Vexflow error
        return;
      }
      (textBracket.start.getStave().options as any).bottom_text_position = footroom;
      //Vexflow positions top vs. bottom text in a slightly inconsistent way it seems
      parentStaffline.SkyBottomLineCalculator.updateBottomLineInRange(startX, stopX, footroom + fontSize * 1.5);
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
    const measures: VexFlowMeasure[] = <VexFlowMeasure[]>this.graphicalMusicSheet.MeasureList[measureIndex];
    for (let idx: number = 0, len: number = measures.length; idx < len; ++idx) {
      const graphicalMeasure: VexFlowMeasure = measures[idx];
      if (graphicalMeasure && graphicalMeasure.ParentStaffLine && graphicalMeasure.ParentStaff.ParentInstrument.Visible) {
        uppermostMeasure = <VexFlowMeasure>graphicalMeasure;
        break;
      }
    }
    // ToDo: feature/Repetitions
    // now create corresponding graphical symbol or Text in VexFlow:
    // use top measure and staffline for positioning.
    if (uppermostMeasure) {
      uppermostMeasure.addWordRepetition(repetitionInstruction);
    }
  }

  /**
   * Re-adjust the x positioning of expressions. Update the skyline afterwards
   */
  protected calculateExpressionAlignements(): void {
    for (const musicSystem of this.musicSystems) {
      for (const staffLine of musicSystem.StaffLines) {
        try {
          (<VexFlowStaffLine>staffLine).AlignmentManager.alignDynamicExpressions();
          staffLine.AbstractExpressions.forEach(ae => {
            ae.updateSkyBottomLine();
          });
        } catch (e) {
          // TODO still necessary when calculation of expression fails, see calculateDynamicExpressionsForMultiExpression()
          //   see calculateGraphicalContinuousDynamic(), also in MusicSheetCalculator.
        }
      }
    }
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

      if (lyricsEntry.Word) {
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
  protected handleVoiceEntryArticulations(articulations: Articulation[],
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
    const openSlursDict: { [staffId: number]: GraphicalSlur[] } = {};
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

    for (const musicSystem of this.musicSystems) {
        for (const staffLine of musicSystem.StaffLines) {
          // if a graphical slur reaches out of the last musicsystem, we have to create another graphical slur reaching into this musicsystem
          // (one slur needs 2 graphical slurs)
          const openGraphicalSlurs: GraphicalSlur[] = openSlursDict[staffLine.ParentStaff.idInMusicSheet];
          for (let slurIndex: number = 0; slurIndex < openGraphicalSlurs.length; slurIndex++) {
            const oldGSlur: GraphicalSlur = openGraphicalSlurs[slurIndex];
            const newGSlur: GraphicalSlur = new GraphicalSlur(oldGSlur.slur, this.rules); //Graphicalslur.createFromSlur(oldSlur);
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
              // loop over "normal" notes (= no gracenotes)
              for (const graphicalVoiceEntry of graphicalStaffEntry.graphicalVoiceEntries) {
                for (const graphicalNote of graphicalVoiceEntry.notes) {
                  for (const slur of graphicalNote.sourceNote.NoteSlurs) {
                    // extra check for some MusicSheets that have openSlurs (because only the first Page is available -> Recordare files)
                    if (!slur.EndNote || !slur.StartNote) {
                      continue;
                    }
                    // add new VexFlowSlur to List
                    if (slur.StartNote === graphicalNote.sourceNote) {
                      if (graphicalNote.sourceNote.NoteTie) {
                        if (graphicalNote.parentVoiceEntry.parentStaffEntry.getAbsoluteTimestamp() !==
                          graphicalNote.sourceNote.NoteTie.StartNote.getAbsoluteTimestamp()) {
                          break;
                        }
                      }

                      // Add a Graphical Slur to the staffline, if the recent note is the Startnote of a slur
                      const gSlur: GraphicalSlur = new GraphicalSlur(slur, this.rules);
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

    // order slurs that were saved to the Staffline
    for (const musicSystem of this.musicSystems) {
          for (const staffLine of musicSystem.StaffLines) {
            // Sort all gSlurs in the staffline using the Compare function in class GraphicalSlurSorter
            const sortedGSlurs: GraphicalSlur[] = staffLine.GraphicalSlurs.sort(GraphicalSlur.Compare);
            for (const gSlur of sortedGSlurs) {
                // crossed slurs will be handled later:
                if (gSlur.slur.isCrossed()) {
                    continue;
                }
                gSlur.calculateCurve(this.rules);
            }
          }
        }
      }
  }
