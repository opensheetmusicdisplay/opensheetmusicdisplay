"use strict";
var BoundingBox_1 = require("./BoundingBox");
var DrawingEnums_1 = require("./DrawingEnums");
var DrawingParameters_1 = require("./DrawingParameters");
var GraphicalLine_1 = require("./GraphicalLine");
var RectangleF2D_1 = require("../../Common/DataObjects/RectangleF2D");
var PointF2D_1 = require("../../Common/DataObjects/PointF2D");
var TextAlignment_1 = require("../../Common/Enums/TextAlignment");
var Exceptions_1 = require("../Exceptions");
var MusicSymbol_1 = require("./MusicSymbol");
var DrawingMode_1 = require("./DrawingMode");
var MusicSheetDrawer = (function () {
    function MusicSheetDrawer(textMeasurer, isPreviewImageDrawer) {
        if (isPreviewImageDrawer === void 0) { isPreviewImageDrawer = false; }
        this.drawingParameters = new DrawingParameters_1.DrawingParameters();
        this.phonicScoreMode = DrawingMode_1.PhonicScoreModes.Manual;
        this.textMeasurer = textMeasurer;
        this.splitScreenLineColor = -1;
        if (isPreviewImageDrawer) {
            this.drawingParameters.setForThumbmail();
        }
        else {
            this.drawingParameters.setForAllOn();
        }
    }
    Object.defineProperty(MusicSheetDrawer.prototype, "Mode", {
        set: function (value) {
            this.phonicScoreMode = value;
        },
        enumerable: true,
        configurable: true
    });
    MusicSheetDrawer.prototype.drawSheet = function (graphicalMusicSheet) {
        this.graphicalMusicSheet = graphicalMusicSheet;
        this.rules = graphicalMusicSheet.ParentMusicSheet.Rules;
        this.drawSplitScreenLine();
        if (this.drawingParameters.drawCursors) {
            for (var _i = 0, _a = graphicalMusicSheet.Cursors; _i < _a.length; _i++) {
                var line = _a[_i];
                var psi = new BoundingBox_1.BoundingBox(line);
                psi.AbsolutePosition = line.Start;
                psi.BorderBottom = line.End.y - line.Start.y;
                psi.BorderRight = line.Width / 2.0;
                psi.BorderLeft = -line.Width / 2.0;
                if (this.isVisible(psi)) {
                    this.drawLineAsVerticalRectangle(line, DrawingEnums_1.GraphicalLayers.Cursor);
                }
            }
        }
        if (this.drawingParameters.drawScrollIndicator) {
            this.drawScrollIndicator();
        }
        for (var _b = 0, _c = this.graphicalMusicSheet.MusicPages; _b < _c.length; _b++) {
            var page = _c[_b];
            this.drawPage(page);
        }
    };
    MusicSheetDrawer.prototype.drawLineAsHorizontalRectangle = function (line, layer) {
        var rectangle = new RectangleF2D_1.RectangleF2D(line.Start.x, line.End.y - line.Width / 2, line.End.x - line.Start.x, line.Width);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, line.styleId);
    };
    MusicSheetDrawer.prototype.drawLineAsVerticalRectangle = function (line, layer) {
        var lineStart = line.Start;
        var lineWidth = line.Width;
        var rectangle = new RectangleF2D_1.RectangleF2D(lineStart.x - lineWidth / 2, lineStart.y, lineWidth, line.End.y - lineStart.y);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, line.styleId);
    };
    MusicSheetDrawer.prototype.drawLineAsHorizontalRectangleWithOffset = function (line, offset, layer) {
        var start = new PointF2D_1.PointF2D(line.Start.x + offset.x, line.Start.y + offset.y);
        var end = new PointF2D_1.PointF2D(line.End.x + offset.x, line.End.y + offset.y);
        var width = line.Width;
        var rectangle = new RectangleF2D_1.RectangleF2D(start.x, end.y - width / 2, end.x - start.x, width);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, line.styleId);
    };
    MusicSheetDrawer.prototype.drawLineAsVerticalRectangleWithOffset = function (line, offset, layer) {
        var start = new PointF2D_1.PointF2D(line.Start.x + offset.x, line.Start.y + offset.y);
        var end = new PointF2D_1.PointF2D(line.End.x + offset.x, line.End.y + offset.y);
        var width = line.Width;
        var rectangle = new RectangleF2D_1.RectangleF2D(start.x, start.y, width, end.y - start.y);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, line.styleId);
    };
    MusicSheetDrawer.prototype.drawRectangle = function (rect, layer) {
        var psi = rect.PositionAndShape;
        var rectangle = new RectangleF2D_1.RectangleF2D(psi.AbsolutePosition.x, psi.AbsolutePosition.y, psi.BorderRight, psi.BorderBottom);
        rectangle = this.applyScreenTransformationForRect(rectangle);
        this.renderRectangle(rectangle, layer, rect.style);
    };
    MusicSheetDrawer.prototype.calculatePixelDistance = function (unitDistance) {
        throw new Error("not implemented");
    };
    MusicSheetDrawer.prototype.drawLabel = function (graphicalLabel, layer) {
        if (!this.isVisible(graphicalLabel.PositionAndShape)) {
            return;
        }
        var label = graphicalLabel.Label;
        if (label.text.trim() === "") {
            return;
        }
        var screenPosition = this.applyScreenTransformation(graphicalLabel.PositionAndShape.AbsolutePosition);
        var heightInPixel = this.calculatePixelDistance(label.fontHeight);
        var widthInPixel = heightInPixel * this.textMeasurer.computeTextWidthToHeightRatio(label.text, label.font, label.fontStyle);
        var bitmapWidth = Math.ceil(widthInPixel);
        var bitmapHeight = Math.ceil(heightInPixel * 1.2);
        switch (label.textAlignment) {
            case TextAlignment_1.TextAlignment.LeftTop:
                break;
            case TextAlignment_1.TextAlignment.LeftCenter:
                screenPosition.y -= bitmapHeight / 2;
                break;
            case TextAlignment_1.TextAlignment.LeftBottom:
                screenPosition.y -= bitmapHeight;
                break;
            case TextAlignment_1.TextAlignment.CenterTop:
                screenPosition.x -= bitmapWidth / 2;
                break;
            case TextAlignment_1.TextAlignment.CenterCenter:
                screenPosition.x -= bitmapWidth / 2;
                screenPosition.y -= bitmapHeight / 2;
                break;
            case TextAlignment_1.TextAlignment.CenterBottom:
                screenPosition.x -= bitmapWidth / 2;
                screenPosition.y -= bitmapHeight;
                break;
            case TextAlignment_1.TextAlignment.RightTop:
                screenPosition.x -= bitmapWidth;
                break;
            case TextAlignment_1.TextAlignment.RightCenter:
                screenPosition.x -= bitmapWidth;
                screenPosition.y -= bitmapHeight / 2;
                break;
            case TextAlignment_1.TextAlignment.RightBottom:
                screenPosition.x -= bitmapWidth;
                screenPosition.y -= bitmapHeight;
                break;
            default:
                throw new Exceptions_1.ArgumentOutOfRangeException("");
        }
        this.renderLabel(graphicalLabel, layer, bitmapWidth, bitmapHeight, heightInPixel, screenPosition);
    };
    MusicSheetDrawer.prototype.applyScreenTransformation = function (point) {
        throw new Error("not implemented");
    };
    MusicSheetDrawer.prototype.applyScreenTransformations = function (points) {
        var transformedPoints = [];
        for (var _i = 0, points_1 = points; _i < points_1.length; _i++) {
            var point = points_1[_i];
            transformedPoints.push(this.applyScreenTransformation(point));
        }
        return transformedPoints;
    };
    MusicSheetDrawer.prototype.applyScreenTransformationForRect = function (rectangle) {
        throw new Error("not implemented");
    };
    MusicSheetDrawer.prototype.drawSplitScreenLine = function () {
        // empty
    };
    MusicSheetDrawer.prototype.renderRectangle = function (rectangle, layer, styleId) {
        throw new Error("not implemented");
    };
    MusicSheetDrawer.prototype.drawScrollIndicator = function () {
        // empty
    };
    MusicSheetDrawer.prototype.drawSelectionStartSymbol = function (symbol) {
        // empty
    };
    MusicSheetDrawer.prototype.drawSelectionEndSymbol = function (symbol) {
        // empty
    };
    MusicSheetDrawer.prototype.renderLabel = function (graphicalLabel, layer, bitmapWidth, bitmapHeight, heightInPixel, screenPosition) {
        throw new Error("not implemented");
    };
    MusicSheetDrawer.prototype.renderSystemToScreen = function (system, systemBoundingBoxInPixels, absBoundingRectWithMargin) {
        // empty
    };
    MusicSheetDrawer.prototype.drawMeasure = function (measure) {
        throw new Error("not implemented");
    };
    MusicSheetDrawer.prototype.drawSkyLine = function (staffLine) {
        // empty
    };
    MusicSheetDrawer.prototype.drawBottomLine = function (staffLine) {
        // empty
    };
    MusicSheetDrawer.prototype.drawInstrumentBracket = function (bracket, system) {
        // empty
    };
    MusicSheetDrawer.prototype.drawGroupBracket = function (bracket, system) {
        // empty
    };
    MusicSheetDrawer.prototype.isVisible = function (psi) {
        return true;
    };
    MusicSheetDrawer.prototype.drawMusicSystem = function (system) {
        var absBoundingRectWithMargin = this.getSystemAbsBoundingRect(system);
        var systemBoundingBoxInPixels = this.getSytemBoundingBoxInPixels(absBoundingRectWithMargin);
        this.drawMusicSystemComponents(system, systemBoundingBoxInPixels, absBoundingRectWithMargin);
    };
    MusicSheetDrawer.prototype.getSytemBoundingBoxInPixels = function (absBoundingRectWithMargin) {
        var systemBoundingBoxInPixels = this.applyScreenTransformationForRect(absBoundingRectWithMargin);
        systemBoundingBoxInPixels.x = Math.round(systemBoundingBoxInPixels.x);
        systemBoundingBoxInPixels.y = Math.round(systemBoundingBoxInPixels.y);
        return systemBoundingBoxInPixels;
    };
    MusicSheetDrawer.prototype.getSystemAbsBoundingRect = function (system) {
        var relBoundingRect = system.PositionAndShape.BoundingRectangle;
        var absBoundingRectWithMargin = new RectangleF2D_1.RectangleF2D(system.PositionAndShape.AbsolutePosition.x + system.PositionAndShape.BorderLeft - 1, system.PositionAndShape.AbsolutePosition.y + system.PositionAndShape.BorderTop - 1, (relBoundingRect.width + 6), (relBoundingRect.height + 2));
        return absBoundingRectWithMargin;
    };
    MusicSheetDrawer.prototype.drawMusicSystemComponents = function (musicSystem, systemBoundingBoxInPixels, absBoundingRectWithMargin) {
        var selectStartSymb = this.graphicalMusicSheet.SelectionStartSymbol;
        var selectEndSymb = this.graphicalMusicSheet.SelectionEndSymbol;
        if (this.drawingParameters.drawSelectionStartSymbol) {
            if (selectStartSymb !== undefined && this.isVisible(selectStartSymb.PositionAndShape)) {
                this.drawSelectionStartSymbol(selectStartSymb);
            }
        }
        if (this.drawingParameters.drawSelectionEndSymbol) {
            if (selectEndSymb !== undefined && this.isVisible(selectEndSymb.PositionAndShape)) {
                this.drawSelectionEndSymbol(selectEndSymb);
            }
        }
        for (var _i = 0, _a = musicSystem.StaffLines; _i < _a.length; _i++) {
            var staffLine = _a[_i];
            this.drawStaffLine(staffLine);
        }
        for (var _b = 0, _c = musicSystem.SystemLines; _b < _c.length; _b++) {
            var systemLine = _c[_b];
            this.drawSystemLineObject(systemLine);
        }
        if (musicSystem === musicSystem.Parent.MusicSystems[0] && musicSystem.Parent === musicSystem.Parent.Parent.MusicPages[0]) {
            for (var _d = 0, _e = musicSystem.Labels; _d < _e.length; _d++) {
                var label = _e[_d];
                this.drawLabel(label, DrawingEnums_1.GraphicalLayers.Notes);
            }
        }
        for (var _f = 0, _g = musicSystem.InstrumentBrackets; _f < _g.length; _f++) {
            var bracket = _g[_f];
            this.drawInstrumentBracket(bracket, musicSystem);
        }
        for (var _h = 0, _j = musicSystem.GroupBrackets; _h < _j.length; _h++) {
            var bracket = _j[_h];
            this.drawGroupBracket(bracket, musicSystem);
        }
        if (!this.leadSheet) {
            for (var _k = 0, _l = musicSystem.MeasureNumberLabels; _k < _l.length; _k++) {
                var measureNumberLabel = _l[_k];
                this.drawLabel(measureNumberLabel, DrawingEnums_1.GraphicalLayers.Notes);
            }
        }
        for (var _m = 0, _o = musicSystem.StaffLines; _m < _o.length; _m++) {
            var staffLine = _o[_m];
            this.drawStaffLineSymbols(staffLine);
        }
        if (this.drawingParameters.drawMarkedAreas) {
            this.drawMarkedAreas(musicSystem);
        }
        if (this.drawingParameters.drawComments) {
            this.drawComment(musicSystem);
        }
    };
    MusicSheetDrawer.prototype.activateSystemRendering = function (systemId, absBoundingRect, systemBoundingBoxInPixels, createNewImage) {
        return true;
    };
    MusicSheetDrawer.prototype.drawSystemLineObject = function (systemLine) {
        // empty
    };
    MusicSheetDrawer.prototype.drawStaffLine = function (staffLine) {
        for (var _i = 0, _a = staffLine.Measures; _i < _a.length; _i++) {
            var measure = _a[_i];
            this.drawMeasure(measure);
        }
    };
    // protected drawSlur(slur: GraphicalSlur, abs: PointF2D): void {
    //
    // }
    MusicSheetDrawer.prototype.drawOctaveShift = function (staffLine, graphicalOctaveShift) {
        this.drawSymbol(graphicalOctaveShift.octaveSymbol, DrawingMode_1.MusicSymbolDrawingStyle.Normal, graphicalOctaveShift.PositionAndShape.AbsolutePosition);
        var absolutePos = staffLine.PositionAndShape.AbsolutePosition;
        if (graphicalOctaveShift.dashesStart.x < graphicalOctaveShift.dashesEnd.x) {
            var horizontalLine = new GraphicalLine_1.GraphicalLine(graphicalOctaveShift.dashesStart, graphicalOctaveShift.dashesEnd, this.rules.OctaveShiftLineWidth);
            this.drawLineAsHorizontalRectangleWithOffset(horizontalLine, absolutePos, DrawingEnums_1.GraphicalLayers.Notes);
        }
        if (!graphicalOctaveShift.endsOnDifferentStaffLine || graphicalOctaveShift.isSecondPart) {
            var verticalLine = void 0;
            var dashEnd = graphicalOctaveShift.dashesEnd;
            var octShiftVertLineLength = this.rules.OctaveShiftVerticalLineLength;
            var octShiftLineWidth = this.rules.OctaveShiftLineWidth;
            if (graphicalOctaveShift.octaveSymbol === MusicSymbol_1.MusicSymbol.VA8 || graphicalOctaveShift.octaveSymbol === MusicSymbol_1.MusicSymbol.MA15) {
                verticalLine = new GraphicalLine_1.GraphicalLine(dashEnd, new PointF2D_1.PointF2D(dashEnd.x, dashEnd.y + octShiftVertLineLength), octShiftLineWidth);
            }
            else {
                verticalLine = new GraphicalLine_1.GraphicalLine(new PointF2D_1.PointF2D(dashEnd.x, dashEnd.y - octShiftVertLineLength), dashEnd, octShiftLineWidth);
            }
            this.drawLineAsVerticalRectangleWithOffset(verticalLine, absolutePos, DrawingEnums_1.GraphicalLayers.Notes);
        }
    };
    MusicSheetDrawer.prototype.drawStaffLines = function (staffLine) {
        if (staffLine.StaffLines !== undefined) {
            var position = staffLine.PositionAndShape.AbsolutePosition;
            for (var i = 0; i < 5; i++) {
                this.drawLineAsHorizontalRectangleWithOffset(staffLine.StaffLines[i], position, DrawingEnums_1.GraphicalLayers.Notes);
            }
        }
    };
    // protected drawEnding(ending: GraphicalRepetitionEnding, absolutePosition: PointF2D): void {
    //     if (undefined !== ending.Left)
    //         drawLineAsVerticalRectangle(ending.Left, absolutePosition, <number>GraphicalLayers.Notes);
    //     this.drawLineAsHorizontalRectangle(ending.Top, absolutePosition, <number>GraphicalLayers.Notes);
    //     if (undefined !== ending.Right)
    //         drawLineAsVerticalRectangle(ending.Right, absolutePosition, <number>GraphicalLayers.Notes);
    //     this.drawLabel(ending.Label, <number>GraphicalLayers.Notes);
    // }
    // protected drawInstantaniousDynamic(expression: GraphicalInstantaniousDynamicExpression): void {
    //     expression.ExpressionSymbols.forEach(function (expressionSymbol) {
    //         let position: PointF2D = expressionSymbol.PositionAndShape.AbsolutePosition;
    //         let symbol: MusicSymbol = expressionSymbol.GetSymbol;
    //         drawSymbol(symbol, MusicSymbolDrawingStyle.Normal, position);
    //     });
    // }
    // protected drawContinuousDynamic(expression: GraphicalContinuousDynamicExpression,
    //     absolute: PointF2D): void {
    //     throw new Error("not implemented");
    // }
    MusicSheetDrawer.prototype.drawSymbol = function (symbol, symbolStyle, position, scalingFactor, layer) {
        if (scalingFactor === void 0) { scalingFactor = 1; }
        if (layer === void 0) { layer = DrawingEnums_1.GraphicalLayers.Notes; }
        //empty
    };
    Object.defineProperty(MusicSheetDrawer.prototype, "leadSheet", {
        get: function () {
            return this.graphicalMusicSheet.LeadSheet;
        },
        set: function (value) {
            this.graphicalMusicSheet.LeadSheet = value;
        },
        enumerable: true,
        configurable: true
    });
    MusicSheetDrawer.prototype.drawPage = function (page) {
        if (!this.isVisible(page.PositionAndShape)) {
            return;
        }
        for (var _i = 0, _a = page.MusicSystems; _i < _a.length; _i++) {
            var system = _a[_i];
            if (this.isVisible(system.PositionAndShape)) {
                this.drawMusicSystem(system);
            }
        }
        if (page === page.Parent.MusicPages[0]) {
            for (var _b = 0, _c = page.Labels; _b < _c.length; _b++) {
                var label = _c[_b];
                this.drawLabel(label, DrawingEnums_1.GraphicalLayers.Notes);
            }
        }
    };
    MusicSheetDrawer.prototype.drawMarkedAreas = function (system) {
        for (var _i = 0, _a = system.GraphicalMarkedAreas; _i < _a.length; _i++) {
            var markedArea = _a[_i];
            if (markedArea !== undefined) {
                if (markedArea.systemRectangle !== undefined) {
                    this.drawRectangle(markedArea.systemRectangle, DrawingEnums_1.GraphicalLayers.Background);
                }
                if (markedArea.settings !== undefined) {
                    this.drawLabel(markedArea.settings, DrawingEnums_1.GraphicalLayers.Comment);
                }
                if (markedArea.labelRectangle !== undefined) {
                    this.drawRectangle(markedArea.labelRectangle, DrawingEnums_1.GraphicalLayers.Background);
                }
                if (markedArea.label !== undefined) {
                    this.drawLabel(markedArea.label, DrawingEnums_1.GraphicalLayers.Comment);
                }
            }
        }
    };
    MusicSheetDrawer.prototype.drawComment = function (system) {
        for (var _i = 0, _a = system.GraphicalComments; _i < _a.length; _i++) {
            var comment = _a[_i];
            if (comment !== undefined) {
                if (comment.settings !== undefined) {
                    this.drawLabel(comment.settings, DrawingEnums_1.GraphicalLayers.Comment);
                }
                if (comment.label !== undefined) {
                    this.drawLabel(comment.label, DrawingEnums_1.GraphicalLayers.Comment);
                }
            }
        }
    };
    MusicSheetDrawer.prototype.drawStaffLineSymbols = function (staffLine) {
        var parentInst = staffLine.ParentStaff.ParentInstrument;
        var absX = staffLine.PositionAndShape.AbsolutePosition.x;
        var absY = staffLine.PositionAndShape.AbsolutePosition.y + 2;
        var borderRight = staffLine.PositionAndShape.BorderRight;
        if (parentInst.highlight && this.drawingParameters.drawHighlights) {
            this.drawLineAsHorizontalRectangle(new GraphicalLine_1.GraphicalLine(new PointF2D_1.PointF2D(absX, absY), new PointF2D_1.PointF2D(absX + borderRight, absY), 4, DrawingEnums_1.OutlineAndFillStyleEnum.Highlighted), DrawingEnums_1.GraphicalLayers.Highlight);
        }
        var style = DrawingMode_1.MusicSymbolDrawingStyle.Disabled;
        var symbol = MusicSymbol_1.MusicSymbol.PLAY;
        var drawSymbols = this.drawingParameters.drawActivitySymbols;
        switch (this.phonicScoreMode) {
            case DrawingMode_1.PhonicScoreModes.Midi:
                symbol = MusicSymbol_1.MusicSymbol.PLAY;
                if (this.midiPlaybackAvailable && staffLine.ParentStaff.audible) {
                    style = DrawingMode_1.MusicSymbolDrawingStyle.PlaybackSymbols;
                }
                break;
            case DrawingMode_1.PhonicScoreModes.Following:
                symbol = MusicSymbol_1.MusicSymbol.MIC;
                if (staffLine.ParentStaff.following) {
                    style = DrawingMode_1.MusicSymbolDrawingStyle.FollowSymbols;
                }
                break;
            default:
                drawSymbols = false;
                break;
        }
        if (drawSymbols) {
            var p = new PointF2D_1.PointF2D(absX + borderRight + 2, absY);
            this.drawSymbol(symbol, style, p);
        }
        if (this.drawingParameters.drawErrors) {
            for (var _i = 0, _a = staffLine.Measures; _i < _a.length; _i++) {
                var measure = _a[_i];
                var measurePSI = measure.PositionAndShape;
                var absXPSI = measurePSI.AbsolutePosition.x;
                var absYPSI = measurePSI.AbsolutePosition.y + 2;
                if (measure.hasError && this.graphicalMusicSheet.ParentMusicSheet.DrawErroneousMeasures) {
                    this.drawLineAsHorizontalRectangle(new GraphicalLine_1.GraphicalLine(new PointF2D_1.PointF2D(absXPSI, absYPSI), new PointF2D_1.PointF2D(absXPSI + measurePSI.BorderRight, absYPSI), 4, DrawingEnums_1.OutlineAndFillStyleEnum.ErrorUnderlay), DrawingEnums_1.GraphicalLayers.MeasureError);
                }
            }
        }
    };
    return MusicSheetDrawer;
}());
exports.MusicSheetDrawer = MusicSheetDrawer;
