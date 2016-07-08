"use strict";
var fraction_1 = require("../../../Common/DataObjects/fraction");
var instantaniousDynamicExpression_1 = require("./instantaniousDynamicExpression");
var continuousDynamicExpression_1 = require("./ContinuousExpressions/continuousDynamicExpression");
var moodExpression_1 = require("./moodExpression");
var unknownExpression_1 = require("./unknownExpression");
var abstractExpression_1 = require("./abstractExpression");
var MultiExpression /*implements IComparable<MultiExpression>*/ = (function () {
    function MultiExpression /*implements IComparable<MultiExpression>*/(sourceMeasure, timestamp) {
        this.unknownList = [];
        this.moodList = [];
        this.expressions = [];
        this.sourceMeasure = sourceMeasure;
        this.timestamp = timestamp;
    }
    Object.defineProperty(MultiExpression /*implements IComparable<MultiExpression>*/.prototype, "SourceMeasureParent", {
        get: function () {
            return this.sourceMeasure;
        },
        set: function (value) {
            this.sourceMeasure = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiExpression /*implements IComparable<MultiExpression>*/.prototype, "StaffNumber", {
        get: function () {
            return this.staffNumber;
        },
        set: function (value) {
            this.staffNumber = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiExpression /*implements IComparable<MultiExpression>*/.prototype, "Timestamp", {
        get: function () {
            return this.timestamp;
        },
        set: function (value) {
            this.timestamp = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiExpression /*implements IComparable<MultiExpression>*/.prototype, "AbsoluteTimestamp", {
        get: function () {
            return fraction_1.Fraction.plus(this.timestamp, this.sourceMeasure.AbsoluteTimestamp);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiExpression /*implements IComparable<MultiExpression>*/.prototype, "InstantaniousDynamic", {
        get: function () {
            return this.instantaniousDynamic;
        },
        set: function (value) {
            this.instantaniousDynamic = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiExpression /*implements IComparable<MultiExpression>*/.prototype, "EndingContinuousDynamic", {
        get: function () {
            return this.endingContinuousDynamic;
        },
        set: function (value) {
            this.endingContinuousDynamic = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiExpression /*implements IComparable<MultiExpression>*/.prototype, "StartingContinuousDynamic", {
        get: function () {
            return this.startingContinuousDynamic;
        },
        set: function (value) {
            this.startingContinuousDynamic = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiExpression /*implements IComparable<MultiExpression>*/.prototype, "MoodList", {
        get: function () {
            return this.moodList;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiExpression /*implements IComparable<MultiExpression>*/.prototype, "UnknownList", {
        get: function () {
            return this.unknownList;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiExpression /*implements IComparable<MultiExpression>*/.prototype, "EntriesList", {
        get: function () {
            return this.expressions;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiExpression /*implements IComparable<MultiExpression>*/.prototype, "OctaveShiftStart", {
        get: function () {
            return this.octaveShiftStart;
        },
        set: function (value) {
            this.octaveShiftStart = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiExpression /*implements IComparable<MultiExpression>*/.prototype, "OctaveShiftEnd", {
        get: function () {
            return this.octaveShiftEnd;
        },
        set: function (value) {
            this.octaveShiftEnd = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MultiExpression /*implements IComparable<MultiExpression>*/.prototype, "CombinedExpressionsText", {
        get: function () {
            return this.combinedExpressionsText;
        },
        set: function (value) {
            this.combinedExpressionsText = value;
        },
        enumerable: true,
        configurable: true
    });
    MultiExpression /*implements IComparable<MultiExpression>*/.prototype.getPlacementOfFirstEntry = function () {
        var placement = abstractExpression_1.PlacementEnum.Above;
        if (this.expressions.length > 0) {
            if (this.expressions[0].expression instanceof instantaniousDynamicExpression_1.InstantaniousDynamicExpression) {
                placement = (this.expressions[0].expression).Placement;
            }
            else if (this.expressions[0].expression instanceof continuousDynamicExpression_1.ContinuousDynamicExpression) {
                placement = (this.expressions[0].expression).Placement;
            }
            else if (this.expressions[0].expression instanceof moodExpression_1.MoodExpression) {
                placement = (this.expressions[0].expression).Placement;
            }
            else if (this.expressions[0].expression instanceof unknownExpression_1.UnknownExpression) {
                placement = (this.expressions[0].expression).Placement;
            }
        }
        return placement;
    };
    // (*)
    //public getFontstyleOfFirstEntry(): PSFontStyles {
    //    let fontStyle: PSFontStyles = PSFontStyles.Regular;
    //    if (this.expressions.length > 0) {
    //        if (this.expressions[0].expression instanceof ContinuousDynamicExpression)
    //            fontStyle = PSFontStyles.Italic;
    //        else if (this.expressions[0].expression instanceof MoodExpression)
    //            fontStyle = PSFontStyles.Italic;
    //        else if (this.expressions[0].expression instanceof UnknownExpression)
    //            fontStyle = PSFontStyles.Regular;
    //    }
    //    return fontStyle;
    //}
    //public getFirstEntry(staffLine: StaffLine, graphLabel: GraphicalLabel): AbstractGraphicalExpression {
    //    let indexOfFirstNotInstDynExpr: number = 0;
    //    if (this.expressions[0].expression instanceof InstantaniousDynamicExpression)
    //        indexOfFirstNotInstDynExpr = 1;
    //    if (this.expressions.length > 0) {
    //        if (this.expressions[indexOfFirstNotInstDynExpr].expression instanceof ContinuousDynamicExpression)
    //            return new GraphicalContinuousDynamicExpression(
    // <ContinuousDynamicExpression>(this.expressions[indexOfFirstNotInstDynExpr].expression), graphLabel);
    //        else if (this.expressions[indexOfFirstNotInstDynExpr].expression instanceof MoodExpression)
    //            return new GraphicalMoodExpression(<MoodExpression>(this.expressions[indexOfFirstNotInstDynExpr].expression), graphLabel);
    //        else if (this.expressions[indexOfFirstNotInstDynExpr].expression instanceof UnknownExpression)
    //            return new GraphicalUnknownExpression(<UnknownExpression>(this.expressions[indexOfFirstNotInstDynExpr].expression), graphLabel);
    //        else return undefined;
    //    }
    //    else return undefined;
    //}
    MultiExpression /*implements IComparable<MultiExpression>*/.prototype.addExpression = function (abstractExpression, prefix) {
        if (abstractExpression instanceof instantaniousDynamicExpression_1.InstantaniousDynamicExpression) {
            if (this.instantaniousDynamic !== undefined) {
                this.removeExpressionFromEntryList(this.InstantaniousDynamic);
            }
            this.instantaniousDynamic = abstractExpression;
            this.instantaniousDynamic.ParentMultiExpression = this;
        }
        else if (abstractExpression instanceof continuousDynamicExpression_1.ContinuousDynamicExpression) {
            this.startingContinuousDynamic = abstractExpression;
        }
        else if (abstractExpression instanceof moodExpression_1.MoodExpression) {
            this.moodList.push(abstractExpression);
        }
        else if (abstractExpression instanceof unknownExpression_1.UnknownExpression) {
            this.unknownList.push(abstractExpression);
        }
        this.addExpressionToEntryList(abstractExpression, prefix);
    };
    MultiExpression /*implements IComparable<MultiExpression>*/.prototype.CompareTo = function (other) {
        if (this.SourceMeasureParent.MeasureNumber > other.SourceMeasureParent.MeasureNumber) {
            return 1;
        }
        if (this.SourceMeasureParent.MeasureNumber < other.SourceMeasureParent.MeasureNumber) {
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
    MultiExpression /*implements IComparable<MultiExpression>*/.prototype.addExpressionToEntryList = function (expression, prefix) {
        var multiExpressionEntry = new MultiExpressionEntry();
        multiExpressionEntry.prefix = prefix;
        multiExpressionEntry.expression = expression;
        if (expression instanceof continuousDynamicExpression_1.ContinuousDynamicExpression) {
            multiExpressionEntry.label = (expression).Label;
        }
        else if (expression instanceof moodExpression_1.MoodExpression) {
            multiExpressionEntry.label = (expression).Label;
        }
        else if (expression instanceof unknownExpression_1.UnknownExpression) {
            multiExpressionEntry.label = (expression).Label;
        }
        else {
            multiExpressionEntry.label = "";
        }
        this.expressions.push(multiExpressionEntry);
    };
    MultiExpression /*implements IComparable<MultiExpression>*/.prototype.removeExpressionFromEntryList = function (expression) {
        for (var idx = 0, len = this.expressions.length; idx < len; ++idx) {
            var entry = this.expressions[idx];
            if (entry.expression === expression) {
                this.expressions.splice(idx, 1);
                break;
            }
        }
    };
    return MultiExpression /*implements IComparable<MultiExpression>*/;
}());
exports.MultiExpression /*implements IComparable<MultiExpression>*/ = MultiExpression /*implements IComparable<MultiExpression>*/;
var MultiExpressionEntry = (function () {
    function MultiExpressionEntry() {
    }
    return MultiExpressionEntry;
}());
exports.MultiExpressionEntry = MultiExpressionEntry;
