import { expect } from "vitest";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { Instrument } from "../../../../src/MusicalScore/Instrument";
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
import { UnknownExpression } from "../../../../src/MusicalScore/VoiceData/Expressions/UnknownExpression";
import { RepetitionInstructionEnum } from "../../../../src/MusicalScore/VoiceData/Instructions/RepetitionInstruction";
import { Fraction } from "../../../../src/Common/DataObjects/Fraction";
import { DynamicsContainer } from "../../../../src/MusicalScore/VoiceData/HelperObjects/DynamicsContainer";
import { MusicPartManagerIterator } from "../../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import { Pedal } from "../../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/Pedal";

describe("ExpressionReader", () => {
    /** Reads a test/data sample into a MusicSheet, optionally with custom rules. */
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

        beforeAll((): void => {
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

        beforeAll((): void => {
            dynamics = collectDynamics(readSheet("test/data/test_dynamics_musicxml4_n_pf_sfzp.musicxml"));
        });

        it("reads them as known dynamics", () => {
            expect(dynamics.map((dynamic: InstantaneousDynamicExpression): string => dynamic.DynamicExpression))
                .to.deep.equal(["pf", "sfzp", "n"]);
            expect(dynamics.map((dynamic: InstantaneousDynamicExpression): DynamicEnum => dynamic.DynEnum))
                .to.deep.equal([DynamicEnum.pf, DynamicEnum.sfzp, DynamicEnum.n]);
        });

        it("gives them a playback volume", () => {
            const mp: number = new EngravingRules().DynamicToRelativeVolumeDict.getValue(DynamicEnum.mp);
            const f: number = new EngravingRules().DynamicToRelativeVolumeDict.getValue(DynamicEnum.f);
            expect(dynamics[0].Volume, "pf (poco forte) lies between mp and f").to.be.within(mp, f);
            expect(dynamics[1].Volume, "sfzp like the other sforzando marks").to.equal(0.5);
            expect(dynamics[2].Volume, "n (niente) is silence").to.equal(0);
        });
    });

    describe("dynamics after words or a wedge in the same direction", () => {
        let dynamics: InstantaneousDynamicExpression[];

        beforeAll((): void => {
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

    it("places an expression without placement below a single staff without lyrics (HasLyrics only for parts with lyrics)", () => {
        // every note set Instrument.HasLyrics, so such expressions were placed above, as on a vocal staff
        const song: MusicSheet = readSheet("test/data/Mozart_AnChloe.xml");
        expect(song.Instruments.map((instrument: Instrument): boolean => instrument.HasLyrics), "voice, piano").to.deep.equal([true, false]);
        // the G.P. in m18 of this clarinet part has neither a placement attribute nor default-y
        const sheet: MusicSheet = readSheet("test/data/test_multiple_rest_measures_with_key_signatures_1329_no_crowded_notes.musicxml");
        expect(sheet.Instruments[0].HasLyrics).to.equal(false);
        const generalPause: UnknownExpression = sheet.SourceMeasures
            .flatMap((measure): MultiExpression[] => measure.StaffLinkedExpressions[0])
            .flatMap((expression: MultiExpression): UnknownExpression[] => expression.UnknownList)
            .find((expression: UnknownExpression): boolean => expression.Label === "G.P.");
        expect(generalPause.Placement).to.equal(PlacementEnum.Below);
    });

    describe("wedges and words with other direction-types in the same direction", () => {
        let sheet: MusicSheet;
        let wedges: ContinuousDynamicExpression[];

        beforeAll((): void => {
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

    it("places Gounod's cresc. at its divisions offset, not scaled by the preceding half note", () => {
        const sheet: MusicSheet = readSheet("test/data/CharlesGounod_Meditation.xml");
        const crescendos: MultiExpression[] = sheet.SourceMeasures[19].StaffLinkedExpressions[0]
            .filter(expression => expression.StartingContinuousDynamic?.Label === "cresc.");
        expect(crescendos.length).to.equal(1);
        // After a half note: 16 - 15 divisions at 8 per quarter = 1/32 of a whole note.
        expect(crescendos[0].Timestamp.RealValue).to.equal(1 / 32);
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

    it("puts note symbols between words into the text, stem-down ones as stem-up, but not other symbols", () => {
        const sheet: MusicSheet = readSheet("test/data/test_words_symbols.musicxml");
        const tempos: MultiTempoExpression[] = sheet.SourceMeasures[0].TempoExpressions;
        expect(tempos.map((tempo: MultiTempoExpression): string => tempo.InstantaneousTempo.Label), "tempo marks, the oboe's repeated")
            .to.deep.equal(["Fast (Straight\u266A)", "Fast (Straight\u{1D161}\u00B7)", "Fast (Straight\u266A)"]);
        expect(tempos.slice(0, 2).map((tempo: MultiTempoExpression): number => tempo.InstantaneousTempo.TempoInBpm)).to.deep.equal([112, 160]);
        const words: (measureIndex: number) => string[] = (measureIndex: number): string[] =>
            sheet.SourceMeasures[measureIndex].StaffLinkedExpressions[0].flatMap((expression: MultiExpression): string[] =>
                expression.EntriesList.map((entry: MultiExpressionEntry): string => entry.label));
        expect(words(0), "measure 1").to.deep.equal(["(\u{1D15E})"]);
        expect(words(1), "measure 2").to.deep.equal(["Hold (\u{1D15D}),\nthen play (\u2669) Keep going", "cresc.\u266A"]);
    });

    describe("words of a direction with <sound dynamics>", () => {
        const path: string = "test/data/test_direction_words_with_sound_dynamics.musicxml";
        let sheet: MusicSheet;

        beforeAll((): void => {
            sheet = readSheet(path);
        });

        /** The texts of the expressions of measure [measureIndex] at staff [staffIndex] of [musicSheet] (by default the
         *  sample's only staff): the marking of a dynamic, the label of words. */
        function labels(measureIndex: number, staffIndex: number = 0, musicSheet: MusicSheet = sheet): string[] {
            return musicSheet.SourceMeasures[measureIndex].StaffLinkedExpressions[staffIndex].flatMap((expression: MultiExpression): string[] =>
                expression.EntriesList.map((entry: MultiExpressionEntry): string =>
                    entry.expression instanceof InstantaneousDynamicExpression ? entry.expression.DynamicExpression : entry.label));
        }

        it("reads the words next to a dynamic, before or after it, without a dynamic, and words that are a dynamic", () => {
            expect(labels(1), "leggero e pp").to.have.members(["leggero e", "pp"]);
            expect(labels(2), "p sempre").to.have.members(["p", "sempre"]);
            expect(labels(3), "dolce").to.deep.equal(["dolce"]);
            expect(labels(4), "p as words").to.deep.equal(["p"]);
            expect(labels(5), "cresc. as words").to.deep.equal(["cresc."]);
            const crescendos: ContinuousDynamicExpression[] = sheet.SourceMeasures[5].StaffLinkedExpressions[0]
                .map((expression: MultiExpression): ContinuousDynamicExpression => expression.StartingContinuousDynamic)
                .filter((expression: ContinuousDynamicExpression): boolean => expression !== undefined);
            expect(crescendos.map((expression: ContinuousDynamicExpression): ContDynamicEnum => expression.DynamicType))
                .to.deep.equal([ContDynamicEnum.crescendo]);
        });

        it("reads the \"piu\" before the f in CharlesGounod_Meditation.xml m. 33 (violin, cello, piano) and m. 66 (piano)", () => {
            const gounod: MusicSheet = readSheet("test/data/CharlesGounod_Meditation.xml");
            // (the direction also has a <words> with only a no-break space, read as an empty expression)
            // staff indices: violin 0, cello 1, cello ad lib. 2, organ ad lib. 3-4, piano 5-6
            expect(labels(32, 0, gounod), "m. 33, violin").to.include.members(["piu", "f"]);
            expect(labels(32, 1, gounod), "m. 33, cello").to.include.members(["piu", "f"]);
            expect(labels(32, 5, gounod), "m. 33, piano").to.include.members(["piu", "f"]);
            expect(labels(65, 5, gounod), "m. 66, piano").to.include.members(["piu", "f"]);
            expect(labels(65, 0, gounod), "m. 66, violin: no dynamic there").to.deep.equal(["tutta forza."]);
        });

        it("still reads the words of a tempo direction as the tempo, and the dynamics at their notes with their sound dynamics", () => {
            expect(sheet.SourceMeasures[6].TempoExpressions.flatMap((tempo: MultiTempoExpression): string[] =>
                tempo.EntriesList.map((entry: TempoExpressionEntry): string => entry.label))).to.deep.equal(["Allegro"]);
            const dynamics: InstantaneousDynamicExpression[] = collectDynamics(sheet);
            expect(dynamics.map((dynamic: InstantaneousDynamicExpression): string => dynamic.DynamicExpression))
                .to.deep.equal(["mf", "pp", "p", "f"]);
            expect(dynamics.map((dynamic: InstantaneousDynamicExpression): number => dynamic.ParentMultiExpression.AbsolutePlaybackTimestamp.RealValue),
                   "the first notes of m. 1, 2, 3 and 8").to.deep.equal([0, 1, 2, 7]);
            expect(dynamics.map((dynamic: InstantaneousDynamicExpression): number => dynamic.SoundDynamic))
                .to.deep.equal([89, 31, 54, 106]);
        });
    });

    it("reads the line and the sign of a pedal for each combination of its line and sign attributes, also both", () => {
        const sheet: MusicSheet = readSheet("test/data/test_pedal_line_and_sign.musicxml");
        // "m<measure>: sign" (the Ped. and * signs), "line", or "sign + line" (the Ped. sign, then the line), by where a pedal starts
        const pedals: string[] = sheet.SourceMeasures.flatMap((measure): string[] => measure.StaffLinkedExpressions[0]
            .map((expression: MultiExpression): Pedal => expression.PedalStart)
            .filter((pedal: Pedal): boolean => pedal !== undefined)
            .map((pedal: Pedal): string => `m${measure.MeasureNumber}: ` +
                [pedal.IsSign ? "sign" : undefined, pedal.IsLine ? "line" : undefined].filter(part => part !== undefined).join(" + ") +
                (pedal.ChangeBegin ? " (change)" : "")));
        // MusicXML: the sign is "yes" by default with line="no", "no" with line="yes"
        expect(pedals).to.deep.equal([
            "m1: line", // no line or sign attribute
            "m2: sign", // sign="yes"
            "m3: line", // sign="no"
            "m4: line", // line="yes"
            "m5: sign + line", // line="yes" sign="yes" (was read as a line only)
            "m6: line", // line="yes" sign="no"
            "m7: sign", // line="no"
            "m8: sign", // line="no" sign="yes"
            "m9: sign + line", // line="yes" sign="yes", into the next system
            "m10: line (change)", // its change, line="yes": a line goes on, no Ped. sign
            "m11: sign + line",
            "m11: sign + line (change)", // released and pressed again at one note (a stop and a start), with the Ped. sign
        ]);
    });

    it("reads a pedal of type \"resume\" as a line without the start hook, and \"discontinue\" as its end without the end hook", () => {
        const sheet: MusicSheet = readSheet("test/data/test_pedal_resume_discontinue.musicxml");
        /** "m<measure>.<quarter>" of a pedal's start or end */
        const at: (expression: MultiExpression) => string = expression =>
            `m${expression.SourceMeasureParent.MeasureNumber}.${expression.Timestamp.RealValue * 4 + 1}`;
        // "<start>-<end>: line" or "sign + line" (the Ped. sign, then the line), and the hooks it goes without
        const pedals: string[] = sheet.SourceMeasures.flatMap((measure): string[] => measure.StaffLinkedExpressions[0]
            .map((expression: MultiExpression): Pedal => expression.PedalStart)
            .filter((pedal: Pedal): boolean => pedal !== undefined)
            .map((pedal: Pedal): string => `${at(pedal.ParentStartMultiExpression)}-${at(pedal.ParentEndMultiExpression)}: ` +
                (pedal.IsSign ? "sign + " : "") + (pedal.IsLine ? "line" : "") +
                (pedal.BeginsWithoutHook ? ", no start hook" : "") + (pedal.EndsWithoutHook ? ", no end hook" : "")));
        // (both types were ignored: no pedal started with resume, and a pedal ended with discontinue went on)
        expect(pedals).to.deep.equal([
            "m1.1-m1.4: sign + line, no start hook", // resume line="yes" sign="yes" (MuseScore 4.2-4.7.1's Ped. + line), stop
            "m2.1-m2.4: line, no start hook", // resume, stop
            "m3.1-m3.4: line, no end hook", // start, discontinue
            "m4.1-m5.4: line, no start hook, no end hook", // resume, into the next system, discontinue
        ]);
    });
});
