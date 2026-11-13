import { expect } from "vitest";
import * as OSMDExports from "../../../src";

describe("Package exports (src/index.ts)", () => {
    it("exports the classes, enums and functions that exported members use", () => {
        // e.g. VoiceEntry.Articulations, Note.TabNote (instanceof TabNote), Tie.TieDirectionXml, EngravingRules.FingeringPosition
        const expectedNames: string[] = [
            "PlacementEnum", "TabNote", "LyricsEntry", "LyricWord", "DynamicEnum", "MultiExpression",
            "InstantaneousDynamicExpression", "InstantaneousTempoExpression", "ContinuousDynamicExpression",
            "Articulation", "Slur", "OctaveShift", "OctaveEnum", "Pedal", "WavyLine", "DynamicsContainer",
            "GraphicalPedal", "GraphicalWavyLine", "PlaybackSettings", "musicXmlColorToCss",
            "StringUtil", "TabFretTransposer", "WarmKeeperScoreMxlBase64",
            "BaseIdClass", "GraphicalUnknownExpression", "VexFlowPedal", "VexFlowVibratoBracket", "VexFlowMeasureRepeat",
            "VexFlowKeySignatureNote", "TabRhythmDot", "SkyBottomLineBatchCalculator", "SkyBottomLineBatchCalculatorBackend",
            "PlainSkyBottomLineBatchCalculatorBackend", "SkyBottomLineCalculationResult",
        ];
        const exportedNames: string[] = Object.keys(OSMDExports);
        const missingNames: string[] = expectedNames.filter(name => !exportedNames.includes(name));
        expect(missingNames, "names missing in the exports of src/index.ts").to.deep.equal([]);
    });
});
