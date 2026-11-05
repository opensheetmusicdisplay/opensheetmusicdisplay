import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { VexFlowInstrumentBracket } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowInstrumentBracket";
import { VexFlowInstrumentBrace } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowInstrumentBrace";
import { GroupSymbol } from "../../../src/MusicalScore/InstrumentalGroup";
import { TestUtils } from "../../Util/TestUtils";

/**
 * The symbol of a part group (MusicXML group-symbol), what it spans and where it stands: a bracket, a brace, a square bracket
 * (a thin line with right-angled hooks) or a line, and nothing for a group without a symbol. A group nested in a bracketed
 * group stands a column further left (EngravingRules.GroupBracketColumnDistance), as does the brace of a multi-staff part
 * inside one, and the labels move left by as much. Two groups around the same parts are both drawn if their symbols differ.
 * Checked on the brackets' PositionAndShape (set by draw(), in units) against the stafflines' positions.
 */
describe("Part group symbols", () => {
    const names: { [abbr: string]: string } = {
        Fl: "Flute", Ob: "Oboe", Hn: "Horn", Tpt: "Trumpet", Vn: "Violin", Va: "Viola", Vc: "Violoncello", Cb: "Contrabass", Pno: "Piano", Hp: "Harp"
    };
    /** layout: part abbreviations (Pno has two staves), "[bracket" etc. starts a group with that group-symbol, "[" one without
     *  a group-symbol, "]" stops the innermost open group. */
    function scoreXml(layout: string[]): string {
        let partList: string = "";
        let parts: string = "";
        const open: number[] = [];
        for (const token of layout) {
            if (token.startsWith("[")) {
                open.push(open.length + 1);
                const symbol: string = token.length > 1 ? `<group-symbol>${token.substring(1)}</group-symbol>` : "";
                partList += `<part-group type="start" number="${open[open.length - 1]}">${symbol}<group-barline>yes</group-barline></part-group>`;
                continue;
            }
            if (token === "]") {
                partList += `<part-group type="stop" number="${open.pop()}"/>`;
                continue;
            }
            partList += `<score-part id="P_${token}"><part-name>${names[token]}</part-name></score-part>`;
            const clefs: string[] = token === "Pno" ? ["G", "F"] : ["G"];
            let measures: string = "";
            for (let m: number = 1; m <= 2; m++) {
                measures += `<measure number="${m}">`;
                if (m === 1) {
                    measures += "<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats>" +
                        `<beat-type>4</beat-type></time>${clefs.length > 1 ? "<staves>2</staves>" : ""}` +
                        clefs.map((sign: string, i: number): string => `<clef${clefs.length > 1 ? ` number="${i + 1}"` : ""}>` +
                            `<sign>${sign}</sign><line>${sign === "G" ? 2 : 4}</line></clef>`).join("") +
                        "</attributes>";
                }
                measures += clefs.map((sign: string, i: number): string =>
                    `<note><pitch><step>${sign === "G" ? "B" : "D"}</step><octave>${sign === "G" ? 4 : 3}</octave></pitch>` +
                    `<duration>4</duration><voice>${i + 1}</voice><type>whole</type>${clefs.length > 1 ? `<staff>${i + 1}</staff>` : ""}</note>`)
                    .join("<backup><duration>4</duration></backup>");
                measures += "</measure>";
            }
            parts += `<part id="P_${token}">${measures}</part>`;
        }
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\">" +
            `<part-list>${partList}</part-list>${parts}</score-partwise>`;
    }

    const rendered: { container: HTMLElement, osmd: OpenSheetMusicDisplay }[] = [];
    async function firstSystem(score: string[] | string, setRules?: (rules: EngravingRules) => void): Promise<MusicSystem> {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "800px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
        rendered.push({ container, osmd });
        setRules?.(osmd.EngravingRules);
        await osmd.load(typeof score === "string" ? TestUtils.getScore(score) : scoreXml(score));
        osmd.render();
        return osmd.GraphicSheet.MusicPages[0].MusicSystems[0];
    }
    afterEach(() => {
        for (const { container, osmd } of rendered.splice(0)) {
            osmd.clear();
            container.remove();
        }
    });

    function symbols(system: MusicSystem): GroupSymbol[] {
        return system.GroupBrackets.map((bracket: VexFlowInstrumentBracket): GroupSymbol => bracket.Shape);
    }
    /** [top, bottom] of a system's staffline in units. */
    function staffSpan(system: MusicSystem, index: number): [number, number] {
        const top: number = system.StaffLines[index].PositionAndShape.AbsolutePosition.y;
        return [top, top + system.rules.StaffHeight];
    }
    /** [top, bottom] of a bracket in units. */
    function bracketSpan(bracket: VexFlowInstrumentBracket): [number, number] {
        const box: BoundingBox = bracket.PositionAndShape;
        return [box.AbsolutePosition.y, box.AbsolutePosition.y + box.Size.height];
    }
    function expectSpan(bracket: VexFlowInstrumentBracket, system: MusicSystem, firstStaff: number, lastStaff: number, what: string): void {
        const [top, bottom] = bracketSpan(bracket);
        expect(top, `${what}: top at staffline ${firstStaff}`).to.be.closeTo(staffSpan(system, firstStaff)[0], 0.1);
        // drawn to the last line of the last staff, plus the line's thickness
        expect(bottom, `${what}: bottom at staffline ${lastStaff}`).to.be.closeTo(staffSpan(system, lastStaff)[1], 0.3);
    }
    /** How far left of the staves a bracket's left edge is, in units. */
    function reach(bracket: VexFlowInstrumentBracket, system: MusicSystem): number {
        return system.StaffLines[0].PositionAndShape.AbsolutePosition.x - bracket.PositionAndShape.AbsolutePosition.x;
    }
    function reaches(system: MusicSystem): number[] {
        return system.GroupBrackets.map((bracket: VexFlowInstrumentBracket): number => Math.round(reach(bracket, system) * 100) / 100);
    }
    function staffX(system: MusicSystem): number {
        return system.StaffLines[0].PositionAndShape.RelativePosition.x;
    }

    it("draws each group's symbol, and nothing for a group without one", async () => {
        const system: MusicSystem = await firstSystem(
            ["[bracket", "Fl", "Ob", "]", "[brace", "Hn", "Tpt", "]", "[square", "Vn", "Va", "]", "[line", "Vc", "Cb", "]", "[", "Pno", "Hp", "]"]);
        expect(system.StaffLines.length).to.equal(11);
        expect(symbols(system)).to.deep.equal([GroupSymbol.Bracket, GroupSymbol.Brace, GroupSymbol.Square, GroupSymbol.Line]);
        expect(system.GroupBrackets[1]).to.be.instanceOf(VexFlowInstrumentBrace);
        expect(system.GroupBrackets[0]).to.not.be.instanceOf(VexFlowInstrumentBrace);
        // VexFlow's brace is 12 px wide and 2 px from the staves, its bracket's bar 3 px wide and 5 px from them;
        //   a square bracket and a line stand where the bar stands
        expect(reaches(system), "reach left of the staves in units").to.deep.equal([0.5, 1.4, 0.5, 0.5]);
        for (let i: number = 0; i < 4; i++) {
            expectSpan(system.GroupBrackets[i] as VexFlowInstrumentBracket, system, 2 * i, 2 * i + 1, `group ${i}`);
        }
        // the piano's brace is its own (InstrumentBrackets)
        expect(system.InstrumentBrackets.length).to.equal(1);
    });

    it("draws nothing for the groups of the group-name samples, which have no group-symbol", async () => {
        for (const sample of ["test_group_names.musicxml", "test_crossing_part_groups.musicxml"]) {
            const system: MusicSystem = await firstSystem(sample);
            expect(system.GroupBrackets, sample).to.have.length(0);
            expect(system.Labels.length, `${sample}: the part names are still there`).to.be.greaterThanOrEqual(system.StaffLines.length);
        }
        const groupNames: MusicSystem = await firstSystem("test_group_names.musicxml");
        expect(groupNames.Labels.length, "the group names are still there").to.be.greaterThan(groupNames.StaffLines.length);
    });

    it("spans the parts of a nested group, which stands a column further left", async () => {
        const system: MusicSystem = await firstSystem(["[bracket", "Fl", "[square", "Vn", "Va", "]", "]"]);
        expect(symbols(system)).to.deep.equal([GroupSymbol.Bracket, GroupSymbol.Square]);
        expectSpan(system.GroupBrackets[0] as VexFlowInstrumentBracket, system, 0, 2, "outer bracket");
        expectSpan(system.GroupBrackets[1] as VexFlowInstrumentBracket, system, 1, 2, "nested square bracket");
        expect(reaches(system)).to.deep.equal([0.5, 0.5 + system.rules.GroupBracketColumnDistance]);
    });

    it("draws both groups around the same parts when their symbols differ, the inner one a column further left", async () => {
        // MuseScore 3.6.2: a bracket group and a square group (Gould's secondary bracket) around the same two parts
        const system: MusicSystem = await firstSystem("test_layout_first_measure_hidden.musicxml");
        expect(system.StaffLines.length).to.equal(2);
        expect(symbols(system)).to.deep.equal([GroupSymbol.Bracket, GroupSymbol.Square]);
        expectSpan(system.GroupBrackets[0] as VexFlowInstrumentBracket, system, 0, 1, "bracket");
        expectSpan(system.GroupBrackets[1] as VexFlowInstrumentBracket, system, 0, 1, "square bracket");
        expect(reaches(system)).to.deep.equal([0.5, 0.5 + system.rules.GroupBracketColumnDistance]);
        // the same symbol twice is drawn once
        const same: MusicSystem = await firstSystem(["[bracket", "[bracket", "Vn", "Va", "]", "]"]);
        expect(symbols(same)).to.deep.equal([GroupSymbol.Bracket]);
    });

    it("puts each nested bracket a GroupBracketColumnDistance further left, not counting a group without a symbol", async () => {
        const layout: string[] = ["[bracket", "Fl", "[bracket", "Ob", "[square", "Vn", "Va", "]", "]", "]"];
        expect(reaches(await firstSystem(layout))).to.deep.equal([0.5, 1.2, 1.9]);
        expect(reaches(await firstSystem(layout, (rules: EngravingRules): void => { rules.GroupBracketColumnDistance = 1.0; })))
            .to.deep.equal([0.5, 1.5, 2.5]);
        // the middle group has no symbol: nothing is drawn for it, and it takes no column
        const noSymbolBetween: MusicSystem = await firstSystem(["[bracket", "Fl", "[", "Ob", "[square", "Vn", "Va", "]", "]", "]"]);
        expect(symbols(noSymbolBetween)).to.deep.equal([GroupSymbol.Bracket, GroupSymbol.Square]);
        expect(reaches(noSymbolBetween)).to.deep.equal([0.5, 1.2]);
    });

    // layout, the reach of the piano's brace (units), and how much further right the staves start than without the brackets
    //   (the labels move left by as much as the brackets reach beyond a part brace beside the staves)
    const pianos: [string[], number, number][] = [
        [["Vn", "Pno"], 1.4, 0],
        [["[bracket", "Vn", "Pno", "]"], 2.1, 0.7],
        [["[square", "Pno", "Vn", "]"], 2.1, 0.7],
        [["[bracket", "Fl", "[bracket", "Vn", "Pno", "]", "]"], 2.8, 1.4],
        [["[bracket", "Vn", "Va", "]", "Pno"], 1.4, 0],
    ];
    for (const [layout, braceReach, labelRoom] of pianos) {
        it(`puts a piano's brace a column left of the brackets around it, and the labels left of the brace (${layout.join(" ")})`, async () => {
            const system: MusicSystem = await firstSystem(layout);
            expect(system.InstrumentBrackets.length).to.equal(1);
            expect(Math.round(reach(system.InstrumentBrackets[0] as VexFlowInstrumentBracket, system) * 100) / 100).to.equal(braceReach);
            expect(system.Labels.length).to.be.greaterThan(0);
            const noSymbols: MusicSystem = await firstSystem(layout.map((token: string): string => token.startsWith("[") ? "[" : token));
            expect(noSymbols.GroupBrackets).to.have.length(0);
            expect(staffX(system) - staffX(noSymbols)).to.be.closeTo(labelRoom, 1e-9);
        });
    }

    it("leaves the labels where they are when the brackets reach less far than a part brace", async () => {
        const layout: string[] = ["[bracket", "Fl", "Ob", "[square", "Vn", "Va", "]", "]"];
        const system: MusicSystem = await firstSystem(layout);
        expect(reaches(system)).to.deep.equal([0.5, 1.2]); // less than a brace's 1.4
        const noSymbols: MusicSystem = await firstSystem(layout.map((token: string): string => token.startsWith("[") ? "[" : token));
        expect(staffX(system)).to.be.closeTo(staffX(noSymbols), 1e-9);
    });
});
