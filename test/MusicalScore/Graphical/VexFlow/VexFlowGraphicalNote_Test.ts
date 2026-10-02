import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalTie } from "../../../../src/MusicalScore/Graphical/GraphicalTie";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TabNote } from "../../../../src/MusicalScore/VoiceData/TabNote";
import { TestUtils } from "../../../Util/TestUtils";
import Vex from "vexflow";
import VF = Vex.Flow;

describe("VexFlow GraphicalNote", () => {
    it("Can get SVG elements for note, stem and beam", (done: Mocha.Done) => {
        //const url: string = "base/test/data/test_rest_positioning_8th_quarter.musicxml"; // doesn't work, works for Mozart Clarinet Quintet
        const score: Document = TestUtils.getScore("test_beam_svg_double.musicxml");
        // sample should start with a beamed 8th note, and be simple.
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        // we need this way of creating the score to get the SVG elements, doesn't work with creating MusicSheet by hand
        osmd.load(score).then(
            (_: {}) => {
                 osmd.render();
                 const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);
                 const note1: VexFlowGraphicalNote = (gm.staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                 const noteSVG: SVGGElement = note1.getSVGGElement();
                 expect(noteSVG).to.not.be.null;
                 expect(noteSVG).to.not.be.undefined;
                 // const noteSVGId: string = "vf-" + firstNote.getSVGId();
                 // const noteSVG: HTMLElement = document.getElementById(noteSVGId);
                 //const stemSVGId: string = noteSVGId + "-stem";
                 //const stemSVG: HTMLElement = document.getElementById(stemSVGId);
                 const stemSVG: HTMLElement = note1.getStemSVG();
                 expect(stemSVG).to.not.be.null;
                 expect(stemSVG).to.not.be.undefined;
                 // const beamSVGId: string = noteSVGId + "-beam";
                 // const beamSVG: HTMLElement = document.getElementById(beamSVGId);
                 const beamSVGs: HTMLElement[] = note1.getBeamSVGs();
                 expect(beamSVGs.length).to.equal(1); // 8th beam start. (16th beam starts on note2)
                 expect(beamSVGs[0]).to.not.be.null;
                 expect(beamSVGs[0]).to.not.be.undefined;
                 const note2: VexFlowGraphicalNote = (gm.staffEntries[1].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                 expect(note2.getBeamSVGs().length).to.equal(1); // start of 16th beam
                 const note3: VexFlowGraphicalNote = (gm.staffEntries[2].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                 expect(note3.getBeamSVGs().length).to.equal(0); // end of 16th beam
                 const note4: VexFlowGraphicalNote = (gm.staffEntries[3].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                 expect(note4.getBeamSVGs().length).to.equal(2); // 16th beams start
                 done();
            },
            done
        );
     });

    it("Can get the SVG element of a TAB note, e.g. to hide it", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(TestUtils.getScore("test_tab_grace_note_simple.musicxml")); // TAB only: a quarter, a grace note, a half note
        osmd.render();
        const notes: VexFlowGraphicalNote[] = osmd.GraphicSheet.MeasureList.flatMap(verticalMeasures => verticalMeasures[0].staffEntries)
            .flatMap(staffEntry => staffEntry.graphicalVoiceEntries).map(voiceEntry => voiceEntry.notes[0] as VexFlowGraphicalNote)
            .filter(note => !note.sourceNote.isRest());
        expect(notes.length).to.equal(3);
        for (const note of notes) {
            expect(note.getSVGGElement()?.id, `SVG element of ${note.sourceNote.Pitch.ToStringShort(3)}`).to.equal("vf-" + note.getSVGId());
        }
        notes[0].setVisible(false);
        expect(notes[0].getSVGGElement().getAttribute("visibility")).to.equal("hidden");
        div.remove();
    });

    it("Can color a TAB note: its fret number and its bend", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(TestUtils.getScore("test_tabs_bend_and_release.musicxml")); // TAB only, one note with bends
        osmd.render();
        const notes: VexFlowGraphicalNote[] = osmd.GraphicSheet.MeasureList.flatMap(verticalMeasures => verticalMeasures[0].staffEntries)
            .flatMap(staffEntry => staffEntry.graphicalVoiceEntries).map(voiceEntry => voiceEntry.notes[0] as VexFlowGraphicalNote)
            .filter(note => !note.sourceNote.isRest());
        const bentNote: VexFlowGraphicalNote = notes.find(note => (note.sourceNote as TabNote).BendArray?.length > 0);
        const otherNote: VexFlowGraphicalNote = notes.find(note => note !== bentNote);
        expect(Boolean(bentNote && otherNote), "a note with a bend, and another note").to.equal(true);

        bentNote.setColor("#ff0000");
        const fret: Element = bentNote.getSVGGElement().querySelector(":scope > text");
        expect(bentNote.getNoteheadSVGs()[0] === fret, "the fret number is the note head").to.equal(true);
        expect(fret.getAttribute("fill")).to.equal("#ff0000");
        expect(bentNote.getSVGGElement().querySelector(":scope > rect").getAttribute("fill"), "background of the fret number").to.equal("white");
        const bend: Element[] = bentNote.getModifierSVGs();
        const curves: Element[] = bend.filter(shape => shape.getAttribute("fill") === "none");
        expect(curves.length, "bend curves").to.be.greaterThan(0);
        expect(curves.every(curve => curve.getAttribute("stroke") === "#ff0000"), "curves stroked in the color").to.equal(true);
        expect(bend.filter(shape => shape.getAttribute("fill") !== "none").every(shape => shape.getAttribute("fill") === "#ff0000"),
            "labels and arrows filled with the color").to.equal(true);
        expect(otherNote.getNoteheadSVGs()[0].getAttribute("fill"), "another note").to.equal("#000000");
        div.remove();
    });

    /** The notes of a measure in a staff, one per staff entry (the samples used with it have one voice and no chords). */
    function measureNotes(osmd: OpenSheetMusicDisplay, measureIndex: number, staffIndex: number): VexFlowGraphicalNote[] {
        return osmd.GraphicSheet.MeasureList[measureIndex][staffIndex].staffEntries
            .map(staffEntry => staffEntry.graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
    }
    const isHidden: (element: Element) => boolean = (element: Element) => element.getAttribute("visibility") === "hidden";
    const staves: [number, string][] = [[0, "standard staff"], [1, "TAB staff"]];

    // A guitar part with a standard and a TAB staff, with the same slides. Measure 3 starts with a slide from E to F#.
    it("Hides the slides starting at a note with setVisible(), in a standard and a TAB staff", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(TestUtils.getScore("test_slides_standard_and_tab_staff.musicxml"));
        osmd.render();
        for (const [staffIndex, staff] of staves) {
            const [slideStart, slideEnd] = measureNotes(osmd, 2, staffIndex);
            const slides: HTMLElement[] = slideStart.getGlissandoSVGs();
            expect(slides.length, `${staff}: the slide of measure 3`).to.equal(1);
            expect(slides[0].textContent, `${staff}: the line, and the label in TAB`).to.equal(staffIndex === 1 ? "sl." : "");
            expect(slideEnd.getGlissandoSVGs().length, `${staff}: the slide belongs to its start note`).to.equal(0);

            slideEnd.setVisible(false);
            expect(isHidden(slides[0]), `${staff}: hiding the end note keeps the slide, like a tie or slur`).to.equal(false);
            slideStart.setVisible(false, { applyToGlissandi: false });
            expect(isHidden(slides[0]), `${staff}: applyToGlissandi: false`).to.equal(false);
            slideStart.setVisible(false);
            expect(isHidden(slides[0]), `${staff}: hidden with its start note`).to.equal(true);
            slideStart.setVisible(true);
            expect(isHidden(slides[0]), `${staff}: shown again`).to.equal(false);
        }
        div.remove();
    });

    /** The colors of a glissando's shapes: the stroke of each line, then the fill of each label ("sl." in a TAB staff). */
    function glissandoColors(glissando: Element): string[] {
        return [...Array.from(glissando.querySelectorAll("path")).map(line => line.getAttribute("stroke")),
            ...Array.from(glissando.querySelectorAll("text")).map(label => label.getAttribute("fill"))];
    }

    it("Colors the slides starting at a note with setColor() and applyToGlissandi, in a standard and a TAB staff", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(TestUtils.getScore("test_slides_standard_and_tab_staff.musicxml"));
        osmd.render();
        const color: string = "#ff0000";
        for (const [staffIndex, staff] of staves) {
            const [slideStart, slideEnd] = measureNotes(osmd, 2, staffIndex);
            const slide: HTMLElement = slideStart.getGlissandoSVGs()[0];
            const drawnColors: string[] = glissandoColors(slide);
            expect(drawnColors.length, `${staff}: the line, and the label in TAB`).to.equal(staffIndex === 1 ? 2 : 1);
            expect(drawnColors.every(drawnColor => drawnColor.startsWith("#000000")), `${staff}: drawn in black`).to.equal(true);

            slideEnd.setColor(color, { applyToGlissandi: true });
            expect(glissandoColors(slide), `${staff}: coloring the end note doesn't color the slide, like a tie or slur`).to.deep.equal(drawnColors);
            slideStart.setColor(color);
            expect(glissandoColors(slide), `${staff}: not colored by default`).to.deep.equal(drawnColors);
            slideStart.setColor(color, { applyToGlissandi: true });
            expect(glissandoColors(slide), `${staff}: colored with its start note`).to.deep.equal(drawnColors.map(() => color));
        }
        div.remove();
    });

    // The same sample with a system break before measure 2: the slide from the last note of measure 1 is drawn in two parts.
    it("Colors and hides both parts of a slide across a system break with its start note", async () => {
        const score: Document = TestUtils.getScore("test_slides_standard_and_tab_staff.musicxml").cloneNode(true) as Document;
        const measure2: Element = score.querySelector("measure[number='2']");
        const newSystem: Element = score.createElement("print");
        newSystem.setAttribute("new-system", "yes");
        measure2.insertBefore(newSystem, measure2.firstChild);
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(score);
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        osmd.render();
        expect(osmd.GraphicSheet.MeasureList[1][0].ParentMusicSystem === osmd.GraphicSheet.MeasureList[0][0].ParentMusicSystem,
            "premise: measure 2 starts a new system").to.equal(false);
        for (const [staffIndex, staff] of staves) {
            const slideStart: VexFlowGraphicalNote = measureNotes(osmd, 0, staffIndex)[3];
            const parts: HTMLElement[] = slideStart.getGlissandoSVGs();
            expect(parts.length, `${staff}: a part in each system`).to.equal(2);
            expect(parts[0].closest(".staffline") === parts[1].closest(".staffline"), `${staff}: parts in the same system`).to.equal(false);
            slideStart.setColor("#ff0000", { applyToGlissandi: true });
            expect(parts.every(part => glissandoColors(part).every(partColor => partColor === "#ff0000")), `${staff}: both parts colored`).to.equal(true);
            slideStart.setVisible(false);
            expect(parts.every(isHidden), `${staff}: both parts hidden`).to.equal(true);
        }
        div.remove();
    });

    /** Renders a half note tied across the barline to measure 2, after a half rest (test_tie_enharmonic_spelling_1694).
     *  With a system break before measure 2, the tie is drawn in two parts, one in each system. */
    async function renderTiedHalfNote(div: HTMLElement, systemBreak: boolean): Promise<OpenSheetMusicDisplay> {
        const score: Document = TestUtils.getScore("test_tie_enharmonic_spelling_1694.musicxml").cloneNode(true) as Document;
        if (systemBreak) {
            const measure2: Element = score.querySelector("measure[number='2']");
            const newSystem: Element = score.createElement("print");
            newSystem.setAttribute("new-system", "yes");
            measure2.insertBefore(newSystem, measure2.firstChild);
        }
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(score);
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        osmd.render();
        expect(osmd.GraphicSheet.MeasureList[1][0].ParentMusicSystem === osmd.GraphicSheet.MeasureList[0][0].ParentMusicSystem,
            systemBreak ? "premise: measure 2 starts a new system" : "premise: one system").to.equal(!systemBreak);
        return osmd;
    }

    it("Hides both parts of a tie across a system break with its start note", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = await renderTiedHalfNote(div, true);
        const tieStart: VexFlowGraphicalNote = measureNotes(osmd, 0, 0)[1]; // after a half rest
        const tieEnd: VexFlowGraphicalNote = measureNotes(osmd, 1, 0)[0];
        const parts: HTMLElement[] = tieStart.getTieSVGs();
        expect(parts.length, "a part in each system").to.equal(2);
        expect(parts[0].closest(".staffline") === parts[1].closest(".staffline"), "parts in the same system").to.equal(false);
        expect(tieEnd.getTieSVGs().length, "the tie belongs to its start note").to.equal(0);

        tieEnd.setVisible(false);
        expect(parts.some(isHidden), "hiding the end note keeps the tie").to.equal(false);
        tieStart.setVisible(false);
        expect(parts.every(isHidden), "both parts hidden").to.equal(true);
        div.remove();
    });

    it("Gets the SVG groups of a tie's parts from its GraphicalTie, in one system and across a system break", async () => {
        for (const systemBreak of [false, true]) {
            const tie: string = systemBreak ? "tie across a system break" : "tie in one system";
            const div: HTMLElement = TestUtils.getDivElement(document);
            const osmd: OpenSheetMusicDisplay = await renderTiedHalfNote(div, systemBreak);
            const graphicalTie: GraphicalTie = osmd.GraphicSheet.MeasureList[0][0].staffEntries[1].GraphicalTies[0];
            const parts: HTMLElement[] = (graphicalTie.StartNote as VexFlowGraphicalNote).getTieSVGs(); // in the order of the systems
            expect(parts.length, `${tie}: premise, the parts the start note finds`).to.equal(systemBreak ? 2 : 1);
            expect(graphicalTie.vfTies.length, `${tie}: a Vexflow tie for each part`).to.equal(parts.length);
            expect(graphicalTie.SVGElements, `${tie}: the SVG groups of its parts, in order`).to.have.ordered.members(parts);
            expect(graphicalTie.SVGElement === parts[0], `${tie}: SVGElement, the part in the first system`).to.equal(true);
            div.remove();
        }
    });

    // A TAB staff with a hammer-on from note 1 to 2, and a pull-off from note 3 to 4.
    it("Hides and colors the label of a hammer-on or pull-off with its tie", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(TestUtils.getScore("OSMD_Function_Test_Tablature_Hammeron_Pulloff.musicxml"));
        osmd.render();
        const notes: VexFlowGraphicalNote[] = measureNotes(osmd, 0, 0);
        for (const [noteIndex, label] of [[0, "H"], [2, "P"]] as [number, string][]) {
            const tie: HTMLElement = notes[noteIndex].getTieSVGs()[0];
            const text: Element = tie?.querySelector("text");
            expect(text?.textContent, `${label}: in the tie's group`).to.equal(label);
            notes[noteIndex].setColor("#ff0000", { applyToTies: true });
            expect(text.getAttribute("fill"), `${label}: colored with the tie`).to.equal("#ff0000");
            notes[noteIndex].setVisible(false);
            expect(isHidden(tie), `${label}: hidden with the tie`).to.equal(true);
        }
        div.remove();
    });

    /** Whether the curve of a tie's SVG group bends upwards: its path's first control point is above its start
     *  (Vexflow's StaveTie.renderTie() draws "M<start x> <start y>Q<control x> <control y>,..."). */
    function curvesUpwards(tie: Element): boolean {
        const [, startY, controlY] = tie.querySelector("path").getAttribute("d").match(/^M\S+ (\S+)Q\S+ (\S+),/).map(Number);
        return controlY < startY;
    }

    // A TAB staff with a hammer-on, a pull-off and a tie, each from the last note of measure 1, 2 and 3 to the first note
    //   of the next measure, which starts a new system.
    it("Draws a hammer-on, pull-off or tie across a system break in a TAB staff as a TAB tie, labeled in the first system", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(TestUtils.getScore("test_tab_hammer-on_pull-off_tie_across_system_breaks.musicxml"));
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        osmd.render();
        const systemCount: number = new Set(osmd.GraphicSheet.MeasureList.map(verticalMeasures => verticalMeasures[0].ParentMusicSystem)).size;
        expect(systemCount, "premise: each measure starts a new system").to.equal(4);
        for (const [measureIndex, label] of [[0, "H"], [1, "P"], [2, ""]] as [number, string][]) {
            const name: string = `${label ? label : "tie"} from measure ${measureIndex + 1}`;
            const tieStart: VexFlowGraphicalNote = measureNotes(osmd, measureIndex, 0)[1];
            const graphicalTie: GraphicalTie = tieStart.parentVoiceEntry.parentStaffEntry.GraphicalTies[0];
            expect(graphicalTie.vfTies.map(vfTie => vfTie instanceof VF.TabTie), `${name}: a TAB tie for each part`).to.deep.equal([true, true]);
            const parts: HTMLElement[] = tieStart.getTieSVGs();
            expect(parts.length, `${name}: a part in each system`).to.equal(2);
            expect(parts.map(part => part.textContent), `${name}: the label in the first system only`).to.deep.equal([label, ""]);
            expect(parts.every(curvesUpwards), `${name}: both parts curved upwards`).to.equal(true);
        }
        div.remove();
    });

    /** A note of the given pitch (e.g. "C5") and length in quarters (1, 2 or 4), tied from the previous note if tiedFromPrevious,
     *  and to the next note if tieOrientation is given: "over", "under", or "" for none. */
    function tiedNote(pitch: string, quarters: number, tiedFromPrevious: boolean, tieOrientation?: string, voice: number = 1): string {
        const type: string = quarters === 4 ? "whole" : quarters === 2 ? "half" : "quarter";
        const stop: string = tiedFromPrevious ? "<tied type='stop'/>" : "";
        const start: string = tieOrientation === undefined ? "" : `<tied type="start"${tieOrientation ? ` orientation="${tieOrientation}"` : ""}/>`;
        return `<note><pitch><step>${pitch[0]}</step><octave>${pitch[1]}</octave></pitch><duration>${quarters}</duration>` +
            `<voice>${voice}</voice><type>${type}</type><notations>${stop}${start}</notations></note>`;
    }

    /** Renders a score of one staff (treble clef, 4/4) with the given measures, each starting a new system if systemBreaks. */
    async function renderMeasures(div: HTMLElement, measures: string[], systemBreaks: boolean): Promise<OpenSheetMusicDisplay> {
        const attributes: string = "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
            "<clef><sign>G</sign><line>2</line></clef></attributes>";
        const measuresXml: string = measures.map((content: string, i: number) => `<measure number="${i + 1}">` +
            (i === 0 ? attributes : systemBreaks ? "<print new-system='yes'/>" : "") + content + "</measure>").join("");
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(new DOMParser().parseFromString("<score-partwise version='4.0'><part-list><score-part id='P1'>" +
            `<part-name>Piano</part-name></score-part></part-list><part id="P1">${measuresXml}</part></score-partwise>`, "application/xml"));
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = true;
        osmd.render();
        const systemCount: number = new Set(osmd.GraphicSheet.MeasureList.map(verticalMeasures => verticalMeasures[0].ParentMusicSystem)).size;
        expect(systemCount, "premise: the systems").to.equal(systemBreaks ? measures.length : 1);
        return osmd;
    }

    it("Draws each tie of tied notes once", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = await renderMeasures(div, [tiedNote("C5", 1, false, "") + tiedNote("C5", 1, true, "") +
            tiedNote("C5", 1, true, "") + tiedNote("C5", 1, true)], false); // four tied quarters
        expect(measureNotes(osmd, 0, 0).map(note => note.getTieSVGs().length), "the tie starting at each note").to.deep.equal([1, 1, 1, 0]);
        div.remove();
    });
});
