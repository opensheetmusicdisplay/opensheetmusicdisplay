import {MusicPartManagerIterator} from "../MusicalScore/MusicParts/MusicPartManagerIterator";
import {MusicPartManager} from "../MusicalScore/MusicParts/MusicPartManager";
import {VoiceEntry} from "../MusicalScore/VoiceData/VoiceEntry";
import {VexFlowStaffEntry} from "../MusicalScore/Graphical/VexFlow/VexFlowStaffEntry";
import {MusicSystem} from "../MusicalScore/Graphical/MusicSystem";
import {OSMD} from "./OSMD";
import {GraphicalMusicSheet} from "../MusicalScore/Graphical/GraphicalMusicSheet";


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
    private iterator: MusicPartManagerIterator;
    private graphic: GraphicalMusicSheet;
    private hidden: boolean = true;
    private cursorElement: HTMLImageElement;

    public init(manager: MusicPartManager, graphic: GraphicalMusicSheet): void {
        this.iterator = manager.getIterator();
        this.graphic = graphic;
        this.hidden = true;
        this.hide();
    }

    public show(): void {
        this.hidden = false;
        this.update();
        // Forcing the sheet to re-render is not necessary anymore
        //this.osmd.render();
    }

    public update(): void {
        // Should NEVER call this.osmd.render()
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
            let measureIndex: number = voiceEntry.ParentSourceStaffEntry.VerticalContainerParent.ParentMeasure.MeasureNumber;
            let staffIndex: number = voiceEntry.ParentSourceStaffEntry.ParentStaff.idInMusicSheet;
            let gse: VexFlowStaffEntry =
                <VexFlowStaffEntry>this.graphic.findGraphicalStaffEntryFromMeasureList(staffIndex, measureIndex, voiceEntry.ParentSourceStaffEntry);
            if (idx === 0) {
                x = gse.getXinpx();
                let musicSystem: MusicSystem = gse.parentMeasure.parentMusicSystem;
                y = musicSystem.PositionAndShape.AbsolutePosition.y;
                height = musicSystem.PositionAndShape.BorderBottom;
            }
            // The following code is not necessary (for now); it highlights the current notes.
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
        cursorElement.height = (height * 10.0 * this.osmd.zoom);
        let newWidth: number = 3 * 10.0 * this.osmd.zoom;
        if (newWidth !== cursorElement.width) {
            cursorElement.width = newWidth;
            this.updateStyle(newWidth);
        }
        cursorElement.style.top = (y * 10.0 * this.osmd.zoom) + "px";
        cursorElement.style.left = (x * this.osmd.zoom - (1.5 * 10.0 * this.osmd.zoom)) + "px";

        // Show cursors
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
     * Go to previous entry. Not implemented.
     */
    public prev(): void {
        // TODO
        // Previous does not seem to be implemented in the MusicPartManager iterator...
    }

    private updateStyle(width: number, color: string = "blue"): void {
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
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, "white"); // it was: "transparent"
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, 1);
        // Set the actual image
        this.cursorElement.src = c.toDataURL("image/png");
    }
}
