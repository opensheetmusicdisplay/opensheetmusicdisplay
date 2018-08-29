import {LyricWord} from "../../VoiceData/Lyrics/LyricsWord";
import {VoiceEntry} from "../../VoiceData/VoiceEntry";
import {IXmlElement} from "../../../Common/FileIO/Xml";
import {LyricsEntry} from "../../VoiceData/Lyrics/LyricsEntry";
import {ITextTranslation} from "../../Interfaces/ITextTranslation";
import {MusicSheet} from "../../MusicSheet";

export class LyricsReader {
    private openLyricWords: { [_: number]: LyricWord; } = {};
    private currentLyricWord: LyricWord;
    private musicSheet: MusicSheet;

    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
    }
    /**
     * This method adds a single LyricEntry to a VoiceEntry
     * @param {IXmlElement[]} lyricNodeList
     * @param {VoiceEntry} currentVoiceEntry
     */
    public addLyricEntry(lyricNodeList: IXmlElement[], currentVoiceEntry: VoiceEntry): void {
        if (lyricNodeList !== undefined) {
            const lyricNodeListArr: IXmlElement[] = lyricNodeList;
            for (let idx: number = 0, len: number = lyricNodeListArr.length; idx < len; ++idx) {
                const lyricNode: IXmlElement = lyricNodeListArr[idx];
                try {
                    let syllabic: string = "single"; // Single as default
                    if (lyricNode.element("text") !== undefined) {
                        let textNode: IXmlElement = lyricNode.element("text");
                        if (lyricNode.element("syllabic") !== undefined) {
                            syllabic = lyricNode.element("syllabic").value;
                        }
                        if (textNode !== undefined) {
                            const text: string = textNode.value;
                            // <elision> separates Multiple syllabels on a single LyricNote
                            // "-" text indicating separated syllabel should be ignored
                            // we calculate the Dash element much later
                            if (lyricNode.element("elision") !== undefined && text === "-") {
                                const lyricNodeChildren: IXmlElement[] = lyricNode.elements();
                                let elisionIndex: number = 0;
                                for (let i: number = 0; i < lyricNodeChildren.length; i++) {
                                    const child: IXmlElement = lyricNodeChildren[i];
                                    if (child.name === "elision") {
                                        elisionIndex = i;
                                        break;
                                    }
                                }
                                let nextText: IXmlElement = undefined;
                                let nextSyllabic: IXmlElement = undefined;
                                // read the next nodes
                                if (elisionIndex > 0) {
                                    for (let i: number = elisionIndex; i < lyricNodeChildren.length; i++) {
                                        const child: IXmlElement = lyricNodeChildren[i];
                                        if (child.name === "text") {
                                            nextText = child;
                                        }
                                        if (child.name === "syllabic") {
                                            nextSyllabic = child;
                                        }
                                    }
                                }
                                if (nextText !== undefined && nextSyllabic !== undefined) {
                                    textNode = nextText;
                                    syllabic = "middle";
                                }
                            }
                            let currentLyricVerseNumber: number = 1;
                            if (lyricNode.attributes() !== undefined && lyricNode.attribute("number") !== undefined) {
                                try {
                                    currentLyricVerseNumber = parseInt(lyricNode.attribute("number").value, 10);
                                } catch (err) {
                                    try {
                                        const result: string[] = lyricNode.attribute("number").value.toLowerCase().split("verse");
                                        if (result.length > 1) {
                                            currentLyricVerseNumber = parseInt(result[1], 10);
                                        }
                                    } catch (err) {
                                        const errorMsg: string =
                                        ITextTranslation.translateText("ReaderErrorMessages/LyricVerseNumberError", "Invalid lyric verse number");
                                        this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                                        continue;
                                    }
                                }
                            }
                            let lyricsEntry: LyricsEntry = undefined;
                            if (syllabic === "single" || syllabic === "end") {
                                if (this.openLyricWords[currentLyricVerseNumber] !== undefined) { // word end given or some word still open
                                    this.currentLyricWord = this.openLyricWords[currentLyricVerseNumber];
                                    const syllableNumber: number = this.currentLyricWord.Syllables.length;
                                    lyricsEntry = new LyricsEntry(text, currentLyricVerseNumber, this.currentLyricWord, currentVoiceEntry, syllableNumber);
                                    this.currentLyricWord.Syllables.push(lyricsEntry);
                                    delete this.openLyricWords[currentLyricVerseNumber];
                                    this.currentLyricWord = undefined;
                                } else { // single syllable given or end given while no word has been started
                                    lyricsEntry = new LyricsEntry(text, currentLyricVerseNumber, undefined, currentVoiceEntry);
                                }
                                lyricsEntry.extend = lyricNode.element("extend") !== undefined;
                            } else if (syllabic === "begin") { // first finishing, if a word already is open (can only happen, when wrongly given)
                                if (this.openLyricWords[currentLyricVerseNumber] !== undefined) {
                                    delete this.openLyricWords[currentLyricVerseNumber];
                                    this.currentLyricWord = undefined;
                                }
                                this.currentLyricWord = new LyricWord();
                                this.openLyricWords[currentLyricVerseNumber] = this.currentLyricWord;
                                lyricsEntry = new LyricsEntry(text, currentLyricVerseNumber, this.currentLyricWord, currentVoiceEntry, 0);
                                this.currentLyricWord.Syllables.push(lyricsEntry);
                            } else if (syllabic === "middle") {
                                if (this.openLyricWords[currentLyricVerseNumber] !== undefined) {
                                    this.currentLyricWord = this.openLyricWords[currentLyricVerseNumber];
                                    const syllableNumber: number = this.currentLyricWord.Syllables.length;
                                    lyricsEntry = new LyricsEntry(text, currentLyricVerseNumber, this.currentLyricWord, currentVoiceEntry, syllableNumber);
                                    this.currentLyricWord.Syllables.push(lyricsEntry);
                                } else {
                                    // in case the wrong syllabel information is given, create a single Entry and add it to currentVoiceEntry
                                    lyricsEntry = new LyricsEntry(text, currentLyricVerseNumber, undefined, currentVoiceEntry);
                                }
                            }
                            // add each LyricEntry to currentVoiceEntry
                            if (lyricsEntry !== undefined) {
                                // only add the lyric entry if not another entry has already been given:
                                if (!currentVoiceEntry.LyricsEntries[currentLyricVerseNumber] !== undefined) {
                                    currentVoiceEntry.LyricsEntries.setValue(currentLyricVerseNumber, lyricsEntry);
                                }
                                // save in currentInstrument the verseNumber (only once)
                                if (!currentVoiceEntry.ParentVoice.Parent.LyricVersesNumbers[currentLyricVerseNumber] !== undefined) {
                                    currentVoiceEntry.ParentVoice.Parent.LyricVersesNumbers.push(currentLyricVerseNumber);
                                }
                            }
                        }
                    }
                } catch (err) {
                    const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/LyricError", "Error while reading lyric entry.");
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    continue;
                }
            }
            // Squash to unique numbers
            currentVoiceEntry.ParentVoice.Parent.LyricVersesNumbers =
            currentVoiceEntry.ParentVoice.Parent.LyricVersesNumbers.filter((lvn, index, self) => self.indexOf(lvn) === index);
        }
    }
}
