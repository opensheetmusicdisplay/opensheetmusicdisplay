import {BoundingBox} from "./BoundingBox";
module PhonicScore.MusicalScore.Graphical {
    export class GraphicalObject {
        protected boundingBox: BoundingBox;
        public get PositionAndShape(): BoundingBox {
            return this.boundingBox;
        }
        public set PositionAndShape(value: BoundingBox) {
            this.boundingBox = value;
        }
    }
}