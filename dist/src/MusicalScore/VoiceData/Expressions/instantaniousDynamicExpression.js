"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var abstractExpression_1 = require("./abstractExpression");
var dynamicExpressionSymbolEnum_1 = require("./dynamicExpressionSymbolEnum");
//import {ArgumentOutOfRangeException} from "../../Exceptions";
var Exceptions_1 = require("../../Exceptions");
var Logging_1 = require("../../../Common/Logging");
var InstantaniousDynamicExpression = (function (_super) {
    __extends(InstantaniousDynamicExpression, _super);
    function InstantaniousDynamicExpression(dynamicExpression, soundDynamics, placement, staffNumber) {
        _super.call(this);
        this.dynamicEnum = DynamicEnum[dynamicExpression.toLowerCase()];
        this.soundDynamic = soundDynamics;
        this.placement = placement;
        this.staffNumber = staffNumber;
    }
    Object.defineProperty(InstantaniousDynamicExpression.prototype, "ParentMultiExpression", {
        get: function () {
            return this.multiExpression;
        },
        set: function (value) {
            this.multiExpression = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstantaniousDynamicExpression.prototype, "DynEnum", {
        get: function () {
            return this.dynamicEnum;
        },
        set: function (value) {
            this.dynamicEnum = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstantaniousDynamicExpression.prototype, "SoundDynamic", {
        get: function () {
            return this.soundDynamic;
        },
        set: function (value) {
            this.soundDynamic = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstantaniousDynamicExpression.prototype, "Placement", {
        get: function () {
            return this.placement;
        },
        set: function (value) {
            this.placement = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstantaniousDynamicExpression.prototype, "StaffNumber", {
        get: function () {
            return this.staffNumber;
        },
        set: function (value) {
            this.staffNumber = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstantaniousDynamicExpression.prototype, "Length", {
        get: function () {
            if (Math.abs(this.length) < 0.0001) {
                this.length = this.calculateLength();
            }
            return this.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstantaniousDynamicExpression.prototype, "MidiVolume", {
        get: function () {
            return InstantaniousDynamicExpression.dynamicToRelativeVolumeDict[this.dynamicEnum] * 127;
        },
        enumerable: true,
        configurable: true
    });
    InstantaniousDynamicExpression.isInputStringInstantaniousDynamic = function (inputString) {
        if (inputString === undefined) {
            return false;
        }
        return InstantaniousDynamicExpression.isStringInStringList(InstantaniousDynamicExpression.listInstantaniousDynamics, inputString);
    };
    //public getInstantaniousDynamicSymbol(expressionSymbolEnum:DynamicExpressionSymbolEnum): FontInfo.MusicFontSymbol {
    //    switch (expressionSymbolEnum) {
    //        case DynamicExpressionSymbolEnum.p:
    //            return FontInfo.MusicFontSymbol.P;
    //        case DynamicExpressionSymbolEnum.f:
    //            return FontInfo.MusicFontSymbol.F;
    //        case DynamicExpressionSymbolEnum.s:
    //            return FontInfo.MusicFontSymbol.S;
    //        case DynamicExpressionSymbolEnum.z:
    //            return FontInfo.MusicFontSymbol.Z;
    //        case DynamicExpressionSymbolEnum.m:
    //            return FontInfo.MusicFontSymbol.M;
    //        case DynamicExpressionSymbolEnum.r:
    //            return FontInfo.MusicFontSymbol.R;
    //        default:
    //            throw new ArgumentOutOfRangeException("expressionSymbolEnum");
    //    }
    //}
    InstantaniousDynamicExpression.prototype.getDynamicExpressionSymbol = function (c) {
        switch (c) {
            case "p":
                return dynamicExpressionSymbolEnum_1.DynamicExpressionSymbolEnum.p;
            case "f":
                return dynamicExpressionSymbolEnum_1.DynamicExpressionSymbolEnum.f;
            case "s":
                return dynamicExpressionSymbolEnum_1.DynamicExpressionSymbolEnum.s;
            case "z":
                return dynamicExpressionSymbolEnum_1.DynamicExpressionSymbolEnum.z;
            case "m":
                return dynamicExpressionSymbolEnum_1.DynamicExpressionSymbolEnum.m;
            case "r":
                return dynamicExpressionSymbolEnum_1.DynamicExpressionSymbolEnum.r;
            default:
                throw new Exceptions_1.InvalidEnumArgumentException("unknown DynamicExpressionSymbolEnum: " + c);
        }
    };
    InstantaniousDynamicExpression.prototype.calculateLength = function () {
        //let length: number = 0.0;
        //let dynamic: string = DynamicEnum[this.dynamicEnum];
        //for (let idx: number = 0, len: number = dynamic.length; idx < len; ++idx) {
        //    let c: string = dynamic[idx];
        //    let dynamicExpressionSymbol: DynamicExpressionSymbolEnum = this.getDynamicExpressionSymbol(c);
        //    let symbol: FontInfo.MusicFontSymbol = this.getInstantaniousDynamicSymbol(dynamicExpressionSymbol);
        //    length += FontInfo.Info.getBoundingBox(symbol).Width;
        //}
        //return length;
        Logging_1.Logging.debug("[Andrea] instantaniousDynamicExpression: not implemented: calculateLength!");
        return 0.0;
    };
    InstantaniousDynamicExpression.dynamicToRelativeVolumeDict = {
        "ffffff": (127.0 / 127.0),
        "fffff": (126.0 / 127.0),
        "ffff": 125.0 / 127.0,
        "fff": 124.0 / 127.0,
        "ff": 108.0 / 127.0,
        "f": 92.0 / 127.0,
        "mf": 76.0 / 127.0,
        "mp": 60.0 / 127.0,
        "p": 44.0 / 127.0,
        "pp": 28.0 / 127.0,
        "ppp": 12.0 / 127.0,
        "pppp": 10.0 / 127.0,
        "ppppp": 8.0 / 127.0,
        "pppppp": 6.0 / 127.0,
        "sf": 0.5,
        "sfp": 0.5,
        "sfpp": 0.5,
        "fp": 0.5,
        "rf": 0.5,
        "rfz": 0.5,
        "sfz": 0.5,
        "sffz": 0.5,
        "fz": 0.5,
    };
    //private static weight: number;
    InstantaniousDynamicExpression.listInstantaniousDynamics = [
        "pppppp", "ppppp", "pppp", "ppp", "pp", "p",
        "ffffff", "fffff", "ffff", "fff", "ff", "f",
        "mf", "mp", "sf", "sp", "spp", "fp", "rf", "rfz", "sfz", "sffz", "fz",
    ];
    return InstantaniousDynamicExpression;
}(abstractExpression_1.AbstractExpression));
exports.InstantaniousDynamicExpression = InstantaniousDynamicExpression;
(function (DynamicEnum) {
    DynamicEnum[DynamicEnum["pppppp"] = 0] = "pppppp";
    DynamicEnum[DynamicEnum["ppppp"] = 1] = "ppppp";
    DynamicEnum[DynamicEnum["pppp"] = 2] = "pppp";
    DynamicEnum[DynamicEnum["ppp"] = 3] = "ppp";
    DynamicEnum[DynamicEnum["pp"] = 4] = "pp";
    DynamicEnum[DynamicEnum["p"] = 5] = "p";
    DynamicEnum[DynamicEnum["mp"] = 6] = "mp";
    DynamicEnum[DynamicEnum["mf"] = 7] = "mf";
    DynamicEnum[DynamicEnum["f"] = 8] = "f";
    DynamicEnum[DynamicEnum["ff"] = 9] = "ff";
    DynamicEnum[DynamicEnum["fff"] = 10] = "fff";
    DynamicEnum[DynamicEnum["ffff"] = 11] = "ffff";
    DynamicEnum[DynamicEnum["fffff"] = 12] = "fffff";
    DynamicEnum[DynamicEnum["ffffff"] = 13] = "ffffff";
    DynamicEnum[DynamicEnum["sf"] = 14] = "sf";
    DynamicEnum[DynamicEnum["sfp"] = 15] = "sfp";
    DynamicEnum[DynamicEnum["sfpp"] = 16] = "sfpp";
    DynamicEnum[DynamicEnum["fp"] = 17] = "fp";
    DynamicEnum[DynamicEnum["rf"] = 18] = "rf";
    DynamicEnum[DynamicEnum["rfz"] = 19] = "rfz";
    DynamicEnum[DynamicEnum["sfz"] = 20] = "sfz";
    DynamicEnum[DynamicEnum["sffz"] = 21] = "sffz";
    DynamicEnum[DynamicEnum["fz"] = 22] = "fz";
    DynamicEnum[DynamicEnum["other"] = 23] = "other";
})(exports.DynamicEnum || (exports.DynamicEnum = {}));
var DynamicEnum = exports.DynamicEnum;
