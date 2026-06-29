import { expect } from "chai";

import * as VF from "vexflow";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { SvgVexFlowBackend } from "../../../../src/MusicalScore/Graphical/VexFlow/SvgVexFlowBackend";
import { TestUtils } from "../../../Util/TestUtils";

describe("SvgVexFlowBackend Font Embedding", () => {
    it("export includes @font-face with CDN URLs in import mode (default)", async () => {
        const score: Document = TestUtils.getScore("test_beam_svg_double.musicxml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(score);
        osmd.render();
        osmd.EngravingRules.SVGFontEmbedding = "import";

        const backend: SvgVexFlowBackend = osmd.Drawer.Backends[0] as SvgVexFlowBackend;
        const svgString: string = backend.getExportedSVGString();

        expect(svgString).to.contain("@font-face");
        expect(svgString).to.contain("https://cdn.jsdelivr.net/npm/@vexflow-fonts/");
    });

    it("export includes @font-face with data URIs in inline mode", async () => {
        const testFontName: string = "Bravura";
        const testFontData: string = "data:font/woff2;base64,dGVzdGZvbnRkYXRh";
        VF.Font.loadedFontData.set(testFontName, testFontData);

        const score: Document = TestUtils.getScore("test_beam_svg_double.musicxml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(score);
        osmd.render();
        osmd.EngravingRules.SVGFontEmbedding = "inline";

        const backend: SvgVexFlowBackend = osmd.Drawer.Backends[0] as SvgVexFlowBackend;
        const svgString: string = backend.getExportedSVGString();

        expect(svgString).to.contain("@font-face");
        expect(svgString).to.contain("data:font/woff2;base64,");

        VF.Font.loadedFontData.delete(testFontName);
    });

    it("export omits @font-face in none mode", async () => {
        const score: Document = TestUtils.getScore("test_beam_svg_double.musicxml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(score);
        osmd.render();
        osmd.EngravingRules.SVGFontEmbedding = "none";

        const backend: SvgVexFlowBackend = osmd.Drawer.Backends[0] as SvgVexFlowBackend;
        const svgString: string = backend.getExportedSVGString();

        expect(svgString).to.not.contain("@font-face");
    });
});
