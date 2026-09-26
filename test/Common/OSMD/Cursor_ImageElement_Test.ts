import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";
import { CursorType } from "../../../src/OpenSheetMusicDisplay/OSMDOptions";

/**
 * The cursor is an img element (cursor.cursorElement) showing a one pixel high image that is stretched to the cursor's size.
 */
describe("Cursor image element", () => {
    let container: HTMLElement;
    let pageStyle: HTMLStyleElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
        pageStyle?.remove();
        pageStyle = undefined;
    });

    /** Loads and renders a sample and shows the cursor, once its image is loaded (the image's size affects the layout). */
    async function showCursor(type: CursorType = CursorType.Standard): Promise<Cursor> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
        osmd.render();
        const cursor: Cursor = osmd.cursor;
        cursor.CursorOptions.type = type;
        cursor.show();
        await cursor.cursorElement.decode();
        return cursor;
    }

    it("keeps its height with page CSS that overrides the height attribute, like Tailwind's img { height: auto }", async () => {
        pageStyle = document.createElement("style");
        pageStyle.textContent = "img { max-width: 100%; height: auto; }"; // from Tailwind's base styles (preflight)
        document.head.appendChild(pageStyle);
        const cursor: Cursor = await showCursor();
        const height: number = cursor.cursorElement.getBoundingClientRect().height;
        // the height of the system, not the 1 pixel of the image
        expect(height).to.be.greaterThan(50);
        expect(height).to.be.closeTo(Number.parseFloat(cursor.cursorElement.getAttribute("height")), 1);
    });

    it("keeps a height that the app set with !important", async () => {
        const cursor: Cursor = await showCursor();
        cursor.cursorElement.style.setProperty("height", "50px", "important");
        cursor.next();
        cursor.next();
        expect(cursor.cursorElement.getBoundingClientRect().height).to.equal(50);
    });

    it("fades the standard cursor out to transparent at both sides, not to white (no light edges on dark backgrounds)", async () => {
        const cursor: Cursor = await showCursor();
        const image: HTMLImageElement = cursor.cursorElement;
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = 1;
        const context: CanvasRenderingContext2D = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        const pixels: Uint8ClampedArray = context.getImageData(0, 0, canvas.width, 1).data;
        const alpha: (x: number) => number = (x: number): number => pixels[x * 4 + 3];
        const middleAlpha: number = alpha(Math.floor(canvas.width / 2));
        expect(middleAlpha, "the cursor's alpha option (0.5) in the middle").to.be.closeTo(0.5 * 255, 3);
        expect(alpha(0), "left edge").to.be.lessThan(0.2 * middleAlpha);
        expect(alpha(canvas.width - 1), "right edge").to.be.lessThan(0.2 * middleAlpha);
        // in the fade, the cursor's color #33e02f with less alpha, not a mix with white
        const fadeX: number = Math.round(canvas.width * 0.1);
        expect(alpha(fadeX)).to.be.within(0.2 * middleAlpha, 0.8 * middleAlpha);
        expect(Array.from(pixels.slice(fadeX * 4, fadeX * 4 + 3))).to.satisfy((rgb: number[]) =>
            Math.abs(rgb[0] - 0x33) < 12 && Math.abs(rgb[1] - 0xe0) < 12 && Math.abs(rgb[2] - 0x2f) < 12);
    });

    it("is hidden from screen readers and can't be dragged", async () => {
        const cursor: Cursor = await showCursor();
        expect(cursor.cursorElement.getAttribute("alt"), "an empty alt marks the image as decorative").to.equal("");
        expect(cursor.cursorElement.draggable).to.equal(false);
    });
});
