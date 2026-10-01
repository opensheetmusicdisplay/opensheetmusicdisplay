import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalLyricEntry } from "../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";

/**
 * EngravingRules.LyricsUseXPaddingForLongLyrics (default true) adds padding to the right of a note with a long syllable.
 * With several verses, the padding comes from the verse that needs the most, not from the first verse that is long
 * enough to need any: the syllables of a second verse with longer syllables than the first used to run into each other.
 */
describe("Lyrics x-padding with several verses", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    /** Eighth notes with a syllable just above LyricsXPaddingWidthThreshold in verse 1 ("về")
     *  and longer ones in verse 2 ("nghiêng", "ai"). */
    const sampleFilename: string = "test_lyrics_x_padding_longer_second_verse.musicxml";

    async function render(score: Document): Promise<OpenSheetMusicDisplay> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(score);
        osmd.render();
        return osmd;
    }

    /** The same score with the syllables of verses 1 and 2 swapped. */
    function swapVerses(score: Document): Document {
        const swapped: Document = score.cloneNode(true) as Document;
        const notes: HTMLCollectionOf<Element> = swapped.getElementsByTagName("note");
        for (let i: number = 0; i < notes.length; i++) {
            const texts: Element[] = Array.from(notes[i].getElementsByTagName("text"));
            if (texts.length === 2) {
                [texts[0].textContent, texts[1].textContent] = [texts[1].textContent, texts[0].textContent];
            }
        }
        return swapped;
    }

    function lyricEntriesOfVerse(osmd: OpenSheetMusicDisplay, verseNumber: string): GraphicalLyricEntry[][] {
        return osmd.GraphicSheet.MusicPages.flatMap(page => page.MusicSystems).map(system =>
            system.StaffLines[0].Measures.flatMap((measure: GraphicalMeasure) => measure.staffEntries)
                .flatMap(staffEntry => staffEntry.LyricsEntries)
                .filter((entry: GraphicalLyricEntry) => entry.LyricsEntry.VerseNumber === verseNumber));
    }

    it("keeps the syllables of a longer second verse apart", async () => {
        const osmd: OpenSheetMusicDisplay = await render(TestUtils.getScore(sampleFilename));
        for (const systemEntries of lyricEntriesOfVerse(osmd, "2")) {
            expect(systemEntries.length, "the sample has verse 2 syllables in each system").to.be.greaterThan(1);
            for (let i: number = 1; i < systemEntries.length; i++) {
                const previous: BoundingBox = systemEntries[i - 1].GraphicalLabel.PositionAndShape;
                const current: BoundingBox = systemEntries[i].GraphicalLabel.PositionAndShape;
                const gap: number = current.AbsolutePosition.x + current.BorderLeft - (previous.AbsolutePosition.x + previous.BorderRight);
                expect(gap, `gap between "${systemEntries[i - 1].LyricsEntry.Text}" and "${systemEntries[i].LyricsEntry.Text}"`)
                    .to.be.at.least(osmd.EngravingRules.HorizontalBetweenLyricsDistance);
            }
        }
    });

    it("spaces the notes the same whichever verse has the longer syllables", async () => {
        const score: Document = TestUtils.getScore(sampleFilename);
        function noteXs(osmd: OpenSheetMusicDisplay): number[] {
            return osmd.GraphicSheet.MeasureList.flatMap(measures => measures[0].staffEntries)
                .map(staffEntry => staffEntry.PositionAndShape.AbsolutePosition.x);
        }
        const longSecondVerse: number[] = noteXs(await render(score));
        const longFirstVerse: number[] = noteXs(await render(swapVerses(score)));
        expect(longSecondVerse).to.deep.equal(longFirstVerse);
    });
});
