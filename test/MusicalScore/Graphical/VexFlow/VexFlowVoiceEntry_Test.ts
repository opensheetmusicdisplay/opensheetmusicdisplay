import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";

describe("VexFlowVoiceEntry", () => {
    it("applies Note.CustomNoteheadVFCode to matching VexFlow noteheads", (done: Mocha.Done) => {
        const voiceEntry: VexFlowVoiceEntry = new VexFlowVoiceEntry(undefined, undefined);
        voiceEntry.notes = [
            { sourceNote: { CustomNoteheadVFCode: "ue990" } },
            { sourceNote: { CustomNoteheadVFCode: undefined } },
        ] as any;

        voiceEntry.vfStaveNote = {
            note_heads: [
                { glyph_code: "vb" },
                { glyph_code: "vb" },
            ]
        } as any;

        voiceEntry.applyCustomNoteheads();

        chai.expect((voiceEntry.vfStaveNote as any).note_heads[0].glyph_code).to.equal("ue990");
        chai.expect((voiceEntry.vfStaveNote as any).note_heads[1].glyph_code).to.equal("vb");
        done();
    });
});
