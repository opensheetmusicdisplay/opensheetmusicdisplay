import { Note } from "./Note";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { PlacementEnum } from "./Expressions/AbstractExpression";
import { Beam } from "./Beam";

/**
 * Tuplets create irregular rhythms; e.g. triplets, quadruplets, quintuplets, etc.
 */
export class Tuplet {

    constructor(tupletLabelNumber: number, bracket: boolean = false) {
        this.tupletLabelNumber = tupletLabelNumber;
        this.bracket = bracket;
    }

    private tupletLabelNumber: number;
    public PlacementFromXml: boolean = false;
    public tupletLabelNumberPlacement: PlacementEnum;
    public RenderTupletNumber: boolean = true;
    /** Notes contained in the tuplet, per VoiceEntry (list of VoiceEntries, which has a list of notes). */
    private notes: Note[][] = []; // TODO should probably be VoiceEntry[], not Note[][].
    private fractions: Fraction[] = [];
    /** Whether this tuplet has a bracket. (e.g. showing |--3--| or just 3 for a triplet) */
    private bracket: boolean;
    /** Boolean if 'bracket="no"' or "yes" was explicitly requested in the XML, otherwise undefined. */
    public BracketedXmlValue: boolean;
    /** Whether <tuplet show-number="none"> was given in the XML, indicating the tuplet number should not be rendered. */
    public ShowNumberNoneGivenInXml: boolean;

    /** Determines whether the tuplet should be bracketed (arguments are EngravingRules). */
    public shouldBeBracketed(useXmlValue: boolean,
        tupletsBracketed: boolean,
        tripletsBracketed: boolean,
        isTabMeasure: boolean = false,
        tabTupletsBracketed: boolean = false,
    ): boolean {
        if (isTabMeasure) {
            return tabTupletsBracketed;
        }
        if (useXmlValue && this.BracketedXmlValue !== undefined) {
            return this.BracketedXmlValue;
        }
        // Gould: tuplets need bracket if they're not on one single beam (see #1400)
        const startingBeam: Beam = this.Notes[0][0].NoteBeam;
        // const startingVFBeam: VF.Beam = (tupletStaveNotes[0] as any).beam; // alternative way to check. see for loop
        if (!startingBeam) {
            return true;
        } else {
            for (const tupletNotes of this.Notes) {
                if (tupletNotes[0].NoteBeam !== startingBeam) {
                    return true;
                }
            }
        }
        return this.Bracket ||
            (this.TupletLabelNumber === 3 && tripletsBracketed) ||
            (this.TupletLabelNumber !== 3 && tupletsBracketed);
    }

    public get TupletLabelNumber(): number {
        return this.tupletLabelNumber;
    }

    public set TupletLabelNumber(value: number) {
        this.tupletLabelNumber = value;
    }

    public get Notes(): Note[][] {
        return this.notes;
    }

    public set Notes(value: Note[][]) {
        this.notes = value;
    }

    public get Fractions(): Fraction[] {
        return this.fractions;
    }

    public set Fractions(value: Fraction[]) {
        this.fractions = value;
    }

    public get Bracket(): boolean {
        return this.bracket;
    }

    public set Bracket(value: boolean) {
        this.bracket = value;
    }

    /**
     * Returns the index of the given Note in the Tuplet List (notes[0], notes[1],...).
     * @param note
     * @returns {number}
     */
    public getNoteIndex(note: Note): number {
        for (let i: number = this.notes.length - 1; i >= 0; i--) {
            for (let j: number = 0; j < this.notes[i].length; j++) {
                if (note === this.notes[i][j]) {
                    return i;
                }
            }
        }
        return 0;
    }

}
