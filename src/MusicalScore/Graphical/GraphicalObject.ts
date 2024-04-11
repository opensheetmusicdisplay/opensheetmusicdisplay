import { AClassHierarchyTrackable } from "../Interfaces/AClassHierarchyTrackable";
import {BoundingBox} from "./BoundingBox";

export class GraphicalObject extends AClassHierarchyTrackable {

    protected boundingBox: BoundingBox;

    public get PositionAndShape(): BoundingBox {
        // if (this.isInstanceOfClass(GraphicalMeasure.name)) { // can be useful for debug
        //     console.log("get measure bbox");
        // }
        return this.boundingBox;
    }

    public set PositionAndShape(value: BoundingBox) {
        this.boundingBox = value;
    }

}
