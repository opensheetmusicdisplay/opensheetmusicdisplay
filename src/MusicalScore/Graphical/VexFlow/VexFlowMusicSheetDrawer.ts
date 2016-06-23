import {MusicSheetDrawer} from "../MusicSheetDrawer";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {StaffMeasure} from "../StaffMeasure";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {GraphicalMusicSheet} from "../GraphicalMusicSheet";
/**
 * Created by Matthias on 22.06.2016.
 */
export class VexFlowMusicSheetDrawer extends MusicSheetDrawer {
    constructor() {
        super();
    }
    public drawSheet(graphicalMusicSheet: GraphicalMusicSheet): void {
        let h1: Element = document.createElement("h1");
        h1.textContent = "VexFlowMusicSheetDrawer Output";
        document.body.appendChild(h1);
        super.drawSheet(graphicalMusicSheet);
    }

    protected drawMeasure(measure: StaffMeasure): void {
        //let vfMeasure: VexFlowMeasure = <VexFlowMeasure> measure;
        //throw new Error("not implemented");
        let canvas: HTMLCanvasElement = document.createElement("canvas");
        document.body.appendChild(canvas);
        canvas.width = canvas.height = 200;
        return (measure as VexFlowMeasure).draw(canvas);
    }

    protected applyScreenTransformation(rectangle: RectangleF2D): RectangleF2D {
        throw new Error("not implemented");
    }
}
