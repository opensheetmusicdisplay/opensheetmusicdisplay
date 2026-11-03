import {expect} from "vitest";
import {TestUtils} from "../../../Util/TestUtils";
import {OpenSheetMusicDisplay} from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {MusicPartManagerIterator} from "../../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import {SourceMeasure} from "../../../../src/MusicalScore/VoiceData/SourceMeasure";

describe("Tempo direction timing", (): void => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach((): void => {
        div = TestUtils.getDivElement(document);
        div.style.width = "800px";
        osmd = TestUtils.createOpenSheetMusicDisplay(div);
    });

    afterEach((): void => {
        osmd.clear();
        div.remove();
    });

    function note(step: string): string {
        return `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>`;
    }

    function tempo(bpm: number, offset: string = "", soundOffset: string = "", attributes: string = ""): string {
        return `<direction placement="above">
          <direction-type><metronome ${attributes}><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type>
          ${offset}<sound tempo="${bpm}">${soundOffset}</sound>
        </direction>`;
    }

    /** A metronome mark beatUnit = perMinute, dotted if given, with a <sound tempo> if soundTempo is given. */
    function metronome(beatUnit: string, perMinute: number, dotted: boolean = false, soundTempo?: number): string {
        return `<direction placement="above"><direction-type><metronome><beat-unit>${beatUnit}</beat-unit>
          ${dotted ? "<beat-unit-dot/>" : ""}<per-minute>${perMinute}</per-minute></metronome></direction-type>
          ${soundTempo ? `<sound tempo="${soundTempo}"/>` : ""}</direction>`;
    }

    /** A direction with words and no <sound tempo>. */
    function wordsDirection(text: string): string {
        return `<direction><direction-type><words>${text}</words></direction-type></direction>`;
    }

    function score(content: string): Document {
        return new DOMParser().parseFromString(`<score-partwise version="4.0">
          <part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>
          <part id="P1"><measure number="1">
            <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
              <clef><sign>G</sign><line>2</line></clef></attributes>
            ${content}
          </measure></part>
        </score-partwise>`, "application/xml");
    }

    function bpms(): number[] {
        const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
        const result: number[] = [];
        for (let i: number = 0; !iterator.EndReached && i < 8; i++) {
            result.push(iterator.CurrentBpm);
            iterator.moveToNext();
        }
        expect(iterator.EndReached).to.equal(true);
        return result;
    }

    it("places recognized words at their offset without moving explicit sound changes", async (): Promise<void> => {
        await osmd.load(score(tempo(60) + note("C") + `
          <direction><direction-type><words>dolce</words></direction-type><offset>1</offset></direction>
          <direction><direction-type><words default-x="80">cantabile</words></direction-type><offset>1</offset></direction>
          ` + note("D") + `
          <direction><direction-type><words>Allegro</words></direction-type><offset>-1</offset></direction>
          <direction><direction-type><words>stretto</words></direction-type><offset>-1</offset></direction>
          ` + note("E") + `
          <direction><direction-type><words>Andante</words></direction-type>
            <offset sound="yes">-1</offset><sound tempo="90"><offset>0</offset></sound></direction>
          ` + note("F")));
        const measure: SourceMeasure = osmd.Sheet.SourceMeasures[0];
        expect(measure.TempoExpressions.slice(1).map(expression => [expression.CombinedExpressionsText, expression.Timestamp.RealValue]),
               "inferred Allegro and stretto, then explicit Andante")
            .to.deep.equal([["Allegro", 0.25], ["stretto", 0.25], ["Andante", 0.5]]);
        expect(measure.StaffLinkedExpressions[0].flatMap(expression =>
            expression.MoodList.map(mood => [mood.Label, expression.Timestamp.RealValue])), "dolce and cantabile with default-x")
            .to.deep.equal([["dolce", 0.5], ["cantabile", 0.5]]);
        expect(bpms(), "Allegro starts on beat 2, explicit sound 90 on beat 4, not at its display offset")
            .to.deep.equal([60, 130, 130, 90]);
    });

    it("uses the sound flag and sound-local offset to place playback changes", async (): Promise<void> => {
        for (const sound of ["", " sound=\"no\"", " sound=\"yes\""]) {
            await osmd.load(sound ? score(tempo(60) + note("C") + note("D") +
                tempo(120, `<offset${sound}>-1</offset>`) + note("E") + note("F")) :
                TestUtils.getScore("test_metronome_display_sound_offset.musicxml"));
            expect(bpms()).to.deep.equal(sound.includes("yes") ? [60, 120, 120, 120] : [60, 60, 120, 120]);
            expect(osmd.Sheet.SourceMeasures[0].TempoExpressions[1].Timestamp.RealValue).to.equal(0.25);
            const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
            iterator.moveToNext();
            expect(iterator.clone().CurrentBpm).to.equal(sound.includes("yes") ? 120 : 60);
        }
        await osmd.load(score(tempo(60) + note("C") + note("D") +
            tempo(120, '<offset sound="yes">-1</offset>', "<offset>0</offset>") + note("E") + note("F")));
        expect(bpms()).to.deep.equal([60, 60, 120, 120]);
    });

    it("applies a sound tempo without a printed tempo at its position, without drawing or raising a tempo mark", async (): Promise<void> => {
        /** The gap between the first tempo mark and the staff below it, after rendering the measure with or without the sound 90. */
        async function gapBelowFirstMark(sound: string): Promise<number> {
            // a sound tempo of 0 is ignored
            await osmd.load(score(`<direction><direction-type><dynamics><p/></dynamics></direction-type><sound tempo="120"/></direction>
              ${note("C")}${metronome("quarter", 60)}${sound}${note("D")}
              ${note("E")}${metronome("quarter", 60)}<sound tempo="0"/>${note("F")}`));
            osmd.render();
            return div.querySelector(".vf-stave").getBoundingClientRect().top - div.querySelector(".vf-stavetempo").getBoundingClientRect().bottom;
        }
        const gap: number = await gapBelowFirstMark('<sound tempo="90"/>');
        expect(bpms()).to.deep.equal([120, 90, 90, 60]);
        expect(osmd.Sheet.getExpressionsStartTempoInBPM()).to.equal(120);
        expect(div.querySelectorAll(".vf-stavetempo").length, "no generated mark at the start").to.equal(2);
        expect(gap, "the sound does not raise the mark at its time").to.be.closeTo(await gapBelowFirstMark(""), 0.01);
    });

    it("activates a sound change between notes and restores tempo on reverse traversal", async (): Promise<void> => {
        await osmd.load(score(tempo(60) + note("C") + note("D") +
            tempo(120, "<offset>-0.5</offset>", "<offset>-0.5</offset>") + note("E") + note("F")));
        expect(bpms()).to.deep.equal([60, 60, 120, 120]);
        expect(osmd.Sheet.SourceMeasures[0].TempoExpressions[1].Timestamp.RealValue).to.equal(0.375);
        const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
        iterator.moveToNext();
        iterator.moveToNext();
        expect(iterator.CurrentBpm).to.equal(120);
        iterator.moveToPrevious();
        expect(iterator.CurrentBpm).to.equal(60);
        expect(iterator.clone().CurrentBpm).to.equal(60);
        iterator.moveToNext();
        expect(iterator.CurrentBpm).to.equal(120);
    });

    it("does not use a deferred first sound tempo at the start of the piece", async (): Promise<void> => {
        await osmd.load(score(note("C") + note("D") +
            tempo(120, '<offset sound="yes">-1</offset>') + note("E") + note("F")));
        expect(bpms()).to.deep.equal([100, 120, 120, 120]);
        expect(osmd.Sheet.getExpressionsStartTempoInBPM()).to.equal(100);
        const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
        iterator.moveToNext();
        iterator.moveToPrevious();
        expect(iterator.CurrentBpm).to.equal(100);
    });

    it("uses default-x only for display and retains the direction's sound offset", async (): Promise<void> => {
        await osmd.load(score(tempo(60) + note("C") + note("D") +
            tempo(120, '<offset sound="yes">-1</offset>', "", 'default-x="0"') + note("E") + note("F")));
        expect(osmd.Sheet.SourceMeasures[0].TempoExpressions[1].Timestamp.RealValue).to.equal(0.5);
        expect(bpms()).to.deep.equal([60, 120, 120, 120]);
    });

    it("uses the sound BPM over printed BPM and tempo text", async (): Promise<void> => {
        const direction: string = `<direction><direction-type><metronome><beat-unit>half</beat-unit>
          <per-minute>60</per-minute></metronome></direction-type><sound tempo="142.5"/></direction>`;
        const words: string = "<direction><direction-type><words>Allegro</words></direction-type></direction>";
        await osmd.load(score(direction + words + note("C") + note("D") + note("E") + note("F")));
        expect(osmd.Sheet.SourceMeasures[0].TempoExpressions[0].InstantaneousTempo.TempoInBpm).to.equal(60);
        expect(osmd.Sheet.SourceMeasures[0].TempoInBPM).to.equal(142.5);
        expect(bpms()).to.deep.equal([142.5, 142.5, 142.5, 142.5]);
        expect(osmd.Sheet.DefaultStartTempoInBpm).to.equal(142.5);
        expect(osmd.Sheet.getExpressionsStartTempoInBPM()).to.equal(142.5);

        const markWithoutSound: string = direction.replace('<sound tempo="142.5"/>', "");
        const wordsWithSound: string = words.replace("</direction>", '<sound tempo="120"/></direction>');
        await osmd.load(score(markWithoutSound + wordsWithSound + note("C") + note("D") + note("E") + note("F")));
        expect(bpms()).to.deep.equal([120, 120, 120, 120]);
        expect(osmd.Sheet.getExpressionsStartTempoInBPM()).to.equal(120);

        await osmd.load(TestUtils.getScore("Debussy_Mandoline.xml"));
        expect(osmd.Sheet.MusicPartManager.getIterator().CurrentBpm).to.equal(189);
        expect(osmd.Sheet.getExpressionsStartTempoInBPM()).to.equal(189);
    });

    it("preserves continuous tempo and restores its BPM on reverse traversal, with interpolation on or off", async (): Promise<void> => {
        const initialTempo: string = `<direction><direction-type><metronome><beat-unit>half</beat-unit>
          <per-minute>60</per-minute></metronome></direction-type><sound tempo="120"/></direction>
          <direction><direction-type><words>Allegro</words></direction-type></direction>`;
        const continuous: string = "<direction><direction-type><words>stretto</words></direction-type></direction>";
        for (const atStart of [true, false]) {
            for (const interpolate of [false, true]) {
                osmd.EngravingRules.UseInterpolatedTempoForAccelerandoEtc = interpolate;
                await osmd.load(score(initialTempo + (atStart ? continuous + note("C") : note("C") + continuous) +
                    note("D") + note("E") + tempo(90) + note("F")));
                const tempos: number[] = bpms();
                expect(tempos[0]).to.equal(120);
                if (interpolate) {
                    expect(tempos[2]).to.be.greaterThan(120);
                } else {
                    expect(tempos.slice(0, 3)).to.deep.equal([120, 120, 120]);
                }
                if (!atStart) {
                    expect(tempos[1]).to.equal(120);
                }
                expect(tempos[3]).to.equal(90);
                const iterator: MusicPartManagerIterator = osmd.Sheet.MusicPartManager.getIterator();
                for (let i: number = 1; i < tempos.length; i++) {
                    iterator.moveToNext();
                }
                for (let i: number = tempos.length - 2; i >= 0; i--) {
                    iterator.moveToPrevious();
                    expect(iterator.CurrentBpm).to.equal(tempos[i]);
                    expect(iterator.clone().CurrentBpm).to.equal(tempos[i]);
                }
            }
        }
    });

    it("resolves an initial tempo word with only a sound BPM", async (): Promise<void> => {
        await osmd.load(score(`<direction><direction-type><words>C</words></direction-type>
          <sound tempo="120"/></direction>` + note("C") + note("D") + note("E") + note("F")));
        expect(bpms()).to.deep.equal([120, 120, 120, 120]);
        expect(osmd.Sheet.TimestampSortedTempoExpressionsList[0].InstantaneousTempo.TempoInBpm).to.equal(120);
        expect(osmd.Sheet.getExpressionsStartTempoInBPM()).to.equal(120);
    });

    it("uses an explicit sound tempo as the baseline for later BPM-free marks", async (): Promise<void> => {
        const halfNote: string = `<direction><direction-type><metronome><beat-unit>half</beat-unit>
          <per-minute>60</per-minute></metronome></direction-type><sound tempo="120"/></direction>`;
        const modulation: string = `<direction><direction-type><metronome><beat-unit>quarter</beat-unit>
          <beat-unit>quarter</beat-unit><beat-unit-dot/></metronome></direction-type></direction>`;
        const words: string = "<direction><direction-type><words>Allegro</words></direction-type></direction>";
        await osmd.load(score(halfNote + words + note("C") + modulation + note("D") +
            words + note("E") + modulation + note("F")));
        // Simultaneous Allegro must not replace sound 120; a later Allegro without sound can set its own tempo.
        expect(bpms()).to.deep.equal([120, 180, 130, 195]);
    });

    it("sets a measure's TempoInBPM in quarter notes per minute: the sound tempo, else the metronome mark by its beat unit", async (): Promise<void> => {
        // [beat unit, dotted, per-minute, sound tempo, TempoInBPM]: a <sound tempo> wins over the mark it comes with
        const marks: [string, boolean, number, number, number][] = [
            ["half", false, 88, undefined, 176], ["half", false, 88, 176, 176], ["quarter", true, 60, undefined, 90],
            ["eighth", false, 120, undefined, 60], ["quarter", false, 60, 72, 72]];
        for (const [beatUnit, dotted, perMinute, soundTempo, tempoInBpm] of marks) {
            await osmd.load(score(metronome(beatUnit, perMinute, dotted, soundTempo) + note("C") + note("D") + note("E") + note("F")));
            expect(osmd.Sheet.SourceMeasures[0].TempoInBPM, `${beatUnit}${dotted ? " dotted" : ""} = ${perMinute}, sound tempo ${soundTempo}`)
                .to.equal(tempoInBpm);
        }
    });

    it("gives the tempo of a metronome mark without a sound tempo in quarter notes per minute, also as the start tempo", async (): Promise<void> => {
        const modulation: string = `<direction><direction-type><metronome><beat-unit>quarter</beat-unit>
          <beat-unit>quarter</beat-unit><beat-unit-dot/></metronome></direction-type></direction>`;
        await osmd.load(score(metronome("half", 30) + note("C") + metronome("quarter", 60, true) + note("D") +
            metronome("eighth", 120) + note("E") + modulation + note("F")));
        // half = 30 is 60 quarter notes per minute, dotted quarter = 60 is 90, eighth = 120 is 60, and quarter = dotted quarter
        //   after it 60 * 1.5 = 90 (before: 30, 60, 120 and 180)
        expect(bpms()).to.deep.equal([60, 90, 60, 90]);
        expect(osmd.Sheet.TimestampSortedTempoExpressionsList.map(expression => expression.InstantaneousTempo.TempoInBpm),
               "the marks' own numbers, which are drawn, and the note equation's tempo").to.deep.equal([30, 60, 120, 90]);
        expect(osmd.Sheet.DefaultStartTempoInBpm).to.equal(60);
        expect(osmd.Sheet.userStartTempoInBPM).to.equal(60);
        expect(osmd.Sheet.getExpressionsStartTempoInBPM()).to.equal(60);

        // a continuous tempo starts at the tempo before it (without interpolation, the default, the iterator stays at it)
        await osmd.load(score(metronome("half", 30) + note("C") +
            "<direction><direction-type><words>stretto</words></direction-type></direction>" + note("D") + note("E") + note("F")));
        expect(osmd.Sheet.TimestampSortedTempoExpressionsList[1].ContinuousTempo.StartTempo).to.equal(60);
        expect(bpms()).to.deep.equal([60, 60, 60, 60]);
    });

    it("returns to the tempo before the latest temporary change at a tempo, and to the first tempo at Tempo I", async (): Promise<void> => {
        // piu lento and poco lento get Lento's 48 BPM
        await osmd.load(score(tempo(120) + note("C") + wordsDirection("piu lento") + note("D") +
            wordsDirection("a tempo") + note("E") + note("F")));
        expect(bpms()).to.deep.equal([120, 48, 120, 120]);
        // in quarter notes per minute: half = 30 without a sound tempo is 60
        await osmd.load(score(metronome("half", 30) + note("C") + wordsDirection("piu lento") + note("D") +
            wordsDirection("a tempo") + note("E") + note("F")));
        expect(bpms()).to.deep.equal([60, 48, 60, 60]);
        await osmd.load(score(tempo(120) + note("C") + tempo(90) + note("D") + wordsDirection("poco lento") + note("E") +
            wordsDirection("a tempo") + note("F")));
        expect(bpms()).to.deep.equal([120, 90, 48, 90]);
        await osmd.load(score(tempo(120) + note("C") + tempo(90) + note("D") + wordsDirection("Tempo I") + note("E") + note("F")));
        expect(bpms()).to.deep.equal([120, 90, 120, 120]);
        // a temporary change with a metronome mark at the same time
        await osmd.load(score(tempo(120) + note("C") + tempo(144) + wordsDirection("piu mosso") + note("D") +
            wordsDirection("a tempo") + note("E") + note("F")));
        expect(bpms()).to.deep.equal([120, 144, 120, 120]);
        // the first tempo of the piece, although poco makes it look like a temporary change
        await osmd.load(score(note("C") + wordsDirection("Poco allegretto") + note("D") + note("E") +
            wordsDirection("a tempo") + note("F")));
        expect(bpms()).to.deep.equal([100, 112, 112, 112]);
    });

    it("keeps the tempo at poco rit. and molto accel., which have no BPM of their own", async (): Promise<void> => {
        await osmd.load(score(tempo(120) + note("C") + wordsDirection("poco rit.") + note("D") + wordsDirection("a tempo") +
            note("E") + wordsDirection("molto accel.") + note("F")));
        expect(bpms()).to.deep.equal([120, 120, 120, 120]);
    });

    it("validates decimal sound syntax", async (): Promise<void> => {
        const values: [string, number][] = [[" &#x9;&#xD;+120.&#xA; ", 120], [".5", 0.5],
            ["-1", 100], ["\u00a0120\u00a0", 100]];
        await osmd.load(score(values.map(([value]): string =>
            `<direction><direction-type><words>Andante</words></direction-type><sound tempo="${value}"/></direction>` + note("C")
        ).join("")));
        expect(bpms()).to.deep.equal(values.map(([, expected]): number => expected));
    });
});
