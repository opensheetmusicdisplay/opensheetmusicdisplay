"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var abstractExpression_1 = require("./abstractExpression");
var TextAlignment_1 = require("../../../Common/Enums/TextAlignment");
var UnknownExpression = (function (_super) {
    __extends(UnknownExpression, _super);
    //constructor(label: string, placementEnum: PlacementEnum, staffNumber: number) {
    //    this(label, placementEnum, OSMDTextAlignment.LeftBottom, staffNumber);
    //
    //}
    function UnknownExpression(label, placementEnum, textAlignment, staffNumber) {
        _super.call(this);
        this.label = label;
        this.placement = placementEnum;
        this.staffNumber = staffNumber;
        if (textAlignment === undefined) {
            textAlignment = TextAlignment_1.TextAlignment.LeftBottom;
        }
        this.textAlignment = textAlignment;
    }
    Object.defineProperty(UnknownExpression.prototype, "Label", {
        get: function () {
            return this.label;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(UnknownExpression.prototype, "Placement", {
        get: function () {
            return this.placement;
        },
        set: function (value) {
            this.placement = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(UnknownExpression.prototype, "StaffNumber", {
        get: function () {
            return this.staffNumber;
        },
        set: function (value) {
            this.staffNumber = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(UnknownExpression.prototype, "TextAlignment", {
        get: function () {
            return this.textAlignment;
        },
        enumerable: true,
        configurable: true
    });
    return UnknownExpression;
}(abstractExpression_1.AbstractExpression));
exports.UnknownExpression = UnknownExpression;
