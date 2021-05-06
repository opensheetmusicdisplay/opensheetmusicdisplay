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
import { ChordSymbolEnum, CustomChord, DegreesInfo } from "../../MusicalScore/VoiceData/ChordSymbolContainer";
import { GraphicalNote } from "./GraphicalNote";
import { Note } from "../VoiceData/Note";

/** Rendering and Engraving options, more fine-grained than [[IOSMDOptions]].
 *  Not all of these options are meant to be modified by users of the library,
 *  full support is only given for [[IOSMDOptions]].
 *  Nevertheless, there are many useful options here,
 *  like Render* to (not) render certain elements (e.g. osmd.rules.RenderRehearsalMarks = false)
 */
export class EngravingRules {
    /** A unit of distance. 1.0 is the distance between lines of a stave for OSMD, which is 10 pixels in Vexflow. */
    public static unit: number = 1.0;
    public SamplingUnit: number;
    public StaccatoShorteningFactor: number;
    /** Height (size) of the sheet title. */
    public SheetTitleHeight: number;
    public SheetSubtitleHeight: number;
    public SheetMinimumDistanceBetweenTitleAndSubtitle: number;
    public SheetComposerHeight: number;
    public SheetAuthorHeight: number;
    public CompactMode: boolean;
    public PagePlacementEnum: PagePlacementEnum;
    public PageHeight: number;
    public PageTopMargin: number;
    public PageTopMarginNarrow: number;
    public PageBottomMargin: number;
    public PageLeftMargin: number;
    public PageRightMargin: number;
    public TitleTopDistance: number;
    public TitleBottomDistance: number;
    public SystemLeftMargin: number;
    public SystemRightMargin: number;
    public SystemLabelsRightMargin: number;
    public SystemComposerDistance: number;
    public InstrumentLabelTextHeight: number;
    public MinimumDistanceBetweenSystems: number;
    public MinSkyBottomDistBetweenSystems: number;
    public LastSystemMaxScalingFactor: number;
    public StaffDistance: number;
    public BetweenStaffDistance: number;
    public StaffHeight: number;
    public TabStaffInterlineHeight: number;
    public BetweenStaffLinesDistance: number;
    /** Whether to automatically beam notes that don't already have beams in XML. */
    public AutoBeamNotes: boolean;
    /** Options for autoBeaming like whether to beam over rests. See AutoBeamOptions interface. */
    public AutoBeamOptions: AutoBeamOptions;
    public BeamWidth: number;
    public BeamSpaceWidth: number;
    public BeamForwardLength: number;
    public FlatBeams: boolean;
    public FlatBeamOffset: number;
    public FlatBeamOffsetPerBeam: number;
    public ClefLeftMargin: number;
    public ClefRightMargin: number;
    /** How many unique note positions a percussion score needs to have to not be rendered on one line. */
    public PercussionOneLineCutoff: number;
    public PercussionForceVoicesOneLineCutoff: number;
    public PercussionUseXMLDisplayStep: boolean;
    public PercussionXMLDisplayStepNoteValueShift: number;
    public PercussionOneLineXMLDisplayStepOctaveOffset: number;
    public BetweenKeySymbolsDistance: number;
    public KeyRightMargin: number;
    public RhythmRightMargin: number;
    public ShowRhythmAgainAfterPartEndOrFinalBarline: boolean;
    public NewPartAndSystemAfterFinalBarline: boolean;
    public InStaffClefScalingFactor: number;
    public DistanceBetweenNaturalAndSymbolWhenCancelling: number;
    public NoteHelperLinesOffset: number;
    public MeasureLeftMargin: number;
    public MeasureRightMargin: number;
    public DistanceBetweenLastInstructionAndRepetitionBarline: number;
    public ArpeggioDistance: number;
    public IdealStemLength: number;
    public StemNoteHeadBorderYOffset: number;
    public StemWidth: number;
    public StemMargin: number;
    public StemMinLength: number;
    public StemMaxLength: number;
    public BeamSlopeMaxAngle: number;
    public StemMinAllowedDistanceBetweenNoteHeadAndBeamLine: number;
    public SetWantedStemDirectionByXml: boolean;
    public GraceNoteScalingFactor: number;
    public GraceNoteXOffset: number;
    public WedgeOpeningLength: number;
    public WedgeMeasureEndOpeningLength: number;
    public WedgeMeasureBeginOpeningLength: number;
    public WedgePlacementAboveY: number;
    public WedgePlacementBelowY: number;
    public WedgeHorizontalMargin: number;
    public WedgeVerticalMargin: number;
    public DistanceOffsetBetweenTwoHorizontallyCrossedWedges: number;
    public WedgeMinLength: number;
    public WedgeEndDistanceBetweenTimestampsFactor: number;
    public DistanceBetweenAdjacentDynamics: number;
    public TempoChangeMeasureValidity: number;
    public TempoContinousFactor: number;
    public StaccatoScalingFactor: number;
    public BetweenDotsDistance: number;
    public OrnamentAccidentalScalingFactor: number;
    public ChordSymbolTextHeight: number;
    public ChordSymbolTextAlignment: TextAlignmentEnum;
    public ChordSymbolRelativeXOffset: number;
    public ChordSymbolXSpacing: number;
    public ChordOverlapAllowedIntoNextMeasure: number;
    public ChordSymbolYOffset: number;
    public ChordSymbolLabelTexts: Dictionary<ChordSymbolEnum, string>;
    public CustomChords: CustomChord[];
    public RepetitionSymbolsYOffset: number;
    public RehearsalMarkXOffset: number;
    public RehearsalMarkXOffsetDefault: number;
    public RehearsalMarkXOffsetSystemStartMeasure: number;
    public RehearsalMarkYOffset: number;
    public RehearsalMarkYOffsetDefault: number;
    public RehearsalMarkFontSize: number;
    public MeasureNumberLabelHeight: number;
    public MeasureNumberLabelOffset: number;
    public MeasureNumberLabelXOffset: number;
    /** Whether tuplets should display ratio (3:2 instead of 3 for triplet). Default false. */
    public TupletsRatioed: boolean;
    /** Whether all tuplets should be bracketed (e.g. |--5--| instead of 5). Default false.
     * If false, only tuplets given as bracketed in XML (bracket="yes") will be bracketed.
     * (If not given in XML, bracketing is implementation-dependent according to standard)
     */
    public TupletsBracketed: boolean;
    /** Whether all triplets should be bracketed. Overrides tupletsBracketed for triplets.
     * If false, only triplets given as bracketed in XML (bracket="yes") will be bracketed.
     * (Bracketing all triplets can be cluttering)
     */
    public TripletsBracketed: boolean;
    public TupletNumberLabelHeight: number;
    public TupletNumberYOffset: number;
    public LabelMarginBorderFactor: number;
    public TupletVerticalLineLength: number;
    public TupletNumbersInTabs: boolean;

    public RepetitionEndingLabelHeight: number;
    public RepetitionEndingLabelXOffset: number;
    public RepetitionEndingLabelYOffset: number;
    public RepetitionEndingLineYLowerOffset: number;
    public RepetitionEndingLineYUpperOffset: number;
    public VoltaOffset: number;
    /** Default alignment of lyrics.
     * Left alignments will extend text to the right of the bounding box,
     * which facilitates spacing by extending measure width.
     */
    public LyricsAlignmentStandard: TextAlignmentEnum;
    public LyricsHeight: number;
    public LyricsYOffsetToStaffHeight: number;
    public VerticalBetweenLyricsDistance: number;
    public HorizontalBetweenLyricsDistance: number;
    public BetweenSyllableMaximumDistance: number;
    public BetweenSyllableMinimumDistance: number;
    public LyricOverlapAllowedIntoNextMeasure: number;
    public MinimumDistanceBetweenDashes: number;
    public MaximumLyricsElongationFactor: number;

    public SlurPlacementFromXML: boolean;
    public BezierCurveStepSize: number;
    public TPower3: number[];
    public OneMinusTPower3: number[];
    public FactorOne: number[];
    public FactorTwo: number[];
    public TieGhostObjectWidth: number;
    public TieYPositionOffsetFactor: number;
    public MinimumNeededXspaceForTieGhostObject: number;
    public TieHeightMinimum: number;
    public TieHeightMaximum: number;
    public TieHeightInterpolationK: number;
    public TieHeightInterpolationD: number;
    public SlurNoteHeadYOffset: number;
    public SlurStemXOffset: number;
    public SlurSlopeMaxAngle: number;
    public SlurTangentMinAngle: number;
    public SlurTangentMaxAngle: number;
    public SlurHeightFactor: number;
    public SlurHeightFlattenLongSlursFactorByWidth: number;
    public SlurHeightFlattenLongSlursFactorByAngle: number;
    public SlurHeightFlattenLongSlursCutoffAngle: number;
    public SlurHeightFlattenLongSlursCutoffWidth: number;
    public SlursStartingAtSameStaffEntryYOffset: number;
    public InstantaneousTempoTextHeight: number;
    public ContinuousDynamicTextHeight: number;
    public MoodTextHeight: number;
    public UnknownTextHeight: number;
    public ContinuousTempoTextHeight: number;
    public VexFlowDefaultNotationFontScale: number;
    public VexFlowDefaultTabFontScale: number;
    public TremoloStrokeScale: number;
    public TremoloYSpacingScale: number;
    public StaffLineWidth: number;
    public StaffLineColor: string;
    public LedgerLineWidth: number;
    public LedgerLineStrokeStyle: string;
    public LedgerLineColorDefault: string;
    public WedgeLineWidth: number;
    public TupletLineWidth: number;
    public LyricUnderscoreLineWidth: number;
    public SystemThinLineWidth: number;
    public SystemBoldLineWidth: number;
    public SystemRepetitionEndingLineWidth: number;
    public SystemDotWidth: number;
    public MultipleRestMeasureDefaultWidth: number;
    public DistanceBetweenVerticalSystemLines: number;
    public DistanceBetweenDotAndLine: number;
    public OctaveShiftLineWidth: number;
    public OctaveShiftVerticalLineLength: number;
    public GraceLineWidth: number;
    public MinimumStaffLineDistance: number;
    public MinSkyBottomDistBetweenStaves: number;
    public MinimumCrossedBeamDifferenceMargin: number;

    public VoiceSpacingMultiplierVexflow: number;
    public VoiceSpacingAddendVexflow: number;
    public PickupMeasureWidthMultiplier: number;
    public DisplacedNoteMargin: number;
    public MinNoteDistance: number;
    public SubMeasureXSpacingThreshold: number;
    public MeasureDynamicsMaxScalingFactor: number;
    public WholeRestXShiftVexflow: number;
    public MetronomeMarksDrawn: boolean;
    public MetronomeMarkXShift: number;
    public MetronomeMarkYShift: number;
    public SoftmaxFactorVexFlow: number;
    public MaxInstructionsConstValue: number;
    public NoteDistances: number[] = [1.0, 1.0, 1.3, 1.6, 2.0, 2.5, 3.0, 4.0];
    public NoteDistancesScalingFactors: number[] = [1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0, 128.0];
    public DurationDistanceDict: {[_: number]: number } = {};
    public DurationScalingDistanceDict: {[_: number]: number } = {};

    public AlignRests: number; // 0 = false, 1 = true, 2 = auto
    public FillEmptyMeasuresWithWholeRest: FillEmptyMeasuresWithWholeRests | number;
    public ArpeggiosGoAcrossVoices: boolean;
    public RenderArpeggios: boolean;
    public RenderSlurs: boolean;
    public ColoringMode: ColoringMode;
    public ColoringEnabled: boolean;
    public ColorStemsLikeNoteheads: boolean;
    public ColorFlags: boolean;
    public ColorBeams: boolean;
    public ColoringSetCurrent: Dictionary<NoteEnum|number, string>;
    public DefaultColorNotehead: string;
    public DefaultColorRest: string;
    public DefaultColorStem: string;
    public DefaultColorLabel: string;
    public DefaultColorTitle: string;
    public DefaultColorCursor: string;
    public DefaultFontFamily: string;
    public DefaultFontStyle: FontStyles;
    public DefaultVexFlowNoteFont: string;
    public MaxMeasureToDrawIndex: number;
    public MinMeasureToDrawIndex: number;
    public MaxPageToDrawNumber: number;
    public MaxSystemToDrawNumber: number;

    /** Whether to render a label for the composer of the piece at the top of the sheet. */
    public RenderComposer: boolean;
    public RenderTitle: boolean;
    public RenderSubtitle: boolean;
    public RenderLyricist: boolean;
    public RenderPartNames: boolean;
    public RenderPartAbbreviations: boolean;
    public RenderFingerings: boolean;
    public RenderMeasureNumbers: boolean;
    public RenderMeasureNumbersOnlyAtSystemStart: boolean;
    public UseXMLMeasureNumbers: boolean;
    public RenderLyrics: boolean;
    public RenderChordSymbols: boolean;
    public RenderMultipleRestMeasures: boolean;
    public AutoGenerateMutipleRestMeasuresFromRestMeasures: boolean;
    public RenderRehearsalMarks: boolean;
    public RenderKeySignatures: boolean;
    public RenderTimeSignatures: boolean;
    public DynamicExpressionMaxDistance: number;
    public DynamicExpressionSpacer: number;
    public ArticulationPlacementFromXML: boolean;
    /** Position of fingering label in relation to corresponding note (left, right supported, above, below experimental) */
    public FingeringPosition: PlacementEnum;
    public FingeringPositionFromXML: boolean;
    public FingeringInsideStafflines: boolean;
    public FingeringLabelFontHeight: number;
    public FingeringOffsetX: number;
    /** Whether to render string numbers in classical scores, i.e. not the string numbers in tabs, but e.g. for violin. */
    public RenderStringNumbersClassical: boolean;
    /** This is not for tabs, but for classical scores, especially violin. */
    public StringNumberOffsetY: number;
    public NewSystemAtXMLNewSystemAttribute: boolean;
    public NewPageAtXMLNewPageAttribute: boolean;
    public PageFormat: PageFormat;
    public PageBackgroundColor: string; // vexflow-color-string (#FFFFFF). Default undefined/transparent.
    public RenderSingleHorizontalStaffline: boolean;
    public RestoreCursorAfterRerender: boolean;
    public StretchLastSystemLine: boolean;
    public SpacingBetweenTextLines: number;

    public NoteToGraphicalNoteMap: Dictionary<number, GraphicalNote>;
    // this is basically a WeakMap, except we save the id in the Note instead of using a WeakMap.
    public NoteToGraphicalNoteMapObjectCount: number = 0;

    public static FixStafflineBoundingBox: boolean; // TODO temporary workaround

    constructor() {
        this.loadDefaultValues();
    }

    public loadDefaultValues(): void {
        // global variables
        this.SamplingUnit = EngravingRules.unit * 3;

        // Page Label Variables
        this.SheetTitleHeight = 4.0;
        this.SheetSubtitleHeight = 2.0;
        this.SheetMinimumDistanceBetweenTitleAndSubtitle = 1.0;
        this.SheetComposerHeight = 2.0;
        this.SheetAuthorHeight = 2.0;

        // Staff sizing Variables
        this.CompactMode = false;
        this.PagePlacementEnum = PagePlacementEnum.Down;
        this.PageHeight = 100001.0;
        this.PageTopMargin = 5.0;
        this.PageTopMarginNarrow = 0.0; // for compact mode
        this.PageBottomMargin = 5.0;
        this.PageLeftMargin = 5.0;
        this.PageRightMargin = 5.0;
        this.TitleTopDistance = 5.0;
        this.TitleBottomDistance = 1.0;
        this.StaffDistance = 7.0;
        this.BetweenStaffDistance = 5.0;
        this.MinimumStaffLineDistance = 4.0;
        this.MinSkyBottomDistBetweenStaves = 1.0; // default. compacttight mode sets it to 1.0 (as well).

        // System Sizing and Label Variables
        this.StaffHeight = 4.0;
        this.TabStaffInterlineHeight = 1.1111;
        this.BetweenStaffLinesDistance = EngravingRules.unit;
        this.SystemLeftMargin = 0.0;
        this.SystemRightMargin = 0.0;
        this.SystemLabelsRightMargin = 2.0;
        this.SystemComposerDistance = 2.0;
        this.InstrumentLabelTextHeight = 2;
        this.MinimumDistanceBetweenSystems = 7.0;
        this.MinSkyBottomDistBetweenSystems = 5.0;
        this.LastSystemMaxScalingFactor = 1.4;

        // autoBeam options
        this.AutoBeamNotes = false;
        this.AutoBeamOptions = {
            beam_middle_rests_only: false,
            beam_rests: false,
            maintain_stem_directions: false
        };

        // Beam Sizing Variables
        this.BeamWidth = EngravingRules.unit / 2.0;
        this.BeamSpaceWidth = EngravingRules.unit / 3.0;
        this.BeamForwardLength = 1.25 * EngravingRules.unit;

        this.FlatBeams = false;
        this.FlatBeamOffset = 20;
        this.FlatBeamOffsetPerBeam = 10;

        // Beam Sizing Variables
        this.ClefLeftMargin = 0.5;
        this.ClefRightMargin = 0.75;
        this.PercussionOneLineCutoff = 3; // percussion parts with <3 unique note positions rendered on one line
        this.PercussionForceVoicesOneLineCutoff = 1;
        this.PercussionUseXMLDisplayStep = true;
        this.PercussionXMLDisplayStepNoteValueShift = 0;
        this.PercussionOneLineXMLDisplayStepOctaveOffset = 0;
        this.BetweenKeySymbolsDistance = 0.2;
        this.KeyRightMargin = 0.75;
        this.RhythmRightMargin = 1.25;
        this.ShowRhythmAgainAfterPartEndOrFinalBarline = true;
        this.NewPartAndSystemAfterFinalBarline = false;
        this.InStaffClefScalingFactor = 0.8;
        this.DistanceBetweenNaturalAndSymbolWhenCancelling = 0.4;

        // Beam Sizing Variables
        this.NoteHelperLinesOffset = 0.25;
        this.MeasureLeftMargin = 0.7;
        this.MeasureRightMargin = 0.0;
        this.DistanceBetweenLastInstructionAndRepetitionBarline = 1.0;
        this.ArpeggioDistance = 0.6;

        // Stems Variables
        this.StaccatoShorteningFactor = 2;
        this.IdealStemLength = 3.0;
        this.StemNoteHeadBorderYOffset = 0.2;
        this.StemMargin = 0.2;
        this.StemMinLength = 2.5;
        this.StemMaxLength = 4.5;
        this.BeamSlopeMaxAngle = 10.0;
        this.StemMinAllowedDistanceBetweenNoteHeadAndBeamLine = 1.0;
        this.SetWantedStemDirectionByXml = true;
        // also see stemwidth further below

        // GraceNote Variables
        this.GraceNoteScalingFactor = 0.6;
        this.GraceNoteXOffset = 0.2;

        // Wedge Variables
        this.WedgeOpeningLength = 1.2;
        this.WedgeMeasureEndOpeningLength = 0.75;
        this.WedgeMeasureBeginOpeningLength = 0.75;
        this.WedgePlacementAboveY = -1.5;
        this.WedgePlacementBelowY = 1.5;
        this.WedgeHorizontalMargin = 0.6;
        this.WedgeVerticalMargin = 0.5;
        this.DistanceOffsetBetweenTwoHorizontallyCrossedWedges = 0.3;
        this.WedgeMinLength = 2.0;
        this.WedgeEndDistanceBetweenTimestampsFactor = 1.75;
        this.DistanceBetweenAdjacentDynamics = 0.75;

        // Tempo Variables
        this.TempoChangeMeasureValidity = 4;
        this.TempoContinousFactor = 0.7;

        // various
        this.StaccatoScalingFactor = 0.8;
        this.BetweenDotsDistance = 0.8;
        this.OrnamentAccidentalScalingFactor = 0.65;
        this.ChordSymbolTextHeight = 2.0;
        this.ChordSymbolTextAlignment = TextAlignmentEnum.LeftBottom;
        this.ChordSymbolRelativeXOffset = -1.0;
        this.ChordSymbolXSpacing = 1.0;
        this.ChordOverlapAllowedIntoNextMeasure = 0;
        this.ChordSymbolYOffset = 2.0;
        this.ChordSymbolLabelTexts = new Dictionary<ChordSymbolEnum, string>();
        this.resetChordSymbolLabelTexts(this.ChordSymbolLabelTexts);
        this.CustomChords = [];
        this.resetChordNames();
        this.RepetitionSymbolsYOffset = 0;
        this.RehearsalMarkXOffsetDefault = 10; // avoid collision with metronome number
        this.RehearsalMarkXOffset = 0; // user defined
        this.RehearsalMarkXOffsetSystemStartMeasure = -20; // good test: Haydn Concertante
        this.RehearsalMarkYOffsetDefault = -15;
        this.RehearsalMarkYOffset = 0; // user defined
        this.RehearsalMarkFontSize = 10; // vexflow default: 12, too big with chord symbols

        // Tuplets, MeasureNumber and TupletNumber Labels
        this.MeasureNumberLabelHeight = 1.5 * EngravingRules.unit;
        this.MeasureNumberLabelOffset = 2;
        this.MeasureNumberLabelXOffset = -0.5;
        this.TupletsRatioed = false;
        this.TupletsBracketed = false;
        this.TripletsBracketed = false; // special setting for triplets, overrides tuplet setting (for triplets only)
        this.TupletNumberLabelHeight = 1.5 * EngravingRules.unit;
        this.TupletNumberYOffset = 0.5;
        this.LabelMarginBorderFactor = 0.1;
        this.TupletVerticalLineLength = 0.5;
        this.TupletNumbersInTabs = false; // disabled by default, nonstandard in tabs, at least how we show them in non-tabs.

        // Slur and Tie variables
        this.SlurPlacementFromXML = true;
        this.BezierCurveStepSize = 1000;
        this.calculateCurveParametersArrays();
        this.TieGhostObjectWidth = 0.75;
        this.TieYPositionOffsetFactor = 0.3;
        this.MinimumNeededXspaceForTieGhostObject = 1.0;
        this.TieHeightMinimum = 0.28;
        this.TieHeightMaximum = 1.2;
        this.TieHeightInterpolationK = 0.0288;
        this.TieHeightInterpolationD = 0.136;
        this.SlurNoteHeadYOffset = 0.5;
        this.SlurStemXOffset = 0.3;
        this.SlurSlopeMaxAngle = 15.0;
        this.SlurTangentMinAngle = 30.0;
        this.SlurTangentMaxAngle = 80.0;
        this.SlurHeightFactor = 1; // 1 = 100% (standard height). 2 = 100% flattening of all slurs.
        this.SlurHeightFlattenLongSlursFactorByWidth = 0.24; // additional flattening for long slurs the longer they are.
        this.SlurHeightFlattenLongSlursFactorByAngle = 0.36; // when one of these factors is high, increasing the other has a very strong effect.
        this.SlurHeightFlattenLongSlursCutoffAngle = 47;
        this.SlurHeightFlattenLongSlursCutoffWidth = 16; // 15 ~ slur between measure's first notes in 4/4. 14 -> problem with test_slurs_highNotes
        this.SlursStartingAtSameStaffEntryYOffset = 0.8;

        // Repetitions
        this.RepetitionEndingLabelHeight = 2.0;
        this.RepetitionEndingLabelXOffset = 0.5;
        this.RepetitionEndingLabelYOffset = 0.3;
        this.RepetitionEndingLineYLowerOffset = 0.5;
        this.RepetitionEndingLineYUpperOffset = 0.3;
        this.VoltaOffset = 2.5;

        // Lyrics
        this.LyricsAlignmentStandard = TextAlignmentEnum.LeftBottom; // CenterBottom and LeftBottom tested, spacing-optimized
        this.LyricsHeight = 2.0; // actually size of lyrics
        this.LyricsYOffsetToStaffHeight = 0.0; // distance between lyrics and staff. could partly be even lower/dynamic
        this.VerticalBetweenLyricsDistance = 0.5;
        this.HorizontalBetweenLyricsDistance = 0.2;
        this.BetweenSyllableMaximumDistance = 10.0;
        this.BetweenSyllableMinimumDistance = 0.5; // + 1.0 for CenterAlignment added in lyrics spacing
        this.LyricOverlapAllowedIntoNextMeasure = 3.4; // optimal for dashed last lyric, see Land der Berge
        this.MinimumDistanceBetweenDashes = 10;
        this.MaximumLyricsElongationFactor = 2.5;

        // expressions variables
        this.InstantaneousTempoTextHeight = 2.3;
        this.ContinuousDynamicTextHeight = 2.3;
        this.MoodTextHeight = 2.3;
        this.UnknownTextHeight = 2.0;
        this.ContinuousTempoTextHeight = 2.3;
        this.DynamicExpressionMaxDistance = 2;
        this.DynamicExpressionSpacer = 0.5;

        // Line Widths
        this.VexFlowDefaultNotationFontScale = 39; // scales notes, including rests. default value 39 in Vexflow.
        this.VexFlowDefaultTabFontScale = 39;
        this.TremoloStrokeScale = 1;
        this.TremoloYSpacingScale = 1;
        this.StemWidth = 0.15; // originally 0.13. vexflow default 0.15. should probably be adjusted when increasing vexFlowDefaultNotationFontScale,
        this.StaffLineWidth = 0.10; // originally 0.12, but this will be pixels in Vexflow (*10).
        this.StaffLineColor = undefined; // if undefined, vexflow default (grey). not a width, but affects visual line clarity.
        this.LedgerLineWidth = 1; // vexflow units (pixels). if not undefined, the vexflow default will be overwritten
        this.LedgerLineStrokeStyle = undefined; // if not undefined, the vexflow default will be overwritten
        this.LedgerLineColorDefault = "#000000"; // black, previously grey by default
        this.WedgeLineWidth = 0.12;
        this.TupletLineWidth = 0.12;
        this.LyricUnderscoreLineWidth = 0.12;
        this.SystemThinLineWidth = 0.12;
        this.SystemBoldLineWidth = EngravingRules.unit / 2.0;
        this.SystemRepetitionEndingLineWidth = 0.12;
        this.SystemDotWidth = EngravingRules.unit / 5.0;
        this.DistanceBetweenVerticalSystemLines = 0.35;
        this.DistanceBetweenDotAndLine = 0.7;
        this.OctaveShiftLineWidth = 0.12;
        this.OctaveShiftVerticalLineLength = EngravingRules.unit;
        this.GraceLineWidth = this.StaffLineWidth * this.GraceNoteScalingFactor;

        this.MultipleRestMeasureDefaultWidth = 4;

        // Line Widths
        this.MinimumCrossedBeamDifferenceMargin = 0.0001;

        // xSpacing Variables
        this.VoiceSpacingMultiplierVexflow = 0.85;
        this.VoiceSpacingAddendVexflow = 3.0;
        this.PickupMeasureWidthMultiplier = 1.0;
        this.DisplacedNoteMargin = 0.1;
        this.MinNoteDistance = 2.0;
        this.SubMeasureXSpacingThreshold = 35;
        this.MeasureDynamicsMaxScalingFactor = 2.5;
        this.WholeRestXShiftVexflow = -1.5; // VexFlow draws rest notes too far to the right
        this.MetronomeMarksDrawn = true;
        this.MetronomeMarkXShift = -6; // our unit, is taken * unitInPixels
        this.MetronomeMarkYShift = -0.5;
        this.SoftmaxFactorVexFlow = 15; // only applies to Vexflow 3.x. 15 seems like the sweet spot. Vexflow default is 100.
        // if too high, score gets too big, especially half notes. with half note quarter quarter, the quarters get squeezed.
        // if too low, smaller notes aren't positioned correctly.

        // Render options (whether to render specific or invisible elements)
        this.AlignRests = AlignRestOption.Never; // 0 = false, 1 = true, 2 = auto
        this.FillEmptyMeasuresWithWholeRest = FillEmptyMeasuresWithWholeRests.No;
        this.ArpeggiosGoAcrossVoices = false; // safe option, as otherwise arpeggios will always go across all voices in Vexflow, which is often unwanted
        this.RenderArpeggios = true;
        this.RenderSlurs = true;
        this.ColoringMode = ColoringMode.XML;
        this.ColoringEnabled = true;
        this.ColorStemsLikeNoteheads = false;
        this.ColorBeams = true;
        this.ColorFlags = true;
        this.DefaultColorNotehead = "#000000"; // black. undefined is only black if a note's color hasn't been changed before.
        this.DefaultColorRest = this.DefaultColorNotehead;
        this.DefaultColorStem = this.DefaultColorNotehead;
        this.DefaultColorLabel = this.DefaultColorNotehead;
        this.DefaultColorTitle = this.DefaultColorNotehead;
        this.DefaultColorCursor = "#33e02f"; // green
        this.DefaultFontFamily = "Times New Roman"; // what OSMD was initially optimized for
        this.DefaultFontStyle = FontStyles.Regular;
        this.DefaultVexFlowNoteFont = "gonville"; // was the default vexflow font up to vexflow 1.2.93, now it's Bravura, which is more cursive/bold
        this.MaxMeasureToDrawIndex = Number.MAX_VALUE;
        this.MinMeasureToDrawIndex = 0;
        this.MaxSystemToDrawNumber = Number.MAX_VALUE;
        this.MaxPageToDrawNumber = Number.MAX_VALUE;
        this.RenderComposer = true;
        this.RenderTitle = true;
        this.RenderSubtitle = true;
        this.RenderLyricist = true;
        this.RenderPartNames = true;
        this.RenderPartAbbreviations = true;
        this.RenderFingerings = true;
        this.RenderMeasureNumbers = true;
        this.RenderMeasureNumbersOnlyAtSystemStart = false;
        this.UseXMLMeasureNumbers = true;
        this.RenderLyrics = true;
        this.RenderChordSymbols = true;
        this.RenderMultipleRestMeasures = true;
        this.AutoGenerateMutipleRestMeasuresFromRestMeasures = true;
        this.RenderRehearsalMarks = true;
        this.RenderKeySignatures = true;
        this.RenderTimeSignatures = true;
        this.ArticulationPlacementFromXML = true;
        this.FingeringPosition = PlacementEnum.Left; // easier to get bounding box, and safer for vertical layout
        this.FingeringPositionFromXML = true;
        this.FingeringInsideStafflines = false;
        this.FingeringLabelFontHeight = 1.7;
        this.FingeringOffsetX = 0.0;
        this.RenderStringNumbersClassical = true;
        this.StringNumberOffsetY = 0.0;
        this.NewSystemAtXMLNewSystemAttribute = false;
        this.NewPageAtXMLNewPageAttribute = false;
        this.RestoreCursorAfterRerender = true;
        this.StretchLastSystemLine = false;

        EngravingRules.FixStafflineBoundingBox = false; // TODO temporary workaround

        this.PageFormat = PageFormat.UndefinedPageFormat; // default: undefined / 'infinite' height page, using the canvas'/container's width and height
        this.PageBackgroundColor = undefined; // default: transparent. half-transparent white: #FFFFFF88"
        this.RenderSingleHorizontalStaffline = false;
        this.SpacingBetweenTextLines = 0;

        this.NoteToGraphicalNoteMap = new Dictionary<number, GraphicalNote>();
        this.NoteToGraphicalNoteMapObjectCount = 0;

        // this.populateDictionaries(); // these values aren't used currently
        try {
            this.MaxInstructionsConstValue = this.ClefLeftMargin + this.ClefRightMargin + this.KeyRightMargin + this.RhythmRightMargin + 11;
            //if (FontInfo.Info) {
            //    this.maxInstructionsConstValue += FontInfo.Info.getBoundingBox(MusicSymbol.G_CLEF).width
            //        + FontInfo.Info.getBoundingBox(MusicSymbol.FOUR).width
            //        + 7 * FontInfo.Info.getBoundingBox(MusicSymbol.SHARP).width;
            //}
        } catch (ex) {
            log.info("EngravingRules()", ex);
        }
    }

    public addGraphicalNoteToNoteMap(note: Note, graphicalNote: GraphicalNote): void {
        note.NoteToGraphicalNoteObjectId = this.NoteToGraphicalNoteMapObjectCount;
        this.NoteToGraphicalNoteMap.setValue(note.NoteToGraphicalNoteObjectId, graphicalNote);
        this.NoteToGraphicalNoteMapObjectCount++;
    }

    public GNote(note: Note): GraphicalNote {
        return GraphicalNote.FromNote(note, this);
    }

    /** This should be done before a new sheet is loaded, not each re-render (otherwise the map would end empty). */
    public clearMusicSheetObjects(): void {
        this.NoteToGraphicalNoteMap = new Dictionary<number, GraphicalNote>();
        this.NoteToGraphicalNoteMapObjectCount = 0;
    }

    public setChordSymbolLabelText(key: ChordSymbolEnum, value: string): void {
        this.ChordSymbolLabelTexts.setValue(key, value);
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
        chordtexts.setValue(ChordSymbolEnum.none, "N.C.");

        return chordtexts;
    }

    public addChordName(
        altName: string,
        chordKindText: string,
        adds: string[],
        alts: string[],
        subs: string[],
    ): void {
        if (ChordSymbolEnum[chordKindText] !== undefined) {
            const degrees: DegreesInfo = {
                adds,
                alts,
                subs,
            };
            this.CustomChords.push(CustomChord.createCustomChord(altName, ChordSymbolEnum[chordKindText], degrees));
        }
    }

    public renameChord(altName: string, newAltName: string): void {
        CustomChord.renameCustomChord(altName, newAltName, this.CustomChords);
    }

    public resetChordNames(): void {
        // addChordName(alternateName, chordKindText, adds, alters, subtracts)
        this.addChordName("alt", "major", ["#5", "b9", "#9"], ["b5"], []);
        this.addChordName("7alt", "dominant", ["#5", "b9", "#9"], ["b5"], []);
        this.addChordName("7sus4", "dominant", ["4"], [], ["3"]);
        this.addChordName("7sus4", "suspendedfourth", ["7"], [], []);
        this.addChordName("9sus4", "dominantninth", ["4"], [], ["3"]);
        this.addChordName("9sus4", "suspendedfourth", ["9"], [], []);
        this.addChordName("11sus4", "dominant11th", ["4"], [], ["3"]);
        this.addChordName("11sus4", "suspendedfourth", ["11"], [], []);
        this.addChordName("13sus4", "dominant13th", ["4"], [], ["3"]);
        this.addChordName("13sus4", "suspendedfourth", ["13"], [], []);
        this.addChordName("7sus2", "dominant", ["2"], [], ["3"]);
        this.addChordName("7sus2", "suspendedsecond", ["7"], [], []);
        this.addChordName("m7b5", "minorseventh", [], ["b5"], []);
        this.addChordName("9sus2", "dominantninth", ["2"], [], ["3"]);
        this.addChordName("9sus2", "suspendedsecond", ["9"], [], []);
        this.addChordName("11sus2", "dominant11th", ["2"], [], ["3"]);
        this.addChordName("11sus2", "suspendedsecond", ["11"], [], []);
        this.addChordName("13sus2", "dominant13th", ["2"], [], ["3"]);
        this.addChordName("13sus2", "suspendedsecond", ["13"], [], []);
        this.addChordName("m(maj9)", "majorminor", ["9"], [], []);
        this.addChordName("m(maj11)", "majorminor", ["11"], [], []);
        this.addChordName("m(maj13)", "majorminor", ["13"], [], []);
        this.addChordName("69", "majorsixth", ["9"], [], []);
        this.addChordName("mi69", "minorsixth", ["9"], [], []);
    }

    /**
     * This method maps NoteDurations to Distances and DistancesScalingFactors.
     */
    // private populateDictionaries(): void {
    //     for (let i: number = 0; i < this.NoteDistances.length; i++) {
    //         switch (i) {
    //             case 0:
    //                 this.DurationDistanceDict[0.015625] = this.NoteDistances[i];
    //                 this.DurationScalingDistanceDict[0.015625] = this.NoteDistancesScalingFactors[i];
    //                 break;
    //             case 1:
    //                 this.DurationDistanceDict[0.03125] = this.NoteDistances[i];
    //                 this.DurationScalingDistanceDict[0.03125] = this.NoteDistancesScalingFactors[i];
    //                 break;
    //             case 2:
    //                 this.DurationDistanceDict[0.0625] = this.NoteDistances[i];
    //                 this.DurationScalingDistanceDict[0.0625] = this.NoteDistancesScalingFactors[i];
    //                 break;
    //             case 3:
    //                 this.DurationDistanceDict[0.125] = this.NoteDistances[i];
    //                 this.DurationScalingDistanceDict[0.125] = this.NoteDistancesScalingFactors[i];
    //                 break;
    //             case 4:
    //                 this.DurationDistanceDict[0.25] = this.NoteDistances[i];
    //                 this.DurationScalingDistanceDict[0.25] = this.NoteDistancesScalingFactors[i];
    //                 break;
    //             case 5:
    //                 this.DurationDistanceDict[0.5] = this.NoteDistances[i];
    //                 this.DurationScalingDistanceDict[0.5] = this.NoteDistancesScalingFactors[i];
    //                 break;
    //             case 6:
    //                 this.DurationDistanceDict[1.0] = this.NoteDistances[i];
    //                 this.DurationScalingDistanceDict[1.0] = this.NoteDistancesScalingFactors[i];
    //                 break;
    //             case 7:
    //                 this.DurationDistanceDict[2.0] = this.NoteDistances[i];
    //                 this.DurationScalingDistanceDict[2.0] = this.NoteDistancesScalingFactors[i];
    //                 break;
    //             default:
    //                 // FIXME
    //         }
    //     }
    // }

    /**
     * Calculate Curve-independend factors, to be used later in the Slur- and TieCurvePoints calculation
     */
    private calculateCurveParametersArrays(): void {
        this.TPower3 = new Array(this.BezierCurveStepSize);
        this.OneMinusTPower3 = new Array(this.BezierCurveStepSize);
        this.FactorOne = new Array(this.BezierCurveStepSize);
        this.FactorTwo = new Array(this.BezierCurveStepSize);
        for (let i: number = 0; i < this.BezierCurveStepSize; i++) {
            const t: number = i / this.BezierCurveStepSize;
            this.TPower3[i] = Math.pow(t, 3);
            this.OneMinusTPower3[i] = Math.pow((1 - t), 3);
            this.FactorOne[i] = 3 * Math.pow((1 - t), 2) * t;
            this.FactorTwo[i] = 3 * (1 - t) * Math.pow(t, 2);
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
