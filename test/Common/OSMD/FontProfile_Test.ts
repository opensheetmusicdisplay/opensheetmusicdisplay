import { expect } from "chai";
import { fontProfileToCss, IOSMDFontProfile } from "../../../src/OpenSheetMusicDisplay/FontProfile";
import { DEFAULT_OSMD_FONT_PROFILE as BUNDLED_FONT_PROFILE } from
  "../../../src/OpenSheetMusicDisplay/FontProfileActive";
import { DEFAULT_OSMD_FONT_PROFILE as EXTERNAL_FONT_PROFILE } from
  "../../../src/OpenSheetMusicDisplay/FontProfileExternal";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {
  getDefaultTextFontFamily,
  getMusicTextFontFamily,
  getNotationFontFamily,
} from "../../../src/MusicalScore/Graphical/ScoreTextFontRouting";
import { TestUtils } from "../../Util/TestUtils";

describe("OSMD font profiles", (): void => {
  it("declares every score face explicitly and emits embeddable CSS", (): void => {
    expect(BUNDLED_FONT_PROFILE.faces.map((face) => [face.family, face.style || "normal", face.weight || "normal"]))
      .to.deep.equal([
        ["Bravura", "normal", "normal"],
        ["Bravura Text", "normal", "normal"],
        ["Academico", "normal", "normal"],
        ["Academico", "italic", "normal"],
        ["Academico", "normal", "bold"],
      ]);

    const css: string = fontProfileToCss(BUNDLED_FONT_PROFILE);
    expect(css.match(/@font-face/g)).to.have.length(5);
    expect(css.match(/data:font\/woff2;base64/g)).to.have.length(5);
    expect(css).to.include("font-family: \"Bravura Text\"");
    expect(css).to.include("font-style: italic");
    expect(css).to.include("font-weight: bold");
    expect(fontProfileToCss(EXTERNAL_FONT_PROFILE)).to.equal("");
  });

  it("routes OSMD-owned text and glyph runs through custom profile families", (): void => {
    const profile: IOSMDFontProfile = {
      name: "test profile",
      notationFontFamily: "Test Notation",
      textFontFamily: "Test Text",
      musicTextFontFamily: "Test Music Text",
      faces: [],
    };
    const container: HTMLElement = TestUtils.getDivElement(document);
    const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, {
      autoResize: false,
      fontProfile: profile,
    });

    expect(getNotationFontFamily(osmd.EngravingRules)).to.equal("Test Notation");
    expect(getDefaultTextFontFamily(osmd.EngravingRules)).to.equal("Test Text");
    expect(getMusicTextFontFamily(osmd.EngravingRules)).to.equal("Test Music Text");

    osmd.setOptions({ autoResize: false, defaultFontFamily: "Score Text Override" });
    osmd.setOptions({ autoResize: false, drawTitle: false });
    expect(getDefaultTextFontFamily(osmd.EngravingRules)).to.equal("Score Text Override");
  });

  it("loads fonts before measurement and embeds them in standalone SVG by default", async (): Promise<void> => {
    const container: HTMLElement = TestUtils.getDivElement(document);
    const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false });
    await osmd.load(TestUtils.getScore("test_dynamics_bravura_combined.musicxml"));
    osmd.render();

    const exports: string[] = osmd.exportSVG();
    expect(exports).to.have.length(1);
    expect(exports[0]).to.include("data-osmd-font-profile");
    expect(exports[0].match(/data:font\/woff2;base64/g)).to.have.length(5);
  });

  it("supports an explicit opt-out for SVG font embedding", async (): Promise<void> => {
    const container: HTMLElement = TestUtils.getDivElement(document);
    const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, {
      autoResize: false,
      embedFontProfileInSvg: false,
    });
    await osmd.load(TestUtils.getScore("test_dynamics_bravura_combined.musicxml"));
    osmd.render();

    const exports: string[] = osmd.exportSVG();
    expect(exports).to.have.length(1);
    expect(exports[0]).to.not.include("data-osmd-font-profile");
    expect(exports[0]).to.not.include("data:font/woff2;base64");
  });
});
