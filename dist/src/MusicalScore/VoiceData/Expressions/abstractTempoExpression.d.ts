import { PlacementEnum } from "./abstractExpression";
import { MultiTempoExpression } from "./multiTempoExpression";
export declare abstract class AbstractTempoExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number, parentMultiTempoExpression: MultiTempoExpression);
    protected label: string;
    protected placement: PlacementEnum;
    protected staffNumber: number;
    protected parentMultiTempoExpression: MultiTempoExpression;
    Label: string;
    Placement: PlacementEnum;
    StaffNumber: number;
    ParentMultiTempoExpression: MultiTempoExpression;
    protected static isStringInStringList(wordsToFind: string[], inputString: string): boolean;
    private static stringContainsSeparatedWord(str, word);
}
