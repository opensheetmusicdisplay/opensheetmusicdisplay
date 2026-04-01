import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";

describe("VexFlowVoiceEntry", () => {
    it("applies CustomNoteheadVFCode onto VexFlow note_heads glyph_code", () => {
        const entry: VexFlowVoiceEntry = Object.create(VexFlowVoiceEntry.prototype) as VexFlowVoiceEntry;
        const mockNoteheads: any[] = [{ glyph_code: "v3e" }, { glyph_code: "v3e" }];
        (entry as any).mVexFlowStaveNote = { note_heads: mockNoteheads };
        (entry as any).notes = [
            { sourceNote: { CustomNoteheadVFCode: "ue990" } },
            { sourceNote: { CustomNoteheadVFCode: undefined } },
        ];

        entry.applyCustomNoteheads();

        chai.expect(mockNoteheads[0].glyph_code).to.equal("ue990");
        chai.expect(mockNoteheads[1].glyph_code).to.equal("v3e");
    });
});
