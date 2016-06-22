import {MusicSheetDrawer} from "../MusicSheetDrawer";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {StaffMeasure} from "../StaffMeasure";
import {VexFlowMeasure} from "./VexFlowMeasure";
/**
 * Created by Matthias on 22.06.2016.
 */
export class VexFlowMusicSheetDrawer extends MusicSheetDrawer {
    constructor() {
        super();
    }

    protected drawMeasure(measure: StaffMeasure): void {
        let vfMeasure: VexFlowMeasure = <VexFlowMeasure> measure;
        throw new Error("not implemented");
    }

    protected applyScreenTransformation(rectangle: RectangleF2D): RectangleF2D {
        throw new Error("not implemented");
    }
}
