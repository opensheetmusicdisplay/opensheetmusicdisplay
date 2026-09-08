import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalInstantaneousTempoExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousTempoExpression";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * Tempo markings are rendered on the first visible staff of the system, all of them: MusicXML from part-based
 * exporters (e.g. Finale) often repeats a tempo marking in every part, which stacked the same marking once per part
 * above the first system. Each distinct marking at a position is rendered once now, and continuous tempo markings
 * (rit., accel.) are registered once instead of twice (which drew them twice at the same spot).
 */
describe("Duplicate tempo expressions", () => {
    /** All rendered tempo labels of the sheet: [text, staff line] */
    function renderedTempoLabels(osmd: OpenSheetMusicDisplay): [string, StaffLine][] {
        const labels: [string, StaffLine][] = [];
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                for (const staffLine of system.StaffLines) {
                    for (const expression of staffLine.AbstractExpressions) {
                        if (expression instanceof GraphicalInstantaneousTempoExpression) {
                            labels.push([expression.GraphicalLabel.Label.text, staffLine]);
                        }
                    }
                }
            }
        }
        return labels;
    }

    /** Two parts, each with the same "Allegro" (words + <sound tempo>) and the same metronome mark in measure 1,
     *  and the same "rit." in measure 2 - the way part-based exporters write a tempo marking for every part. */
    function twoPartsWithRepeatedTempoMarkings(): string {
        const measure1: string = `
        <measure number="1">
          <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
            <clef><sign>G</sign><line>2</line></clef></attributes>
          <direction placement="above"><direction-type><words font-weight="bold">Allegro</words></direction-type><sound tempo="120"/></direction>
          <direction placement="above"><direction-type>
            <metronome><beat-unit>quarter</beat-unit><per-minute>120</per-minute></metronome></direction-type></direction>
          <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
        </measure>`;
        const measure2: string = `
        <measure number="2">
          <direction placement="above"><direction-type><words font-style="italic">rit.</words></direction-type></direction>
          <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
        </measure>`;
        return `<?xml version="1.0" encoding="UTF-8"?>
      <score-partwise version="3.0">
        <part-list>
          <score-part id="P1"><part-name>Flute</part-name></score-part>
          <score-part id="P2"><part-name>Oboe</part-name></score-part>
        </part-list>
        <part id="P1">${measure1}${measure2}</part>
        <part id="P2">${measure1}${measure2}</part>
      </score-partwise>`;
    }

    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    it("renders a tempo marking repeated in every part once (CharlesGounod_Meditation: 'Andante Simplice.' in 5 parts)", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("CharlesGounod_Meditation.xml"));
        osmd.render();
        const andante: [string, StaffLine][] = renderedTempoLabels(osmd).filter(([text]) => text === "Andante Simplice.");
        expect(andante.length, "one 'Andante Simplice.' label").to.equal(1);
        expect(andante[0][1].ParentStaff.idInMusicSheet, "on the first staff").to.equal(0);
    });

    it("renders each distinct marking once per position and keeps a marking that repeats later", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(twoPartsWithRepeatedTempoMarkings());
        osmd.render();
        const texts: string[] = renderedTempoLabels(osmd).map(([text]) => text).filter(text => text !== "");
        expect(texts.filter(text => text === "Allegro").length, "one 'Allegro'").to.equal(1);
        expect(texts.filter(text => text === "rit.").length, "one 'rit.' (in measure 2, a different position)").to.equal(1);
        // the metronome mark is drawn by Vexflow on the stave (VexFlowMeasure.hasMetronomeMark), once per staff-measure
        const measure1Staves: any[] = osmd.GraphicSheet.MeasureList[0];
        expect(measure1Staves.filter(measure => measure.hasMetronomeMark).length, "metronome marks in measure 1").to.equal(1);
    });

    it("still renders the marking when the part that carried the first copy is hidden", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(twoPartsWithRepeatedTempoMarkings());
        osmd.Sheet.Instruments[0].Visible = false;
        osmd.render();
        const allegro: [string, StaffLine][] = renderedTempoLabels(osmd).filter(([text]) => text === "Allegro");
        expect(allegro.length, "one 'Allegro'").to.equal(1);
        expect(allegro[0][1].ParentStaff.ParentInstrument.Name, "on the visible part's staff").to.equal("Oboe");
        const measure1Staves: any[] = osmd.GraphicSheet.MeasureList[0];
        expect(measure1Staves.filter(measure => measure.hasMetronomeMark && measure.ParentStaff.isVisible()).length,
               "metronome mark on the visible staff").to.equal(1);
    });
});
