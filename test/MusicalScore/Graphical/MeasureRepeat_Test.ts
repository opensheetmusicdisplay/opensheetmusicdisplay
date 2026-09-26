import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalInstantaneousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalInstantaneousDynamicExpression";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";

/**
 * EngravingRules.RenderMeasureRepeats (default false): draws a measure with a MusicXML measure-repeat
 * declaration as a one-, two- or four-measure repeat sign (simile) instead of its written-out notes. The
 * underlying notes, timestamps, measure widths, cursor and iterator are unaffected either way - only how
 * VexFlowMeasure.draw() draws a qualifying measure's own notes changes.
 */
describe("Measure repeat presentation", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1800px";
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The GraphicalMeasure for one SourceMeasure (by 0-based index) on one staff (by Staff.idInMusicSheet). */
    function findMeasure(instance: OpenSheetMusicDisplay, measureIndex: number, staffIndex: number): GraphicalMeasure {
        return instance.GraphicSheet.MeasureList[measureIndex].find(
            (measure: GraphicalMeasure): boolean => measure?.ParentStaff.idInMusicSheet === staffIndex);
    }

    it("draws a one-measure repeat as a sign with no notes, keeping the notes, timestamps, measure width and " +
        "an independent dynamic inside it unaffected", async () => {
        // rendered separately, with default rules (RenderMeasureRepeats off), to compare the measure width against
        const referenceContainer: HTMLElement = document.createElement("div");
        referenceContainer.style.width = "1800px";
        document.body.appendChild(referenceContainer);
        const referenceOsmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(referenceContainer);
        await referenceOsmd.load(TestUtils.getScore("test_measure_repeat_drums.musicxml"));
        referenceOsmd.render();
        const referenceWidth: number = findMeasure(referenceOsmd, 1, 0).PositionAndShape.Size.width;
        referenceOsmd.clear();
        referenceContainer.remove();

        osmd.EngravingRules.RenderMeasureRepeats = true;
        await osmd.load(TestUtils.getScore("test_measure_repeat_drums.musicxml"));
        osmd.render();

        // measures 2 and 3 (0-based index 1, 2) are each their own one-measure repeat of measure 1's groove
        for (const measureNumber of [2, 3]) {
            const measure: GraphicalMeasure = findMeasure(osmd, measureNumber - 1, 0);
            expect(measure.NotesAreAbbreviated, `measure ${measureNumber} is abbreviated`).to.equal(true);
            const group: Element = container.querySelector(`.vf-measure[id="${measureNumber}"]`);
            expect(group, `measure ${measureNumber} is drawn`).to.not.equal(null);
            expect(group.querySelectorAll(".vf-measure-repeat").length, `measure ${measureNumber} draws one sign`).to.equal(1);
            expect(group.querySelectorAll(".vf-notehead").length, `measure ${measureNumber} draws no noteheads`).to.equal(0);
        }
        // the notes stay in the model with their timestamps: measure 2 keeps the same number of distinct
        //   timestamps (VerticalSourceStaffEntryContainers) as the groove it repeats in measure 1
        expect(osmd.Sheet.SourceMeasures[1].VerticalSourceStaffEntryContainers.length,
            "measure 2 keeps its timestamps").to.equal(osmd.Sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers.length);
        // the measure width is exactly what it would be with the rule off
        expect(findMeasure(osmd, 1, 0).PositionAndShape.Size.width, "measure width unaffected").to.equal(referenceWidth);
        // the "f" dynamic placed inside measure 2 (an independent, direction-based expression) is still drawn
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        expect(staffLine.AbstractExpressions.some(
            (expression): boolean => expression instanceof GraphicalInstantaneousDynamicExpression),
            "the 'f' dynamic inside the repeated measure is still drawn (model)").to.equal(true);
        // ...and actually drawn to the SVG, not just present in the calculated model
        const dynamicTexts: Element[] = Array.from(container.querySelectorAll("text"))
            .filter((text: Element): boolean => text.textContent.trim() === "f");
        expect(dynamicTexts.length, "the 'f' dynamic inside the repeated measure is drawn to the SVG").to.equal(1);
    });

    it("draws a two-measure repeat's sign and number on the middle barline, below the measure number", async () => {
        osmd.EngravingRules.RenderMeasureRepeats = true;
        await osmd.load(TestUtils.getScore("test_measure_repeat_drums.musicxml"));
        osmd.render();

        // measures 6 and 7 (0-based index 5, 6) form one two-measure unit; the sign is drawn once, on measure 7
        expect(findMeasure(osmd, 5, 0).NotesAreAbbreviated, "measure 6").to.equal(true);
        expect(findMeasure(osmd, 6, 0).NotesAreAbbreviated, "measure 7").to.equal(true);
        const measure6Group: Element = container.querySelector('.vf-measure[id="6"]');
        const measure7Group: Element = container.querySelector('.vf-measure[id="7"]');
        expect(measure6Group.querySelectorAll(".vf-measure-repeat").length, "measure 6 draws nothing itself").to.equal(0);
        expect(measure7Group.querySelectorAll(".vf-measure-repeat").length, "measure 7 draws the shared sign").to.equal(1);
        const twoMeasureSign: Element = measure7Group.querySelector(".vf-measure-repeat");

        // the sign is centered close to the barline between measure 6 and measure 7 (that barline is measure 7's own left edge)
        const signBox: DOMRect = twoMeasureSign.getBoundingClientRect();
        const barlineX: number = measure7Group.getBoundingClientRect().left;
        expect(Math.abs((signBox.left + signBox.right) / 2 - barlineX),
            "the sign is centered on the middle barline").to.be.lessThan(20);

        // the "2" is drawn above the staff: the two-measure sign's group reaches higher (smaller top) than a
        //   one-measure sign's group (measure 2's), which has no number and sits within the staff
        const oneMeasureSign: Element = container.querySelector('.vf-measure[id="2"] .vf-measure-repeat');
        expect(twoMeasureSign.getBoundingClientRect().top, "the '2' extends above a plain sign")
            .to.be.lessThan(oneMeasureSign.getBoundingClientRect().top);

        // the measure-number label at that same barline is drawn above the "2" (must not overlap it - this is
        //   the skyline integration in VexFlowMusicSheetCalculator.reserveSkylineForMeasureRepeats())
        const measureNumberLabel: Element = Array.from(container.querySelectorAll(".measure-number"))
            .find((label: Element): boolean => label.textContent.trim() === "7");
        expect(measureNumberLabel, "measure 7's number label is drawn").to.not.equal(undefined);
        // A plain "bottom <= top" (any gap at all, including a hair's-width one) is too fragile a margin for a
        //   regression test: removing the skyline reservation entirely only closes the (properly reserved) 10.6px
        //   gap down to a ~0.5px OVERLAP, which would still accidentally satisfy a bare "<=" check on some runs.
        //   Requiring a comfortable minimum gap instead makes the test reliably fail when the reservation breaks.
        const gap: number = twoMeasureSign.getBoundingClientRect().top - measureNumberLabel.getBoundingClientRect().bottom;
        expect(gap, "the measure number sits comfortably above the sign's number (skyline reservation)").to.be.at.least(5);
    });

    it("abbreviates only the left hand, and keeps the unit right after its own clef change written out", async () => {
        osmd.EngravingRules.RenderMeasureRepeats = true;
        await osmd.load(TestUtils.getScore("test_measure_repeat_piano_left_hand.musicxml"));
        osmd.render();

        // the right hand (staff 1) is never abbreviated
        for (let measureIndex: number = 0; measureIndex < 5; measureIndex++) {
            expect(findMeasure(osmd, measureIndex, 0).NotesAreAbbreviated, `right hand measure ${measureIndex + 1}`).to.equal(false);
        }
        // left hand (staff 2, global staff index 1): measure 1 has no declaration reaching it yet
        expect(findMeasure(osmd, 0, 1).NotesAreAbbreviated, "left hand measure 1").to.equal(false);
        // measure 2 declares a start, but changes clef at its own start - it must stay written out (see T3)
        const clefChangeMeasure: GraphicalMeasure = findMeasure(osmd, 1, 1);
        expect(clefChangeMeasure.NotesAreAbbreviated, "left hand measure 2 (clef change)").to.equal(false);
        expect(clefChangeMeasure.staffEntries.length, "left hand measure 2 keeps its notes").to.be.greaterThan(0);
        // measures 3 and 4: a fresh one-measure repeat, now that the clef has settled
        expect(findMeasure(osmd, 2, 1).NotesAreAbbreviated, "left hand measure 3").to.equal(true);
        expect(findMeasure(osmd, 3, 1).NotesAreAbbreviated, "left hand measure 4").to.equal(true);
        // measure 5 declares the stop and is written out again
        expect(findMeasure(osmd, 4, 1).NotesAreAbbreviated, "left hand measure 5").to.equal(false);
    });

    it("draws no signs with default rules, and adds/removes them when the rule is toggled on the same instance", async () => {
        await osmd.load(TestUtils.getScore("test_measure_repeat_drums.musicxml"));
        osmd.render(); // default rules: RenderMeasureRepeats is off
        expect(container.querySelectorAll(".vf-measure-repeat").length, "default: no signs").to.equal(0);
        const noteheadsByDefault: number = container.querySelectorAll(".vf-notehead").length;
        expect(noteheadsByDefault, "default: notes are drawn").to.be.greaterThan(0);

        osmd.EngravingRules.RenderMeasureRepeats = true;
        osmd.render();
        expect(container.querySelectorAll(".vf-measure-repeat").length, "enabled: signs are drawn").to.be.greaterThan(0);
        expect(container.querySelectorAll(".vf-notehead").length, "enabled: fewer noteheads are drawn")
            .to.be.lessThan(noteheadsByDefault);

        osmd.EngravingRules.RenderMeasureRepeats = false;
        osmd.render();
        expect(container.querySelectorAll(".vf-measure-repeat").length, "disabled again: no signs").to.equal(0);
        expect(container.querySelectorAll(".vf-notehead").length, "disabled again: all notes return").to.equal(noteheadsByDefault);
    });

    it("stops reporting NotesAreAbbreviated for a measure a narrower re-render (drawUpToMeasureNumber) no " +
        "longer draws, instead of trusting a stale ParentStaffLine", async () => {
        osmd.EngravingRules.RenderMeasureRepeats = true;
        await osmd.load(TestUtils.getScore("test_measure_repeat_drums.musicxml"));
        osmd.render(); // full render: measures 2 and 3 (0-based index 1, 2) are each independently abbreviated
        expect(findMeasure(osmd, 2, 0).NotesAreAbbreviated, "first render: measure 3 is abbreviated").to.equal(true);

        osmd.setOptions({ drawUpToMeasureNumber: 2 });
        osmd.render(); // re-render on the SAME instance, now only drawing measures 1-2 - measure 3's own
                       //   GraphicalMeasure instance (reused, not recreated) still carries a ParentStaffLine
                       //   value from the FIRST render, even though it isn't part of the draw range at all now.
        expect(container.querySelectorAll(".vf-measure-repeat").length, "only measure 2's sign is drawn now").to.equal(1);
        expect(findMeasure(osmd, 2, 0).NotesAreAbbreviated,
            "re-render: measure 3 no longer reports abbreviated").to.equal(false);
    });
});

/**
 * Regression tests for defects found in an adversarial review of the measure-repeat presentation feature
 * (2026-09-26), each reproduced against the pre-fix code before being fixed. See the fix commit's own message
 * for the full description of each defect.
 *
 * Most fixtures here are small, purpose-built MusicXML documents parsed inline (see parseXml() below), following
 * the style of test/MusicalScore/ScoreIO/Key_Test.ts and test/MusicalScore/Graphical/VexFlow/VexFlowConverter_Clef_Test.ts,
 * rather than separate files under test/data/ - each one exists solely to reproduce a single specific defect.
 */
describe("Measure repeat presentation: edge cases", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    const xmlParser: DOMParser = new DOMParser();

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1800px";
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The GraphicalMeasure for one SourceMeasure (by 0-based index) on one staff (by Staff.idInMusicSheet). */
    function findMeasure(instance: OpenSheetMusicDisplay, measureIndex: number, staffIndex: number): GraphicalMeasure {
        return instance.GraphicSheet.MeasureList[measureIndex].find(
            (measure: GraphicalMeasure): boolean => measure?.ParentStaff.idInMusicSheet === staffIndex);
    }

    /** Parses a MusicXML string into the Document osmd.load() expects, the same way TestUtils.getScore() hands
     *  back a pre-parsed fixture file's Document. */
    function parseXml(xml: string): Document {
        return xmlParser.parseFromString(xml, "text/xml");
    }

    const wavyLineXml: string = `<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
        <score-partwise version="3.1">
          <part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list>
          <part id="P1">
            <!-- m1: pattern P, referenced by m2's one-measure repeat (used by the full-piece test). -->
            <measure number="1">
              <attributes>
                <divisions>1</divisions><key><fifths>0</fifths></key>
                <time><beats>4</beats><beat-type>4</beat-type></time>
                <clef><sign>G</sign><line>2</line></clef>
              </attributes>
              <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m2: a one-measure repeat of m1's pattern P. An unclosed wavy line declared later, in m5, must still
                 block this from being abbreviated: it is drawn (by calculateSingleWavyLine()) starting from the FIRST
                 RENDERED measure of the staff, not from m5 itself, so it stretches back over m2 too. -->
            <measure number="2">
              <attributes><measure-style><measure-repeat type="start">1</measure-repeat></measure-style></attributes>
              <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m3: the presentation ends here and a second, independent pattern Q begins - referenced by m4's own
                 one-measure repeat. Used by the drawFromMeasureNumber test (draw range starts here), so the reference
                 for m4 stays inside the draw range regardless (see EngravingRules.MinMeasureToDrawIndex). -->
            <measure number="3">
              <attributes><measure-style><measure-repeat type="stop"/></measure-style></attributes>
              <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m4: a one-measure repeat of m3's pattern Q. Also must stay blocked by m5's unclosed wavy line, even
                 when the draw range starts at m3 (so the wavy line, once drawn, starts at m3 - the render's first
                 measure - rather than at m5 where it's declared, and so still reaches over m4). -->
            <measure number="4">
              <attributes><measure-style><measure-repeat type="start">1</measure-repeat></measure-style></attributes>
              <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m5: an unclosed wavy line (trill) starts here and never stops. -->
            <measure number="5">
              <attributes><measure-style><measure-repeat type="stop"/></measure-style></attributes>
              <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type>
                <notations><ornaments><trill-mark/><wavy-line type="start" number="1"/></ornaments></notations>
              </note>
              <barline location="right"><bar-style>light-heavy</bar-style></barline>
            </measure>
          </part>
        </score-partwise>`;

    const crossStaffSlurXml: string = `<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
        <score-partwise version="3.1">
          <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
          <part id="P1">
            <!-- m1: right hand (staff 1) plays a written-out melody throughout. Left hand (staff 2) plays a
                 broken-chord pattern P, establishing it for m2's candidate repeat. -->
            <measure number="1">
              <attributes>
                <divisions>1</divisions><key><fifths>0</fifths></key>
                <time><beats>4</beats><beat-type>4</beat-type></time>
                <staves>2</staves>
                <clef number="1"><sign>G</sign><line>2</line></clef>
                <clef number="2"><sign>F</sign><line>4</line></clef>
              </attributes>
              <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
              <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
              <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
              <note><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
              <backup><duration>4</duration></backup>
              <note><pitch><step>C</step><octave>3</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
              <note><pitch><step>E</step><octave>3</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
              <note><pitch><step>G</step><octave>3</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
              <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
            </measure>
            <!-- m2: left hand repeats pattern P (measure-style start on staff 2) - normally a valid one-measure repeat.
                 But its very first note also ends a slur that STARTS on the right hand's first note in this same
                 measure: a real, visible cross-staff connection reaching into this candidate unit. Per the design
                 contract (same measure AND same staff, not just same measure), this must block the left hand's
                 abbreviation here - the right hand's own measure is never abbreviated regardless, so this connection
                 stays genuinely visible and must not be silently treated as "inside" the left hand's unit. -->
            <measure number="2">
              <attributes><measure-style number="2"><measure-repeat type="start">1</measure-repeat></measure-style></attributes>
              <note><pitch><step>G</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>1</staff>
                <notations><slur number="1" type="start"/></notations>
              </note>
              <note><pitch><step>A</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
              <note><pitch><step>B</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
              <note><pitch><step>C</step><octave>6</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
              <backup><duration>4</duration></backup>
              <note><pitch><step>C</step><octave>3</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff>
                <notations><slur number="1" type="stop"/></notations>
              </note>
              <note><pitch><step>E</step><octave>3</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
              <note><pitch><step>G</step><octave>3</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
              <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
            </measure>
            <!-- m3: presentation ends; both hands written out normally. -->
            <measure number="3">
              <attributes><measure-style number="2"><measure-repeat type="stop"/></measure-style></attributes>
              <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type><staff>1</staff></note>
              <backup><duration>4</duration></backup>
              <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice><type>whole</type><staff>2</staff></note>
            </measure>
            <!-- m4: left hand establishes a fresh, unrelated pattern Q (no cross-staff connections at all). -->
            <measure number="4">
              <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type><staff>1</staff></note>
              <backup><duration>4</duration></backup>
              <note><pitch><step>D</step><octave>3</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
              <note><pitch><step>F</step><octave>3</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
              <note><pitch><step>A</step><octave>3</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
              <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
            </measure>
            <!-- m5: left hand repeats pattern Q - a normal, uncomplicated one-measure repeat with no cross-staff
                 connections. Must still be abbreviated normally: the staff-aware fix above must not become overly
                 conservative and block a genuinely eligible unit. -->
            <measure number="5">
              <attributes><measure-style number="2"><measure-repeat type="start">1</measure-repeat></measure-style></attributes>
              <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type><staff>1</staff></note>
              <backup><duration>4</duration></backup>
              <note><pitch><step>D</step><octave>3</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
              <note><pitch><step>F</step><octave>3</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
              <note><pitch><step>A</step><octave>3</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
              <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
            </measure>
            <!-- m6: presentation ends, both hands close on a written-out final measure. -->
            <measure number="6">
              <attributes><measure-style number="2"><measure-repeat type="stop"/></measure-style></attributes>
              <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type><staff>1</staff></note>
              <backup><duration>4</duration></backup>
              <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice><type>whole</type><staff>2</staff></note>
              <barline location="right"><bar-style>light-heavy</bar-style></barline>
            </measure>
          </part>
        </score-partwise>`;

    const clefChangeXml: string = `<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
        <score-partwise version="3.1">
          <part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list>
          <part id="P1">
            <!-- m1-m2: pattern P (two measures), treble clef - the reference for m3-m4's candidate two-measure unit. -->
            <measure number="1">
              <attributes>
                <divisions>1</divisions><key><fifths>0</fifths></key>
                <time><beats>4</beats><beat-type>4</beat-type></time>
                <clef><sign>G</sign><line>2</line></clef>
              </attributes>
              <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <measure number="2">
              <note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m3-m4: a candidate two-measure repeat of P (declared here). The clef changes to bass clef right at the
                 middle barline - i.e. at the very start of m4 - which OSMD records on m3's own LastInstructionsStaffEntries
                 (a clef change declared at the start of a later measure is shown ahead of time at the end of the
                 previous one), not on m4's FirstInstructionsStaffEntries. This must still block the whole unit: the
                 bass clef is a real, visible change that the sign would otherwise draw over. -->
            <measure number="3">
              <attributes><measure-style><measure-repeat type="start">2</measure-repeat></measure-style></attributes>
              <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <measure number="4">
              <attributes><clef><sign>F</sign><line>4</line></clef></attributes>
              <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m5: presentation ends, written out normally in the new (bass) clef. -->
            <measure number="5">
              <attributes><measure-style><measure-repeat type="stop"/></measure-style></attributes>
              <note><pitch><step>D</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m6: a fresh pattern R (bass clef), referenced by m7's candidate one-measure repeat. -->
            <measure number="6">
              <note><pitch><step>E</step><octave>3</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note>
              <note><pitch><step>F</step><octave>3</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note>
            </measure>
            <!-- m7: a candidate one-measure repeat of R (declared here), but the clef changes back to treble literally
                 in the MIDDLE of this same measure (after the first half note, not at a barline) - OSMD records this
                 directly on the staff entry at that timestamp, not via First/LastInstructionsStaffEntries at all. Left
                 undetected, this measure's notes (and the clef change itself) would be hidden along with the sign, and
                 anything read after it would be misinterpreted under the wrong clef context. -->
            <measure number="7">
              <attributes><measure-style><measure-repeat type="start">1</measure-repeat></measure-style></attributes>
              <note><pitch><step>E</step><octave>3</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note>
              <attributes><clef><sign>G</sign><line>2</line></clef></attributes>
              <note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note>
            </measure>
            <!-- m8: presentation ends, written out normally in treble clef again. -->
            <measure number="8">
              <attributes><measure-style><measure-repeat type="stop"/></measure-style></attributes>
              <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
              <barline location="right"><bar-style>light-heavy</bar-style></barline>
            </measure>
          </part>
        </score-partwise>`;

    const lyricExtenderXml: string = `<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
        <score-partwise version="3.1">
          <part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list>
          <part id="P1">
            <!-- m1: pattern P (no lyric), referenced by m2's plain one-measure repeat. -->
            <measure number="1">
              <attributes>
                <divisions>1</divisions><key><fifths>0</fifths></key>
                <time><beats>4</beats><beat-type>4</beat-type></time>
                <clef><sign>G</sign><line>2</line></clef>
              </attributes>
              <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m2: a plain one-measure repeat of P, with no lyrics involved anywhere - must still be abbreviated
                 normally (the extender check below must not become overly conservative). -->
            <measure number="2">
              <attributes><measure-style><measure-repeat type="start">1</measure-repeat></measure-style></attributes>
              <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m3: presentation ends; a fresh pattern Q begins, ending on a lyric syllable with an extender/melisma
                 line (<extend/>) that keeps going - referenced by m4's own candidate repeat. -->
            <measure number="3">
              <attributes><measure-style><measure-repeat type="stop"/></measure-style></attributes>
              <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type>
                <lyric number="1"><syllabic>single</syllabic><text>ah</text><extend/></lyric>
              </note>
            </measure>
            <!-- m4: a candidate one-measure repeat of Q. The extender line from m3's last lyric syllable would
                 otherwise keep going and end visibly at this measure's now-hidden note instead of wherever it should
                 actually resolve - this must block the unit, even though m4 has no lyric of its own. -->
            <measure number="4">
              <attributes><measure-style><measure-repeat type="start">1</measure-repeat></measure-style></attributes>
              <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m5: presentation ends, written out normally. -->
            <measure number="5">
              <attributes><measure-style><measure-repeat type="stop"/></measure-style></attributes>
              <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
              <barline location="right"><bar-style>light-heavy</bar-style></barline>
            </measure>
          </part>
        </score-partwise>`;

    /** For the "further back" incoming-extender test: the extender's own lyric is TWO measures before the unit,
     *  separated by a plain, lyric-less, non-rest gap measure - calculateLyricExtend() itself isn't bounded to
     *  scanning just one measure ahead, so the unit-eligibility check mustn't be either. */
    const lyricExtenderFurtherBackXml: string = `<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
        <score-partwise version="3.1">
          <part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list>
          <part id="P1">
            <!-- m1: pattern P (no lyric), referenced by m2's plain one-measure repeat (sanity check: still abbreviates). -->
            <measure number="1">
              <attributes>
                <divisions>1</divisions><key><fifths>0</fifths></key>
                <time><beats>4</beats><beat-type>4</beat-type></time>
                <clef><sign>G</sign><line>2</line></clef>
              </attributes>
              <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <measure number="2">
              <attributes><measure-style><measure-repeat type="start">1</measure-repeat></measure-style></attributes>
              <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m3: presentation ends; "ah" starts an extender/melisma line here, TWO measures before the eventual unit. -->
            <measure number="3">
              <attributes><measure-style><measure-repeat type="stop"/></measure-style></attributes>
              <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type>
                <lyric number="1"><syllabic>single</syllabic><text>ah</text><extend/></lyric>
              </note>
            </measure>
            <!-- m4: a plain gap measure - no lyrics, no rest, and no measure-repeat declaration of its own. The
                 extender from m3 keeps running through it (calculateLyricExtend() only stops at a rest or a newer
                 lyric syllable, not at a fixed number of measures). -->
            <measure number="4">
              <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m5: a candidate one-measure repeat of m4. Must stay written out: the "ah" extender from m3, two
                 measures back, is still running by the time it reaches here. -->
            <measure number="5">
              <attributes><measure-style><measure-repeat type="start">1</measure-repeat></measure-style></attributes>
              <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m6: presentation ends; "lu" closes the word, written out normally. -->
            <measure number="6">
              <attributes><measure-style><measure-repeat type="stop"/></measure-style></attributes>
              <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type>
                <lyric number="1"><syllabic>single</syllabic><text>lu</text></lyric>
              </note>
              <barline location="right"><bar-style>light-heavy</bar-style></barline>
            </measure>
          </part>
        </score-partwise>`;

    const hiddenSlurXml: string = `<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
        <score-partwise version="3.1">
          <part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list>
          <part id="P1">
            <!-- m1: pattern P (two half notes, no slur), referenced by m2's candidate repeat. -->
            <measure number="1">
              <attributes>
                <divisions>1</divisions><key><fifths>0</fifths></key>
                <time><beats>4</beats><beat-type>4</beat-type></time>
                <clef><sign>G</sign><line>2</line></clef>
              </attributes>
              <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note>
              <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note>
            </measure>
            <!-- m2: a candidate one-measure repeat of P. Its own two notes are connected by a slur entirely inside this
                 one measure - a genuinely hidden slur (both real endpoints inside the abbreviated unit), which must not
                 even be CONSTRUCTED (not just skipped at draw time), or its invisible curve would still pollute the
                 staffline's skyline/bottomline (see GraphicalSlur.calculateCurve()). -->
            <measure number="2">
              <attributes><measure-style><measure-repeat type="start">1</measure-repeat></measure-style></attributes>
              <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>half</type>
                <notations><slur number="1" type="start"/></notations>
              </note>
              <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>half</type>
                <notations><slur number="1" type="stop"/></notations>
              </note>
            </measure>
            <!-- m3: presentation ends, written out normally. -->
            <measure number="3">
              <attributes><measure-style><measure-repeat type="stop"/></measure-style></attributes>
              <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
              <barline location="right"><bar-style>light-heavy</bar-style></barline>
            </measure>
          </part>
        </score-partwise>`;

    const pathologicalSlashesXml: string = `<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
        <score-partwise version="3.1">
          <part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list>
          <part id="P1">
            <!-- m1-m2: pattern P (two measures), the reference for m3-m4's candidate unit. -->
            <measure number="1">
              <attributes>
                <divisions>1</divisions><key><fifths>0</fifths></key>
                <time><beats>4</beats><beat-type>4</beat-type></time>
                <clef><sign>G</sign><line>2</line></clef>
              </attributes>
              <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <measure number="2">
              <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m3-m4: a two-measure repeat with a hostile "slashes" attribute - a malformed or malicious exporter
                 value that must not translate into an unbounded number of drawn slash marks or an absurdly wide sign
                 (see VexFlowMeasureRepeat's constructor clamp). -->
            <measure number="3">
              <attributes><measure-style><measure-repeat type="start" slashes="20000">2</measure-repeat></measure-style></attributes>
              <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <measure number="4">
              <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
            </measure>
            <!-- m5: presentation ends, written out normally. -->
            <measure number="5">
              <attributes><measure-style><measure-repeat type="stop"/></measure-style></attributes>
              <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
              <barline location="right"><bar-style>light-heavy</bar-style></barline>
            </measure>
          </part>
        </score-partwise>`;

    it("keeps a one-measure repeat written out when an unclosed wavy line is declared later on the staff " +
        "(it is drawn from the first rendered measure, not from where it is declared)",
        async () => {
        osmd.EngravingRules.RenderMeasureRepeats = true;
        await osmd.load(parseXml(wavyLineXml));
        osmd.render();
        // measure 2 (0-based index 1) would otherwise be a valid one-measure repeat of measure 1 - but the
        //   unclosed wavy line declared in measure 5 (after it) must still block it.
        expect(findMeasure(osmd, 1, 0).NotesAreAbbreviated, "measure 2 stays written out").to.equal(false);
    });

    it("keeps blocking a one-measure repeat under a narrower drawFromMeasureNumber range, where the unclosed " +
        "wavy line's own declared measure falls entirely outside the draw range", async () => {
        osmd.EngravingRules.RenderMeasureRepeats = true;
        await osmd.load(parseXml(wavyLineXml));
        osmd.setOptions({ drawFromMeasureNumber: 3 });
        osmd.render();
        // measure 4 (0-based index 3) would otherwise be a valid one-measure repeat of measure 3 (its reference,
        //   measure 3, IS the render's own first drawn measure, so it isn't blocked by the separate
        //   reference-visibility check) - but the unclosed wavy line in measure 5 must still block it, since it
        //   is drawn starting from measure 3 (the first RENDERED measure of this draw range), reaching through it.
        expect(findMeasure(osmd, 3, 0).NotesAreAbbreviated, "measure 4 stays written out").to.equal(false);
    });

    it("keeps a left-hand unit written out when a cross-staff slur reaches into it from the right hand, " +
        "but still abbreviates another left-hand unit",
        async () => {
        osmd.EngravingRules.RenderMeasureRepeats = true;
        await osmd.load(parseXml(crossStaffSlurXml));
        osmd.render();
        // left hand (staff index 1): measure 2 (0-based index 1) has a cross-staff slur reaching in from the
        //   right hand - it must stay written out, even though it would otherwise be a valid one-measure repeat.
        expect(findMeasure(osmd, 1, 1).NotesAreAbbreviated, "left hand measure 2 (cross-staff slur)").to.equal(false);
        // the slur itself must still be drawn normally (not dangling, not vanished): both its real endpoints,
        //   on the now-written-out left hand and the never-abbreviated right hand, are visible. calculateSlurs()
        //   attaches a crossed slur to its START note's own staffline (staff 1, right hand, since the slur
        //   starts there in this fixture) - see calculateSlurs()'s staffLine-major loop.
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const crossStaffSlur: GraphicalSlur = staffLine.GraphicalSlurs.find((gSlur: GraphicalSlur): boolean => gSlur.slur.isCrossed());
        expect(crossStaffSlur, "the cross-staff slur is constructed").to.not.equal(undefined);
        expect(crossStaffSlur.SVGElement, "the cross-staff slur is actually drawn").to.not.equal(undefined);
        // left hand measure 5 (0-based index 4): a fresh, uncomplicated one-measure repeat with no cross-staff
        //   connections at all - must still be abbreviated normally (the staff-aware fix must not overreach).
        expect(findMeasure(osmd, 4, 1).NotesAreAbbreviated, "left hand measure 5 (no crossing)").to.equal(true);
    });

    it("keeps a two-measure unit written out when the clef changes at its own middle barline, and a one-measure " +
        "unit written out when the clef changes literally in the middle of the measure", async () => {
        osmd.EngravingRules.RenderMeasureRepeats = true;
        await osmd.load(parseXml(clefChangeXml));
        osmd.render();
        // measures 3-4 (0-based index 2, 3): a candidate two-measure unit where the clef changes right at the
        //   middle barline (the very start of measure 4, recorded on measure 3's own LastInstructionsStaffEntries,
        //   not measure 4's FirstInstructionsStaffEntries) - must stay written out.
        expect(findMeasure(osmd, 2, 0).NotesAreAbbreviated, "measure 3 (clef change at middle barline)").to.equal(false);
        expect(findMeasure(osmd, 3, 0).NotesAreAbbreviated, "measure 4 (clef change at middle barline)").to.equal(false);
        // measure 7 (0-based index 6): a candidate one-measure unit where the clef changes literally in the
        //   middle of the measure (not at a barline at all) - must also stay written out.
        expect(findMeasure(osmd, 6, 0).NotesAreAbbreviated, "measure 7 (mid-measure clef change)").to.equal(false);
    });

    it("checks the reference pattern's visibility against the current draw range on re-render, not " +
        "a ParentStaffLine left over from an earlier, wider render of the same instance", async () => {
        osmd.EngravingRules.RenderMeasureRepeats = true;
        await osmd.load(TestUtils.getScore("test_measure_repeat_drums.musicxml"));
        osmd.render(); // first, full render: measure 2 (index 1) is validly abbreviated (measure 1 is drawn too)
        expect(findMeasure(osmd, 1, 0).NotesAreAbbreviated, "first render: measure 2 is abbreviated").to.equal(true);

        osmd.setOptions({ drawFromMeasureNumber: 2 });
        osmd.render(); // re-render on the SAME instance, now starting at measure 2 - its reference (measure 1)
                       //   is no longer part of the draw range at all, even though its GraphicalMeasure instance
                       //   (reused, not recreated) still carries a ParentStaffLine value from the FIRST render.
        expect(findMeasure(osmd, 1, 0).NotesAreAbbreviated, "re-render: measure 2 stays written out").to.equal(false);
    });

    it("keeps a unit written out when a lyric extender line arrives from the measure right before it, but still " +
        "abbreviates a plain unit with no lyrics involved at all", async () => {
        osmd.EngravingRules.RenderMeasureRepeats = true;
        await osmd.load(parseXml(lyricExtenderXml));
        osmd.render();
        expect(findMeasure(osmd, 1, 0).NotesAreAbbreviated, "measure 2 (no lyrics involved)").to.equal(true);
        expect(findMeasure(osmd, 3, 0).NotesAreAbbreviated, "measure 4 (incoming extender from measure 3)").to.equal(false);
    });

    it("keeps a unit written out when an incoming lyric extender started further back, across a measure " +
        "without lyrics, with the stopping rule of calculateLyricExtend()", async () => {
        osmd.EngravingRules.RenderMeasureRepeats = true;
        await osmd.load(parseXml(lyricExtenderFurtherBackXml));
        osmd.render();
        // measure 2 (index 1): a plain repeat, nothing lyric-related nearby - still abbreviates normally.
        expect(findMeasure(osmd, 1, 0).NotesAreAbbreviated, "measure 2 (no lyrics nearby)").to.equal(true);
        // measure 5 (index 4): the "ah" extender from measure 3 runs through the plain gap measure 4 (no lyrics,
        //   no rest) and is still running when it reaches measure 5 - must stay written out.
        expect(findMeasure(osmd, 4, 0).NotesAreAbbreviated, "measure 5 (extender from two measures back)").to.equal(false);
    });

    it("does not create a slur that is entirely inside an abbreviated unit, so an invisible curve " +
        "does not change the skyline or bottom line", async () => {
        osmd.EngravingRules.RenderMeasureRepeats = true;
        await osmd.load(parseXml(hiddenSlurXml));
        osmd.render();
        expect(findMeasure(osmd, 1, 0).NotesAreAbbreviated, "measure 2 is abbreviated").to.equal(true);
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        expect(staffLine.GraphicalSlurs.length, "the hidden slur is never constructed").to.equal(0);
    });

    it("draws at most 4 slashes for a very large 'slashes' value", async () => {
        osmd.EngravingRules.RenderMeasureRepeats = true;
        await osmd.load(parseXml(pathologicalSlashesXml));
        osmd.render();
        const signGroup: Element = container.querySelector(".vf-measure-repeat");
        expect(signGroup, "the sign is drawn").to.not.equal(null);
        // a small, bounded number of drawn shapes (4 clamped slashes + 2 dots + the "2" digit glyph), nowhere
        //   near what "slashes=20000" would produce unclamped.
        expect(signGroup.children.length, "a bounded number of drawn shapes").to.be.at.most(12);
        expect(signGroup.getBoundingClientRect().width, "a bounded sign width").to.be.lessThan(500);
    });
});
