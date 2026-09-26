import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";
import { CursorType } from "../../../src/OpenSheetMusicDisplay/OSMDOptions";

/**
 * Cursor.update() only redraws the cursor image (canvas gradient -> toDataURL -> img.src) when the image would change,
 * i.e. when the width or the type, color or alpha option changed.
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
    async function showCursor(type: CursorType = CursorType.Standard): Promise<{ cursor: Cursor, redrawWidths: number[] }> {
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
        return { cursor, redrawWidths };
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

    it("redraws the image only when the width changes (CurrentArea: measure width)", async () => {
        const { cursor, redrawWidths } = await showCursor(CursorType.CurrentArea);
        const shownWidth: number = (cursor as any).cursorWidthRendered;
        for (let i: number = 0; i < 100; i++) {
            cursor.next();
        }
        expect(redrawWidths.length, "the sample has measures of different widths").to.be.greaterThan(1);
        const drawnWidths: number[] = [shownWidth, ...redrawWidths];
        for (let i: number = 1; i < drawnWidths.length; i++) {
            expect(drawnWidths[i], `redraw ${i} has a new width`).to.not.equal(drawnWidths[i - 1]);
        }
    });
});
