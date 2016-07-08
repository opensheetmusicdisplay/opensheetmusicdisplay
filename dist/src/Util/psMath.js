"use strict";
var PSMath = (function () {
    function PSMath() {
    }
    PSMath.log = function (base, x) {
        return Math.log(x) / Math.log(base);
    };
    PSMath.log10 = function (x) {
        return PSMath.log(10, x);
    };
    PSMath.meanSimple = function (values) {
        var sum = 0;
        for (var i = 0; i < values.length; i++) {
            sum += values[i];
        }
        return sum / values.length;
    };
    PSMath.meanWeighted = function (values, weights) {
        if (values.length !== weights.length || values.length === 0) {
            return 0;
        }
        var sumWeigtedValues = 0;
        var sumWeights = 0;
        for (var i = 0; i < values.length; i++) {
            var weight = weights[i];
            sumWeigtedValues += values[i] * weight;
            sumWeights += weight;
        }
        return (sumWeigtedValues / sumWeights);
    };
    return PSMath;
}());
exports.PSMath = PSMath;
