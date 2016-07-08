"use strict";
var StaffEntryLink = (function () {
    function StaffEntryLink(voiceEntry) {
        this.linkStaffEntries = [];
        this.voiceEntry = voiceEntry;
    }
    Object.defineProperty(StaffEntryLink.prototype, "GetVoiceEntry", {
        get: function () {
            return this.voiceEntry;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StaffEntryLink.prototype, "LinkStaffEntries", {
        get: function () {
            return this.linkStaffEntries;
        },
        set: function (value) {
            this.linkStaffEntries = value;
        },
        enumerable: true,
        configurable: true
    });
    return StaffEntryLink;
}());
exports.StaffEntryLink = StaffEntryLink;
