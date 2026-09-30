import Vex from "vexflow";
import VF = Vex.Flow;

/** A key-signature subgroup uses the active clef and follows its parent note's stave. */
export class VexFlowKeySignatureNote extends VF.KeySigNote {
    private clef: string;
    public attachedToNote: boolean = false;

    /** Reserves real signature width without inventing a source note. */
    public static createCarrier(instructions: VF.Note[], stave: VF.Stave): VF.GhostNote {
        for (const instruction of instructions) {
            instruction.setStave(stave);
        }
        const subgroup: VF.NoteSubGroup = new VF.NoteSubGroup(instructions);
        subgroup.preFormat();
        const carrier: VF.GhostNote = new VF.GhostNote("q");
        carrier.addModifier(subgroup, 0);
        // GhostNote deliberately skips modifier-context formatting.
        carrier.setExtraLeftPx(subgroup.getWidth());
        carrier.setWidth(subgroup.getWidth());
        return carrier;
    }

    constructor(key: string, previousKey: string, clef: string) {
        super(key, previousKey, undefined);
        this.clef = clef;
    }

    public setStave(stave: VF.Stave): this {
        super.setStave(stave);
        // NoteSubGroup reassigns the stave at draw time, after system layout has replaced it.
        // VexFlow 1.2.93 exposes setStave on StaveModifier, but its typings omit it.
        (this.keySignature as any).setStave(stave);
        return this;
    }

    public preFormat(): this {
        // VexFlow reads the stave's clef when formatting a key, not the following note's clef.
        const stave: any = this.getStave();
        const previousClef: string = stave.clef;
        try {
            stave.clef = this.clef;
            super.preFormat();
        } finally {
            stave.clef = previousClef;
        }
        return this;
    }
}
