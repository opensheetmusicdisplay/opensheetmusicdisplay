import {MusicSheetDrawer} from "../MusicSheetDrawer";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {GraphicalMusicSheet} from "../GraphicalMusicSheet";
/**
 * Created by Matthias on 22.06.2016.
 */
export class VexFlowMusicSheetDrawer extends MusicSheetDrawer {
    constructor() {
        super();
        // Create the canvas in the document:
        this.canvas = document.createElement("canvas");
        document.body.appendChild(this.canvas);
    }

    private canvas: HTMLCanvasElement;

    public drawSheet(graphicalMusicSheet: GraphicalMusicSheet): void {
        let h1: Element = document.createElement("h1");
        h1.textContent = "VexFlowMusicSheetDrawer Output";
        document.body.appendChild(h1);
        // FIXME units
        let unit: number = 10;
        this.canvas.width = this.canvas.height = unit * graphicalMusicSheet.ParentMusicSheet.pageWidth;
        super.drawSheet(graphicalMusicSheet);
    }

    protected drawMeasure(measure: VexFlowMeasure): void {
        measure.setAbsoluteCoordinates(
            measure.PositionAndShape.AbsolutePosition.x * (measure as VexFlowMeasure).unit,
            measure.PositionAndShape.AbsolutePosition.y * (measure as VexFlowMeasure).unit
        );
        return measure.draw(this.canvas);
    }

    protected applyScreenTransformation(rectangle: RectangleF2D): RectangleF2D {
        throw new Error("not implemented");
    }
}
