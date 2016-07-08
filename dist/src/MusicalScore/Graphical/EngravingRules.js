"use strict";
var GraphicalMusicPage_1 = require("./GraphicalMusicPage");
//import {MusicSymbol} from "./MusicSymbol";
var logging_1 = require("../../Common/logging");
var EngravingRules = (function () {
    function EngravingRules() {
        this.noteDistances = [1.0, 1.0, 1.3, 1.6, 2.0, 2.5, 3.0, 4.0];
        this.noteDistancesScalingFactors = [1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0, 128.0];
        this.durationDistanceDict = {};
        this.durationScalingDistanceDict = {};
        this.samplingUnit = EngravingRules.unit * 3;
        this.sheetTitleHeight = 4.0;
        this.sheetSubtitleHeight = 2.0;
        this.sheetMinimumDistanceBetweenTitleAndSubtitle = 1.0;
        this.sheetComposerHeight = 2.0;
        this.sheetAuthorHeight = 2.0;
        this.pagePlacementEnum = GraphicalMusicPage_1.PagePlacementEnum.Down;
        this.pageHeight = 100001.0;
        this.pageTopMargin = 5.0;
        this.pageBottomMargin = 5.0;
        this.pageLeftMargin = 5.0;
        this.pageRightMargin = 5.0;
        this.titleTopDistance = 9.0;
        this.titleBottomDistance = 1.0;
        this.staffDistance = 7.0;
        this.betweenStaffDistance = 5.0;
        this.staffHeight = 4.0;
        this.betweenStaffLinesDistance = EngravingRules.unit;
        this.systemDistance = 10.0;
        this.systemLeftMargin = 0.0;
        this.systemRightMargin = 0.0;
        this.firstSystemMargin = 15.0;
        this.systemLabelsRightMargin = 2.0;
        this.systemComposerDistance = 2.0;
        this.instrumentLabelTextHeight = 2;
        this.minimumAllowedDistanceBetweenSystems = 3.0;
        this.lastSystemMaxScalingFactor = 1.4;
        this.beamWidth = EngravingRules.unit / 2.0;
        this.beamSpaceWidth = EngravingRules.unit / 3.0;
        this.beamForwardLength = 1.25 * EngravingRules.unit;
        this.clefLeftMargin = 0.5;
        this.clefRightMargin = 0.75;
        this.betweenKeySymbolsDistance = 0.2;
        this.keyRightMargin = 0.75;
        this.rhythmRightMargin = 1.25;
        this.inStaffClefScalingFactor = 0.8;
        this.distanceBetweenNaturalAndSymbolWhenCancelling = 0.4;
        this.noteHelperLinesOffset = 0.25;
        this.measureLeftMargin = 0.7;
        this.measureRightMargin = 0.0;
        this.distanceBetweenLastInstructionAndRepetitionBarline = 1.0;
        this.arpeggioDistance = 0.6;
        this.staccatoShorteningFactor = 2;
        this.idealStemLength = 3.0;
        this.stemNoteHeadBorderYOffset = 0.2;
        this.stemWidth = 0.13;
        this.stemMargin = 0.2;
        this.stemMinLength = 2.5;
        this.stemMaxLength = 4.5;
        this.beamSlopeMaxAngle = 10.0;
        this.stemMinAllowedDistanceBetweenNoteHeadAndBeamLine = 1.0;
        this.graceNoteScalingFactor = 0.6;
        this.graceNoteXOffset = 0.2;
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
        this.tempoChangeMeasureValitidy = 4;
        this.tempoContinousFactor = 0.7;
        this.staccatoScalingFactor = 0.8;
        this.betweenDotsDistance = 0.8;
        this.ornamentAccidentalScalingFactor = 0.65;
        this.chordSymbolTextHeight = 2.0;
        this.fingeringLabelFontHeight = 1.7;
        this.measureNumberLabelHeight = 1.5 * EngravingRules.unit;
        this.measureNumberLabelOffset = 2;
        this.tupletNumberLabelHeight = 1.5 * EngravingRules.unit;
        this.tupletNumberYOffset = 0.5;
        this.labelMarginBorderFactor = 0.1;
        this.tupletVerticalLineLength = 0.5;
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
        this.repetitionEndingLabelHeight = 2.0;
        this.repetitionEndingLabelXOffset = 0.5;
        this.repetitionEndingLabelYOffset = 0.3;
        this.repetitionEndingLineYLowerOffset = 0.5;
        this.repetitionEndingLineYUpperOffset = 0.3;
        this.lyricsHeight = 2.0;
        this.verticalBetweenLyricsDistance = 0.5;
        this.betweenSyllabelMaximumDistance = 10.0;
        this.minimumDistanceBetweenDashes = 5.0;
        this.instantaniousTempoTextHeight = 2.3;
        this.continuousDynamicTextHeight = 2.3;
        this.moodTextHeight = 2.3;
        this.unknownTextHeight = 2.0;
        this.continuousTempoTextHeight = 2.3;
        this.staffLineWidth = 0.12;
        this.ledgerLineWidth = 0.12;
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
        this.minimumStaffLineDistance = 1.0;
        this.minimumCrossedBeamDifferenceMargin = 0.0001;
        this.displacedNoteMargin = 0.1;
        this.minNoteDistance = 2.0;
        this.subMeasureXSpacingThreshold = 35;
        this.measureDynamicsMaxScalingFactor = 2.5;
        this.populateDictionaries();
        try {
            this.maxInstructionsConstValue = this.ClefLeftMargin + this.ClefRightMargin + this.KeyRightMargin + this.RhythmRightMargin + 11;
        }
        catch (ex) {
            logging_1.Logging.log("EngravingRules()", ex);
        }
    }
    Object.defineProperty(EngravingRules, "Rules", {
        get: function () {
            return EngravingRules.rules !== undefined ? EngravingRules.rules : (EngravingRules.rules = new EngravingRules());
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SamplingUnit", {
        get: function () {
            return this.samplingUnit;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SheetTitleHeight", {
        get: function () {
            return this.sheetTitleHeight;
        },
        set: function (value) {
            this.sheetTitleHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SheetSubtitleHeight", {
        get: function () {
            return this.sheetSubtitleHeight;
        },
        set: function (value) {
            this.sheetSubtitleHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SheetMinimumDistanceBetweenTitleAndSubtitle", {
        get: function () {
            return this.sheetMinimumDistanceBetweenTitleAndSubtitle;
        },
        set: function (value) {
            this.sheetMinimumDistanceBetweenTitleAndSubtitle = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SheetComposerHeight", {
        get: function () {
            return this.sheetComposerHeight;
        },
        set: function (value) {
            this.sheetComposerHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SheetAuthorHeight", {
        get: function () {
            return this.sheetAuthorHeight;
        },
        set: function (value) {
            this.sheetAuthorHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "PagePlacement", {
        get: function () {
            return this.pagePlacementEnum;
        },
        set: function (value) {
            this.pagePlacementEnum = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "PageHeight", {
        get: function () {
            return this.pageHeight;
        },
        set: function (value) {
            this.pageHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "PageTopMargin", {
        get: function () {
            return this.pageTopMargin;
        },
        set: function (value) {
            this.pageTopMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "PageBottomMargin", {
        get: function () {
            return this.pageBottomMargin;
        },
        set: function (value) {
            this.pageBottomMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "PageLeftMargin", {
        get: function () {
            return this.pageLeftMargin;
        },
        set: function (value) {
            this.pageLeftMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "PageRightMargin", {
        get: function () {
            return this.pageRightMargin;
        },
        set: function (value) {
            this.pageRightMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TitleTopDistance", {
        get: function () {
            return this.titleTopDistance;
        },
        set: function (value) {
            this.titleTopDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TitleBottomDistance", {
        get: function () {
            return this.titleBottomDistance;
        },
        set: function (value) {
            this.titleBottomDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SystemComposerDistance", {
        get: function () {
            return this.systemComposerDistance;
        },
        set: function (value) {
            this.systemComposerDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "InstrumentLabelTextHeight", {
        get: function () {
            return this.instrumentLabelTextHeight;
        },
        set: function (value) {
            this.instrumentLabelTextHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SystemDistance", {
        get: function () {
            return this.systemDistance;
        },
        set: function (value) {
            this.systemDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SystemLeftMargin", {
        get: function () {
            return this.systemLeftMargin;
        },
        set: function (value) {
            this.systemLeftMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SystemRightMargin", {
        get: function () {
            return this.systemRightMargin;
        },
        set: function (value) {
            this.systemRightMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "FirstSystemMargin", {
        get: function () {
            return this.firstSystemMargin;
        },
        set: function (value) {
            this.firstSystemMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SystemLabelsRightMargin", {
        get: function () {
            return this.systemLabelsRightMargin;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "MinimumAllowedDistanceBetweenSystems", {
        get: function () {
            return this.minimumAllowedDistanceBetweenSystems;
        },
        set: function (value) {
            this.minimumAllowedDistanceBetweenSystems = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "LastSystemMaxScalingFactor", {
        get: function () {
            return this.lastSystemMaxScalingFactor;
        },
        set: function (value) {
            this.lastSystemMaxScalingFactor = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "StaffDistance", {
        get: function () {
            return this.staffDistance;
        },
        set: function (value) {
            this.staffDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "BetweenStaffDistance", {
        get: function () {
            return this.betweenStaffDistance;
        },
        set: function (value) {
            this.betweenStaffDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "StaffHeight", {
        get: function () {
            return this.staffHeight;
        },
        set: function (value) {
            this.staffHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "BetweenStaffLinesDistance", {
        get: function () {
            return this.betweenStaffLinesDistance;
        },
        set: function (value) {
            this.betweenStaffLinesDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "BeamWidth", {
        get: function () {
            return this.beamWidth;
        },
        set: function (value) {
            this.beamWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "BeamSpaceWidth", {
        get: function () {
            return this.beamSpaceWidth;
        },
        set: function (value) {
            this.beamSpaceWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "BeamForwardLength", {
        get: function () {
            return this.beamForwardLength;
        },
        set: function (value) {
            this.beamForwardLength = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "BetweenKeySymbolsDistance", {
        get: function () {
            return this.betweenKeySymbolsDistance;
        },
        set: function (value) {
            this.betweenKeySymbolsDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "ClefLeftMargin", {
        get: function () {
            return this.clefLeftMargin;
        },
        set: function (value) {
            this.clefLeftMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "ClefRightMargin", {
        get: function () {
            return this.clefRightMargin;
        },
        set: function (value) {
            this.clefRightMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "KeyRightMargin", {
        get: function () {
            return this.keyRightMargin;
        },
        set: function (value) {
            this.keyRightMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "RhythmRightMargin", {
        get: function () {
            return this.rhythmRightMargin;
        },
        set: function (value) {
            this.rhythmRightMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "InStaffClefScalingFactor", {
        get: function () {
            return this.inStaffClefScalingFactor;
        },
        set: function (value) {
            this.inStaffClefScalingFactor = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "DistanceBetweenNaturalAndSymbolWhenCancelling", {
        get: function () {
            return this.distanceBetweenNaturalAndSymbolWhenCancelling;
        },
        set: function (value) {
            this.distanceBetweenNaturalAndSymbolWhenCancelling = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "NoteHelperLinesOffset", {
        get: function () {
            return this.noteHelperLinesOffset;
        },
        set: function (value) {
            this.noteHelperLinesOffset = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "MeasureLeftMargin", {
        get: function () {
            return this.measureLeftMargin;
        },
        set: function (value) {
            this.measureLeftMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "MeasureRightMargin", {
        get: function () {
            return this.measureRightMargin;
        },
        set: function (value) {
            this.measureRightMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "DistanceBetweenLastInstructionAndRepetitionBarline", {
        get: function () {
            return this.distanceBetweenLastInstructionAndRepetitionBarline;
        },
        set: function (value) {
            this.distanceBetweenLastInstructionAndRepetitionBarline = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "ArpeggioDistance", {
        get: function () {
            return this.arpeggioDistance;
        },
        set: function (value) {
            this.arpeggioDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "StaccatoShorteningFactor", {
        get: function () {
            return this.staccatoShorteningFactor;
        },
        set: function (value) {
            this.staccatoShorteningFactor = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "IdealStemLength", {
        get: function () {
            return this.idealStemLength;
        },
        set: function (value) {
            this.idealStemLength = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "StemNoteHeadBorderYOffset", {
        get: function () {
            return this.stemNoteHeadBorderYOffset;
        },
        set: function (value) {
            this.stemNoteHeadBorderYOffset = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "StemWidth", {
        get: function () {
            return this.stemWidth;
        },
        set: function (value) {
            this.stemWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "StemMargin", {
        get: function () {
            return this.stemMargin;
        },
        set: function (value) {
            this.stemMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "StemMinLength", {
        get: function () {
            return this.stemMinLength;
        },
        set: function (value) {
            this.stemMinLength = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "StemMaxLength", {
        get: function () {
            return this.stemMaxLength;
        },
        set: function (value) {
            this.stemMaxLength = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "BeamSlopeMaxAngle", {
        get: function () {
            return this.beamSlopeMaxAngle;
        },
        set: function (value) {
            this.beamSlopeMaxAngle = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "StemMinAllowedDistanceBetweenNoteHeadAndBeamLine", {
        get: function () {
            return this.stemMinAllowedDistanceBetweenNoteHeadAndBeamLine;
        },
        set: function (value) {
            this.stemMinAllowedDistanceBetweenNoteHeadAndBeamLine = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "GraceNoteScalingFactor", {
        get: function () {
            return this.graceNoteScalingFactor;
        },
        set: function (value) {
            this.graceNoteScalingFactor = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "GraceNoteXOffset", {
        get: function () {
            return this.graceNoteXOffset;
        },
        set: function (value) {
            this.graceNoteXOffset = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "WedgeOpeningLength", {
        get: function () {
            return this.wedgeOpeningLength;
        },
        set: function (value) {
            this.wedgeOpeningLength = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "WedgeMeasureEndOpeningLength", {
        get: function () {
            return this.wedgeMeasureEndOpeningLength;
        },
        set: function (value) {
            this.wedgeMeasureEndOpeningLength = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "WedgeMeasureBeginOpeningLength", {
        get: function () {
            return this.wedgeMeasureBeginOpeningLength;
        },
        set: function (value) {
            this.wedgeMeasureBeginOpeningLength = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "WedgePlacementAboveY", {
        get: function () {
            return this.wedgePlacementAboveY;
        },
        set: function (value) {
            this.wedgePlacementAboveY = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "WedgePlacementBelowY", {
        get: function () {
            return this.wedgePlacementBelowY;
        },
        set: function (value) {
            this.wedgePlacementBelowY = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "WedgeHorizontalMargin", {
        get: function () {
            return this.wedgeHorizontalMargin;
        },
        set: function (value) {
            this.wedgeHorizontalMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "WedgeVerticalMargin", {
        get: function () {
            return this.wedgeVerticalMargin;
        },
        set: function (value) {
            this.wedgeVerticalMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "DistanceOffsetBetweenTwoHorizontallyCrossedWedges", {
        get: function () {
            return this.distanceOffsetBetweenTwoHorizontallyCrossedWedges;
        },
        set: function (value) {
            this.distanceOffsetBetweenTwoHorizontallyCrossedWedges = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "WedgeMinLength", {
        get: function () {
            return this.wedgeMinLength;
        },
        set: function (value) {
            this.wedgeMinLength = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "DistanceBetweenAdjacentDynamics", {
        get: function () {
            return this.distanceBetweenAdjacentDynamics;
        },
        set: function (value) {
            this.distanceBetweenAdjacentDynamics = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TempoChangeMeasureValitidy", {
        get: function () {
            return this.tempoChangeMeasureValitidy;
        },
        set: function (value) {
            this.tempoChangeMeasureValitidy = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TempoContinousFactor", {
        get: function () {
            return this.tempoContinousFactor;
        },
        set: function (value) {
            this.tempoContinousFactor = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "StaccatoScalingFactor", {
        get: function () {
            return this.staccatoScalingFactor;
        },
        set: function (value) {
            this.staccatoScalingFactor = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "BetweenDotsDistance", {
        get: function () {
            return this.betweenDotsDistance;
        },
        set: function (value) {
            this.betweenDotsDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "OrnamentAccidentalScalingFactor", {
        get: function () {
            return this.ornamentAccidentalScalingFactor;
        },
        set: function (value) {
            this.ornamentAccidentalScalingFactor = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "ChordSymbolTextHeight", {
        get: function () {
            return this.chordSymbolTextHeight;
        },
        set: function (value) {
            this.chordSymbolTextHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "FingeringLabelFontHeight", {
        get: function () {
            return this.fingeringLabelFontHeight;
        },
        set: function (value) {
            this.fingeringLabelFontHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "MeasureNumberLabelHeight", {
        get: function () {
            return this.measureNumberLabelHeight;
        },
        set: function (value) {
            this.measureNumberLabelHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "MeasureNumberLabelOffset", {
        get: function () {
            return this.measureNumberLabelOffset;
        },
        set: function (value) {
            this.measureNumberLabelOffset = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TupletNumberLabelHeight", {
        get: function () {
            return this.tupletNumberLabelHeight;
        },
        set: function (value) {
            this.tupletNumberLabelHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TupletNumberYOffset", {
        get: function () {
            return this.tupletNumberYOffset;
        },
        set: function (value) {
            this.tupletNumberYOffset = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "LabelMarginBorderFactor", {
        get: function () {
            return this.labelMarginBorderFactor;
        },
        set: function (value) {
            this.labelMarginBorderFactor = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TupletVerticalLineLength", {
        get: function () {
            return this.tupletVerticalLineLength;
        },
        set: function (value) {
            this.tupletVerticalLineLength = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "RepetitionEndingLabelHeight", {
        get: function () {
            return this.repetitionEndingLabelHeight;
        },
        set: function (value) {
            this.repetitionEndingLabelHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "RepetitionEndingLabelXOffset", {
        get: function () {
            return this.repetitionEndingLabelXOffset;
        },
        set: function (value) {
            this.repetitionEndingLabelXOffset = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "RepetitionEndingLabelYOffset", {
        get: function () {
            return this.repetitionEndingLabelYOffset;
        },
        set: function (value) {
            this.repetitionEndingLabelYOffset = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "RepetitionEndingLineYLowerOffset", {
        get: function () {
            return this.repetitionEndingLineYLowerOffset;
        },
        set: function (value) {
            this.repetitionEndingLineYLowerOffset = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "RepetitionEndingLineYUpperOffset", {
        get: function () {
            return this.repetitionEndingLineYUpperOffset;
        },
        set: function (value) {
            this.repetitionEndingLineYUpperOffset = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "LyricsHeight", {
        get: function () {
            return this.lyricsHeight;
        },
        set: function (value) {
            this.lyricsHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "VerticalBetweenLyricsDistance", {
        get: function () {
            return this.verticalBetweenLyricsDistance;
        },
        set: function (value) {
            this.verticalBetweenLyricsDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "BetweenSyllabelMaximumDistance", {
        get: function () {
            return this.betweenSyllabelMaximumDistance;
        },
        set: function (value) {
            this.betweenSyllabelMaximumDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "MinimumDistanceBetweenDashes", {
        get: function () {
            return this.minimumDistanceBetweenDashes;
        },
        set: function (value) {
            this.minimumDistanceBetweenDashes = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "BezierCurveStepSize", {
        get: function () {
            return this.bezierCurveStepSize;
        },
        set: function (value) {
            this.bezierCurveStepSize = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TPow3", {
        get: function () {
            return this.tPower3;
        },
        set: function (value) {
            this.tPower3 = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "OneMinusTPow3", {
        get: function () {
            return this.oneMinusTPower3;
        },
        set: function (value) {
            this.oneMinusTPower3 = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "BezierFactorOne", {
        get: function () {
            return this.factorOne;
        },
        set: function (value) {
            this.factorOne = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "BezierFactorTwo", {
        get: function () {
            return this.factorTwo;
        },
        set: function (value) {
            this.factorTwo = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TieGhostObjectWidth", {
        get: function () {
            return this.tieGhostObjectWidth;
        },
        set: function (value) {
            this.tieGhostObjectWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TieYPositionOffsetFactor", {
        get: function () {
            return this.tieYPositionOffsetFactor;
        },
        set: function (value) {
            this.tieYPositionOffsetFactor = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "MinimumNeededXspaceForTieGhostObject", {
        get: function () {
            return this.minimumNeededXspaceForTieGhostObject;
        },
        set: function (value) {
            this.minimumNeededXspaceForTieGhostObject = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TieHeightMinimum", {
        get: function () {
            return this.tieHeightMinimum;
        },
        set: function (value) {
            this.tieHeightMinimum = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TieHeightMaximum", {
        get: function () {
            return this.tieHeightMaximum;
        },
        set: function (value) {
            this.tieHeightMaximum = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TieHeightInterpolationK", {
        get: function () {
            return this.tieHeightInterpolationK;
        },
        set: function (value) {
            this.tieHeightInterpolationK = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TieHeightInterpolationD", {
        get: function () {
            return this.tieHeightInterpolationD;
        },
        set: function (value) {
            this.tieHeightInterpolationD = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SlurNoteHeadYOffset", {
        get: function () {
            return this.slurNoteHeadYOffset;
        },
        set: function (value) {
            this.slurNoteHeadYOffset = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SlurStemXOffset", {
        get: function () {
            return this.slurStemXOffset;
        },
        set: function (value) {
            this.slurStemXOffset = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SlurSlopeMaxAngle", {
        get: function () {
            return this.slurSlopeMaxAngle;
        },
        set: function (value) {
            this.slurSlopeMaxAngle = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SlurTangentMinAngle", {
        get: function () {
            return this.slurTangentMinAngle;
        },
        set: function (value) {
            this.slurTangentMinAngle = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SlurTangentMaxAngle", {
        get: function () {
            return this.slurTangentMaxAngle;
        },
        set: function (value) {
            this.slurTangentMaxAngle = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SlursStartingAtSameStaffEntryYOffset", {
        get: function () {
            return this.slursStartingAtSameStaffEntryYOffset;
        },
        set: function (value) {
            this.slursStartingAtSameStaffEntryYOffset = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "InstantaniousTempoTextHeight", {
        get: function () {
            return this.instantaniousTempoTextHeight;
        },
        set: function (value) {
            this.instantaniousTempoTextHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "ContinuousDynamicTextHeight", {
        get: function () {
            return this.continuousDynamicTextHeight;
        },
        set: function (value) {
            this.continuousDynamicTextHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "MoodTextHeight", {
        get: function () {
            return this.moodTextHeight;
        },
        set: function (value) {
            this.moodTextHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "ContinuousTempoTextHeight", {
        get: function () {
            return this.continuousTempoTextHeight;
        },
        set: function (value) {
            this.continuousTempoTextHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "UnknownTextHeight", {
        get: function () {
            return this.unknownTextHeight;
        },
        set: function (value) {
            this.unknownTextHeight = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "StaffLineWidth", {
        get: function () {
            return this.staffLineWidth;
        },
        set: function (value) {
            this.staffLineWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "LedgerLineWidth", {
        get: function () {
            return this.ledgerLineWidth;
        },
        set: function (value) {
            this.ledgerLineWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "WedgeLineWidth", {
        get: function () {
            return this.wedgeLineWidth;
        },
        set: function (value) {
            this.wedgeLineWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "TupletLineWidth", {
        get: function () {
            return this.tupletLineWidth;
        },
        set: function (value) {
            this.tupletLineWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "LyricUnderscoreLineWidth", {
        get: function () {
            return this.lyricUnderscoreLineWidth;
        },
        set: function (value) {
            this.lyricUnderscoreLineWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SystemThinLineWidth", {
        get: function () {
            return this.systemThinLineWidth;
        },
        set: function (value) {
            this.systemThinLineWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SystemBoldLineWidth", {
        get: function () {
            return this.systemBoldLineWidth;
        },
        set: function (value) {
            this.systemBoldLineWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SystemRepetitionEndingLineWidth", {
        get: function () {
            return this.systemRepetitionEndingLineWidth;
        },
        set: function (value) {
            this.systemRepetitionEndingLineWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SystemDotWidth", {
        get: function () {
            return this.systemDotWidth;
        },
        set: function (value) {
            this.systemDotWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "DistanceBetweenVerticalSystemLines", {
        get: function () {
            return this.distanceBetweenVerticalSystemLines;
        },
        set: function (value) {
            this.distanceBetweenVerticalSystemLines = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "DistanceBetweenDotAndLine", {
        get: function () {
            return this.distanceBetweenDotAndLine;
        },
        set: function (value) {
            this.distanceBetweenDotAndLine = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "OctaveShiftLineWidth", {
        get: function () {
            return this.octaveShiftLineWidth;
        },
        set: function (value) {
            this.octaveShiftLineWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "OctaveShiftVerticalLineLength", {
        get: function () {
            return this.octaveShiftVerticalLineLength;
        },
        set: function (value) {
            this.octaveShiftVerticalLineLength = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "GraceLineWidth", {
        get: function () {
            return this.graceLineWidth;
        },
        set: function (value) {
            this.graceLineWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "MinimumStaffLineDistance", {
        get: function () {
            return this.minimumStaffLineDistance;
        },
        set: function (value) {
            this.minimumStaffLineDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "MinimumCrossedBeamDifferenceMargin", {
        get: function () {
            return this.minimumCrossedBeamDifferenceMargin;
        },
        set: function (value) {
            this.minimumCrossedBeamDifferenceMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "DisplacedNoteMargin", {
        get: function () {
            return this.displacedNoteMargin;
        },
        set: function (value) {
            this.displacedNoteMargin = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "MinNoteDistance", {
        get: function () {
            return this.minNoteDistance;
        },
        set: function (value) {
            this.minNoteDistance = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "SubMeasureXSpacingThreshold", {
        get: function () {
            return this.subMeasureXSpacingThreshold;
        },
        set: function (value) {
            this.subMeasureXSpacingThreshold = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "MeasureDynamicsMaxScalingFactor", {
        get: function () {
            return this.measureDynamicsMaxScalingFactor;
        },
        set: function (value) {
            this.measureDynamicsMaxScalingFactor = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "MaxInstructionsConstValue", {
        get: function () {
            return this.maxInstructionsConstValue;
        },
        set: function (value) {
            this.maxInstructionsConstValue = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "NoteDistances", {
        get: function () {
            return this.noteDistances;
        },
        set: function (value) {
            this.noteDistances = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "NoteDistancesScalingFactors", {
        get: function () {
            return this.noteDistancesScalingFactors;
        },
        set: function (value) {
            this.noteDistancesScalingFactors = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "DurationDistanceDict", {
        get: function () {
            return this.durationDistanceDict;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EngravingRules.prototype, "DurationScalingDistanceDict", {
        get: function () {
            return this.durationScalingDistanceDict;
        },
        enumerable: true,
        configurable: true
    });
    EngravingRules.prototype.populateDictionaries = function () {
        for (var i = 0; i < this.noteDistances.length; i++) {
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
            }
        }
    };
    EngravingRules.prototype.calculateCurveParametersArrays = function () {
        this.tPower3 = new Array(this.bezierCurveStepSize);
        this.oneMinusTPower3 = new Array(this.bezierCurveStepSize);
        this.factorOne = new Array(this.bezierCurveStepSize);
        this.factorTwo = new Array(this.bezierCurveStepSize);
        for (var i = 0; i < this.bezierCurveStepSize; i++) {
            var t = i / this.bezierCurveStepSize;
            this.tPower3[i] = Math.pow(t, 3);
            this.oneMinusTPower3[i] = Math.pow((1 - t), 3);
            this.factorOne[i] = 3 * Math.pow((1 - t), 2) * t;
            this.factorTwo[i] = 3 * (1 - t) * Math.pow(t, 2);
        }
    };
    EngravingRules.unit = 1.0;
    return EngravingRules;
}());
exports.EngravingRules = EngravingRules;
