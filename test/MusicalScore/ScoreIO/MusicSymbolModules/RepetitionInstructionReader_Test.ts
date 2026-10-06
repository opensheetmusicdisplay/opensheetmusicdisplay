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
         * Lets the reader handle a direction with the given words text, and a sound element if attributes are given.
         * @param wordsText the text content of the words element
         * @param soundAttributes the attributes of the direction's sound element, e.g. 'fine="yes"'
         * @returns true if the reader handled the words as a repetition instruction
         */
        function handleWords(wordsText: string, soundAttributes?: string): boolean {
            reader.repetitionInstructions.length = 0;
            const doc: Document = new DOMParser().parseFromString(
                "<direction><direction-type><words>" + wordsText + "</words></direction-type>" +
                (soundAttributes ? "<sound " + soundAttributes + "/>" : "") + "</direction>", "text/xml");
            const direction: IXmlElement = new IXmlElement(doc.documentElement);
            return reader.handleRepetitionInstructionsFromWordsOrSymbols(direction.element("direction-type"), 0, direction.element("sound"));
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
            { text: "D.S.al Coda", expectedType: RepetitionInstructionEnum.DalSegnoAlCoda },
            { text: "D.C. al Fine", expectedType: RepetitionInstructionEnum.DaCapoAlFine },
            { text: "D.C.al Fine", expectedType: RepetitionInstructionEnum.DaCapoAlFine },
            { text: "Da Capo al Fine", expectedType: RepetitionInstructionEnum.DaCapoAlFine },
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
                expect(reader.repetitionInstructions[0].Words, "drawn as its label").to.equal(undefined);
            });
        }

        // text that merely mentions an instruction is not an instruction and should be rendered as text (see #1687):
        const plainTextCases: string[] = [
            "voice tacet on D.S.", // issue #1687
            "gradually build up to coda",
            "drums tacet until Fine",
            "Tuning D-A-D-G-B-D, Capo 4th fret",
            "tacet D.S.",
        ];
        for (const text of plainTextCases) {
            it("does not detect \"" + text + "\" as repetition instruction", () => {
                expect(handleWords(text), "words are not handled as repetition instruction").to.equal(false);
                expect(reader.repetitionInstructions.length).to.equal(0);
            });
        }

        // a D.C. or D.S. after a capitalized word, usually the section to play again: its words are drawn instead of its label
        it("detects the D.C. in \"Menuetto D.C. al Fine\", whose words are drawn instead of its label", () => {
            expect(handleWords("Menuetto D.C. al Fine"), "words are handled as repetition instruction").to.equal(true);
            expect(reader.repetitionInstructions.length).to.equal(1);
            expect(reader.repetitionInstructions[0].type).to.equal(RepetitionInstructionEnum.DaCapoAlFine);
            expect(reader.repetitionInstructions[0].Words).to.equal("Menuetto D.C. al Fine");
        });

        interface SoundTestCase {
            text: string;
            sound: string;
            expectedType: RepetitionInstructionEnum;
            /** the words drawn instead of the instruction's label, or undefined for the label */
            expectedWords: string;
        }
        // words in other languages or with more words than an instruction, which only the sound names: drawn instead of the label
        const soundCases: SoundTestCase[] = [
            { text: "Fin", sound: "fine=\"yes\"", expectedType: RepetitionInstructionEnum.Fine, expectedWords: "Fin" },
            { text: "Da Capo bis Ende", sound: "dacapo=\"yes\"", expectedType: RepetitionInstructionEnum.DaCapo, expectedWords: "Da Capo bis Ende" },
            { text: "Dal Segno bis Ende", sound: "dalsegno=\"segno1\"", expectedType: RepetitionInstructionEnum.DalSegno,
              expectedWords: "Dal Segno bis Ende" },
            { text: "Zur Coda", sound: "tocoda=\"coda1\"", expectedType: RepetitionInstructionEnum.ToCoda, expectedWords: "Zur Coda" },
            // whether to take the repeats after the jump (issue #1767)
            { text: "D.C. senza replica", sound: "dacapo=\"yes\"", expectedType: RepetitionInstructionEnum.DaCapo,
              expectedWords: "D.C. senza replica" },
            { text: "D.S. al Coda (with repeats)", sound: "dalsegno=\"s\"", expectedType: RepetitionInstructionEnum.DalSegno,
              expectedWords: "D.S. al Coda (with repeats)" },
            // words that name an instruction still say which one it is, and are drawn as its label
            { text: "D.C. al Fine", sound: "dacapo=\"yes\"", expectedType: RepetitionInstructionEnum.DaCapoAlFine, expectedWords: undefined },
        ];
        for (const testCase of soundCases) {
            it("reads \"" + testCase.text + "\" with <sound " + testCase.sound + "/> as repetition instruction", () => {
                expect(handleWords(testCase.text, testCase.sound), "words are handled as repetition instruction").to.equal(true);
                expect(reader.repetitionInstructions.length).to.equal(1);
                expect(reader.repetitionInstructions[0].type).to.equal(testCase.expectedType);
                expect(reader.repetitionInstructions[0].Words, "drawn words").to.equal(testCase.expectedWords);
            });
        }

        // a segno read from the sound is a D.S. target, like a segno sign with <sound segno>, so it isn't taken for a D.S.
        it("marks a segno read from <sound segno> as the target of a D.S.", () => {
            expect(handleWords("Zeichen", "segno=\"segno2\"")).to.equal(true);
            expect(reader.repetitionInstructions[0].type).to.equal(RepetitionInstructionEnum.Segno);
            expect(reader.repetitionInstructions[0].MarkedAsTarget).to.equal(true);
            expect(reader.repetitionInstructions[0].Words, "drawn as the sign").to.equal(undefined);
        });

        it("leaves words it doesn't know as text without a sound that names an instruction", () => {
            expect(handleWords("Fin")).to.equal(false);
            expect(handleWords("Fin", "tempo=\"100\"")).to.equal(false);
            expect(handleWords("Fin", "dacapo=\"no\"")).to.equal(false);
            expect(reader.repetitionInstructions.length).to.equal(0);
        });
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
