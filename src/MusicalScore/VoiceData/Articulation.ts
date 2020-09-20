import { PlacementEnum } from "./Expressions/AbstractExpression";
import { ArticulationEnum } from "./VoiceEntry";

export class Articulation {
    public placement: PlacementEnum;
    public articulationEnum: ArticulationEnum;

    constructor(articulationEnum: ArticulationEnum, placement: PlacementEnum) {
        this.articulationEnum = articulationEnum;
        this.placement = placement; // undefined by default, to not restrict placement
    }

    public Equals(otherArticulation: Articulation): boolean {
        return otherArticulation.articulationEnum === this.articulationEnum && otherArticulation.placement === this.placement;
    }
}
