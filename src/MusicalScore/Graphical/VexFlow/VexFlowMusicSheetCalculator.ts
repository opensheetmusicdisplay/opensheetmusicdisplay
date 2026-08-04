import { MusicSheetCalculator } from "../MusicSheetCalculator";
import { VexFlowGraphicalSymbolFactory } from "./VexFlowGraphicalSymbolFactory";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { StaffLine } from "../StaffLine";
import { SkyBottomLineBatchCalculator } from "../SkyBottomLineBatchCalculator";
import { SkyBottomLineCalculator } from "../SkyBottomLineCalculator";
import { Fonts } from "../../../Common/Enums/Fonts";
import { FontStyles } from "../../../Common/Enums/FontStyles";
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
import { OrnamentContainer, OrnamentEnum } from "../../VoiceData/OrnamentContainer";
import { Articulation } from "../../VoiceData/Articulation";
import { Tuplet } from "../../VoiceData/Tuplet";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { VexFlowTextMeasurer } from "./VexFlowTextMeasurer";
import * as VF from "vexflow/core";
import log from "loglevel";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";
import { VexFlowGraphicalNote } from "./VexFlowGraphicalNote";
import { TechnicalInstruction } from "../../VoiceData/Instructions/TechnicalInstruction";
import { GraphicalLyricEntry, LyricFootprint } from "../GraphicalLyricEntry";
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
import { InstantaneousTempoExpression, MetronomeNoteGroup, TempoType } from "../../VoiceData/Expressions/InstantaneousTempoExpression";
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
import { SystemLinesEnum } from "../SystemLinesEnum";
import { Pedal } from "../../VoiceData/Expressions/ContinuousExpressions/Pedal";
import { VexFlowPedal, VexFlowPedalStyles } from "./VexFlowPedal";
import { MusicSymbol } from "../MusicSymbol";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import { CollectionUtil } from "../../../Util/CollectionUtil";
import { GraphicalGlissando } from "../GraphicalGlissando";
import { Glissando } from "../../VoiceData/Glissando";
import { VexFlowGlissando } from "./VexFlowGlissando";
import { WavyLine } from "../../VoiceData/Expressions/ContinuousExpressions/WavyLine";
import { VexFlowVibratoBracket } from "./VexFlowVibratoBracket";
import { Staff } from "../../VoiceData/Staff";
import { getDoricoDefaultTextFontFamily } from "../DoricoTextFontRouting";
import { VexFlowSystemSpacingPlanner } from "./VexFlowHorizontalSpacing";
import { calculateLinkedSlurLayouts } from "../SlurLayout/SlurLinkedLayoutEngine";
import { SlurLinkedLayoutInput, SlurLinkedLayoutOutput } from "../SlurLayout/SlurLinkedLayoutEngine";
import { SlurCurveGeometry, SlurLayoutContext } from "../SlurLayout/SlurLayoutTypes";

interface ContainerEntryInfo {
  anchorX?: number;
  cumulativeOverlap: number;
  dashSpaceAtEnd?: number;
  extend: boolean;
  labelWidth: number;
  leftExtent?: number;
  measureMinimumWidth?: number;
  measureNumber: number;
  needsDashSpaceAtEnd?: boolean;
  rightExtent?: number;
  text: string;
  xPosition?: number;
}

type ContainerEntryDict = Record<string, ContainerEntryInfo>;
type ContainerOverflows = Record<string, number>;

export class VexFlowMusicSheetCalculator extends MusicSheetCalculator {
  public beamsNeedUpdate: boolean = false;
  /** Per-staff overflow of the previous measure's final chord symbol. */
  private previousChordOverflowsByStaff: Map<Staff, ContainerOverflows> = new Map<Staff, ContainerOverflows>();

  constructor(rules: EngravingRules) {
    super();
    this.rules = rules;
    MusicSheetCalculator.symbolFactory = new VexFlowGraphicalSymbolFactory();
    MusicSheetCalculator.TextMeasurer = new VexFlowTextMeasurer(this.rules);
    MusicSheetCalculator.stafflineNoteCalculator = new VexflowStafflineNoteCalculator(this.rules);

  }

  protected clearRecreatedObjects(): void {
    this.horizontalSystemSpacingPlanner?.clearAppliedPadding();
    super.clearRecreatedObjects();
    MusicSheetCalculator.stafflineNoteCalculator = new VexflowStafflineNoteCalculator(this.rules);
    // Reset the measure-to-measure carry state of the lyrics/chord symbol elongation calculation:
    // it is rebuilt during each render's width calculation, but without the reset, the trailing
    // overflow of the last lyric measure leaked into the *next* render's first measures
    // (when no later measure with staff entries overwrote it), making re-renders elongate
    // slightly differently than the first render.
    this.previousChordOverflowsByStaff.clear();
    for (const graphicalMeasures of this.graphicalMusicSheet.MeasureList) {
      for (const graphicalMeasure of graphicalMeasures) {
        (<VexFlowMeasure>graphicalMeasure)?.clean();
      }
    }
  }

  protected formatMeasures(): void {
    // let totalFinalizeBeamsTime: number = 0;
    for (const verticalMeasureList of this.graphicalMusicSheet.MeasureList) {
      const firstVisibleMeasure: VexFlowMeasure = verticalMeasureList?.find(
        measure => measure?.isVisible(),
      ) as VexFlowMeasure;
      if (!firstVisibleMeasure) {
        continue;
      }
      // first measure has formatting method as lambda function object, but formats all measures. TODO this could be refactored
      firstVisibleMeasure.format();
      for (const measure of verticalMeasureList) {
        if (!measure?.isVisible()) {
          continue;
        }
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

  protected prepareHorizontalSystemSpacing(): void {
    for (const verticalMeasures of this.graphicalMusicSheet.MeasureList) {
      const firstVisibleMeasure: VexFlowMeasure =
        verticalMeasures.find(
          (measure: GraphicalMeasure): boolean => !!measure?.isVisible(),
        ) as VexFlowMeasure;
      if (!firstVisibleMeasure?.formatVoices) {
        continue;
      }
      const minimumWidth: number = verticalMeasures.reduce(
        (width: number, measure: GraphicalMeasure): number =>
          Math.max(width, measure?.minimumStaffEntriesWidth ?? 0),
        0,
      );
      const contextsByTick: Map<number, VF.TickContext[]> =
        new Map<number, VF.TickContext[]>();
      for (const measure of verticalMeasures) {
        if (!measure?.isVisible()) {
          continue;
        }
        for (const staffEntry of measure.staffEntries) {
          for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
            const context: VF.TickContext =
              (voiceEntry as VexFlowVoiceEntry).vfStaveNote?.getTickContext?.();
            if (!context) {
              continue;
            }
            const tickId: number = context.getTickID();
            const contexts: VF.TickContext[] = contextsByTick.get(tickId) ?? [];
            if (!contexts.includes(context)) {
              contexts.push(context);
            }
            contextsByTick.set(tickId, contexts);
          }
        }
      }
      const hardMinimumWidthPx: number = Array.from(
        contextsByTick.values(),
      ).reduce(
        (total: number, contexts: VF.TickContext[]): number => {
          const groupedWidth: number = contexts.reduce(
            (width: number, context: VF.TickContext): number => {
              context.preFormat();
              return Math.max(width, context.getWidth());
            },
            0,
          );
          return total + groupedWidth;
        },
        0,
      );
      firstVisibleMeasure.formatVoices(
        Math.max(minimumWidth * unitInPixels, hardMinimumWidthPx),
        firstVisibleMeasure,
      );
      for (const measure of verticalMeasures) {
        if (!measure?.isVisible()) {
          continue;
        }
        for (const staffEntry of measure.staffEntries) {
          (staffEntry as VexFlowStaffEntry).calculateXPosition();
        }
      }
    }
    this.horizontalSystemSpacingPlanner = new VexFlowSystemSpacingPlanner(
      this.graphicalMusicSheet,
      this.rules,
    );
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
      if (measure?.isVisible()) { // if we don't check for visibility, invisible parts affect layout (#1444)
        visibleMeasures.push(measure);
      }
    }
    if (visibleMeasures.length === 0) { // e.g. after Multiple Rest measures (VexflowMultiRestMeasure)
      return 0;
    }
    measures = visibleMeasures;

    // Format the voices
    const allVoices: VF.Voice[] = [];
    const formatter: VF.Formatter = new VF.Formatter({
      // maxIterations: 2,
      softmaxFactor: this.rules.SoftmaxFactorVexFlow,
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
      const mvoices: { [voiceID: number]: VF.Voice } = (measure as VexFlowMeasure).vfVoices;
      const voices: VF.Voice[] = [];
      for (const voiceID in mvoices) {
        if (mvoices.hasOwnProperty(voiceID)) {
          const mvoice: any = mvoices[voiceID];
          if (measure.hasOnlyRests && !mvoice.ticksUsed.equals(mvoice.totalTicks)) {
            // fix layouting issues with whole measure rests in one staff and notes in other. especially in 12/8 rthythm (#1187)
            mvoice.ticksUsed = mvoice.totalTicks;
          }
          voices.push(mvoice);
          allVoices.push(mvoice);
        }
      }

      if (voices.length === 0) {
        log.debug("Found a measure with no voices. Continuing anyway.", mvoices);
        // no need to log this, measures with no voices/notes are fine. see OSMDOptions.fillEmptyMeasuresWithWholeRest
        continue;
      }
      // Reset formatting state left over from a previous render on the (reused) VexFlow notes back
      // to its initial values, so that all calculations read the same state on every render - it is
      // recalculated during each render anyway, but partly later than some readers:
      // - the center-aligned tickable x shift (only set for center-aligned tickables,
      //   i.e. whole measure rests):
      //   read by the early VexFlowStaffEntry.calculateXPosition() call below (Note.getAbsoluteX()).
      //   Without the reset, a re-render reads the previous render's centered whole rest position
      //   there, where the first render read the unshifted one - making e.g. the lyrics/chord symbol
      //   elongation of the following measures (and thus the whole layout) differ from the first render.
      // - the beam-applied stem extension (same reset pattern as the legacy beam post-format fix
      //   for #1636) and Stage 6's absolute slur/articulation clearance. Both are recalculated
      //   from final geometry later in this render and must not leak into the next rebuild.
      // - TabNote widths: TabNote.setStave() re-measures the fret text width once a stave has a
      //   rendering context, i.e. during the draws at the end of a render. updateWidth() restores
      //   the construction-time width (from VexFlow's glyph table), which is what the first
      //   render's width calculation saw.
      // - stemExtensionOverride: StaveNote.format()'s voice-collision handling shortens stems via
      //   setStemLength() during a render. Restore the value it had before the first render
      //   (usually none - but e.g. the tremolo-between-notes stem lengthening of VexFlowConverter
      //   sets it at creation, which must survive), snapshotted on the first render.
      // - rest positions: StaveNote.format()'s shiftRestVertical() moves colliding rests
      //   *relative* to their current line (possibly several times during the first render's
      //   format passes), and the moved line persists on the VexFlow note - so a re-render
      //   would move them even further. Freeze the rests at their converged first-render
      //   positions instead (same pattern as the existing shiftRestVerticalDisabled
      //   workaround for ledger-lined rests; centerRest() is absolute, i.e. harmless).
      for (const voice of voices) {
        for (const tickable of voice.getTickables()) {
          const note: any = tickable as any;
          note.setCenterXShift?.(0);
          if (note.osmdInitialStemExtensionOverride === undefined) {
            note.osmdInitialStemExtensionOverride = note.stemExtensionOverride ?? null; // first render: snapshot
          } else {
            note.stemExtensionOverride = note.osmdInitialStemExtensionOverride;
            if (note.isRest?.()) {
              note.shiftRestVerticalDisabled = true; // re-render: freeze rest at its current position
            }
          }
          if (note.stem && note.getStemExtension) {
            note.stem.setExtension(note.getStemExtension());
          }
          if (note.updateWidth && note.glyphs) { // TabNote
            note.updateWidth();
          }
          for (const modifier of note.modifiers ?? []) {
            if (modifier.getCategory?.() === VF.Articulation.CATEGORY) {
              modifier.setOutwardShift?.(0);
            }
          }
        }
      }
      // all voices that belong to one stave are collectively added to create a common context in VexFlow.
      formatter.joinVoices(voices);
    }

    let minStaffEntriesWidth: number = 12; // a typical measure has roughly a length of 3*StaffHeight (3*4 = 12)
    const parentSourceMeasure: SourceMeasure = measures[0].parentSourceMeasure;
    // the voicing space bonus addition makes the voicing more relaxed. With a bonus of 0 the notes are basically completely squeezed together.
    const staffEntryFactor: number = 0.3;

    if (allVoices.length > 0) {
      // A collapsed multi-rest in one part can leave its vertically aligned VexFlow voice with
      // a nominal duration of zero while another staff still contains the complete measure.
      // VexFlow 5 rejects such mixed nominal totals even for SOFT voices. Align the formatter's
      // nominal duration to the longest voice; the voice tickables and their ticksUsed remain
      // unchanged, so this only restores the common rhythmic coordinate range for the system.
      const formatterTotalTicks: VF.Fraction = allVoices.reduce(
        (longest: VF.Fraction, voice: VF.Voice): VF.Fraction => {
          const total: VF.Fraction = voice.getTotalTicks();
          return !longest || total.value() > longest.value() ? total : longest;
        },
        undefined,
      );
      for (const voice of allVoices) {
        const voiceTotalTicks: VF.Fraction = voice.getTotalTicks();
        if (!voiceTotalTicks.equals(formatterTotalTicks)) {
          voiceTotalTicks.copy(formatterTotalTicks);
        }
      }
      const formatterMinimumWidthPx: number = formatter.preCalculateMinTotalWidth(allVoices);
      const hardNotationWidth: number =
        formatter.getMinTotalWidth() / unitInPixels;
      if (parentSourceMeasure?.ImplicitMeasure) {
        // Preserve the compact preferred width used for pickups. The
        // system-level constraint planner subsequently floors this against
        // the pickup's actual right-hand notation extent and enforces every
        // cross-measure hard clearance.
        minStaffEntriesWidth =
          (
            formatterMinimumWidthPx / unitInPixels *
            this.rules.VoiceSpacingMultiplierVexflow +
            this.rules.VoiceSpacingAddendVexflow +
            maxStaffEntries * staffEntryFactor
          ) *
          parentSourceMeasure.Duration.RealValue /
          parentSourceMeasure.ActiveTimeSignature.RealValue;
        // e.g. a 1/4 pickup measure in a 3/4 time signature should be 1/4 / 3/4 = 1/3 as long (a third)
        // it seems like this should be respected by staffEntries.length and preCaculateMinTotalWidth, but apparently not,
        //   without this the pickup measures were always too long.

        let barlineSpacing: number = 0;
        const measureListIndex: number = parentSourceMeasure.measureListIndex;
        if (measureListIndex > 1) {
          // only give this implicit measure more space if the previous one had a thick barline (e.g. repeat end)
          for (const gMeasure of this.graphicalMusicSheet.MeasureList[measureListIndex - 1]) {
            const endingBarStyleEnum: SystemLinesEnum = gMeasure?.parentSourceMeasure.endingBarStyleEnum;
            if (endingBarStyleEnum === SystemLinesEnum.ThinBold ||
                endingBarStyleEnum === SystemLinesEnum.DotsThinBold
            ) {
              barlineSpacing = this.rules.PickupMeasureRepetitionSpacing;
              break;
            }
          }
        }
        minStaffEntriesWidth += barlineSpacing;
        // add more than the original staffEntries scaling again: (removing it above makes it too short)
        if (maxStaffEntries > 1) { // not necessary for only 1 StaffEntry
          minStaffEntriesWidth += maxStaffEntriesPlusAccidentals * staffEntryFactor * 1.5; // don't scale this for implicit measures
          // in fact overscale it, this needs a lot of space the more staffEntries (and modifiers like accidentals) there are
        } else if (measureListIndex > 1 && maxStaffEntries === 1) {
          // do this also for measures not after repetitions:
          minStaffEntriesWidth += this.rules.PickupMeasureSpacingSingleNoteAddend;
        }
        minStaffEntriesWidth *= this.rules.PickupMeasureWidthMultiplier;
      } else {
        const softStaffEntriesWidth: number =
          Math.max(0, formatterMinimumWidthPx / unitInPixels - hardNotationWidth)
          * this.rules.VoiceSpacingMultiplierVexflow
          + this.rules.VoiceSpacingAddendVexflow
          + maxStaffEntries * staffEntryFactor; // TODO use maxStaffEntriesPlusAccidentals here as well, adjust spacing
        minStaffEntriesWidth = softStaffEntriesWidth + hardNotationWidth;
      }

        // TODO this could use some fine-tuning. currently using *1.5 + 1 by default, results in decent spacing.
      // firstMeasure.formatVoices = (w: number) => {
      //     formatter.format(allVoices, w);
      // };
      MusicSheetCalculator.setMeasuresMinStaffEntriesWidth(measures, minStaffEntriesWidth);

      const formatVoicesDefault: (w: number, p: VexFlowMeasure) => VF.Formatter = (w, p) => {
        if (p.getVFStave().getWidth() > 0) {
          formatter.formatToStave(allVoices, p.getVFStave());
        } else {
          formatter.format(allVoices, w);
        }
        return formatter;
      };
      const formatVoicesAlignRests: (w: number,  p: VexFlowMeasure) => VF.Formatter = (w, p) => {
        if (p.getVFStave().getWidth() > 0) {
          formatter.formatToStave(allVoices, p.getVFStave(), {
            alignRests: true,
            context: undefined
          });
        } else {
          formatter.format(allVoices, w, {
            alignRests: true,
          });
        }
        return formatter;
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
    //Can't quite figure out why, but this is the calculation that needs redone to have consistent rendering.
    //The first render of a sheet vs. subsequent renders are calculated differently by vexflow without this re-joining of the voices
    for (const measure of measures) {
      if (!measure) {
        continue;
      }
      const mvoices: { [voiceID: number]: VF.Voice } = (measure as VexFlowMeasure).vfVoices;
      const voices: VF.Voice[] = [];
      for (const voiceID in mvoices) {
        if (mvoices.hasOwnProperty(voiceID)) {
          voices.push(mvoices[voiceID]);
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

    // calculateMeasureWidthFromLyrics() will be called from MusicSheetCalculator after this
    return minStaffEntriesWidth;
  }

  private calculateElongationFactor(containers: (GraphicalLyricEntry|GraphicalChordSymbolContainer)[],
                                    staffEntry: GraphicalStaffEntry, lastEntryDict: ContainerEntryDict,
                                    oldMinimumStaffEntriesWidth: number, elongationFactorForMeasureWidth: number,
                                    measureNumber: number, oldMinSpacing: number, nextMeasureOverlap: number): number {
    let newElongationFactorForMeasureWidth: number = elongationFactorForMeasureWidth;
    let currentContainerIndex: number = 0;

    for (const container of containers) {
      let minSpacing: number = oldMinSpacing;

      let overlapAllowedIntoNextMeasure: number = nextMeasureOverlap;
      let needsDashSpaceAtEnd: boolean = false;
      let dashSpaceAtEnd: number = 0;
      const containerKey: string = container instanceof GraphicalLyricEntry
        ? container.getLineIdentity()
        : String(currentContainerIndex);
      const previousEntry: ContainerEntryInfo = lastEntryDict[containerKey];

      if (container instanceof GraphicalLyricEntry && container.ParentLyricWord) {
        // spacing for multi-syllable words
        if (container.LyricsEntry.SyllableIndex > 0) { // syllables after first
          // Keep the measured dash between adjacent syllables in addition to
          // the configured breathing room around it.
          minSpacing = this.rules.BetweenSyllableMinimumDistance;
          if (previousEntry?.measureNumber === measureNumber && previousEntry.needsDashSpaceAtEnd) {
            minSpacing += previousEntry.dashSpaceAtEnd ?? 0;
          }
        }
        const syllables: LyricsEntry[] = container.ParentLyricWord.GetLyricWord.Syllables;
        if (syllables.length > 1) {
          if (container.LyricsEntry.SyllableIndex < syllables.length - 1) {
            needsDashSpaceAtEnd = true;
            dashSpaceAtEnd = container.getDashWidth();
            // if a middle syllable of a word, give less measure overlap into next measure, to give room for dash
            overlapAllowedIntoNextMeasure -= dashSpaceAtEnd;
          }
        }
      }

      const vexStaffEntry: VexFlowStaffEntry = staffEntry as VexFlowStaffEntry;
      const staffEntryXPosition: number = vexStaffEntry.PositionAndShape.RelativePosition.x;
      if (container instanceof GraphicalLyricEntry) {
        const alignment: TextAlignmentEnum = container.GraphicalLabel.Label.textAlignment;
        const footprint: LyricFootprint = container.getFootprint(staffEntryXPosition);

        if (previousEntry?.extend) {
          // TODO handle extend of last entry (extend is stored in lyrics entry of preceding syllable)
        }

        let lyricSpacingNeededToPreviousEntry: number = 0;
        let lyricCurrentSpacingToPreviousEntry: number = 0;
        if (previousEntry) {
          lyricCurrentSpacingToPreviousEntry = footprint.anchorX - previousEntry.anchorX;
          lyricSpacingNeededToPreviousEntry =
            previousEntry.rightExtent + footprint.leftExtent + minSpacing;
        }
        const lyricCurrentSpacingFromMeasureStart: number = footprint.anchorX;
        const lyricSpacingNeededFromMeasureStart: number = footprint.leftExtent + minSpacing;
        const lyricOverlapAllowedIntoNextMeasure: number = TextAlignment.IsCenterAligned(alignment)
          ? Math.min(overlapAllowedIntoNextMeasure, footprint.leftExtent)
          : overlapAllowedIntoNextMeasure;

        const roomToMeasureEnd: number = oldMinimumStaffEntriesWidth - footprint.anchorX;
        const lyricSpacingNeededToMeasureEnd: number =
          footprint.rightExtent - lyricOverlapAllowedIntoNextMeasure;

        let lyricElongationFactorForMeasureStart: number = 1;
        if (!previousEntry && lyricSpacingNeededFromMeasureStart > lyricCurrentSpacingFromMeasureStart) {
          if (lyricCurrentSpacingFromMeasureStart > 0) {
            lyricElongationFactorForMeasureStart =
              lyricSpacingNeededFromMeasureStart / lyricCurrentSpacingFromMeasureStart;
          } else {
            lyricElongationFactorForMeasureStart = this.rules.MaximumLyricsElongationFactor;
          }
        }

        let lyricElongationFactorForMeasureEnd: number = 1;
        if (lyricSpacingNeededToMeasureEnd > 0) {
          if (roomToMeasureEnd > 0) {
            lyricElongationFactorForMeasureEnd = lyricSpacingNeededToMeasureEnd / roomToMeasureEnd;
          } else {
            lyricElongationFactorForMeasureEnd =
              (footprint.anchorX + lyricSpacingNeededToMeasureEnd) / oldMinimumStaffEntriesWidth;
          }
        }

        let lyricElongationFactorForPreviousEntry: number = 1;
        if (previousEntry) {
          if (lyricCurrentSpacingToPreviousEntry > 0) {
            lyricElongationFactorForPreviousEntry =
              lyricSpacingNeededToPreviousEntry / lyricCurrentSpacingToPreviousEntry;
          } else if (lyricSpacingNeededToPreviousEntry > 0) {
            lyricElongationFactorForPreviousEntry = this.rules.MaximumLyricsElongationFactor;
          }
        }

        const elongationFactorForCurrentLyric: number = Math.max(
          1,
          lyricElongationFactorForMeasureStart,
          lyricElongationFactorForMeasureEnd,
          lyricElongationFactorForPreviousEntry,
        );
        newElongationFactorForMeasureWidth = Math.max(
          newElongationFactorForMeasureWidth,
          elongationFactorForCurrentLyric,
        );

        let lyricOverlap: number = Math.max(
          lyricSpacingNeededToPreviousEntry - lyricCurrentSpacingToPreviousEntry,
          0,
        );
        if (previousEntry) {
          lyricOverlap += previousEntry.cumulativeOverlap;
        }

        lastEntryDict[containerKey] = {
          anchorX: footprint.anchorX,
          cumulativeOverlap: lyricOverlap,
          dashSpaceAtEnd,
          extend: container.LyricsEntry.extend,
          labelWidth: footprint.labelWidth,
          leftExtent: footprint.leftExtent,
          measureMinimumWidth: oldMinimumStaffEntriesWidth,
          measureNumber: measureNumber,
          needsDashSpaceAtEnd: needsDashSpaceAtEnd,
          rightExtent: footprint.rightExtent,
          text: container.LyricsEntry.Text,
          xPosition: footprint.leftEdgeX,
        };
        continue;
      }

      const bBox: BoundingBox = container.PositionAndShape;
      const labelWidth: number = bBox.Size.width;
      let xPosition: number = staffEntryXPosition + bBox.BorderLeft;
      if (container.PositionAndShape.Parent.DataObject instanceof GraphicalMeasure) {
        xPosition = this.rules.ChordSymbolWholeMeasureRestXOffset + bBox.BorderMarginLeft +
          (container.PositionAndShape.Parent.DataObject as GraphicalMeasure).beginInstructionsWidth;
      }

      let spacingNeededToLastContainer: number;
      let currentSpacingToLastContainer: number;
      if (previousEntry) {
        currentSpacingToLastContainer = xPosition - previousEntry.xPosition;
      }

      const maxXInMeasure: number = oldMinimumStaffEntriesWidth * elongationFactorForMeasureWidth;

      // Chord containers can contain independently aligned grid cells. Their
      // aggregate bounding box is already the exact left/right footprint, so
      // applying the first label's alignment a second time under-reserves
      // centred or right-anchored slash constructions.
      const currentSpacingToMeasureEnd: number = maxXInMeasure - xPosition;
      const spacingNeededToMeasureEnd: number = labelWidth - overlapAllowedIntoNextMeasure;
      if (previousEntry) {
        spacingNeededToLastContainer = previousEntry.labelWidth + minSpacing;
      }

      let elongationFactorNeededForMeasureEnd: number;
      if (currentSpacingToMeasureEnd > 0) {
        elongationFactorNeededForMeasureEnd = spacingNeededToMeasureEnd / currentSpacingToMeasureEnd;
      } else {
        elongationFactorNeededForMeasureEnd = (xPosition + spacingNeededToMeasureEnd) / oldMinimumStaffEntriesWidth;
      }
      let elongationFactorNeededForLastContainer: number = 1;
      if (previousEntry) {
        elongationFactorNeededForLastContainer =
          spacingNeededToLastContainer / currentSpacingToLastContainer;
      }

      const elongationFactorForCurrentChord: number = Math.max(
        1,
        elongationFactorNeededForMeasureEnd,
        elongationFactorNeededForLastContainer,
      );
      newElongationFactorForMeasureWidth = Math.max(
        newElongationFactorForMeasureWidth,
        elongationFactorForCurrentChord,
      );

      let overlap: number = Math.max((spacingNeededToLastContainer - currentSpacingToLastContainer) || 0, 0);
      if (previousEntry) {
        overlap += previousEntry.cumulativeOverlap;
      }

      lastEntryDict[containerKey] = {
        cumulativeOverlap: overlap,
        dashSpaceAtEnd: 0,
        extend: false,
        labelWidth: labelWidth,
        measureMinimumWidth: oldMinimumStaffEntriesWidth,
        measureNumber: measureNumber,
        needsDashSpaceAtEnd: false,
        text: container.GraphicalLabel.Label.text,
        xPosition: xPosition,
      };

      currentContainerIndex++;
    }

    return newElongationFactorForMeasureWidth;
  }

  /**
   * @param previousLyricOverflows Retained for API compatibility. Lyric
   *   overflows are now represented by shared-column hard constraints.
   * @param previousChordOverflows Same as previousLyricOverflows but for chord symbols.
   * @returns
   *   - `factor`: residual chord-symbol elongation factor (subject to
   *     MaximumLyricsElongationFactor cap by the caller).
   *   - `lastLyricEntryDict`: empty compatibility result.
   *   - `lastChordEntryDict`: final state of each chord slot, used to
   *     compute overflow passed into the next measure.
   */
  public calculateElongationFactorFromStaffEntries(staffEntries: GraphicalStaffEntry[], oldMinimumStaffEntriesWidth: number,
                                                  elongationFactorForMeasureWidth: number, measureNumber: number,
                                                  previousLyricOverflows?: ContainerOverflows,
                                                  previousChordOverflows?: ContainerOverflows): {
    factor: number;
    lastLyricEntryDict: ContainerEntryDict;
    lastChordEntryDict: ContainerEntryDict;
  } {
    let newElongationFactorForMeasureWidth: number = elongationFactorForMeasureWidth;

    const lastLyricEntryDict: ContainerEntryDict = {};
    const lastChordEntryDict: ContainerEntryDict = {};

    // Lyric spacing is now represented by shared-column hard constraints.
    // Keep this public parameter for API compatibility, but do not seed the
    // removed measure-local lyric-overflow path.
    void previousLyricOverflows;
    if (previousChordOverflows) {
      for (const key of Object.keys(previousChordOverflows)) {
        const overflow: number = previousChordOverflows[key];
        if (overflow > 0) {
          lastChordEntryDict[key] = {
            cumulativeOverlap: 0,
            extend: false,
            labelWidth: overflow,
            measureNumber: measureNumber - 1,
            text: "",
            xPosition: 0,
          };
        }
      }
    }

    // Lyric spacing is solved before this residual pass. Keep only chord
    // symbols here until they are migrated to shared-column constraints.
    for (const staffEntry of staffEntries) {
      if (staffEntry.graphicalChordContainers.length > 0 && this.rules.RenderChordSymbols) {
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

    return {
      factor: newElongationFactorForMeasureWidth,
      lastLyricEntryDict,
      lastChordEntryDict,
    };
  }

  public calculateMeasureWidthFromStaffEntries(measuresVertical: GraphicalMeasure[], oldMinimumStaffEntriesWidth: number): number {
    let elongationFactorForMeasureWidth: number = 1;

    interface PerStaffResult {
      staff: Staff;
      lastLyricEntryDict: ContainerEntryDict;
      lastChordEntryDict: ContainerEntryDict;
    }
    const perStaffResults: PerStaffResult[] = [];
    const visibleStaves: Set<Staff> = new Set<Staff>();

    for (const measure of measuresVertical) {
      if (!measure || measure.staffEntries.length === 0 || !measure.isVisible()) {
        continue;
      }
      const staff: Staff = measure.ParentStaff;
      visibleStaves.add(staff);
      const previousChordOverflows: ContainerOverflows = this.previousChordOverflowsByStaff.get(staff);

      // (measure as VexFlowMeasure).format(); // needed to get vexflow bbox / x-position
      const result: {
        factor: number;
        lastLyricEntryDict: ContainerEntryDict;
        lastChordEntryDict: ContainerEntryDict;
      } =
        this.calculateElongationFactorFromStaffEntries(
          measure.staffEntries,
          oldMinimumStaffEntriesWidth,
          elongationFactorForMeasureWidth,
          measure.MeasureNumber,
          undefined,
          previousChordOverflows,
        );
      elongationFactorForMeasureWidth = result.factor;
      perStaffResults.push({
        staff,
        lastLyricEntryDict: result.lastLyricEntryDict,
        lastChordEntryDict: result.lastChordEntryDict,
      });
    }
    elongationFactorForMeasureWidth = Math.min(elongationFactorForMeasureWidth, this.rules.MaximumLyricsElongationFactor);
    // console.log(`elongationFactor for measure ${measuresVertical[0]?.MeasureNumber}: ${elongationFactorForMeasureWidth}`);
    // TODO check when this is > 2.0. See PR #1474

    const newMinimumStaffEntriesWidth: number = oldMinimumStaffEntriesWidth * elongationFactorForMeasureWidth;

    // Compute overflow of this measure's final chord symbol into the next
    // measure so the next residual pass can leave clearance for it.
    // overflow is measured against newMinimumStaffEntriesWidth (the bar position) using the same
    // pre-elongation xPosition convention used elsewhere in this calculator.
    for (const result of perStaffResults) {
      const chordOverflows: ContainerOverflows =
        this.computeContainerOverflows(result.lastChordEntryDict, newMinimumStaffEntriesWidth);
      this.previousChordOverflowsByStaff.set(result.staff, chordOverflows);
    }
    // For staves that were skipped (invisible or empty) this measure, drop
    // previous chord overflow so it doesn't get applied across a gap.
    for (const staff of Array.from(this.previousChordOverflowsByStaff.keys())) {
      if (!visibleStaves.has(staff)) {
        this.previousChordOverflowsByStaff.delete(staff);
      }
    }

    return newMinimumStaffEntriesWidth;
  }

  private computeContainerOverflows(lastEntryDict: ContainerEntryDict, measureWidth: number): ContainerOverflows {
    const overflows: ContainerOverflows = {};
    for (const key of Object.keys(lastEntryDict)) {
      const entry: ContainerEntryInfo = lastEntryDict[key];
      if (!entry) {
        continue;
      }
      let overflow: number;
      if (entry.anchorX !== undefined && entry.rightExtent !== undefined && entry.measureMinimumWidth) {
        const scale: number = measureWidth / entry.measureMinimumWidth;
        const rightEdge: number = entry.anchorX * scale + entry.rightExtent;
        overflow = Math.max(0, rightEdge - measureWidth);
      } else {
        const rightEdge: number = entry.xPosition + entry.labelWidth;
        overflow = Math.max(0, rightEdge - measureWidth);
      }
      // If this lyric is a multi-syllable mid-word, the next syllable is connected by a dash.
      // The previous-measure elongation already reserved the measured dash width via
      // overlapAllowedIntoNextMeasure -= dashSpaceAtEnd; the next measure's first lyric must clear
      // the dash too, otherwise the dash has no room to render between the two syllables.
      if (entry.needsDashSpaceAtEnd) {
        overflow += entry.dashSpaceAtEnd ?? 0;
      }
      overflows[key] = overflow;
    }
    return overflows;
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
    const assignTieSvgId: (vfTie: VF.StaveTie | VF.TabTie | VF.TabSlide) => void = (
      vfTie: VF.StaveTie | VF.TabTie | VF.TabSlide,
    ): void => {
      const tieAnchorId: string = startNote?.getSVGId?.() ?? endNote?.getSVGId?.();
      if (tieAnchorId) {
        (vfTie as any).setAttribute?.("id", `${tieAnchorId}-tie`);
      }
    };

    let vfStartNote: VF.StemmableNote  = undefined;
    let startNoteIndexInTie: number = 0;
    if (startNote && startNote.vfnote && startNote.vfnote.length >= 2) {
      vfStartNote = startNote.vfnote[0];
      startNoteIndexInTie = startNote.vfnote[1];
    }

    let vfEndNote: VF.StemmableNote  = undefined;
    let endNoteIndexInTie: number = 0;
    if (endNote && endNote.vfnote && endNote.vfnote.length >= 2) {
      vfEndNote = endNote.vfnote[0];
      endNoteIndexInTie = endNote.vfnote[1];
    }

    if (tieIsAtSystemBreak) {
      // split tie into two ties:
      if (vfStartNote) { // first_note or last_note must be not null in Vexflow
        const vfTie1: VF.StaveTie = new VF.StaveTie({
          firstIndexes: [startNoteIndexInTie],
          firstNote: vfStartNote
        });
        assignTieSvgId(vfTie1);
        const measure1: VexFlowMeasure = (startNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
        measure1.addStaveTie(vfTie1, tie);
      }

      if (vfEndNote) {
        const vfTie2: VF.StaveTie = new VF.StaveTie({
          lastIndexes: [endNoteIndexInTie],
          lastNote: vfEndNote
        });
        assignTieSvgId(vfTie2);
        const measure2: VexFlowMeasure = (endNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
        measure2.addStaveTie(vfTie2, tie);
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
            vfTie = new VF.TabSlide(
              {
                firstIndexes: [startNoteIndexInTie],
                firstNote: vfStartNote,
                lastIndexes: [endNoteIndexInTie],
                lastNote: vfEndNote,
              },
              slideDirection
            );
          } else {
            vfTie = new VF.TabTie(
              {
                firstIndexes: [startNoteIndexInTie],
                firstNote: vfStartNote,
                lastIndexes: [endNoteIndexInTie],
                lastNote: vfEndNote,
              },
              tie.Tie.Type
            );
          }

        } else { // not Tab (guitar), normal StaveTie
          vfTie = new VF.StaveTie({
            firstIndexes: [startNoteIndexInTie],
            firstNote: vfStartNote,
            lastIndexes: [endNoteIndexInTie],
            lastNote: vfEndNote
          });
          const tieDirection: PlacementEnum = tie.Tie.getTieDirection(startNote.sourceNote);
          if (tieDirection === PlacementEnum.Below) {
            vfTie.setDirection(1); // + is down in vexflow
          } else if (tieDirection === PlacementEnum.Above) {
            vfTie.setDirection(-1);
          }
        }

        assignTieSvgId(vfTie);
        const measure: VexFlowMeasure = (endNote.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
        measure.addStaveTie(vfTie, tie);
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

    // start position in staffline:
    // const useStaffEntryBorderLeft: boolean = multiExpression.StartingContinuousDynamic?.DynamicType === ContDynamicEnum.diminuendo;
    const continuousDynamic: ContinuousDynamicExpression = multiExpression.StartingContinuousDynamic;
    const useStaffEntryBorderLeft: boolean = continuousDynamic !== undefined && !continuousDynamic.IsStartOfSoftAccent;
    const dynamicStartPosition: PointF2D = this.getRelativePositionInStaffLineFromTimestamp(
      absoluteTimestamp,
      staffIndex,
      staffLine,
      staffLine?.isPartOfMultiStaffInstrument(),
      undefined,
      useStaffEntryBorderLeft
      );
    if (dynamicStartPosition.x <= 0) {
      dynamicStartPosition.x = startMeasure.beginInstructionsWidth + this.rules.RhythmRightMargin;
    }

    if (multiExpression.InstantaneousDynamic) {
      const graphicalInstantaneousDynamic: VexFlowInstantaneousDynamicExpression = new VexFlowInstantaneousDynamicExpression(
        multiExpression.InstantaneousDynamic,
        staffLine,
        startMeasure);
      // compare with multiExpression.InstantaneousDynamic.InMeasureTimestamp or add a relative timestamp? if we ever need a separate timestamp
      this.calculateGraphicalInstantaneousDynamicExpression(graphicalInstantaneousDynamic, dynamicStartPosition, absoluteTimestamp);
      this.dynamicExpressionMap.set(absoluteTimestamp.RealValue, graphicalInstantaneousDynamic.PositionAndShape);
    }
    if (continuousDynamic) {
      const graphicalContinuousDynamic: VexFlowContinuousDynamicExpression = new VexFlowContinuousDynamicExpression(
        continuousDynamic,
        staffLine,
        startMeasure.parentSourceMeasure);
      graphicalContinuousDynamic.StartMeasure = startMeasure;
      graphicalContinuousDynamic.IsSoftAccent = multiExpression.StartingContinuousDynamic.IsStartOfSoftAccent;
      //graphicalContinuousDynamic.StartIsEnd = multiExpression.StartingContinuousDynamic.EndMultiExpression === multiExpression;

      if (!graphicalContinuousDynamic.IsVerbal && continuousDynamic.EndMultiExpression) {
        try {
        this.calculateGraphicalContinuousDynamic(graphicalContinuousDynamic, dynamicStartPosition);
        graphicalContinuousDynamic.updateSkyBottomLine();
        } catch (e) {
          // TODO this sometimes fails when the measure range to draw doesn't include all the dynamic's measures, method needs to be adjusted
          //   see calculateGraphicalContinuousDynamic(), also in MusicSheetCalculator.

        }
      } else if (graphicalContinuousDynamic.IsVerbal) {
        this.calculateGraphicalVerbalContinuousDynamic(graphicalContinuousDynamic, dynamicStartPosition);
      } else {
        log.warn("This continuous dynamic is not covered. measure" + multiExpression.SourceMeasureParent.MeasureNumber);
      }
    }
  }

  protected createMetronomeMark(metronomeExpression: InstantaneousTempoExpression): void {
    // note: measureNumber is 0 for pickup measure
    const measureNumber: number = metronomeExpression.ParentMultiTempoExpression.SourceMeasureParent.MeasureNumber;
    const staffNumber: number = Math.max(metronomeExpression.StaffNumber - 1, 0);
    const vfMeasure: VexFlowMeasure =
      this.graphicalMusicSheet.findGraphicalMeasureByMeasureNumber(measureNumber, staffNumber) as VexFlowMeasure;
    const firstMetronomeMark: boolean = vfMeasure === this.graphicalMusicSheet.MeasureList[0][0];
    // const vfMeasure: VexFlowMeasure = (this.graphicalMusicSheet.MeasureList[measureNumber][staffNumber] as VexFlowMeasure);
    if (vfMeasure.hasMetronomeMark) {
      return; // don't create more than one metronome mark per measure;
      // TODO some measures still seem to have two metronome marks, one less bold than the other (or not bold),
      //   might be because of both <sound> node and <per-minute> node (within <metronome>) creating metronome marks
    }
    const vfStave: VF.Stave = vfMeasure.getVFStave();

    let yShift: number = this.rules.MetronomeMarkYShift;
    let hasExpressionsAboveStaffline: boolean = false;
    for (const expression of metronomeExpression.parentMeasure.TempoExpressions) {
      const isMetronomeExpression: boolean = expression.InstantaneousTempo?.TempoType === TempoType.metronomeMark;
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
    const skyline: number[] = this.graphicalMusicSheet.MeasureList[0][0].ParentStaffLine?.SkyLine;

    if (metronomeExpression.metronomeNoteGroupLeft && metronomeExpression.metronomeNoteGroupRight) {
      // Complex metronome mark (note equation, e.g. swing notation)
      const noteEquation: any = this.buildNoteEquationForVexFlow(
        metronomeExpression.metronomeNoteGroupLeft,
        metronomeExpression.metronomeNoteGroupRight
      );
      (vfStave as any).setTempo({ noteEquation }, yShift * unitInPixels);
    } else {
      // Simple metronome mark: note = BPM
      let vexflowDuration: string = "q";
      if (metronomeExpression.beatUnit) {
        const duration: Fraction = NoteTypeHandler.getNoteDurationFromType(metronomeExpression.beatUnit);
        vexflowDuration = VexFlowConverter.durations(duration, false)[0];
      }
      vfStave.setTempo(
        {
            bpm: metronomeExpression.TempoInBpm,
            dots: metronomeExpression.dotted ? 1 : 0,
            duration: vexflowDuration
        },
        yShift * unitInPixels);
    }

    const xShift: number = firstMetronomeMark ? this.rules.MetronomeMarkXShift * unitInPixels : 0;
    const lastModifier: any = vfStave.getModifiers()[vfStave.getModifiers().length - 1];
    lastModifier?.setXShift?.(xShift);
    lastModifier?.setShiftX?.(xShift);
    vfMeasure.hasMetronomeMark = true;
    if (skyline) {
      // TODO calculate bounding box of metronome mark instead of hacking skyline to fix lyricist collision
      skyline[0] = Math.min(skyline[0], -4.5 + yShift);
    }
    // somehow this is called repeatedly in Clementi, so skyline[0] = Math.min instead of -=
  }

  /** Convert MetronomeNoteGroup data into the format expected by VexFlow's StaveTempo.drawNoteEquation(). */
  private buildNoteEquationForVexFlow(left: MetronomeNoteGroup, right: MetronomeNoteGroup): any {
    const convertGroup: (group: MetronomeNoteGroup) => any = (group) => {
      const notes: any[] = group.notes.map(note => {
        const duration: Fraction = NoteTypeHandler.getNoteDurationFromType(note.type);
        const vfDuration: string = VexFlowConverter.durations(duration, false)[0];
        return {
          duration: vfDuration,
          dots: note.dots,
          beam: note.beam,
        };
      });
      const result: any = { notes };
      if (group.tuplet) {
        result.tuplet = {
          actualNotes: group.tuplet.actualNotes,
          normalNotes: group.tuplet.normalNotes,
          bracket: group.tuplet.bracket,
          showNumber: group.tuplet.showNumber,
        };
      }
      return result;
    };
    return {
      left: convertGroup(left),
      right: convertGroup(right),
    };
  }

  protected calculateRehearsalMark(measure: SourceMeasure): void {
    const rehearsalExpression: RehearsalExpression = measure.rehearsalExpression;
    if (!rehearsalExpression) {
      return;
    }
    const firstMeasureNumber: number = this.graphicalMusicSheet.MeasureList[0][0].MeasureNumber; // 0 for pickup, 1 otherwise
    const measureNumber: number = Math.max(measure.MeasureNumber - firstMeasureNumber, 0);
    // const staffNumber: number = 0;
    for (const gMeasure of this.graphicalMusicSheet.MeasureList[measureNumber]) {
      const vfStave: VF.Stave = (gMeasure as VexFlowMeasure)?.getVFStave();
      if (!vfStave || !gMeasure.isVisible()) { // potentially multi measure rest
        continue;
      }
      let yOffset: number = -this.rules.RehearsalMarkYOffsetDefault - this.rules.RehearsalMarkYOffset;
      if (gMeasure.parentSourceMeasure.isReducedToMultiRest) {
        // we could add other conditions here where we want more offset to avoid collisions
        yOffset += this.rules.RehearsalMarkYOffsetAddedForRehearsalMarks;
      }
      let xOffset: number = this.rules.RehearsalMarkXOffsetDefault + this.rules.RehearsalMarkXOffset;
      if (measure.IsSystemStartMeasure) {
        xOffset += this.rules.RehearsalMarkXOffsetSystemStartMeasure;
      }
      // const section: VF.StaveSection = new VF.StaveSection(rehearsalExpression.label, vfStave.getX(), yOffset);
      // (vfStave as any).modifiers.push(section);
      const fontSize: number = this.rules.RehearsalMarkFontSize;

      // Lift the rehearsal mark above whatever rises above the staff under it (high notes, an Above chord
      //   symbol, ...) so it doesn't overlap them, and reserve skyline space for the lifted mark (otherwise
      //   it can collide with the system above). The mark is a fixed-offset VexFlow StaveSection that isn't
      //   part of the skyline, so without this it can sit right on top of tall notes -- which happens in
      //   normal rendering (e.g. high drum-stave notes) and in lazy/incremental rendering (the mark's measure can be
      //   drawn at a slightly different x, over taller notes, than a normal render). Only the Above chord
      //   symbol was previously considered here; now the notes under the mark are too.
      let minBottomY: number; // undefined -> no clamping in the StaveSection draw path
      const staffLine: StaffLine = gMeasure.ParentStaffLine;
      if (staffLine) {
        // x-footprint of the rehearsal mark box at the measure start (absolute units, as the skyline is
        //   indexed). xOffset/fontSize are in px; the label width is a conservative estimate.
        let start: number = gMeasure.PositionAndShape.AbsolutePosition.x;
        const rehearsalTextFontFamily: string = getDoricoDefaultTextFontFamily(this.rules);
        const rehearsalTextWidthUnits: number = MusicSheetCalculator.TextMeasurer.computeTextWidthToHeightRatio(
          rehearsalExpression.label,
          Fonts.TimesNewRoman,
          FontStyles.Bold,
          rehearsalTextFontFamily,
        ) * (fontSize / unitInPixels);
        const rehearsalBoxWidthUnits: number = Math.max(rehearsalTextWidthUnits + 0.6, 18 / unitInPixels);
        let end: number = start + xOffset / unitInPixels + rehearsalBoxWidthUnits;
        // also clear an Above chord symbol in the measure: it is placed (calculateChordSymbols, earlier)
        //   against the skyline and can sit right where the mark goes, possibly beyond the mark's footprint.
        const chord: GraphicalChordSymbolContainer = this.rules.RehearsalMarkAboveChordSymbol
          ? this.getFirstChordSymbolAbove(gMeasure) : undefined;
        if (chord) {
          const containerPsh: BoundingBox = chord.PositionAndShape;
          const xInUnits: number = containerPsh.Parent.AbsolutePosition.x + containerPsh.RelativePosition.x;
          start = Math.min(start, containerPsh.BorderMarginLeft + xInUnits);
          end = Math.max(end, containerPsh.BorderMarginRight + xInUnits);
        }
        // highest element above the staff line under the mark (negative = above it), read from the skyline
        //   (final by now: updated by calculateSkyBottomLines + calculateChordSymbols, both earlier).
        const topRelative: number = staffLine.SkyBottomLineCalculator.getSkyLineMinInRange(start, end);
        if (topRelative < 0) { // only lift if something actually rises above the staff here
          const marginInUnits: number = 0.5; // small gap between mark bottom and what's below it
          // StaveSection.draw() shifts the mark up so its box bottom doesn't exceed
          //   stave.getYForLine(0) + minBottomY (px), keeping the mark above that element:
          minBottomY = (topRelative - marginInUnits) * unitInPixels;
          // reserve skyline over the range so updateStaffLineBorders/calculateSystemYLayout make room for the lifted mark
          const markHeightInUnits: number = fontSize / unitInPixels * 1.6 + marginInUnits; // conservative StaveSection box height
          staffLine.SkyBottomLineCalculator.updateSkyLineInRange(start, end, topRelative - markHeightInUnits);
        }
      }

      // fontSize and minBottomY are extra arguments on the current setSection() path.
      (vfStave as any).setSection(
        rehearsalExpression.label,
        yOffset,
        xOffset,
        fontSize,
        minBottomY,
        getDoricoDefaultTextFontFamily(this.rules),
      );
      return; // only draw one rehearsal mark at top (visible) instrument
    }
  }

  /** Returns the leftmost (smallest x) Above-placed chord symbol container in the measure, or undefined if there is none.
   *  The rehearsal mark sits at the measure start, so this is the chord it can collide with (see calculateRehearsalMark). */
  private getFirstChordSymbolAbove(gMeasure: GraphicalMeasure): GraphicalChordSymbolContainer {
    let first: GraphicalChordSymbolContainer = undefined;
    let firstX: number = Number.MAX_VALUE;
    for (const staffEntry of gMeasure.staffEntries) {
      for (const chordContainer of staffEntry.graphicalChordContainers ?? []) {
        if (chordContainer.GetChordSymbolContainer.Placement !== PlacementEnum.Above) {
          continue;
        }
        const x: number = chordContainer.PositionAndShape.AbsolutePosition.x; // x layout is final here, unlike y
        if (x < firstX) {
          firstX = x;
          first = chordContainer;
        }
      }
    }
    return first;
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
    if (!startStaffLine) { // fix for rendering range set. all of these can probably be done cleaner.
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
    if (octaveShift.ParentStartMultiExpression) {
      startMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(octaveShift.ParentStartMultiExpression.SourceMeasureParent,
                                                                                           staffIndex);
    } else {
      startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
    }
    if (startMeasure.MeasureNumber < minMeasureToDrawIndex + 1) { // octaveshift starts before range of measures selected to render
      startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
    }

    if (startMeasure.parentSourceMeasure.measureListIndex < minMeasureToDrawIndex ||
        startMeasure.parentSourceMeasure.measureListIndex > maxMeasureToDrawIndex ||
        endMeasure.parentSourceMeasure.measureListIndex < minMeasureToDrawIndex ||
        endMeasure.parentSourceMeasure.measureListIndex > maxMeasureToDrawIndex) {
      // completely out of drawing range, don't draw anything
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
        if (!endGse) {
          // shouldn't happen, but apparently some MusicXMLs (GuitarPro/Sibelius) have measures without StaffEntries.
          graphicalOctaveShift.graphicalEndAtMeasureEnd = true;
          return;
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
      if (!endStaffEntry && endTimeStamp) {
        // endTimeStamp can be undefined for an unterminated octave-shift (start without stop,
        //   e.g. from OMR-generated MusicXML), see #1439 / #1376 for similar cases.
        // No exact match (e.g. pending stop with computed inclusive end).
        // Find the latest staff entry at or before the end timestamp.
        for (let i: number = endMeasure.staffEntries.length - 1; i >= 0; i--) {
          const entry: GraphicalStaffEntry = endMeasure.staffEntries[i];
          if (entry.relInMeasureTimestamp?.lte(endTimeStamp)) {
            endStaffEntry = entry;
            break;
          }
        }
      }
      if (!endStaffEntry) { // fix for rendering range set
        endStaffEntry = endMeasure.staffEntries[endMeasure.staffEntries.length - 1];
      }
      graphicalOctaveShift.setStartNote(startStaffEntry);

      if (endStaffLine !== startStaffLine) {
        graphicalOctaveShift.endsOnDifferentStaffLine = true;
        let lastMeasureOfFirstShift: GraphicalMeasure = this.findLastStafflineMeasure(startStaffLine);
        if (lastMeasureOfFirstShift === undefined) { // TODO handle this case correctly (e.g. when no staffentries found above or drawUpToMeasureNumber set)
          lastMeasureOfFirstShift = endMeasure;
        }
        const lastNoteOfFirstShift: GraphicalStaffEntry = lastMeasureOfFirstShift.staffEntries[lastMeasureOfFirstShift.staffEntries.length - 1];
        graphicalOctaveShift.setEndNote(lastNoteOfFirstShift);
        graphicalOctaveShift.graphicalEndAtMeasureEnd = true;
        graphicalOctaveShift.endMeasure = lastMeasureOfFirstShift;

        const systemsInBetweenCount: number = endStaffLine.ParentMusicSystem.Id - startStaffLine.ParentMusicSystem.Id;
        if (systemsInBetweenCount > 0) {
          //Loop through the stafflines in between to the end
          for (let i: number = startStaffLine.ParentMusicSystem.Id; i < endStaffLine.ParentMusicSystem.Id; i++) {
            const idx: number = i + 1;
            const nextShiftMusicSystem: MusicSystem = this.musicSystems[idx];
            let nextShiftStaffline: StaffLine; // not always = nextShiftMusicSystem.StaffLines[staffIndex], e.g. when first instrument invisible
            for (const staffline of nextShiftMusicSystem.StaffLines) {
              if (staffline.ParentStaff.idInMusicSheet === staffIndex) {
                nextShiftStaffline = staffline;
                break;
              }
            }
            if (!nextShiftStaffline) { // shouldn't happen
              continue;
            }
            const nextShiftFirstMeasure: GraphicalMeasure = nextShiftStaffline.Measures[0];
            // Shift starts on the first measure
            const nextOctaveShift: VexFlowOctaveShift = new VexFlowOctaveShift(octaveShift, nextShiftFirstMeasure.PositionAndShape);
            let nextShiftLastMeasure: GraphicalMeasure = this.findLastStafflineMeasure(nextShiftStaffline);

            if (i < endStaffLine.ParentMusicSystem.Id - 1) {
              // "in-between" staffline before the staffline where the octave shift ends: make octave shift go to end of staffline
              nextOctaveShift.endsOnDifferentStaffLine = true;
              nextOctaveShift.graphicalEndAtMeasureEnd = true;
              nextOctaveShift.endMeasure = nextShiftLastMeasure;
              // this is tested by the sample test_octaveshift_multiline_grace_notes.musicxml (see PR #1646)
            }
            const firstNote: GraphicalStaffEntry = nextShiftFirstMeasure.staffEntries[0];
            let lastNote: GraphicalStaffEntry = nextShiftLastMeasure.staffEntries[nextShiftLastMeasure.staffEntries.length - 1];

            //If the end measure's staffline is the ending staffline, this endMeasure is the end of the shift
            if (endMeasure.ParentStaffLine === nextShiftStaffline) {
              nextShiftLastMeasure = endMeasure;
              lastNote = endStaffEntry;
            }

            if (lastNote.graphicalVoiceEntries.length === 1 &&
              lastNote.graphicalVoiceEntries[0].notes.length === 1 &&
              lastNote.graphicalVoiceEntries[0].notes[0].sourceNote.isWholeMeasureNote()
            ) {
              // also draw octaveshift until end of measure if we have a whole note that goes over the whole measure
              nextOctaveShift.graphicalEndAtMeasureEnd = true;
              nextOctaveShift.endMeasure = nextShiftLastMeasure;
            }

            const logPrefix: string = "VexFlowMusicSheetCalculator.calculateSingleOctaveShift: ";
            if (!firstNote) {
              log.warn(logPrefix + "no firstNote found");
            }
            if (!lastNote) {
              log.warn(logPrefix + "no lastNote found");
            }
            nextOctaveShift.setStartNote(firstNote);
            const endIdx: number = endMeasure.ParentStaffLine === nextShiftStaffline && octaveShift.endVoiceEntryIndex > 0
              ? octaveShift.endVoiceEntryIndex : -1;
            nextOctaveShift.setEndNote(lastNote, endIdx);
            nextShiftStaffline.OctaveShifts.push(nextOctaveShift);
            this.calculateOctaveShiftSkyBottomLine(firstNote, lastNote, nextOctaveShift, nextShiftStaffline);
          }
        }

        this.calculateOctaveShiftSkyBottomLine(startStaffEntry, lastNoteOfFirstShift, graphicalOctaveShift, startStaffLine);
      } else {
        graphicalOctaveShift.setEndNote(endStaffEntry, octaveShift.endVoiceEntryIndex > 0 ? octaveShift.endVoiceEntryIndex : -1);
        this.calculateOctaveShiftSkyBottomLine(startStaffEntry, endStaffEntry, graphicalOctaveShift, startStaffLine);
      }
      startStaffLine.OctaveShifts.push(graphicalOctaveShift);
    } else {
      log.warn("End measure or staffLines for octave shift are undefined! This should not happen!");
    }
  }

  /** Finds the last staffline measure that has staffentries. (staffentries necessary for octaveshift and pedal) */
  protected findLastStafflineMeasure(staffline: StaffLine): GraphicalMeasure {
    for (let i: number = staffline.Measures.length - 1; i >= 0; i--) {
      const measure: GraphicalMeasure = staffline.Measures[i];
      if (measure.staffEntries.length > 0) {
        return measure;
        // a measure can have no staff entries if e.g. measure.IsExtraGraphicalMeasure, used to show key/rhythm changes.
      }
      // else continue with the measure before this one
    }
  }

  protected calculateSinglePedal(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
    // calculate absolute Timestamp and startStaffLine (and EndStaffLine if needed)
    const pedal: Pedal = multiExpression.PedalStart;

    const startTimeStamp: Fraction = pedal.ParentStartMultiExpression.Timestamp;
    const endTimeStamp: Fraction = pedal.ParentEndMultiExpression?.Timestamp;

    const minMeasureToDrawIndex: number = this.rules.MinMeasureToDrawIndex;
    const maxMeasureToDrawIndex: number = this.rules.MaxMeasureToDrawIndex;

    let startStaffLine: StaffLine = this.graphicalMusicSheet.MeasureList[measureIndex][staffIndex].ParentStaffLine;
    if (!startStaffLine) { // fix for rendering range set. all of these can probably be done cleaner.
      startStaffLine = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex].ParentStaffLine;
    }
    let endMeasure: GraphicalMeasure = undefined;
    if (pedal.ParentEndMultiExpression) {
      endMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(pedal.ParentEndMultiExpression.SourceMeasureParent,
                                                                                          staffIndex);
    } else {
      //return; // also possible: don't handle faulty pedal without end
      endMeasure = this.graphicalMusicSheet.getLastGraphicalMeasureFromIndex(staffIndex, true); // get last rendered measure
    }
    if (endMeasure.MeasureNumber > maxMeasureToDrawIndex + 1) { //  ends in measure not rendered
      endMeasure = this.graphicalMusicSheet.getLastGraphicalMeasureFromIndex(staffIndex, true);
    }
    let startMeasure: GraphicalMeasure = undefined;
    if (pedal.ParentEndMultiExpression) {
      startMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(pedal.ParentStartMultiExpression.SourceMeasureParent,
        staffIndex);
    } else {
      startMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(
        pedal.ParentStartMultiExpression.SourceMeasureParent,
        staffIndex);
      if (!startMeasure) {
        startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
      }
      //console.log("no end multi expression for start measure " + startMeasure.MeasureNumber);
    }
    if (startMeasure.MeasureNumber < minMeasureToDrawIndex + 1) { //  starts before range of measures selected to render
      startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
    }

    if (startMeasure.parentSourceMeasure.measureListIndex < minMeasureToDrawIndex ||
        startMeasure.parentSourceMeasure.measureListIndex > maxMeasureToDrawIndex ||
        endMeasure.parentSourceMeasure.measureListIndex < minMeasureToDrawIndex ||
        endMeasure.parentSourceMeasure.measureListIndex > maxMeasureToDrawIndex) {
      // completely out of drawing range, don't draw anything
      return;
    }

    let endStaffLine: StaffLine = endMeasure.ParentStaffLine;
    if (!endStaffLine) {
      endStaffLine = startStaffLine;
    }
    if (endMeasure && startStaffLine && endStaffLine) {
      let openEnd: boolean = false;
      if (startStaffLine !== endStaffLine) {
        openEnd = true;
      }
      // calculate GraphicalPedal and RelativePositions
      const graphicalPedal: VexFlowPedal = new VexFlowPedal(pedal, startStaffLine.PositionAndShape, false, openEnd);
      graphicalPedal.setEndsStave(endMeasure, endTimeStamp); // unfortunately this can't already be checked in ExpressionReader
      // calculate RelativePosition
      let startStaffEntry: GraphicalStaffEntry = startMeasure.findGraphicalStaffEntryFromTimestamp(startTimeStamp);
      if (!startStaffEntry) { // fix for rendering range set
        startStaffEntry = startMeasure.staffEntries[0];
      }
      let endStaffEntry: GraphicalStaffEntry = endMeasure.findGraphicalStaffEntryFromTimestamp(endTimeStamp);
      if (!endStaffEntry) { // fix for rendering range set
        endStaffEntry = endMeasure.staffEntries[endMeasure.staffEntries.length - 1];
        // TODO can be undefined if no notes in end measure
      }
      if (!graphicalPedal.setStartNote(startStaffEntry)){
        return;
      }
      graphicalPedal.setBeginsStave(graphicalPedal.startNote.isRest(), startTimeStamp);

      if (endStaffLine !== startStaffLine) {
        if(graphicalPedal.pedalSymbol === MusicSymbol.PEDAL_SYMBOL){
          graphicalPedal.setEndNote(endStaffEntry);
          graphicalPedal.setEndMeasure(endMeasure);
          graphicalPedal.ReleaseText = " ";
          graphicalPedal.CalculateBoundingBox();
          this.calculatePedalSkyBottomLine(graphicalPedal.startVfVoiceEntry, graphicalPedal.endVfVoiceEntry, graphicalPedal, startStaffLine);

          const nextPedalFirstMeasure: GraphicalMeasure = endStaffLine.Measures[0];
          // pedal starts on the first measure
          const nextPedal: VexFlowPedal = new VexFlowPedal(pedal, nextPedalFirstMeasure.PositionAndShape);
          graphicalPedal.setEndsStave(endMeasure, endTimeStamp);
          const firstNote: GraphicalStaffEntry = nextPedalFirstMeasure.staffEntries[0];
          if(!nextPedal.setStartNote(firstNote)){
            return;
          }
          nextPedal.setEndNote(endStaffEntry);
          nextPedal.setEndMeasure(endMeasure);
          graphicalPedal.setEndMeasure(endMeasure);
          endStaffLine.Pedals.push(nextPedal);
          nextPedal.CalculateBoundingBox();
          nextPedal.DepressText = " ";
          this.calculatePedalSkyBottomLine(nextPedal.startVfVoiceEntry, nextPedal.endVfVoiceEntry, nextPedal, endStaffLine);
        } else {
          let lastMeasureOfFirstShift: GraphicalMeasure = this.findLastStafflineMeasure(startStaffLine);
          if (lastMeasureOfFirstShift === undefined) { // TODO handle this case correctly (when drawUpToMeasureNumber etc set)
            lastMeasureOfFirstShift = endMeasure;
          }
          const lastNoteOfFirstShift: GraphicalStaffEntry = lastMeasureOfFirstShift.staffEntries[lastMeasureOfFirstShift.staffEntries.length - 1];
          graphicalPedal.setEndNote(lastNoteOfFirstShift);
          graphicalPedal.setEndMeasure(endMeasure);
          graphicalPedal.ChangeEnd = false;

          const systemsInBetweenCount: number = endStaffLine.ParentMusicSystem.Id - startStaffLine.ParentMusicSystem.Id;
          if (systemsInBetweenCount > 0) {
            //Loop through the stafflines in between to the end
            let currentCount: number = 1;
            for (let i: number = startStaffLine.ParentMusicSystem.Id; i < endStaffLine.ParentMusicSystem.Id; i++) {
              const nextPedalMusicSystem: MusicSystem = this.musicSystems[i + 1];
              const nextPedalStaffline: StaffLine = nextPedalMusicSystem.StaffLines[staffIndex];
              const nextPedalFirstMeasure: GraphicalMeasure = nextPedalStaffline.Measures[0];
              let nextOpenEnd: boolean = false;
              let nextChangeEndFromParent: boolean = false;
              if (currentCount < systemsInBetweenCount) {
                nextOpenEnd = true;
              } else {
                nextChangeEndFromParent = true;
              }
              currentCount++;
              // pedal starts on the first measure
              const nextPedal: VexFlowPedal = new VexFlowPedal(pedal, nextPedalFirstMeasure.PositionAndShape, true, nextOpenEnd);
              graphicalPedal.setEndsStave(endMeasure, endTimeStamp);
              nextPedal.ChangeBegin = false;
              if(nextChangeEndFromParent){
                nextPedal.ChangeEnd = pedal.ChangeEnd;
              } else {
                nextPedal.ChangeEnd = false;
              }
              let nextPedalLastMeasure: GraphicalMeasure = this.findLastStafflineMeasure(nextPedalStaffline);
              const firstNote: GraphicalStaffEntry = nextPedalFirstMeasure.staffEntries[0];
              let lastNote: GraphicalStaffEntry = nextPedalLastMeasure.staffEntries[nextPedalLastMeasure.staffEntries.length - 1];

              //If the end measure's staffline is the ending staffline, this endMeasure is the end of the pedal
              if (endMeasure.ParentStaffLine === nextPedalStaffline) {
                nextPedalLastMeasure = endMeasure;
                nextPedal.setEndMeasure(endMeasure);
                lastNote = endStaffEntry;
              } else {
                nextPedal.setEndMeasure(nextPedalStaffline.Measures.last());
              }
              if(!nextPedal.setStartNote(firstNote)){
                break;
              }
              nextPedal.setEndNote(lastNote);
              graphicalPedal.setEndMeasure(endMeasure);
              nextPedalStaffline.Pedals.push(nextPedal);
              nextPedal.CalculateBoundingBox();
              this.calculatePedalSkyBottomLine(nextPedal.startVfVoiceEntry, nextPedal.endVfVoiceEntry, nextPedal, nextPedalStaffline);
            }
          }
          graphicalPedal.CalculateBoundingBox();
          this.calculatePedalSkyBottomLine(graphicalPedal.startVfVoiceEntry, graphicalPedal.endVfVoiceEntry, graphicalPedal, startStaffLine);
        }
      } else {
        graphicalPedal.setEndNote(endStaffEntry);
        graphicalPedal.setEndMeasure(endMeasure);
        graphicalPedal.CalculateBoundingBox();
        this.calculatePedalSkyBottomLine(graphicalPedal.startVfVoiceEntry, graphicalPedal.endVfVoiceEntry, graphicalPedal, startStaffLine);
      }
      startStaffLine.Pedals.push(graphicalPedal);
    } else {
      log.warn("End measure or staffLines for pedal are undefined! This should not happen!");
    }
  }

  protected calculateSingleWavyLine(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
    // calculate absolute Timestamp and startStaffLine (and EndStaffLine if needed)
    const wavyLine: WavyLine = multiExpression.WavyLineStart;

    const startTimeStamp: Fraction = wavyLine.ParentStartMultiExpression.Timestamp;
    const endTimeStamp: Fraction = wavyLine.ParentEndMultiExpression?.Timestamp;

    const minMeasureToDrawIndex: number = this.rules.MinMeasureToDrawIndex;
    const maxMeasureToDrawIndex: number = this.rules.MaxMeasureToDrawIndex;

    let startStaffLine: StaffLine = this.graphicalMusicSheet.MeasureList[measureIndex][staffIndex].ParentStaffLine;
    if (!startStaffLine) { // fix for rendering range set. all of these can probably be done cleaner.
      startStaffLine = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex].ParentStaffLine;
    }
    let endMeasure: GraphicalMeasure = undefined;
    if (wavyLine.ParentEndMultiExpression) {
      endMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(wavyLine.ParentEndMultiExpression.SourceMeasureParent,
                                                                                          staffIndex);
    } else {
      endMeasure = this.graphicalMusicSheet.getLastGraphicalMeasureFromIndex(staffIndex, true); // get last rendered measure
    }
    if (endMeasure.MeasureNumber > maxMeasureToDrawIndex + 1) { //  ends in measure not rendered
      endMeasure = this.graphicalMusicSheet.getLastGraphicalMeasureFromIndex(staffIndex, true);
    }
    let startMeasure: GraphicalMeasure = undefined;
    if (wavyLine.ParentEndMultiExpression) {
      startMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(wavyLine.ParentStartMultiExpression.SourceMeasureParent,
                                                                                            staffIndex);
    } else {
      startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
    }
    if (startMeasure.MeasureNumber < minMeasureToDrawIndex + 1) { //  starts before range of measures selected to render
      startMeasure = this.graphicalMusicSheet.MeasureList[minMeasureToDrawIndex][staffIndex]; // first rendered measure
    }

    if (startMeasure.parentSourceMeasure.measureListIndex < minMeasureToDrawIndex ||
        startMeasure.parentSourceMeasure.measureListIndex > maxMeasureToDrawIndex ||
        endMeasure.parentSourceMeasure.measureListIndex < minMeasureToDrawIndex ||
        endMeasure.parentSourceMeasure.measureListIndex > maxMeasureToDrawIndex) {
      // completely out of drawing range, don't draw anything
      return;
    }

    let endStaffLine: StaffLine = endMeasure.ParentStaffLine;
    if (!endStaffLine) {
      endStaffLine = startStaffLine;
    }
    if (endMeasure && startStaffLine && endStaffLine) {
      const graphicalWavyLine: VexFlowVibratoBracket = new VexFlowVibratoBracket(wavyLine, startStaffLine.PositionAndShape, startMeasure.ParentStaff.isTab);
      // calculate RelativePosition
      let startStaffEntry: GraphicalStaffEntry = startMeasure.findGraphicalStaffEntryFromTimestamp(startTimeStamp);
      if (!startStaffEntry) { // fix for rendering range set
        startStaffEntry = startMeasure.staffEntries[0];
      }
      let endStaffEntry: GraphicalStaffEntry = endMeasure.findGraphicalStaffEntryFromTimestamp(endTimeStamp);
      if (!endStaffEntry) { // fix for rendering range set
        endStaffEntry = endMeasure.staffEntries[endMeasure.staffEntries.length - 1];
      }
      graphicalWavyLine.setStartNote(startStaffEntry);

      if (endStaffLine !== startStaffLine) {
          let lastMeasureOfFirstShift: GraphicalMeasure = startStaffLine.Measures[startStaffLine.Measures.length - 1];
          if (lastMeasureOfFirstShift === undefined) { // TODO handle this case correctly (when drawUpToMeasureNumber etc set)
            lastMeasureOfFirstShift = endMeasure;
          }
          const lastNoteOfFirstShift: GraphicalStaffEntry = lastMeasureOfFirstShift.staffEntries[lastMeasureOfFirstShift.staffEntries.length - 1];
          if (lastNoteOfFirstShift) {
            graphicalWavyLine.setEndNote(lastNoteOfFirstShift); // TODO maybe not best way to handle this. sample/situation where value is undefined unclear.
          }

          const systemsInBetweenCount: number = endStaffLine.ParentMusicSystem.Id - startStaffLine.ParentMusicSystem.Id;
          if (systemsInBetweenCount > 0) {
            for (let i: number = startStaffLine.ParentMusicSystem.Id; i < endStaffLine.ParentMusicSystem.Id; i++) {
              const nextWavyLineMusicSystem: MusicSystem = this.musicSystems[i + 1];
              const nextWavyLineStaffline: StaffLine = nextWavyLineMusicSystem.StaffLines[staffIndex];
              const nextWavyLineFirstMeasure: GraphicalMeasure = nextWavyLineStaffline.Measures[0];
              // vibrato starts on the first measure
              const nextWavyLine: VexFlowVibratoBracket = new VexFlowVibratoBracket(wavyLine, nextWavyLineFirstMeasure.PositionAndShape,
                nextWavyLineStaffline.ParentStaff.isTab);
              let nextWavyLineLastMeasure: GraphicalMeasure = nextWavyLineStaffline.Measures[nextWavyLineStaffline.Measures.length - 1];
              const firstNote: GraphicalStaffEntry = nextWavyLineFirstMeasure.staffEntries[0];
              let lastNote: GraphicalStaffEntry = nextWavyLineLastMeasure.staffEntries[nextWavyLineLastMeasure.staffEntries.length - 1];
              //If the end measure's is the ending staffline, this endMeasure is the end of the wavy line
              if (endMeasure.ParentStaffLine === nextWavyLineStaffline) {
                nextWavyLineLastMeasure = endMeasure;
                lastNote = endStaffEntry;
              }

              nextWavyLine.setStartNote(firstNote);
              nextWavyLine.setEndNote(lastNote);
              nextWavyLineStaffline.WavyLines.push(nextWavyLine);
              nextWavyLine.CalculateBoundingBox();
              this.calculateWavyLineSkyBottomLine(nextWavyLine.startVfVoiceEntry, nextWavyLine.endVfVoiceEntry, nextWavyLine, nextWavyLineStaffline);
            }
          }
          graphicalWavyLine.CalculateBoundingBox();
          this.calculateWavyLineSkyBottomLine(graphicalWavyLine.startVfVoiceEntry, graphicalWavyLine.endVfVoiceEntry, graphicalWavyLine, startStaffLine);
      } else {
        graphicalWavyLine.setEndNote(endStaffEntry);
        graphicalWavyLine.CalculateBoundingBox();
        this.calculateWavyLineSkyBottomLine(graphicalWavyLine.startVfVoiceEntry, graphicalWavyLine.endVfVoiceEntry, graphicalWavyLine, startStaffLine);
      }
      startStaffLine.WavyLines.push(graphicalWavyLine);
    } else {
      log.warn("End measure or staffLines for wavy line are undefined! This should not happen!");
    }
  }

  private calculateWavyLineSkyBottomLine(startVfVoiceEntry: VexFlowVoiceEntry, endVfVoiceEntry: VexFlowVoiceEntry,
    vfVibratoBracket: VexFlowVibratoBracket, parentStaffline: StaffLine): void {
    const startStave: VF.Stave = vfVibratoBracket.startNote.getStave();
    let endStave: VF.Stave = vfVibratoBracket.endNote?.getStave();
    if (!endStave) { // e.g. if endNote undefined
      endStave = startStave;
      endVfVoiceEntry = startVfVoiceEntry;
      // TODO maybe not best way to handle this. sample/situation where value is undefined unclear.
    }
    //In VF Line positions, need to negate for our units
    const highestVFTopTextPosition: number = Math.max(
      startStave.options.topTextPosition,
      endStave.options.topTextPosition
    );

    //Whichever is higher, set the other to match
    startStave.options.topTextPosition = highestVFTopTextPosition;
    endStave.options.topTextPosition = highestVFTopTextPosition;
    let headroom: number = -highestVFTopTextPosition;
    let trillStartX: number = 0;
    let trillEndX: number = 0;
    let trillSkyline: number = Infinity;
    let trillWavyLineBottom: number = Infinity;
    const TRILL_HEIGHT: number = 1.85;

    let startX: number = startVfVoiceEntry.PositionAndShape.AbsolutePosition.x + startVfVoiceEntry.PositionAndShape.BorderLeft;
    if (startVfVoiceEntry.parentVoiceEntry?.OrnamentContainer?.GetOrnament === OrnamentEnum.Trill) {
      trillStartX = startX;
      //Width of trill mark
      startX += 2;
      trillEndX = startX;
      //Since the trill mark is not managed or calculated by our bounding boxes, we have to get the location this way
      //Also at this point the skyline has already been updated with the trill mark. So we can't determine if it should go lower
      //Need to trust Vexflow later on, unless the wavy line must be rendered higher
      trillSkyline = parentStaffline.SkyBottomLineCalculator.getSkyLineMinInRange(trillStartX, trillEndX);
      //height of the trill mark
      trillWavyLineBottom = trillSkyline + TRILL_HEIGHT;
    }

    let stopX: number = undefined;
    //If the end of the line is the last note in the measure, go all the way to the end of the stave
    if(vfVibratoBracket.ToEndOfStopStave) {
      //vexflow backs off by 1 unit (10 pixels) from stave edge
      stopX = endVfVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.AbsolutePosition.x +
        endVfVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.BorderRight - 1;
    } else {
      stopX = endVfVoiceEntry.PositionAndShape.AbsolutePosition.x + endVfVoiceEntry.PositionAndShape.BorderRight;
      //Take into account in-staff clefs associated with the staff entry (they modify the bounding box position)
      const vfClefBefore: VF.ClefNote = (endVfVoiceEntry.parentStaffEntry as VexFlowStaffEntry).vfClefBefore;
      if (vfClefBefore) {
        const clefWidth: number = vfClefBefore.getWidth() / 10;
        stopX += clefWidth;
      }
    }

    headroom = parentStaffline.SkyBottomLineCalculator.getSkyLineMinInRange(startX, stopX);
    if (headroom === Infinity) { // will cause Vexflow error
      return;
    }
    //If somewhere in our wavy line path we have to render higher than where the trill mark is set...
    if (headroom < trillSkyline) {
      startStave.options.topTextPosition = -headroom;
      endStave.options.topTextPosition = -headroom;
      //A decent enough approximation. Better than recalculating via Canvas or SVG sampling
      parentStaffline.SkyBottomLineCalculator.updateSkyLineInRange(trillStartX, trillEndX, headroom - TRILL_HEIGHT);
    } else { //Else just render where Vexflow has set the trill mark
      vfVibratoBracket.line = -trillWavyLineBottom;
      headroom = trillWavyLineBottom;
    }
    //Update skyline to include height of the wavy line
    headroom -= vfVibratoBracket.PositionAndShape.Size.height;
    parentStaffline.SkyBottomLineCalculator.updateSkyLineInRange(startX, stopX, headroom);
  }

  private calculatePedalSkyBottomLine(startVfVoiceEntry: VexFlowVoiceEntry, endVfVoiceEntry: VexFlowVoiceEntry,
    vfPedal: VexFlowPedal, parentStaffline: StaffLine): void {
      let endBbox: BoundingBox = endVfVoiceEntry?.PositionAndShape;
      if (!endBbox) {
        endBbox = vfPedal.endMeasure.PositionAndShape;
      }
      //Just for shorthand. Easier readability below
      const PEDAL_STYLES_ENUM: typeof VexFlowPedalStyles = VexFlowPedalStyles;
      const pedalMarking: any = vfPedal.getPedalMarking();
      const pedalRenderOptions: any = pedalMarking.renderOptions ?? pedalMarking.render_options;
      //VF adds 3 lines to whatever the pedal line is set to.
      //VF also measures from the bottom line, whereas our bottom line is from the top staff line
      const yLineForPedalMarking: number = (pedalMarking.line + 3 + (parentStaffline.StaffLines.length - 1));
      //VF Uses a margin offset for rendering. Take this into account
      const pedalMarkingMarginXOffset: number =
        (pedalRenderOptions.textMarginRight ?? pedalRenderOptions.text_margin_right) / 10;
      //TODO: Most of this should be in the bounding box calculation
      let startX: number = startVfVoiceEntry.PositionAndShape.AbsolutePosition.x - pedalMarkingMarginXOffset;

      if (pedalMarking.style === PEDAL_STYLES_ENUM.MIXED ||
          pedalMarking.style === PEDAL_STYLES_ENUM.MIXED_OPEN_END ||
          pedalMarking.style === PEDAL_STYLES_ENUM.TEXT) {
        //Accomodate the Ped. sign
        startX -= 1;
      }
      let stopX: number = undefined;
      let footroom: number = (parentStaffline.StaffLines.length - 1);
      //Find the highest foot room in our staffline
      for (const otherPedal of parentStaffline.Pedals) {
        const vfOtherPedal: VexFlowPedal = otherPedal as VexFlowPedal;
        const otherPedalMarking: any = vfOtherPedal.getPedalMarking();
        const yLineForOtherPedalMarking: number = (otherPedalMarking.line + 3 + (parentStaffline.StaffLines.length - 1));
        footroom = Math.max(yLineForOtherPedalMarking, footroom);
      }
      //We have the two seperate symbols, with two bounding boxes
      if (vfPedal.EndSymbolPositionAndShape) {
        const symbolHalfHeight: number =
          (pedalMarking.getFontInfo?.().size ?? pedalRenderOptions.glyph_point_size ?? 40) / 20;
        //Width of the Ped. symbol
        stopX = startX + 3.4;
        const startX2: number = endBbox.AbsolutePosition.x - pedalMarkingMarginXOffset;
        //Width of * symbol
        const stopX2: number = startX2 + 1.5;

        footroom = Math.max(parentStaffline.SkyBottomLineCalculator.getBottomLineMaxInRange(startX, stopX), footroom);
        footroom = Math.max(yLineForPedalMarking + symbolHalfHeight * 2, footroom);
        const footroom2: number = parentStaffline.SkyBottomLineCalculator.getBottomLineMaxInRange(startX2, stopX2);
        //If Depress text is set, means we are not rendering the begin label (we are just rendering the end one)
        if (!vfPedal.DepressText) {
          footroom = Math.max(footroom, footroom2);
        }
        vfPedal.setLine(footroom - 3 - (parentStaffline.StaffLines.length - 1));
        parentStaffline.SkyBottomLineCalculator.updateBottomLineInRange(startX, stopX, footroom + symbolHalfHeight);
        parentStaffline.SkyBottomLineCalculator.updateBottomLineInRange(startX2, stopX2, footroom + symbolHalfHeight);
      } else {
        const bracketHeight: number =
          (pedalRenderOptions.bracketHeight ?? pedalRenderOptions.bracket_height) / 10;

        if(pedalMarking.EndsStave){
          if(endVfVoiceEntry){
            stopX = endVfVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.AbsolutePosition.x +
              endVfVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.Size.width - pedalMarkingMarginXOffset;

          } else {
            stopX = endBbox.AbsolutePosition.x + endBbox.Size.width;
          }
        } else {
          switch (pedalMarking.style) {
            case PEDAL_STYLES_ENUM.BRACKET_OPEN_END:
            case PEDAL_STYLES_ENUM.BRACKET_OPEN_BOTH:
            case PEDAL_STYLES_ENUM.MIXED_OPEN_END:
              stopX = endBbox.AbsolutePosition.x + endBbox.BorderRight - pedalMarkingMarginXOffset;
            break;
            default:
              stopX = endBbox.AbsolutePosition.x + endBbox.BorderLeft - pedalMarkingMarginXOffset;
            break;
          }
        }
        //Take into account in-staff clefs associated with the staff entry (they modify the bounding box position)
        const vfClefBefore: VF.ClefNote = (endVfVoiceEntry?.parentStaffEntry as VexFlowStaffEntry)?.vfClefBefore;
        if (vfClefBefore) {
          const clefWidth: number = vfClefBefore.getWidth() / 10;
          stopX += clefWidth;
        }

        footroom = Math.max(parentStaffline.SkyBottomLineCalculator.getBottomLineMaxInRange(startX, stopX), footroom);
        if (footroom === Infinity) { // will cause Vexflow error
          return;
        }
        //Whatever is currently lower - the set render height of the begin vf stave, the set render height of the end vf stave,
        //or the bottom line. Use that as the render height of both staves
        footroom = Math.max(footroom, yLineForPedalMarking + bracketHeight);
        vfPedal.setLine(footroom - 3 - (parentStaffline.StaffLines.length - 1));
        if (startX > stopX) { // TODO hotfix for skybottomlinecalculator after pedal no endNote fix
          const newStart: number = stopX;
          stopX = startX;
          startX = newStart;
        }
        parentStaffline.SkyBottomLineCalculator.updateBottomLineInRange(startX, stopX, footroom + bracketHeight);
      }
      //If our current pedal is below the other pedals in this staffline, set them all to this height
      for (const otherPedal of parentStaffline.Pedals) {
        const vfOtherPedal: VexFlowPedal = otherPedal as VexFlowPedal;
        const otherPedalMarking: any = vfOtherPedal.getPedalMarking();
        const yLineForOtherPedalMarking: number = (otherPedalMarking.line + 3 + (parentStaffline.StaffLines.length - 1));
        //Only do these changes if current footroom is higher
        if(footroom > yLineForOtherPedalMarking) {
          const otherRenderOptions: any =
            otherPedalMarking.renderOptions ?? otherPedalMarking.render_options;
          const otherPedalMarkingMarginXOffset: number =
            (otherRenderOptions.textMarginRight ?? otherRenderOptions.text_margin_right) / 10;
          let otherPedalStartX: number = vfOtherPedal.startVfVoiceEntry.PositionAndShape.AbsolutePosition.x - otherPedalMarkingMarginXOffset;
          let otherPedalStopX: number = undefined;
          vfOtherPedal.setLine(footroom - 3 - (parentStaffline.StaffLines.length - 1));
          let otherPedalEndBBox: BoundingBox = vfOtherPedal.endVfVoiceEntry?.PositionAndShape;
          if (!otherPedalEndBBox) {
            otherPedalEndBBox = vfOtherPedal.endMeasure.PositionAndShape;
          }
          if (vfOtherPedal.EndSymbolPositionAndShape) {
            const otherSymbolHalfHeight: number =
              (otherPedalMarking.getFontInfo?.().size ?? otherRenderOptions.glyph_point_size ?? 40) / 20;
            //Width of the Ped. symbol
            otherPedalStopX = otherPedalStartX + 3.4;
            const otherPedalStartX2: number = otherPedalEndBBox.AbsolutePosition.x - otherPedalMarkingMarginXOffset;
            //Width of * symbol
            const otherPedalStopX2: number = otherPedalStartX2 + 1.5;
            parentStaffline.SkyBottomLineCalculator.updateBottomLineInRange(otherPedalStartX, otherPedalStopX, footroom + otherSymbolHalfHeight);
            parentStaffline.SkyBottomLineCalculator.updateBottomLineInRange(otherPedalStartX2, otherPedalStopX2, footroom + otherSymbolHalfHeight);
          } else {
            const otherPedalBracketHeight: number =
              (otherRenderOptions.bracketHeight ?? otherRenderOptions.bracket_height) / 10;

            if(otherPedalMarking.EndsStave){
                otherPedalStopX = otherPedalEndBBox.AbsolutePosition.x + otherPedalEndBBox.Size.width - otherPedalMarkingMarginXOffset;
            } else {
              switch (pedalMarking.style) {
                case PEDAL_STYLES_ENUM.BRACKET_OPEN_END:
                case PEDAL_STYLES_ENUM.BRACKET_OPEN_BOTH:
                case PEDAL_STYLES_ENUM.MIXED_OPEN_END:
                  otherPedalStopX = otherPedalEndBBox.AbsolutePosition.x + otherPedalEndBBox.BorderRight - otherPedalMarkingMarginXOffset;
                break;
                default:
                  otherPedalStopX = otherPedalEndBBox.AbsolutePosition.x + otherPedalEndBBox.BorderLeft - otherPedalMarkingMarginXOffset;
                break;
              }
            }
            //Take into account in-staff clefs associated with the staff entry (they modify the bounding box position)
            const vfOtherClefBefore: VF.ClefNote = (vfOtherPedal.endVfVoiceEntry?.parentStaffEntry as VexFlowStaffEntry)?.vfClefBefore;
            if (vfOtherClefBefore) {
              const otherClefWidth: number = vfOtherClefBefore.getWidth() / 10;
              otherPedalStopX += otherClefWidth;
            }
            if (otherPedalStartX > otherPedalStopX) {
              // TODO this shouldn't happen, though this fixes the SkyBottomLineCalculator error for now (startIndex needs to be <= endIndex)
              // switch startX and stopX
              const otherStartX: number = otherPedalStartX;
              otherPedalStartX = otherPedalStopX;
              otherPedalStopX = otherStartX;
            }
            parentStaffline.SkyBottomLineCalculator.updateBottomLineInRange(otherPedalStartX, otherPedalStopX, footroom + otherPedalBracketHeight);
          }
        }
      }
  }

  private calculateOctaveShiftSkyBottomLine(startStaffEntry: GraphicalStaffEntry, endStaffEntry: GraphicalStaffEntry,
                                            vfOctaveShift: VexFlowOctaveShift, parentStaffline: StaffLine): void {
    if (!endStaffEntry) {
      log.warn("octaveshift: no endStaffEntry");
      return;
    }
    let endBbox: BoundingBox = endStaffEntry.PositionAndShape;
    if (vfOctaveShift.graphicalEndAtMeasureEnd) {
      endBbox = endStaffEntry.parentMeasure.PositionAndShape;
    }
    let startXOffset: number = startStaffEntry.PositionAndShape.Size.width;
    let endXOffset: number = endBbox.Size.width;

    //Vexflow renders differently with rests
    if (startStaffEntry.hasOnlyRests()) {
      startXOffset = -startXOffset;
    } else {
      startXOffset /= 2;
    }

    if (!vfOctaveShift.graphicalEndAtMeasureEnd) {
      if (!endStaffEntry.hasOnlyRests()) {
        endXOffset /= 2;
      } else {
        endXOffset *= 2;
      }
      if (startStaffEntry === endStaffEntry) {
        endXOffset *= 2;
      }
    }

    let startX: number = startStaffEntry.PositionAndShape.AbsolutePosition.x - startXOffset;
    let stopX: number = endBbox.AbsolutePosition.x + endXOffset;
    if (startX > stopX) {
      // very rare case of the start staffentry being before end staffentry. would lead to error in skybottomline. See #1281
      // reverse startX and endX
      const oldStartX: number = startX;
      startX = stopX;
      stopX = oldStartX;
    }

    vfOctaveShift.PositionAndShape.Size.width = stopX - startX;
    const textBracket: VF.TextBracket = vfOctaveShift.getTextBracket();
    const fontSize: number = (textBracket as any).font.size / 10;

    if ((<any>textBracket).position === VF.TextBracket.Position.TOP) {
      // Math.ceil with a small tolerance: the geometric skyline calculation gives exact values where
      // the pixel-based one snapped to pixels (often exact integers, e.g. a note top exactly 1 unit
      // above the staff), and without the tolerance, a skyline minimum a fraction of a pixel inside
      // an integer boundary would lose a whole unit of headroom to the ceil (e.g. ceil(-0.97) = 0,
      // putting the octave bracket into the note, see test_octaveshift_extragraphicalmeasure).
      // The tolerance is smaller than the pixel-based values' granularity (0.1), so their results are unchanged.
      const headroom: number = Math.ceil(parentStaffline.SkyBottomLineCalculator.getSkyLineMinInRange(startX, stopX) - 0.05);
      if (headroom === Infinity) { // will cause Vexflow error
        return;
      }
      (textBracket.start.getStave().options as any).topTextPosition = Math.abs(headroom);
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
      if (graphicalMeasure && graphicalMeasure.ParentStaffLine && graphicalMeasure.ParentStaff.isVisible()) {
        uppermostMeasure = <VexFlowMeasure>graphicalMeasure;
        break;
      }
    }
    // ToDo: feature/Repetitions
    // now create corresponding graphical symbol or Text in VexFlow:
    // use top measure and staffline for positioning.
    if (uppermostMeasure) {
      const repetition: VF.Repetition = uppermostMeasure.addWordRepetition(repetitionInstruction);
      this.placeWordRepetitionInSkyline(uppermostMeasure, repetition);
    }
  }

  /** The repetition instruction boxes already placed per staff line, for their mutual collision checks.
   *  (a WeakMap, so that the entries of a previous render's staff lines don't linger) */
  private placedWordRepetitionBoxes: WeakMap<StaffLine, {startX: number, endX: number, top: number}[]> = new WeakMap();

  /**
   * Shifts a repetition instruction (VF.Repetition, e.g. Coda sign or "D.S. al Fine" text) above
   * other objects in its range, e.g. chord symbols, which are calculated before the repetition
   * instructions, or previously placed repetition instructions (see #1689).
   * Shifted instructions reserve their space in the skyline, so that the staffline borders account for them.
   * The horizontal and default vertical position replicate the drawing code
   * in the current VexFlow repetition text rendering path.
   * @param measure the (uppermost) measure the repetition instruction was added to
   * @param repetition the VexFlow repetition (stave modifier) to place, created by addWordRepetition()
   */
  protected placeWordRepetitionInSkyline(measure: VexFlowMeasure, repetition: VF.Repetition): void {
    const staffLine: StaffLine = measure.ParentStaffLine;
    if (!repetition || !staffLine) {
      return;
    }
    const repetitionCompat: any = repetition as any;
    const type: number = repetitionCompat.symbol_type ?? repetitionCompat.symbolType;
    const repetitionTypes: {[key: string]: number} = VF.Repetition.type as any;
    let text: string; // the texts drawn by staverepetition.js drawSymbolText()
    let hasCodaGlyphAfterText: boolean = false; // types that draw a coda glyph after the text
    switch (type) {
      case repetitionTypes.CODA_LEFT:
        text = "Coda";
        hasCodaGlyphAfterText = true;
        break;
      case repetitionTypes.TO_CODA:
        text = "To";
        hasCodaGlyphAfterText = true;
        break;
      case repetitionTypes.DC_AL_CODA:
        text = "D.C. al";
        hasCodaGlyphAfterText = true;
        break;
      case repetitionTypes.DS_AL_CODA:
        text = "D.S. al";
        hasCodaGlyphAfterText = true;
        break;
      case repetitionTypes.DC:
        text = "D.C.";
        break;
      case repetitionTypes.DC_AL_FINE:
        text = "D.C. al Fine";
        break;
      case repetitionTypes.DS:
        text = "D.S.";
        break;
      case repetitionTypes.DS_AL_FINE:
        text = "D.S. al Fine";
        break;
      case repetitionTypes.FINE:
        text = "Fine";
        break;
      default:
        text = ""; // segno/coda glyphs without text
        break;
    }
    const fontHeightUnits: number = 1.6; // staverepetition.js draws the text with a 12pt (16px) font
    let textWidthUnits: number = 0;
    if (text.length > 0) {
      // measure with the same Dorico-style text font path that staverepetition.js now draws with,
      //   so that the measured width matches the drawn width even if the browser synthesizes bold italic
      textWidthUnits = MusicSheetCalculator.TextMeasurer.computeTextWidthToHeightRatio(
        text,
        Fonts.TimesNewRoman,
        FontStyles.BoldItalic,
        getDoricoDefaultTextFontFamily(this.rules),
      ) * fontHeightUnits;
    }
    const glyphWidthUnits: number = 2.4; // coda/segno glyph width (plus the 12px gap after the text for symbol_x)
    const measureStartX: number = measure.PositionAndShape.RelativePosition.x;
    const measureWidth: number = measure.PositionAndShape.Size.width;
    let startX: number;
    let endX: number;
    if (type === repetitionTypes.SEGNO_LEFT) {
      // drawSignoFixed() draws the glyph after the measure's begin instructions (clef, key, time signature):
      //   its x anchor additionally gets the stave's modifier x shift, which is the begin instructions width
      //   at draw time - and that can still change (e.g. shrink by alignment) after this calculation.
      //   So reserve a tolerant range around the begin instructions width.
      startX = measureStartX + measure.beginInstructionsWidth * 0.7;
      endX = measureStartX + measure.beginInstructionsWidth * 1.2 +
        measure.beginInstructionsWidth / unitInPixels + glyphWidthUnits;
    } else if (type === repetitionTypes.CODA_LEFT) {
      // drawn at the start of the measure (plus beginInstructionsWidth, which drawSymbolText uses as pixels)
      startX = measureStartX + measure.beginInstructionsWidth / unitInPixels;
      endX = startX + textWidthUnits + glyphWidthUnits;
    } else {
      // texts at the end of the measure, drawn right-aligned to the measure end
      //   (drawSymbolText: x_shift = -(text width + 12 + vertical_bar_width + 12), text_x = x + x_shift + vertical_bar_width,
      //   and the anchor x is the stave end minus the end barline width/padding, so roughly half a unit before the measure end)
      startX = measureStartX + measureWidth - 0.5 - textWidthUnits - 2.4;
      if (type === repetitionTypes.DC || type === repetitionTypes.DC_AL_FINE || type === repetitionTypes.DS ||
          type === repetitionTypes.DS_AL_FINE || type === repetitionTypes.FINE) {
        // these are additionally shifted to the right (only in the staffline's last measure, see addWordRepetition()),
        //   see xShiftAsPercentOfStaveWidth in staverepetition.js
        startX += measureWidth * ((repetition as any).xShiftAsPercentOfStaveWidth ?? 0);
      }
      endX = startX + textWidthUnits;
      if (hasCodaGlyphAfterText) {
        endX += glyphWidthUnits;
      }
    }
    // don't add a safety margin to the range: it would unnecessarily stack repetition marks
    //   that have a small gap between them. (the skyline sampling reads slightly beyond the range anyways)
    // clamp to the staffline (e.g. an end instruction of the last measure can be shifted beyond the staffline end)
    startX = Math.max(0, startX);
    endX = Math.min(staffLine.PositionAndShape.Size.width, endX);
    if (!(endX > startX)) {
      return;
    }
    // default drawing band of staverepetition.js, relative to the top staff line:
    //   the text baseline is at getYForTopText(5) + 25 + 5 = 3 units above the top staff line (plus y_shift),
    //   glyphs are anchored similarly, so the drawn objects roughly span [-4.5, -2.5] units
    const yShiftUnits: number = ((repetitionCompat.y_shift ?? repetitionCompat.yShift) ?? 0) / unitInPixels;
    const defaultTop: number = -4.5 + yShiftUnits;
    const defaultBottom: number = -2.5 + yShiftUnits;
    const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
    let collisionMin: number = skyBottomLineCalculator.getSkyLineMinInRange(startX, endX);
    if (collisionMin === -Infinity || collisionMin === Infinity) {
      collisionMin = 0;
    }
    // repetition instructions in their default position don't reserve skyline space (see below),
    //   so also check against the already placed repetition instructions of this staff line:
    let placedBoxes: {startX: number, endX: number, top: number}[] = this.placedWordRepetitionBoxes.get(staffLine);
    if (!placedBoxes) {
      placedBoxes = [];
      this.placedWordRepetitionBoxes.set(staffLine, placedBoxes);
    }
    for (const box of placedBoxes) {
      if (box.endX > startX && box.startX < endX) {
        collisionMin = Math.min(collisionMin, box.top);
      }
    }
    let collisionShiftUnits: number = 0;
    if (collisionMin < defaultBottom) {
      // something (e.g. a chord symbol or another repetition instruction) protrudes
      //   into the default position -> shift the repetition above it
      collisionShiftUnits = collisionMin - defaultBottom;
      repetition.setShiftY(((repetitionCompat.y_shift ?? repetitionCompat.yShift) ?? 0) + collisionShiftUnits * unitInPixels);
    }
    placedBoxes.push({ startX: startX, endX: endX, top: defaultTop + collisionShiftUnits });
    if (collisionShiftUnits < 0) {
      // only instructions that were shifted upwards reserve their space in the skyline, so that the
      //   staffline borders (and thus the system spacing) account for them. Unshifted instructions stay
      //   in their default band close above the staff, which shouldn't increase the system spacing
      //   (as it also didn't before repetition instructions were placed via the skyline).
      skyBottomLineCalculator.updateSkyLineInRange(startX, endX, defaultTop + collisionShiftUnits);
    }
  }

  protected calculateSkyBottomLines(): void {
    const allStaffLines: StaffLine[] = CollectionUtil.flat(this.musicSystems.map(musicSystem => musicSystem.StaffLines));

    // Lazy rendering: reuse the sky/bottom lines of stable interior systems computed in an
    // earlier growing-prefix batch, and only (re)compute the rest. The skyline pass is the dominant layout
    // cost; on a big score this turns the per-batch O(prefix) re-measure into O(new systems). The FIRST
    // system and the LAST system of the prefix are never cached/reused: empirically their lines change as
    // the prefix grows (first system) or as the last, unstretched system later becomes stretched/interior.
    // Only the geometric skyline path's side effects are replayable for reuse (see
    // SkyBottomLineCalculator.applyGeometricSkylineSideEffectsOnly); the raster path computes everything.
    const lazyCache: boolean = this.rules.LazyConsistentGraphic && this.rules.UseGeometricSkyBottomLineCalculation;
    const staffLinesToCompute: StaffLine[] = lazyCache ? [] : allStaffLines;
    const toCache: { key: string, staffLine: StaffLine }[] = [];
    if (lazyCache) {
      const lastSystemIndex: number = this.musicSystems.length - 1;
      for (let si: number = 0; si < this.musicSystems.length; si++) {
        const cacheable: boolean = si !== 0 && si !== lastSystemIndex;
        const systemStaffLines: StaffLine[] = this.musicSystems[si].StaffLines;
        for (let li: number = 0; li < systemStaffLines.length; li++) {
          const staffLine: StaffLine = systemStaffLines[li];
          const key: string = this.skyBottomLineCacheKey(staffLine, li);
          const cached: { sky: number[], bottom: number[] } = key ? this.skyBottomLineCache.get(key) : undefined;
          if (cached) {
            // Replay the skyline calc's per-measure side effects (the VexFlow formatter is not idempotent,
            // so skipping them would shift later passes by ~1px), then reuse the verified byte-identical
            // cached lines instead of re-measuring extents (the expensive part).
            staffLine.SkyBottomLineCalculator.applyGeometricSkylineSideEffectsOnly();
            staffLine.SkyBottomLineCalculator.setLinesDirectly(cached.sky.slice(), cached.bottom.slice());
          } else {
            staffLinesToCompute.push(staffLine);
            if (cacheable && key) {
              toCache.push({ key, staffLine });
            }
          }
        }
      }
    }

    this.computeSkyBottomLinesFor(staffLinesToCompute);

    for (const entry of toCache) {
      this.skyBottomLineCache.set(entry.key, { sky: entry.staffLine.SkyLine.slice(), bottom: entry.staffLine.BottomLine.slice() });
    }
  }

  /** Compute (not reuse) the sky/bottom lines for the given staff lines: geometric, or the batched /
   *  per-staff-line path. This is the original calculateSkyBottomLines body, extracted so the lazy reuse
   *  path can feed it just the staff lines that actually need computing. */
  private computeSkyBottomLinesFor(staffLines: StaffLine[]): void {
    if (staffLines.length === 0) {
      return;
    }
    if (this.rules.UseGeometricSkyBottomLineCalculation) {
      // geometric calculation doesn't need batching: no canvas allocation or pixel readback (getImageData) is involved
      for (const staffLine of staffLines) {
        staffLine.SkyBottomLineCalculator.calculateLines();
      }
      return;
    }
    let numMeasures: number = 0; // number of graphical measures that are rendered
    for (const staffline of staffLines) {
      for (const measure of staffline.Measures) {
        if (measure) { // can be undefined and not rendered in multi-measure rest
          numMeasures++;
        }
      }
    }
    if (this.rules.AlwaysSetPreferredSkyBottomLineBackendAutomatically) {
      this.rules.setPreferredSkyBottomLineBackendAutomatically(numMeasures);
    }
    if (numMeasures >= this.rules.SkyBottomLineBatchMinMeasures) {
      const calculator: SkyBottomLineBatchCalculator = new SkyBottomLineBatchCalculator(
        staffLines, this.rules.PreferredSkyBottomLineBatchCalculatorBackend);
      calculator.calculateLines();
    } else {
      for (const staffLine of staffLines) {
        staffLine.SkyBottomLineCalculator.calculateLines();
      }
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
    voiceEntry.LyricsEntries.forEach((key: string, lyricsEntry: LyricsEntry) => {
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
  public indexOfGraphicalGlissFromGliss(gGlissandi: GraphicalGlissando[], glissando: Glissando): number {
    for (let glissIndex: number = 0; glissIndex < gGlissandi.length; glissIndex++) {
      if (gGlissandi[glissIndex].Glissando === glissando) {
        return glissIndex;
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
                      // TODO the following seems to have been intended to prevent unnecessary slurs that overlap ties,
                      //   but it simply leads to correct slurs being left out where the tie end note is the slur start note.
                      //   visual regression tests simply show valid slurs being left out in 4 samples.
                      // if (graphicalNote.sourceNote.NoteTie) {
                      //   if (graphicalNote.parentVoiceEntry.parentStaffEntry.getAbsoluteTimestamp() !==
                      //     graphicalNote.sourceNote.NoteTie.StartNote.getAbsoluteTimestamp()) {
                      //     break;
                      //   }
                      // }

                      // Add a Graphical Slur to the staffline, if the recent note is the Startnote of a slur
                      const gSlur: GraphicalSlur = new GraphicalSlur(slur, this.rules);
                      staffLine.addSlurToStaffline(gSlur);
                      if (slur.isCrossed()) {
                        // A cross-staff slur (e.g. left hand to right hand) ends on a different staff, so it
                        // would never be closed by the per-staff open/close mechanism below - which would leave
                        // it open and spawn phantom continuation slurs on every following staffline. Keep it out
                        // of openGraphicalSlurs; its curve is calculated separately at draw time (spanning both
                        // stafflines). It still needs a staffEntry for GraphicalSlur.Compare's sorting.
                        gSlur.staffEntries = [graphicalStaffEntry];
                      } else {
                        openGraphicalSlurs.push(gSlur);
                      }

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

    // Link every same-source segment before calculating curves. Placement is a source-slur
    // decision, not a system-segment decision, so all segments share the placement selected
    // at the real start note. Endpoint articulations are then moved absolutely against that
    // fixed attachment. The displaced final bounds are merged into the existing skyline;
    // rerunning the complete skyline pass here would repeat its formatter side effects.
    const segmentsBySource: Map<Slur, {segment: GraphicalSlur, staffLine: StaffLine}[]> = new Map();
    for (const musicSystem of this.musicSystems) {
      for (const staffLine of musicSystem.StaffLines) {
        for (const segment of staffLine.GraphicalSlurs) {
          let linkedSegments: {segment: GraphicalSlur, staffLine: StaffLine}[] = segmentsBySource.get(segment.slur);
          if (!linkedSegments) {
            linkedSegments = [];
            segmentsBySource.set(segment.slur, linkedSegments);
          }
          linkedSegments.push({segment, staffLine});
        }
      }
    }

    let linkedGroupIndex: number = 0;
    for (const [sourceSlur, linkedSegments] of segmentsBySource) {
      const linkedGroupId: string = `source-slur-${linkedGroupIndex++}`;
      for (let index: number = 0; index < linkedSegments.length; index++) {
        linkedSegments[index].segment.setLinkedSegment(
          index,
          linkedSegments.length,
          linkedSegments[index].segment.placement,
          linkedGroupId,
        );
      }
      if (sourceSlur.isCrossed()) {
        const startNote: GraphicalNote = this.rules.GNote(sourceSlur.StartNote);
        const endNote: GraphicalNote = this.rules.GNote(sourceSlur.EndNote);
        const startLine: StaffLine = startNote?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
        const endLine: StaffLine = endNote?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
        if (startLine && endLine && startLine.ParentMusicSystem !== endLine.ParentMusicSystem) {
          for (const {segment} of linkedSegments) {
            segment.markUnsupportedCrossStaffSystemBreak();
          }
          log.warn(
            "Cross-staff slur across a system break is not yet supported " +
            `(measures ${sourceSlur.StartNote.SourceMeasure.MeasureNumber}–` +
            `${sourceSlur.EndNote.SourceMeasure.MeasureNumber}).`,
          );
        }
        continue;
      }

      const sourceStartNote: GraphicalNote = this.rules.GNote(sourceSlur.StartNote);
      const sourceStartLine: StaffLine =
        sourceStartNote?.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
      const placementSegment: GraphicalSlur =
        linkedSegments.find(({staffLine}): boolean => staffLine === sourceStartLine)?.segment
        ?? linkedSegments[0].segment;
      const placement: PlacementEnum = placementSegment.determinePlacement();

      for (let index: number = 0; index < linkedSegments.length; index++) {
        const {segment, staffLine} = linkedSegments[index];
        segment.setLinkedSegment(index, linkedSegments.length, placement, linkedGroupId);
        if (this.rules.SlurLayoutMode === "legacy" && segment.prepareEndpointArticulationClearance()) {
          for (const shift of segment.diagnostics.articulationShifts) {
            if (placement === PlacementEnum.Above) {
              staffLine.SkyBottomLineCalculator.updateSkyLineInRange(
                shift.bounds.left,
                shift.bounds.right,
                shift.bounds.top,
              );
            } else {
              staffLine.SkyBottomLineCalculator.updateBottomLineInRange(
                shift.bounds.left,
                shift.bounds.right,
                shift.bounds.bottom,
              );
            }
          }
        }
      }
    }

    // Calculate curves only after final notehead, beam, articulation, and skyline geometry exists.
    if (this.rules.SlurLayoutMode === "legacy") {
      for (const musicSystem of this.musicSystems) {
        for (const staffLine of musicSystem.StaffLines) {
          const sortedGSlurs: GraphicalSlur[] = staffLine.GraphicalSlurs.sort(GraphicalSlur.Compare);
          for (const gSlur of sortedGSlurs) {
            if (!gSlur.slur.isCrossed()) {
              gSlur.calculateCurve(this.rules);
            }
          }
        }
      }
      return;
    }

    // Candidate geometry is prepared without mutating the skyline. Source slurs are then
    // solved inner/shorter first, so every selected inner curve becomes a typed obstacle
    // when the next outer route refreshes its immutable context.
    for (const musicSystem of this.musicSystems) {
      for (const staffLine of musicSystem.StaffLines) {
        const sortedGSlurs: GraphicalSlur[] = staffLine.GraphicalSlurs.sort(GraphicalSlur.Compare);
        for (const gSlur of sortedGSlurs) {
          if (!gSlur.slur.isCrossed()) {
            gSlur.calculateCurve(this.rules, true);
          }
        }
      }
    }
    const orderedGroups: [Slur, {segment: GraphicalSlur, staffLine: StaffLine}[]][] =
      [...segmentsBySource.entries()]
        .filter(([sourceSlur]): boolean => !sourceSlur.isCrossed())
        .sort(([left], [right]): number => {
          const leftDuration: number = Fraction.minus(
            left.EndNote.getAbsoluteTimestamp(),
            left.StartNote.getAbsoluteTimestamp(),
          ).RealValue;
          const rightDuration: number = Fraction.minus(
            right.EndNote.getAbsoluteTimestamp(),
            right.StartNote.getAbsoluteTimestamp(),
          ).RealValue;
          return leftDuration - rightDuration
            || left.StartNote.getAbsoluteTimestamp().RealValue - right.StartNote.getAbsoluteTimestamp().RealValue
            || left.EndNote.getAbsoluteTimestamp().RealValue - right.EndNote.getAbsoluteTimestamp().RealValue;
        });
    for (const [, linkedSegments] of orderedGroups) {
      const sortedSegments: {segment: GraphicalSlur, staffLine: StaffLine}[] = [...linkedSegments].sort(
        (left, right): number => left.segment.diagnostics.segmentIndex - right.segment.diagnostics.segmentIndex,
      );
      const linkedGroupId: string = sortedSegments[0].segment.diagnostics.linkedGroupId;
      const calculatePlacementRoute: (placement: PlacementEnum) => SlurLinkedLayoutOutput | undefined =
        (placement: PlacementEnum): SlurLinkedLayoutOutput | undefined => {
          const inputs: SlurLinkedLayoutInput[] = [];
          for (let index: number = 0; index < sortedSegments.length; index++) {
            const {segment, staffLine} = sortedSegments[index];
            segment.setLinkedSegment(index, sortedSegments.length, placement, linkedGroupId);
            segment.calculateCurve(this.rules, true);
            segment.refreshCandidateLayoutContext(staffLine);
            const context: SlurLayoutContext = segment.layoutContext;
            const seed: SlurCurveGeometry = segment.getCandidateSeed();
            if (context && seed) {
              inputs.push({context, seed});
            }
          }
          if (inputs.length !== sortedSegments.length) {
            return undefined;
          }
          return calculateLinkedSlurLayouts(inputs, {
            candidateLimit: this.rules.SlurCandidateLimit,
            diagnosticsLevel: this.rules.SlurDiagnosticsLevel,
            maximumPreferredClearance: this.rules.SlurMaximumPreferredClearance,
            obstacleClearance: this.rules.SlurObstacleClearance,
            scoreWeights: this.rules.SlurCandidateScoreWeights,
          });
        };
      const routeScore: (output: SlurLinkedLayoutOutput | undefined) => number =
        (output: SlurLinkedLayoutOutput | undefined): number => {
          if (!output) {
            return Number.POSITIVE_INFINITY;
          }
          return output.diagnostics.totalScore;
        };

      const automaticPlacement: PlacementEnum = sortedSegments[0].segment.placement;
      let selectedPlacement: PlacementEnum = automaticPlacement;
      if (sortedSegments[0].segment.canCompareAutomaticPlacements()) {
        const aboveOutput: SlurLinkedLayoutOutput = calculatePlacementRoute(PlacementEnum.Above);
        const belowOutput: SlurLinkedLayoutOutput = calculatePlacementRoute(PlacementEnum.Below);
        const aboveScore: number = routeScore(aboveOutput);
        const belowScore: number = routeScore(belowOutput);
        selectedPlacement = aboveScore < belowScore
          ? PlacementEnum.Above
          : belowScore < aboveScore
            ? PlacementEnum.Below
            : automaticPlacement;
        for (const {segment} of sortedSegments) {
          segment.setPlacementCandidateScores(aboveScore, belowScore);
        }
      }
      // Recalculate the selected side so endpoint bindings, typed obstacles,
      // and immutable contexts all describe the geometry that will be applied.
      const linkedOutput: SlurLinkedLayoutOutput = calculatePlacementRoute(selectedPlacement);
      if (!linkedOutput) {
        continue;
      }
      for (let index: number = 0; index < sortedSegments.length; index++) {
        const {segment, staffLine} = sortedSegments[index];
        segment.setLinkedLayoutDiagnostics(linkedOutput.diagnostics);
        segment.applyCandidateLayoutResult(linkedOutput.results[index], staffLine);
      }
    }
  }

  /** Calculate cross-staff slurs after the system builder has fixed both staves' y positions. */
  protected calculateCrossStaffSlursAfterSystemYLayout(): void {
    if (!this.rules.RenderSlursAcrossStaves) {
      return;
    }
    for (const musicSystem of this.musicSystems) {
      for (const staffLine of musicSystem.StaffLines) {
        for (const graphicalSlur of staffLine.GraphicalSlurs) {
          if (graphicalSlur.slur.isCrossed()) {
            graphicalSlur.calculateCurveCrossStaff(this.rules);
          }
        }
      }
    }
  }

  public calculateGlissandi(): void {
    const openGlissDict: { [staffId: number]: GraphicalGlissando[] } = {};
    for (const graphicalMeasure of this.graphicalMusicSheet.MeasureList[0]) { //let i: number = 0; i < this.graphicalMusicSheet.MeasureList[0].length; i++) {
      openGlissDict[graphicalMeasure.ParentStaff.idInMusicSheet] = [];
    }

    for (const musicSystem of this.musicSystems) {
        for (const staffLine of musicSystem.StaffLines) {
          // if a glissando reaches out of the last musicsystem, we have to create another glissando reaching into this musicsystem
          // (one gliss needs 2 graphical gliss)
          // const isTab: boolean = staffLine.ParentStaff.isTab;
          const openGlissandi: GraphicalGlissando[] = openGlissDict[staffLine.ParentStaff.idInMusicSheet];
          for (let glissIndex: number = 0; glissIndex < openGlissandi.length; glissIndex++) {
            const oldGliss: GraphicalGlissando = openGlissandi[glissIndex];
            const newGliss: GraphicalGlissando = new VexFlowGlissando(oldGliss.Glissando);
            staffLine.addGlissandoToStaffline(newGliss);
            openGlissandi[glissIndex] = newGliss;
          }

          // add reference of gliss array to the VexFlowStaffline class
          for (const graphicalMeasure of staffLine.Measures) {
            for (const graphicalStaffEntry of graphicalMeasure.staffEntries) {
              // loop over "normal" notes (= no gracenotes)
              for (const graphicalVoiceEntry of graphicalStaffEntry.graphicalVoiceEntries) {
                for (const graphicalNote of graphicalVoiceEntry.notes) {
                  const gliss: Glissando = graphicalNote.sourceNote.NoteGlissando;
                  // extra check for some MusicSheets that have openSlurs (because only the first Page is available -> Recordare files)
                  if (!gliss?.EndNote || !gliss?.StartNote) {
                    continue;
                  }
                  // add new VexFlowGlissando to List
                  if (gliss.StartNote === graphicalNote.sourceNote) {
                    // Add a Graphical Glissando to the staffline, if the recent note is the Startnote of a slur
                    const gGliss: GraphicalGlissando = new VexFlowGlissando(gliss);
                    openGlissandi.push(gGliss);
                    //gGliss.staffEntries.push(graphicalStaffEntry);
                    staffLine.addGlissandoToStaffline(gGliss);
                  }
                  if (gliss.EndNote === graphicalNote.sourceNote) {
                    // Remove the gliss from the staffline if the note is the Endnote of a gliss
                    const index: number = this.indexOfGraphicalGlissFromGliss(openGlissandi, gliss);
                    if (index >= 0) {
                      // save Voice Entry in gliss and then remove it from array of open glissandi
                      const gGliss: GraphicalGlissando = openGlissandi[index];
                      if (gGliss.staffEntries.indexOf(graphicalStaffEntry) === -1) {
                        gGliss.staffEntries.push(graphicalStaffEntry);
                      }
                      openGlissandi.splice(index, 1);
                    }
                  }
                }
              }

              // probably unnecessary, as a gliss only has 2 staffentries
              //add the present Staffentry to all open slurs that don't contain this Staffentry already
              for (const gGliss of openGlissandi) {
                if (gGliss.staffEntries.indexOf(graphicalStaffEntry) === -1) {
                  gGliss.staffEntries.push(graphicalStaffEntry);
                }
              }
            } // loop over StaffEntries
          } // loop over Measures
        } // loop over StaffLines
      } // loop over MusicSystems

      for (const musicSystem of this.musicSystems) {
        for (const staffLine of musicSystem.StaffLines) {
        // order glissandi that were saved to the Staffline
        // TODO? Sort all gSlurs in the staffline using the Compare function in class GraphicalSlurSorter
        //const sortedGSlurs: GraphicalSlur[] = staffLine.GraphicalSlurs.sort(GraphicalSlur.Compare);
        for (const gGliss of staffLine.GraphicalGlissandi) {
          const isTab: boolean = staffLine.ParentStaff.isTab;
          if (isTab) {
            const startNote: TabNote = <TabNote> gGliss.Glissando.StartNote;
            const endNote: TabNote = <TabNote> gGliss.Glissando.EndNote;
            const vfStartNote: VexFlowGraphicalNote = gGliss.staffEntries[0].findGraphicalNoteFromNote(startNote) as VexFlowGraphicalNote;
            const vfEndNote: VexFlowGraphicalNote = gGliss.staffEntries.last().findGraphicalNoteFromNote(endNote) as VexFlowGraphicalNote;
            if (!vfStartNote && !vfEndNote) {
              return; // otherwise causes Vexflow error
            }

            let slideDirection: number = 1;
            if (startNote.FretNumber > endNote.FretNumber) {
              slideDirection = -1;
            }
            let firstIndexes: number[] = undefined;
            let lastIndexes: number[] = undefined;
            let startStemmableNote: VF.StemmableNote  = undefined;
            // let startNoteIndexInTie: number = 0;
            if (vfStartNote && vfStartNote.vfnote && vfStartNote.vfnote.length >= 2) {
              startStemmableNote = vfStartNote.vfnote[0]; // otherwise needs to be undefined in TabSlide constructor!
              firstIndexes = [0];
              // startNoteIndexInTie = vfStartNote.vfnote[1];
            }
            let endStemmableNote: VF.StemmableNote  = undefined;
            // let endNoteIndexInTie: number = 0;
            if (vfEndNote && vfEndNote.vfnote && vfEndNote.vfnote.length >= 2) {
              endStemmableNote = vfEndNote.vfnote[0];
              lastIndexes = [0];
              // endNoteIndexInTie = vfEndNote.vfnote[1];
            }
            const vfTie: VF.TabSlide = new VF.TabSlide(
              {
                firstIndexes: firstIndexes,
                firstNote: startStemmableNote,
                lastIndexes: lastIndexes,
                lastNote: endStemmableNote,
              },
              slideDirection
            );

            const startMeasure: VexFlowMeasure = (vfStartNote?.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
            if (startMeasure) {
              startMeasure.vfTies.push(vfTie);
              (gGliss as VexFlowGlissando).vfTie = vfTie;
            }
            const endMeasure: VexFlowMeasure = (vfEndNote?.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMeasure);
            if (endMeasure) {
              endMeasure.vfTies.push(vfTie);
              (gGliss as VexFlowGlissando).vfTie = vfTie;
            }
          } else {
            //gGliss.calculateLine(this.rules);
          }
        }
      }
    }
  }
}
