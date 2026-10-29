import {AbstractNotationInstruction} from "./AbstractNotationInstruction";
import {Fraction} from "../../../Common/DataObjects/Fraction";

/**
 * A [[RhythmInstruction]] is the time signature which specifies the number of beats in each bar, and the value of one beat.
 */
export class RhythmInstruction extends AbstractNotationInstruction {
    /**
     * @param numeratorGroups The groups of an additive numerator, e.g. [2, 2, 3] for 2+2+3/8 (see NumeratorGroups).
     *   Their sum is the numerator of rhythm.
     */
    constructor(rhythm: Fraction, rhythmSymbolEnum: RhythmSymbolEnum, numeratorGroups?: number[]) {
        super(undefined); // FIXME no parent SourceStaffEntry
        this.rhythm = rhythm;
        this.numerator = rhythm.Numerator;
        this.denominator = rhythm.Denominator;
        this.symbolEnum = rhythmSymbolEnum;
        this.numeratorGroups = numeratorGroups;
    }

    private numerator: number;
    private denominator: number;
    private rhythm: Fraction;
    private symbolEnum: RhythmSymbolEnum;
    private numeratorGroups: number[];
    /** Whether this time signature was not given in the source (e.g. MusicXML), but synthesized by default,
     * e.g. a default 4/4 for a sample without a time signature like Satie's Gnossiennes.
     * Such a time signature is not rendered by default (see EngravingRules.RenderTimeSignaturesForSamplesWithoutTimeSignature). */
    public SynthesizedFromNoTimeSignature: boolean = false;

    public get Rhythm(): Fraction {
        return this.rhythm;
    }

    public set Rhythm(value: Fraction) {
        this.rhythm = value;
        this.numeratorGroups = undefined; // they add up to the previous numerator
    }

    /** The groups of an additive numerator as given in the source, e.g. [2, 2, 3] for MusicXML's `<beats>2+2+3</beats>`
     * with `<beat-type>8</beat-type>`: the time signature is drawn as 2+2+3/8 instead of 7/8.
     * Undefined for a single number like 7. Rhythm has their sum (7/8), which is what durations use.
     */
    public get NumeratorGroups(): number[] {
        return this.numeratorGroups;
    }

    public get SymbolEnum(): RhythmSymbolEnum {
        return this.symbolEnum;
    }

    public set SymbolEnum(value: RhythmSymbolEnum) {
        this.symbolEnum = value;
    }

    public clone(): RhythmInstruction {
        const clone: RhythmInstruction = new RhythmInstruction(this.rhythm.clone(), this.symbolEnum, this.NumeratorGroups);
        clone.SynthesizedFromNoTimeSignature = this.SynthesizedFromNoTimeSignature;
        return clone;
    }

    public OperatorEquals(rhythm2: RhythmInstruction): boolean {
        const rhythm1: RhythmInstruction = this;
        if (rhythm1 === rhythm2) {
            return true;
        }
        if (!rhythm1 || !rhythm2) {
            return false;
        }
        return (rhythm1.numerator === rhythm2.numerator && rhythm1.denominator === rhythm2.denominator);
    }

    public OperatorNotEqual(rhythm2: RhythmInstruction): boolean {
        const rhythm1: RhythmInstruction = this;
        return !(rhythm1 === rhythm2);
    }

    public ToString(): string {
        return "Rhythm: " + this.rhythm.toString();
    }
}

export enum RhythmSymbolEnum {
    NONE = 0,
    COMMON = 1,
    CUT = 2,
}
