import { expect } from "chai";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheet } from "../../../../src/MusicalScore/MusicSheet";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { DynamicEnum, InstantaneousDynamicExpression } from
    "../../../../src/MusicalScore/VoiceData/Expressions/InstantaneousDynamicExpression";
import { MultiExpression } from "../../../../src/MusicalScore/VoiceData/Expressions/MultiExpression";

describe("ExpressionReader", () => {
    describe("combined dynamics (issue #1705)", () => {
        const path: string = "test/data/test_combined_dynamics_1705.musicxml";
        let dynamics: InstantaneousDynamicExpression[];

        before((): void => {
            const doc: Document = ((window as any).__xml__)[path];
            expect(doc, "sample file is loaded").to.not.equal(undefined);
            const score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
            const sheet: MusicSheet = new MusicSheetReader().createMusicSheet(score, path);
            dynamics = sheet.SourceMeasures.flatMap((measure): InstantaneousDynamicExpression[] =>
                measure.StaffLinkedExpressions.flatMap((staffExpressions: MultiExpression[]): InstantaneousDynamicExpression[] =>
                    staffExpressions
                        .map((expression: MultiExpression): InstantaneousDynamicExpression => expression.InstantaneousDynamic)
                        .filter((expression: InstantaneousDynamicExpression): boolean => expression !== undefined)
                )
            );
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
});
