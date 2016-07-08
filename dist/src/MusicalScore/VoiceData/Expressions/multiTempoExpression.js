"use strict";
var fraction_1 = require("../../../Common/DataObjects/fraction");
var instantaniousTempoExpression_1 = require("./instantaniousTempoExpression");
var abstractExpression_1 = require("./abstractExpression");
var FontStyles_1 = require("../../../Common/Enums/FontStyles");
var continuousTempoExpression_1 = require("./ContinuousExpressions/continuousTempoExpression");
var MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/ = (function () {
    function MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/(sourceMeasure, timestamp) {
        this.expressions = [];
        this.sourceMeasure = sourceMeasure;
        this.timestamp = timestamp;
    }
    Object.defineProperty(MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/.prototype, "Timestamp", {
        get: function () {
            return this.timestamp;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/.prototype, "AbsoluteTimestamp", {
        get: function () {
            return fraction_1.Fraction.plus(this.sourceMeasure.AbsoluteTimestamp, this.timestamp);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/.prototype, "SourceMeasureParent", {
        get: function () {
            return this.sourceMeasure;
        },
        set: function (value) {
            this.sourceMeasure = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/.prototype, "InstantaniousTempo", {
        get: function () {
            return this.instantaneousTempo;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/.prototype, "ContinuousTempo", {
        get: function () {
            return this.continuousTempo;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/.prototype, "EntriesList", {
        get: function () {
            return this.expressions;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/.prototype, "CombinedExpressionsText", {
        get: function () {
            return this.combinedExpressionsText;
        },
        set: function (value) {
            this.combinedExpressionsText = value;
        },
        enumerable: true,
        configurable: true
    });
    MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/.prototype.getPlacementOfFirstEntry = function () {
        var placement = abstractExpression_1.PlacementEnum.Above;
        if (this.expressions.length > 0) {
            if (this.expressions[0].expression instanceof instantaniousTempoExpression_1.InstantaniousTempoExpression) {
                placement = (this.expressions[0].expression).Placement;
            }
            else if (this.expressions[0].expression instanceof continuousTempoExpression_1.ContinuousTempoExpression) {
                placement = (this.expressions[0].expression).Placement;
            }
        }
        return placement;
    };
    MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/.prototype.getFontstyleOfFirstEntry = function () {
        var fontStyle = FontStyles_1.FontStyles.Regular;
        if (this.expressions[0].expression instanceof instantaniousTempoExpression_1.InstantaniousTempoExpression) {
            fontStyle = FontStyles_1.FontStyles.Bold;
        }
        else if (this.expressions[0].expression instanceof continuousTempoExpression_1.ContinuousTempoExpression) {
            fontStyle = FontStyles_1.FontStyles.Italic;
        }
        return fontStyle;
    };
    //public getFirstEntry(graphicalLabel: GraphicalLabel): AbstractGraphicalExpression {
    //    let indexOfFirstNotInstDynExpr: number = 0;
    //    if (this.expressions.length > 0) {
    //        if (this.expressions[indexOfFirstNotInstDynExpr].expression instanceof InstantaniousTempoExpression)
    //            return new GraphicalInstantaniousTempoExpression(
    // <InstantaniousTempoExpression>(this.expressions[indexOfFirstNotInstDynExpr].expression), graphicalLabel);
    //        else if (this.expressions[indexOfFirstNotInstDynExpr].expression instanceof ContinuousTempoExpression)
    //            return new GraphicalContinuousTempoExpression(
    // <ContinuousTempoExpression>(this.expressions[indexOfFirstNotInstDynExpr].expression), graphicalLabel);
    //        else return undefined;
    //    }
    //    return undefined;
    //}
    MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/.prototype.addExpression = function (abstractTempoExpression, prefix) {
        if (abstractTempoExpression instanceof instantaniousTempoExpression_1.InstantaniousTempoExpression) {
            this.instantaneousTempo = abstractTempoExpression;
        }
        else if (abstractTempoExpression instanceof continuousTempoExpression_1.ContinuousTempoExpression) {
            this.continuousTempo = abstractTempoExpression;
        }
        var tempoExpressionEntry = new TempoExpressionEntry();
        tempoExpressionEntry.prefix = prefix;
        tempoExpressionEntry.expression = abstractTempoExpression;
        tempoExpressionEntry.label = abstractTempoExpression.Label;
        this.expressions.push(tempoExpressionEntry);
    };
    MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/.prototype.CompareTo = function (other) {
        if (this.SourceMeasureParent.MeasureNumber > other.SourceMeasureParent.MeasureNumber) {
            return 1;
        }
        else if (this.SourceMeasureParent.MeasureNumber < other.SourceMeasureParent.MeasureNumber) {
            return -1;
        }
        else {
            if (this.Timestamp.RealValue > other.Timestamp.RealValue) {
                return 1;
            }
            if (this.Timestamp.RealValue < other.Timestamp.RealValue) {
                return -1;
            }
            else {
                return 0;
            }
        }
    };
    return MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/;
}());
exports.MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/ = MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/;
var TempoExpressionEntry = (function () {
    function TempoExpressionEntry() {
    }
    return TempoExpressionEntry;
}());
exports.TempoExpressionEntry = TempoExpressionEntry;
