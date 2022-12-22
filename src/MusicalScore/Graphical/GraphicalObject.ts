import { AClassHierarchyTrackable } from "../Interfaces/AClassHierarchyTrackable";
import {BoundingBox} from "./BoundingBox";

export class GraphicalObject extends AClassHierarchyTrackable {

    protected boundingBox: BoundingBox;

    public get PositionAndShape(): BoundingBox {
        return this.boundingBox;
    }

    public set PositionAndShape(value: BoundingBox) {
        this.boundingBox = value;
    }

}
