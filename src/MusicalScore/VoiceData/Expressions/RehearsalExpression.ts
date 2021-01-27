import { AbstractExpression, PlacementEnum } from "./AbstractExpression";

export class RehearsalExpression extends AbstractExpression {
    constructor(label: string, placement: PlacementEnum) {
        super(placement);
        this.label = label;
    }

    public label: string;
}
