"use strict";
var Cursor = (function () {
    function Cursor(container, osmd) {
        this.hidden = true;
        this.container = container;
        this.osmd = osmd;
        var curs = document.createElement("img");
        curs.style.position = "absolute";
        curs.style.zIndex = "-1";
        this.cursorElement = curs;
        container.appendChild(curs);
    }
    Cursor.prototype.init = function (manager, graphic) {
        this.iterator = manager.getIterator();
        this.graphic = graphic;
        this.hidden = true;
        this.hide();
    };
    Cursor.prototype.show = function () {
        this.hidden = false;
        this.update();
        // Forcing the sheet to re-render is not necessary anymore
        //this.osmd.render();
    };
    Cursor.prototype.update = function () {
        // Should NEVER call this.osmd.render()
        if (this.hidden) {
            return;
        }
        this.graphic.Cursors.length = 0;
        var iterator = this.iterator;
        if (iterator.EndReached || iterator.CurrentVoiceEntries === undefined) {
            return;
        }
        var x = 0, y = 0, height = 0;
        for (var idx = 0, len = iterator.CurrentVoiceEntries.length; idx < len; ++idx) {
            var voiceEntry = iterator.CurrentVoiceEntries[idx];
            var measureIndex = voiceEntry.ParentSourceStaffEntry.VerticalContainerParent.ParentMeasure.MeasureNumber;
            var staffIndex = voiceEntry.ParentSourceStaffEntry.ParentStaff.idInMusicSheet;
            var gse = this.graphic.findGraphicalStaffEntryFromMeasureList(staffIndex, measureIndex, voiceEntry.ParentSourceStaffEntry);
            if (idx === 0) {
                x = gse.getX();
                var musicSystem = gse.parentMeasure.parentMusicSystem;
                y = musicSystem.PositionAndShape.AbsolutePosition.y + musicSystem.StaffLines[0].PositionAndShape.RelativePosition.y;
                var endY = musicSystem.PositionAndShape.AbsolutePosition.y +
                    musicSystem.StaffLines[musicSystem.StaffLines.length - 1].PositionAndShape.RelativePosition.y + 4.0;
                height = endY - y;
            }
        }
        // Update the graphical cursor
        // The following is the legacy cursor rendered on the canvas:
        // // let cursor: GraphicalLine = new GraphicalLine(new PointF2D(x, y), new PointF2D(x, y + height), 3, OutlineAndFillStyleEnum.PlaybackCursor);
        // This the current HTML Cursor:
        var cursorElement = this.cursorElement;
        cursorElement.style.top = (y * 10.0 * this.osmd.zoom) + "px";
        cursorElement.style.left = ((x - 1.5) * 10.0 * this.osmd.zoom) + "px";
        cursorElement.height = (height * 10.0 * this.osmd.zoom);
        var newWidth = 3 * 10.0 * this.osmd.zoom;
        if (newWidth !== cursorElement.width) {
            cursorElement.width = newWidth;
            this.updateStyle(newWidth);
        }
        // Show cursors
        // // Old cursor: this.graphic.Cursors.push(cursor);
        this.cursorElement.style.display = "";
    };
    /**
     * Hide the cursor
     */
    Cursor.prototype.hide = function () {
        // Hide the actual cursor element
        this.cursorElement.style.display = "none";
        //this.graphic.Cursors.length = 0;
        // Forcing the sheet to re-render is not necessary anymore
        //if (!this.hidden) {
        //    this.osmd.render();
        //}
        this.hidden = true;
    };
    /**
     * Go to next entry
     */
    Cursor.prototype.next = function () {
        this.iterator.moveToNext();
        if (!this.hidden) {
            this.show();
        }
    };
    /**
     * Go to previous entry. Not implemented.
     */
    Cursor.prototype.prev = function () {
        // TODO
        // Previous does not seem to be implemented in the MusicPartManager iterator...
    };
    Cursor.prototype.updateStyle = function (width, color) {
        if (color === void 0) { color = "#33e02f"; }
        // Create a dummy canvas to generate the gradient for the cursor
        // FIXME This approach needs to be improved
        var c = document.createElement("canvas");
        c.width = this.cursorElement.width;
        c.height = 1;
        var ctx = c.getContext("2d");
        ctx.globalAlpha = 0.5;
        // Generate the gradient
        var gradient = ctx.createLinearGradient(0, 0, this.cursorElement.width, 0);
        gradient.addColorStop(0, "white"); // it was: "transparent"
        gradient.addColorStop(0.2, color);
        gradient.addColorStop(0.8, color);
        gradient.addColorStop(1, "white"); // it was: "transparent"
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, 1);
        // Set the actual image
        this.cursorElement.src = c.toDataURL("image/png");
    };
    return Cursor;
}());
exports.Cursor = Cursor;
