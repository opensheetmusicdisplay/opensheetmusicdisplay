import {MusicPartManagerIterator} from "../MusicalScore/MusicParts/MusicPartManagerIterator";
import {MusicPartManager} from "../MusicalScore/MusicParts/MusicPartManager";
import {VoiceEntry} from "../MusicalScore/VoiceData/VoiceEntry";
import {VexFlowStaffEntry} from "../MusicalScore/Graphical/VexFlow/VexFlowStaffEntry";
import {MusicSystem} from "../MusicalScore/Graphical/MusicSystem";
import {OSMD} from "./OSMD";
import {GraphicalMusicSheet} from "../MusicalScore/Graphical/GraphicalMusicSheet";

/**
 * A cursor which can iterate through the music sheet.
 */
export class Cursor {
    constructor(container: HTMLElement, osmd: OSMD) {
        this.container = container;
        this.osmd = osmd;
        let curs: HTMLElement = document.createElement("img");
        curs.style.position = "absolute";
        curs.style.zIndex = "-1";
        this.cursorElement = <HTMLImageElement>curs;
        container.appendChild(curs);
    }

    private container: HTMLElement;
    private osmd: OSMD;
    private manager: MusicPartManager;
    private iterator: MusicPartManagerIterator;
    private graphic: GraphicalMusicSheet;
    private hidden: boolean = true;
    private cursorElement: HTMLImageElement;

    public init(manager: MusicPartManager, graphic: GraphicalMusicSheet): void {
        this.manager = manager;
        this.reset();
        this.graphic = graphic;
        this.hidden = true;
        this.hide();
    }

    /**
     * Make the cursor visible
     */
    public show(): void {
        this.hidden = false;
        this.update();
        // Forcing the sheet to re-render is not necessary anymore,
        // since the cursor is an HTML element.
        // this.osmd.render();
    }

    public update(): void {
        // Warning! This should NEVER call this.osmd.render()
        if (this.hidden) {
            return;
        }
        this.graphic.Cursors.length = 0;
        let iterator: MusicPartManagerIterator = this.iterator;
        if  (iterator.EndReached || iterator.CurrentVoiceEntries === undefined) {
            return;
        }
        let x: number = 0, y: number = 0, height: number = 0;
        for (let idx: number = 0, len: number = iterator.CurrentVoiceEntries.length; idx < len; ++idx) {
            let voiceEntry: VoiceEntry = iterator.CurrentVoiceEntries[idx];
            let measureIndex: number = voiceEntry.ParentSourceStaffEntry.VerticalContainerParent.ParentMeasure.measureListIndex;
            let staffIndex: number = voiceEntry.ParentSourceStaffEntry.ParentStaff.idInMusicSheet;
            let gse: VexFlowStaffEntry =
                <VexFlowStaffEntry>this.graphic.findGraphicalStaffEntryFromMeasureList(staffIndex, measureIndex, voiceEntry.ParentSourceStaffEntry);
            if (idx === 0) {
                x = gse.getX();
                let musicSystem: MusicSystem = gse.parentMeasure.parentMusicSystem;
                y = musicSystem.PositionAndShape.AbsolutePosition.y + musicSystem.StaffLines[0].PositionAndShape.RelativePosition.y;
                let endY: number = musicSystem.PositionAndShape.AbsolutePosition.y +
                    musicSystem.StaffLines[musicSystem.StaffLines.length - 1].PositionAndShape.RelativePosition.y + 4.0;
                height = endY - y;
            }
            // The following code is not necessary (for now, but it could come useful later):
            // it highlights the notes under the cursor.
            //let vfNotes: { [voiceID: number]: Vex.Flow.StaveNote; } = gse.vfNotes;
            //for (let voiceId in vfNotes) {
            //    if (vfNotes.hasOwnProperty(voiceId)) {
            //        vfNotes[voiceId].setStyle({
            //            fillStyle: "red",
            //            strokeStyle: "red",
            //        });
            //    }
            //}
        }
        // Update the graphical cursor
        // The following is the legacy cursor rendered on the canvas:
        // // let cursor: GraphicalLine = new GraphicalLine(new PointF2D(x, y), new PointF2D(x, y + height), 3, OutlineAndFillStyleEnum.PlaybackCursor);

        // This the current HTML Cursor:
        let cursorElement: HTMLImageElement = this.cursorElement;
        cursorElement.style.top = (y * 10.0 * this.osmd.zoom) + "px";
        cursorElement.style.left = ((x - 1.5) * 10.0 * this.osmd.zoom) + "px";
        cursorElement.height = (height * 10.0 * this.osmd.zoom);
        let newWidth: number = 3 * 10.0 * this.osmd.zoom;
        if (newWidth !== cursorElement.width) {
            cursorElement.width = newWidth;
            this.updateStyle(newWidth);
        }

        // Show cursor
        // // Old cursor: this.graphic.Cursors.push(cursor);
        this.cursorElement.style.display = "";
    }

    /**
     * Hide the cursor
     */
    public hide(): void {
        // Hide the actual cursor element
        this.cursorElement.style.display = "none";
        //this.graphic.Cursors.length = 0;
        // Forcing the sheet to re-render is not necessary anymore
        //if (!this.hidden) {
        //    this.osmd.render();
        //}
        this.hidden = true;
    }

    /**
     * Go to next entry
     */
    public next(): void {
        this.iterator.moveToNext();
        if (!this.hidden) {
            this.show();
        }
    }

    /**
     * Go to next entry
     */
    public reset(): void {
        this.iterator = this.manager.getIterator();
        this.iterator.moveToNext();
        this.update();
    }

    private updateStyle(width: number, color: string = "#33e02f"): void {
        // Create a dummy canvas to generate the gradient for the cursor
        // FIXME This approach needs to be improved
        let c: HTMLCanvasElement = document.createElement("canvas");
        c.width = this.cursorElement.width;
        c.height = 1;
        let ctx: CanvasRenderingContext2D = c.getContext("2d");
        ctx.globalAlpha = 0.5;
        // Generate the gradient
        let gradient: CanvasGradient = ctx.createLinearGradient(0, 0, this.cursorElement.width, 0);
        gradient.addColorStop(0, "white"); // it was: "transparent"
        gradient.addColorStop(0.2, color);
        gradient.addColorStop(0.8, color);
        gradient.addColorStop(1, "white"); // it was: "transparent"
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, 1);
        // Set the actual image
        this.cursorElement.src = c.toDataURL("image/png");
    }
}
