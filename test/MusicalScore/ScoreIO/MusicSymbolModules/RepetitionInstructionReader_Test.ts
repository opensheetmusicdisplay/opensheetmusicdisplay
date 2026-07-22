import { expect } from "chai";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheet } from "../../../../src/MusicalScore/MusicSheet";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { RepetitionInstructionReader } from "../../../../src/MusicalScore/ScoreIO/MusicSymbolModules/RepetitionInstructionReader";
import { RepetitionInstruction, RepetitionInstructionEnum } from "../../../../src/MusicalScore/VoiceData/Instructions/RepetitionInstruction";
import { SourceMeasure } from "../../../../src/MusicalScore/VoiceData/SourceMeasure";
import { MultiExpression } from "../../../../src/MusicalScore/VoiceData/Expressions/MultiExpression";
import { UnknownExpression } from "../../../../src/MusicalScore/VoiceData/Expressions/UnknownExpression";

describe("RepetitionInstructionReader", () => {
    describe("handleRepetitionInstructionsFromWordsOrSymbols", () => {
        const reader: RepetitionInstructionReader = new RepetitionInstructionReader();
        reader.MusicSheet = new MusicSheet();
        reader.prepareReadingMeasure(undefined, 0);

        /**
         * Lets the reader handle a direction-type node with the given words text.
         * @param wordsText the text content of the words element
         * @returns true if the reader handled the words as a repetition instruction
         */
        function handleWords(wordsText: string): boolean {
            reader.repetitionInstructions.length = 0;
            const doc: Document = new DOMParser().parseFromString(
                "<direction-type><words>" + wordsText + "</words></direction-type>", "text/xml");
            const directionTypeNode: IXmlElement = new IXmlElement(doc.documentElement);
            return reader.handleRepetitionInstructionsFromWordsOrSymbols(directionTypeNode, 0);
        }

        interface WordsTestCase {
            text: string;
            expectedType: RepetitionInstructionEnum;
        }
        const instructionCases: WordsTestCase[] = [
            { text: "D.S. al Fine", expectedType: RepetitionInstructionEnum.DalSegnoAlFine },
            { text: "D.S. al Coda", expectedType: RepetitionInstructionEnum.DalSegnoAlCoda },
            { text: "d. s. al coda", expectedType: RepetitionInstructionEnum.DalSegnoAlCoda },
            { text: "dal segno al coda", expectedType: RepetitionInstructionEnum.DalSegnoAlCoda },
            { text: "D.S.", expectedType: RepetitionInstructionEnum.DalSegno },
            { text: "Dal Segno", expectedType: RepetitionInstructionEnum.DalSegno },
            { text: "D.C. al Fine", expectedType: RepetitionInstructionEnum.DaCapoAlFine },
            { text: "D.C. al Coda", expectedType: RepetitionInstructionEnum.DaCapoAlCoda },
            { text: "D.C.", expectedType: RepetitionInstructionEnum.DaCapo },
            { text: "Da Capo", expectedType: RepetitionInstructionEnum.DaCapo },
            { text: "To Coda", expectedType: RepetitionInstructionEnum.ToCoda },
            { text: "to coda.", expectedType: RepetitionInstructionEnum.ToCoda },
            { text: "a la Coda", expectedType: RepetitionInstructionEnum.ToCoda },
            { text: "Fine", expectedType: RepetitionInstructionEnum.Fine },
            { text: "Coda", expectedType: RepetitionInstructionEnum.Coda },
            { text: "Segno", expectedType: RepetitionInstructionEnum.Segno },
        ];
        for (const testCase of instructionCases) {
            it("detects \"" + testCase.text + "\" as repetition instruction", () => {
                expect(handleWords(testCase.text), "words are handled as repetition instruction").to.equal(true);
                expect(reader.repetitionInstructions.length).to.equal(1);
                expect(reader.repetitionInstructions[0].type).to.equal(testCase.expectedType);
            });
        }

        // text that merely mentions an instruction is not an instruction and should be rendered as text (see #1687):
        const plainTextCases: string[] = [
            "voice tacet on D.S.", // issue #1687
            "gradually build up to coda",
            "drums tacet until Fine",
            "Tuning D-A-D-G-B-D, Capo 4th fret",
        ];
        for (const text of plainTextCases) {
            it("does not detect \"" + text + "\" as repetition instruction", () => {
                expect(handleWords(text), "words are not handled as repetition instruction").to.equal(false);
                expect(reader.repetitionInstructions.length).to.equal(0);
            });
        }
    });

    describe("words mentioning D.S. within a longer text (issue #1687)", () => {
        const path: string = "test/data/test_words_voice_tacet_on_ds_1687.musicxml";
        let sheet: MusicSheet;

        before((): void => {
            const doc: Document = ((window as any).__xml__)[path];
            expect(doc, "sample file is loaded").to.not.equal(undefined);
            const score: IXmlElement = new IXmlElement(doc.getElementsByTagName("score-partwise")[0]);
            sheet = new MusicSheetReader().createMusicSheet(score, path);
        });

        it("does not create a repetition instruction from 'voice tacet on D.S.'", () => {
            const measure2: SourceMeasure = sheet.SourceMeasures[1];
            expect(measure2.FirstRepetitionInstructions.length).to.equal(0);
            expect(measure2.LastRepetitionInstructions.length).to.equal(0);
        });

        it("reads 'voice tacet on D.S.' as text (unknown expression)", () => {
            const measure2: SourceMeasure = sheet.SourceMeasures[1];
            const unknownExpressionLabels: string[] = [];
            for (const staffExpressions of measure2.StaffLinkedExpressions) {
                for (const multiExpression of staffExpressions as MultiExpression[]) {
                    for (const unknownExpression of multiExpression.UnknownList as UnknownExpression[]) {
                        unknownExpressionLabels.push(unknownExpression.Label);
                    }
                }
            }
            expect(unknownExpressionLabels).to.contain("voice tacet on D.S.");
        });

        it("still detects the actual repetition instructions of the piece", () => {
            const getTypes: (instructions: RepetitionInstruction[]) => RepetitionInstructionEnum[] =
                (instructions: RepetitionInstruction[]): RepetitionInstructionEnum[] =>
                    instructions.map((instruction: RepetitionInstruction): RepetitionInstructionEnum => instruction.type);
            expect(getTypes(sheet.SourceMeasures[0].FirstRepetitionInstructions)).to.contain(RepetitionInstructionEnum.Segno);
            expect(getTypes(sheet.SourceMeasures[2].LastRepetitionInstructions)).to.contain(RepetitionInstructionEnum.Fine);
            expect(getTypes(sheet.SourceMeasures[3].LastRepetitionInstructions)).to.contain(RepetitionInstructionEnum.DalSegnoAlFine);
        });
    });
});
