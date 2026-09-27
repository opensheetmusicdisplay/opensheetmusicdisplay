import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";
import { CursorType } from "../../../src/OpenSheetMusicDisplay/OSMDOptions";

/**
 * Cursor.update() only redraws the cursor image (canvas -> toDataURL -> img.src) when the image would change,
 * i.e. when the type, color or alpha option changed, or the width of the standard cursor, whose gradient depends on it.
 * It used to redraw on every step, because the check compared the options object with a clone of it (always unequal).
 */
describe("Cursor image redraw", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    /** Loads and renders a sample, shows the cursor, and records the width of each image redraw from then on. */
    async function showCursor(type: CursorType = CursorType.Standard):
        Promise<{ osmd: OpenSheetMusicDisplay, cursor: Cursor, redrawWidths: number[] }> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
        osmd.render();
        const cursor: Cursor = osmd.cursor;
        cursor.CursorOptions.type = type;
        cursor.show();
        expect(cursor.cursorElement.src, "image drawn on show()").to.match(/^data:image\/png/);

        const redrawWidths: number[] = [];
        const stockUpdateStyle: (width: number, ...rest: unknown[]) => void = (cursor as any).updateStyle;
        (cursor as any).updateStyle = function (width: number, ...rest: unknown[]): void {
            redrawWidths.push(width);
            stockUpdateStyle.call(this, width, ...rest);
        };
        return { osmd, cursor, redrawWidths };
    }

    it("doesn't redraw the image when stepping with unchanged width and options", async () => {
        const { cursor, redrawWidths } = await showCursor();
        const image: string = cursor.cursorElement.src;
        for (let i: number = 0; i < 50; i++) {
            cursor.next();
        }
        expect(redrawWidths.length).to.equal(0);
        expect(cursor.cursorElement.src).to.equal(image);
    });

    it("redraws the image when an option is changed in place (#1519)", async () => {
        const { cursor, redrawWidths } = await showCursor();
        const changes: [string, () => void][] = [
            ["color", (): void => { cursor.CursorOptions.color = "#ff0000"; }],
            ["alpha", (): void => { cursor.CursorOptions.alpha = 0.9; }],
            // ThinLeft and ShortThinTopLeft have the same width, so only the type changes
            ["type (ThinLeft)", (): void => { cursor.CursorOptions.type = CursorType.ThinLeft; }],
            ["type (ShortThinTopLeft)", (): void => { cursor.CursorOptions.type = CursorType.ShortThinTopLeft; }],
        ];
        for (const [name, change] of changes) {
            const before: number = redrawWidths.length;
            change();
            cursor.update();
            expect(redrawWidths.length - before, `redraws after changing ${name}`).to.equal(1);
            cursor.next();
            expect(redrawWidths.length - before, `redraws on the next step after changing ${name}`).to.equal(1);
        }
    });

    it("doesn't redraw a solid color image when only the width changes (CurrentArea: measure width)", async () => {
        const { cursor, redrawWidths } = await showCursor(CursorType.CurrentArea);
        const widths: Set<string> = new Set();
        for (let i: number = 0; i < 100; i++) {
            cursor.next();
            widths.add(cursor.cursorElement.getAttribute("width"));
        }
        expect(widths.size, "the sample has measures of different widths").to.be.greaterThan(1);
        expect(redrawWidths.length, "the one pixel image is stretched").to.equal(0);
        expect(cursor.cursorElement.src).to.match(/^data:image\/png/);
    });

    it("redraws the standard cursor's gradient when the width changes (zoom)", async () => {
        const { osmd, cursor, redrawWidths } = await showCursor();
        osmd.zoom = 1.5;
        cursor.update();
        expect(redrawWidths).to.deep.equal([3 * 10 * 1.5]);
    });
});
