import { AbstractExpression, PlacementEnum } from "../AbstractExpression";
import { MultiExpression } from "../MultiExpression";

export class BracketHand extends AbstractExpression {
    constructor(placement: PlacementEnum, lineEnd: string, lineType: string) {
        super(placement);
        this.lineEnd = lineEnd;
        this.lineType = lineType;
    }

    public lineEnd: string;
    public lineType: string;
    public ParentStartMultiExpression: MultiExpression;
    public ParentEndMultiExpression: MultiExpression;
}
