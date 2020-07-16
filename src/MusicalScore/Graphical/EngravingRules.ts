import { PagePlacementEnum } from "./GraphicalMusicPage";
//import {MusicSymbol} from "./MusicSymbol";
import log from "loglevel";
import { TextAlignmentEnum } from "../../Common/Enums/TextAlignment";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { AutoBeamOptions, AlignRestOption, FillEmptyMeasuresWithWholeRests } from "../../OpenSheetMusicDisplay/OSMDOptions";
import { ColoringModes as ColoringMode } from "./DrawingParameters";
import { Dictionary } from "typescript-collections";
import { FontStyles } from "../../Common/Enums";
import { NoteEnum } from "../../Common/DataObjects/Pitch";
import { ChordSymbolEnum } from "../../MusicalScore/VoiceData/ChordSymbolContainer";

export class EngravingRules {
    /** A unit of distance. 1.0 is the distance between lines of a stave for OSMD, which is 10 pixels in Vexflow. */
    private static unit: number = 1.0;
    private samplingUnit: number;
    private staccatoShorteningFactor: number;
    /** Height (size) of the sheet title. */
    private sheetTitleHeight: number;
    private sheetSubtitleHeight: number;
    private sheetMinimumDistanceBetweenTitleAndSubtitle: number;
    private sheetComposerHeight: number;
    private sheetAuthorHeight: number;
    private compactMode: boolean;
    private pagePlacementEnum: PagePlacementEnum;
    private pageHeight: number;
    private pageTopMargin: number;
    private pageTopMarginNarrow: number;
    private pageBottomMargin: number;
    private pageBottomExtraWhiteSpace: number; // experimental. extra white space that wil be added below the sheet
    private pageLeftMargin: number;
    private pageRightMargin: number;
    private titleTopDistance: number;
    private titleBottomDistance: number;
    private systemLeftMargin: number;
    private systemRightMargin: number;
    private systemLabelsRightMargin: number;
    private systemComposerDistance: number;
    private instrumentLabelTextHeight: number;
    private minimumDistanceBetweenSystems: number;
    private minSkyBottomDistBetweenSystems: number;
    private lastSystemMaxScalingFactor: number;
    private staffDistance: number;
    private betweenStaffDistance: number;
    private staffHeight: number;
    private tabStaffInterlineHeight: number;
    private betweenStaffLinesDistance: number;
    /** Whether to automatically beam notes that don't already have beams in XML. */
    private autoBeamNotes: boolean;
    /** Options for autoBeaming like whether to beam over rests. See AutoBeamOptions interface. */
    private autoBeamOptions: AutoBeamOptions;
    private beamWidth: number;
    private beamSpaceWidth: number;
    private beamForwardLength: number;
    private clefLeftMargin: number;
    private clefRightMargin: number;
    private percussionOneLineCutoff: number;
    private percussionForceVoicesOneLineCutoff: number;
    private betweenKeySymbolsDistance: number;
    private keyRightMargin: number;
    private rhythmRightMargin: number;
    private showRhythmAgainAfterPartEndOrFinalBarline: boolean;
    private inStaffClefScalingFactor: number;
    private distanceBetweenNaturalAndSymbolWhenCancelling: number;
    private noteHelperLinesOffset: number;
    private measureLeftMargin: number;
    private measureRightMargin: number;
    private distanceBetweenLastInstructionAndRepetitionBarline: number;
    private arpeggioDistance: number;
    private idealStemLength: number;
    private stemNoteHeadBorderYOffset: number;
    private stemWidth: number;
    private stemMargin: number;
    private stemMinLength: number;
    private stemMaxLength: number;
    private beamSlopeMaxAngle: number;
    private stemMinAllowedDistanceBetweenNoteHeadAndBeamLine: number;
    private setWantedStemDirectionByXml: boolean;
    private graceNoteScalingFactor: number;
    private graceNoteXOffset: number;
    private wedgeOpeningLength: number;
    private wedgeMeasureEndOpeningLength: number;
    private wedgeMeasureBeginOpeningLength: number;
    private wedgePlacementAboveY: number;
    private wedgePlacementBelowY: number;
    private wedgeHorizontalMargin: number;
    private wedgeVerticalMargin: number;
    private distanceOffsetBetweenTwoHorizontallyCrossedWedges: number;
    private wedgeMinLength: number;
    private distanceBetweenAdjacentDynamics: number;
    private tempoChangeMeasureValidity: number;
    private tempoContinousFactor: number;
    private staccatoScalingFactor: number;
    private betweenDotsDistance: number;
    private ornamentAccidentalScalingFactor: number;
    private chordSymbolTextHeight: number;
    private chordSymbolXSpacing: number;
    private chordSymbolYOffset: number;
    private chordSymbolLabelTexts: Dictionary<ChordSymbolEnum, string>;
    private measureNumberLabelHeight: number;
    private measureNumberLabelOffset: number;
    private measureNumberLabelXOffset: number;
    /** Whether tuplets should display ratio (3:2 instead of 3 for triplet). Default false. */
    private tupletsRatioed: boolean;
    /** Whether all tuplets should be bracketed (e.g. |--5--| instead of 5). Default false.
     * If false, only tuplets given as bracketed in XML (bracket="yes") will be bracketed.
     * (If not given in XML, bracketing is implementation-dependent according to standard)
     */
    private tupletsBracketed: boolean;
    /** Whether all triplets should be bracketed. Overrides tupletsBracketed for triplets.
     * If false, only triplets given as bracketed in XML (bracket="yes") will be bracketed.
     * (Bracketing all triplets can be cluttering)
     */
    private tripletsBracketed: boolean;
    private tupletNumberLabelHeight: number;
    private tupletNumberYOffset: number;
    private labelMarginBorderFactor: number;
    private tupletVerticalLineLength: number;
    private repetitionEndingLabelHeight: number;
    private repetitionEndingLabelXOffset: number;
    private repetitionEndingLabelYOffset: number;
    private repetitionEndingLineYLowerOffset: number;
    private repetitionEndingLineYUpperOffset: number;
    private voltaOffset: number;
    /** Default alignment of lyrics.
     * Left alignments will extend text to the right of the bounding box,
     * which facilitates spacing by extending measure width.
     */
    private lyricsAlignmentStandard: TextAlignmentEnum;
    private lyricsHeight: number;
    private lyricsYOffsetToStaffHeight: number;
    private verticalBetweenLyricsDistance: number;
    private horizontalBetweenLyricsDistance: number;
    private betweenSyllableMaximumDistance: number;
    private betweenSyllableMinimumDistance: number;
    private lyricOverlapAllowedIntoNextMeasure: number;
    private minimumDistanceBetweenDashes: number;
    private maximumLyricsElongationFactor: number;

    private bezierCurveStepSize: number;
    private tPower3: number[];
    private oneMinusTPower3: number[];
    private factorOne: number[];
    private factorTwo: number[];
    private tieGhostObjectWidth: number;
    private tieYPositionOffsetFactor: number;
    private minimumNeededXspaceForTieGhostObject: number;
    private tieHeightMinimum: number;
    private tieHeightMaximum: number;
    private tieHeightInterpolationK: number;
    private tieHeightInterpolationD: number;
    private slurNoteHeadYOffset: number;
    private slurStemXOffset: number;
    private slurSlopeMaxAngle: number;
    private slurTangentMinAngle: number;
    private slurTangentMaxAngle: number;
    private slursStartingAtSameStaffEntryYOffset: number;
    private instantaneousTempoTextHeight: number;
    private continuousDynamicTextHeight: number;
    private moodTextHeight: number;
    private unknownTextHeight: number;
    private continuousTempoTextHeight: number;
    private staffLineWidth: number;
    private ledgerLineWidth: number;
    private ledgerLineStrokeStyle: string;
    private wedgeLineWidth: number;
    private tupletLineWidth: number;
    private lyricUnderscoreLineWidth: number;
    private systemThinLineWidth: number;
    private systemBoldLineWidth: number;
    private systemRepetitionEndingLineWidth: number;
    private systemDotWidth: number;
    private multipleRestMeasureDefaultWidth: number;
    private distanceBetweenVerticalSystemLines: number;
    private distanceBetweenDotAndLine: number;
    private octaveShiftLineWidth: number;
    private octaveShiftVerticalLineLength: number;
    private graceLineWidth: number;
    private minimumStaffLineDistance: number;
    private minSkyBottomDistBetweenStaves: number;
    private minimumCrossedBeamDifferenceMargin: number;

    private voiceSpacingMultiplierVexflow: number;
    private voiceSpacingAddendVexflow: number;
    private displacedNoteMargin: number;
    private minNoteDistance: number;
    private subMeasureXSpacingThreshold: number;
    private measureDynamicsMaxScalingFactor: number;
    private wholeRestXShiftVexflow: number;
    private metronomeMarksDrawn: boolean;
    private metronomeMarkXShift: number;
    private metronomeMarkYShift: number;
    private softmaxFactorVexFlow: number;
    private maxInstructionsConstValue: number;
    private noteDistances: number[] = [1.0, 1.0, 1.3, 1.6, 2.0, 2.5, 3.0, 4.0];
    private noteDistancesScalingFactors: number[] = [1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0, 128.0];
    private durationDistanceDict: {[_: number]: number; } = {};
    private durationScalingDistanceDict: {[_: number]: number; } = {};

    private alignRests: number; // 0 = false, 1 = true, 2 = auto
    private fillEmptyMeasuresWithWholeRest: FillEmptyMeasuresWithWholeRests | number;
    private arpeggiosGoAcrossVoices: boolean;
    private renderArpeggios: boolean;
    private renderSlurs: boolean;
    private coloringMode: ColoringMode;
    private coloringEnabled: boolean;
    private colorStemsLikeNoteheads: boolean;
    private colorFlags: boolean;
    private colorBeams: boolean;
    private coloringSetCustom: Dictionary<NoteEnum|number, string>;
    private defaultColorNotehead: string;
    private defaultColorRest: string;
    private defaultColorStem: string;
    private defaultColorLabel: string;
    private defaultColorTitle: string;
    private defaultFontFamily: string;
    private defaultFontStyle: FontStyles;
    private defaultVexFlowNoteFont: string;
    private maxMeasureToDrawIndex: number;
    private minMeasureToDrawIndex: number;
    /** Whether to render a label for the composer of the piece at the top of the sheet. */
    private renderComposer: boolean;
    private renderTitle: boolean;
    private renderSubtitle: boolean;
    private renderLyricist: boolean;
    private renderPartNames: boolean;
    private renderPartAbbreviations: boolean;
    private renderFingerings: boolean;
    private renderMeasureNumbers: boolean;
    private renderLyrics: boolean;
    private renderMultipleRestMeasures: boolean;
    private renderTimeSignatures: boolean;
    private dynamicExpressionMaxDistance: number;
    private dynamicExpressionSpacer: number;
    /** Position of fingering label in relation to corresponding note (left, right supported, above, below experimental) */
    private fingeringPosition: PlacementEnum;
    private fingeringInsideStafflines: boolean;
    private fingeringLabelFontHeight: number;
    private fingeringOffsetX: number;
    private newSystemAtXMLNewSystemAttribute: boolean;
    private newPageAtXMLNewPageAttribute: boolean;
    private pageFormat: PageFormat;
    private pageBackgroundColor: string; // vexflow-color-string (#FFFFFF). Default undefined/transparent.
    private renderSingleHorizontalStaffline: boolean;
    private restoreCursorAfterRerender: boolean;

    private static fixStafflineBoundingBox: boolean; // TODO temporary workaround

    constructor() {
        // global variables
        this.samplingUnit = EngravingRules.unit * 3;

        // Page Label Variables
        this.sheetTitleHeight = 4.0;
        this.sheetSubtitleHeight = 2.0;
        this.sheetMinimumDistanceBetweenTitleAndSubtitle = 1.0;
        this.sheetComposerHeight = 2.0;
        this.sheetAuthorHeight = 2.0;

        // Staff sizing Variables
        this.compactMode = false;
        this.pagePlacementEnum = PagePlacementEnum.Down;
        this.pageHeight = 100001.0;
        this.pageTopMargin = 5.0;
        this.pageTopMarginNarrow = 0.0; // for compact mode
        this.pageBottomMargin = 5.0;
        this.pageBottomExtraWhiteSpace = 0.0; // experimental.
        this.pageLeftMargin = 5.0;
        this.pageRightMargin = 5.0;
        this.titleTopDistance = 9.0;
        this.titleBottomDistance = 1.0;
        this.staffDistance = 7.0;
        this.betweenStaffDistance = 5.0;
        this.minimumStaffLineDistance = 4.0;
        this.minSkyBottomDistBetweenStaves = 1.0; // default. compacttight mode sets it to 1.0 (as well).

        // System Sizing and Label Variables
        this.staffHeight = 4.0;
        this.tabStaffInterlineHeight = 1.1111;
        this.betweenStaffLinesDistance = EngravingRules.unit;
        this.systemLeftMargin = 0.0;
        this.systemRightMargin = 0.0;
        this.systemLabelsRightMargin = 2.0;
        this.systemComposerDistance = 2.0;
        this.instrumentLabelTextHeight = 2;
        this.minimumDistanceBetweenSystems = 7.0;
        this.minSkyBottomDistBetweenSystems = 5.0;
        this.lastSystemMaxScalingFactor = 1.4;

        // autoBeam options
        this.autoBeamNotes = false;
        this.autoBeamOptions = {
            beam_middle_rests_only: false,
            beam_rests: false,
            maintain_stem_directions: false
        };

        // Beam Sizing Variables
        this.beamWidth = EngravingRules.unit / 2.0;
        this.beamSpaceWidth = EngravingRules.unit / 3.0;
        this.beamForwardLength = 1.25 * EngravingRules.unit;

        // Beam Sizing Variables
        this.clefLeftMargin = 0.5;
        this.clefRightMargin = 0.75;
        this.percussionOneLineCutoff = 3;
        this.percussionForceVoicesOneLineCutoff = 1;
        this.betweenKeySymbolsDistance = 0.2;
        this.keyRightMargin = 0.75;
        this.rhythmRightMargin = 1.25;
        this.showRhythmAgainAfterPartEndOrFinalBarline = true;
        this.inStaffClefScalingFactor = 0.8;
        this.distanceBetweenNaturalAndSymbolWhenCancelling = 0.4;

        // Beam Sizing Variables
        this.noteHelperLinesOffset = 0.25;
        this.measureLeftMargin = 0.7;
        this.measureRightMargin = 0.0;
        this.distanceBetweenLastInstructionAndRepetitionBarline = 1.0;
        this.arpeggioDistance = 0.6;

        // Stems Variables
        this.staccatoShorteningFactor = 2;
        this.idealStemLength = 3.0;
        this.stemNoteHeadBorderYOffset = 0.2;
        this.stemWidth = 0.13;
        this.stemMargin = 0.2;
        this.stemMinLength = 2.5;
        this.stemMaxLength = 4.5;
        this.beamSlopeMaxAngle = 10.0;
        this.stemMinAllowedDistanceBetweenNoteHeadAndBeamLine = 1.0;
        this.setWantedStemDirectionByXml = true;

        // GraceNote Variables
        this.graceNoteScalingFactor = 0.6;
        this.graceNoteXOffset = 0.2;

        // Wedge Variables
        this.wedgeOpeningLength = 1.2;
        this.wedgeMeasureEndOpeningLength = 0.75;
        this.wedgeMeasureBeginOpeningLength = 0.75;
        this.wedgePlacementAboveY = -1.5;
        this.wedgePlacementBelowY = 1.5;
        this.wedgeHorizontalMargin = 0.6;
        this.wedgeVerticalMargin = 0.5;
        this.distanceOffsetBetweenTwoHorizontallyCrossedWedges = 0.3;
        this.wedgeMinLength = 2.0;
        this.distanceBetweenAdjacentDynamics = 0.75;

        // Tempo Variables
        this.tempoChangeMeasureValidity = 4;
        this.tempoContinousFactor = 0.7;

        // various
        this.staccatoScalingFactor = 0.8;
        this.betweenDotsDistance = 0.8;
        this.ornamentAccidentalScalingFactor = 0.65;
        this.chordSymbolTextHeight = 2.0;
        this.chordSymbolXSpacing = 1.0;
        this.chordSymbolYOffset = 2.0;
        this.chordSymbolLabelTexts = new Dictionary<ChordSymbolEnum, string>();
        this.resetChordSymbolLabelTexts(this.chordSymbolLabelTexts);


        // Tuplets, MeasureNumber and TupletNumber Labels
        this.measureNumberLabelHeight = 1.5 * EngravingRules.unit;
        this.measureNumberLabelOffset = 2;
        this.measureNumberLabelXOffset = -0.5;
        this.tupletsRatioed = false;
        this.tupletsBracketed = false;
        this.tripletsBracketed = false; // special setting for triplets, overrides tuplet setting (for triplets only)
        this.tupletNumberLabelHeight = 1.5 * EngravingRules.unit;
        this.tupletNumberYOffset = 0.5;
        this.labelMarginBorderFactor = 0.1;
        this.tupletVerticalLineLength = 0.5;

        // Slur and Tie variables
        this.bezierCurveStepSize = 1000;
        this.calculateCurveParametersArrays();
        this.tieGhostObjectWidth = 0.75;
        this.tieYPositionOffsetFactor = 0.3;
        this.minimumNeededXspaceForTieGhostObject = 1.0;
        this.tieHeightMinimum = 0.28;
        this.tieHeightMaximum = 1.2;
        this.tieHeightInterpolationK = 0.0288;
        this.tieHeightInterpolationD = 0.136;
        this.slurNoteHeadYOffset = 0.5;
        this.slurStemXOffset = 0.3;
        this.slurSlopeMaxAngle = 15.0;
        this.slurTangentMinAngle = 30.0;
        this.slurTangentMaxAngle = 80.0;
        this.slursStartingAtSameStaffEntryYOffset = 0.8;

        // Repetitions
        this.repetitionEndingLabelHeight = 2.0;
        this.repetitionEndingLabelXOffset = 0.5;
        this.repetitionEndingLabelYOffset = 0.3;
        this.repetitionEndingLineYLowerOffset = 0.5;
        this.repetitionEndingLineYUpperOffset = 0.3;
        this.voltaOffset = 2.5;

        // Lyrics
        this.lyricsAlignmentStandard = TextAlignmentEnum.LeftBottom; // CenterBottom and LeftBottom tested, spacing-optimized
        this.lyricsHeight = 2.0; // actually size of lyrics
        this.lyricsYOffsetToStaffHeight = 3.0; // distance between lyrics and staff. could partly be even lower/dynamic
        this.verticalBetweenLyricsDistance = 0.5;
        this.horizontalBetweenLyricsDistance = 0.2;
        this.betweenSyllableMaximumDistance = 10.0;
        this.betweenSyllableMinimumDistance = 0.5; // + 1.0 for CenterAlignment added in lyrics spacing
        this.lyricOverlapAllowedIntoNextMeasure = 3.4; // optimal for dashed last lyric, see Land der Berge
        this.minimumDistanceBetweenDashes = 10;
        this.maximumLyricsElongationFactor = 2.5;

        // expressions variables
        this.instantaneousTempoTextHeight = 2.3;
        this.continuousDynamicTextHeight = 2.3;
        this.moodTextHeight = 2.3;
        this.unknownTextHeight = 2.0;
        this.continuousTempoTextHeight = 2.3;
        this.dynamicExpressionMaxDistance = 2;
        this.dynamicExpressionSpacer = 0.5;

        // Line Widths
        this.staffLineWidth = 0.12;
        this.ledgerLineWidth = undefined; // if not undefined, the vexflow default will be overwritten
        this.ledgerLineStrokeStyle = undefined; // if not undefined, the vexflow default will be overwritten
        this.wedgeLineWidth = 0.12;
        this.tupletLineWidth = 0.12;
        this.lyricUnderscoreLineWidth = 0.12;
        this.systemThinLineWidth = 0.12;
        this.systemBoldLineWidth = EngravingRules.unit / 2.0;
        this.systemRepetitionEndingLineWidth = 0.12;
        this.systemDotWidth = EngravingRules.unit / 5.0;
        this.distanceBetweenVerticalSystemLines = 0.35;
        this.distanceBetweenDotAndLine = 0.7;
        this.octaveShiftLineWidth = 0.12;
        this.octaveShiftVerticalLineLength = EngravingRules.unit;
        this.graceLineWidth = this.staffLineWidth * this.GraceNoteScalingFactor;

        this.multipleRestMeasureDefaultWidth = 4;

        // Line Widths
        this.minimumCrossedBeamDifferenceMargin = 0.0001;

        // xSpacing Variables
        this.voiceSpacingMultiplierVexflow = 0.85;
        this.voiceSpacingAddendVexflow = 3.0;
        this.displacedNoteMargin = 0.1;
        this.minNoteDistance = 2.0;
        this.subMeasureXSpacingThreshold = 35;
        this.measureDynamicsMaxScalingFactor = 2.5;
        this.wholeRestXShiftVexflow = -1.5; // VexFlow draws rest notes too far to the right
        this.metronomeMarksDrawn = true;
        this.metronomeMarkXShift = -6; // our unit, is taken * unitInPixels
        this.metronomeMarkYShift = -0.5;
        this.softmaxFactorVexFlow = 15; // only applies to Vexflow 3.x. 15 seems like the sweet spot. Vexflow default is 100.
        // if too high, score gets too big, especially half notes. with half note quarter quarter, the quarters get squeezed.
        // if too low, smaller notes aren't positioned correctly.

        // Render options (whether to render specific or invisible elements)
        this.alignRests = AlignRestOption.Never; // 0 = false, 1 = true, 2 = auto
        this.fillEmptyMeasuresWithWholeRest = FillEmptyMeasuresWithWholeRests.No;
        this.arpeggiosGoAcrossVoices = false; // safe option, as otherwise arpeggios will always go across all voices in Vexflow, which is often unwanted
        this.renderArpeggios = true;
        this.renderSlurs = true;
        this.coloringMode = ColoringMode.XML;
        this.coloringEnabled = true;
        this.colorStemsLikeNoteheads = false;
        this.colorBeams = true;
        this.colorFlags = true;
        this.defaultColorNotehead = "#000000"; // black. undefined is only black if a note's color hasn't been changed before.
        this.defaultColorRest = this.defaultColorNotehead;
        this.defaultColorStem = this.defaultColorNotehead;
        this.defaultColorLabel = this.defaultColorNotehead;
        this.defaultColorTitle = this.defaultColorNotehead;
        this.defaultFontFamily = "Times New Roman"; // what OSMD was initially optimized for
        this.defaultFontStyle = FontStyles.Regular;
        this.defaultVexFlowNoteFont = "gonville"; // was the default vexflow font up to vexflow 1.2.93, now it's Bravura, which is more cursive/bold
        this.maxMeasureToDrawIndex = Number.MAX_VALUE;
        this.minMeasureToDrawIndex = 0;
        this.renderComposer = true;
        this.renderTitle = true;
        this.renderSubtitle = true;
        this.renderLyricist = true;
        this.renderPartNames = true;
        this.renderPartAbbreviations = true;
        this.renderFingerings = true;
        this.renderMeasureNumbers = true;
        this.renderLyrics = true;
        this.renderMultipleRestMeasures = true;
        this.renderTimeSignatures = true;
        this.fingeringPosition = PlacementEnum.Left; // easier to get bounding box, and safer for vertical layout
        this.fingeringInsideStafflines = false;
        this.fingeringLabelFontHeight = 1.7;
        this.fingeringOffsetX = 0.0;
        this.newSystemAtXMLNewSystemAttribute = false;
        this.newPageAtXMLNewPageAttribute = false;
        this.restoreCursorAfterRerender = true;

        EngravingRules.FixStafflineBoundingBox = false; // TODO temporary workaround

        this.pageFormat = PageFormat.UndefinedPageFormat; // default: undefined / 'infinite' height page, using the canvas'/container's width and height
        this.pageBackgroundColor = undefined; // default: transparent. half-transparent white: #FFFFFF88"
        this.renderSingleHorizontalStaffline = false;

        this.populateDictionaries();
        try {
            this.maxInstructionsConstValue = this.ClefLeftMargin + this.ClefRightMargin + this.KeyRightMargin + this.RhythmRightMargin + 11;
            //if (FontInfo.Info) {
            //    this.maxInstructionsConstValue += FontInfo.Info.getBoundingBox(MusicSymbol.G_CLEF).width
            //        + FontInfo.Info.getBoundingBox(MusicSymbol.FOUR).width
            //        + 7 * FontInfo.Info.getBoundingBox(MusicSymbol.SHARP).width;
            //}
        } catch (ex) {
            log.info("EngravingRules()", ex);
        }
    }

    // these two need to be static so that we can avoid passing EngravingRules to BoundingBox in lots of code
    public static get FixStafflineBoundingBox(): boolean {
        return EngravingRules.fixStafflineBoundingBox;
    }
    public static set FixStafflineBoundingBox(value: boolean) {
        EngravingRules.fixStafflineBoundingBox = value;
    }
    public get SamplingUnit(): number {
        return this.samplingUnit;
    }
    public get SheetTitleHeight(): number {
        return this.sheetTitleHeight;
    }
    public set SheetTitleHeight(value: number) {
        this.sheetTitleHeight = value;
    }
    public get SheetSubtitleHeight(): number {
        return this.sheetSubtitleHeight;
    }
    public set SheetSubtitleHeight(value: number) {
        this.sheetSubtitleHeight = value;
    }
    public get SheetMinimumDistanceBetweenTitleAndSubtitle(): number {
        return this.sheetMinimumDistanceBetweenTitleAndSubtitle;
    }
    public set SheetMinimumDistanceBetweenTitleAndSubtitle(value: number) {
        this.sheetMinimumDistanceBetweenTitleAndSubtitle = value;
    }
    public get SheetComposerHeight(): number {
        return this.sheetComposerHeight;
    }
    public set SheetComposerHeight(value: number) {
        this.sheetComposerHeight = value;
    }
    public get SheetAuthorHeight(): number {
        return this.sheetAuthorHeight;
    }
    public set SheetAuthorHeight(value: number) {
        this.sheetAuthorHeight = value;
    }
    public get PagePlacement(): PagePlacementEnum {
        return this.pagePlacementEnum;
    }
    public set PagePlacement(value: PagePlacementEnum) {
        this.pagePlacementEnum = value;
    }
    public get CompactMode(): boolean {
        return this.compactMode;
    }
    public set CompactMode(value: boolean) {
        this.compactMode = value;
    }
    public get PageHeight(): number {
        return this.pageHeight;
    }
    public set PageHeight(value: number) {
        this.pageHeight = value;
    }
    public get PageTopMargin(): number {
        return this.pageTopMargin;
    }
    public set PageTopMargin(value: number) {
        this.pageTopMargin = value;
    }
    public get PageTopMarginNarrow(): number {
        return this.pageTopMarginNarrow;
    }
    public set PageTopMarginNarrow(value: number) {
        this.pageTopMarginNarrow = value;
    }
    public get PageBottomMargin(): number {
        return this.pageBottomMargin;
    }
    public set PageBottomMargin(value: number) {
        this.pageBottomMargin = value;
    }
    public get PageBottomExtraWhiteSpace(): number {
        return this.pageBottomExtraWhiteSpace;
    }
    public set PageBottomExtraWhiteSpace(value: number) {
        this.pageBottomExtraWhiteSpace = value;
    }
    public get PageLeftMargin(): number {
        return this.pageLeftMargin;
    }
    public set PageLeftMargin(value: number) {
        this.pageLeftMargin = value;
    }
    public get PageRightMargin(): number {
        return this.pageRightMargin;
    }
    public set PageRightMargin(value: number) {
        this.pageRightMargin = value;
    }
    public get TitleTopDistance(): number {
        return this.titleTopDistance;
    }
    public set TitleTopDistance(value: number) {
        this.titleTopDistance = value;
    }
    public get TitleBottomDistance(): number {
        return this.titleBottomDistance;
    }
    public set TitleBottomDistance(value: number) {
        this.titleBottomDistance = value;
    }
    public get SystemComposerDistance(): number {
        return this.systemComposerDistance;
    }
    public set SystemComposerDistance(value: number) {
        this.systemComposerDistance = value;
    }
    public get InstrumentLabelTextHeight(): number {
        return this.instrumentLabelTextHeight;
    }
    public set InstrumentLabelTextHeight(value: number) {
        this.instrumentLabelTextHeight = value;
    }
    public get SystemLeftMargin(): number {
        return this.systemLeftMargin;
    }
    public set SystemLeftMargin(value: number) {
        this.systemLeftMargin = value;
    }
    public get SystemRightMargin(): number {
        return this.systemRightMargin;
    }
    public set SystemRightMargin(value: number) {
        this.systemRightMargin = value;
    }
    public get SystemLabelsRightMargin(): number {
        return this.systemLabelsRightMargin;
    }
    public set SystemLabelsRightMargin(value: number) {
        this.systemLabelsRightMargin = value;
    }
    public get MinimumDistanceBetweenSystems(): number {
        return this.minimumDistanceBetweenSystems;
    }
    public set MinimumDistanceBetweenSystems(value: number) {
        this.minimumDistanceBetweenSystems = value;
    }
    public get MinSkyBottomDistBetweenSystems(): number {
        return this.minSkyBottomDistBetweenSystems;
    }
    public set MinSkyBottomDistBetweenSystems(value: number) {
        this.minSkyBottomDistBetweenSystems = value;
    }
    public get LastSystemMaxScalingFactor(): number {
        return this.lastSystemMaxScalingFactor;
    }
    public set LastSystemMaxScalingFactor(value: number) {
        this.lastSystemMaxScalingFactor = value;
    }
    public get StaffDistance(): number {
        return this.staffDistance;
    }
    public set StaffDistance(value: number) {
        this.staffDistance = value;
    }
    public get BetweenStaffDistance(): number {
        return this.betweenStaffDistance;
    }
    public set BetweenStaffDistance(value: number) {
        this.betweenStaffDistance = value;
    }
    public get StaffHeight(): number {
        return this.staffHeight;
    }
    public set StaffHeight(value: number) {
        this.staffHeight = value;
    }
    public get TabStaffInterlineHeight(): number {
        return this.tabStaffInterlineHeight;
    }
    public set TabStaffInterlineHeight(value: number) {
        this.tabStaffInterlineHeight = value;
    }
    public get BetweenStaffLinesDistance(): number {
        return this.betweenStaffLinesDistance;
    }
    public set BetweenStaffLinesDistance(value: number) {
        this.betweenStaffLinesDistance = value;
    }
    public get AutoBeamNotes(): boolean {
        return this.autoBeamNotes;
    }
    public set AutoBeamNotes(value: boolean) {
        this.autoBeamNotes = value;
    }
    public get AutoBeamOptions(): AutoBeamOptions {
        return this.autoBeamOptions;
    }
    public set AutoBeamOptions(value: AutoBeamOptions) {
        this.autoBeamOptions = value;
    }
    public get BeamWidth(): number {
        return this.beamWidth;
    }
    public set BeamWidth(value: number) {
        this.beamWidth = value;
    }
    public get BeamSpaceWidth(): number {
        return this.beamSpaceWidth;
    }
    public set BeamSpaceWidth(value: number) {
        this.beamSpaceWidth = value;
    }
    public get BeamForwardLength(): number {
        return this.beamForwardLength;
    }
    public set BeamForwardLength(value: number) {
        this.beamForwardLength = value;
    }
    public get BetweenKeySymbolsDistance(): number {
        return this.betweenKeySymbolsDistance;
    }
    public set BetweenKeySymbolsDistance(value: number) {
        this.betweenKeySymbolsDistance = value;
    }
    public get ClefLeftMargin(): number {
        return this.clefLeftMargin;
    }
    public set ClefLeftMargin(value: number) {
        this.clefLeftMargin = value;
    }
    public get ClefRightMargin(): number {
        return this.clefRightMargin;
    }
    public set ClefRightMargin(value: number) {
        this.clefRightMargin = value;
    }
    public get PercussionOneLineCutoff(): number {
        return this.percussionOneLineCutoff;
    }
    public set PercussionOneLineCutoff(value: number) {
        this.percussionOneLineCutoff = value;
    }
    public get PercussionForceVoicesOneLineCutoff(): number {
        return this.percussionForceVoicesOneLineCutoff;
    }
    public set PercussionForceVoicesOneLineCutoff(value: number) {
        this.percussionForceVoicesOneLineCutoff = value;
    }
    public get KeyRightMargin(): number {
        return this.keyRightMargin;
    }
    public set KeyRightMargin(value: number) {
        this.keyRightMargin = value;
    }
    public get RhythmRightMargin(): number {
        return this.rhythmRightMargin;
    }
    public set RhythmRightMargin(value: number) {
        this.rhythmRightMargin = value;
    }
    public get ShowRhythmAgainAfterPartEndOrFinalBarline(): boolean {
        return this.showRhythmAgainAfterPartEndOrFinalBarline;
    }
    public set ShowRhythmAgainAfterPartEndOrFinalBarline(value: boolean) {
        this.showRhythmAgainAfterPartEndOrFinalBarline = value;
    }
    public get InStaffClefScalingFactor(): number {
        return this.inStaffClefScalingFactor;
    }
    public set InStaffClefScalingFactor(value: number) {
        this.inStaffClefScalingFactor = value;
    }
    public get DistanceBetweenNaturalAndSymbolWhenCancelling(): number {
        return this.distanceBetweenNaturalAndSymbolWhenCancelling;
    }
    public set DistanceBetweenNaturalAndSymbolWhenCancelling(value: number) {
        this.distanceBetweenNaturalAndSymbolWhenCancelling = value;
    }
    public get NoteHelperLinesOffset(): number {
        return this.noteHelperLinesOffset;
    }
    public set NoteHelperLinesOffset(value: number) {
        this.noteHelperLinesOffset = value;
    }
    public get MeasureLeftMargin(): number {
        return this.measureLeftMargin;
    }
    public set MeasureLeftMargin(value: number) {
        this.measureLeftMargin = value;
    }
    public get MeasureRightMargin(): number {
        return this.measureRightMargin;
    }
    public set MeasureRightMargin(value: number) {
        this.measureRightMargin = value;
    }
    public get DistanceBetweenLastInstructionAndRepetitionBarline(): number {
        return this.distanceBetweenLastInstructionAndRepetitionBarline;
    }
    public set DistanceBetweenLastInstructionAndRepetitionBarline(value: number) {
        this.distanceBetweenLastInstructionAndRepetitionBarline = value;
    }
    public get ArpeggioDistance(): number {
        return this.arpeggioDistance;
    }
    public set ArpeggioDistance(value: number) {
        this.arpeggioDistance = value;
    }
    public get StaccatoShorteningFactor(): number {
        return this.staccatoShorteningFactor;
    }
    public set StaccatoShorteningFactor(value: number) {
        this.staccatoShorteningFactor = value;
    }
    public get IdealStemLength(): number {
        return this.idealStemLength;
    }
    public set IdealStemLength(value: number) {
        this.idealStemLength = value;
    }
    public get StemNoteHeadBorderYOffset(): number {
        return this.stemNoteHeadBorderYOffset;
    }
    public set StemNoteHeadBorderYOffset(value: number) {
        this.stemNoteHeadBorderYOffset = value;
    }
    public get StemWidth(): number {
        return this.stemWidth;
    }
    public set StemWidth(value: number) {
        this.stemWidth = value;
    }
    public get StemMargin(): number {
        return this.stemMargin;
    }
    public set StemMargin(value: number) {
        this.stemMargin = value;
    }
    public get StemMinLength(): number {
        return this.stemMinLength;
    }
    public set StemMinLength(value: number) {
        this.stemMinLength = value;
    }
    public get StemMaxLength(): number {
        return this.stemMaxLength;
    }
    public set StemMaxLength(value: number) {
        this.stemMaxLength = value;
    }
    public get BeamSlopeMaxAngle(): number {
        return this.beamSlopeMaxAngle;
    }
    public set BeamSlopeMaxAngle(value: number) {
        this.beamSlopeMaxAngle = value;
    }
    public get StemMinAllowedDistanceBetweenNoteHeadAndBeamLine(): number {
        return this.stemMinAllowedDistanceBetweenNoteHeadAndBeamLine;
    }
    public set StemMinAllowedDistanceBetweenNoteHeadAndBeamLine(value: number) {
        this.stemMinAllowedDistanceBetweenNoteHeadAndBeamLine = value;
    }
    public get SetWantedStemDirectionByXml(): boolean {
        return this.setWantedStemDirectionByXml;
    }
    public set SetWantedStemDirectionByXml(value: boolean) {
        this.setWantedStemDirectionByXml = value;
    }
    public get GraceNoteScalingFactor(): number {
        return this.graceNoteScalingFactor;
    }
    public set GraceNoteScalingFactor(value: number) {
        this.graceNoteScalingFactor = value;
    }
    public get GraceNoteXOffset(): number {
        return this.graceNoteXOffset;
    }
    public set GraceNoteXOffset(value: number) {
        this.graceNoteXOffset = value;
    }
    public get WedgeOpeningLength(): number {
        return this.wedgeOpeningLength;
    }
    public set WedgeOpeningLength(value: number) {
        this.wedgeOpeningLength = value;
    }
    public get WedgeMeasureEndOpeningLength(): number {
        return this.wedgeMeasureEndOpeningLength;
    }
    public set WedgeMeasureEndOpeningLength(value: number) {
        this.wedgeMeasureEndOpeningLength = value;
    }
    public get WedgeMeasureBeginOpeningLength(): number {
        return this.wedgeMeasureBeginOpeningLength;
    }
    public set WedgeMeasureBeginOpeningLength(value: number) {
        this.wedgeMeasureBeginOpeningLength = value;
    }
    public get WedgePlacementAboveY(): number {
        return this.wedgePlacementAboveY;
    }
    public set WedgePlacementAboveY(value: number) {
        this.wedgePlacementAboveY = value;
    }
    public get WedgePlacementBelowY(): number {
        return this.wedgePlacementBelowY;
    }
    public set WedgePlacementBelowY(value: number) {
        this.wedgePlacementBelowY = value;
    }
    public get WedgeHorizontalMargin(): number {
        return this.wedgeHorizontalMargin;
    }
    public set WedgeHorizontalMargin(value: number) {
        this.wedgeHorizontalMargin = value;
    }
    public get WedgeVerticalMargin(): number {
        return this.wedgeVerticalMargin;
    }
    public set WedgeVerticalMargin(value: number) {
        this.wedgeVerticalMargin = value;
    }
    public get DistanceOffsetBetweenTwoHorizontallyCrossedWedges(): number {
        return this.distanceOffsetBetweenTwoHorizontallyCrossedWedges;
    }
    public set DistanceOffsetBetweenTwoHorizontallyCrossedWedges(value: number) {
        this.distanceOffsetBetweenTwoHorizontallyCrossedWedges = value;
    }
    public get WedgeMinLength(): number {
        return this.wedgeMinLength;
    }
    public set WedgeMinLength(value: number) {
        this.wedgeMinLength = value;
    }
    public get DistanceBetweenAdjacentDynamics(): number {
        return this.distanceBetweenAdjacentDynamics;
    }
    public set DistanceBetweenAdjacentDynamics(value: number) {
        this.distanceBetweenAdjacentDynamics = value;
    }
    public get TempoChangeMeasureValidity(): number {
        return this.tempoChangeMeasureValidity;
    }
    public set TempoChangeMeasureValidity(value: number) {
        this.tempoChangeMeasureValidity = value;
    }
    public get TempoContinousFactor(): number {
        return this.tempoContinousFactor;
    }
    public set TempoContinousFactor(value: number) {
        this.tempoContinousFactor = value;
    }
    public get StaccatoScalingFactor(): number {
        return this.staccatoScalingFactor;
    }
    public set StaccatoScalingFactor(value: number) {
        this.staccatoScalingFactor = value;
    }
    public get BetweenDotsDistance(): number {
        return this.betweenDotsDistance;
    }
    public set BetweenDotsDistance(value: number) {
        this.betweenDotsDistance = value;
    }
    public get OrnamentAccidentalScalingFactor(): number {
        return this.ornamentAccidentalScalingFactor;
    }
    public set OrnamentAccidentalScalingFactor(value: number) {
        this.ornamentAccidentalScalingFactor = value;
    }
    public get ChordSymbolTextHeight(): number {
        return this.chordSymbolTextHeight;
    }
    public set ChordSymbolTextHeight(value: number) {
        this.chordSymbolTextHeight = value;
    }
    public get ChordSymbolXSpacing(): number {
        return this.chordSymbolXSpacing;
    }
    public set ChordSymbolXSpacing(value: number) {
        this.chordSymbolXSpacing = value;
    }
    public get ChordSymbolYOffset(): number {
        return this.chordSymbolYOffset;
    }
    public set ChordSymbolYOffset(value: number) {
        this.chordSymbolYOffset = value;
    }
    public setChordSymbolLabelText(key: ChordSymbolEnum, value: string): void {
        this.chordSymbolLabelTexts.setValue(key, value);
    }
    public get ChordSymbolLabelTexts(): Dictionary<ChordSymbolEnum, string> {
        return this.chordSymbolLabelTexts;
    }
    public set ChordSymbolLabelTexts(value: Dictionary<ChordSymbolEnum, string>) {
        this.chordSymbolLabelTexts = value;
    }
    public get MeasureNumberLabelHeight(): number {
        return this.measureNumberLabelHeight;
    }
    public set MeasureNumberLabelHeight(value: number) {
        this.measureNumberLabelHeight = value;
    }
    public get MeasureNumberLabelOffset(): number {
        return this.measureNumberLabelOffset;
    }
    public set MeasureNumberLabelOffset(value: number) {
        this.measureNumberLabelOffset = value;
    }
    public get MeasureNumberLabelXOffset(): number {
        return this.measureNumberLabelXOffset;
    }
    public set MeasureNumberLabelXOffset(value: number) {
        this.measureNumberLabelXOffset = value;
    }
    public get TupletsRatioed(): boolean {
        return this.tupletsRatioed;
    }
    public set TupletsRatioed(value: boolean) {
        this.tupletsRatioed = value;
    }
    public get TupletsBracketed(): boolean {
        return this.tupletsBracketed;
    }
    public set TupletsBracketed(value: boolean) {
        this.tupletsBracketed = value;
    }
    public get TripletsBracketed(): boolean {
        return this.tripletsBracketed;
    }
    public set TripletsBracketed(value: boolean) {
        this.tripletsBracketed = value;
    }
    public get TupletNumberLabelHeight(): number {
        return this.tupletNumberLabelHeight;
    }
    public set TupletNumberLabelHeight(value: number) {
        this.tupletNumberLabelHeight = value;
    }
    public get TupletNumberYOffset(): number {
        return this.tupletNumberYOffset;
    }
    public set TupletNumberYOffset(value: number) {
        this.tupletNumberYOffset = value;
    }
    public get LabelMarginBorderFactor(): number {
        return this.labelMarginBorderFactor;
    }
    public set LabelMarginBorderFactor(value: number) {
        this.labelMarginBorderFactor = value;
    }
    public get TupletVerticalLineLength(): number {
        return this.tupletVerticalLineLength;
    }
    public set TupletVerticalLineLength(value: number) {
        this.tupletVerticalLineLength = value;
    }
    public get RepetitionEndingLabelHeight(): number {
        return this.repetitionEndingLabelHeight;
    }
    public set RepetitionEndingLabelHeight(value: number) {
        this.repetitionEndingLabelHeight = value;
    }
    public get RepetitionEndingLabelXOffset(): number {
        return this.repetitionEndingLabelXOffset;
    }
    public set RepetitionEndingLabelXOffset(value: number) {
        this.repetitionEndingLabelXOffset = value;
    }
    public get RepetitionEndingLabelYOffset(): number {
        return this.repetitionEndingLabelYOffset;
    }
    public set RepetitionEndingLabelYOffset(value: number) {
        this.repetitionEndingLabelYOffset = value;
    }
    public get RepetitionEndingLineYLowerOffset(): number {
        return this.repetitionEndingLineYLowerOffset;
    }
    public set RepetitionEndingLineYLowerOffset(value: number) {
        this.repetitionEndingLineYLowerOffset = value;
    }
    public get RepetitionEndingLineYUpperOffset(): number {
        return this.repetitionEndingLineYUpperOffset;
    }
    public set RepetitionEndingLineYUpperOffset(value: number) {
        this.repetitionEndingLineYUpperOffset = value;
    }
    public get VoltaOffset(): number {
        return this.voltaOffset;
    }
    public set VoltaOffset(value: number) {
        this.voltaOffset = value;
    }
    public get LyricsAlignmentStandard(): TextAlignmentEnum {
        return this.lyricsAlignmentStandard;
    }
    public set LyricsAlignmentStandard(value: TextAlignmentEnum) {
        this.lyricsAlignmentStandard = value;
    }
    public get LyricsHeight(): number {
        return this.lyricsHeight;
    }
    public set LyricsHeight(value: number) {
        this.lyricsHeight = value;
    }
    public get LyricsYOffsetToStaffHeight(): number {
        return this.lyricsYOffsetToStaffHeight;
    }
    public set LyricsYOffsetToStaffHeight(value: number) {
        this.lyricsYOffsetToStaffHeight = value;
    }
    public get VerticalBetweenLyricsDistance(): number {
        return this.verticalBetweenLyricsDistance;
    }
    public set VerticalBetweenLyricsDistance(value: number) {
        this.verticalBetweenLyricsDistance = value;
    }
    public get HorizontalBetweenLyricsDistance(): number {
        return this.horizontalBetweenLyricsDistance;
    }
    public set HorizontalBetweenLyricsDistance(value: number) {
        this.horizontalBetweenLyricsDistance = value;
    }
    public get BetweenSyllableMaximumDistance(): number {
        return this.betweenSyllableMaximumDistance;
    }
    public set BetweenSyllableMaximumDistance(value: number) {
        this.betweenSyllableMaximumDistance = value;
    }
    public get BetweenSyllableMinimumDistance(): number {
        return this.betweenSyllableMinimumDistance;
    }
    public set BetweenSyllableMinimumDistance(value: number) {
        this.betweenSyllableMinimumDistance = value;
    }
    public get LyricOverlapAllowedIntoNextMeasure(): number {
        return this.lyricOverlapAllowedIntoNextMeasure;
    }
    public set LyricOverlapAllowedIntoNextMeasure(value: number) {
        this.lyricOverlapAllowedIntoNextMeasure = value;
    }
    public get MinimumDistanceBetweenDashes(): number {
        return this.minimumDistanceBetweenDashes;
    }
    public set MinimumDistanceBetweenDashes(value: number) {
        this.minimumDistanceBetweenDashes = value;
    }
    public get MaximumLyricsElongationFactor(): number {
        return this.maximumLyricsElongationFactor;
    }
    public set MaximumLyricsElongationFactor(value: number) {
        this.maximumLyricsElongationFactor = value;
    }
    public get BezierCurveStepSize(): number {
        return this.bezierCurveStepSize;
    }
    public set BezierCurveStepSize(value: number) {
        this.bezierCurveStepSize = value;
    }
    public get TPow3(): number[] {
        return this.tPower3;
    }
    public set TPow3(value: number[]) {
        this.tPower3 = value;
    }
    public get OneMinusTPow3(): number[] {
        return this.oneMinusTPower3;
    }
    public set OneMinusTPow3(value: number[]) {
        this.oneMinusTPower3 = value;
    }
    public get BezierFactorOne(): number[] {
        return this.factorOne;
    }
    public set BezierFactorOne(value: number[]) {
        this.factorOne = value;
    }
    public get BezierFactorTwo(): number[] {
        return this.factorTwo;
    }
    public set BezierFactorTwo(value: number[]) {
        this.factorTwo = value;
    }
    public get TieGhostObjectWidth(): number {
        return this.tieGhostObjectWidth;
    }
    public set TieGhostObjectWidth(value: number) {
        this.tieGhostObjectWidth = value;
    }
    public get TieYPositionOffsetFactor(): number {
        return this.tieYPositionOffsetFactor;
    }
    public set TieYPositionOffsetFactor(value: number) {
        this.tieYPositionOffsetFactor = value;
    }
    public get MinimumNeededXspaceForTieGhostObject(): number {
        return this.minimumNeededXspaceForTieGhostObject;
    }
    public set MinimumNeededXspaceForTieGhostObject(value: number) {
        this.minimumNeededXspaceForTieGhostObject = value;
    }
    public get TieHeightMinimum(): number {
        return this.tieHeightMinimum;
    }
    public set TieHeightMinimum(value: number) {
        this.tieHeightMinimum = value;
    }
    public get TieHeightMaximum(): number {
        return this.tieHeightMaximum;
    }
    public set TieHeightMaximum(value: number) {
        this.tieHeightMaximum = value;
    }
    public get TieHeightInterpolationK(): number {
        return this.tieHeightInterpolationK;
    }
    public set TieHeightInterpolationK(value: number) {
        this.tieHeightInterpolationK = value;
    }
    public get TieHeightInterpolationD(): number {
        return this.tieHeightInterpolationD;
    }
    public set TieHeightInterpolationD(value: number) {
        this.tieHeightInterpolationD = value;
    }
    public get SlurNoteHeadYOffset(): number {
        return this.slurNoteHeadYOffset;
    }
    public set SlurNoteHeadYOffset(value: number) {
        this.slurNoteHeadYOffset = value;
    }
    public get SlurStemXOffset(): number {
        return this.slurStemXOffset;
    }
    public set SlurStemXOffset(value: number) {
        this.slurStemXOffset = value;
    }
    public get SlurSlopeMaxAngle(): number {
        return this.slurSlopeMaxAngle;
    }
    public set SlurSlopeMaxAngle(value: number) {
        this.slurSlopeMaxAngle = value;
    }
    public get SlurTangentMinAngle(): number {
        return this.slurTangentMinAngle;
    }
    public set SlurTangentMinAngle(value: number) {
        this.slurTangentMinAngle = value;
    }
    public get SlurTangentMaxAngle(): number {
        return this.slurTangentMaxAngle;
    }
    public set SlurTangentMaxAngle(value: number) {
        this.slurTangentMaxAngle = value;
    }
    public get SlursStartingAtSameStaffEntryYOffset(): number {
        return this.slursStartingAtSameStaffEntryYOffset;
    }
    public set SlursStartingAtSameStaffEntryYOffset(value: number) {
        this.slursStartingAtSameStaffEntryYOffset = value;
    }
    public get InstantaneousTempoTextHeight(): number {
        return this.instantaneousTempoTextHeight;
    }
    public set InstantaneousTempoTextHeight(value: number) {
        this.instantaneousTempoTextHeight = value;
    }
    public get ContinuousDynamicTextHeight(): number {
        return this.continuousDynamicTextHeight;
    }
    public set ContinuousDynamicTextHeight(value: number) {
        this.continuousDynamicTextHeight = value;
    }
    public get MoodTextHeight(): number {
        return this.moodTextHeight;
    }
    public set MoodTextHeight(value: number) {
        this.moodTextHeight = value;
    }
    public get ContinuousTempoTextHeight(): number {
        return this.continuousTempoTextHeight;
    }
    public set ContinuousTempoTextHeight(value: number) {
        this.continuousTempoTextHeight = value;
    }
    /** Distance of expressions inside a group */
    public get DynamicExpressionMaxDistance(): number {
        return this.dynamicExpressionMaxDistance;
    }
    public set DynamicExpressionMaxDistance(value: number) {
        this.dynamicExpressionMaxDistance = value;
    }
    /** Space between expressions in a group */
    public get DynamicExpressionSpacer(): number {
        return this.dynamicExpressionSpacer;
    }
    public set DynamicExpressionSpacer(value: number) {
        this.dynamicExpressionSpacer = value;
    }

    public get UnknownTextHeight(): number {
        return this.unknownTextHeight;
    }
    public set UnknownTextHeight(value: number) {
        this.unknownTextHeight = value;
    }
    public get StaffLineWidth(): number {
        return this.staffLineWidth;
    }
    public set StaffLineWidth(value: number) {
        this.staffLineWidth = value;
    }
    public get LedgerLineWidth(): number {
        return this.ledgerLineWidth;
    }
    public set LedgerLineWidth(value: number) {
        this.ledgerLineWidth = value;
    }
    public get LedgerLineStrokeStyle(): string {
        return this.ledgerLineStrokeStyle;
    }
    public set LedgerLineStrokeStyle(value: string) {
        this.ledgerLineStrokeStyle = value;
    }
    public get WedgeLineWidth(): number {
        return this.wedgeLineWidth;
    }
    public set WedgeLineWidth(value: number) {
        this.wedgeLineWidth = value;
    }
    public get TupletLineWidth(): number {
        return this.tupletLineWidth;
    }
    public set TupletLineWidth(value: number) {
        this.tupletLineWidth = value;
    }
    public get LyricUnderscoreLineWidth(): number {
        return this.lyricUnderscoreLineWidth;
    }
    public set LyricUnderscoreLineWidth(value: number) {
        this.lyricUnderscoreLineWidth = value;
    }
    public get SystemThinLineWidth(): number {
        return this.systemThinLineWidth;
    }
    public set SystemThinLineWidth(value: number) {
        this.systemThinLineWidth = value;
    }
    public get SystemBoldLineWidth(): number {
        return this.systemBoldLineWidth;
    }
    public set SystemBoldLineWidth(value: number) {
        this.systemBoldLineWidth = value;
    }
    public get SystemRepetitionEndingLineWidth(): number {
        return this.systemRepetitionEndingLineWidth;
    }
    public set SystemRepetitionEndingLineWidth(value: number) {
        this.systemRepetitionEndingLineWidth = value;
    }
    public get SystemDotWidth(): number {
        return this.systemDotWidth;
    }
    public set SystemDotWidth(value: number) {
        this.systemDotWidth = value;
    }
    public get MultipleRestMeasureDefaultWidth(): number {
        return this.multipleRestMeasureDefaultWidth;
    }
    public set MultipleRestMeasureDefaultWidth(value: number) {
        this.multipleRestMeasureDefaultWidth = value;
    }
    public get DistanceBetweenVerticalSystemLines(): number {
        return this.distanceBetweenVerticalSystemLines;
    }
    public set DistanceBetweenVerticalSystemLines(value: number) {
        this.distanceBetweenVerticalSystemLines = value;
    }
    public get DistanceBetweenDotAndLine(): number {
        return this.distanceBetweenDotAndLine;
    }
    public set DistanceBetweenDotAndLine(value: number) {
        this.distanceBetweenDotAndLine = value;
    }
    public get OctaveShiftLineWidth(): number {
        return this.octaveShiftLineWidth;
    }
    public set OctaveShiftLineWidth(value: number) {
        this.octaveShiftLineWidth = value;
    }
    public get OctaveShiftVerticalLineLength(): number {
        return this.octaveShiftVerticalLineLength;
    }
    public set OctaveShiftVerticalLineLength(value: number) {
        this.octaveShiftVerticalLineLength = value;
    }
    public get GraceLineWidth(): number {
        return this.graceLineWidth;
    }
    public set GraceLineWidth(value: number) {
        this.graceLineWidth = value;
    }
    public get MinimumStaffLineDistance(): number {
        return this.minimumStaffLineDistance;
    }
    public set MinimumStaffLineDistance(value: number) {
        this.minimumStaffLineDistance = value;
    }
    public get MinSkyBottomDistBetweenStaves(): number {
        return this.minSkyBottomDistBetweenStaves;
    }
    public set MinSkyBottomDistBetweenStaves(value: number) {
        this.minSkyBottomDistBetweenStaves = value;
    }
    public get MinimumCrossedBeamDifferenceMargin(): number {
        return this.minimumCrossedBeamDifferenceMargin;
    }
    public set MinimumCrossedBeamDifferenceMargin(value: number) {
        this.minimumCrossedBeamDifferenceMargin = value;
    }
    public get VoiceSpacingMultiplierVexflow(): number {
        return this.voiceSpacingMultiplierVexflow;
    }
    public set VoiceSpacingMultiplierVexflow(value: number) {
        this.voiceSpacingMultiplierVexflow = value;
    }
    public get VoiceSpacingAddendVexflow(): number {
        return this.voiceSpacingAddendVexflow;
    }
    public set VoiceSpacingAddendVexflow(value: number) {
        this.voiceSpacingAddendVexflow = value;
    }
    public get DisplacedNoteMargin(): number {
        return this.displacedNoteMargin;
    }
    public set DisplacedNoteMargin(value: number) {
        this.displacedNoteMargin = value;
    }
    public get MinNoteDistance(): number {
        return this.minNoteDistance;
    }
    public set MinNoteDistance(value: number) {
        this.minNoteDistance = value;
    }
    public get SubMeasureXSpacingThreshold(): number {
        return this.subMeasureXSpacingThreshold;
    }
    public set SubMeasureXSpacingThreshold(value: number) {
        this.subMeasureXSpacingThreshold = value;
    }
    public get MeasureDynamicsMaxScalingFactor(): number {
        return this.measureDynamicsMaxScalingFactor;
    }
    public set MeasureDynamicsMaxScalingFactor(value: number) {
        this.measureDynamicsMaxScalingFactor = value;
    }
    public get WholeRestXShiftVexflow(): number {
        return this.wholeRestXShiftVexflow;
    }
    public set WholeRestXShiftVexflow(value: number) {
        this.wholeRestXShiftVexflow = value;
    }
    public get MetronomeMarksDrawn(): boolean {
        return this.metronomeMarksDrawn;
    }
    public set MetronomeMarksDrawn(value: boolean) {
        this.metronomeMarksDrawn = value;
    }
    public get MetronomeMarkXShift(): number {
        return this.metronomeMarkXShift;
    }
    public set MetronomeMarkXShift(value: number) {
        this.metronomeMarkXShift = value;
    }
    public get MetronomeMarkYShift(): number {
        return this.metronomeMarkYShift;
    }
    public set MetronomeMarkYShift(value: number) {
        this.metronomeMarkYShift = value;
    }
    public get SoftmaxFactorVexFlow(): number {
        return this.softmaxFactorVexFlow;
    }
    public set SoftmaxFactorVexFlow(value: number) {
        this.softmaxFactorVexFlow = value;
    }
    public get MaxInstructionsConstValue(): number {
        return this.maxInstructionsConstValue;
    }
    public set MaxInstructionsConstValue(value: number) {
        this.maxInstructionsConstValue = value;
    }
    public get NoteDistances(): number[] {
        return this.noteDistances;
    }
    public set NoteDistances(value: number[]) {
        this.noteDistances = value;
    }
    public get NoteDistancesScalingFactors(): number[] {
        return this.noteDistancesScalingFactors;
    }
    public set NoteDistancesScalingFactors(value: number[]) {
        this.noteDistancesScalingFactors = value;
    }
    public get DurationDistanceDict(): {[_: number]: number; } {
        return this.durationDistanceDict;
    }
    public get DurationScalingDistanceDict(): {[_: number]: number; } {
        return this.durationScalingDistanceDict;
    }
    public get AlignRests(): number {
        return this.alignRests;
    }
    public set AlignRests(value: number) {
        this.alignRests = value;
    }
    public get FillEmptyMeasuresWithWholeRest(): FillEmptyMeasuresWithWholeRests | number {
        return this.fillEmptyMeasuresWithWholeRest;
    }
    public set FillEmptyMeasuresWithWholeRest(value: FillEmptyMeasuresWithWholeRests | number) {
        this.fillEmptyMeasuresWithWholeRest = value;
    }
    public get ArpeggiosGoAcrossVoices(): boolean {
        return this.arpeggiosGoAcrossVoices;
    }
    public set ArpeggiosGoAcrossVoices(value: boolean) {
        this.arpeggiosGoAcrossVoices = value;
    }
    public get RenderArpeggios(): boolean {
        return this.renderArpeggios;
    }
    public set RenderArpeggios(value: boolean) {
        this.renderArpeggios = value;
    }

    public get RenderSlurs(): boolean {
        return this.renderSlurs;
    }
    public set RenderSlurs(value: boolean) {
        this.renderSlurs = value;
    }
    public get ColoringMode(): ColoringMode {
        return this.coloringMode;
    }
    public set ColoringMode(value: ColoringMode) {
        this.coloringMode = value;
    }
    public get ColoringEnabled(): boolean {
        return this.coloringEnabled;
    }
    public set ColoringEnabled(value: boolean) {
        this.coloringEnabled = value;
    }
    public get ColorStemsLikeNoteheads(): boolean {
        return this.colorStemsLikeNoteheads;
    }
    public set ColorStemsLikeNoteheads(value: boolean) {
        this.colorStemsLikeNoteheads = value;
    }
    public get ColorFlags(): boolean {
        return this.colorFlags;
    }
    public set ColorFlags(value: boolean) {
        this.colorFlags = value;
    }
    public get ColorBeams(): boolean {
        return this.colorBeams;
    }
    public set ColorBeams(value: boolean) {
        this.colorBeams = value;
    }
    public get ColoringSetCurrent(): Dictionary<NoteEnum|number, string> {
        return this.coloringSetCustom;
    }
    public set ColoringSetCurrent(value: Dictionary<NoteEnum|number, string>) {
        this.coloringSetCustom = value;
    }
    public get DefaultColorNotehead(): string {
        return this.defaultColorNotehead;
    }
    public set DefaultColorNotehead(value: string) {
        this.defaultColorNotehead = value;
    }
    public get DefaultColorRest(): string {
        return this.defaultColorRest;
    }
    public set DefaultColorRest(value: string) {
        this.defaultColorRest = value;
    }
    public get DefaultColorStem(): string {
        return this.defaultColorStem;
    }
    public set DefaultColorStem(value: string) {
        this.defaultColorStem = value;
    }
    public get DefaultColorLabel(): string {
        return this.defaultColorLabel;
    }
    public set DefaultColorLabel(value: string) {
        this.defaultColorLabel = value;
    }
    public get DefaultColorTitle(): string {
        return this.defaultColorTitle;
    }
    public set DefaultColorTitle(value: string) {
        this.defaultColorTitle = value;
    }
    public get DefaultFontFamily(): string {
        return this.defaultFontFamily;
    }
    public set DefaultFontFamily(value: string) {
        this.defaultFontFamily = value;
    }
    public get DefaultFontStyle(): FontStyles {
        return this.defaultFontStyle;
    }
    public set DefaultFontStyle(value: FontStyles) {
        this.defaultFontStyle = value;
    }
    public get DefaultVexFlowNoteFont(): string {
        return this.defaultVexFlowNoteFont;
    }
    public set DefaultVexFlowNoteFont(value: string) {
        this.defaultVexFlowNoteFont = value;
    }
    public get MaxMeasureToDrawIndex(): number {
        return this.maxMeasureToDrawIndex;
    }
    public set MaxMeasureToDrawIndex(value: number) {
        this.maxMeasureToDrawIndex = value;
    }
    public get MinMeasureToDrawIndex(): number {
        return this.minMeasureToDrawIndex;
    }
    public set MinMeasureToDrawIndex(value: number) {
        this.minMeasureToDrawIndex = value;
    }
    public get RenderComposer(): boolean {
        return this.renderComposer;
    }
    public set RenderComposer(value: boolean) {
        this.renderComposer = value;
    }
    public get RenderTitle(): boolean {
        return this.renderTitle;
    }
    public set RenderTitle(value: boolean) {
        this.renderTitle = value;
    }
    public get RenderSubtitle(): boolean {
        return this.renderSubtitle;
    }
    public set RenderSubtitle(value: boolean) {
        this.renderSubtitle = value;
    }
    public get RenderLyricist(): boolean {
        return this.renderLyricist;
    }
    public set RenderLyricist(value: boolean) {
        this.renderLyricist = value;
    }
    public get RenderPartNames(): boolean {
        return this.renderPartNames;
    }
    public set RenderPartNames(value: boolean) {
        this.renderPartNames = value;
        if (!this.renderPartNames) {
            this.renderPartAbbreviations = false;
        }
    }
    public get RenderPartAbbreviations(): boolean {
        return this.renderPartAbbreviations;
    }
    public set RenderPartAbbreviations(value: boolean) {
        this.renderPartAbbreviations = value;
    }
    public get RenderFingerings(): boolean {
        return this.renderFingerings;
    }
    public set RenderFingerings(value: boolean) {
        this.renderFingerings = value;
    }
    public get RenderMeasureNumbers(): boolean {
        return this.renderMeasureNumbers;
    }
    public set RenderMeasureNumbers(value: boolean) {
        this.renderMeasureNumbers = value;
    }
    public get RenderLyrics(): boolean {
        return this.renderLyrics;
    }
    public set RenderLyrics(value: boolean) {
        this.renderLyrics = value;
    }
    public get RenderMultipleRestMeasures(): boolean {
        return this.renderMultipleRestMeasures;
    }
    public set RenderMultipleRestMeasures(value: boolean) {
        this.renderMultipleRestMeasures = value;
    }
    public get RenderTimeSignatures(): boolean {
        return this.renderTimeSignatures;
    }
    public set RenderTimeSignatures(value: boolean) {
        this.renderTimeSignatures = value;
    }
    public get FingeringPosition(): PlacementEnum {
        return this.fingeringPosition;
    }
    public set FingeringPosition(value: PlacementEnum) {
        this.fingeringPosition = value;
    }
    public get FingeringInsideStafflines(): boolean {
        return this.fingeringInsideStafflines;
    }
    public set FingeringInsideStafflines(value: boolean) {
        this.fingeringInsideStafflines = value;
    }
    public get FingeringLabelFontHeight(): number {
        return this.fingeringLabelFontHeight;
    }
    public set FingeringLabelFontHeight(value: number) {
        this.fingeringLabelFontHeight = value;
    }
    public get FingeringOffsetX(): number {
        return this.fingeringOffsetX;
    }
    public set FingeringOffsetX(value: number) {
        this.fingeringOffsetX = value;
    }
    public get NewSystemAtXMLNewSystemAttribute(): boolean {
        return this.newSystemAtXMLNewSystemAttribute;
    }
    public set NewSystemAtXMLNewSystemAttribute(value: boolean) {
        this.newSystemAtXMLNewSystemAttribute = value;
    }
    public get NewPageAtXMLNewPageAttribute(): boolean {
        return this.newPageAtXMLNewPageAttribute;
    }
    public set NewPageAtXMLNewPageAttribute(value: boolean) {
        this.newPageAtXMLNewPageAttribute = value;
    }
    public get PageFormat(): PageFormat {
        return this.pageFormat;
    }
    public set PageFormat(value: PageFormat) {
        this.pageFormat = value;
    }
    public get PageBackgroundColor(): string {
        return this.pageBackgroundColor;
    }
    public set PageBackgroundColor(value: string) {
        this.pageBackgroundColor = value;
    }
    public get RenderSingleHorizontalStaffline(): boolean {
        return this.renderSingleHorizontalStaffline;
    }
    public set RenderSingleHorizontalStaffline(value: boolean) {
        this.renderSingleHorizontalStaffline = value;
    }
    public get RestoreCursorAfterRerender(): boolean {
        return this.restoreCursorAfterRerender;
    }
    public set RestoreCursorAfterRerender(value: boolean) {
        this.restoreCursorAfterRerender = value;
    }

    public resetChordSymbolLabelTexts(chordtexts: Dictionary<ChordSymbolEnum, string>): Dictionary<ChordSymbolEnum, string> {
        chordtexts.setValue(ChordSymbolEnum.minor, "m");
        chordtexts.setValue(ChordSymbolEnum.augmented, "aug");
        chordtexts.setValue(ChordSymbolEnum.diminished, "dim");
        chordtexts.setValue(ChordSymbolEnum.dominant, "7");
        chordtexts.setValue(ChordSymbolEnum.majorseventh, "maj7");
        chordtexts.setValue(ChordSymbolEnum.minorseventh, "m7");
        chordtexts.setValue(ChordSymbolEnum.diminishedseventh, "dim7");
        chordtexts.setValue(ChordSymbolEnum.augmentedseventh, "aug7");
        chordtexts.setValue(ChordSymbolEnum.halfdiminished, "m7b5");
        chordtexts.setValue(ChordSymbolEnum.majorminor, "m(maj7)");
        chordtexts.setValue(ChordSymbolEnum.majorsixth, "maj6");
        chordtexts.setValue(ChordSymbolEnum.minorsixth, "m6");
        chordtexts.setValue(ChordSymbolEnum.dominantninth, "9");
        chordtexts.setValue(ChordSymbolEnum.majorninth, "maj9");
        chordtexts.setValue(ChordSymbolEnum.minorninth, "m9");
        chordtexts.setValue(ChordSymbolEnum.dominant11th, "11");
        chordtexts.setValue(ChordSymbolEnum.major11th, "maj11");
        chordtexts.setValue(ChordSymbolEnum.minor11th, "m11");
        chordtexts.setValue(ChordSymbolEnum.dominant13th, "13");
        chordtexts.setValue(ChordSymbolEnum.major13th, "maj13");
        chordtexts.setValue(ChordSymbolEnum.minor13th, "m13");
        chordtexts.setValue(ChordSymbolEnum.suspendedsecond, "sus2");
        chordtexts.setValue(ChordSymbolEnum.suspendedfourth, "sus4");
        chordtexts.setValue(ChordSymbolEnum.power, "5");

        return chordtexts;
    }

    /**
     * This method maps NoteDurations to Distances and DistancesScalingFactors.
     */
    private populateDictionaries(): void {
        for (let i: number = 0; i < this.noteDistances.length; i++) {
            switch (i) {
                case 0:
                    this.durationDistanceDict[0.015625] = this.noteDistances[i];
                    this.durationScalingDistanceDict[0.015625] = this.noteDistancesScalingFactors[i];
                    break;
                case 1:
                    this.durationDistanceDict[0.03125] = this.noteDistances[i];
                    this.durationScalingDistanceDict[0.03125] = this.noteDistancesScalingFactors[i];
                    break;
                case 2:
                    this.durationDistanceDict[0.0625] = this.noteDistances[i];
                    this.durationScalingDistanceDict[0.0625] = this.noteDistancesScalingFactors[i];
                    break;
                case 3:
                    this.durationDistanceDict[0.125] = this.noteDistances[i];
                    this.durationScalingDistanceDict[0.125] = this.noteDistancesScalingFactors[i];
                    break;
                case 4:
                    this.durationDistanceDict[0.25] = this.noteDistances[i];
                    this.durationScalingDistanceDict[0.25] = this.noteDistancesScalingFactors[i];
                    break;
                case 5:
                    this.durationDistanceDict[0.5] = this.noteDistances[i];
                    this.durationScalingDistanceDict[0.5] = this.noteDistancesScalingFactors[i];
                    break;
                case 6:
                    this.durationDistanceDict[1.0] = this.noteDistances[i];
                    this.durationScalingDistanceDict[1.0] = this.noteDistancesScalingFactors[i];
                    break;
                case 7:
                    this.durationDistanceDict[2.0] = this.noteDistances[i];
                    this.durationScalingDistanceDict[2.0] = this.noteDistancesScalingFactors[i];
                    break;
                default:
                    // FIXME
            }
        }
    }

    /**
     * Calculate Curve-independend factors, to be used later in the Slur- and TieCurvePoints calculation
     */
    private calculateCurveParametersArrays(): void {
        this.tPower3 = new Array(this.bezierCurveStepSize);
        this.oneMinusTPower3 = new Array(this.bezierCurveStepSize);
        this.factorOne = new Array(this.bezierCurveStepSize);
        this.factorTwo = new Array(this.bezierCurveStepSize);
        for (let i: number = 0; i < this.bezierCurveStepSize; i++) {
            const t: number = i / this.bezierCurveStepSize;
            this.tPower3[i] = Math.pow(t, 3);
            this.oneMinusTPower3[i] = Math.pow((1 - t), 3);
            this.factorOne[i] = 3 * Math.pow((1 - t), 2) * t;
            this.factorTwo[i] = 3 * (1 - t) * Math.pow(t, 2);
        }
    }
}

// TODO maybe this should be moved to OSMDOptions. Also see OpenSheetMusicDisplay.PageFormatStandards
export class PageFormat {
    constructor(width: number, height: number, idString: string = "noIdStringGiven") {
        this.width = width;
        this.height = height;
        this.idString = idString;
    }
    public width: number;
    public height: number;
    public idString: string;
    public get aspectRatio(): number {
        if (!this.IsUndefined) {
            return this.width / this.height;
        } else {
            return 0; // infinite page height
        }
    }
    /** Undefined page format: use default page format. */
    public get IsUndefined(): boolean {
        return this.width === undefined || this.height === undefined || this.height === 0 || this.width === 0;
    }

    public static get UndefinedPageFormat(): PageFormat {
        return new PageFormat(0, 0);
    }

    public Equals(otherPageFormat: PageFormat): boolean {
        if (!otherPageFormat) {
            return false;
        }
        return otherPageFormat.width === this.width && otherPageFormat.height === this.height;
    }
}
