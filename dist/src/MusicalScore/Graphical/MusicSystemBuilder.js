"use strict";
var GraphicalMusicPage_1 = require("./GraphicalMusicPage");
var RhythmInstruction_1 = require("../VoiceData/Instructions/RhythmInstruction");
var KeyInstruction_1 = require("../VoiceData/Instructions/KeyInstruction");
var ClefInstruction_1 = require("../VoiceData/Instructions/ClefInstruction");
var PointF2D_1 = require("../../Common/DataObjects/PointF2D");
var GraphicalLine_1 = require("./GraphicalLine");
var SystemLinesEnum_1 = require("./SystemLinesEnum");
var MusicSheetCalculator_1 = require("./MusicSheetCalculator");
var ClefInstruction_2 = require("../VoiceData/Instructions/ClefInstruction");
var collectionUtil_1 = require("../../Util/collectionUtil");
var SystemLinePosition_1 = require("./SystemLinePosition");
var MusicSystemBuilder = (function () {
    function MusicSystemBuilder() {
        this.globalSystemIndex = 0;
        this.leadSheet = false;
    }
    MusicSystemBuilder.prototype.initialize = function (graphicalMusicSheet, measureList, numberOfStaffLines, symbolFactory) {
        this.leadSheet = graphicalMusicSheet.LeadSheet;
        this.graphicalMusicSheet = graphicalMusicSheet;
        this.rules = this.graphicalMusicSheet.ParentMusicSheet.rules;
        this.measureList = measureList;
        this.symbolFactory = symbolFactory;
        this.currentMusicPage = this.createMusicPage();
        this.currentPageHeight = 0.0;
        this.numberOfVisibleStaffLines = numberOfStaffLines;
        this.activeRhythm = new Array(this.numberOfVisibleStaffLines);
        this.activeKeys = new Array(this.numberOfVisibleStaffLines);
        this.activeClefs = new Array(this.numberOfVisibleStaffLines);
        this.initializeActiveInstructions(this.measureList[0]);
    };
    MusicSystemBuilder.prototype.buildMusicSystems = function () {
        var previousMeasureEndsSystem = false;
        var systemMaxWidth = this.getFullPageSystemWidth();
        this.measureListIndex = 0;
        this.currentSystemParams = new SystemBuildParameters();
        this.currentSystemParams.currentSystem = this.initMusicSystem();
        this.layoutSystemStaves();
        this.currentSystemParams.currentSystem.createMusicSystemLabel(this.rules.InstrumentLabelTextHeight, this.rules.SystemLabelsRightMargin, this.rules.LabelMarginBorderFactor);
        this.currentPageHeight += this.currentSystemParams.currentSystem.PositionAndShape.RelativePosition.y;
        var numberOfMeasures = 0;
        for (var idx = 0, len = this.measureList.length; idx < len; ++idx) {
            if (this.measureList[idx].length > 0) {
                numberOfMeasures++;
            }
        }
        while (this.measureListIndex < numberOfMeasures) {
            var staffMeasures = this.measureList[this.measureListIndex];
            for (var idx = 0, len = staffMeasures.length; idx < len; ++idx) {
                staffMeasures[idx].resetLayout();
            }
            var sourceMeasure = staffMeasures[0].parentSourceMeasure;
            var sourceMeasureEndsSystem = sourceMeasure.BreakSystemAfter;
            var isSystemStartMeasure = this.currentSystemParams.IsSystemStartMeasure();
            var isFirstSourceMeasure = sourceMeasure === this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
            var currentMeasureBeginInstructionsWidth = this.rules.MeasureLeftMargin;
            var currentMeasureEndInstructionsWidth = 0;
            var measureStartLine = this.getMeasureStartLine();
            currentMeasureBeginInstructionsWidth += this.getLineWidth(staffMeasures[0], measureStartLine, isSystemStartMeasure);
            if (!this.leadSheet) {
                currentMeasureBeginInstructionsWidth += this.addBeginInstructions(staffMeasures, isSystemStartMeasure, isFirstSourceMeasure);
                currentMeasureEndInstructionsWidth += this.addEndInstructions(staffMeasures);
            }
            var currentMeasureVarWidth = 0;
            for (var i = 0; i < this.numberOfVisibleStaffLines; i++) {
                currentMeasureVarWidth = Math.max(currentMeasureVarWidth, staffMeasures[i].minimumStaffEntriesWidth);
            }
            var measureEndLine = this.getMeasureEndLine();
            currentMeasureEndInstructionsWidth += this.getLineWidth(staffMeasures[0], measureEndLine, isSystemStartMeasure);
            var nextMeasureBeginInstructionWidth = this.rules.MeasureLeftMargin;
            if (this.measureListIndex + 1 < this.measureList.length) {
                var nextStaffMeasures = this.measureList[this.measureListIndex + 1];
                var nextSourceMeasure = nextStaffMeasures[0].parentSourceMeasure;
                if (nextSourceMeasure.hasBeginInstructions()) {
                    nextMeasureBeginInstructionWidth += this.addBeginInstructions(nextStaffMeasures, false, false);
                }
            }
            var totalMeasureWidth = currentMeasureBeginInstructionsWidth + currentMeasureEndInstructionsWidth + currentMeasureVarWidth;
            var measureFitsInSystem = this.currentSystemParams.currentWidth + totalMeasureWidth + nextMeasureBeginInstructionWidth < systemMaxWidth;
            if (isSystemStartMeasure || measureFitsInSystem) {
                this.addMeasureToSystem(staffMeasures, measureStartLine, measureEndLine, totalMeasureWidth, currentMeasureBeginInstructionsWidth, currentMeasureVarWidth, currentMeasureEndInstructionsWidth);
                this.updateActiveClefs(sourceMeasure, staffMeasures);
                this.measureListIndex++;
            }
            else {
                this.finalizeCurrentAndCreateNewSystem(staffMeasures, previousMeasureEndsSystem);
            }
            previousMeasureEndsSystem = sourceMeasureEndsSystem;
        }
        this.finalizeCurrentAndCreateNewSystem(this.measureList[this.measureList.length - 1], true);
    };
    MusicSystemBuilder.prototype.setMeasureWidth = function (staffMeasures, width, beginInstrWidth, endInstrWidth) {
        for (var idx = 0, len = staffMeasures.length; idx < len; ++idx) {
            var measure = staffMeasures[idx];
            measure.setWidth(width);
            if (beginInstrWidth > 0) {
                measure.beginInstructionsWidth = beginInstrWidth;
            }
            if (endInstrWidth > 0) {
                measure.endInstructionsWidth = endInstrWidth;
            }
        }
    };
    MusicSystemBuilder.prototype.finalizeCurrentAndCreateNewSystem = function (measures, isPartEndingSystem) {
        if (isPartEndingSystem === void 0) { isPartEndingSystem = false; }
        this.adaptRepetitionLineWithIfNeeded();
        if (!isPartEndingSystem) {
            this.checkAndCreateExtraInstructionMeasure(measures);
        }
        this.stretchMusicSystem(isPartEndingSystem);
        if (this.currentPageHeight + this.currentSystemParams.currentSystem.PositionAndShape.Size.height + this.rules.SystemDistance <= this.rules.PageHeight) {
            this.currentPageHeight += this.currentSystemParams.currentSystem.PositionAndShape.Size.height + this.rules.SystemDistance;
            if (this.currentPageHeight + this.currentSystemParams.currentSystem.PositionAndShape.Size.height
                + this.rules.SystemDistance >= this.rules.PageHeight) {
                this.currentMusicPage = this.createMusicPage();
                this.currentPageHeight = this.rules.PageTopMargin + this.rules.TitleTopDistance;
            }
        }
        else {
            this.currentMusicPage = this.createMusicPage();
            this.currentPageHeight = this.rules.PageTopMargin + this.rules.TitleTopDistance;
        }
        this.currentSystemParams = new SystemBuildParameters();
        if (this.measureListIndex < this.measureList.length) {
            this.currentSystemParams.currentSystem = this.initMusicSystem();
            this.layoutSystemStaves();
        }
    };
    MusicSystemBuilder.prototype.adaptRepetitionLineWithIfNeeded = function () {
        var systemMeasures = this.currentSystemParams.systemMeasures;
        if (systemMeasures.length >= 1) {
            var measures = this.currentSystemParams.currentSystem.GraphicalMeasures[this.currentSystemParams.currentSystem.GraphicalMeasures.length - 1];
            var measureParams = systemMeasures[systemMeasures.length - 1];
            var diff = 0.0;
            if (measureParams.endLine === SystemLinesEnum_1.SystemLinesEnum.DotsBoldBoldDots) {
                measureParams.endLine = SystemLinesEnum_1.SystemLinesEnum.DotsThinBold;
                diff = measures[0].getLineWidth(SystemLinesEnum_1.SystemLinesEnum.DotsBoldBoldDots) / 2 - measures[0].getLineWidth(SystemLinesEnum_1.SystemLinesEnum.DotsThinBold);
            }
            this.currentSystemParams.currentSystemFixWidth -= diff;
            for (var idx = 0, len = measures.length; idx < len; ++idx) {
                var measure = measures[idx];
                measure.endInstructionsWidth -= diff;
            }
        }
    };
    MusicSystemBuilder.prototype.addMeasureToSystem = function (staffMeasures, measureStartLine, measureEndLine, totalMeasureWidth, currentMeasureBeginInstructionsWidth, currentVarWidth, currentMeasureEndInstructionsWidth) {
        this.currentSystemParams.systemMeasures.push({ beginLine: measureStartLine, endLine: measureEndLine });
        this.setMeasureWidth(staffMeasures, totalMeasureWidth, currentMeasureBeginInstructionsWidth, currentMeasureEndInstructionsWidth);
        this.addStaveMeasuresToSystem(staffMeasures);
        this.currentSystemParams.currentWidth += totalMeasureWidth;
        this.currentSystemParams.currentSystemFixWidth += currentMeasureBeginInstructionsWidth + currentMeasureEndInstructionsWidth;
        this.currentSystemParams.currentSystemVarWidth += currentVarWidth;
        this.currentSystemParams.systemMeasureIndex++;
    };
    MusicSystemBuilder.prototype.createMusicPage = function () {
        var page = new GraphicalMusicPage_1.GraphicalMusicPage(this.graphicalMusicSheet);
        this.graphicalMusicSheet.MusicPages.push(page);
        page.PositionAndShape.BorderLeft = 0.0;
        page.PositionAndShape.BorderRight = this.graphicalMusicSheet.ParentMusicSheet.pageWidth;
        page.PositionAndShape.BorderTop = 0.0;
        page.PositionAndShape.BorderBottom = this.rules.PageHeight;
        page.PositionAndShape.RelativePosition = new PointF2D_1.PointF2D(0.0, 0.0);
        return page;
    };
    MusicSystemBuilder.prototype.initMusicSystem = function () {
        var musicSystem = this.symbolFactory.createMusicSystem(this.currentMusicPage, this.globalSystemIndex++);
        this.currentMusicPage.MusicSystems.push(musicSystem);
        var boundingBox = musicSystem.PositionAndShape;
        this.currentMusicPage.PositionAndShape.ChildElements.push(boundingBox);
        return musicSystem;
    };
    MusicSystemBuilder.prototype.getFullPageSystemWidth = function () {
        return this.currentMusicPage.PositionAndShape.Size.width - this.rules.PageLeftMargin
            - this.rules.PageRightMargin - this.rules.SystemLeftMargin - this.rules.SystemRightMargin;
    };
    MusicSystemBuilder.prototype.layoutSystemStaves = function () {
        var systemWidth = this.getFullPageSystemWidth();
        var musicSystem = this.currentSystemParams.currentSystem;
        var boundingBox = musicSystem.PositionAndShape;
        boundingBox.BorderLeft = 0.0;
        boundingBox.BorderRight = systemWidth;
        boundingBox.BorderTop = 0.0;
        var staffList = [];
        var instruments = this.graphicalMusicSheet.ParentMusicSheet.Instruments;
        for (var idx = 0, len = instruments.length; idx < len; ++idx) {
            var instrument = instruments[idx];
            if (instrument.Voices.length === 0 || !instrument.Visible) {
                continue;
            }
            for (var idx2 = 0, len2 = instrument.Staves.length; idx2 < len2; ++idx2) {
                var staff = instrument.Staves[idx2];
                staffList.push(staff);
            }
        }
        var multiLyrics = false;
        if (this.leadSheet) {
            for (var idx = 0, len = staffList.length; idx < len; ++idx) {
                var staff = staffList[idx];
                if (staff.ParentInstrument.LyricVersesNumbers.length > 1) {
                    multiLyrics = true;
                    break;
                }
            }
        }
        var yOffsetSum = 0;
        for (var i = 0; i < staffList.length; i++) {
            this.addStaffLineToMusicSystem(musicSystem, yOffsetSum, staffList[i]);
            yOffsetSum += this.rules.StaffHeight;
            if (i + 1 < staffList.length) {
                var yOffset = 0;
                if (this.leadSheet && !multiLyrics) {
                    yOffset = 2.5;
                }
                else {
                    if (staffList[i].ParentInstrument === staffList[i + 1].ParentInstrument) {
                        yOffset = this.rules.BetweenStaffDistance;
                    }
                    else {
                        yOffset = this.rules.StaffDistance;
                    }
                }
                yOffsetSum += yOffset;
            }
        }
        boundingBox.BorderBottom = yOffsetSum;
    };
    MusicSystemBuilder.prototype.addStaffLineToMusicSystem = function (musicSystem, relativeYPosition, staff) {
        if (musicSystem !== undefined) {
            var staffLine = this.symbolFactory.createStaffLine(musicSystem, staff);
            musicSystem.StaffLines.push(staffLine);
            var boundingBox = staffLine.PositionAndShape;
            musicSystem.PositionAndShape.ChildElements.push(boundingBox);
            var relativePosition = new PointF2D_1.PointF2D();
            if (musicSystem.Parent.MusicSystems[0] === musicSystem && musicSystem.Parent === musicSystem.Parent.Parent.MusicPages[0]) {
                relativePosition.x = this.rules.FirstSystemMargin;
            }
            else {
                relativePosition.x = 0.0;
            }
            relativePosition.y = relativeYPosition;
            boundingBox.RelativePosition = relativePosition;
            if (musicSystem.Parent.MusicSystems[0] === musicSystem && musicSystem.Parent === musicSystem.Parent.Parent.MusicPages[0]) {
                boundingBox.BorderRight = musicSystem.PositionAndShape.Size.width - this.rules.FirstSystemMargin;
            }
            else {
                boundingBox.BorderRight = musicSystem.PositionAndShape.Size.width;
            }
            boundingBox.BorderLeft = 0.0;
            boundingBox.BorderTop = 0.0;
            boundingBox.BorderBottom = this.rules.StaffHeight;
            for (var i = 0; i < 5; i++) {
                var start = new PointF2D_1.PointF2D();
                start.x = 0.0;
                start.y = i * this.rules.StaffHeight / 4;
                var end = new PointF2D_1.PointF2D();
                end.x = staffLine.PositionAndShape.Size.width;
                end.y = i * this.rules.StaffHeight / 4;
                if (this.leadSheet) {
                    start.y = end.y = 0;
                }
                staffLine.StaffLines[i] = new GraphicalLine_1.GraphicalLine(start, end, this.rules.StaffLineWidth);
            }
        }
    };
    MusicSystemBuilder.prototype.initializeActiveInstructions = function (measureList) {
        var firstSourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure !== undefined) {
            this.visibleStaffIndices = this.graphicalMusicSheet.getVisibleStavesIndecesFromSourceMeasure(measureList);
            for (var i = 0, len = this.visibleStaffIndices.length; i < len; i++) {
                var staffIndex = this.visibleStaffIndices[i];
                var graphicalMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(firstSourceMeasure, staffIndex);
                this.activeClefs[i] = firstSourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[0];
                var keyInstruction = KeyInstruction_1.KeyInstruction.copy(firstSourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[1]);
                keyInstruction = this.transposeKeyInstruction(keyInstruction, graphicalMeasure);
                this.activeKeys[i] = keyInstruction;
                this.activeRhythm[i] = firstSourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[2];
            }
        }
    };
    MusicSystemBuilder.prototype.transposeKeyInstruction = function (keyInstruction, graphicalMeasure) {
        if (this.graphicalMusicSheet.ParentMusicSheet.Transpose !== 0
            && graphicalMeasure.ParentStaff.ParentInstrument.MidiInstrumentId !== ClefInstruction_2.MidiInstrument.Percussion
            && MusicSheetCalculator_1.MusicSheetCalculator.transposeCalculator !== undefined) {
            MusicSheetCalculator_1.MusicSheetCalculator.transposeCalculator.transposeKey(keyInstruction, this.graphicalMusicSheet.ParentMusicSheet.Transpose);
        }
        return keyInstruction;
    };
    MusicSystemBuilder.prototype.addBeginInstructions = function (measures, isSystemFirstMeasure, isFirstSourceMeasure) {
        var measureCount = measures.length;
        if (measureCount === 0) {
            return 0;
        }
        var totalBeginInstructionLengthX = 0.0;
        var sourceMeasure = measures[0].parentSourceMeasure;
        for (var idx = 0; idx < measureCount; ++idx) {
            var measure = measures[idx];
            var staffIndex = this.visibleStaffIndices[idx];
            var beginInstructionsStaffEntry = sourceMeasure.FirstInstructionsStaffEntries[staffIndex];
            var beginInstructionLengthX = this.AddInstructionsAtMeasureBegin(beginInstructionsStaffEntry, measure, idx, isFirstSourceMeasure, isSystemFirstMeasure);
            totalBeginInstructionLengthX = Math.max(totalBeginInstructionLengthX, beginInstructionLengthX);
        }
        return totalBeginInstructionLengthX;
    };
    MusicSystemBuilder.prototype.addEndInstructions = function (measures) {
        var measureCount = measures.length;
        if (measureCount === 0) {
            return 0;
        }
        var totalEndInstructionLengthX = 0.5;
        var sourceMeasure = measures[0].parentSourceMeasure;
        for (var idx = 0; idx < measureCount; idx++) {
            var measure = measures[idx];
            var staffIndex = this.visibleStaffIndices[idx];
            var endInstructionsStaffEntry = sourceMeasure.LastInstructionsStaffEntries[staffIndex];
            var endInstructionLengthX = this.addInstructionsAtMeasureEnd(endInstructionsStaffEntry, measure);
            totalEndInstructionLengthX = Math.max(totalEndInstructionLengthX, endInstructionLengthX);
        }
        return totalEndInstructionLengthX;
    };
    MusicSystemBuilder.prototype.AddInstructionsAtMeasureBegin = function (firstEntry, measure, visibleStaffIdx, isFirstSourceMeasure, isSystemStartMeasure) {
        var instructionsLengthX = 0;
        var currentClef = undefined;
        var currentKey = undefined;
        var currentRhythm = undefined;
        if (firstEntry !== undefined) {
            for (var idx = 0, len = firstEntry.Instructions.length; idx < len; ++idx) {
                var abstractNotationInstruction = firstEntry.Instructions[idx];
                if (abstractNotationInstruction instanceof ClefInstruction_1.ClefInstruction) {
                    currentClef = abstractNotationInstruction;
                }
                else if (abstractNotationInstruction instanceof KeyInstruction_1.KeyInstruction) {
                    currentKey = abstractNotationInstruction;
                }
                else if (abstractNotationInstruction instanceof RhythmInstruction_1.RhythmInstruction) {
                    currentRhythm = abstractNotationInstruction;
                }
            }
        }
        if (isSystemStartMeasure) {
            if (currentClef === undefined) {
                currentClef = this.activeClefs[visibleStaffIdx];
            }
            if (currentKey === undefined) {
                currentKey = this.activeKeys[visibleStaffIdx];
            }
            if (isFirstSourceMeasure && currentRhythm === undefined) {
                currentRhythm = this.activeRhythm[visibleStaffIdx];
            }
        }
        var clefAdded = false;
        var keyAdded = false;
        var rhythmAdded = false;
        if (currentClef !== undefined) {
            measure.addClefAtBegin(currentClef);
            clefAdded = true;
        }
        else {
            currentClef = this.activeClefs[visibleStaffIdx];
        }
        if (currentKey !== undefined) {
            currentKey = this.transposeKeyInstruction(currentKey, measure);
            var previousKey = isSystemStartMeasure ? undefined : this.activeKeys[visibleStaffIdx];
            measure.addKeyAtBegin(currentKey, previousKey, currentClef);
            keyAdded = true;
        }
        if (currentRhythm !== undefined) {
            measure.addRhythmAtBegin(currentRhythm);
            rhythmAdded = true;
        }
        if (clefAdded || keyAdded || rhythmAdded) {
            instructionsLengthX += measure.beginInstructionsWidth;
            if (rhythmAdded) {
                instructionsLengthX += this.rules.RhythmRightMargin;
            }
        }
        return instructionsLengthX;
    };
    MusicSystemBuilder.prototype.addInstructionsAtMeasureEnd = function (lastEntry, measure) {
        if (lastEntry === undefined || lastEntry.Instructions === undefined || lastEntry.Instructions.length === 0) {
            return 0;
        }
        for (var idx = 0, len = lastEntry.Instructions.length; idx < len; ++idx) {
            var abstractNotationInstruction = lastEntry.Instructions[idx];
            if (abstractNotationInstruction instanceof ClefInstruction_1.ClefInstruction) {
                var activeClef = abstractNotationInstruction;
                measure.addClefAtEnd(activeClef);
            }
        }
        return this.rules.MeasureRightMargin + measure.endInstructionsWidth;
    };
    MusicSystemBuilder.prototype.updateActiveClefs = function (measure, staffMeasures) {
        for (var visStaffIdx = 0, len = staffMeasures.length; visStaffIdx < len; visStaffIdx++) {
            var staffIndex = this.visibleStaffIndices[visStaffIdx];
            var firstEntry = measure.FirstInstructionsStaffEntries[staffIndex];
            if (firstEntry !== undefined) {
                for (var idx = 0, len2 = firstEntry.Instructions.length; idx < len2; ++idx) {
                    var abstractNotationInstruction = firstEntry.Instructions[idx];
                    if (abstractNotationInstruction instanceof ClefInstruction_1.ClefInstruction) {
                        this.activeClefs[visStaffIdx] = abstractNotationInstruction;
                    }
                    else if (abstractNotationInstruction instanceof KeyInstruction_1.KeyInstruction) {
                        this.activeKeys[visStaffIdx] = abstractNotationInstruction;
                    }
                    else if (abstractNotationInstruction instanceof RhythmInstruction_1.RhythmInstruction) {
                        this.activeRhythm[visStaffIdx] = abstractNotationInstruction;
                    }
                }
            }
            var entries = measure.getEntriesPerStaff(staffIndex);
            for (var idx = 0, len2 = entries.length; idx < len2; ++idx) {
                var staffEntry = entries[idx];
                if (staffEntry.Instructions !== undefined) {
                    for (var idx2 = 0, len3 = staffEntry.Instructions.length; idx2 < len3; ++idx2) {
                        var abstractNotationInstruction = staffEntry.Instructions[idx2];
                        if (abstractNotationInstruction instanceof ClefInstruction_1.ClefInstruction) {
                            this.activeClefs[visStaffIdx] = abstractNotationInstruction;
                        }
                    }
                }
            }
            var lastEntry = measure.LastInstructionsStaffEntries[staffIndex];
            if (lastEntry !== undefined) {
                var instructions = lastEntry.Instructions;
                for (var idx = 0, len3 = instructions.length; idx < len3; ++idx) {
                    var abstractNotationInstruction = instructions[idx];
                    if (abstractNotationInstruction instanceof ClefInstruction_1.ClefInstruction) {
                        this.activeClefs[visStaffIdx] = abstractNotationInstruction;
                    }
                }
            }
        }
    };
    MusicSystemBuilder.prototype.checkAndCreateExtraInstructionMeasure = function (measures) {
        var firstStaffEntries = measures[0].parentSourceMeasure.FirstInstructionsStaffEntries;
        var visibleInstructionEntries = [];
        for (var idx = 0, len = measures.length; idx < len; ++idx) {
            var measure = measures[idx];
            visibleInstructionEntries.push(firstStaffEntries[measure.ParentStaff.idInMusicSheet]);
        }
        var maxMeasureWidth = 0;
        for (var visStaffIdx = 0, len = visibleInstructionEntries.length; visStaffIdx < len; ++visStaffIdx) {
            var sse = visibleInstructionEntries[visStaffIdx];
            if (sse === undefined) {
                continue;
            }
            var instructions = sse.Instructions;
            var keyInstruction = undefined;
            var rhythmInstruction = undefined;
            for (var idx2 = 0, len2 = instructions.length; idx2 < len2; ++idx2) {
                var instruction = instructions[idx2];
                if (instruction instanceof KeyInstruction_1.KeyInstruction && instruction.Key !== this.activeKeys[visStaffIdx].Key) {
                    keyInstruction = instruction;
                }
                if (instruction instanceof RhythmInstruction_1.RhythmInstruction && instruction !== this.activeRhythm[visStaffIdx]) {
                    rhythmInstruction = instruction;
                }
            }
            if (keyInstruction !== undefined || rhythmInstruction !== undefined) {
                var measureWidth = this.addExtraInstructionMeasure(visStaffIdx, keyInstruction, rhythmInstruction);
                maxMeasureWidth = Math.max(maxMeasureWidth, measureWidth);
            }
        }
        if (maxMeasureWidth > 0) {
            this.currentSystemParams.systemMeasures.push({
                beginLine: SystemLinesEnum_1.SystemLinesEnum.None,
                endLine: SystemLinesEnum_1.SystemLinesEnum.None,
            });
            this.currentSystemParams.currentWidth += maxMeasureWidth;
            this.currentSystemParams.currentSystemFixWidth += maxMeasureWidth;
        }
    };
    MusicSystemBuilder.prototype.addExtraInstructionMeasure = function (visStaffIdx, keyInstruction, rhythmInstruction) {
        var currentSystem = this.currentSystemParams.currentSystem;
        var measures = [];
        var measure = this.symbolFactory.createExtraStaffMeasure(currentSystem.StaffLines[visStaffIdx]);
        measures.push(measure);
        if (keyInstruction !== undefined) {
            measure.addKeyAtBegin(keyInstruction, this.activeKeys[visStaffIdx], this.activeClefs[visStaffIdx]);
        }
        if (rhythmInstruction !== undefined) {
            measure.addRhythmAtBegin(rhythmInstruction);
        }
        measure.PositionAndShape.BorderLeft = 0.0;
        measure.PositionAndShape.BorderTop = 0.0;
        measure.PositionAndShape.BorderBottom = this.rules.StaffHeight;
        var width = this.rules.MeasureLeftMargin + measure.beginInstructionsWidth + this.rules.MeasureRightMargin;
        measure.PositionAndShape.BorderRight = width;
        currentSystem.StaffLines[visStaffIdx].Measures.push(measure);
        measure.ParentStaffLine = currentSystem.StaffLines[visStaffIdx];
        currentSystem.StaffLines[visStaffIdx].PositionAndShape.ChildElements.push(measure.PositionAndShape);
        return width;
    };
    MusicSystemBuilder.prototype.addStaveMeasuresToSystem = function (staffMeasures) {
        if (staffMeasures[0] !== undefined) {
            var gmeasures = [];
            for (var i = 0; i < staffMeasures.length; i++) {
                gmeasures.push(staffMeasures[i]);
            }
            var currentSystem = this.currentSystemParams.currentSystem;
            for (var visStaffIdx = 0; visStaffIdx < this.numberOfVisibleStaffLines; visStaffIdx++) {
                var measure = gmeasures[visStaffIdx];
                currentSystem.StaffLines[visStaffIdx].Measures.push(measure);
                measure.ParentStaffLine = currentSystem.StaffLines[visStaffIdx];
                currentSystem.StaffLines[visStaffIdx].PositionAndShape.ChildElements.push(measure.PositionAndShape);
            }
            currentSystem.AddStaffMeasures(gmeasures);
        }
    };
    MusicSystemBuilder.prototype.getMeasureStartLine = function () {
        var thisMeasureBeginsLineRep = this.thisMeasureBeginsLineRepetition();
        if (thisMeasureBeginsLineRep) {
            var isSystemStartMeasure = this.currentSystemParams.IsSystemStartMeasure();
            var isGlobalFirstMeasure = this.measureListIndex === 0;
            if (this.previousMeasureEndsLineRepetition() && !isSystemStartMeasure) {
                return SystemLinesEnum_1.SystemLinesEnum.DotsBoldBoldDots;
            }
            if (!isGlobalFirstMeasure) {
                return SystemLinesEnum_1.SystemLinesEnum.BoldThinDots;
            }
        }
        return SystemLinesEnum_1.SystemLinesEnum.None;
    };
    MusicSystemBuilder.prototype.getMeasureEndLine = function () {
        if (this.nextMeasureBeginsLineRepetition() && this.thisMeasureEndsLineRepetition()) {
            return SystemLinesEnum_1.SystemLinesEnum.DotsBoldBoldDots;
        }
        if (this.thisMeasureEndsLineRepetition()) {
            return SystemLinesEnum_1.SystemLinesEnum.DotsThinBold;
        }
        if (this.measureListIndex === this.measureList.length - 1 || this.measureList[this.measureListIndex][0].parentSourceMeasure.endsPiece) {
            return SystemLinesEnum_1.SystemLinesEnum.ThinBold;
        }
        if (this.nextMeasureHasKeyInstructionChange() || this.thisMeasureEndsWordRepetition() || this.nextMeasureBeginsWordRepetition()) {
            return SystemLinesEnum_1.SystemLinesEnum.DoubleThin;
        }
        return SystemLinesEnum_1.SystemLinesEnum.SingleThin;
    };
    MusicSystemBuilder.prototype.getLineWidth = function (measure, systemLineEnum, isSystemStartMeasure) {
        var width = measure.getLineWidth(systemLineEnum);
        if (systemLineEnum === SystemLinesEnum_1.SystemLinesEnum.DotsBoldBoldDots) {
            width /= 2;
        }
        if (isSystemStartMeasure && systemLineEnum === SystemLinesEnum_1.SystemLinesEnum.BoldThinDots) {
            width += this.rules.DistanceBetweenLastInstructionAndRepetitionBarline;
        }
        return width;
    };
    MusicSystemBuilder.prototype.previousMeasureEndsLineRepetition = function () {
        if (this.measureListIndex === 0) {
            return false;
        }
        for (var idx = 0, len = this.measureList[this.measureListIndex - 1].length; idx < len; ++idx) {
            var measure = this.measureList[this.measureListIndex - 1][idx];
            if (measure.endsWithLineRepetition()) {
                return true;
            }
        }
        return false;
    };
    MusicSystemBuilder.prototype.thisMeasureBeginsLineRepetition = function () {
        for (var idx = 0, len = this.measureList[this.measureListIndex].length; idx < len; ++idx) {
            var measure = this.measureList[this.measureListIndex][idx];
            if (measure.beginsWithLineRepetition()) {
                return true;
            }
        }
        return false;
    };
    MusicSystemBuilder.prototype.nextMeasureBeginsLineRepetition = function () {
        var nextMeasureIndex = this.measureListIndex + 1;
        if (nextMeasureIndex >= this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length) {
            return false;
        }
        for (var idx = 0, len = this.measureList[nextMeasureIndex].length; idx < len; ++idx) {
            var measure = this.measureList[nextMeasureIndex][idx];
            if (measure.beginsWithLineRepetition()) {
                return true;
            }
        }
        return false;
    };
    MusicSystemBuilder.prototype.thisMeasureEndsLineRepetition = function () {
        for (var idx = 0, len = this.measureList[this.measureListIndex].length; idx < len; ++idx) {
            var measure = this.measureList[this.measureListIndex][idx];
            if (measure.endsWithLineRepetition()) {
                return true;
            }
        }
        return false;
    };
    MusicSystemBuilder.prototype.nextMeasureBeginsWordRepetition = function () {
        var nextMeasureIndex = this.measureListIndex + 1;
        if (nextMeasureIndex >= this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length) {
            return false;
        }
        for (var idx = 0, len = this.measureList[nextMeasureIndex].length; idx < len; ++idx) {
            var measure = this.measureList[nextMeasureIndex][idx];
            if (measure.beginsWithWordRepetition()) {
                return true;
            }
        }
        return false;
    };
    MusicSystemBuilder.prototype.thisMeasureEndsWordRepetition = function () {
        for (var idx = 0, len = this.measureList[this.measureListIndex].length; idx < len; ++idx) {
            var measure = this.measureList[this.measureListIndex][idx];
            if (measure.endsWithWordRepetition()) {
                return true;
            }
        }
        return false;
    };
    MusicSystemBuilder.prototype.nextMeasureHasKeyInstructionChange = function () {
        return this.getNextMeasureKeyInstruction() !== undefined;
    };
    MusicSystemBuilder.prototype.getNextMeasureKeyInstruction = function () {
        if (this.measureListIndex < this.measureList.length - 1) {
            for (var visIndex = 0; visIndex < this.measureList[this.measureListIndex].length; visIndex++) {
                var sourceMeasure = this.measureList[this.measureListIndex + 1][visIndex].parentSourceMeasure;
                if (sourceMeasure === undefined) {
                    return undefined;
                }
                return sourceMeasure.getKeyInstruction(this.visibleStaffIndices[visIndex]);
            }
        }
        return undefined;
    };
    MusicSystemBuilder.prototype.calculateXScalingFactor = function (systemFixWidth, systemVarWidth) {
        if (Math.abs(systemVarWidth - 0) < 0.00001 || Math.abs(systemFixWidth - 0) < 0.00001) {
            return 1.0;
        }
        var systemEndX;
        var currentSystem = this.currentSystemParams.currentSystem;
        systemEndX = currentSystem.StaffLines[0].PositionAndShape.Size.width;
        var scalingFactor = (systemEndX - systemFixWidth) / systemVarWidth;
        return scalingFactor;
    };
    MusicSystemBuilder.prototype.stretchMusicSystem = function (isPartEndingSystem) {
        var scalingFactor = this.calculateXScalingFactor(this.currentSystemParams.currentSystemFixWidth, this.currentSystemParams.currentSystemVarWidth);
        if (isPartEndingSystem) {
            scalingFactor = Math.min(scalingFactor, this.rules.LastSystemMaxScalingFactor);
        }
        var currentSystem = this.currentSystemParams.currentSystem;
        for (var visStaffIdx = 0, len = currentSystem.StaffLines.length; visStaffIdx < len; ++visStaffIdx) {
            var staffLine = currentSystem.StaffLines[visStaffIdx];
            var currentXPosition = 0.0;
            for (var measureIndex = 0; measureIndex < staffLine.Measures.length; measureIndex++) {
                var measure = staffLine.Measures[measureIndex];
                measure.setPositionInStaffline(currentXPosition);
                measure.setWidth(measure.beginInstructionsWidth + measure.minimumStaffEntriesWidth * scalingFactor + measure.endInstructionsWidth);
                if (measureIndex < this.currentSystemParams.systemMeasures.length) {
                    var startLine = this.currentSystemParams.systemMeasures[measureIndex].beginLine;
                    var lineWidth = measure.getLineWidth(SystemLinesEnum_1.SystemLinesEnum.BoldThinDots);
                    switch (startLine) {
                        case SystemLinesEnum_1.SystemLinesEnum.BoldThinDots:
                            var xPosition = currentXPosition;
                            if (measureIndex === 0) {
                                xPosition = currentXPosition + measure.beginInstructionsWidth - lineWidth;
                            }
                            currentSystem.createVerticalLineForMeasure(xPosition, lineWidth, startLine, SystemLinePosition_1.SystemLinePosition.MeasureBegin, measureIndex, measure);
                            break;
                        default:
                    }
                }
                measure.staffEntriesScaleFactor = scalingFactor;
                measure.layoutSymbols();
                var nextMeasureHasRepStartLine = measureIndex + 1 < this.currentSystemParams.systemMeasures.length
                    && this.currentSystemParams.systemMeasures[measureIndex + 1].beginLine === SystemLinesEnum_1.SystemLinesEnum.BoldThinDots;
                if (!nextMeasureHasRepStartLine) {
                    var endLine = SystemLinesEnum_1.SystemLinesEnum.SingleThin;
                    if (measureIndex < this.currentSystemParams.systemMeasures.length) {
                        endLine = this.currentSystemParams.systemMeasures[measureIndex].endLine;
                    }
                    var lineWidth = measure.getLineWidth(endLine);
                    var xPos = measure.PositionAndShape.RelativePosition.x + measure.PositionAndShape.BorderRight - lineWidth;
                    if (endLine === SystemLinesEnum_1.SystemLinesEnum.DotsBoldBoldDots) {
                        xPos -= lineWidth / 2;
                    }
                    currentSystem.createVerticalLineForMeasure(xPos, lineWidth, endLine, SystemLinePosition_1.SystemLinePosition.MeasureEnd, measureIndex, measure);
                }
                currentXPosition = measure.PositionAndShape.RelativePosition.x + measure.PositionAndShape.BorderRight;
            }
        }
        if (isPartEndingSystem) {
            this.decreaseMusicSystemBorders();
        }
    };
    MusicSystemBuilder.prototype.decreaseMusicSystemBorders = function () {
        var currentSystem = this.currentSystemParams.currentSystem;
        var bb = collectionUtil_1.CollectionUtil.last(currentSystem.StaffLines[0].Measures).PositionAndShape;
        var width = bb.RelativePosition.x + bb.Size.width;
        for (var idx = 0, len = currentSystem.StaffLines.length; idx < len; ++idx) {
            var staffLine = currentSystem.StaffLines[idx];
            staffLine.PositionAndShape.BorderRight = width;
            for (var idx2 = 0, len2 = staffLine.StaffLines.length; idx2 < len2; ++idx2) {
                var graphicalLine = staffLine.StaffLines[idx2];
                graphicalLine.End = new PointF2D_1.PointF2D(width, graphicalLine.End.y);
            }
        }
        currentSystem.PositionAndShape.BorderRight = width + this.currentSystemParams.maxLabelLength + this.rules.SystemLabelsRightMargin;
    };
    return MusicSystemBuilder;
}());
exports.MusicSystemBuilder = MusicSystemBuilder;
var SystemBuildParameters = (function () {
    function SystemBuildParameters() {
        this.systemMeasures = [];
        this.systemMeasureIndex = 0;
        this.currentWidth = 0;
        this.currentSystemFixWidth = 0;
        this.currentSystemVarWidth = 0;
        this.maxLabelLength = 0;
    }
    SystemBuildParameters.prototype.IsSystemStartMeasure = function () {
        return this.systemMeasureIndex === 0;
    };
    return SystemBuildParameters;
}());
exports.SystemBuildParameters = SystemBuildParameters;
var MeasureBuildParameters = (function () {
    function MeasureBuildParameters() {
    }
    return MeasureBuildParameters;
}());
exports.MeasureBuildParameters = MeasureBuildParameters;
