import {LyricWord} from "../../VoiceData/Lyrics/LyricsWord";
import {VoiceEntry} from "../../VoiceData/VoiceEntry";
import {IXmlElement} from "../../../Common/FileIO/Xml";
import {LyricsEntry} from "../../VoiceData/Lyrics/LyricsEntry";
import {ITextTranslation} from "../../Interfaces/ITextTranslation";
import {MusicSheet} from "../../MusicSheet";

export class LyricsReader {
    private openLyricWords: { [_: number]: LyricWord } = {};
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
        if (lyricNodeList) {
            const lyricNodeListArr: IXmlElement[] = lyricNodeList;
            for (let idx: number = 0, len: number = lyricNodeListArr.length; idx < len; ++idx) {
                const lyricNode: IXmlElement = lyricNodeListArr[idx];
                try {
                    let syllabic: string = "single"; // Single as default
                    if (lyricNode.element("text")) {
                        let textNode: IXmlElement = lyricNode.element("text");
                        if (lyricNode.element("syllabic")) {
                            syllabic = lyricNode.element("syllabic").value;
                        }
                        if (textNode) {
                            let text: string = "";
                            const textAndElisionNodes: IXmlElement[] = lyricNode.elements();
                            for (const node of textAndElisionNodes) {
                                if (node.name === "text" || node.name === "elision") {
                                    text += node.value;
                                }
                            }
                            text = text.replace("  ", " "); // filter multiple spaces from concatenating e.g. text "a " with elision " "
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
                                if (nextText !== undefined && nextSyllabic) {
                                    textNode = nextText;
                                    syllabic = "middle";
                                }
                            }
                            let currentLyricVerseNumber: string = "1";
                            if (lyricNode.attributes() !== undefined && lyricNode.attribute("number")) {
                                currentLyricVerseNumber = lyricNode.attribute("number").value;
                            }
                            let lyricsEntry: LyricsEntry = undefined;
                            if (syllabic === "single" || syllabic === "end") {
                                if (this.openLyricWords[currentLyricVerseNumber]) { // word end given or some word still open
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
                                if (this.openLyricWords[currentLyricVerseNumber]) {
                                    delete this.openLyricWords[currentLyricVerseNumber];
                                    this.currentLyricWord = undefined;
                                }
                                this.currentLyricWord = new LyricWord();
                                this.openLyricWords[currentLyricVerseNumber] = this.currentLyricWord;
                                lyricsEntry = new LyricsEntry(text, currentLyricVerseNumber, this.currentLyricWord, currentVoiceEntry, 0);
                                this.currentLyricWord.Syllables.push(lyricsEntry);
                            } else if (syllabic === "middle") {
                                if (this.openLyricWords[currentLyricVerseNumber]) {
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
                            if (lyricsEntry) {
                                // only add the lyric entry if not another entry has already been given:
                                if (!currentVoiceEntry.LyricsEntries[currentLyricVerseNumber]) {
                                    currentVoiceEntry.LyricsEntries.setValue(currentLyricVerseNumber, lyricsEntry);
                                    if (currentVoiceEntry.ParentSourceStaffEntry?.VerticalContainerParent?.ParentMeasure) {
                                        currentVoiceEntry.ParentSourceStaffEntry.VerticalContainerParent.ParentMeasure.hasLyrics = true;
                                        // currentVoiceEntry.ParentSourceStaffEntry.ParentStaff.hasLyrics = true; // TODO enable, though rarely lyrics on rests
                                    }
                                }
                                // save in currentInstrument the verseNumber (only once)
                                if (!currentVoiceEntry.ParentVoice.Parent.LyricVersesNumbers.includes(currentLyricVerseNumber)) {
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
        }
    }
}
