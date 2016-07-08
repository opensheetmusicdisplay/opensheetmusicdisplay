"use strict";
var AbstractTempoExpression = (function () {
    function AbstractTempoExpression(label, placement, staffNumber, parentMultiTempoExpression) {
        this.label = label;
        this.placement = placement;
        this.staffNumber = staffNumber;
        this.parentMultiTempoExpression = parentMultiTempoExpression;
    }
    Object.defineProperty(AbstractTempoExpression.prototype, "Label", {
        get: function () {
            return this.label;
        },
        set: function (value) {
            this.label = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractTempoExpression.prototype, "Placement", {
        get: function () {
            return this.placement;
        },
        set: function (value) {
            this.placement = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractTempoExpression.prototype, "StaffNumber", {
        get: function () {
            return this.staffNumber;
        },
        set: function (value) {
            this.staffNumber = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractTempoExpression.prototype, "ParentMultiTempoExpression", {
        get: function () {
            return this.parentMultiTempoExpression;
        },
        enumerable: true,
        configurable: true
    });
    AbstractTempoExpression.isStringInStringList = function (wordsToFind, inputString) {
        for (var _i = 0, wordsToFind_1 = wordsToFind; _i < wordsToFind_1.length; _i++) {
            var wordToFind = wordsToFind_1[_i];
            if (AbstractTempoExpression.stringContainsSeparatedWord(inputString.toLowerCase().trim(), wordToFind.toLowerCase().trim())) {
                return true;
            }
        }
        return false;
    };
    AbstractTempoExpression.stringContainsSeparatedWord = function (str, word) {
        return (str === word || str.indexOf(" " + word) !== -1 || str.indexOf(word + " ") !== -1);
    };
    return AbstractTempoExpression;
}());
exports.AbstractTempoExpression = AbstractTempoExpression;
