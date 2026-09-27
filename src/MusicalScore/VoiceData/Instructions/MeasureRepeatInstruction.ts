/** A measure-repeat declaration state. Invalid declarations end any inherited repeat run. */
export enum MeasureRepeatType {
    Start,
    Stop,
    Invalid
}

/** A MusicXML measure-repeat declaration for one staff. */
export class MeasureRepeatInstruction {
    constructor(type: MeasureRepeatType, measures: number = 0, slashes: number = 1) {
        this.type = type;
        this.measures = measures;
        this.slashes = slashes;
    }

    /** Declaration state. */
    public type: MeasureRepeatType;
    /** Pattern length; zero for stop and invalid declarations. */
    public measures: number;
    /** Slash count from MusicXML, defaulting to one. */
    public slashes: number;
}
