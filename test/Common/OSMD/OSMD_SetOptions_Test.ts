import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";
import { AutoBeamOptions, CursorOptions, CursorType, IOSMDOptions } from "../../../src/OpenSheetMusicDisplay/OSMDOptions";
import { FontStyles } from "../../../src/Common/Enums/FontStyles";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";

/** osmd.setOptions(): an option that is given is applied, also when it's false, and an option that is left out is kept. */
describe("OSMD setOptions", () => {
    it("turns the tuplet options on and off again", () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
        const rules: EngravingRules = osmd.EngravingRules;
        osmd.setOptions({ tupletsRatioed: true, tupletsBracketed: true, tripletsBracketed: true });
        osmd.setOptions({ drawTitle: false }); // leaving the options out keeps them
        expect([rules.TupletsRatioed, rules.TupletsBracketed, rules.TripletsBracketed], "after setOptions() without the options")
            .to.deep.equal([true, true, true]);
        osmd.setOptions({ tupletsRatioed: false, tupletsBracketed: false, tripletsBracketed: false });
        expect([rules.TupletsRatioed, rules.TupletsBracketed, rules.TripletsBracketed]).to.deep.equal([false, false, false]);
    });

    it("keeps the cursors when cursorsOptions is left out, and gives a new OSMD the standard cursor", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        try {
            /** The type and color of each cursor. */
            const cursorsOf: (instance: OpenSheetMusicDisplay) => string = (instance: OpenSheetMusicDisplay): string =>
                instance.cursors.map(cursor => `${cursor.CursorOptions.type} ${cursor.CursorOptions.color}`).join(", ");
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, {
                autoResize: false,
                cursorsOptions: [
                    { type: CursorType.CurrentArea, color: "#2bb8cd", alpha: 0.6, follow: true },
                    { type: CursorType.ThinLeft, color: "#ff0000", alpha: 0.5, follow: false },
                ],
            });
            await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
            osmd.render();
            osmd.cursorsOptions[0].color = "#123456"; // an option changed in place
            osmd.setOptions({ darkMode: true });
            osmd.render();
            expect(cursorsOf(osmd), "after setOptions() without cursorsOptions").to.equal("3 #123456, 1 #ff0000");

            container.innerHTML = "";
            const osmdWithStandardCursor: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            await osmdWithStandardCursor.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
            osmdWithStandardCursor.render();
            expect(cursorsOf(osmdWithStandardCursor), "a new OSMD").to.equal(`0 ${osmdWithStandardCursor.EngravingRules.DefaultColorCursor}`);
        } finally {
            container.remove();
        }
    });

    it("removes the cursors that new cursorsOptions leave out", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        try {
            const standard: CursorOptions = { type: CursorType.Standard, color: "#33e02f", alpha: 0.5, follow: true };
            const thinLeft: CursorOptions = { type: CursorType.ThinLeft, color: "#ff0000", alpha: 0.5, follow: false };
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, cursorsOptions: [standard, thinLeft] });
            await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
            osmd.render();
            osmd.setOptions({ cursorsOptions: [standard] });
            osmd.render();
            expect(osmd.cursors.length, "cursors after render()").to.equal(1);

            // also without rendering again, where the removed cursor's image was still shown on the page
            osmd.setOptions({ cursorsOptions: [standard, thinLeft] });
            osmd.render();
            const removedCursor: Cursor = osmd.cursors[1];
            removedCursor.show();
            osmd.setOptions({ cursorsOptions: [standard] });
            osmd.enableOrDisableCursors(true);
            expect(osmd.cursors.length, "cursors after enableOrDisableCursors()").to.equal(1);
            expect(removedCursor.cursorElement.isConnected, "the removed cursor's image on the page").to.equal(false);
        } finally {
            container.remove();
        }
    });

    it("keeps the onXMLRead function when it is left out", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        try {
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            let xmlReads: number = 0;
            osmd.setOptions({ onXMLRead: (xml: string): string => { xmlReads++; return xml; } });
            osmd.setOptions({ drawTitle: false });
            await osmd.load(new XMLSerializer().serializeToString(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml")));
            expect(xmlReads, "calls of the onXMLRead function").to.equal(1);
        } finally {
            container.remove();
        }
    });

    it("draws the fingerings and the cursor again when they're turned back on", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        try {
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, disableCursor: true });
            /** The number of fingerings drawn, and of cursors, after a render with the given options. */
            const drawnWith: (options: IOSMDOptions) => number[] = (options: IOSMDOptions): number[] => {
                osmd.setOptions(options);
                osmd.render();
                return [container.querySelectorAll(".osmd-fingering").length, osmd.cursors.length];
            };
            await osmd.load(TestUtils.getScore("test_fingering_left_bach_short.musicxml"));
            const [fingerings, cursors]: number[] = drawnWith({});
            expect(fingerings, "fingerings drawn by default").to.be.greaterThan(0);
            expect(cursors, "cursors with disableCursor").to.equal(0);
            expect(drawnWith({ drawFingerings: false, disableCursor: false }), "fingerings off, cursor on").to.deep.equal([0, 1]);
            expect(drawnWith({ drawFingerings: true }), "fingerings on again").to.deep.equal([fingerings, 1]);
        } finally {
            container.remove();
        }
    });

    it("sets the font style back to regular, and removes the limit of systems and pages to draw with 0", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        try {
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            const rules: EngravingRules = osmd.EngravingRules;
            osmd.setOptions({ defaultFontStyle: FontStyles.Bold });
            osmd.setOptions({ defaultFontStyle: FontStyles.Regular }); // 0
            expect(rules.DefaultFontStyle, "DefaultFontStyle").to.equal(FontStyles.Regular);

            /** The number of systems laid out after a render with the given options. */
            const systemsWith: (options: IOSMDOptions) => number = (options: IOSMDOptions): number => {
                osmd.setOptions(options);
                osmd.render();
                return osmd.GraphicSheet.MusicPages[0].MusicSystems.length;
            };
            await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
            const systems: number = systemsWith({});
            expect(systems, "systems without a limit").to.be.greaterThan(1);
            expect(systemsWith({ drawUpToSystemNumber: 1, drawUpToPageNumber: 1 }), "systems with drawUpToSystemNumber 1").to.equal(1);
            expect(systemsWith({ drawUpToSystemNumber: 0, drawUpToPageNumber: 0 }), "systems with drawUpToSystemNumber 0").to.equal(systems);
            expect(rules.MaxPageToDrawNumber, "MaxPageToDrawNumber with drawUpToPageNumber 0").to.equal(Number.MAX_VALUE);
        } finally {
            container.remove();
        }
    });

    it("does nothing without options (undefined or null), instead of throwing", () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        try {
            const warnings: string[] = TestUtils.catchLogs();
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, drawTitle: false });
            osmd.setOptions(undefined);
            osmd.setOptions(null);
            expect(warnings.length, "warnings").to.equal(2);
            expect(osmd.EngravingRules.RenderTitle, "RenderTitle, set before").to.equal(false);
            // the constructor uses the standard options then
            const osmdWithoutOptions: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, null);
            expect(osmdWithoutOptions.AutoResizeEnabled, "autoResize of an instance created with null as options").to.equal(true);
            osmdWithoutOptions.dispose();
        } finally {
            container.remove();
        }
    });

    it("leaves the options object it is given unchanged, also a frozen one", () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        try {
            const autoBeamOptions: AutoBeamOptions = Object.freeze({ beam_rests: true });
            const options: IOSMDOptions = Object.freeze({ backend: "svg", autoBeam: true, autoBeamOptions });
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, options); // autoResize is left out: on by default
            osmd.setOptions(options);
            osmd.dispose();
            expect(osmd.AutoResizeEnabled, "autoResize, left out").to.equal(true);
            expect(osmd.EngravingRules.AutoBeamOptions, "the AutoBeamOptions used")
                .to.deep.equal({ beam_rests: true, maintain_stem_directions: false });
            expect(JSON.stringify(options), "the options given").to.equal('{"backend":"svg","autoBeam":true,"autoBeamOptions":{"beam_rests":true}}');
        } finally {
            container.remove();
        }
    });
});
