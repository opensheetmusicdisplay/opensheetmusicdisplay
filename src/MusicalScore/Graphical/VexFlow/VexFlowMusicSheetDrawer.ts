import Vex = require("vexflow");
import {MusicSheetDrawer} from "../MusicSheetDrawer";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {GraphicalMusicSheet} from "../GraphicalMusicSheet";
/**
 * Created by Matthias on 22.06.2016.
 */
export class VexFlowMusicSheetDrawer extends MusicSheetDrawer {
    constructor(canvas: HTMLCanvasElement) {
        super();
        this.renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
        this.ctx = this.renderer.getContext();

    }

    private renderer: Vex.Flow.Renderer;
    private ctx: Vex.Flow.CanvasContext;

    public drawSheet(graphicalMusicSheet: GraphicalMusicSheet): void {
        // FIXME units
        // FIXME actual page size
        let unit: number = 10;
        this.renderer.resize(
            unit * graphicalMusicSheet.ParentMusicSheet.pageWidth,
            unit * graphicalMusicSheet.ParentMusicSheet.pageWidth
        );
        super.drawSheet(graphicalMusicSheet);
    }

    protected drawMeasure(measure: VexFlowMeasure): void {
        measure.setAbsoluteCoordinates(
            measure.PositionAndShape.AbsolutePosition.x * (measure as VexFlowMeasure).unit,
            measure.PositionAndShape.AbsolutePosition.y * (measure as VexFlowMeasure).unit
        );
        return measure.draw(this.ctx);
    }

    protected applyScreenTransformation(rectangle: RectangleF2D): RectangleF2D {
        throw new Error("not implemented");
    }
}
