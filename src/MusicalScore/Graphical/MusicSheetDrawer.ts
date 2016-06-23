import {GraphicalMusicSheet} from "./GraphicalMusicSheet";
import {StaffMeasure} from "./StaffMeasure";
import {StaffLine} from "./StaffLine";
import {RectangleF2D} from "../../Common/DataObjects/RectangleF2D";
import {MusicSystem} from "./MusicSystem";
import {GraphicalMusicPage} from "./GraphicalMusicPage";

export class MusicSheetDrawer {
    protected graphicalMusicSheet: GraphicalMusicSheet;

    public drawSheet(graphicalMusicSheet: GraphicalMusicSheet): void {
        this.graphicalMusicSheet = graphicalMusicSheet;
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            let page: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            this.drawPage(page);
        }
    }

    protected drawMeasure(measure: StaffMeasure): void {
        throw new Error("not implemented");
    }

    protected applyScreenTransformation(rectangle: RectangleF2D): RectangleF2D {
        throw new Error("not implemented");
    }

    private drawPage(page: GraphicalMusicPage): void {
        for (let idx: number = 0, len: number = page.MusicSystems.length; idx < len; ++idx) {
            let system: MusicSystem = page.MusicSystems[idx];
            this.drawMusicSystem(system);
        }
    }

    private drawMusicSystem(musicSystem: MusicSystem): void {
        for (let idx: number = 0, len: number = musicSystem.StaffLines.length; idx < len; ++idx) {
            let staffLine: StaffLine = musicSystem.StaffLines[idx];
            this.drawStaffLine(staffLine);
        }
    }

    private drawStaffLine(staffLine: StaffLine): void {
        for (let idx: number = 0, len: number = staffLine.Measures.length; idx < len; ++idx) {
            let measure: StaffMeasure = staffLine.Measures[idx];
            this.drawMeasure(measure);
        }
    }
}
