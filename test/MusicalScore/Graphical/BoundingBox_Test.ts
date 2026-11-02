import { expect } from "chai";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { RectangleF2D } from "../../../src/Common/DataObjects/RectangleF2D";

/** BoundingBox makes its sizes, corners and rectangles when they're read, from the borders and margins at that time. */
describe("BoundingBox", () => {
    /** The rectangle's x, y, width and height. */
    function rect(rectangle: RectangleF2D): number[] {
        return [rectangle.x, rectangle.y, rectangle.width, rectangle.height];
    }

    it("Gives sizes, corners and rectangles that follow the borders and margins", () => {
        const box: BoundingBox = new BoundingBox();
        box.BorderLeft = -1;
        box.BorderRight = 3;
        box.BorderTop = -2;
        box.BorderBottom = 4;
        box.BorderMarginLeft = -1.5;
        box.BorderMarginRight = 3.5;
        box.BorderMarginTop = -2.5;
        box.BorderMarginBottom = 4.5;
        expect([box.Size.width, box.Size.height]).to.deep.equal([4, 6]);
        expect([box.UpperLeftCorner.x, box.UpperLeftCorner.y]).to.deep.equal([-1, -2]);
        expect(rect(box.BoundingRectangle)).to.deep.equal([-1, -2, 4, 6]);
        expect([box.MarginSize.width, box.MarginSize.height]).to.deep.equal([5, 7]);
        expect([box.UpperLeftMarginCorner.x, box.UpperLeftMarginCorner.y]).to.deep.equal([-1.5, -2.5]);
        expect(rect(box.BoundingMarginRectangle)).to.deep.equal([-1.5, -2.5, 5, 7]);

        box.BorderRight = 5;
        expect(box.Size.width).to.equal(6);
        expect(rect(box.BoundingRectangle)).to.deep.equal([-1, -2, 6, 6]);
        // BorderMarginRight is at least BorderRight, so the margin size includes the new border too
        expect(box.BorderMarginRight).to.equal(5);
        expect(box.MarginSize.width).to.equal(6.5);
        expect(rect(box.BoundingMarginRectangle)).to.deep.equal([-1.5, -2.5, 6.5, 7]);
    });

    it("Keeps a width or height written into Size until a border changes", () => {
        // e.g. VexFlowInstrumentBracket sets its PositionAndShape.Size.height
        const box: BoundingBox = new BoundingBox();
        box.BorderRight = 2;
        box.Size.height = 10;
        expect([box.Size.width, box.Size.height]).to.deep.equal([2, 10]);
        box.BorderBottom = 3;
        expect([box.Size.width, box.Size.height]).to.deep.equal([2, 3]);
    });
});
