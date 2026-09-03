import { expect } from "chai";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheet } from "../../../../src/MusicalScore/MusicSheet";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { DynamicEnum, InstantaneousDynamicExpression } from
    "../../../../src/MusicalScore/VoiceData/Expressions/InstantaneousDynamicExpression";
import { MultiExpression } from "../../../../src/MusicalScore/VoiceData/Expressions/MultiExpression";
import { EngravingRules } from "../../../../src/MusicalScore/Graphical/EngravingRules";

describe("ExpressionReader", () => {
    /** Reads a test/data sample (preprocessed by karma) into a MusicSheet, optionally with custom rules. */
    function readSheet(path: string, rules: EngravingRules = new EngravingRules()): MusicSheet {
        const doc: Document = ((window as any).__xml__)[path];
        expect(doc, "sample file is loaded: " + path).to.not.equal(undefined);
        const score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
        return new MusicSheetReader(undefined, rules).createMusicSheet(score, path);
    }

    /** All instantaneous dynamics of the sheet in reading order. */
    function collectDynamics(sheet: MusicSheet): InstantaneousDynamicExpression[] {
        return sheet.SourceMeasures.flatMap((measure): InstantaneousDynamicExpression[] =>
            measure.StaffLinkedExpressions.flatMap((staffExpressions: MultiExpression[]): InstantaneousDynamicExpression[] =>
                staffExpressions
                    .map((expression: MultiExpression): InstantaneousDynamicExpression => expression.InstantaneousDynamic)
                    .filter((expression: InstantaneousDynamicExpression): boolean => expression !== undefined)
            )
        );
    }

    describe("combined dynamics (issue #1705)", () => {
        const path: string = "test/data/test_combined_dynamics_1705.musicxml";
        let dynamics: InstantaneousDynamicExpression[];

        before((): void => {
            dynamics = collectDynamics(readSheet(path));
        });

        it("retains every dynamic child in source order for rendering", () => {
            expect(dynamics.map((dynamic: InstantaneousDynamicExpression): string => dynamic.DynamicExpression))
                .to.deep.equal(["sfmp", "sfmp", "ffz"]);
        });

        it("retains the first child's dynamic enum for playback", () => {
            expect(dynamics[0].DynEnum).to.equal(DynamicEnum.sf);
            expect(dynamics[2].DynEnum).to.equal(DynamicEnum.ff);
        });
    });

    describe("IgnoreRepeatedDynamics with combined dynamics", () => {
        const path: string = "test/data/test_dynamics_ignore_repeated_combined.musicxml";

        function readDynamicTexts(ignoreRepeatedDynamics: boolean): string[] {
            const rules: EngravingRules = new EngravingRules();
            rules.IgnoreRepeatedDynamics = ignoreRepeatedDynamics;
            return collectDynamics(readSheet(path, rules))
                .map((dynamic: InstantaneousDynamicExpression): string => dynamic.DynamicExpression);
        }

        it("reads every marking when the rule is off (default)", () => {
            expect(readDynamicTexts(false)).to.deep.equal(["sfmp", "sfp", "sfp", "p", "p"]);
        });

        it("skips only markings that repeat the whole previous text, not those sharing its first symbol", () => {
            // sfp after sfmp is a different marking (both start with sf); the second sfp and the second p are repeats
            expect(readDynamicTexts(true)).to.deep.equal(["sfmp", "sfp", "p"]);
        });
    });

    describe("MusicXML 4.0 dynamics pf, sfzp and n", () => {
        let dynamics: InstantaneousDynamicExpression[];

        before((): void => {
            dynamics = collectDynamics(readSheet("test/data/test_dynamics_musicxml4_n_pf_sfzp.musicxml"));
        });

        it("reads them as known dynamics", () => {
            expect(dynamics.map((dynamic: InstantaneousDynamicExpression): string => dynamic.DynamicExpression))
                .to.deep.equal(["pf", "sfzp", "n"]);
            expect(dynamics.map((dynamic: InstantaneousDynamicExpression): DynamicEnum => dynamic.DynEnum))
                .to.deep.equal([DynamicEnum.pf, DynamicEnum.sfzp, DynamicEnum.n]);
        });

        it("gives them a playback volume", () => {
            const mp: number = InstantaneousDynamicExpression.dynamicToRelativeVolumeDict.getValue(DynamicEnum.mp);
            const f: number = InstantaneousDynamicExpression.dynamicToRelativeVolumeDict.getValue(DynamicEnum.f);
            expect(dynamics[0].Volume, "pf (poco forte) lies between mp and f").to.be.within(mp, f);
            expect(dynamics[1].Volume, "sfzp like the other sforzando marks").to.equal(0.5);
            expect(dynamics[2].Volume, "n (niente) is silence").to.equal(0);
        });
    });
});
