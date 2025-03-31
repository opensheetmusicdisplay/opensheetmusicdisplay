import { PagePlacementEnum } from "./GraphicalMusicPage";
//import {MusicSymbol} from "./MusicSymbol";
import log from "loglevel";
import { TextAlignmentEnum } from "../../Common/Enums/TextAlignment";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import {
    AutoBeamOptions,
    AlignRestOption,
    FillEmptyMeasuresWithWholeRests,
    SkyBottomLineBatchCalculatorBackendType
} from "../../OpenSheetMusicDisplay/OSMDOptions";
import { ColoringModes as ColoringMode } from "../../Common/Enums/ColoringModes";
import { Dictionary } from "typescript-collections";
import { FontStyles } from "../../Common/Enums";
import { NoteEnum, AccidentalEnum } from "../../Common/DataObjects/Pitch";
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
    public SheetCopyrightHeight: number;
    public SheetCopyrightMargin: number;
    /** Whether to use the (deprecated) OSMD < 1.8.6 way of parsing and displaying subtitles and composer,
     * which did not read multiple lines from XML credit-words tags.
     * Option will probably be removed soon.
     * @deprecated
     */
    public SheetComposerSubtitleUseLegacyParsing: boolean;
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
    public SystemLyricistDistance: number;
    public InstrumentLabelTextHeight: number;
    public MinimumDistanceBetweenSystems: number;
    public MinSkyBottomDistBetweenSystems: number;
    public LastSystemMaxScalingFactor: number;
    public StaffDistance: number;
    public BetweenStaffDistance: number;
    public StaffHeight: number;
    public TabStaffInterlineHeight: number;
    public TabStaffInterlineHeightForBboxes: number;
    public BetweenStaffLinesDistance: number;
    /** Whether to automatically beam notes that don't already have beams in XML. */
    public AutoBeamNotes: boolean;
    /** Options for autoBeaming like whether to beam over rests. See AutoBeamOptions interface. */
    public AutoBeamOptions: AutoBeamOptions;
    /** Whether to automatically generate new beams for tabs. Also see TabBeamsRendered for existing XML beams. */
    public AutoBeamTabs: boolean;
    public BeamWidth: number;
    public BeamSpaceWidth: number;
    public BeamForwardLength: number;
    public FlatBeams: boolean;
    public FlatBeamOffset: number;
    public FlatBeamOffsetPerBeam: number;
    public ClefLeftMargin: number;
    public ClefRightMargin: number;
    /** How many unique note positions a percussion score needs to have to not be rendered on one line.
     * To always use 5 lines for percussion, set this to 0. (works unless the XML says <staff-lines>1)
     */
    public PercussionOneLineCutoff: number;
    public PercussionForceVoicesOneLineCutoff: number;
    public PercussionUseXMLDisplayStep: boolean;
    public PercussionXMLDisplayStepNoteValueShift: number;
    public PercussionOneLineXMLDisplayStepOctaveOffset: number;
    /** Makes the score position notes on the 2 cajon stafflines, and use 2 stafflines even if PercussionOneLineCutoff set.
     * Should only be set for cajon scores, as this will disable the PercussionOneLineCutoff.
     */
    public PercussionUseCajon2NoteSystem: boolean;
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
    /** Set this to e.g. -0.5 or -0.8 to put grace notes a lot closer to the main note. */
    public GraceNoteGroupXMargin: number;
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
    /** Whether an accent should by default be placed above the note if its note stem is above. Default false (below).
     * Applies to accents (>/^), staccato (.), pizzicato (+), mainly (in our samples)
     * Note that this can be overwritten if the MusicXML says "placement='below'".
     */
    public ArticulationAboveNoteForStemUp: boolean;
    public SoftAccentWedgePadding: number;
    public SoftAccentSizeFactor: number;
    public DistanceBetweenAdjacentDynamics: number;
    public TempoChangeMeasureValidity: number;
    public TempoContinousFactor: number;
    public StaccatoScalingFactor: number;
    public BetweenDotsDistance: number;
    public OrnamentAccidentalScalingFactor: number;
    public ChordSymbolTextHeight: number;
    public ChordSymbolTextAlignmentTop: TextAlignmentEnum;
    public ChordSymbolTextAlignmentBottom: TextAlignmentEnum;
    public ChordSymbolBottomMargin: number;
    public ChordSymbolRelativeXOffset: number;
    /** Additional x-shift for short chord symbols (e.g. C, but not Eb/7), to appear more centered. */
    public ChordSymbolExtraXShiftForShortChordSymbols: number;
    /** Threshold width below which to apply ChordSymbolExtraXShiftForShortChordSymbols. */
    public ChordSymbolExtraXShiftWidthThreshold: number;
    public ChordSymbolXSpacing: number;
    public ChordOverlapAllowedIntoNextMeasure: number;
    public ChordSymbolYOffset: number;
    public ChordSymbolYPadding: number;
    public ChordSymbolYAlignment: boolean;
    public ChordSymbolYAlignmentScope: string;
    /** Offset to start of measure (barline) when chord symbol is on whole measure rest.
     * An offset of 0 would place the chord symbol directly above the barline, so the default is ~1.2.
     */
    public ChordSymbolWholeMeasureRestXOffset: number;
    public ChordSymbolWholeMeasureRestXOffsetMeasure1: number;
    public ChordSymbolLabelTexts: Dictionary<ChordSymbolEnum, string>;
    public ChordAccidentalTexts: Dictionary<AccidentalEnum, string>;
    public CustomChords: CustomChord[];
    /** Not always a symbol, can also be text (RepetitionInstruction). Keeping the name for backwards compatibility. */
    public RepetitionSymbolsYOffset: number;
    /** Adds a percent of the stave's width (e.g. 0.4 = 40%) to the x position of end instructions like Fine or D.C. al fine */
    public RepetitionEndInstructionXShiftAsPercentOfStaveWidth: number;
    public RehearsalMarkXOffset: number;
    public RehearsalMarkXOffsetDefault: number;
    public RehearsalMarkXOffsetSystemStartMeasure: number;
    public RehearsalMarkYOffset: number;
    public RehearsalMarkYOffsetDefault: number;
    /** y offset added to avoid collisions of rehearsal marks (e.g. "A" or "Verse") with multiple measure rest numbers. */
    public RehearsalMarkYOffsetAddedForRehearsalMarks: number;
    public RehearsalMarkFontSize: number;
    public MeasureNumberLabelHeight: number;
    public MeasureNumberLabelOffset: number;
    public MeasureNumberLabelXOffset: number;
    /** Whether tuplets should display ratio (3:2 instead of 3 for triplet). Default false. */
    public TupletsRatioed: boolean;
    /** Whether tuplets (except triplets) should be bracketed (e.g. |--5--| instead of 5). Default false.
     * Note that this doesn't affect triplets (|--3--|), which have their own setting TripletsBracketed.
     * If false, only tuplets given as bracketed in XML (bracket="yes") will be bracketed.
     * (If not given in XML, bracketing is implementation-dependent according to standard)
     */
    public TupletsBracketed: boolean;
    /** Whether all triplets should be bracketed. Overrides tupletsBracketed for triplets.
     * If false, only triplets given as bracketed in XML (bracket="yes") will be bracketed.
     * (Bracketing all triplets can be cluttering)
     */
    public TripletsBracketed: boolean;
    /** Whether to bracket like the XML says when 'bracket="no"' or "yes" is given.
     * Otherwise, OSMD decides bracket usage.
     * Note that sometimes the XML doesn't have any 'bracket' value. */
    public TupletsBracketedUseXMLValue: boolean;
    public TupletNumberLabelHeight: number;
    public TupletNumberYOffset: number;
    public TupletNumberLimitConsecutiveRepetitions: boolean;
    public TupletNumberMaxConsecutiveRepetitions: number;
    public TupletNumberAlwaysDisableAfterFirstMax: boolean;
    /** Whether to use the <tuplet show-number="value"> value or to ignore it. */
    public TupletNumberUseShowNoneXMLValue: boolean;
    public LabelMarginBorderFactor: number;
    public TupletVerticalLineLength: number;
    /** Whether to show tuplet numbers (and brackets) in tabs. Brackets can be disabled via TabTupletsBracketed. */
    public TupletNumbersInTabs: boolean;
    /** Whether to show brackets in tab tuplets. To not render tab tuplets entirely, set TupletNumbersInTabs = false. */
    public TabTupletsBracketed: boolean;
    public TabTupletYOffsetBottom: number;
    /** Additional offset applied to top tuplets (added to TabTupletYOffset).
     * You could apply a negative offset if the piece doesn't have effects like bends,
     * which often take some vertical space.
     */
    public TabTupletYOffsetTop: number;
    public TabTupletYOffsetEffects: number;
    public TabBeamsRendered: boolean;
    public TabKeySignatureRendered: boolean;
    /** Whether space should be reserved as if there was a key signature.
     * False basically only works for tab-only scores, as it prevents vertical x-alignment with other staves.
     * False is more compact for tab-only scores.
     */
    public TabKeySignatureSpacingAdded: boolean;
    public TabTimeSignatureRendered: boolean;
    /** Whether space should be reserved as if there was a key signature.
     * False basically only works for tab-only scores, as it prevents vertical x-alignment with other staves.
     * False is more compact for tab-only scores.
     */
    public TabTimeSignatureSpacingAdded: boolean;
    public TabFingeringsRendered: boolean;
    /** Use an X in tabs when the note has an X notehead, e.g. in the staff above in the classical notes, instead of the fret number */
    public TabUseXNoteheadShapeForTabNote: boolean;
    public TabUseXNoteheadAlternativeGlyph: boolean;
    public TabXNoteheadScale: number;

    public RepetitionAllowFirstMeasureBeginningRepeatBarline: boolean;
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
    public LyricsYMarginToBottomLine: number;
    /** Extra x-shift (to the right) for short lyrics to be better vertically aligned.
     * Also see ChordSymbolExtraXShiftForShortChordSymbols, same principle, same default value.
     */
    public LyricsExtraXShiftForShortLyrics: number;
    /** Threshold of the lyric entry's width below which the x-shift is applied. Default 1.4. */
    public LyricsExtraXShiftForShortLyricsWidthThreshold: number;
    /** Whether to enable x padding (to the right) for notes with long lyrics, see LyricsXPaddingFactorForLongLyrics for the degree.
     * This helps avoid overlaps and shorten measures, because otherwise the whole measure needs to be stretched to avoid overlaps,
     * see MaximumLyricsElongationFactor */
    public LyricsUseXPaddingForLongLyrics: boolean;
    /** How much spacing/padding should be added after notes with long lyrics on short notes
     * (>4 characters on <8th note),
     * so that the measure doesn't need to be elongated too much to avoid lyrics collisions.
     * Default 1 = 10 pixels */
    public LyricsXPaddingFactorForLongLyrics: number;
    /** How wide a text needs to be to trigger lyrics padding for short notes.
     * This is visual width, not number of characters, as e.g. 'zzz' is wider than 'iii'.
     * Default 3.3.
     */
    public LyricsXPaddingWidthThreshold: number;
    /** Long notes need less padding than short ones, by default we use 0.7 less padding. */
    public LyricsXPaddingReductionForLongNotes: number;
    /** Last note in measure needs less padding because of measure bar and bar start/end padding. */
    public LyricsXPaddingReductionForLastNoteInMeasure: number;
    public LyricsXPaddingForLastNoteInMeasure: boolean;
    public VerticalBetweenLyricsDistance: number;
    public HorizontalBetweenLyricsDistance: number;
    public BetweenSyllableMaximumDistance: number;
    public BetweenSyllableMinimumDistance: number;
    public LyricOverlapAllowedIntoNextMeasure: number;
    public MinimumDistanceBetweenDashes: number;
    public MaximumLyricsElongationFactor: number;

    public SlurPlacementFromXML: boolean;
    public SlurPlacementAtStems: boolean;
    public SlurPlacementUseSkyBottomLine: boolean;
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
    public SlurEndArticulationYOffset: number;
    public SlurStartArticulationYOffsetOfArticulation: number;
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
    public SlurMaximumYControlPointDistance: number;
    public GlissandoNoteOffset: number;
    public GlissandoStafflineStartMinimumWidth: number;
    public GlissandoStafflineStartYDistanceToNote: number;
    public GlissandoStafflineEndOffset: number;
    public GlissandoDefaultWidth: number;
    public TempoYSpacing: number;
    public InstantaneousTempoTextHeight: number;
    public ContinuousDynamicTextHeight: number;
    /** Whether to use the XML offset value for expressions, especially wedges (crescendo). See #1477 */
    public UseEndOffsetForExpressions: boolean;
    public MoodTextHeight: number;
    public UnknownTextHeight: number;
    public ContinuousTempoTextHeight: number;
    public VexFlowDefaultNotationFontScale: number;
    public VexFlowDefaultTabFontScale: number;
    public TremoloStrokeScale: number;
    public TremoloYSpacingScale: number;
    public TremoloBuzzRollThickness: number;
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
    public MultipleRestMeasureAddKeySignature: boolean;
    /** Use the same measure width for all measures (experimental).
     *  Note that this will use the largest width of all measures,
     *  as Vexflow will mess up the layout with overlays if using less than minimum width.
     *  See formatter.preCalculateMinTotalWidth()
     */
    public FixedMeasureWidth: boolean;
    /** Use a fixed width for all measures (experimental).
     *  This is mostly for debugging or for when you already know how big the measures
     *  in the target score are, because using a too low width will cause overlaps in Vexflow.
     */
    public FixedMeasureWidthFixedValue: number;
    public FixedMeasureWidthUseForPickupMeasures: boolean;
    public DistanceBetweenVerticalSystemLines: number;
    public DistanceBetweenDotAndLine: number;
    public RepeatEndStartPadding: number;
    public OctaveShiftLineWidth: number;
    public OctaveShiftVerticalLineLength: number;
    public OctaveShiftOnWholeMeasureNoteUntilEndOfMeasure: boolean;
    public GraceLineWidth: number;
    public MinimumStaffLineDistance: number;
    public MinSkyBottomDistBetweenStaves: number;
    public MinimumCrossedBeamDifferenceMargin: number;

    /** Maximum width of sheet / HTMLElement containing the score. Canvas is limited to 32767 in current browsers, though SVG isn't.
     *  Setting this to > 32767 will break the canvas backend (no problem if you only use SVG).
     */
    public SheetMaximumWidth: number;

    public VoiceSpacingMultiplierVexflow: number;
    public VoiceSpacingAddendVexflow: number;
    public PickupMeasureWidthMultiplier: number;
    /** The spacing between a repetition that is followed by an implicit/pickup/incomplete measure.
     *  (E.g. in a 4/4 time signature, a measure that repeats after the 3rd beat, continuing with a pickup measure)
     */
    public PickupMeasureRepetitionSpacing: number;
    /** Multiplier for PickupMeasureRepetitionSpacing if there is only one note in the pickup measure. This usually needs a lot more space. */
    public PickupMeasureSpacingSingleNoteAddend: number;
    public DisplacedNoteMargin: number;
    public MinNoteDistance: number;
    public SubMeasureXSpacingThreshold: number;
    public MeasureDynamicsMaxScalingFactor: number;
    public WholeRestXShiftVexflow: number;
    public MetronomeMarksDrawn: boolean;
    public MetronomeMarkXShift: number;
    public MetronomeMarkYShift: number;
    public SoftmaxFactorVexFlow: number;
    /** Stagger (x-shift) whole notes that are the same note, but in different voices (show 2 instead of 1). */
    public StaggerSameWholeNotes: boolean;
    public MaxInstructionsConstValue: number;
    public NoteDistances: number[] = [1.0, 1.0, 1.3, 1.6, 2.0, 2.5, 3.0, 4.0];
    public NoteDistancesScalingFactors: number[] = [1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0, 128.0];
    public DurationDistanceDict: {[_: number]: number } = {};
    public DurationScalingDistanceDict: {[_: number]: number } = {};

    /** Whether to align rests. 0 = Never, 1 = Always, 2 = Auto.
     * Currently not recommended because rests are now positioned to avoid collisions with notes. */
    public AlignRests: AlignRestOption; // 0 = false, 1 = true, 2 = auto
    public RestCollisionYPadding: number;
    public FillEmptyMeasuresWithWholeRest: FillEmptyMeasuresWithWholeRests | number;
    public ArpeggiosGoAcrossVoices: boolean;
    public RenderArpeggios: boolean;
    public RenderSlurs: boolean;
    public RenderGlissandi: boolean;
    public ColoringMode: ColoringMode;
    public ColoringEnabled: boolean;
    public ColorStemsLikeNoteheads: boolean;
    public ColorFlags: boolean;
    public ColorBeams: boolean;
    public ColoringSetCurrent: Dictionary<NoteEnum|number, string>;
    /** Default color for all musical elements including key signature etc. Default undefined. */
    public DefaultColorMusic: string;
    public DefaultColorNotehead: string;
    public DefaultColorRest: string;
    public DefaultColorStem: string;
    public DefaultColorLabel: string;
    public DefaultColorLyrics: string;
    public DefaultColorChordSymbol: string;
    public DefaultColorTitle: string;
    public DefaultColorCursor: string;
    public DefaultFontFamily: string;
    public DefaultFontStyle: FontStyles;
    public DefaultVexFlowNoteFont: string;
    public MaxMeasureToDrawIndex: number;
    /** The setting given in osmd.setOptions(), which may lead to a different index if there's a pickup measure. */
    public MaxMeasureToDrawNumber: number;
    public MinMeasureToDrawIndex: number;
    /** The setting given in osmd.setOptions(), which may lead to a different index if there's a pickup measure.
     * If there's a pickup measure (measure 0), and we want to draw from measure number 2,
     *   we need to skip measure index 0 (the pickup measure).
     */
    public MinMeasureToDrawNumber: number;
    public MaxPageToDrawNumber: number;
    public MaxSystemToDrawNumber: number;

    /** Whether to render a label for the composer of the piece at the top of the sheet. */
    public RenderComposer: boolean;
    public RenderTitle: boolean;
    public RenderSubtitle: boolean;
    public RenderLyricist: boolean;
    public RenderCopyright: boolean;
    public RenderPartNames: boolean;
    public RenderPartAbbreviations: boolean;
    /** Whether two render system labels on page 2+. This doesn't affect the default endless PageFormat. */
    public RenderSystemLabelsAfterFirstPage: boolean;
    public RenderFingerings: boolean;
    public RenderMeasureNumbers: boolean;
    public RenderMeasureNumbersOnlyAtSystemStart: boolean;
    public UseXMLMeasureNumbers: boolean;
    public RenderLyrics: boolean;
    public RenderChordSymbols: boolean;
    public RenderMultipleRestMeasures: boolean;
    public AutoGenerateMultipleRestMeasuresFromRestMeasures: boolean;
    public RenderRehearsalMarks: boolean;
    public RenderClefsAtBeginningOfStaffline: boolean;
    public RenderKeySignatures: boolean;
    public RenderTimeSignatures: boolean;
    public RenderPedals: boolean;
    public DynamicExpressionMaxDistance: number;
    public DynamicExpressionSpacer: number;
    public IgnoreRepeatedDynamics: boolean;
    public ExpressionsUseXMLColor: boolean;
    public ArticulationPlacementFromXML: boolean;
    /** Percent distance of breath marks to next note or end of staff, e.g. 0.8 = 80%. */
    public BreathMarkDistance: number;
    /** Where to draw fingerings (Above, Below, AboveOrBelow, Left, Right, or Auto).
     * Default AboveOrBelow. Auto experimental. */
    public FingeringPosition: PlacementEnum;
    public FingeringPositionFromXML: boolean;
    public FingeringPositionGrace: PlacementEnum;
    public FingeringInsideStafflines: boolean;
    public FingeringLabelFontHeight: number;
    public FingeringOffsetX: number;
    public FingeringOffsetY: number;
    public FingeringPaddingY: number;
    public FingeringTextSize: number;
    /** Whether to render string numbers in classical scores, i.e. not the string numbers in tabs, but e.g. for violin. */
    public RenderStringNumbersClassical: boolean;
    /** This is not for tabs, but for classical scores, especially violin. */
    public StringNumberOffsetY: number;
    public NewSystemAtXMLNewSystemAttribute: boolean;
    /** Whether to begin a new system when a page break is given in XML ('new-page="yes"'), but newPageFromXML is false.
     *  Default false, because it can lead to nonsensical system breaks after a single measure,
     *  as OSMD does a different layout than the original music program exported from.
     * */
    public NewSystemAtXMLNewPageAttribute: boolean;
    public NewPageAtXMLNewPageAttribute: boolean;
    /** Force OSMD to render only x measures per line/system, creating line breaks / system breaks. Disabled if set to 0. */
    public RenderXMeasuresPerLineAkaSystem: number;
    public PageFormat: PageFormat;
    public PageBackgroundColor: string; // vexflow-color-string (#FFFFFF). Default undefined/transparent.
    /** Whether dark mode is enabled. This is read-only, to set this, please use osmd.setOptions({darkMode: true}). */
    public DarkModeEnabled: boolean;
    public UsePageBackgroundColorForTabNotes: boolean;
    public RenderSingleHorizontalStaffline: boolean;
    public RestoreCursorAfterRerender: boolean;
    public StretchLastSystemLine: boolean;
    /** Ignore brackets - e.g. `( )` - that were supposed to be around a note,
     * but were inserted as a words element in the MusicXML, which can't be matched to the note anymore,
     * and would otherwise just be placed somewhere else. See OSMD Issue 1251. */
    public IgnoreBracketsWords: boolean;
    public PlaceWordsInsideStafflineFromXml: boolean;
    public PlaceWordsInsideStafflineYOffset: number;
    // public PositionMarcatoCloseToNote: boolean;
    public SpacingBetweenTextLines: number;

    public NoteToGraphicalNoteMap: Dictionary<number, GraphicalNote>;
    // this is basically a WeakMap, except we save the id in the Note instead of using a WeakMap.
    public NoteToGraphicalNoteMapObjectCount: number = 0;
    /** How many times osmd.render() was already called on the currently loaded score.
     * Resets after osmd.load() (via osmd.reset()).
     * Can be relevant for transposition or generally informative.
     */
    public RenderCount: number = 0;

    /** The skyline and bottom-line batch calculation algorithm to use.
     *  Note that this can be overridden if AlwaysSetPreferredSkyBottomLineBackendAutomatically is true (which is the default).
     */
    public PreferredSkyBottomLineBatchCalculatorBackend: SkyBottomLineBatchCalculatorBackendType;
    /** Whether to consider using WebGL in Firefox in EngravingRules.setPreferredSkyBottomLineBackendAutomatically() */
    public DisableWebGLInFirefox: boolean;
    /** Whether to consider using WebGL in Safari/iOS in EngravingRules.setPreferredSkyBottomLineBackendAutomatically() */
    public DisableWebGLInSafariAndIOS: boolean;

    /** The minimum number of measures in the sheet where the skyline and bottom-line batch calculation is enabled.
     *  Batch is faster for medium to large size scores, but slower for very short scores.
     */
    public SkyBottomLineBatchMinMeasures: number;
    /** The minimum number of measures in the sheet where WebGL will be used. WebGL is slower for short scores, but much faster for large ones.
     * Note that WebGL is currently never used in Safari and Firefox, because it's always slower there.
     */
    public SkyBottomLineWebGLMinMeasures: number;
    /** Whether to always set preferred backend (WebGL or Plain) automatically, depending on browser and number of measures. */
    public AlwaysSetPreferredSkyBottomLineBackendAutomatically: boolean;

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
        this.SheetCopyrightHeight = 1.5;
        this.SheetCopyrightMargin = 2.0;
        this.SheetComposerSubtitleUseLegacyParsing = false;

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
        this.TabStaffInterlineHeightForBboxes = 1.3; // bbox exactly on top tab line + 1.3 = 2nd line
        //   if we also set TabStaffInterlineHeight to 1.3, tab scores get bigger. (because this affects StaffHeight)
        this.BetweenStaffLinesDistance = EngravingRules.unit;
        this.SystemLeftMargin = 0.0;
        this.SystemRightMargin = 0.0;
        this.SystemLabelsRightMargin = 2.0;
        this.SystemComposerDistance = 2.0;
        this.SystemLyricistDistance = 2.0;
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
        this.AutoBeamTabs = false;

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
        this.PercussionUseCajon2NoteSystem = false;
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
        this.GraceNoteGroupXMargin = 0.0; // More than 0 leads to too much space in most cases.
        //  see test_end_clef_measure. only potential 'tight' case: test_graceslash_simple

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
        this.ArticulationAboveNoteForStemUp = false;
        this.SoftAccentWedgePadding = 0.4;
        this.SoftAccentSizeFactor = 0.6;
        this.DistanceBetweenAdjacentDynamics = 0.75;

        // Tempo Variables
        this.TempoChangeMeasureValidity = 4;
        this.TempoContinousFactor = 0.7;

        // various
        this.StaccatoScalingFactor = 0.8;
        this.BetweenDotsDistance = 0.8;
        this.OrnamentAccidentalScalingFactor = 0.65;
        this.ChordSymbolTextHeight = 2.0;
        this.ChordSymbolTextAlignmentTop = TextAlignmentEnum.LeftBottom;
        this.ChordSymbolTextAlignmentBottom = TextAlignmentEnum.LeftTop;
        this.ChordSymbolBottomMargin = 0.6;
        this.ChordSymbolRelativeXOffset = -1.0;
        this.ChordSymbolExtraXShiftForShortChordSymbols = 0.3; // also see LyricsExtraXShiftForShortLyrics, same principle
        this.ChordSymbolExtraXShiftWidthThreshold = 2.0;
        this.ChordSymbolXSpacing = 1.0;
        this.ChordOverlapAllowedIntoNextMeasure = 0;
        this.ChordSymbolYOffset = 0.1;
        this.ChordSymbolYPadding = 0.0;
        this.ChordSymbolYAlignment = true;
        this.ChordSymbolYAlignmentScope = "staffline"; // "measure" or "staffline"
        this.ChordSymbolWholeMeasureRestXOffset = 0;
        this.ChordSymbolWholeMeasureRestXOffsetMeasure1 = -2.0;
        this.ChordAccidentalTexts = new Dictionary<AccidentalEnum, string>();
        this.resetChordAccidentalTexts(this.ChordAccidentalTexts, false);
        this.ChordSymbolLabelTexts = new Dictionary<ChordSymbolEnum, string>();
        this.resetChordSymbolLabelTexts(this.ChordSymbolLabelTexts);
        this.CustomChords = [];
        this.resetChordNames();
        this.RepetitionSymbolsYOffset = 0;
        this.RepetitionEndInstructionXShiftAsPercentOfStaveWidth = 0.4; // 40%
        this.RehearsalMarkXOffsetDefault = 10; // avoid collision with metronome number
        this.RehearsalMarkXOffset = 0; // user defined
        this.RehearsalMarkXOffsetSystemStartMeasure = -20; // good test: Haydn Concertante
        this.RehearsalMarkYOffsetDefault = -15;
        this.RehearsalMarkYOffsetAddedForRehearsalMarks = -12;
        this.RehearsalMarkYOffset = 0; // user defined
        this.RehearsalMarkFontSize = 10; // vexflow default: 12, too big with chord symbols

        // Tuplets, MeasureNumber and TupletNumber Labels
        this.MeasureNumberLabelHeight = 1.5 * EngravingRules.unit;
        this.MeasureNumberLabelOffset = 2;
        this.MeasureNumberLabelXOffset = -0.5;
        this.TupletsRatioed = false;
        this.TupletsBracketed = false;
        this.TripletsBracketed = false; // special setting for triplets, overrides tuplet setting (for triplets only)
        this.TupletsBracketedUseXMLValue = true;
        this.TupletNumberLabelHeight = 1.5 * EngravingRules.unit;
        this.TupletNumberYOffset = 0.5;
        this.TupletNumberLimitConsecutiveRepetitions = true;
        this.TupletNumberMaxConsecutiveRepetitions = 2;
        this.TupletNumberAlwaysDisableAfterFirstMax = true;
        this.TupletNumberUseShowNoneXMLValue = true;
        this.LabelMarginBorderFactor = 0.1;
        this.TupletVerticalLineLength = 0.5;
        this.TupletNumbersInTabs = true; // disabled by default, nonstandard in tabs, at least how we show them in non-tabs.
        this.TabTupletYOffsetBottom = 1.0; // OSMD units
        this.TabTupletYOffsetTop = -3.5; // -3.5 is fine if you don't have effects like bends on top. Otherwise, e.g. -2 avoids overlaps.
        this.TabTupletYOffsetEffects = 1.5;
        this.TabTupletsBracketed = true;
        this.TabBeamsRendered = true;
        this.TabKeySignatureRendered = false; // standard not to render for tab scores
        this.TabKeySignatureSpacingAdded = true; // false only works for tab-only scores, as it will prevent vertical x-alignment.
        this.TabTimeSignatureRendered = false; // standard not to render for tab scores
        this.TabTimeSignatureSpacingAdded = true; // false only works for tab-only scores, as it will prevent vertical x-alignment.
        this.TabFingeringsRendered = false; // tabs usually don't show fingering. This can also be duplicated when you have a classical+tab score.
        this.TabUseXNoteheadShapeForTabNote = true;
        this.TabUseXNoteheadAlternativeGlyph = true;
        this.TabXNoteheadScale = 0.9;

        // Slur and Tie variables
        this.SlurPlacementFromXML = true;
        this.SlurPlacementAtStems = false;
        this.SlurPlacementUseSkyBottomLine = false;
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
        this.SlurEndArticulationYOffset = 0.8;
        this.SlurStartArticulationYOffsetOfArticulation = 0.5;
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
        //Maximum y difference between control points. Forces slurs to have less 'weight' either way in the x direction
        this.SlurMaximumYControlPointDistance = undefined;

        // Glissandi
        this.GlissandoNoteOffset = 0.5;
        this.GlissandoStafflineStartMinimumWidth = 1;
        this.GlissandoStafflineStartYDistanceToNote = 0.8; // just crossing the line above/below end note. should be similar to tab slide angle.
        this.GlissandoStafflineEndOffset = 1;
        this.GlissandoDefaultWidth = 0.1;

        // Repetitions
        this.RepetitionAllowFirstMeasureBeginningRepeatBarline = true;
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
        this.LyricsYMarginToBottomLine = 0.2;
        this.LyricsExtraXShiftForShortLyrics = 0.5; // also see ChordSymbolExtraXShiftForShortChordSymbols, same principle
        this.LyricsExtraXShiftForShortLyricsWidthThreshold = 1.4; // width of '+': 1.12, 'II': 1.33 (benefits from x-shift), 'III': 1.99 (doesn't benefit)
        this.LyricsUseXPaddingForLongLyrics = true;
        this.LyricsXPaddingFactorForLongLyrics = 1.0;
        this.LyricsXPaddingWidthThreshold = 1.7; // generateImages script with png might need more for 8th notes, e.g. Chloe
        this.LyricsXPaddingReductionForLongNotes = 0.7;
        this.LyricsXPaddingReductionForLastNoteInMeasure = 1.2;
        this.LyricsXPaddingForLastNoteInMeasure = true;
        this.VerticalBetweenLyricsDistance = 0.5;
        this.HorizontalBetweenLyricsDistance = 0.2;
        this.BetweenSyllableMaximumDistance = 10.0;
        this.BetweenSyllableMinimumDistance = 0.5; // + 1.0 for CenterAlignment added in lyrics spacing
        this.LyricOverlapAllowedIntoNextMeasure = 3.4; // optimal for dashed last lyric, see Land der Berge
        this.MinimumDistanceBetweenDashes = 10;
        this.MaximumLyricsElongationFactor = 2.5;

        // expressions variables
        this.TempoYSpacing = 0.5; // note this is correlated with MetronomeMarkYShift: one-sided change can cause collisions
        this.InstantaneousTempoTextHeight = 2.3;
        this.ContinuousDynamicTextHeight = 2.3;
        this.UseEndOffsetForExpressions = true;
        this.MoodTextHeight = 2.3;
        this.UnknownTextHeight = 2.0;
        this.ContinuousTempoTextHeight = 2.3;
        this.DynamicExpressionMaxDistance = 2;
        this.DynamicExpressionSpacer = 0.5;
        this.IgnoreRepeatedDynamics = false;
        this.ExpressionsUseXMLColor = true;

        // Line Widths
        this.VexFlowDefaultNotationFontScale = 39; // scales notes, including rests. default value 39 in Vexflow.
        this.VexFlowDefaultTabFontScale = 39;
        this.TremoloStrokeScale = 1;
        this.TremoloYSpacingScale = 1;
        this.TremoloBuzzRollThickness = 0.25;
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
        this.SystemDotWidth = EngravingRules.unit / 2.0;
        this.DistanceBetweenVerticalSystemLines = 0.35;
        this.DistanceBetweenDotAndLine = 0.7;
        this.RepeatEndStartPadding = 2.0; // set to 0.0 to restore old padding/width with :||: measures
        this.OctaveShiftLineWidth = 0.12;
        this.OctaveShiftVerticalLineLength = EngravingRules.unit;
        this.OctaveShiftOnWholeMeasureNoteUntilEndOfMeasure = false;
        this.GraceLineWidth = this.StaffLineWidth * this.GraceNoteScalingFactor;

        this.MultipleRestMeasureDefaultWidth = 4;
        this.MultipleRestMeasureAddKeySignature = true;

        this.FixedMeasureWidth = false;
        this.FixedMeasureWidthFixedValue = undefined; // only set to a number x if the width should be always x
        this.FixedMeasureWidthUseForPickupMeasures = false;

        // Line Widths
        this.MinimumCrossedBeamDifferenceMargin = 0.0001;

        // Canvas is limited to 32767 in most browsers, though SVG isn't.
        this.SheetMaximumWidth = 32767;

        // xSpacing Variables
        this.VoiceSpacingMultiplierVexflow = 0.85;
        this.VoiceSpacingAddendVexflow = 3.0;
        this.PickupMeasureWidthMultiplier = 1.0;
        this.PickupMeasureRepetitionSpacing = 0.8;
        this.PickupMeasureSpacingSingleNoteAddend = 1.6;
        this.DisplacedNoteMargin = 0.1;
        this.MinNoteDistance = 2.0;
        this.SubMeasureXSpacingThreshold = 35;
        this.MeasureDynamicsMaxScalingFactor = 2.5;
        this.WholeRestXShiftVexflow = -1.5; // VexFlow draws rest notes too far to the right
        this.MetronomeMarksDrawn = true;
        this.MetronomeMarkXShift = -6; // our unit, is taken * unitInPixels
        this.MetronomeMarkYShift = -1.0; // note this is correlated with TempoYSpacing: one-sided change can cause collisions
        this.SoftmaxFactorVexFlow = 15; // only applies to Vexflow 3.x. 15 seems like the sweet spot. Vexflow default is 100.
        // if too high, score gets too big, especially half notes. with half note quarter quarter, the quarters get squeezed.
        // if too low, smaller notes aren't positioned correctly.
        this.StaggerSameWholeNotes = true;

        // Render options (whether to render specific or invisible elements)
        this.AlignRests = AlignRestOption.Never; // 0 = false, 1 = true, 2 = auto
        this.RestCollisionYPadding = 0.0; // 1.0 = half distance between staff lines (e.g. E to F). will be rounded to whole numbers.
        this.FillEmptyMeasuresWithWholeRest = FillEmptyMeasuresWithWholeRests.No;
        this.ArpeggiosGoAcrossVoices = false; // safe option, as otherwise arpeggios will always go across all voices in Vexflow, which is often unwanted
        this.RenderArpeggios = true;
        this.RenderSlurs = true;
        this.RenderGlissandi = true;
        this.ColoringMode = ColoringMode.XML;
        this.ColoringEnabled = true;
        this.ColorStemsLikeNoteheads = false;
        this.ColorBeams = true;
        this.ColorFlags = true;
        this.applyDefaultColorMusic("#000000"); // black. undefined is only black if a note's color hasn't been changed before.
        this.DefaultColorCursor = "#33e02f"; // green
        this.DefaultFontFamily = "Times New Roman"; // what OSMD was initially optimized for
        this.DefaultFontStyle = FontStyles.Regular;
        this.DefaultVexFlowNoteFont = "gonville"; // was the default vexflow font up to vexflow 1.2.93, now it's Bravura, which is more cursive/bold
        this.MaxMeasureToDrawIndex = Number.MAX_VALUE;
        this.MaxMeasureToDrawNumber = Number.MAX_VALUE;
        this.MinMeasureToDrawIndex = 0;
        this.MinMeasureToDrawNumber = 0;
        this.MaxSystemToDrawNumber = Number.MAX_VALUE;
        this.MaxPageToDrawNumber = Number.MAX_VALUE;
        this.RenderComposer = true;
        this.RenderTitle = true;
        this.RenderSubtitle = true;
        this.RenderLyricist = true;
        this.RenderCopyright = false;
        this.RenderPartNames = true;
        this.RenderPartAbbreviations = true;
        this.RenderSystemLabelsAfterFirstPage = true;
        this.RenderFingerings = true;
        this.RenderMeasureNumbers = true;
        this.RenderMeasureNumbersOnlyAtSystemStart = false;
        this.UseXMLMeasureNumbers = true;
        this.RenderLyrics = true;
        this.RenderChordSymbols = true;
        this.RenderMultipleRestMeasures = true;
        this.AutoGenerateMultipleRestMeasuresFromRestMeasures = true;
        this.RenderRehearsalMarks = true;
        this.RenderClefsAtBeginningOfStaffline = true;
        this.RenderKeySignatures = true;
        this.RenderTimeSignatures = true;
        this.RenderPedals = true;
        this.ArticulationPlacementFromXML = true;
        this.BreathMarkDistance = 0.8;
        this.FingeringPosition = PlacementEnum.AboveOrBelow; // AboveOrBelow = correct bounding boxes
        this.FingeringPositionFromXML = true;
        this.FingeringPositionGrace = PlacementEnum.Left;
        this.FingeringInsideStafflines = false;
        this.FingeringLabelFontHeight = 1.7;
        this.FingeringOffsetX = 0.0;
        this.FingeringOffsetY = 0.0;
        this.FingeringPaddingY = -0.2;
        this.FingeringTextSize = 1.5;
        this.RenderStringNumbersClassical = true;
        this.StringNumberOffsetY = 0.0;
        this.NewSystemAtXMLNewSystemAttribute = false;
        this.NewPageAtXMLNewPageAttribute = false;
        this.NewSystemAtXMLNewPageAttribute = false;
        this.RenderXMeasuresPerLineAkaSystem = 0;
        this.RestoreCursorAfterRerender = true;
        this.StretchLastSystemLine = false;
        this.IgnoreBracketsWords = true;
        this.PlaceWordsInsideStafflineFromXml = false;
        this.PlaceWordsInsideStafflineYOffset = 0.9;
        // this.PositionMarcatoCloseToNote = true;

        this.PageFormat = PageFormat.UndefinedPageFormat; // default: undefined / 'infinite' height page, using the canvas'/container's width and height
        this.PageBackgroundColor = undefined; // default: transparent. half-transparent white: #FFFFFF88"
        this.DarkModeEnabled = false;
        this.UsePageBackgroundColorForTabNotes = true;
        this.RenderSingleHorizontalStaffline = false;
        this.SpacingBetweenTextLines = 0;

        this.NoteToGraphicalNoteMap = new Dictionary<number, GraphicalNote>();
        this.NoteToGraphicalNoteMapObjectCount = 0;

        this.SkyBottomLineBatchMinMeasures = 5;
        this.SkyBottomLineWebGLMinMeasures = 80;
        this.AlwaysSetPreferredSkyBottomLineBackendAutomatically = true;
        this.DisableWebGLInFirefox = true;
        this.DisableWebGLInSafariAndIOS = true;
        this.setPreferredSkyBottomLineBackendAutomatically();

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

    public setPreferredSkyBottomLineBackendAutomatically(numberOfGraphicalMeasures: number = -1): void {
        let vendor: string = "";
        let userAgent: string = "";
        if (typeof globalThis === "object") { // it looks like globalThis can be undefined and cause build issues in es2017 (e.g. Android API 28), see #1299
            vendor = globalThis.navigator?.vendor ?? "";
            userAgent = globalThis.navigator?.userAgent ?? "";
        }
        let alwaysUsePlain: boolean = false;
        if (this.DisableWebGLInSafariAndIOS && (/apple/i).test(vendor)) { // doesn't apply to Chrome on MacOS
            alwaysUsePlain = true;
        } else if (this.DisableWebGLInFirefox && userAgent.includes("Firefox")) {
            alwaysUsePlain = true;
        }
        // In Safari (/iOS) and Firefox, the plain version is always faster (currently, Safari 15).
        //   WebGL is faster for large scores in Chrome and Edge (both Chromium based). See #1158
        this.PreferredSkyBottomLineBatchCalculatorBackend = SkyBottomLineBatchCalculatorBackendType.Plain;
        if (!alwaysUsePlain) {
            if (numberOfGraphicalMeasures >= this.SkyBottomLineWebGLMinMeasures) {
                this.PreferredSkyBottomLineBatchCalculatorBackend = SkyBottomLineBatchCalculatorBackendType.WebGL;
            }
        }
    }

    /** Makes it so that all musical elements (including key/time signature)
     *  are colored with the given color by default,
     *  unless an element has a different color set (e.g. VoiceEntry.StemColor).
     */
    public applyDefaultColorMusic(color: string): void {
        this.DefaultColorMusic = color;
        this.DefaultColorNotehead = color;
        this.DefaultColorRest = color;
        this.DefaultColorStem = color;
        this.DefaultColorLabel = color;
        this.DefaultColorLyrics = color;
        this.DefaultColorTitle = color;
        this.LedgerLineColorDefault = color;
    }

    public addGraphicalNoteToNoteMap(note: Note, graphicalNote: GraphicalNote): void {
        note.NoteToGraphicalNoteObjectId = this.NoteToGraphicalNoteMapObjectCount;
        this.NoteToGraphicalNoteMap.setValue(note.NoteToGraphicalNoteObjectId, graphicalNote);
        this.NoteToGraphicalNoteMapObjectCount++;
    }

    /** Returns the GraphicalNote corresponding to (its) note. Also used by Cursor.GNotesUnderCursor().
     *  We don't want to save a GraphicalNote reference in Note, see Note.NoteToGraphicalNoteObjectId.
     */
    public GNote(note: Note): GraphicalNote {
        return GraphicalNote.FromNote(note, this);
    }

    /** This should be done before a new sheet is loaded, not each re-render (otherwise the map would end empty). */
    public clearMusicSheetObjects(): void {
        this.NoteToGraphicalNoteMap = new Dictionary<number, GraphicalNote>();
        this.NoteToGraphicalNoteMapObjectCount = 0;
    }

    public resetChordAccidentalTexts(chordAccidentalTexts: Dictionary<AccidentalEnum, string>, useChordAccidentalsUnicode: boolean): void {
        chordAccidentalTexts.setValue(AccidentalEnum.SHARP, useChordAccidentalsUnicode ? "♯" : "#");
        chordAccidentalTexts.setValue(AccidentalEnum.FLAT, useChordAccidentalsUnicode ? "♭" : "b");
        chordAccidentalTexts.setValue(AccidentalEnum.DOUBLEFLAT, useChordAccidentalsUnicode ? "𝄫" : "bb");
        chordAccidentalTexts.setValue(AccidentalEnum.DOUBLESHARP, useChordAccidentalsUnicode ? "𝄪" : "x");
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
        chordtexts.setValue(ChordSymbolEnum.halfdiminished, `m7${this.ChordAccidentalTexts.getValue(AccidentalEnum.FLAT)}5`);
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
        const sharp: string = this.ChordAccidentalTexts.getValue(AccidentalEnum.SHARP);
        const flat: string = this.ChordAccidentalTexts.getValue(AccidentalEnum.FLAT);
        // addChordName(alternateName, chordKindText, adds, alters, subtracts)
        this.addChordName("alt", "major", [`${sharp}5`, `${flat}9`, `${sharp}9`], [`${flat}5`], []);
        this.addChordName("7alt", "dominant", [`${sharp}5`, `${flat}9`, `${sharp}9`], [`${flat}5`], []);
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
        this.addChordName(`m7${flat}5`, "minorseventh", [], [`${flat}5`], []);
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
