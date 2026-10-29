import {AbstractNotationInstruction} from "./AbstractNotationInstruction";
import {Fraction} from "../../../Common/DataObjects/Fraction";

/**
 * A [[RhythmInstruction]] is the time signature which specifies the number of beats in each bar, and the value of one beat.
 */
export class RhythmInstruction extends AbstractNotationInstruction {
    constructor(rhythm: Fraction, rhythmSymbolEnum: RhythmSymbolEnum, numeratorGroups?: ReadonlyArray<number>) {
        super(undefined); // FIXME no parent SourceStaffEntry
        this.rhythm = rhythm;
        this.numerator = rhythm.Numerator;
        this.denominator = rhythm.Denominator;
        this.symbolEnum = rhythmSymbolEnum;
        if (numeratorGroups) {
            const groups: number[] = numeratorGroups.slice();
            if (!groups.length || rhythm.WholeValue !== 0 ||
                !groups.every(group => Number.isSafeInteger(group) && group > 0) ||
                groups.reduce((sum, group) => sum + group, 0) !== this.numerator) {
                throw new RangeError("Numerator groups must be positive integers matching the time signature.");
            }
            this.numeratorGroups = Object.freeze(groups);
        }
    }

    private numerator: number;
    private denominator: number;
    private rhythm: Fraction;
    private symbolEnum: RhythmSymbolEnum;
    private numeratorGroups: ReadonlyArray<number>;
    /** Whether this time signature was not given in the source (e.g. MusicXML), but synthesized by default,
     * e.g. a default 4/4 for a sample without a time signature like Satie's Gnossiennes.
     * Such a time signature is not rendered by default (see EngravingRules.RenderTimeSignaturesForSamplesWithoutTimeSignature). */
    public SynthesizedFromNoTimeSignature: boolean = false;

    public get Rhythm(): Fraction {
        return this.rhythm;
    }

    public set Rhythm(value: Fraction) {
        this.rhythm = value;
        this.numeratorGroups = undefined;
    }

    /** Source grouping for an additive numerator; Rhythm retains its summed duration. */
    public get NumeratorGroups(): ReadonlyArray<number> {
        return this.rhythm.WholeValue === 0 && this.rhythm.Numerator === this.numerator ? this.numeratorGroups : undefined;
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
