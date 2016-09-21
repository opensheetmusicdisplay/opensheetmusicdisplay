import {BoundingBox} from "./BoundingBox";

export class GraphicalObject {

    protected boundingBox: BoundingBox;

    public get PositionAndShape(): BoundingBox {
        return this.boundingBox;
    }

    public set PositionAndShape(value: BoundingBox) {
        this.boundingBox = value;
    }

}
