import { expect } from "chai";
import Vex from "vexflow";
import VF = Vex.Flow;
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { RhythmInstruction, RhythmSymbolEnum } from "../../../src/MusicalScore/VoiceData/Instructions/RhythmInstruction";
import { Fraction } from "../../../src/Common/DataObjects/Fraction";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";

/** The 1.2.93 glyph array is not part of its DefinitelyTyped declaration. */
function numeratorCodes(signature: VF.TimeSignature): string[] {
    const glyphs: { code: string }[] = Reflect.get(signature.getTimeSig().glyph, "topGlyphs");
    return glyphs.map(glyph => glyph.code);
}

describe("Additive time signatures", () => {
    it("uses the VexFlow additive input form and existing plus glyph, without accepting malformed forms", () => {
        const signature: VF.TimeSignature = new VF.TimeSignature("2+2+3/8");
        const codes: string[] = ["v2", "v8b", "v2", "v8b", "v3"];
        expect(numeratorCodes(signature)).to.deep.equal(codes);
        expect(signature.getWidth()).to.equal(codes.reduce((width, code) => width + new VF.Glyph(code, 40).getMetrics().width, 0));
        for (const invalid of ["2++3/8", "0+3/8", "2+3/0", "2+3/4+4"]) {
            expect(() => new VF.TimeSignature(invalid), invalid).to.throw();
        }
    });

    it("keeps model groups consistent and draws source groups and inherited meters in both backends", async () => {
        const groups: number[] = [2, 2, 3];
        const original: RhythmInstruction = new RhythmInstruction(new Fraction(7, 8, 0, false), RhythmSymbolEnum.NONE, groups);
        groups[0] = 8;
        expect(original.NumeratorGroups, "constructor input is copied").to.deep.equal([2, 2, 3]);
        Reflect.set(original.NumeratorGroups, "0", 8);
        expect(original.NumeratorGroups, "the public view cannot change the grouping").to.deep.equal([2, 2, 3]);
        for (const invalid of [[2, 3], [0, 7], [2.5, 4.5]]) {
            expect(() => new RhythmInstruction(new Fraction(7, 8, 0, false), RhythmSymbolEnum.NONE, invalid), invalid.join("+"))
                .to.throw(RangeError);
        }
        expect(() => new RhythmInstruction(new Fraction(7, 8, 1, false), RhythmSymbolEnum.NONE, [2, 2, 3])).to.throw(RangeError);
        const changed: RhythmInstruction = original.clone();
        changed.Rhythm.Numerator = 3;
        expect(changed.NumeratorGroups).to.equal(undefined);
        expect(changed.clone().NumeratorGroups).to.equal(undefined);
        changed.Rhythm = new Fraction(7, 8, 0, false);
        expect(changed.NumeratorGroups, "explicit replacement clears the original grouping").to.equal(undefined);
        const withWholePart: RhythmInstruction = original.clone();
        withWholePart.Rhythm.WholeValue = 1;
        expect(withWholePart.NumeratorGroups, "a changed whole part invalidates the grouping").to.equal(undefined);
        expect(original.NumeratorGroups).to.deep.equal([2, 2, 3]);
        for (const backend of ["svg", "canvas"]) {
            const container: HTMLElement = TestUtils.getDivElement(document);
            container.style.width = "1300px";
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend });
            try {
                await osmd.load(TestUtils.getScore("test_time_signatures_additive.musicxml"));
                const expectedCodes: string[][][] = [
                    [["v2", "v8b", "v2", "v8b", "v3"], ["v2", "v8b", "v2", "v8b", "v3"]],
                    [["v3", "v8b", "v2", "v8b", "v2"], ["v7"]], // An explicit 7/8 in the second part stays unchanged.
                    [["v7"], ["v7"]], // Mixed denominators keep the existing summed representation.
                ];
                for (const measure of osmd.Sheet.SourceMeasures) {
                    expect(measure.ActiveTimeSignature.RealValue, "summed meter").to.equal(7 / 8);
                    expect(measure.Duration.RealValue, "measure duration").to.equal(7 / 8);
                }
                osmd.render();
                for (const [index, staffCodes] of expectedCodes.entries()) {
                    const measures: VexFlowMeasure[] = osmd.GraphicSheet.MeasureList[index] as VexFlowMeasure[];
                    expect(measures, `${backend}, measure ${index + 1}: both staves`).to.have.length(2);
                    for (const [staff, measure] of measures.entries()) {
                        expect(measure, `${backend}, measure ${index + 1}: staff exists`).not.to.equal(undefined);
                        const drawn: VF.TimeSignature = measure.getVFStave().getModifiers()
                            .find(modifier => modifier instanceof VF.TimeSignature) as VF.TimeSignature;
                        expect(numeratorCodes(drawn), `${backend}, measure ${index + 1}, staff ${staff + 1}`)
                            .to.deep.equal(staffCodes[staff]);
                    }
                }
                if (backend === "svg") {
                    const signatures: NodeListOf<Element> = container.querySelectorAll('.vf-measure[id="1"] .vf-timesignature');
                    expect(signatures.length, "both staves").to.equal(2);
                    for (const signature of signatures) {
                        expect(signature.querySelectorAll("path").length, "numerator and denominator").to.equal(6);
                    }
                } else {
                    expect(container.querySelector("canvas")).not.to.equal(null);
                }
            } finally {
                osmd.clear();
                container.remove();
            }
        }
    });
});
