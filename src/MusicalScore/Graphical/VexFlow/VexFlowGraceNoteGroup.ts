import Vex from "vexflow";
import VF = Vex.Flow;

/** Draws a declaration after, rather than on, its attached leading grace sequence. */
export class VexFlowGraceNoteGroup extends VF.GraceNoteGroup {
    private trailingDeclaration: VF.GhostNote;

    constructor(notes: VF.GraceNote[], showSlur: boolean, trailingDeclaration: VF.GhostNote) {
        super(notes, showSlur);
        this.trailingDeclaration = trailingDeclaration;
        // VexFlow provides this voice at runtime but omits it from its bundled typings.
        (this as unknown as VF.GraceNoteGroup & {voice: VF.Voice}).voice.addTickable(trailingDeclaration);
    }

    public draw(): void {
        super.draw();
        this.alignSubNotesWithNote([this.trailingDeclaration], this.getNote());
        this.trailingDeclaration.setContext(this.getContext());
        this.trailingDeclaration.draw();
    }
}
