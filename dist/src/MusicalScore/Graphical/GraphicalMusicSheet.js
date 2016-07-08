"use strict";
var VerticalGraphicalStaffEntryContainer_1 = require("./VerticalGraphicalStaffEntryContainer");
var GraphicalLine_1 = require("./GraphicalLine");
var PointF2D_1 = require("../../Common/DataObjects/PointF2D");
var ClefInstruction_1 = require("../VoiceData/Instructions/ClefInstruction");
var KeyInstruction_1 = require("../VoiceData/Instructions/KeyInstruction");
var fraction_1 = require("../../Common/DataObjects/fraction");
var BoundingBox_1 = require("./BoundingBox");
var logging_1 = require("../../Common/logging");
var Dictionary_1 = require("typescript-collections/dist/lib/Dictionary");
var collectionUtil_1 = require("../../Util/collectionUtil");
var GraphicalMusicSheet = (function () {
    function GraphicalMusicSheet(musicSheet, calculator) {
        this.musicPages = [];
        this.measureList = [];
        this.verticalGraphicalStaffEntryContainers = [];
        this.cursors = [];
        this.leadSheet = false;
        this.musicSheet = musicSheet;
        this.numberOfStaves = this.musicSheet.Staves.length;
        this.calculator = calculator;
        this.sourceToGraphicalMeasureLinks = new Dictionary_1.default();
        this.calculator.initialize(this);
    }
    Object.defineProperty(GraphicalMusicSheet.prototype, "ParentMusicSheet", {
        get: function () {
            return this.musicSheet;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "GetCalculator", {
        get: function () {
            return this.calculator;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "MusicPages", {
        get: function () {
            return this.musicPages;
        },
        set: function (value) {
            this.musicPages = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "MeasureList", {
        //public get FontInfo(): FontInfo {
        //    return this.fontInfo;
        //}
        get: function () {
            return this.measureList;
        },
        set: function (value) {
            this.measureList = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "VerticalGraphicalStaffEntryContainers", {
        get: function () {
            return this.verticalGraphicalStaffEntryContainers;
        },
        set: function (value) {
            this.verticalGraphicalStaffEntryContainers = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "Title", {
        get: function () {
            return this.title;
        },
        set: function (value) {
            this.title = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "Subtitle", {
        get: function () {
            return this.subtitle;
        },
        set: function (value) {
            this.subtitle = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "Composer", {
        get: function () {
            return this.composer;
        },
        set: function (value) {
            this.composer = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "Lyricist", {
        get: function () {
            return this.lyricist;
        },
        set: function (value) {
            this.lyricist = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "Cursors", {
        get: function () {
            return this.cursors;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "SelectionStartSymbol", {
        get: function () {
            return this.selectionStartSymbol;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "SelectionEndSymbol", {
        get: function () {
            return this.selectionEndSymbol;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "MinAllowedSystemWidth", {
        get: function () {
            return this.minAllowedSystemWidth;
        },
        set: function (value) {
            this.minAllowedSystemWidth = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "NumberOfStaves", {
        // public get SystemImages(): Dictionary<MusicSystem, SystemImageProperties> {
        //     return this.systemImages;
        // }
        get: function () {
            return this.numberOfStaves;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicSheet.prototype, "LeadSheet", {
        get: function () {
            return this.leadSheet;
        },
        set: function (value) {
            this.leadSheet = value;
        },
        enumerable: true,
        configurable: true
    });
    GraphicalMusicSheet.transformRelativeToAbsolutePosition = function (graphicalMusicSheet) {
        for (var i = 0; i < graphicalMusicSheet.MusicPages.length; i++) {
            var pageAbsolute = graphicalMusicSheet.MusicPages[i].setMusicPageAbsolutePosition(i, graphicalMusicSheet.ParentMusicSheet.rules);
            var page = graphicalMusicSheet.MusicPages[i];
            page.PositionAndShape.calculateAbsolutePositionsRecursive(pageAbsolute.x, pageAbsolute.y);
        }
    };
    GraphicalMusicSheet.prototype.Initialize = function () {
        this.verticalGraphicalStaffEntryContainers = [];
        this.musicPages = [];
        this.measureList = [];
    };
    GraphicalMusicSheet.prototype.reCalculate = function () {
        this.calculator.calculate();
    };
    GraphicalMusicSheet.prototype.prepare = function () {
        this.calculator.prepareGraphicalMusicSheet();
    };
    GraphicalMusicSheet.prototype.EnforceRedrawOfMusicSystems = function () {
        for (var idx = 0, len = this.musicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.musicPages[idx];
            for (var idx2 = 0, len2 = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                var musicSystem = graphicalMusicPage.MusicSystems[idx2];
                musicSystem.needsToBeRedrawn = true;
            }
        }
    };
    GraphicalMusicSheet.prototype.getClickedObject = function (positionOnMusicSheet) {
        for (var idx = 0, len = this.MusicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.MusicPages[idx];
            return graphicalMusicPage.PositionAndShape.getClickedObjectOfType(positionOnMusicSheet);
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.findGraphicalStaffEntryFromMeasureList = function (staffIndex, measureIndex, sourceStaffEntry) {
        for (var i = measureIndex; i < this.measureList.length; i++) {
            var graphicalMeasure = this.measureList[i][staffIndex];
            for (var idx = 0, len = graphicalMeasure.staffEntries.length; idx < len; ++idx) {
                var graphicalStaffEntry = graphicalMeasure.staffEntries[idx];
                if (graphicalStaffEntry.sourceStaffEntry === sourceStaffEntry) {
                    return graphicalStaffEntry;
                }
            }
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.findNextGraphicalStaffEntry = function (staffIndex, measureIndex, graphicalStaffEntry) {
        var graphicalMeasure = graphicalStaffEntry.parentMeasure;
        var graphicalStaffEntryIndex = graphicalMeasure.staffEntries.indexOf(graphicalStaffEntry);
        if (graphicalStaffEntryIndex < graphicalMeasure.staffEntries.length - 1) {
            return graphicalMeasure.staffEntries[graphicalStaffEntryIndex + 1];
        }
        else if (measureIndex < this.measureList.length - 1) {
            var nextMeasure = this.measureList[measureIndex + 1][staffIndex];
            if (nextMeasure.staffEntries.length > 0) {
                return nextMeasure.staffEntries[0];
            }
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.getFirstVisibleMeasuresListFromIndeces = function (start, end) {
        var graphicalMeasures = [];
        var numberOfStaves = this.measureList[0].length;
        for (var i = start; i <= end; i++) {
            for (var j = 0; j < numberOfStaves; j++) {
                if (this.measureList[i][j].isVisible()) {
                    graphicalMeasures.push(this.measureList[i][j]);
                    break;
                }
            }
        }
        return graphicalMeasures;
    };
    GraphicalMusicSheet.prototype.orderMeasuresByStaffLine = function (measures) {
        var orderedMeasures = [];
        var mList = [];
        orderedMeasures.push(mList);
        for (var i = 0; i < measures.length; i++) {
            if (i === 0) {
                mList.push(measures[0]);
            }
            else {
                if (measures[i].ParentStaffLine === measures[i - 1].ParentStaffLine) {
                    mList.push(measures[i]);
                }
                else {
                    if (orderedMeasures.indexOf(mList) === -1) {
                        orderedMeasures.push(mList);
                    }
                    mList = [];
                    orderedMeasures.push(mList);
                    mList.push(measures[i]);
                }
            }
        }
        return orderedMeasures;
    };
    GraphicalMusicSheet.prototype.initializeActiveClefs = function () {
        var activeClefs = [];
        var firstSourceMeasure = this.musicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure !== undefined) {
            for (var i = 0; i < firstSourceMeasure.CompleteNumberOfStaves; i++) {
                var clef = new ClefInstruction_1.ClefInstruction();
                if (firstSourceMeasure.FirstInstructionsStaffEntries[i] !== undefined) {
                    for (var idx = 0, len = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions.length; idx < len; ++idx) {
                        var abstractNotationInstruction = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions[idx];
                        if (abstractNotationInstruction instanceof ClefInstruction_1.ClefInstruction) {
                            clef = abstractNotationInstruction;
                        }
                    }
                }
                activeClefs.push(clef);
            }
        }
        return activeClefs;
    };
    GraphicalMusicSheet.prototype.GetMainKey = function () {
        var firstSourceMeasure = this.musicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure !== undefined) {
            for (var i = 0; i < firstSourceMeasure.CompleteNumberOfStaves; i++) {
                for (var idx = 0, len = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions.length; idx < len; ++idx) {
                    var abstractNotationInstruction = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions[idx];
                    if (abstractNotationInstruction instanceof KeyInstruction_1.KeyInstruction) {
                        return abstractNotationInstruction;
                    }
                }
            }
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.getOrCreateVerticalContainer = function (timestamp) {
        if (this.verticalGraphicalStaffEntryContainers.length === 0 ||
            timestamp > collectionUtil_1.CollectionUtil.getLastElement(this.verticalGraphicalStaffEntryContainers).AbsoluteTimestamp) {
            var verticalGraphicalStaffEntryContainer = new VerticalGraphicalStaffEntryContainer_1.VerticalGraphicalStaffEntryContainer(this.numberOfStaves, timestamp);
            this.verticalGraphicalStaffEntryContainers.push(verticalGraphicalStaffEntryContainer);
            return verticalGraphicalStaffEntryContainer;
        }
        var i;
        for (; i >= 0; i--) {
            if (this.verticalGraphicalStaffEntryContainers[i].AbsoluteTimestamp < timestamp) {
                var verticalGraphicalStaffEntryContainer = new VerticalGraphicalStaffEntryContainer_1.VerticalGraphicalStaffEntryContainer(this.numberOfStaves, timestamp);
                this.verticalGraphicalStaffEntryContainers.splice(i + 1, 0, verticalGraphicalStaffEntryContainer);
                return verticalGraphicalStaffEntryContainer;
            }
            if (this.verticalGraphicalStaffEntryContainers[i].AbsoluteTimestamp === timestamp) {
                return this.verticalGraphicalStaffEntryContainers[i];
            }
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.GetVerticalContainerFromTimestamp = function (timestamp, startIndex) {
        if (startIndex === void 0) { startIndex = 0; }
        var index = collectionUtil_1.CollectionUtil.binarySearch(this.verticalGraphicalStaffEntryContainers, new VerticalGraphicalStaffEntryContainer_1.VerticalGraphicalStaffEntryContainer(0, timestamp), VerticalGraphicalStaffEntryContainer_1.VerticalGraphicalStaffEntryContainer.compareByTimestamp, startIndex, this.verticalGraphicalStaffEntryContainers.length - startIndex);
        if (index >= 0) {
            return this.verticalGraphicalStaffEntryContainers[index];
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.GetInterpolatedIndexInVerticalContainers = function (musicTimestamp) {
        var containers = this.verticalGraphicalStaffEntryContainers;
        var leftIndex = 0;
        var rightIndex = containers.length - 1;
        var foundIndex;
        var leftTS = undefined;
        var rightTS = undefined;
        if (musicTimestamp <= containers[containers.length - 1].AbsoluteTimestamp) {
            while (rightIndex - leftIndex > 1) {
                var middleIndex = (rightIndex + leftIndex) / 2;
                if (containers[leftIndex].AbsoluteTimestamp === musicTimestamp) {
                    rightIndex = leftIndex;
                    break;
                }
                else if (containers[rightIndex].AbsoluteTimestamp === musicTimestamp) {
                    leftIndex = rightIndex;
                    break;
                }
                else if (containers[middleIndex].AbsoluteTimestamp === musicTimestamp) {
                    return this.verticalGraphicalStaffEntryContainers.indexOf(containers[middleIndex]);
                }
                else if (containers[middleIndex].AbsoluteTimestamp > musicTimestamp) {
                    rightIndex = middleIndex;
                }
                else {
                    leftIndex = middleIndex;
                }
            }
            if (leftIndex === rightIndex) {
                return this.verticalGraphicalStaffEntryContainers.indexOf(containers[leftIndex]);
            }
            leftTS = containers[leftIndex].AbsoluteTimestamp;
            rightTS = containers[rightIndex].AbsoluteTimestamp;
        }
        else {
            leftTS = containers[containers.length - 1].AbsoluteTimestamp;
            rightTS = fraction_1.Fraction.plus(this.getLongestStaffEntryDuration(containers.length - 1), leftTS);
            rightIndex = containers.length;
        }
        var diff = rightTS.RealValue - leftTS.RealValue;
        var diffTS = rightTS.RealValue - musicTimestamp.RealValue;
        foundIndex = rightIndex - (diffTS / diff);
        return Math.min(foundIndex, this.verticalGraphicalStaffEntryContainers.length);
    };
    GraphicalMusicSheet.prototype.getVisibleStavesIndecesFromSourceMeasure = function (visibleMeasures) {
        var visibleInstruments = [];
        var visibleStavesIndeces = [];
        for (var idx = 0, len = visibleMeasures.length; idx < len; ++idx) {
            var graphicalMeasure = visibleMeasures[idx];
            var instrument = graphicalMeasure.ParentStaff.ParentInstrument;
            if (visibleInstruments.indexOf(instrument) === -1) {
                visibleInstruments.push(instrument);
            }
        }
        for (var idx = 0, len = visibleInstruments.length; idx < len; ++idx) {
            var instrument = visibleInstruments[idx];
            var index = this.musicSheet.getGlobalStaffIndexOfFirstStaff(instrument);
            for (var j = 0; j < instrument.Staves.length; j++) {
                visibleStavesIndeces.push(index + j);
            }
        }
        return visibleStavesIndeces;
    };
    GraphicalMusicSheet.prototype.getGraphicalMeasureFromSourceMeasureAndIndex = function (sourceMeasure, index) {
        for (var i = 0; i < this.measureList.length; i++) {
            if (this.measureList[i][0].parentSourceMeasure === sourceMeasure) {
                return this.measureList[i][index];
            }
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.getMeasureIndex = function (graphicalMeasure, measureIndex, inListIndex) {
        measureIndex = 0;
        inListIndex = 0;
        for (; measureIndex < this.measureList.length; measureIndex++) {
            for (var idx = 0, len = this.measureList[measureIndex].length; idx < len; ++idx) {
                var measure = this.measureList[measureIndex][idx];
                if (measure === graphicalMeasure) {
                    return true;
                }
            }
        }
        return false;
    };
    GraphicalMusicSheet.prototype.GetNearesNote = function (clickPosition, maxClickDist) {
        var initialSearchArea = 10;
        var foundNotes = [];
        var region = new BoundingBox_1.BoundingBox();
        region.BorderLeft = clickPosition.x - initialSearchArea;
        region.BorderTop = clickPosition.y - initialSearchArea;
        region.BorderRight = clickPosition.x + initialSearchArea;
        region.BorderBottom = clickPosition.y + initialSearchArea;
        region.AbsolutePosition = new PointF2D_1.PointF2D(0, 0);
        for (var idx = 0, len = this.MusicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.MusicPages[idx];
            var entries = graphicalMusicPage.PositionAndShape.getObjectsInRegion(region);
            //let entriesArr: GraphicalNote[] = __as__<GraphicalNote[]>(entries, GraphicalNote[]) ? ? entries;
            if (entries === undefined) {
                continue;
            }
            else {
                for (var idx2 = 0, len2 = entries.length; idx2 < len2; ++idx2) {
                    var note = entries[idx2];
                    if (Math.abs(note.PositionAndShape.AbsolutePosition.x - clickPosition.x) < maxClickDist.x
                        && Math.abs(note.PositionAndShape.AbsolutePosition.y - clickPosition.y) < maxClickDist.y) {
                        foundNotes.push(note);
                    }
                }
            }
        }
        var closest = undefined;
        for (var idx = 0, len = foundNotes.length; idx < len; ++idx) {
            var note = foundNotes[idx];
            if (closest === undefined) {
                closest = note;
            }
            else {
                if (note.parentStaffEntry.relInMeasureTimestamp === undefined) {
                    continue;
                }
                var deltaNew = this.CalculateDistance(note.PositionAndShape.AbsolutePosition, clickPosition);
                var deltaOld = this.CalculateDistance(closest.PositionAndShape.AbsolutePosition, clickPosition);
                if (deltaNew < deltaOld) {
                    closest = note;
                }
            }
        }
        if (closest !== undefined) {
            return closest;
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.GetClickableLabel = function (clickPosition) {
        var initialSearchAreaX = 4;
        var initialSearchAreaY = 4;
        var region = new BoundingBox_1.BoundingBox();
        region.BorderLeft = clickPosition.x - initialSearchAreaX;
        region.BorderTop = clickPosition.y - initialSearchAreaY;
        region.BorderRight = clickPosition.x + initialSearchAreaX;
        region.BorderBottom = clickPosition.y + initialSearchAreaY;
        region.AbsolutePosition = new PointF2D_1.PointF2D(0, 0);
        for (var idx = 0, len = this.MusicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.MusicPages[idx];
            var entries = graphicalMusicPage.PositionAndShape.getObjectsInRegion(region);
            if (entries.length !== 1) {
                continue;
            }
            else {
                for (var idx2 = 0, len2 = entries.length; idx2 < len2; ++idx2) {
                    var clickedLabel = entries[idx2];
                    return clickedLabel;
                }
            }
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.GetNearestStaffEntry = function (clickPosition) {
        var initialSearchArea = 10;
        var foundEntries = [];
        var region = new BoundingBox_1.BoundingBox(undefined);
        region.BorderLeft = clickPosition.x - initialSearchArea;
        region.BorderTop = clickPosition.y - initialSearchArea;
        region.BorderRight = clickPosition.x + initialSearchArea;
        region.BorderBottom = clickPosition.y + initialSearchArea;
        region.AbsolutePosition = new PointF2D_1.PointF2D(0, 0);
        for (var idx = 0, len = this.MusicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.MusicPages[idx];
            var entries = graphicalMusicPage.PositionAndShape.getObjectsInRegion(region, false);
            if (entries === undefined || entries.length === 0) {
                continue;
            }
            else {
                for (var idx2 = 0, len2 = entries.length; idx2 < len2; ++idx2) {
                    var gse = entries[idx2];
                    foundEntries.push(gse);
                }
            }
        }
        var closest = undefined;
        for (var idx = 0, len = foundEntries.length; idx < len; ++idx) {
            var gse = foundEntries[idx];
            if (closest === undefined) {
                closest = gse;
            }
            else {
                if (gse.relInMeasureTimestamp === undefined) {
                    continue;
                }
                var deltaNew = this.CalculateDistance(gse.PositionAndShape.AbsolutePosition, clickPosition);
                var deltaOld = this.CalculateDistance(closest.PositionAndShape.AbsolutePosition, clickPosition);
                if (deltaNew < deltaOld) {
                    closest = gse;
                }
            }
        }
        if (closest !== undefined) {
            return closest;
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.GetPossibleCommentAnchor = function (clickPosition) {
        var entry = this.GetNearestStaffEntry(clickPosition);
        if (entry === undefined) {
            return undefined;
        }
        return entry.sourceStaffEntry;
    };
    GraphicalMusicSheet.prototype.getClickedObjectOfType = function (positionOnMusicSheet) {
        for (var idx = 0, len = this.musicPages.length; idx < len; ++idx) {
            var page = this.musicPages[idx];
            var o = page.PositionAndShape.getClickedObjectOfType(positionOnMusicSheet);
            if (o !== undefined) {
                return o;
            }
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.tryGetTimestampFromPosition = function (positionOnMusicSheet) {
        var entry = this.getClickedObjectOfType(positionOnMusicSheet);
        if (entry === undefined) {
            return undefined;
        }
        return entry.getAbsoluteTimestamp();
    };
    GraphicalMusicSheet.prototype.tryGetClickableLabel = function (positionOnMusicSheet) {
        try {
            return this.GetClickableLabel(positionOnMusicSheet);
        }
        catch (ex) {
            logging_1.Logging.log("GraphicalMusicSheet.tryGetClickableObject", "positionOnMusicSheet: " + positionOnMusicSheet, ex);
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.tryGetTimeStampFromPosition = function (positionOnMusicSheet) {
        try {
            var entry = this.GetNearestStaffEntry(positionOnMusicSheet);
            if (entry === undefined) {
                return undefined;
            }
            return entry.getAbsoluteTimestamp();
        }
        catch (ex) {
            logging_1.Logging.log("GraphicalMusicSheet.tryGetTimeStampFromPosition", "positionOnMusicSheet: " + positionOnMusicSheet, ex);
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.getStaffEntry = function (index) {
        var container = this.VerticalGraphicalStaffEntryContainers[index];
        var staffEntry = undefined;
        try {
            for (var idx = 0, len = container.StaffEntries.length; idx < len; ++idx) {
                var entry = container.StaffEntries[idx];
                if (entry === undefined || !entry.sourceStaffEntry.ParentStaff.ParentInstrument.Visible) {
                    continue;
                }
                if (staffEntry === undefined) {
                    staffEntry = entry;
                }
                else if (entry.PositionAndShape !== undefined && staffEntry.PositionAndShape !== undefined) {
                    if (staffEntry.PositionAndShape.RelativePosition.x > entry.PositionAndShape.RelativePosition.x) {
                        staffEntry = entry;
                    }
                }
            }
        }
        catch (ex) {
            logging_1.Logging.log("GraphicalMusicSheet.getStaffEntry", ex);
        }
        return staffEntry;
    };
    GraphicalMusicSheet.prototype.GetPreviousVisibleContainerIndex = function (index) {
        for (var i = index - 1; i >= 0; i--) {
            var entries = this.verticalGraphicalStaffEntryContainers[i].StaffEntries;
            for (var idx = 0, len = entries.length; idx < len; ++idx) {
                var entry = entries[idx];
                if (entry !== undefined && entry.sourceStaffEntry.ParentStaff.ParentInstrument.Visible) {
                    return i;
                }
            }
        }
        return -1;
    };
    GraphicalMusicSheet.prototype.GetNextVisibleContainerIndex = function (index) {
        for (var i = index + 1; i < this.verticalGraphicalStaffEntryContainers.length; ++i) {
            var entries = this.verticalGraphicalStaffEntryContainers[i].StaffEntries;
            for (var idx = 0, len = entries.length; idx < len; ++idx) {
                var entry = entries[idx];
                if (entry !== undefined && entry.sourceStaffEntry.ParentStaff.ParentInstrument.Visible) {
                    return i;
                }
            }
        }
        return -1;
    };
    GraphicalMusicSheet.prototype.findClosestLeftStaffEntry = function (fractionalIndex, searchOnlyVisibleEntries) {
        var foundEntry = undefined;
        var leftIndex = Math.floor(fractionalIndex);
        leftIndex = Math.min(this.VerticalGraphicalStaffEntryContainers.length - 1, leftIndex);
        for (var i = leftIndex; i >= 0; i--) {
            foundEntry = this.getStaffEntry(i);
            if (foundEntry !== undefined) {
                if (searchOnlyVisibleEntries) {
                    if (foundEntry.sourceStaffEntry.ParentStaff.ParentInstrument.Visible) {
                        return foundEntry;
                    }
                }
                else {
                    return foundEntry;
                }
            }
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.findClosestRightStaffEntry = function (fractionalIndex, returnOnlyVisibleEntries) {
        var foundEntry = undefined;
        var rightIndex = Math.max(0, Math.ceil(fractionalIndex));
        for (var i = rightIndex; i < this.VerticalGraphicalStaffEntryContainers.length; i++) {
            foundEntry = this.getStaffEntry(i);
            if (foundEntry !== undefined) {
                if (returnOnlyVisibleEntries) {
                    if (foundEntry.sourceStaffEntry.ParentStaff.ParentInstrument.Visible) {
                        return foundEntry;
                    }
                }
                else {
                    return foundEntry;
                }
            }
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.calculateCursorLineAtTimestamp = function (musicTimestamp, styleEnum) {
        var result = this.calculateXPositionFromTimestamp(musicTimestamp);
        var xPos = result[0];
        var correspondingMusicSystem = result[1];
        if (correspondingMusicSystem === undefined || correspondingMusicSystem.StaffLines.length === 0) {
            return undefined;
        }
        var yCoordinate = correspondingMusicSystem.PositionAndShape.AbsolutePosition.y;
        var height = collectionUtil_1.CollectionUtil.last(correspondingMusicSystem.StaffLines).PositionAndShape.RelativePosition.y + 4;
        return new GraphicalLine_1.GraphicalLine(new PointF2D_1.PointF2D(xPos, yCoordinate), new PointF2D_1.PointF2D(xPos, yCoordinate + height), 3, styleEnum);
    };
    GraphicalMusicSheet.prototype.calculateXPositionFromTimestamp = function (timeStamp) {
        var currentMusicSystem = undefined;
        var fractionalIndex = this.GetInterpolatedIndexInVerticalContainers(timeStamp);
        var previousStaffEntry = this.findClosestLeftStaffEntry(fractionalIndex, true);
        var nextStaffEntry = this.findClosestRightStaffEntry(fractionalIndex, true);
        var currentTimeStamp = timeStamp.RealValue;
        if (previousStaffEntry === undefined && nextStaffEntry === undefined) {
            return [0, undefined];
        }
        var previousStaffEntryMusicSystem = undefined;
        if (previousStaffEntry !== undefined) {
            previousStaffEntryMusicSystem = previousStaffEntry.parentMeasure.ParentStaffLine.ParentMusicSystem;
        }
        else {
            previousStaffEntryMusicSystem = nextStaffEntry.parentMeasure.ParentStaffLine.ParentMusicSystem;
        }
        var nextStaffEntryMusicSystem = undefined;
        if (nextStaffEntry !== undefined) {
            nextStaffEntryMusicSystem = nextStaffEntry.parentMeasure.ParentStaffLine.ParentMusicSystem;
        }
        else {
            nextStaffEntryMusicSystem = previousStaffEntry.parentMeasure.ParentStaffLine.ParentMusicSystem;
        }
        if (previousStaffEntryMusicSystem === nextStaffEntryMusicSystem) {
            currentMusicSystem = previousStaffEntryMusicSystem;
            var fraction = void 0;
            var previousStaffEntryPositionX = void 0;
            var nextStaffEntryPositionX = void 0;
            if (previousStaffEntry === undefined) {
                previousStaffEntryPositionX = nextStaffEntryPositionX = nextStaffEntry.PositionAndShape.AbsolutePosition.x;
                fraction = 0;
            }
            else if (nextStaffEntry === undefined) {
                previousStaffEntryPositionX = previousStaffEntry.PositionAndShape.AbsolutePosition.x;
                nextStaffEntryPositionX = currentMusicSystem.GetRightBorderAbsoluteXPosition();
                var sm = previousStaffEntry.parentMeasure.parentSourceMeasure;
                fraction = (currentTimeStamp - previousStaffEntry.getAbsoluteTimestamp().RealValue) / (fraction_1.Fraction.plus(sm.AbsoluteTimestamp, sm.Duration).RealValue - previousStaffEntry.getAbsoluteTimestamp().RealValue);
            }
            else {
                previousStaffEntryPositionX = previousStaffEntry.PositionAndShape.AbsolutePosition.x;
                nextStaffEntryPositionX = nextStaffEntry.PositionAndShape.AbsolutePosition.x;
                if (previousStaffEntry === nextStaffEntry) {
                    fraction = 0;
                }
                else {
                    fraction = (currentTimeStamp - previousStaffEntry.getAbsoluteTimestamp().RealValue) /
                        (nextStaffEntry.getAbsoluteTimestamp().RealValue - previousStaffEntry.getAbsoluteTimestamp().RealValue);
                }
            }
            fraction = Math.min(1, Math.max(0, fraction));
            var interpolatedXPosition = previousStaffEntryPositionX + fraction * (nextStaffEntryPositionX - previousStaffEntryPositionX);
            return [interpolatedXPosition, currentMusicSystem];
        }
        else {
            var nextSystemLeftBorderTimeStamp = nextStaffEntry.parentMeasure.parentSourceMeasure.AbsoluteTimestamp.RealValue;
            var fraction = void 0;
            var interpolatedXPosition = void 0;
            if (currentTimeStamp < nextSystemLeftBorderTimeStamp) {
                currentMusicSystem = previousStaffEntryMusicSystem;
                var previousStaffEntryPositionX = previousStaffEntry.PositionAndShape.AbsolutePosition.x;
                var previousSystemRightBorderX = currentMusicSystem.GetRightBorderAbsoluteXPosition();
                fraction = (currentTimeStamp - previousStaffEntry.getAbsoluteTimestamp().RealValue) /
                    (nextSystemLeftBorderTimeStamp - previousStaffEntry.getAbsoluteTimestamp().RealValue);
                fraction = Math.min(1, Math.max(0, fraction));
                interpolatedXPosition = previousStaffEntryPositionX + fraction * (previousSystemRightBorderX - previousStaffEntryPositionX);
            }
            else {
                currentMusicSystem = nextStaffEntryMusicSystem;
                var nextStaffEntryPositionX = nextStaffEntry.PositionAndShape.AbsolutePosition.x;
                var nextSystemLeftBorderX = currentMusicSystem.GetLeftBorderAbsoluteXPosition();
                fraction = (currentTimeStamp - nextSystemLeftBorderTimeStamp) /
                    (nextStaffEntry.getAbsoluteTimestamp().RealValue - nextSystemLeftBorderTimeStamp);
                fraction = Math.min(1, Math.max(0, fraction));
                interpolatedXPosition = nextSystemLeftBorderX + fraction * (nextStaffEntryPositionX - nextSystemLeftBorderX);
            }
            return [interpolatedXPosition, currentMusicSystem];
        }
    };
    GraphicalMusicSheet.prototype.GetNumberOfVisibleInstruments = function () {
        var visibleInstrumentCount = 0;
        for (var idx = 0, len = this.musicSheet.Instruments.length; idx < len; ++idx) {
            var instrument = this.musicSheet.Instruments[idx];
            if (instrument.Visible === true) {
                visibleInstrumentCount++;
            }
        }
        return visibleInstrumentCount;
    };
    GraphicalMusicSheet.prototype.GetNumberOfFollowedInstruments = function () {
        var followedInstrumentCount = 0;
        for (var idx = 0, len = this.musicSheet.Instruments.length; idx < len; ++idx) {
            var instrument = this.musicSheet.Instruments[idx];
            if (instrument.Following === true) {
                followedInstrumentCount++;
            }
        }
        return followedInstrumentCount;
    };
    GraphicalMusicSheet.prototype.GetGraphicalFromSourceMeasure = function (sourceMeasure) {
        return this.sourceToGraphicalMeasureLinks.getValue(sourceMeasure);
    };
    GraphicalMusicSheet.prototype.GetGraphicalFromSourceStaffEntry = function (sourceStaffEntry) {
        var graphicalMeasure = this.GetGraphicalFromSourceMeasure(sourceStaffEntry.VerticalContainerParent.ParentMeasure)[sourceStaffEntry.ParentStaff.idInMusicSheet];
        return graphicalMeasure.findGraphicalStaffEntryFromTimestamp(sourceStaffEntry.Timestamp);
    };
    GraphicalMusicSheet.prototype.GetGraphicalNoteFromSourceNote = function (note, containingGse) {
        for (var idx = 0, len = containingGse.notes.length; idx < len; ++idx) {
            var graphicalNotes = containingGse.notes[idx];
            for (var idx2 = 0, len2 = graphicalNotes.length; idx2 < len2; ++idx2) {
                var graphicalNote = graphicalNotes[idx2];
                if (graphicalNote.sourceNote === note) {
                    return graphicalNote;
                }
            }
        }
        return undefined;
    };
    GraphicalMusicSheet.prototype.CalculateDistance = function (pt1, pt2) {
        var deltaX = pt1.x - pt2.x;
        var deltaY = pt1.y - pt2.y;
        return (deltaX * deltaX) + (deltaY * deltaY);
    };
    GraphicalMusicSheet.prototype.getLongestStaffEntryDuration = function (index) {
        var maxLength = new fraction_1.Fraction(0, 1);
        for (var idx = 0, len = this.verticalGraphicalStaffEntryContainers[index].StaffEntries.length; idx < len; ++idx) {
            var graphicalStaffEntry = this.verticalGraphicalStaffEntryContainers[index].StaffEntries[idx];
            if (graphicalStaffEntry === undefined) {
                continue;
            }
            for (var idx2 = 0, len2 = graphicalStaffEntry.notes.length; idx2 < len2; ++idx2) {
                var graphicalNotes = graphicalStaffEntry.notes[idx2];
                for (var idx3 = 0, len3 = graphicalNotes.length; idx3 < len3; ++idx3) {
                    var note = graphicalNotes[idx3];
                    if (note.graphicalNoteLength > maxLength) {
                        maxLength = note.graphicalNoteLength;
                    }
                }
            }
        }
        return maxLength;
    };
    return GraphicalMusicSheet;
}());
exports.GraphicalMusicSheet = GraphicalMusicSheet;
var SystemImageProperties = (function () {
    function SystemImageProperties() {
    }
    return SystemImageProperties;
}());
exports.SystemImageProperties = SystemImageProperties;
