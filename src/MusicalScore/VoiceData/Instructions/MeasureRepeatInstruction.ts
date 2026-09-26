/** Whether a [[MeasureRepeatInstruction]] starts or ends a measure-repeat presentation, or could not be
 *  read as either (e.g. an unsupported number of measures, or a staff number that couldn't be resolved).
 *  An Invalid instruction still ends a presentation that was inherited from an earlier measure. */
export enum MeasureRepeatType {
    Start,
    Stop,
    Invalid
}

/**
 * A [[MeasureRepeatInstruction]] records one MusicXML `<measure-style><measure-repeat>` declaration for a
 * single staff, kept on [[SourceMeasure]].MeasureRepeatInstructions.
 * This only controls whether OSMD may draw a measure's notes as a repeat sign instead of writing them out
 * (see EngravingRules.RenderMeasureRepeats); it never changes the underlying notes, timestamps, measure
 * widths, cursor or iterator, which are identical whether or not the sign is drawn.
 */
export class MeasureRepeatInstruction {
    constructor(type: MeasureRepeatType, measures: number = 0, slashes: number = 1) {
        this.type = type;
        this.measures = measures;
        this.slashes = slashes;
    }

    /** Whether this declaration starts or stops a measure-repeat presentation, or is Invalid. */
    public type: MeasureRepeatType;
    /** The number of measures in the repeated pattern, i.e. the element's text content (e.g. 2 for
     *  `<measure-repeat type="start">2</measure-repeat>`). Only 1, 2 and 4 can be drawn as a sign.
     *  0 for a Stop or an Invalid instruction. */
    public measures: number;
    /** The number of slashes to draw, given by the MusicXML "slashes" attribute (default 1). Ignored for Stop. */
    public slashes: number;
}
