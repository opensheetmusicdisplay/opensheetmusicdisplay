import { expect } from "chai";
import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";
import { MusicSheetReader } from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { TestUtils } from "../../Util/TestUtils";

function readSheet(scoreName: string): MusicSheet {
    const doc: Document = TestUtils.getScore(scoreName);
    expect(doc, "sample file is loaded").to.not.equal(undefined);
    const score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
    return new MusicSheetReader().createMusicSheet(score, scoreName);
}

function collectMeasureTraversal(sheet: MusicSheet): number[] {
    const traversal: number[] = [];
    const iterator: MusicPartManagerIterator = sheet.MusicPartManager.getIterator();

    while (!iterator.EndReached && iterator.CurrentVoiceEntries) {
        const hasAudibleNotes: boolean = iterator.CurrentAudibleVoiceEntries().some((voiceEntry): boolean =>
            (voiceEntry?.Notes || []).some((note): boolean => !note.isRest?.()));

        if (hasAudibleNotes) {
            traversal.push(iterator.CurrentMeasureIndex + 1);
        }
        iterator.moveToNext();
    }

    return traversal;
}

describe("Music Sheet Repetition playback", () => {
    it("uses MusicXML repeat times for plain backward repeats", () => {
        const sheet: MusicSheet = readSheet("test_repeat_times_4.musicxml");

        expect(sheet.Repetitions.length).to.equal(1);
        expect(sheet.Repetitions[0].BackwardJumpInstructions[0].Times).to.equal(4);
        expect(sheet.Repetitions[0].UserNumberOfRepetitions).to.equal(4);
        expect(collectMeasureTraversal(sheet)).to.deep.equal([1, 2, 1, 2, 1, 2, 1, 2]);
    });

    it("plays first, second, and third endings on successive passes", () => {
        const sheet: MusicSheet = readSheet("test_repeat_volta_1_2_3.musicxml");

        expect(sheet.Repetitions.length).to.equal(1);
        expect(sheet.Repetitions[0].NumberOfEndings).to.equal(3);
        expect(sheet.Repetitions[0].UserNumberOfRepetitions).to.equal(3);
        expect(collectMeasureTraversal(sheet)).to.deep.equal([1, 2, 1, 3, 1, 4]);
    });
});
