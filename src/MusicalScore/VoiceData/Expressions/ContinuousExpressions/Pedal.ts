import { MultiExpression } from "../MultiExpression";

export class Pedal {
    constructor(line: boolean = false, sign: boolean = true) {
        this.line = line;
        this.sign = sign;
    }

    private line: boolean;
    private sign: boolean;
    public StaffNumber: number;
    public ParentStartMultiExpression: MultiExpression;
    public ParentEndMultiExpression: MultiExpression;
    public ChangeEnd: boolean = false;
    public ChangeBegin: boolean = false;

    public get IsLine(): boolean {
        return this.line;
    }
    public get IsSign(): boolean {
        return this.sign;
    }
}
