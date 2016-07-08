"use strict";
var continuousDynamicExpression_1 = require("../Expressions/ContinuousExpressions/continuousDynamicExpression");
var instantaniousDynamicExpression_1 = require("../Expressions/instantaniousDynamicExpression");
var DynamicsContainer /*implements IComparable<DynamicsContainer>*/ = (function () {
    function DynamicsContainer /*implements IComparable<DynamicsContainer>*/(dynamicExpression, staffNumber) {
        if (dynamicExpression instanceof continuousDynamicExpression_1.ContinuousDynamicExpression) {
            this.continuousDynamicExpression = dynamicExpression;
        }
        else if (dynamicExpression instanceof instantaniousDynamicExpression_1.InstantaniousDynamicExpression) {
            this.instantaneousDynamicExpression = dynamicExpression;
        }
        this.staffNumber = staffNumber;
    }
    DynamicsContainer /*implements IComparable<DynamicsContainer>*/.prototype.parMultiExpression = function () {
        if (this.continuousDynamicExpression !== undefined) {
            return this.continuousDynamicExpression.StartMultiExpression;
        }
        if (this.instantaneousDynamicExpression !== undefined) {
            return this.instantaneousDynamicExpression.ParentMultiExpression;
        }
        return undefined;
    };
    DynamicsContainer /*implements IComparable<DynamicsContainer>*/.prototype.CompareTo = function (other) {
        return this.parMultiExpression().AbsoluteTimestamp.CompareTo(other.parMultiExpression().AbsoluteTimestamp);
    };
    return DynamicsContainer /*implements IComparable<DynamicsContainer>*/;
}());
exports.DynamicsContainer /*implements IComparable<DynamicsContainer>*/ = DynamicsContainer /*implements IComparable<DynamicsContainer>*/;
