import {expect} from "chai";
import {TestUtils} from "../../../Util/TestUtils";
import {OpenSheetMusicDisplay} from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {MusicPartManagerIterator} from "../../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";

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
          <per-minute>60</per-minute></metronome></direction-type><sound tempo="120"/></direction>`;
        const words: string = "<direction><direction-type><words>Allegro</words></direction-type></direction>";
        await osmd.load(score(direction + words + note("C") + note("D") + note("E") + note("F")));
        expect(osmd.Sheet.SourceMeasures[0].TempoExpressions[0].InstantaneousTempo.TempoInBpm).to.equal(60);
        expect(bpms()).to.deep.equal([120, 120, 120, 120]);
        expect(osmd.Sheet.getExpressionsStartTempoInBPM()).to.equal(120);

        const markWithoutSound: string = direction.replace('<sound tempo="120"/>', "");
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
});
