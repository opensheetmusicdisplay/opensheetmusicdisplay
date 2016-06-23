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
        this.canvas = document.createElement("canvas");
        document.body.appendChild(this.canvas);
        this.canvas.width = this.canvas.height = 10000;
    }

    private canvas: HTMLCanvasElement;

    public drawSheet(graphicalMusicSheet: GraphicalMusicSheet): void {
        let h1: Element = document.createElement("h1");
        h1.textContent = "VexFlowMusicSheetDrawer Output";
        document.body.appendChild(h1);
        super.drawSheet(graphicalMusicSheet);
    }

    protected drawMeasure(measure: StaffMeasure): void {
        (measure as any).stave.setY(measure.PositionAndShape.AbsolutePosition.y);
        (measure as any).stave.setX(measure.PositionAndShape.AbsolutePosition.x);
        //this.stave.setX(x);
        return (measure as VexFlowMeasure).draw(this.canvas);
    }

    protected applyScreenTransformation(rectangle: RectangleF2D): RectangleF2D {
        throw new Error("not implemented");
    }
}
