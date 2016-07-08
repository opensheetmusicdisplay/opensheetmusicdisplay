"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BoundingBox_1 = require("./BoundingBox");
var GraphicalObject_1 = require("./GraphicalObject");
var PointF2D_1 = require("../../Common/DataObjects/PointF2D");
var GraphicalMusicPage = (function (_super) {
    __extends(GraphicalMusicPage, _super);
    function GraphicalMusicPage(parent) {
        _super.call(this);
        this.musicSystems = [];
        this.labels = [];
        this.parent = parent;
        this.boundingBox = new BoundingBox_1.BoundingBox(this, undefined);
    }
    Object.defineProperty(GraphicalMusicPage.prototype, "MusicSystems", {
        get: function () {
            return this.musicSystems;
        },
        set: function (value) {
            this.musicSystems = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicPage.prototype, "Labels", {
        get: function () {
            return this.labels;
        },
        set: function (value) {
            this.labels = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalMusicPage.prototype, "Parent", {
        get: function () {
            return this.parent;
        },
        set: function (value) {
            this.parent = value;
        },
        enumerable: true,
        configurable: true
    });
    GraphicalMusicPage.prototype.setMusicPageAbsolutePosition = function (pageIndex, rules) {
        if (rules.PagePlacement === PagePlacementEnum.Down) {
            return new PointF2D_1.PointF2D(0.0, pageIndex * rules.PageHeight);
        }
        else if (rules.PagePlacement === PagePlacementEnum.Right) {
            return new PointF2D_1.PointF2D(pageIndex * this.parent.ParentMusicSheet.pageWidth, 0.0);
        }
        else {
            if (pageIndex % 2 === 0) {
                if (pageIndex === 0) {
                    return new PointF2D_1.PointF2D(0.0, pageIndex * rules.PageHeight);
                }
                else {
                    return new PointF2D_1.PointF2D(0.0, (pageIndex - 1) * rules.PageHeight);
                }
            }
            else {
                if (pageIndex === 1) {
                    return new PointF2D_1.PointF2D(this.parent.ParentMusicSheet.pageWidth, (pageIndex - 1) * rules.PageHeight);
                }
                else {
                    return new PointF2D_1.PointF2D(this.parent.ParentMusicSheet.pageWidth, (pageIndex - 2) * rules.PageHeight);
                }
            }
        }
    };
    return GraphicalMusicPage;
}(GraphicalObject_1.GraphicalObject));
exports.GraphicalMusicPage = GraphicalMusicPage;
(function (PagePlacementEnum) {
    PagePlacementEnum[PagePlacementEnum["Down"] = 0] = "Down";
    PagePlacementEnum[PagePlacementEnum["Right"] = 1] = "Right";
    PagePlacementEnum[PagePlacementEnum["RightDown"] = 2] = "RightDown";
})(exports.PagePlacementEnum || (exports.PagePlacementEnum = {}));
var PagePlacementEnum = exports.PagePlacementEnum;
