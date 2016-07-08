"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var StaffLine_1 = require("../StaffLine");
var VexFlowStaffLine = (function (_super) {
    __extends(VexFlowStaffLine, _super);
    function VexFlowStaffLine(parentSystem, parentStaff) {
        _super.call(this, parentSystem, parentStaff);
    }
    return VexFlowStaffLine;
}(StaffLine_1.StaffLine));
exports.VexFlowStaffLine = VexFlowStaffLine;
