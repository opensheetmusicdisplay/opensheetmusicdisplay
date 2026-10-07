import { expect } from "chai";
import { SvgVexFlowBackend } from "../../../../src/MusicalScore/Graphical/VexFlow/SvgVexFlowBackend";
import { EngravingRules } from "../../../../src/MusicalScore/Graphical/EngravingRules";
import { GraphicalMusicPage } from "../../../../src/MusicalScore/Graphical/GraphicalMusicPage";
import { RectangleF2D } from "../../../../src/Common/DataObjects/RectangleF2D";
import { PointF2D } from "../../../../src/Common/DataObjects/PointF2D";
import { TestUtils } from "../../../Util/TestUtils";

describe("SVG VexFlow Backend", () => {
    let container: HTMLElement;
    let backend: SvgVexFlowBackend;

    beforeEach((): void => {
        container = TestUtils.getDivElement(document);
        backend = new SvgVexFlowBackend(new EngravingRules());
        backend.graphicalMusicPage = new GraphicalMusicPage(undefined);
        backend.graphicalMusicPage.PageNumber = 1;
        backend.initialize(container, 1);
    });

    afterEach((): void => {
        container.remove();
    });

    it("draws a rectangle with its alpha as fill-opacity, without giving the fill-opacity to the elements drawn afterwards", () => {
        const rectangleNode: Element = backend.renderRectangle(new RectangleF2D(10, 10, 20, 5), 0, "#FF0000", 0.5) as Element;
        const lineNode: Element = backend.renderLine(new PointF2D(10, 30), new PointF2D(30, 30)) as Element;
        expect(rectangleNode.querySelector("rect").getAttribute("fill-opacity")).to.equal("0.5");
        expect(lineNode.querySelector("path").hasAttribute("fill-opacity"), "line with a fill-opacity").to.equal(false);
    });
});
