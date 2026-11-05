import { expect } from "vitest";
import { CanvasVexFlowBackend } from "../../../../src/MusicalScore/Graphical/VexFlow/CanvasVexFlowBackend";
import { EngravingRules } from "../../../../src/MusicalScore/Graphical/EngravingRules";
import { GraphicalMusicPage } from "../../../../src/MusicalScore/Graphical/GraphicalMusicPage";
import { RectangleF2D } from "../../../../src/Common/DataObjects/RectangleF2D";
import { TestUtils } from "../../../Util/TestUtils";

/** Incremental rendering (renderNext) grows the canvas batch by batch: resize() has to keep what is drawn already,
 *  and give the grown area the page background, like clear() gives it to the whole canvas for a normal render. */
describe("Canvas VexFlow Backend", () => {
    let container: HTMLElement;
    let rules: EngravingRules;
    let backend: CanvasVexFlowBackend;

    beforeEach((): void => {
        container = TestUtils.getDivElement(document);
        rules = new EngravingRules();
        backend = new CanvasVexFlowBackend(rules);
        backend.graphicalMusicPage = new GraphicalMusicPage(undefined);
        backend.graphicalMusicPage.PageNumber = 1;
        backend.initialize(container, 1);
    });

    afterEach((): void => {
        container.remove();
    });

    /**
     * The RGBA values of the canvas pixels.
     * @returns the pixels, 4 values per pixel, row by row
     */
    function pixels(): Uint8ClampedArray {
        const canvas: HTMLCanvasElement = backend.getCanvas() as HTMLCanvasElement;
        return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    }

    /**
     * The RGBA values of a pixel.
     * @param x the x coordinate in CSS pixels (the canvas may have more device pixels)
     * @param y the y coordinate in CSS pixels
     * @returns the 4 values of the pixel
     */
    function pixelAt(x: number, y: number): number[] {
        const canvas: HTMLCanvasElement = backend.getCanvas() as HTMLCanvasElement;
        const devicePixels: number = canvas.width / backend.width; // per CSS pixel
        return Array.from(canvas.getContext("2d").getImageData(Math.floor(x * devicePixels), Math.floor(y * devicePixels), 1, 1).data);
    }

    /**
     * Counts the pixels that differ from the given one.
     * @param rgba the RGBA values to compare with
     * @returns the number of pixels of the canvas with other values
     */
    function pixelsOtherThan(rgba: number[]): number {
        const data: Uint8ClampedArray = pixels();
        let count: number = 0;
        for (let i: number = 0; i < data.length; i += 4) {
            if (data[i] !== rgba[0] || data[i + 1] !== rgba[1] || data[i + 2] !== rgba[2] || data[i + 3] !== rgba[3]) {
                count++;
            }
        }
        return count;
    }

    it("keeps the drawn pixels when it grows, and fills the area right of and below them with the page background", () => {
        rules.PageBackgroundColor = "#00FF00";
        backend.resize(40, 20);
        backend.clear(); // fills the page background, as for a render
        backend.renderRectangle(new RectangleF2D(5, 5, 10, 10), 0, "#0000FF", 1);
        // incremental rendering grows the canvas to the right (single horizontal staffline) or down (endless page)
        backend.resize(80, 50);
        const background: number[] = [0, 255, 0, 255];
        expect(pixelAt(10, 10), "drawn before").to.deep.equal([0, 0, 255, 255]);
        expect(pixelAt(30, 15), "background before").to.deep.equal(background);
        expect(pixelAt(60, 10), "right of it").to.deep.equal(background);
        expect(pixelAt(10, 40), "below it").to.deep.equal(background);
        expect(pixelAt(60, 40), "right of and below it").to.deep.equal(background);
    });

    it("fills each pixel with a semi-transparent page background once, so that the background stays even", () => {
        rules.PageBackgroundColor = "#0000FF80"; // half transparent: a pixel filled twice would be more opaque
        backend.resize(40, 20);
        backend.clear();
        backend.resize(80, 50);
        const background: number[] = Array.from(pixels().slice(0, 4)); // the top left pixel, filled by clear()
        expect(background[3], "alpha of the background").to.be.within(127, 129);
        expect(pixelsOtherThan(background), "pixels with another color or alpha").to.equal(0);
    });

    it("fills the whole canvas with the page background when it grows from a width of 0", () => {
        // like the canvas of a page that the horizontal incremental rendering hasn't reached yet
        rules.PageBackgroundColor = "#00FF00";
        backend.resize(40, 20);
        backend.clear();
        backend.resize(0, 20);
        backend.resize(40, 20);
        expect(pixelsOtherThan([0, 255, 0, 255]), "pixels without the background").to.equal(0);
    });

    it("leaves the grown area transparent without a page background", () => {
        backend.resize(40, 20); // rules.PageBackgroundColor is undefined by default: transparent
        backend.clear();
        backend.renderRectangle(new RectangleF2D(5, 5, 10, 10), 0, "#0000FF", 1);
        backend.resize(80, 50);
        expect(pixelAt(10, 10), "drawn before").to.deep.equal([0, 0, 255, 255]);
        expect(pixelAt(60, 10), "right of it").to.deep.equal([0, 0, 0, 0]);
        expect(pixelAt(60, 40), "right of and below it").to.deep.equal([0, 0, 0, 0]);
    });
});
