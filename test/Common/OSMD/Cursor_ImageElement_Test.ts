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
});
