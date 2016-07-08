"use strict";
var AbstractExpression = (function () {
    function AbstractExpression() {
    }
    //constructor() {
    //
    //}
    AbstractExpression.isStringInStringList = function (stringList, inputString) {
        for (var idx = 0, len = stringList.length; idx < len; ++idx) {
            var s = stringList[idx];
            if (inputString.toLowerCase() === s.toLowerCase().trim()) {
                return true;
            }
        }
        return false;
    };
    return AbstractExpression;
}());
exports.AbstractExpression = AbstractExpression;
(function (PlacementEnum) {
    PlacementEnum[PlacementEnum["Above"] = 0] = "Above";
    PlacementEnum[PlacementEnum["Below"] = 1] = "Below";
    PlacementEnum[PlacementEnum["NotYetDefined"] = 2] = "NotYetDefined";
})(exports.PlacementEnum || (exports.PlacementEnum = {}));
var PlacementEnum = exports.PlacementEnum;
