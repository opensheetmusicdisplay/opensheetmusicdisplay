"use strict";
var GraphicalMusicSheet_1 = require("./GraphicalMusicSheet");
var fraction_1 = require("../../Common/DataObjects/fraction");
var Note_1 = require("../VoiceData/Note");
var ClefInstruction_1 = require("../VoiceData/Instructions/ClefInstruction");
var octaveShift_1 = require("../VoiceData/Expressions/ContinuousExpressions/octaveShift");
var VoiceEntry_1 = require("../VoiceData/VoiceEntry");
var MusicSystemBuilder_1 = require("./MusicSystemBuilder");
var PointF2D_1 = require("../../Common/DataObjects/PointF2D");
var SourceStaffEntry_1 = require("../VoiceData/SourceStaffEntry");
var GraphicalLabel_1 = require("./GraphicalLabel");
var TextAlignment_1 = require("../../Common/Enums/TextAlignment");
var KeyInstruction_1 = require("../VoiceData/Instructions/KeyInstruction");
var ClefInstruction_2 = require("../VoiceData/Instructions/ClefInstruction");
var LinkedVoice_1 = require("../VoiceData/LinkedVoice");
var BoundingBox_1 = require("./BoundingBox");
var OctaveShiftParams_1 = require("./OctaveShiftParams");
var AccidentalCalculator_1 = require("./AccidentalCalculator");
var ClefInstruction_3 = require("../VoiceData/Instructions/ClefInstruction");
var logging_1 = require("../../Common/logging");
var Dictionary_1 = require("typescript-collections/dist/lib/Dictionary");
var collectionUtil_1 = require("../../Util/collectionUtil");
var MusicSheetCalculator = (function () {
    function MusicSheetCalculator(symbolFactory) {
        this.staffEntriesWithGraphicalTies = [];
        this.staffEntriesWithOrnaments = [];
        this.staffEntriesWithChordSymbols = [];
        this.staffLinesWithLyricWords = [];
        this.staffLinesWithGraphicalExpressions = [];
        this.symbolFactory = symbolFactory;
    }
    Object.defineProperty(MusicSheetCalculator, "TextMeasurer", {
        get: function () {
            return MusicSheetCalculator.textMeasurer;
        },
        set: function (value) {
            MusicSheetCalculator.textMeasurer = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheetCalculator.prototype, "leadSheet", {
        get: function () {
            return this.graphicalMusicSheet.LeadSheet;
        },
        enumerable: true,
        configurable: true
    });
    MusicSheetCalculator.addTieToTieTimestampsDict = function (tieTimestampListDict, note) {
        note.NoteTie.initializeBoolList();
        var tieTimestampList = [];
        for (var m = 0; m < note.NoteTie.Fractions.length; m++) {
            var musicTimestamp = void 0;
            if (m === 0) {
                musicTimestamp = fraction_1.Fraction.plus(note.calculateNoteLengthWithoutTie(), note.getAbsoluteTimestamp());
            }
            else {
                musicTimestamp = fraction_1.Fraction.plus(tieTimestampList[m - 1], note.NoteTie.Fractions[m - 1]);
            }
            tieTimestampList.push(musicTimestamp);
        }
        tieTimestampListDict.setValue(note.NoteTie, tieTimestampList);
    };
    MusicSheetCalculator.setMeasuresMinStaffEntriesWidth = function (measures, minimumStaffEntriesWidth) {
        for (var idx = 0, len = measures.length; idx < len; ++idx) {
            var measure = measures[idx];
            measure.minimumStaffEntriesWidth = minimumStaffEntriesWidth;
        }
    };
    MusicSheetCalculator.prototype.initialize = function (graphicalMusicSheet) {
        this.graphicalMusicSheet = graphicalMusicSheet;
        this.rules = graphicalMusicSheet.ParentMusicSheet.rules;
        this.prepareGraphicalMusicSheet();
        this.calculate();
    };
    MusicSheetCalculator.prototype.prepareGraphicalMusicSheet = function () {
        //this.graphicalMusicSheet.SystemImages.length = 0;
        var musicSheet = this.graphicalMusicSheet.ParentMusicSheet;
        this.staffEntriesWithGraphicalTies = [];
        this.staffEntriesWithOrnaments = [];
        this.staffEntriesWithChordSymbols = [];
        this.staffLinesWithLyricWords = [];
        this.staffLinesWithGraphicalExpressions = [];
        this.graphicalMusicSheet.Initialize();
        var measureList = this.graphicalMusicSheet.MeasureList;
        var accidentalCalculators = this.createAccidentalCalculators();
        var activeClefs = this.graphicalMusicSheet.initializeActiveClefs();
        var lyricWords = [];
        var completeNumberOfStaves = musicSheet.getCompleteNumberOfStaves();
        var openOctaveShifts = [];
        var tieTimestampListDictList = [];
        for (var i = 0; i < completeNumberOfStaves; i++) {
            var tieTimestampListDict = new Dictionary_1.default();
            tieTimestampListDictList.push(tieTimestampListDict);
            openOctaveShifts.push(undefined);
        }
        for (var idx = 0, len = musicSheet.SourceMeasures.length; idx < len; ++idx) {
            var sourceMeasure = musicSheet.SourceMeasures[idx];
            var graphicalMeasures = this.createGraphicalMeasuresForSourceMeasure(sourceMeasure, accidentalCalculators, lyricWords, tieTimestampListDictList, openOctaveShifts, activeClefs);
            measureList.push(graphicalMeasures);
        }
        this.handleStaffEntries();
        this.calculateVerticalContainersList();
        this.setIndecesToVerticalGraphicalContainers();
    };
    MusicSheetCalculator.prototype.calculate = function () {
        this.clearSystemsAndMeasures();
        this.clearRecreatedObjects();
        this.createGraphicalTies();
        this.calculateSheetLabelBoundingBoxes();
        this.calculateXLayout(this.graphicalMusicSheet, this.maxInstrNameLabelLength());
        this.graphicalMusicSheet.MusicPages.length = 0;
        this.calculateMusicSystems();
        this.graphicalMusicSheet.MusicPages[0].PositionAndShape.BorderMarginBottom += 9;
        GraphicalMusicSheet_1.GraphicalMusicSheet.transformRelativeToAbsolutePosition(this.graphicalMusicSheet);
    };
    MusicSheetCalculator.prototype.calculateXLayout = function (graphicalMusicSheet, maxInstrNameLabelLength) {
        var minLength = 0;
        var maxInstructionsLength = this.rules.MaxInstructionsConstValue;
        if (this.graphicalMusicSheet.MeasureList.length > 0) {
            var measures = this.graphicalMusicSheet.MeasureList[0];
            var minimumStaffEntriesWidth = this.calculateMeasureXLayout(measures);
            MusicSheetCalculator.setMeasuresMinStaffEntriesWidth(measures, minimumStaffEntriesWidth);
            minLength = minimumStaffEntriesWidth * 1.2 + maxInstrNameLabelLength + maxInstructionsLength;
            for (var i = 1; i < this.graphicalMusicSheet.MeasureList.length; i++) {
                measures = this.graphicalMusicSheet.MeasureList[i];
                minimumStaffEntriesWidth = this.calculateMeasureXLayout(measures);
                MusicSheetCalculator.setMeasuresMinStaffEntriesWidth(measures, minimumStaffEntriesWidth);
                minLength = Math.max(minLength, minimumStaffEntriesWidth * 1.2 + maxInstructionsLength);
            }
        }
        this.graphicalMusicSheet.MinAllowedSystemWidth = minLength;
    };
    MusicSheetCalculator.prototype.calculateMeasureXLayout = function (measures) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.calculateSystemYLayout = function () {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.initStaffMeasuresCreation = function () {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.handleBeam = function (graphicalNote, beam, openBeams) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.createGraphicalTieNote = function (beams, activeClef, octaveShiftValue, graphicalStaffEntry, duration, numberOfDots, openTie, isLastTieNote) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.handleVoiceEntryLyrics = function (lyricsEntries, voiceEntry, graphicalStaffEntry, openLyricWords) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.handleVoiceEntryOrnaments = function (ornamentContainer, voiceEntry, graphicalStaffEntry) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.handleVoiceEntryArticulations = function (articulations, voiceEntry, graphicalStaffEntry) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.handleTuplet = function (graphicalNote, tuplet, openTuplets) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.layoutVoiceEntry = function (voiceEntry, graphicalNotes, graphicalStaffEntry, hasPitchedNote, isGraceStaffEntry) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.layoutStaffEntry = function (graphicalStaffEntry) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.handleTie = function (tie, startGraphicalStaffEntry, staffIndex, measureIndex) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.updateStaffLineBorders = function (staffLine) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.calculateMeasureNumberPlacement = function (musicSystem) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.layoutGraphicalTie = function (tie, tieIsAtSystemBreak) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.calculateSingleStaffLineLyricsPosition = function (staffLine, lyricVersesNumber) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.calculateSingleOctaveShift = function (sourceMeasure, multiExpression, measureIndex, staffIndex) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.calculateWordRepetitionInstruction = function (repetitionInstruction, measureIndex) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.calculateMoodAndUnknownExpression = function (multiExpression, measureIndex, staffIndex) {
        throw new Error("abstract, not implemented");
    };
    MusicSheetCalculator.prototype.clearRecreatedObjects = function () {
        logging_1.Logging.log("clearRecreatedObjects not implemented");
    };
    MusicSheetCalculator.prototype.handleStaffEntryLink = function (graphicalStaffEntry, staffEntryLinks) {
        logging_1.Logging.log("handleStaffEntryLink not implemented");
    };
    MusicSheetCalculator.prototype.calculateMusicSystems = function () {
        if (this.graphicalMusicSheet.MeasureList === undefined) {
            return;
        }
        var allMeasures = this.graphicalMusicSheet.MeasureList;
        if (allMeasures === undefined) {
            return;
        }
        var visibleMeasureList = [];
        for (var idx = 0, len = allMeasures.length; idx < len; ++idx) {
            var staffMeasures = allMeasures[idx];
            var visibleStaffMeasures = [];
            for (var idx2 = 0, len2 = staffMeasures.length; idx2 < len2; ++idx2) {
                var staffMeasure = allMeasures[idx][idx2];
                if (staffMeasure.isVisible()) {
                    visibleStaffMeasures.push(staffMeasure);
                }
            }
            visibleMeasureList.push(visibleStaffMeasures);
        }
        var numberOfStaffLines = 0;
        for (var idx = 0, len = visibleMeasureList.length; idx < len; ++idx) {
            var gmlist = visibleMeasureList[idx];
            numberOfStaffLines = Math.max(gmlist.length, numberOfStaffLines);
            break;
        }
        if (numberOfStaffLines === 0) {
            return;
        }
        var musicSystemBuilder = new MusicSystemBuilder_1.MusicSystemBuilder();
        musicSystemBuilder.initialize(this.graphicalMusicSheet, visibleMeasureList, numberOfStaffLines, this.symbolFactory);
        musicSystemBuilder.buildMusicSystems();
        this.checkMeasuresForWholeRestNotes();
        if (!this.leadSheet) {
            this.calculateBeams();
            this.optimizeRestPlacement();
            this.calculateStaffEntryArticulationMarks();
            this.calculateTieCurves();
        }
        this.calculateSkyBottomLines();
        this.calculateTupletNumbers();
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2 = 0, len2 = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                var musicSystem = graphicalMusicPage.MusicSystems[idx2];
                this.calculateMeasureNumberPlacement(musicSystem);
            }
        }
        if (!this.leadSheet) {
            this.calculateSlurs();
        }
        if (!this.leadSheet) {
            this.calculateOrnaments();
        }
        this.updateSkyBottomLines();
        this.calculateChordSymbols();
        if (!this.leadSheet) {
            this.calculateDynamicExpressions();
            this.optimizeStaffLineDynamicExpressionsPositions();
            this.calculateMoodAndUnknownExpressions();
            this.calculateOctaveShifts();
            this.calculateWordRepetitionInstructions();
        }
        this.calculateRepetitionEndings();
        if (!this.leadSheet) {
            this.calculateTempoExpressions();
        }
        this.calculateLyricsPosition();
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2 = 0, len2 = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                var musicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (var idx3 = 0, len3 = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    var staffLine = musicSystem.StaffLines[idx3];
                    this.updateStaffLineBorders(staffLine);
                }
            }
        }
        this.calculateComments();
        this.calculateSystemYLayout();
        this.calculateMarkedAreas();
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2 = 0, len2 = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                var musicSystem = graphicalMusicPage.MusicSystems[idx2];
                musicSystem.setMusicSystemLabelsYPosition();
                if (!this.leadSheet) {
                    musicSystem.setYPositionsToVerticalLineObjectsAndCreateLines(this.rules);
                    musicSystem.createSystemLeftLine(this.rules.SystemThinLineWidth, this.rules.SystemLabelsRightMargin);
                    musicSystem.createInstrumentBrackets(this.graphicalMusicSheet.ParentMusicSheet.Instruments, this.rules.StaffHeight);
                    musicSystem.createGroupBrackets(this.graphicalMusicSheet.ParentMusicSheet.InstrumentalGroups, this.rules.StaffHeight, 0);
                    musicSystem.alignBeginInstructions();
                }
                else if (musicSystem === musicSystem.Parent.MusicSystems[0]) {
                    musicSystem.createSystemLeftLine(this.rules.SystemThinLineWidth, this.rules.SystemLabelsRightMargin);
                }
                musicSystem.calculateBorders(this.rules);
            }
            var distance = graphicalMusicPage.MusicSystems[0].PositionAndShape.BorderTop;
            for (var idx2 = 0, len2 = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                var musicSystem = graphicalMusicPage.MusicSystems[idx2];
                // let newPosition: PointF2D = new PointF2D(musicSystem.PositionAndShape.RelativePosition.x,
                // musicSystem.PositionAndShape.RelativePosition.y - distance);
                musicSystem.PositionAndShape.RelativePosition =
                    new PointF2D_1.PointF2D(musicSystem.PositionAndShape.RelativePosition.x, musicSystem.PositionAndShape.RelativePosition.y - distance);
            }
            for (var idx2 = 0, len2 = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                var musicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (var idx3 = 0, len3 = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    var staffLine = musicSystem.StaffLines[idx3];
                    staffLine.addActivitySymbolClickArea();
                }
            }
            if (graphicalMusicPage === this.graphicalMusicSheet.MusicPages[0]) {
                this.calculatePageLabels(graphicalMusicPage);
            }
            graphicalMusicPage.PositionAndShape.calculateTopBottomBorders();
        }
    };
    MusicSheetCalculator.prototype.updateSkyBottomLine = function (staffLine) {
        logging_1.Logging.log("updateSkyBottomLine not implemented");
    };
    MusicSheetCalculator.prototype.calculateSkyBottomLine = function (staffLine) {
        logging_1.Logging.log("calculateSkyBottomLine not implemented");
    };
    MusicSheetCalculator.prototype.calculateMarkedAreas = function () {
        logging_1.Logging.log("calculateMarkedAreas not implemented");
    };
    MusicSheetCalculator.prototype.calculateComments = function () {
        logging_1.Logging.log("calculateComments not implemented");
    };
    MusicSheetCalculator.prototype.optimizeStaffLineDynamicExpressionsPositions = function () {
        return;
    };
    MusicSheetCalculator.prototype.calculateChordSymbols = function () {
        return;
    };
    MusicSheetCalculator.prototype.layoutMeasureWithWholeRest = function (rest, gse, measure) {
        return;
    };
    MusicSheetCalculator.prototype.layoutBeams = function (staffEntry) {
        return;
    };
    MusicSheetCalculator.prototype.layoutArticulationMarks = function (articulations, voiceEntry, graphicalStaffEntry) {
        return;
    };
    MusicSheetCalculator.prototype.layoutOrnament = function (ornaments, voiceEntry, graphicalStaffEntry) {
        return;
    };
    MusicSheetCalculator.prototype.calculateRestNotePlacementWithinGraphicalBeam = function (graphicalStaffEntry, restNote, previousNote, nextStaffEntry, nextNote) {
        return;
    };
    MusicSheetCalculator.prototype.calculateTupletNumbers = function () {
        return;
    };
    MusicSheetCalculator.prototype.calculateSlurs = function () {
        return;
    };
    MusicSheetCalculator.prototype.calculateDynamicExpressionsForSingleMultiExpression = function (multiExpression, measureIndex, staffIndex) {
        return;
    };
    MusicSheetCalculator.prototype.calcGraphicalRepetitionEndingsRecursively = function (repetition) {
        return;
    };
    MusicSheetCalculator.prototype.layoutSingleRepetitionEnding = function (start, end, numberText, offset, leftOpen, rightOpen) {
        return;
    };
    MusicSheetCalculator.prototype.calculateTempoExpressionsForSingleMultiTempoExpression = function (sourceMeasure, multiTempoExpression, measureIndex) {
        return;
    };
    MusicSheetCalculator.prototype.clearSystemsAndMeasures = function () {
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2 = 0, len2 = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                var musicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (var idx3 = 0, len3 = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    var staffLine = musicSystem.StaffLines[idx3];
                    for (var idx4 = 0, len4 = staffLine.Measures.length; idx4 < len4; ++idx4) {
                        var graphicalMeasure = staffLine.Measures[idx4];
                        if (graphicalMeasure.FirstInstructionStaffEntry !== undefined) {
                            var index = graphicalMeasure.PositionAndShape.ChildElements.indexOf(graphicalMeasure.FirstInstructionStaffEntry.PositionAndShape);
                            if (index > -1) {
                                graphicalMeasure.PositionAndShape.ChildElements.splice(index, 1);
                            }
                            graphicalMeasure.FirstInstructionStaffEntry = undefined;
                            graphicalMeasure.beginInstructionsWidth = 0.0;
                        }
                        if (graphicalMeasure.LastInstructionStaffEntry !== undefined) {
                            var index = graphicalMeasure.PositionAndShape.ChildElements.indexOf(graphicalMeasure.LastInstructionStaffEntry.PositionAndShape);
                            if (index > -1) {
                                graphicalMeasure.PositionAndShape.ChildElements.splice(index, 1);
                            }
                            graphicalMeasure.LastInstructionStaffEntry = undefined;
                            graphicalMeasure.endInstructionsWidth = 0.0;
                        }
                    }
                    staffLine.Measures = [];
                    staffLine.PositionAndShape.ChildElements = [];
                }
                musicSystem.StaffLines.length = 0;
                musicSystem.PositionAndShape.ChildElements = [];
            }
            graphicalMusicPage.MusicSystems = [];
            graphicalMusicPage.PositionAndShape.ChildElements = [];
        }
        this.graphicalMusicSheet.MusicPages = [];
    };
    MusicSheetCalculator.prototype.handleVoiceEntry = function (voiceEntry, graphicalStaffEntry, accidentalCalculator, openLyricWords, tieTimestampListDict, activeClef, openTuplets, openBeams, octaveShiftValue, grace, linkedNotes, sourceStaffEntry) {
        if (grace === void 0) { grace = false; }
        if (linkedNotes === void 0) { linkedNotes = undefined; }
        if (sourceStaffEntry === void 0) { sourceStaffEntry = undefined; }
        var graphicalNotes = graphicalStaffEntry.findOrCreateGraphicalNotesListFromVoiceEntry(voiceEntry);
        for (var idx = 0, len = voiceEntry.Notes.length; idx < len; ++idx) {
            var note = voiceEntry.Notes[idx];
            if (sourceStaffEntry !== undefined && sourceStaffEntry.Link !== undefined && linkedNotes !== undefined && linkedNotes.indexOf(note) > -1) {
                continue;
            }
            var graphicalNote = void 0;
            var numberOfDots = note.calculateNumberOfNeededDots();
            if (grace) {
                graphicalNote = this.symbolFactory.createGraceNote(note, numberOfDots, graphicalStaffEntry, activeClef, octaveShiftValue);
            }
            else {
                graphicalNote = this.symbolFactory.createNote(note, numberOfDots, graphicalStaffEntry, activeClef, octaveShiftValue);
            }
            if (note.NoteTie !== undefined) {
                MusicSheetCalculator.addTieToTieTimestampsDict(tieTimestampListDict, note);
            }
            if (note.Pitch !== undefined) {
                this.checkNoteForAccidental(graphicalNote, accidentalCalculator, activeClef, octaveShiftValue, grace);
            }
            this.resetYPositionForLeadSheet(graphicalNote.PositionAndShape);
            graphicalStaffEntry.addGraphicalNoteToListAtCorrectYPosition(graphicalNotes, graphicalNote);
            graphicalStaffEntry.PositionAndShape.ChildElements.push(graphicalNote.PositionAndShape);
            graphicalNote.PositionAndShape.calculateBoundingBox();
            if (!this.leadSheet) {
                if (note.NoteBeam !== undefined) {
                    this.handleBeam(graphicalNote, note.NoteBeam, openBeams);
                }
                if (note.NoteTuplet !== undefined) {
                    this.handleTuplet(graphicalNote, note.NoteTuplet, openTuplets);
                }
            }
        }
        if (voiceEntry.Articulations.length > 0) {
            this.handleVoiceEntryArticulations(voiceEntry.Articulations, voiceEntry, graphicalStaffEntry);
        }
        if (voiceEntry.TechnicalInstructions.length > 0) {
            this.checkVoiceEntriesForTechnicalInstructions(voiceEntry, graphicalStaffEntry);
        }
        if (voiceEntry.LyricsEntries.size() > 0) {
            this.handleVoiceEntryLyrics(voiceEntry.LyricsEntries, voiceEntry, graphicalStaffEntry, openLyricWords);
        }
        if (voiceEntry.OrnamentContainer !== undefined) {
            this.handleVoiceEntryOrnaments(voiceEntry.OrnamentContainer, voiceEntry, graphicalStaffEntry);
        }
        return octaveShiftValue;
    };
    MusicSheetCalculator.prototype.handleVoiceEntryGraceNotes = function (graceEntries, graphicalGraceEntries, graphicalStaffEntry, accidentalCalculator, activeClef, octaveShiftValue, lyricWords, tieTimestampListDict, tuplets, beams) {
        if (graceEntries !== undefined) {
            for (var idx = 0, len = graceEntries.length; idx < len; ++idx) {
                var graceVoiceEntry = graceEntries[idx];
                var graceStaffEntry = this.symbolFactory.createGraceStaffEntry(graphicalStaffEntry, graphicalStaffEntry.parentMeasure);
                graphicalGraceEntries.push(graceStaffEntry);
                graphicalStaffEntry.PositionAndShape.ChildElements.push(graceStaffEntry.PositionAndShape);
                this.handleVoiceEntry(graceVoiceEntry, graceStaffEntry, accidentalCalculator, lyricWords, tieTimestampListDict, activeClef, tuplets, beams, octaveShiftValue, true);
            }
        }
    };
    MusicSheetCalculator.prototype.handleOpenTies = function (measure, beams, tieTimestampListDict, activeClef, octaveShiftParams) {
        collectionUtil_1.CollectionUtil.removeDictElementIfTrue(tieTimestampListDict, function (openTie, tieTimestamps) {
            // for (let m: number = tieTimestampListDict.size() - 1; m >= 0; m--) {
            //     let keyValuePair: KeyValuePair<Tie, Fraction[]> = tieTimestampListDict.ElementAt(m);
            //     let openTie: Tie = keyValuePair.Key;
            //    let tieTimestamps: Fraction[] = keyValuePair.Value;
            var absoluteTimestamp = undefined;
            var k;
            var removeTie = false;
            for (; k < tieTimestamps.length; k++) {
                if (!openTie.NoteHasBeenCreated[k]) {
                    absoluteTimestamp = tieTimestamps[k];
                    if (absoluteTimestamp >= fraction_1.Fraction.plus(measure.parentSourceMeasure.AbsoluteTimestamp, measure.parentSourceMeasure.Duration)) {
                        continue;
                    }
                    var graphicalStaffEntry = undefined;
                    if (absoluteTimestamp !== undefined) {
                        for (var idx = 0, len = measure.staffEntries.length; idx < len; ++idx) {
                            var gse = measure.staffEntries[idx];
                            if (gse.getAbsoluteTimestamp() === absoluteTimestamp) {
                                graphicalStaffEntry = gse;
                                break;
                            }
                        }
                        if (graphicalStaffEntry === undefined) {
                            graphicalStaffEntry = this.createStaffEntryForTieNote(measure, absoluteTimestamp, openTie);
                        }
                    }
                    if (graphicalStaffEntry !== undefined) {
                        var octaveShiftValue = octaveShift_1.OctaveEnum.NONE;
                        if (octaveShiftParams !== undefined) {
                            if (graphicalStaffEntry.getAbsoluteTimestamp() >= octaveShiftParams.getAbsoluteStartTimestamp &&
                                graphicalStaffEntry.getAbsoluteTimestamp() <= octaveShiftParams.getAbsoluteEndTimestamp) {
                                octaveShiftValue = octaveShiftParams.getOpenOctaveShift.Type;
                            }
                        }
                        var isLastTieNote = k === tieTimestamps.length - 1;
                        var tieFraction = openTie.Fractions[k];
                        var numberOfDots = openTie.Start.calculateNumberOfNeededDots();
                        this.createGraphicalTieNote(beams, activeClef, octaveShiftValue, graphicalStaffEntry, tieFraction, numberOfDots, openTie, isLastTieNote);
                        var tieStartNote = openTie.Start;
                        if (isLastTieNote && tieStartNote.ParentVoiceEntry.Articulations.length === 1 &&
                            tieStartNote.ParentVoiceEntry.Articulations[0] === VoiceEntry_1.ArticulationEnum.fermata) {
                            this.symbolFactory.addFermataAtTiedEndNote(tieStartNote, graphicalStaffEntry);
                        }
                        openTie.NoteHasBeenCreated[k] = true;
                        if (openTie.allGraphicalNotesHaveBeenCreated()) {
                            removeTie = true;
                        }
                    }
                }
            }
            return removeTie;
        });
    };
    MusicSheetCalculator.prototype.resetYPositionForLeadSheet = function (psi) {
        if (this.leadSheet) {
            psi.RelativePosition = new PointF2D_1.PointF2D(psi.RelativePosition.x, 0.0);
        }
    };
    MusicSheetCalculator.prototype.layoutVoiceEntries = function (graphicalStaffEntry) {
        graphicalStaffEntry.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(0.0, 0.0);
        var isGraceStaffEntry = graphicalStaffEntry.staffEntryParent !== undefined;
        if (!this.leadSheet) {
            var graphicalStaffEntryNotes = graphicalStaffEntry.notes;
            for (var idx4 = 0, len4 = graphicalStaffEntryNotes.length; idx4 < len4; ++idx4) {
                var graphicalNotes = graphicalStaffEntryNotes[idx4];
                if (graphicalNotes.length === 0) {
                    continue;
                }
                var voiceEntry = graphicalNotes[0].sourceNote.ParentVoiceEntry;
                var hasPitchedNote = graphicalNotes[0].sourceNote.Pitch !== undefined;
                this.layoutVoiceEntry(voiceEntry, graphicalNotes, graphicalStaffEntry, hasPitchedNote, isGraceStaffEntry);
            }
        }
    };
    MusicSheetCalculator.prototype.maxInstrNameLabelLength = function () {
        var maxLabelLength = 0.0;
        for (var _i = 0, _a = this.graphicalMusicSheet.ParentMusicSheet.Instruments; _i < _a.length; _i++) {
            var instrument = _a[_i];
            if (instrument.Voices.length > 0 && instrument.Voices[0].Visible) {
                var graphicalLabel = new GraphicalLabel_1.GraphicalLabel(instrument.NameLabel, this.rules.InstrumentLabelTextHeight, TextAlignment_1.TextAlignment.LeftCenter);
                graphicalLabel.setLabelPositionAndShapeBorders();
                maxLabelLength = Math.max(maxLabelLength, graphicalLabel.PositionAndShape.MarginSize.width);
            }
        }
        return maxLabelLength;
    };
    MusicSheetCalculator.prototype.calculateSheetLabelBoundingBoxes = function () {
        var musicSheet = this.graphicalMusicSheet.ParentMusicSheet;
        if (musicSheet.Title !== undefined) {
            var title = new GraphicalLabel_1.GraphicalLabel(musicSheet.Title, this.rules.SheetTitleHeight, TextAlignment_1.TextAlignment.CenterBottom);
            this.graphicalMusicSheet.Title = title;
            title.setLabelPositionAndShapeBorders();
        }
        if (musicSheet.Subtitle !== undefined) {
            var subtitle = new GraphicalLabel_1.GraphicalLabel(musicSheet.Subtitle, this.rules.SheetSubtitleHeight, TextAlignment_1.TextAlignment.CenterCenter);
            this.graphicalMusicSheet.Subtitle = subtitle;
            subtitle.setLabelPositionAndShapeBorders();
        }
        if (musicSheet.Composer !== undefined) {
            var composer = new GraphicalLabel_1.GraphicalLabel(musicSheet.Composer, this.rules.SheetComposerHeight, TextAlignment_1.TextAlignment.RightCenter);
            this.graphicalMusicSheet.Composer = composer;
            composer.setLabelPositionAndShapeBorders();
        }
        if (musicSheet.Lyricist !== undefined) {
            var lyricist = new GraphicalLabel_1.GraphicalLabel(musicSheet.Lyricist, this.rules.SheetAuthorHeight, TextAlignment_1.TextAlignment.LeftCenter);
            this.graphicalMusicSheet.Lyricist = lyricist;
            lyricist.setLabelPositionAndShapeBorders();
        }
    };
    MusicSheetCalculator.prototype.checkMeasuresForWholeRestNotes = function () {
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var musicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2 = 0, len2 = musicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                var musicSystem = musicPage.MusicSystems[idx2];
                for (var idx3 = 0, len3 = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    var staffLine = musicSystem.StaffLines[idx3];
                    for (var idx4 = 0, len4 = staffLine.Measures.length; idx4 < len4; ++idx4) {
                        var measure = staffLine.Measures[idx4];
                        if (measure.staffEntries.length === 1) {
                            var gse = measure.staffEntries[0];
                            if (gse.notes.length > 0 && gse.notes[0].length > 0) {
                                var graphicalNote = gse.notes[0][0];
                                if (graphicalNote.sourceNote.Pitch === undefined && (new fraction_1.Fraction(1, 2)).lt(graphicalNote.sourceNote.Length)) {
                                    this.layoutMeasureWithWholeRest(graphicalNote, gse, measure);
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    MusicSheetCalculator.prototype.optimizeRestNotePlacement = function (graphicalStaffEntry, measure) {
        if (graphicalStaffEntry.notes.length === 0) {
            return;
        }
        var voice1Notes = graphicalStaffEntry.notes[0];
        if (voice1Notes.length === 0) {
            return;
        }
        var voice1Note1 = voice1Notes[0];
        var voice1Note1IsRest = voice1Note1.sourceNote.Pitch === undefined;
        if (graphicalStaffEntry.notes.length === 2) {
            var voice2Note1IsRest = false;
            var voice2Notes = graphicalStaffEntry.notes[1];
            if (voice2Notes.length > 0) {
                var voice2Note1 = voice1Notes[0];
                voice2Note1IsRest = voice2Note1.sourceNote.Pitch === undefined;
            }
            if (voice1Note1IsRest && voice2Note1IsRest) {
                this.calculateTwoRestNotesPlacementWithCollisionDetection(graphicalStaffEntry);
            }
            else if (voice1Note1IsRest || voice2Note1IsRest) {
                this.calculateRestNotePlacementWithCollisionDetectionFromGraphicalNote(graphicalStaffEntry);
            }
        }
        else if (voice1Note1IsRest && graphicalStaffEntry !== measure.staffEntries[0] &&
            graphicalStaffEntry !== measure.staffEntries[measure.staffEntries.length - 1]) {
            var staffEntryIndex = measure.staffEntries.indexOf(graphicalStaffEntry);
            var previousStaffEntry = measure.staffEntries[staffEntryIndex - 1];
            var nextStaffEntry = measure.staffEntries[staffEntryIndex + 1];
            if (previousStaffEntry.notes.length === 1) {
                var previousNote = previousStaffEntry.notes[0][0];
                if (previousNote.sourceNote.NoteBeam !== undefined && nextStaffEntry.notes.length === 1) {
                    var nextNote = nextStaffEntry.notes[0][0];
                    if (nextNote.sourceNote.NoteBeam !== undefined && previousNote.sourceNote.NoteBeam === nextNote.sourceNote.NoteBeam) {
                        this.calculateRestNotePlacementWithinGraphicalBeam(graphicalStaffEntry, voice1Note1, previousNote, nextStaffEntry, nextNote);
                        graphicalStaffEntry.PositionAndShape.calculateBoundingBox();
                    }
                }
            }
        }
    };
    MusicSheetCalculator.prototype.getRelativePositionInStaffLineFromTimestamp = function (timestamp, verticalIndex, staffLine, multiStaffInstrument, firstVisibleMeasureRelativeX) {
        if (firstVisibleMeasureRelativeX === void 0) { firstVisibleMeasureRelativeX = 0.0; }
        var relative = new PointF2D_1.PointF2D();
        var leftStaffEntry = undefined;
        var rightStaffEntry = undefined;
        var numEntries = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length;
        var index = this.graphicalMusicSheet.GetInterpolatedIndexInVerticalContainers(timestamp);
        var leftIndex = Math.min(Math.floor(index), numEntries - 1);
        var rightIndex = Math.min(Math.ceil(index), numEntries - 1);
        if (leftIndex < 0 || verticalIndex < 0) {
            return relative;
        }
        leftStaffEntry = this.getFirstLeftNotNullStaffEntryFromContainer(leftIndex, verticalIndex, multiStaffInstrument);
        rightStaffEntry = this.getFirstRightNotNullStaffEntryFromContainer(rightIndex, verticalIndex, multiStaffInstrument);
        if (leftStaffEntry !== undefined && rightStaffEntry !== undefined) {
            var measureRelativeX = leftStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;
            if (firstVisibleMeasureRelativeX > 0) {
                measureRelativeX = firstVisibleMeasureRelativeX;
            }
            var leftX = leftStaffEntry.PositionAndShape.RelativePosition.x + measureRelativeX;
            var rightX = rightStaffEntry.PositionAndShape.RelativePosition.x + rightStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;
            if (firstVisibleMeasureRelativeX > 0) {
                rightX = rightStaffEntry.PositionAndShape.RelativePosition.x + measureRelativeX;
            }
            var timestampQuotient = 0.0;
            if (leftStaffEntry !== rightStaffEntry) {
                var leftTimestamp = leftStaffEntry.getAbsoluteTimestamp();
                var rightTimestamp = rightStaffEntry.getAbsoluteTimestamp();
                var leftDifference = fraction_1.Fraction.minus(timestamp, leftTimestamp);
                timestampQuotient = leftDifference.RealValue / fraction_1.Fraction.minus(rightTimestamp, leftTimestamp).RealValue;
            }
            if (leftStaffEntry.parentMeasure.ParentStaffLine !== rightStaffEntry.parentMeasure.ParentStaffLine) {
                if (leftStaffEntry.parentMeasure.ParentStaffLine === staffLine) {
                    rightX = staffLine.PositionAndShape.Size.width;
                }
                else {
                    leftX = staffLine.PositionAndShape.RelativePosition.x;
                }
            }
            relative = new PointF2D_1.PointF2D(leftX + (rightX - leftX) * timestampQuotient, 0.0);
        }
        return relative;
    };
    MusicSheetCalculator.prototype.getRelativeXPositionFromTimestamp = function (timestamp) {
        var numEntries = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length;
        var index = this.graphicalMusicSheet.GetInterpolatedIndexInVerticalContainers(timestamp);
        var discreteIndex = Math.max(0, Math.min(Math.round(index), numEntries - 1));
        var gse = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[discreteIndex].getFirstNonNullStaffEntry();
        var posX = gse.PositionAndShape.RelativePosition.x + gse.parentMeasure.PositionAndShape.RelativePosition.x;
        return posX;
    };
    MusicSheetCalculator.prototype.calculatePageLabels = function (page) {
        var relative = new PointF2D_1.PointF2D();
        var firstSystemAbsoluteTopMargin = 10;
        if (page.MusicSystems.length > 0) {
            var firstMusicSystem = page.MusicSystems[0];
            firstSystemAbsoluteTopMargin = firstMusicSystem.PositionAndShape.RelativePosition.y + firstMusicSystem.PositionAndShape.BorderTop;
        }
        if (this.graphicalMusicSheet.Title !== undefined) {
            var title = this.graphicalMusicSheet.Title;
            title.PositionAndShape.Parent = page.PositionAndShape;
            page.PositionAndShape.ChildElements.push(title.PositionAndShape);
            relative.x = this.graphicalMusicSheet.ParentMusicSheet.pageWidth / 2;
            relative.y = this.rules.TitleTopDistance + this.rules.SheetTitleHeight;
            title.PositionAndShape.RelativePosition = relative;
            page.Labels.push(title);
        }
        if (this.graphicalMusicSheet.Subtitle !== undefined) {
            var subtitle = this.graphicalMusicSheet.Subtitle;
            subtitle.PositionAndShape.Parent = page.PositionAndShape;
            page.PositionAndShape.ChildElements.push(subtitle.PositionAndShape);
            relative.x = this.graphicalMusicSheet.ParentMusicSheet.pageWidth / 2;
            relative.y = this.rules.TitleTopDistance + this.rules.SheetTitleHeight + this.rules.SheetMinimumDistanceBetweenTitleAndSubtitle;
            subtitle.PositionAndShape.RelativePosition = relative;
            page.Labels.push(subtitle);
        }
        if (this.graphicalMusicSheet.Composer !== undefined) {
            var composer = this.graphicalMusicSheet.Composer;
            composer.PositionAndShape.Parent = page.PositionAndShape;
            page.PositionAndShape.ChildElements.push(composer.PositionAndShape);
            composer.setLabelPositionAndShapeBorders();
            relative.x = this.graphicalMusicSheet.ParentMusicSheet.pageWidth - this.rules.PageRightMargin;
            relative.y = firstSystemAbsoluteTopMargin - this.rules.SystemComposerDistance;
            composer.PositionAndShape.RelativePosition = relative;
            page.Labels.push(composer);
        }
        if (this.graphicalMusicSheet.Lyricist !== undefined) {
            var lyricist = this.graphicalMusicSheet.Lyricist;
            lyricist.PositionAndShape.Parent = page.PositionAndShape;
            page.PositionAndShape.ChildElements.push(lyricist.PositionAndShape);
            lyricist.setLabelPositionAndShapeBorders();
            relative.x = this.rules.PageLeftMargin;
            relative.y = firstSystemAbsoluteTopMargin - this.rules.SystemComposerDistance;
            lyricist.PositionAndShape.RelativePosition = relative;
            page.Labels.push(lyricist);
        }
    };
    MusicSheetCalculator.prototype.createGraphicalTies = function () {
        for (var measureIndex = 0; measureIndex < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; measureIndex++) {
            var sourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[measureIndex];
            for (var staffIndex = 0; staffIndex < sourceMeasure.CompleteNumberOfStaves; staffIndex++) {
                for (var j = 0; j < sourceMeasure.VerticalSourceStaffEntryContainers.length; j++) {
                    var sourceStaffEntry = sourceMeasure.VerticalSourceStaffEntryContainers[j].StaffEntries[staffIndex];
                    if (sourceStaffEntry !== undefined) {
                        var startStaffEntry = this.graphicalMusicSheet.findGraphicalStaffEntryFromMeasureList(staffIndex, measureIndex, sourceStaffEntry);
                        for (var idx = 0, len = sourceStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                            var voiceEntry = sourceStaffEntry.VoiceEntries[idx];
                            for (var idx2 = 0, len2 = voiceEntry.Notes.length; idx2 < len2; ++idx2) {
                                var note = voiceEntry.Notes[idx2];
                                if (note.NoteTie !== undefined) {
                                    var tie = note.NoteTie;
                                    this.handleTie(tie, startStaffEntry, staffIndex, measureIndex);
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    MusicSheetCalculator.prototype.createAccidentalCalculators = function () {
        var accidentalCalculators = [];
        var firstSourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure !== undefined) {
            for (var i = 0; i < firstSourceMeasure.CompleteNumberOfStaves; i++) {
                var accidentalCalculator = new AccidentalCalculator_1.AccidentalCalculator(this.symbolFactory);
                accidentalCalculators.push(accidentalCalculator);
                if (firstSourceMeasure.FirstInstructionsStaffEntries[i] !== undefined) {
                    for (var idx = 0, len = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions.length; idx < len; ++idx) {
                        var abstractNotationInstruction = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions[idx];
                        if (abstractNotationInstruction instanceof KeyInstruction_1.KeyInstruction) {
                            var keyInstruction = abstractNotationInstruction;
                            accidentalCalculator.ActiveKeyInstruction = keyInstruction;
                        }
                    }
                }
            }
        }
        return accidentalCalculators;
    };
    MusicSheetCalculator.prototype.calculateVerticalContainersList = function () {
        var numberOfEntries = this.graphicalMusicSheet.MeasureList[0].length;
        for (var i = 0; i < this.graphicalMusicSheet.MeasureList.length; i++) {
            for (var j = 0; j < numberOfEntries; j++) {
                var measure = this.graphicalMusicSheet.MeasureList[i][j];
                for (var idx = 0, len = measure.staffEntries.length; idx < len; ++idx) {
                    var graphicalStaffEntry = measure.staffEntries[idx];
                    var verticalContainer = this.graphicalMusicSheet.getOrCreateVerticalContainer(graphicalStaffEntry.getAbsoluteTimestamp());
                    if (verticalContainer !== undefined) {
                        verticalContainer.StaffEntries[j] = graphicalStaffEntry;
                        graphicalStaffEntry.parentVerticalContainer = verticalContainer;
                    }
                    else {
                        ;
                    }
                }
            }
        }
    };
    MusicSheetCalculator.prototype.setIndecesToVerticalGraphicalContainers = function () {
        for (var i = 0; i < this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length; i++) {
            this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].Index = i;
        }
    };
    MusicSheetCalculator.prototype.createGraphicalMeasuresForSourceMeasure = function (sourceMeasure, accidentalCalculators, openLyricWords, tieTimestampListDictList, openOctaveShifts, activeClefs) {
        this.initStaffMeasuresCreation();
        var verticalMeasureList = [];
        var openBeams = [];
        var openTuplets = [];
        var staffEntryLinks = [];
        for (var staffIndex = 0; staffIndex < sourceMeasure.CompleteNumberOfStaves; staffIndex++) {
            var measure = this.createGraphicalMeasure(sourceMeasure, tieTimestampListDictList[staffIndex], openTuplets, openBeams, accidentalCalculators[staffIndex], activeClefs, openOctaveShifts, openLyricWords, staffIndex, staffEntryLinks);
            verticalMeasureList.push(measure);
        }
        this.graphicalMusicSheet.sourceToGraphicalMeasureLinks.setValue(sourceMeasure, verticalMeasureList);
        return verticalMeasureList;
    };
    MusicSheetCalculator.prototype.createGraphicalMeasure = function (sourceMeasure, tieTimestampListDict, openTuplets, openBeams, accidentalCalculator, activeClefs, openOctaveShifts, openLyricWords, staffIndex, staffEntryLinks) {
        var staff = this.graphicalMusicSheet.ParentMusicSheet.getStaffFromIndex(staffIndex);
        var measure = this.symbolFactory.createStaffMeasure(sourceMeasure, staff);
        measure.hasError = sourceMeasure.getErrorInMeasure(staffIndex);
        if (sourceMeasure.FirstInstructionsStaffEntries[staffIndex] !== undefined) {
            for (var idx = 0, len = sourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions.length; idx < len; ++idx) {
                var instruction = sourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[idx];
                if (instruction instanceof KeyInstruction_1.KeyInstruction) {
                    var key = KeyInstruction_1.KeyInstruction.copy(instruction);
                    if (this.graphicalMusicSheet.ParentMusicSheet.Transpose !== 0 &&
                        measure.ParentStaff.ParentInstrument.MidiInstrumentId !== ClefInstruction_3.MidiInstrument.Percussion &&
                        MusicSheetCalculator.transposeCalculator !== undefined) {
                        MusicSheetCalculator.transposeCalculator.transposeKey(key, this.graphicalMusicSheet.ParentMusicSheet.Transpose);
                    }
                    accidentalCalculator.ActiveKeyInstruction = key;
                }
            }
        }
        for (var idx = 0, len = sourceMeasure.StaffLinkedExpressions[staffIndex].length; idx < len; ++idx) {
            var multiExpression = sourceMeasure.StaffLinkedExpressions[staffIndex][idx];
            if (multiExpression.OctaveShiftStart !== undefined) {
                var openOctaveShift = multiExpression.OctaveShiftStart;
                openOctaveShifts[staffIndex] = new OctaveShiftParams_1.OctaveShiftParams(openOctaveShift, multiExpression.AbsoluteTimestamp, openOctaveShift.ParentEndMultiExpression.AbsoluteTimestamp);
            }
        }
        for (var entryIndex = 0; entryIndex < sourceMeasure.VerticalSourceStaffEntryContainers.length; entryIndex++) {
            var sourceStaffEntry = sourceMeasure.VerticalSourceStaffEntryContainers[entryIndex].StaffEntries[staffIndex];
            if (sourceStaffEntry !== undefined) {
                for (var idx = 0, len = sourceStaffEntry.Instructions.length; idx < len; ++idx) {
                    var abstractNotationInstruction = sourceStaffEntry.Instructions[idx];
                    if (abstractNotationInstruction instanceof ClefInstruction_1.ClefInstruction) {
                        activeClefs[staffIndex] = abstractNotationInstruction;
                    }
                }
                var graphicalStaffEntry = this.symbolFactory.createStaffEntry(sourceStaffEntry, measure);
                if (measure.staffEntries.length > entryIndex) {
                    measure.addGraphicalStaffEntryAtTimestamp(graphicalStaffEntry);
                }
                else {
                    measure.addGraphicalStaffEntry(graphicalStaffEntry);
                }
                var linkedNotes = [];
                if (sourceStaffEntry.Link !== undefined) {
                    sourceStaffEntry.findLinkedNotes(linkedNotes);
                    this.handleStaffEntryLink(graphicalStaffEntry, staffEntryLinks);
                }
                var octaveShiftValue = octaveShift_1.OctaveEnum.NONE;
                if (openOctaveShifts[staffIndex] !== undefined) {
                    var octaveShiftParams = openOctaveShifts[staffIndex];
                    if (sourceStaffEntry.AbsoluteTimestamp >= octaveShiftParams.getAbsoluteStartTimestamp &&
                        sourceStaffEntry.AbsoluteTimestamp <= octaveShiftParams.getAbsoluteEndTimestamp) {
                        octaveShiftValue = octaveShiftParams.getOpenOctaveShift.Type;
                    }
                }
                for (var idx = 0, len = sourceStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                    var voiceEntry = sourceStaffEntry.VoiceEntries[idx];
                    this.handleVoiceEntryGraceNotes(voiceEntry.graceVoiceEntriesBefore, graphicalStaffEntry.graceStaffEntriesBefore, graphicalStaffEntry, accidentalCalculator, activeClefs[staffIndex], octaveShiftValue, openLyricWords, tieTimestampListDict, openTuplets, openBeams);
                    octaveShiftValue = this.handleVoiceEntry(voiceEntry, graphicalStaffEntry, accidentalCalculator, openLyricWords, tieTimestampListDict, activeClefs[staffIndex], openTuplets, openBeams, octaveShiftValue, false, linkedNotes, sourceStaffEntry);
                    this.handleVoiceEntryGraceNotes(voiceEntry.graceVoiceEntriesAfter, graphicalStaffEntry.graceStaffEntriesAfter, graphicalStaffEntry, accidentalCalculator, activeClefs[staffIndex], octaveShiftValue, openLyricWords, tieTimestampListDict, openTuplets, openBeams);
                }
                if (sourceStaffEntry.Instructions.length > 0) {
                    var clefInstruction = sourceStaffEntry.Instructions[0];
                    this.symbolFactory.createInStaffClef(graphicalStaffEntry, clefInstruction);
                }
                if (sourceStaffEntry.ChordContainer !== undefined) {
                    sourceStaffEntry.ParentStaff.ParentInstrument.HasChordSymbols = true;
                    this.symbolFactory.createChordSymbol(sourceStaffEntry, graphicalStaffEntry, this.graphicalMusicSheet.ParentMusicSheet.Transpose);
                }
            }
        }
        if (tieTimestampListDict.size() > 0) {
            this.handleOpenTies(measure, openBeams, tieTimestampListDict, activeClefs[staffIndex], openOctaveShifts[staffIndex]);
        }
        accidentalCalculator.doCalculationsAtEndOfMeasure();
        if (sourceMeasure.LastInstructionsStaffEntries[staffIndex] !== undefined) {
            var lastStaffEntry = sourceMeasure.LastInstructionsStaffEntries[staffIndex];
            for (var idx = 0, len = lastStaffEntry.Instructions.length; idx < len; ++idx) {
                var abstractNotationInstruction = lastStaffEntry.Instructions[idx];
                if (abstractNotationInstruction instanceof ClefInstruction_1.ClefInstruction) {
                    activeClefs[staffIndex] = abstractNotationInstruction;
                }
            }
        }
        for (var idx = 0, len = sourceMeasure.StaffLinkedExpressions[staffIndex].length; idx < len; ++idx) {
            var multiExpression = sourceMeasure.StaffLinkedExpressions[staffIndex][idx];
            if (multiExpression.OctaveShiftEnd !== undefined && openOctaveShifts[staffIndex] !== undefined &&
                multiExpression.OctaveShiftEnd === openOctaveShifts[staffIndex].getOpenOctaveShift) {
                openOctaveShifts[staffIndex] = undefined;
            }
        }
        if (measure.staffEntries.length === 0) {
            var sourceStaffEntry = new SourceStaffEntry_1.SourceStaffEntry(undefined, staff);
            var note = new Note_1.Note(undefined, sourceStaffEntry, fraction_1.Fraction.createFromFraction(sourceMeasure.Duration), undefined);
            var graphicalStaffEntry = this.symbolFactory.createStaffEntry(sourceStaffEntry, measure);
            measure.addGraphicalStaffEntry(graphicalStaffEntry);
            graphicalStaffEntry.relInMeasureTimestamp = new fraction_1.Fraction(0, 1);
            var graphicalNotes = [];
            graphicalStaffEntry.notes.push(graphicalNotes);
            var numberOfDots = note.calculateNumberOfNeededDots();
            var graphicalNote = this.symbolFactory.createNote(note, numberOfDots, graphicalStaffEntry, new ClefInstruction_1.ClefInstruction(ClefInstruction_2.ClefEnum.G, 0, 2), octaveShift_1.OctaveEnum.NONE);
            graphicalNotes.push(graphicalNote);
            graphicalStaffEntry.PositionAndShape.ChildElements.push(graphicalNote.PositionAndShape);
        }
        return measure;
    };
    MusicSheetCalculator.prototype.checkVoiceEntriesForTechnicalInstructions = function (voiceEntry, graphicalStaffEntry) {
        for (var idx = 0, len = voiceEntry.TechnicalInstructions.length; idx < len; ++idx) {
            var technicalInstruction = voiceEntry.TechnicalInstructions[idx];
            this.symbolFactory.createGraphicalTechnicalInstruction(technicalInstruction, graphicalStaffEntry);
        }
    };
    MusicSheetCalculator.prototype.checkNoteForAccidental = function (graphicalNote, accidentalCalculator, activeClef, octaveEnum, grace) {
        if (grace === void 0) { grace = false; }
        var pitch = graphicalNote.sourceNote.Pitch;
        var transpose = this.graphicalMusicSheet.ParentMusicSheet.Transpose;
        if (transpose !== 0 && graphicalNote.sourceNote.ParentStaffEntry.ParentStaff.ParentInstrument.MidiInstrumentId !== ClefInstruction_3.MidiInstrument.Percussion) {
            pitch = graphicalNote.Transpose(accidentalCalculator.ActiveKeyInstruction, activeClef, transpose, octaveEnum);
            if (graphicalNote.sourceNote.NoteTie !== undefined) {
                graphicalNote.sourceNote.NoteTie.BaseNoteYPosition = graphicalNote.PositionAndShape.RelativePosition.y;
            }
        }
        graphicalNote.sourceNote.halfTone = pitch.getHalfTone();
        var scalingFactor = 1.0;
        if (grace) {
            scalingFactor = this.rules.GraceNoteScalingFactor;
        }
        accidentalCalculator.checkAccidental(graphicalNote, pitch, grace, scalingFactor);
    };
    // needed to disable linter, as it doesn't recognize the existing usage of this method.
    // ToDo: check if a newer version doesn't have the problem.
    /* tslint:disable:no-unused-variable */
    MusicSheetCalculator.prototype.createStaffEntryForTieNote = function (measure, absoluteTimestamp, openTie) {
        /* tslint:enable:no-unused-variable */
        var graphicalStaffEntry;
        graphicalStaffEntry = this.symbolFactory.createStaffEntry(openTie.Start.ParentStaffEntry, measure);
        graphicalStaffEntry.relInMeasureTimestamp = fraction_1.Fraction.minus(absoluteTimestamp, measure.parentSourceMeasure.AbsoluteTimestamp);
        this.resetYPositionForLeadSheet(graphicalStaffEntry.PositionAndShape);
        measure.addGraphicalStaffEntry(graphicalStaffEntry);
        return graphicalStaffEntry;
    };
    MusicSheetCalculator.prototype.updateSkyBottomLines = function () {
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2 = 0, len2 = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                var musicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (var idx3 = 0, len3 = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    var staffLine = musicSystem.StaffLines[idx3];
                    this.updateSkyBottomLine(staffLine);
                }
            }
        }
    };
    MusicSheetCalculator.prototype.handleStaffEntries = function () {
        for (var idx = 0, len = this.graphicalMusicSheet.MeasureList.length; idx < len; ++idx) {
            var measures = this.graphicalMusicSheet.MeasureList[idx];
            for (var idx2 = 0, len2 = measures.length; idx2 < len2; ++idx2) {
                var measure = measures[idx2];
                for (var idx3 = 0, len3 = measure.staffEntries.length; idx3 < len3; ++idx3) {
                    var graphicalStaffEntry = measure.staffEntries[idx3];
                    if (graphicalStaffEntry.parentMeasure !== undefined && graphicalStaffEntry.notes.length > 0 && graphicalStaffEntry.notes[0].length > 0) {
                        this.layoutVoiceEntries(graphicalStaffEntry);
                        this.layoutStaffEntry(graphicalStaffEntry);
                    }
                }
            }
        }
    };
    MusicSheetCalculator.prototype.calculateSkyBottomLines = function () {
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2 = 0, len2 = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                var musicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (var idx3 = 0, len3 = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    var staffLine = musicSystem.StaffLines[idx3];
                    this.calculateSkyBottomLine(staffLine);
                }
            }
        }
    };
    MusicSheetCalculator.prototype.calculateBeams = function () {
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var musicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2 = 0, len2 = musicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                var musicSystem = musicPage.MusicSystems[idx2];
                for (var idx3 = 0, len3 = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    var staffLine = musicSystem.StaffLines[idx3];
                    for (var idx4 = 0, len4 = staffLine.Measures.length; idx4 < len4; ++idx4) {
                        var measure = staffLine.Measures[idx4];
                        for (var idx5 = 0, len5 = measure.staffEntries.length; idx5 < len5; ++idx5) {
                            var staffEntry = measure.staffEntries[idx5];
                            this.layoutBeams(staffEntry);
                        }
                    }
                }
            }
        }
    };
    MusicSheetCalculator.prototype.calculateStaffEntryArticulationMarks = function () {
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var page = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2 = 0, len2 = page.MusicSystems.length; idx2 < len2; ++idx2) {
                var system = page.MusicSystems[idx2];
                for (var idx3 = 0, len3 = system.StaffLines.length; idx3 < len3; ++idx3) {
                    var line = system.StaffLines[idx3];
                    for (var idx4 = 0, len4 = line.Measures.length; idx4 < len4; ++idx4) {
                        var measure = line.Measures[idx4];
                        for (var idx5 = 0, len5 = measure.staffEntries.length; idx5 < len5; ++idx5) {
                            var graphicalStaffEntry = measure.staffEntries[idx5];
                            for (var idx6 = 0, len6 = graphicalStaffEntry.sourceStaffEntry.VoiceEntries.length; idx6 < len6; ++idx6) {
                                var voiceEntry = graphicalStaffEntry.sourceStaffEntry.VoiceEntries[idx6];
                                if (voiceEntry.Articulations.length > 0) {
                                    this.layoutArticulationMarks(voiceEntry.Articulations, voiceEntry, graphicalStaffEntry);
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    MusicSheetCalculator.prototype.calculateOrnaments = function () {
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var page = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2 = 0, len2 = page.MusicSystems.length; idx2 < len2; ++idx2) {
                var system = page.MusicSystems[idx2];
                for (var idx3 = 0, len3 = system.StaffLines.length; idx3 < len3; ++idx3) {
                    var line = system.StaffLines[idx3];
                    for (var idx4 = 0, len4 = line.Measures.length; idx4 < len4; ++idx4) {
                        var measure = line.Measures[idx4];
                        for (var idx5 = 0, len5 = measure.staffEntries.length; idx5 < len5; ++idx5) {
                            var graphicalStaffEntry = measure.staffEntries[idx5];
                            for (var idx6 = 0, len6 = graphicalStaffEntry.sourceStaffEntry.VoiceEntries.length; idx6 < len6; ++idx6) {
                                var voiceEntry = graphicalStaffEntry.sourceStaffEntry.VoiceEntries[idx6];
                                if (voiceEntry.OrnamentContainer !== undefined) {
                                    if (voiceEntry.hasTie() && graphicalStaffEntry.relInMeasureTimestamp !== voiceEntry.Timestamp) {
                                        continue;
                                    }
                                    this.layoutOrnament(voiceEntry.OrnamentContainer, voiceEntry, graphicalStaffEntry);
                                    if (!(this.staffEntriesWithOrnaments.indexOf(graphicalStaffEntry) !== -1)) {
                                        this.staffEntriesWithOrnaments.push(graphicalStaffEntry);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    MusicSheetCalculator.prototype.optimizeRestPlacement = function () {
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var page = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2 = 0, len2 = page.MusicSystems.length; idx2 < len2; ++idx2) {
                var system = page.MusicSystems[idx2];
                for (var idx3 = 0, len3 = system.StaffLines.length; idx3 < len3; ++idx3) {
                    var line = system.StaffLines[idx3];
                    for (var idx4 = 0, len4 = line.Measures.length; idx4 < len4; ++idx4) {
                        var measure = line.Measures[idx4];
                        for (var idx5 = 0, len5 = measure.staffEntries.length; idx5 < len5; ++idx5) {
                            var graphicalStaffEntry = measure.staffEntries[idx5];
                            this.optimizeRestNotePlacement(graphicalStaffEntry, measure);
                        }
                    }
                }
            }
        }
    };
    MusicSheetCalculator.prototype.calculateTwoRestNotesPlacementWithCollisionDetection = function (graphicalStaffEntry) {
        var firstRestNote = graphicalStaffEntry.notes[0][0];
        var secondRestNote = graphicalStaffEntry.notes[1][0];
        secondRestNote.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(0.0, 2.5);
        graphicalStaffEntry.PositionAndShape.calculateAbsolutePositionsRecursiveWithoutTopelement();
        firstRestNote.PositionAndShape.computeNonOverlappingPositionWithMargin(graphicalStaffEntry.PositionAndShape, BoundingBox_1.ColDirEnum.Up, new PointF2D_1.PointF2D(0.0, secondRestNote.PositionAndShape.RelativePosition.y));
        var relative = firstRestNote.PositionAndShape.RelativePosition;
        relative.y -= 1.0;
        firstRestNote.PositionAndShape.RelativePosition = relative;
        graphicalStaffEntry.PositionAndShape.calculateBoundingBox();
    };
    MusicSheetCalculator.prototype.calculateRestNotePlacementWithCollisionDetectionFromGraphicalNote = function (graphicalStaffEntry) {
        var restNote;
        var graphicalNotes;
        if (graphicalStaffEntry.notes[0][0].sourceNote.Pitch === undefined) {
            restNote = graphicalStaffEntry.notes[0][0];
            graphicalNotes = graphicalStaffEntry.notes[1];
        }
        else {
            graphicalNotes = graphicalStaffEntry.notes[0];
            restNote = graphicalStaffEntry.notes[1][0];
        }
        var collision = false;
        graphicalStaffEntry.PositionAndShape.calculateAbsolutePositionsRecursiveWithoutTopelement();
        for (var idx = 0, len = graphicalNotes.length; idx < len; ++idx) {
            var graphicalNote = graphicalNotes[idx];
            if (restNote.PositionAndShape.marginCollisionDetection(graphicalNote.PositionAndShape)) {
                collision = true;
                break;
            }
        }
        if (collision) {
            if (restNote.sourceNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice_1.LinkedVoice) {
                var bottomBorder = graphicalNotes[0].PositionAndShape.BorderMarginBottom + graphicalNotes[0].PositionAndShape.RelativePosition.y;
                restNote.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(0.0, bottomBorder - restNote.PositionAndShape.BorderMarginTop + 0.5);
            }
            else {
                var last = graphicalNotes[graphicalNotes.length - 1];
                var topBorder = last.PositionAndShape.BorderMarginTop + last.PositionAndShape.RelativePosition.y;
                if (graphicalNotes[0].sourceNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice_1.LinkedVoice) {
                    restNote.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(0.0, topBorder - restNote.PositionAndShape.BorderMarginBottom - 0.5);
                }
                else {
                    var bottomBorder = graphicalNotes[0].PositionAndShape.BorderMarginBottom + graphicalNotes[0].PositionAndShape.RelativePosition.y;
                    if (bottomBorder < 2.0) {
                        restNote.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(0.0, bottomBorder - restNote.PositionAndShape.BorderMarginTop + 0.5);
                    }
                    else {
                        restNote.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(0.0, topBorder - restNote.PositionAndShape.BorderMarginBottom - 0.0);
                    }
                }
            }
        }
        graphicalStaffEntry.PositionAndShape.calculateBoundingBox();
    };
    MusicSheetCalculator.prototype.calculateTieCurves = function () {
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2 = 0, len2 = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                var musicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (var idx3 = 0, len3 = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    var staffLine = musicSystem.StaffLines[idx3];
                    for (var idx4 = 0, len5 = staffLine.Measures.length; idx4 < len5; ++idx4) {
                        var measure = staffLine.Measures[idx4];
                        for (var idx6 = 0, len6 = measure.staffEntries.length; idx6 < len6; ++idx6) {
                            var staffEntry = measure.staffEntries[idx6];
                            var graphicalTies = staffEntry.GraphicalTies;
                            for (var idx7 = 0, len7 = graphicalTies.length; idx7 < len7; ++idx7) {
                                var graphicalTie = graphicalTies[idx7];
                                if (graphicalTie.StartNote !== undefined && graphicalTie.StartNote.parentStaffEntry === staffEntry) {
                                    var tieIsAtSystemBreak = (graphicalTie.StartNote.parentStaffEntry.parentMeasure.ParentStaffLine !==
                                        graphicalTie.EndNote.parentStaffEntry.parentMeasure.ParentStaffLine);
                                    this.layoutGraphicalTie(graphicalTie, tieIsAtSystemBreak);
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    // Commented because unused:
    //private calculateFingering(): void {
    //    for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
    //        let graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
    //        for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
    //            let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
    //            for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
    //                let staffLine: StaffLine = musicSystem.StaffLines[idx3];
    //                let skyBottomLineCalculator: SkyBottomLineCalculator = new SkyBottomLineCalculator(this.rules);
    //                for (let idx4: number = 0, len4: number = staffLine.Measures.length; idx4 < len4; ++idx4) {
    //                    let measure: StaffMeasure = staffLine.Measures[idx4];
    //                    let measureRelativePosition: PointF2D = measure.PositionAndShape.RelativePosition;
    //                    for (let idx5: number = 0, len5: number = measure.staffEntries.length; idx5 < len5; ++idx5) {
    //                        let staffEntry: GraphicalStaffEntry = measure.staffEntries[idx5];
    //                        let hasTechnicalInstruction: boolean = false;
    //                        for (let idx6: number = 0, len6: number = staffEntry.sourceStaffEntry.VoiceEntries.length; idx6 < len6; ++idx6) {
    //                            let ve: VoiceEntry = staffEntry.sourceStaffEntry.VoiceEntries[idx6];
    //                            if (ve.TechnicalInstructions.length > 0) {
    //                                hasTechnicalInstruction = true;
    //                                break;
    //                            }
    //                        }
    //                        if (hasTechnicalInstruction) {
    //                            this.layoutFingering(staffLine, skyBottomLineCalculator, staffEntry, measureRelativePosition);
    //                        }
    //                    }
    //                }
    //            }
    //        }
    //    }
    //}
    MusicSheetCalculator.prototype.calculateLyricsPosition = function () {
        for (var idx = 0, len = this.graphicalMusicSheet.ParentMusicSheet.Instruments.length; idx < len; ++idx) {
            var instrument = this.graphicalMusicSheet.ParentMusicSheet.Instruments[idx];
            if (instrument.HasLyrics && instrument.LyricVersesNumbers.length > 0) {
                instrument.LyricVersesNumbers.sort();
            }
        }
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2 = 0, len2 = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                var musicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (var idx3 = 0, len3 = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    var staffLine = musicSystem.StaffLines[idx3];
                    this.calculateSingleStaffLineLyricsPosition(staffLine, staffLine.ParentStaff.ParentInstrument.LyricVersesNumbers);
                }
            }
        }
    };
    MusicSheetCalculator.prototype.calculateDynamicExpressions = function () {
        for (var i = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            var sourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (var j = 0; j < sourceMeasure.StaffLinkedExpressions.length; j++) {
                if (this.graphicalMusicSheet.MeasureList[i][j].ParentStaff.ParentInstrument.Visible) {
                    for (var k = 0; k < sourceMeasure.StaffLinkedExpressions[j].length; k++) {
                        if (sourceMeasure.StaffLinkedExpressions[j][k].InstantaniousDynamic !== undefined ||
                            (sourceMeasure.StaffLinkedExpressions[j][k].StartingContinuousDynamic !== undefined &&
                                sourceMeasure.StaffLinkedExpressions[j][k].StartingContinuousDynamic.StartMultiExpression ===
                                    sourceMeasure.StaffLinkedExpressions[j][k] && sourceMeasure.StaffLinkedExpressions[j][k].UnknownList.length === 0)) {
                            this.calculateDynamicExpressionsForSingleMultiExpression(sourceMeasure.StaffLinkedExpressions[j][k], i, j);
                        }
                    }
                }
            }
        }
    };
    MusicSheetCalculator.prototype.calculateOctaveShifts = function () {
        for (var i = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            var sourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (var j = 0; j < sourceMeasure.StaffLinkedExpressions.length; j++) {
                if (this.graphicalMusicSheet.MeasureList[i][j].ParentStaff.ParentInstrument.Visible) {
                    for (var k = 0; k < sourceMeasure.StaffLinkedExpressions[j].length; k++) {
                        if ((sourceMeasure.StaffLinkedExpressions[j][k].OctaveShiftStart !== undefined)) {
                            this.calculateSingleOctaveShift(sourceMeasure, sourceMeasure.StaffLinkedExpressions[j][k], i, j);
                        }
                    }
                }
            }
        }
    };
    MusicSheetCalculator.prototype.getFirstLeftNotNullStaffEntryFromContainer = function (horizontalIndex, verticalIndex, multiStaffInstrument) {
        if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex] !== undefined) {
            return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex];
        }
        for (var i = horizontalIndex - 1; i >= 0; i--) {
            if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex] !== undefined) {
                return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex];
            }
        }
        return undefined;
    };
    MusicSheetCalculator.prototype.getFirstRightNotNullStaffEntryFromContainer = function (horizontalIndex, verticalIndex, multiStaffInstrument) {
        if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex] !== undefined) {
            return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex];
        }
        for (var i = horizontalIndex + 1; i < this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length; i++) {
            if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex] !== undefined) {
                return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex];
            }
        }
        return undefined;
    };
    MusicSheetCalculator.prototype.calculateWordRepetitionInstructions = function () {
        for (var i = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            var sourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (var idx = 0, len = sourceMeasure.FirstRepetitionInstructions.length; idx < len; ++idx) {
                var instruction = sourceMeasure.FirstRepetitionInstructions[idx];
                this.calculateWordRepetitionInstruction(instruction, i);
            }
            for (var idx = 0, len = sourceMeasure.LastRepetitionInstructions.length; idx < len; ++idx) {
                var instruction = sourceMeasure.LastRepetitionInstructions[idx];
                this.calculateWordRepetitionInstruction(instruction, i);
            }
        }
    };
    MusicSheetCalculator.prototype.calculateRepetitionEndings = function () {
        var musicsheet = this.graphicalMusicSheet.ParentMusicSheet;
        for (var idx = 0, len = musicsheet.Repetitions.length; idx < len; ++idx) {
            var partListEntry = musicsheet.Repetitions[idx];
            this.calcGraphicalRepetitionEndingsRecursively(partListEntry);
        }
    };
    MusicSheetCalculator.prototype.calculateTempoExpressions = function () {
        for (var i = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            var sourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (var j = 0; j < sourceMeasure.TempoExpressions.length; j++) {
                this.calculateTempoExpressionsForSingleMultiTempoExpression(sourceMeasure, sourceMeasure.TempoExpressions[j], i);
            }
        }
    };
    MusicSheetCalculator.prototype.calculateMoodAndUnknownExpressions = function () {
        for (var i = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            var sourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (var j = 0; j < sourceMeasure.StaffLinkedExpressions.length; j++) {
                if (this.graphicalMusicSheet.MeasureList[i][j].ParentStaff.ParentInstrument.Visible) {
                    for (var k = 0; k < sourceMeasure.StaffLinkedExpressions[j].length; k++) {
                        if ((sourceMeasure.StaffLinkedExpressions[j][k].MoodList.length > 0) ||
                            (sourceMeasure.StaffLinkedExpressions[j][k].UnknownList.length > 0)) {
                            this.calculateMoodAndUnknownExpression(sourceMeasure.StaffLinkedExpressions[j][k], i, j);
                        }
                    }
                }
            }
        }
    };
    return MusicSheetCalculator;
}());
exports.MusicSheetCalculator = MusicSheetCalculator;
