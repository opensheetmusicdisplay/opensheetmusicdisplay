import {PlacementEnum} from "./abstractExpression";
import {MultiTempoExpression} from "./multiTempoExpression";
export class AbstractTempoExpression {
    protected label: string;
    protected placement: PlacementEnum;
    protected staffNumber: number;
    protected parentMultiTempoExpression: MultiTempoExpression;
    public get Label(): string {
        return this.label;
    }
    public set Label(value: string) {
        this.label = value;
    }
    public get Placement(): PlacementEnum {
        return this.placement;
    }
    public set Placement(value: PlacementEnum) {
        this.placement = value;
    }
    public get StaffNumber(): number {
        return this.staffNumber;
    }
    public set StaffNumber(value: number) {
        this.staffNumber = value;
    }
    public get ParentMultiTempoExpression(): MultiTempoExpression {
        return this.parentMultiTempoExpression;
    }
    protected static isStringInStringList(wordsToFind: Array<string>, inputString: string): boolean {
        for (var idx: number = 0, len = wordsToFind.length; idx < len; ++idx) {
            var wordToFind: string = wordsToFind[idx];
            if (AbstractTempoExpression.stringContainsSeparatedWord(inputString.toLowerCase().Trim(), wordToFind.toLowerCase().Trim()))
                return true;
        }
        return false;
    }
    private static stringContainsSeparatedWord(str: string, word: string): boolean {
        if (str == word || str.Contains(" " + word) || str.Contains(word + " "))
            return true;
        return false;
    }
}