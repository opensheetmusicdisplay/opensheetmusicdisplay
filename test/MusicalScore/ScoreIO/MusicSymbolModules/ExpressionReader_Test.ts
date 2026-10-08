import { expect } from "chai";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheet } from "../../../../src/MusicalScore/MusicSheet";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { DynamicEnum, InstantaneousDynamicExpression } from
    "../../../../src/MusicalScore/VoiceData/Expressions/InstantaneousDynamicExpression";
import { MultiExpression, MultiExpressionEntry } from "../../../../src/MusicalScore/VoiceData/Expressions/MultiExpression";
import { ContDynamicEnum, ContinuousDynamicExpression } from
    "../../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { EngravingRules } from "../../../../src/MusicalScore/Graphical/EngravingRules";
import { PlacementEnum } from "../../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { MultiTempoExpression, TempoExpressionEntry } from "../../../../src/MusicalScore/VoiceData/Expressions/MultiTempoExpression";
import { RepetitionInstructionEnum } from "../../../../src/MusicalScore/VoiceData/Instructions/RepetitionInstruction";
import { Fraction } from "../../../../src/Common/DataObjects/Fraction";
import { DynamicsContainer } from "../../../../src/MusicalScore/VoiceData/HelperObjects/DynamicsContainer";
import { MusicPartManagerIterator } from "../../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";

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

        it("derives the playback enum from the marking: sf for both spellings of sfmp, ff for ffz", () => {
            expect(dynamics.map((dynamic: InstantaneousDynamicExpression): DynamicEnum => dynamic.DynEnum))
                .to.deep.equal([DynamicEnum.sf, DynamicEnum.sf, DynamicEnum.ff]);
        });
    });

    describe("playback dynamic (DynEnum) from <other-dynamics> texts", () => {
        it("takes the dynamic the text starts with, as a whole symbol sequence or a separate word", () => {
            const dynamics: InstantaneousDynamicExpression[] =
                collectDynamics(readSheet("test/data/test_dynamics_other_dynamics_text_playback.musicxml"));
            expect(dynamics.map((dynamic: InstantaneousDynamicExpression): string => dynamic.DynamicExpression))
                .to.deep.equal(["ffz", "sffz", "f con fuoco", "cresc.", "più f"]);
            expect(dynamics.map((dynamic: InstantaneousDynamicExpression): DynamicEnum => dynamic.DynEnum))
                .to.deep.equal([DynamicEnum.ff, DynamicEnum.sffz, DynamicEnum.f, undefined, undefined]);
        });

        it("dynamicEnumFromText: known dynamics, symbol sequences and leading dynamic words", () => {
            const cases: [string, DynamicEnum][] = [
                ["sfmp", DynamicEnum.sf], ["ffz", DynamicEnum.ff], ["sffz", DynamicEnum.sffz], ["sfzp", DynamicEnum.sfzp],
                ["pf", DynamicEnum.pf], ["n", DynamicEnum.n], ["MF", DynamicEnum.mf], [" p ", DynamicEnum.p],
                ["f con fuoco", DynamicEnum.f], ["ff con più fuoco possibile", DynamicEnum.ff], ["p dolce", DynamicEnum.p],
                ["fine", undefined], ["forte", undefined], ["pesante", undefined], ["cresc.", undefined], ["marcato", undefined],
                ["più f", undefined], ["", undefined], [undefined, undefined],
            ];
            for (const testCase of cases) {
                expect(InstantaneousDynamicExpression.dynamicEnumFromText(testCase[0]), `"${testCase[0]}"`).to.equal(testCase[1]);
            }
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

    describe("two dynamics at the same position on a staff", () => {
        it("combines them into one marking instead of dropping the first (Norma fantasy m.24: ff + marcato)", () => {
            // Finale writes "ff marcato" as <dynamics><ff/></dynamics> plus <dynamics><other-dynamics>marcato</other-dynamics></dynamics>
            //   in two <direction>s at the same timestamp; the second one used to replace the first.
            const dynamics: InstantaneousDynamicExpression[] =
                collectDynamics(readSheet("test/data/test_clef_change_on_invisible_note_norma_fantasy_1605.musicxml"));
            const texts: string[] = dynamics.map((dynamic: InstantaneousDynamicExpression): string => dynamic.DynamicExpression);
            expect(texts, "ff and marcato form one marking").to.include("ff marcato");
            expect(texts, "no lone marcato is left").to.not.include("marcato");
            const combined: InstantaneousDynamicExpression =
                dynamics.find((dynamic: InstantaneousDynamicExpression): boolean => dynamic.DynamicExpression === "ff marcato");
            expect(combined.DynEnum, "the playback dynamic of the combined marking is the ff").to.equal(DynamicEnum.ff);
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

    describe("dynamics after words or a wedge in the same direction", () => {
        let dynamics: InstantaneousDynamicExpression[];

        before((): void => {
            dynamics = collectDynamics(readSheet("test/data/test_direction_dynamics_after_words_and_wedge.musicxml"));
        });

        it("keeps the direction's placement for a dynamic after words", () => {
            expect(dynamics[0].DynamicExpression).to.equal("p");
            expect(dynamics[0].Placement).to.equal(PlacementEnum.Below);
        });

        it("keeps the direction's placement and sound dynamics for a dynamic after a wedge stop", () => {
            expect(dynamics[1].DynamicExpression).to.equal("f");
            expect(dynamics[1].Placement).to.equal(PlacementEnum.Below);
            expect(dynamics[1].SoundDynamic).to.equal(106);
        });
    });

    it("reads dynamics in a note's notations at the note, with their own placement", () => {
        const dynamics: InstantaneousDynamicExpression[] = collectDynamics(readSheet("test/data/test_dynamics_in_notations.musicxml"));
        expect(dynamics.map((dynamic: InstantaneousDynamicExpression): string => dynamic.DynamicExpression))
            .to.deep.equal(["p", "f", "mf"]);
        expect(dynamics.map((dynamic: InstantaneousDynamicExpression): number => dynamic.ParentMultiExpression.Timestamp.RealValue),
               "the notes' timestamps, the grace note's in m2 (not the note's before it)").to.deep.equal([0.25, 0.5, 0.5]);
        expect(dynamics.map((dynamic: InstantaneousDynamicExpression): PlacementEnum => dynamic.Placement),
               "placement attribute of the dynamics").to.deep.equal([PlacementEnum.Below, PlacementEnum.Above, PlacementEnum.Below]);
    });

    describe("wedges and words with other direction-types in the same direction", () => {
        let sheet: MusicSheet;
        let wedges: ContinuousDynamicExpression[];

        before((): void => {
            sheet = readSheet("test/data/test_direction_several_direction_types.musicxml");
            wedges = sheet.SourceMeasures.flatMap((measure): ContinuousDynamicExpression[] =>
                measure.StaffLinkedExpressions.flatMap((staffExpressions: MultiExpression[]): ContinuousDynamicExpression[] =>
                    staffExpressions
                        .map((expression: MultiExpression): ContinuousDynamicExpression => expression.StartingContinuousDynamic)
                        .filter((wedge: ContinuousDynamicExpression): boolean => wedge !== undefined)
                )
            );
        });

        it("reads words after a dynamic or a repetition mark", () => {
            const labels: string[] = sheet.SourceMeasures[0].StaffLinkedExpressions[0].flatMap((expression: MultiExpression): string[] =>
                expression.EntriesList.map((entry: MultiExpressionEntry): string => entry.label));
            expect(labels).to.include("espress.");
            expect(sheet.SourceMeasures[0].FirstRepetitionInstructions
                .filter(instruction => instruction.type === RepetitionInstructionEnum.Segno).length).to.equal(1);
            const tempoLabels: string[] = sheet.SourceMeasures[0].TempoExpressions.flatMap(tempo =>
                tempo.EntriesList.map(entry => entry.label));
            expect(tempoLabels).to.deep.equal(["Tempo I"]);
            const last: typeof sheet.SourceMeasures[0] = sheet.SourceMeasures[3];
            expect(last.LastRepetitionInstructions.find(instruction => instruction.type === RepetitionInstructionEnum.DaCapo)?.Words)
                .to.equal("Da Capo bis Ende");
        });

        it("keeps the direction's placement for a wedge after a wedge stop or after words", () => {
            expect(wedges.map((wedge: ContinuousDynamicExpression): ContDynamicEnum => wedge.DynamicType))
                .to.deep.equal([ContDynamicEnum.crescendo, ContDynamicEnum.diminuendo, ContDynamicEnum.crescendo]);
            expect(wedges.map((wedge: ContinuousDynamicExpression): PlacementEnum => wedge.Placement))
                .to.deep.equal([PlacementEnum.Below, PlacementEnum.Below, PlacementEnum.Below]);
        });

        it("keeps the direction's offset for a wedge stop after words", () => {
            expect(wedges[2].EndMultiExpression.EndOffsetFraction.RealValue, "offset 1 = a quarter").to.equal(0.25);
        });
    });

    it("places dynamics and wedge starts using divisions offsets without moving explicit sound changes", () => {
        const sheet: MusicSheet = readSheet("test/data/test_dynamics_wedge_display_sound_offset.musicxml");
        const dynamics: InstantaneousDynamicExpression[] = collectDynamics(sheet);
        const wedges: ContinuousDynamicExpression[] = sheet.SourceMeasures.flatMap(measure =>
            measure.StaffLinkedExpressions[0]
                .map(expression => expression.StartingContinuousDynamic)
                .filter(wedge => wedge !== undefined));
        const marks: InstantaneousDynamicExpression[] = dynamics.filter(dynamic => dynamic.DynamicExpression === "p");
        expect(marks.map(dynamic => dynamic.ParentMultiExpression.Timestamp.RealValue), "p anchors, also with default-x in m3")
            .to.deep.equal([0.25, 0.25, 0.25]);
        expect(wedges.map(wedge => wedge.StartMultiExpression.Timestamp.RealValue), "wedge anchors, also with default-x in m3")
            .to.deep.equal([0.25, 0.25, 0.25]);
        expect(wedges.map(wedge => wedge.EndMultiExpression.Timestamp.RealValue), "wedge stops keep their existing note anchor")
            .to.deep.equal([0.75, 0.75, 0.75]);
        for (const [index, wedge] of wedges.entries()) {
            wedge.StartVolume = 0.2;
            wedge.EndVolume = 0.8;
            const midpoint: Fraction = new Fraction([0.625, 1.5, 2.5625][index], 1);
            expect(wedge.getInterpolatedDynamic(midpoint), "interpolation uses the independent sound start in m" + (index + 1))
                .to.be.closeTo(0.5, 1e-8);
        }

        // Reading the sheet leaves registration of playback dynamics to its consumer.
        const timeline: DynamicsContainer[] = sheet.TimestampSortedDynamicExpressionsList;
        for (const dynamic of dynamics) {
            timeline.push(new DynamicsContainer(dynamic, 0));
        }
        timeline.sort(DynamicsContainer.Compare);
        const iterator: MusicPartManagerIterator = sheet.MusicPartManager.getIterator();
        const active: string[] = [];
        const changes: number[] = [];
        for (let i: number = 0; !iterator.EndReached && i < 12; i++) {
            active.push((iterator.ActiveDynamicExpressions[0] as InstantaneousDynamicExpression)?.DynamicExpression);
            changes.push(iterator.getCurrentDynamicChangingExpressions().length);
            iterator.moveToNext();
        }
        expect(iterator.EndReached).to.equal(true);
        expect(active, "default sound=no, sound=yes, then a sound-local offset")
            .to.deep.equal(["mf", "p", "p", "mf", "p", "p", "p", "mf", "mf", "p", "p"]);
        expect(changes, "one notification per change, including a sound change between notes")
            .to.deep.equal([1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0]);
        iterator.moveToPrevious(); // last note
        iterator.moveToPrevious(); // sound change between beats 2 and 3 has taken effect
        expect((iterator.ActiveDynamicExpressions[0] as InstantaneousDynamicExpression).DynamicExpression).to.equal("p");
        iterator.moveToPrevious();
        expect((iterator.ActiveDynamicExpressions[0] as InstantaneousDynamicExpression).DynamicExpression).to.equal("mf");
        expect((iterator.clone().ActiveDynamicExpressions[0] as InstantaneousDynamicExpression).DynamicExpression).to.equal("mf");
    });

    it("reads all text fragments of a direction, not only the first", () => {
        const sheet: MusicSheet = readSheet("test/data/test_direction_words_split.musicxml");
        const tempoLabels: string[] = sheet.SourceMeasures[0].TempoExpressions.flatMap((tempo: MultiTempoExpression): string[] =>
            tempo.EntriesList.map((entry: TempoExpressionEntry): string => entry.label));
        const textLabels: string[] = sheet.SourceMeasures[1].StaffLinkedExpressions[0].flatMap((expression: MultiExpression): string[] =>
            expression.EntriesList.map((entry: MultiExpressionEntry): string => entry.label));
        expect(tempoLabels, "tempo direction").to.deep.equal(["Allegro con brio"]);
        expect(textLabels, "text direction").to.deep.equal(["più f, marcato"]);
        expect(sheet.SourceMeasures[0].rehearsalExpression.label, "rehearsal direction").to.equal("A′");
        expect(sheet.SourceMeasures[1].LastRepetitionInstructions.map(instruction => instruction.type), "repetition direction")
            .to.deep.equal([RepetitionInstructionEnum.DaCapo]);
    });
});
