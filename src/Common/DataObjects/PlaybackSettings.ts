import { Fraction } from "./Fraction";

export class PlaybackSettings {
    private beatsPerMinute: number;
    private beatLengthInMilliseconds: number;
    private beatRealValue: number;
    public rhythm: Fraction;

    /** The denominator of the fraction of the rhythm is 1 beat long
     * --> By knowing the rhythm and the beatsPerMinute the length of notes can be calculated.
     */
    constructor(rhythm: Fraction = new Fraction(), beatsPerMinute: number = 0) {
        this.rhythm = rhythm;
        this.beatsPerMinute = beatsPerMinute;
        // 1 minute in milliseconds/beatsPerMinute
        this.beatLengthInMilliseconds = 60000.0 / beatsPerMinute;
        // the denominator in the rhythm is the unit for the beats in a music sheet (it is 1 beat long)
        this.beatRealValue = 1.0 / 4.0;
    }

    public static createFrom(from: PlaybackSettings): PlaybackSettings {
        return new PlaybackSettings(from.Rhythm, from.BeatsPerMinute);
    }

    public get BeatsPerMinute(): number {
        return this.beatsPerMinute;
    }
    public set BeatsPerMinute(value: number) {
        this.beatsPerMinute = value;
        // 1 minute in milliseconds/beatsPerMinute
        this.beatLengthInMilliseconds = 60000.0 / this.beatsPerMinute;
    }
    public get Rhythm(): Fraction {
        return this.rhythm;
    }
    public set Rhythm(value: Fraction) {
        this.rhythm = value;
        // TODO: Below is commented out in original C# code, delete here?
        // the denominator in the rhythm is the unit for the beats in a music sheet (it is 1 beat long)
        // this.beatRealValue = 1.0 / this.rhythm.Denominator;
    }
    public get BeatRealValue(): number {
        return this.beatRealValue;
    }
    public get BeatLengthInMilliseconds(): number {
        return this.beatLengthInMilliseconds;
    }
    // TODO: Following overload is handled below, check if it does what it is supposed to do
    // public getDurationInMilliseconds(duration: Fraction): number {
    //     var ret: number = duration.RealValue * this.BeatLengthInMilliseconds / this.beatRealValue;
    //     return ret;
    // }
    // public getDurationInMilliseconds(durationRealValue: number): number {
    //     var ret: number = durationRealValue * this.BeatLengthInMilliseconds / this.beatRealValue;
    //     return ret;
    // }
    public getDurationInMilliseconds(duration: number | Fraction): number {
        const value: number = typeof duration === "number" ? duration : duration.RealValue;
        const ret: number = value * this.BeatLengthInMilliseconds / this.beatRealValue;
        return ret;
    }
    public getDurationAsNoteDuration(milliseconds: number, fractionPrecision: number = 1024): Fraction {
        // 1 beat can be mapped to 1/denominator of the rhythm.
        const numBeats: number = milliseconds / (this.BeatLengthInMilliseconds);
        let numerator: number = <number>Math.floor(numBeats);

        // TODO: Comment in line below from original code, keep it?
        // here is the problem: this.rhythm.Denominator

        const ret: Fraction = new Fraction(numerator, 4);
        // TODO: Line below commented out in original code, port to TS?
        //Console.WriteLine($"milliseconds: {milliseconds}, BeatLengthInMilliseconds: {BeatLengthInMilliseconds}, LINEBREAK for linter
        //numBeats: {numBeats}, DurationFraction: {ret}");
        // now approximate as good as possible by using fractionPrecision as smallest fraction
        const tmp: number = numBeats - numerator;
        numerator = <number>Math.round(tmp / (1.0 / fractionPrecision) / 4);
        if (numerator === 0 && milliseconds > 0) {
            numerator = 1;
        }
        // add the 2 fractions
        ret.Add(new Fraction(numerator, fractionPrecision));
        return ret;
    }
}
