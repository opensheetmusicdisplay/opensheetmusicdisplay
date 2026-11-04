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
    /** Whether the pedal ends at the stave end (and not before the endNote) */
    public EndsStave: boolean = false;
    /** Whether the pedal begins at the stave beginning (and not before the startNote - e.g. for whole measure rest) */
    public BeginsStave: boolean = false;
    /** Whether the pedal line begins without its start hook (the downstroke), e.g. MusicXML `<pedal type="resume">`:
     *  where a discontinued line goes on, or after a Ped. sign (sign="yes": the Ped. + line style, which has no start hook anyway). */
    public BeginsWithoutHook: boolean = false;
    /** Whether the pedal line ends without its end hook (the lift), e.g. MusicXML `<pedal type="discontinue">`,
     *  where a pedal stopped there would draw the hook. */
    public EndsWithoutHook: boolean = false;

    public get IsLine(): boolean {
        return this.line;
    }
    public get IsSign(): boolean {
        return this.sign;
    }
}
