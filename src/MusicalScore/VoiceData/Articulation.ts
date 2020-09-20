import { PlacementEnum } from "./Expressions/AbstractExpression";
import { ArticulationEnum } from "./VoiceEntry";

export class Articulation {
    public placement: PlacementEnum = PlacementEnum.Above;
    public articulationEnum: ArticulationEnum;

    constructor(articulationEnum: ArticulationEnum, placement: PlacementEnum = PlacementEnum.Above) {
        this.articulationEnum = articulationEnum;
        this.placement = placement;
    }

    public Equals(otherArticulation: Articulation): boolean {
        return otherArticulation.articulationEnum === this.articulationEnum && otherArticulation.placement === this.placement;
    }
}