import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";
import { VexFlowBackend } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowBackend";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";

/**
 * Several OSMD instances on one web page, e.g. a preview and a main view, or two sheets.
 * Every instance gives the element of its page N the same id, "osmdCanvasPage" + N, so an instance has to find its pages through
 * its own backends: document.getElementById() returns the first instance's page. The cursor of the second instance moved to a page
 * of the first sheet, and the backends' getCanvasSize() measured the first sheet's page.
 */
describe("Multiple OSMD instances on a web page", () => {
    let containers: HTMLElement[] = [];
    afterEach(() => {
        for (const container of containers) {
            container.remove();
        }
        containers = [];
    });

    /** Loads and renders the sample with a new OSMD instance, in a new container of the given width at the end of the web page. */
    async function renderInNewContainer(width: number, backend: string, pageFormat?: string): Promise<OpenSheetMusicDisplay> {
        const container: HTMLElement = document.createElement("div");
        container.style.width = width + "px";
        document.body.appendChild(container);
        containers.push(container);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend, pageFormat });
        await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
        osmd.render();
        return osmd;
    }

    it("measures and shows the cursor on the instance's own page, with the same page ids in each instance", async () => {
        for (const backendType of ["svg", "canvas"]) {
            // the second sheet is narrower, so its page is higher
            const sheets: OpenSheetMusicDisplay[] = [await renderInNewContainer(1200, backendType), await renderInNewContainer(600, backendType)];
            const pageHeights: number[] = [];
            for (let i: number = 0; i < sheets.length; i++) {
                const backend: VexFlowBackend = sheets[i].Drawer.Backends[0];
                const page: HTMLElement = backend.getInnerElement();
                const sheetName: string = `${backendType}, sheet ${i + 1}`;
                // the ids stay as they were: apps may select or style e.g. #osmdCanvasPage1
                expect(page.id, sheetName).to.equal("osmdCanvasPage1");
                expect(backend.getCanvasSize() === page.offsetHeight,
                       `${sheetName}: getCanvasSize() ${backend.getCanvasSize()}, height of its page ${page.offsetHeight}`).to.equal(true);
                pageHeights.push(page.offsetHeight);
            }
            expect(pageHeights[0] !== pageHeights[1], `${backendType}: the pages have different heights: ${pageHeights}`).to.equal(true);

            const cursor: Cursor = sheets[1].cursor;
            cursor.show();
            expect(containers[1].contains(cursor.cursorElement), `${backendType}: the second sheet's cursor in its container`).to.equal(true);
            for (const container of containers) {
                container.remove();
            }
            containers = [];
        }
    });

    it("moves the cursor to the pages of its own sheet (a page format)", async () => {
        const sheets: OpenSheetMusicDisplay[] = [await renderInNewContainer(1200, "svg", "A5_L"), await renderInNewContainer(1200, "svg", "A5_L")];
        for (const sheet of sheets) {
            expect(sheet.GraphicSheet.MusicPages.length, "pages").to.be.greaterThan(1);
        }
        const osmd: OpenSheetMusicDisplay = sheets[1];
        const cursor: Cursor = osmd.cursor;
        cursor.show();
        const pagesVisited: Set<number> = new Set<number>();
        /** Checks that the cursor is on the page of the second sheet that shows the cursor's measure. */
        const expectOnOwnPage: () => void = (): void => {
            const measure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[cursor.Iterator.CurrentMeasureIndex][0];
            const pageNumber: number = measure.ParentMusicSystem.Parent.PageNumber;
            pagesVisited.add(pageNumber);
            const pageElement: HTMLElement = osmd.Drawer.Backends[pageNumber - 1].getInnerElement();
            expect(cursor.cursorElement.parentElement === pageElement,
                   `the cursor in measure ${measure.MeasureNumber} on page ${pageNumber} of the second sheet` +
                   ` (in the first sheet's container: ${containers[0].contains(cursor.cursorElement)})`).to.equal(true);
        };
        while (!cursor.Iterator.EndReached) {
            expectOnOwnPage();
            cursor.next();
        }
        expect(pagesVisited.size, "pages visited by the cursor").to.equal(osmd.GraphicSheet.MusicPages.length);
        cursor.reset(); // back to the first page
        expectOnOwnPage();
    });

    // VexFlow has the glyph scale and the widths of the staff lines and stems once per page (Vex.Flow.*), and reads them when
    //   the notes are created (load()), in the layout and while drawing. Each instance sets its own before each of these
    //   (VexFlowConverter.applyRulesToVexFlow()): they were only set before drawing, so the notes and the layout of an instance
    //   had the values of the instance drawn before it.
    describe("with different sizes (VexFlowDefaultNotationFontScale, StemWidth, StaffLineWidth)", () => {
        const smallScale: number = 30; // default 39

        /** Creates an instance in a new container: with small note heads and thick stems and staff lines, or with the defaults. */
        function createInstance(smallHeadsThickLines: boolean): OpenSheetMusicDisplay {
            const container: HTMLElement = document.createElement("div");
            container.style.width = "1000px";
            document.body.appendChild(container);
            containers.push(container);
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false, backend: "svg" });
            if (smallHeadsThickLines) {
                osmd.EngravingRules.VexFlowDefaultNotationFontScale = smallScale;
                osmd.EngravingRules.StemWidth = 0.3; // default 0.15
                osmd.EngravingRules.StaffLineWidth = 0.3; // default 0.1
            }
            return osmd;
        }

        /** What the instance has drawn and laid out: sizes that follow the three rules, and positions that follow the layout. */
        function getSizesAndLayout(osmd: OpenSheetMusicDisplay): {
            headWidth: number; stemWidth: string; staffLineWidth: string; layout: string;
        } {
            const svg: HTMLElement = osmd.Drawer.Backends[0].getInnerElement();
            const staffEntryXs: string = osmd.GraphicSheet.MeasureList[0][0].staffEntries
                .map(staffEntry => staffEntry.PositionAndShape.RelativePosition.x.toFixed(3)).join(" ");
            return {
                headWidth: (svg.querySelector("path.vf-notehead") as SVGGraphicsElement).getBBox().width,
                stemWidth: svg.querySelector("path.vf-stem").getAttribute("stroke-width"),
                staffLineWidth: getComputedStyle(svg.querySelector("g.vf-stave path")).strokeWidth,
                layout: `page height ${osmd.GraphicSheet.MusicPages[0].PositionAndShape.Size.height.toFixed(3)}, x of the first measure's` +
                    ` staff entries ${staffEntryXs}`,
            };
        }

        /** Checks that the instance has drawn with its own sizes, and the same layout as in its render before (if given). */
        function expectOwnSizes(osmd: OpenSheetMusicDisplay, smallHeadsThickLines: boolean, defaultHeadWidth: number, step: string,
                                layoutBefore?: string): string {
            const sizes: ReturnType<typeof getSizesAndLayout> = getSizesAndLayout(osmd);
            const scale: number = smallHeadsThickLines ? smallScale / 39 : 1;
            expect(sizes.headWidth, `${step}: width of a note head`).to.be.closeTo(defaultHeadWidth * scale, 0.05);
            expect(sizes.stemWidth, `${step}: stem width`).to.equal(smallHeadsThickLines ? "3" : "1.5");
            expect(sizes.staffLineWidth, `${step}: staff line width`).to.equal(smallHeadsThickLines ? "3px" : "1px");
            if (layoutBefore) {
                expect(sizes.layout, `${step}: the layout of the instance's render before`).to.equal(layoutBefore);
            }
            return sizes.layout;
        }

        it("each instance keeps its own when they are loaded and rendered in turn", async () => {
            const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
            // the default sizes, from an instance that is loaded and rendered right after another default one
            let defaultHeadWidth: number;
            for (let i: number = 0; i < 2; i++) {
                const defaultSheet: OpenSheetMusicDisplay = createInstance(false);
                await defaultSheet.load(score);
                defaultSheet.render();
                defaultHeadWidth = getSizesAndLayout(defaultSheet).headWidth;
            }

            // loaded after instances with other sizes were drawn: the notes get their glyph scale when they are created
            const small: OpenSheetMusicDisplay = createInstance(true);
            await small.load(score);
            small.render();
            const smallLayout: string = expectOwnSizes(small, true, defaultHeadWidth, "small heads, first render");
            const normal: OpenSheetMusicDisplay = createInstance(false);
            await normal.load(score);
            normal.render();
            const normalLayout: string = expectOwnSizes(normal, false, defaultHeadWidth, "default sizes, first render");
            expect(normalLayout !== smallLayout, `the sizes change the layout: ${normalLayout}`).to.equal(true);

            // rendered again after the other one: the layout reads the staff line width
            small.render();
            expectOwnSizes(small, true, defaultHeadWidth, "small heads, second render", smallLayout);
            normal.render();
            expectOwnSizes(normal, false, defaultHeadWidth, "default sizes, second render", normalLayout);

            // drawn again after the other one's render, without a layout in between
            small.render();
            normal.Drawer.clear();
            normal.Drawer.drawSheet(normal.GraphicSheet);
            expectOwnSizes(normal, false, defaultHeadWidth, "default sizes, drawn again", normalLayout);
        });
    });
});
