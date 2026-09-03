import {LyricWord} from "../../VoiceData/Lyrics/LyricsWord";
import {VoiceEntry} from "../../VoiceData/VoiceEntry";
import {IXmlElement} from "../../../Common/FileIO/Xml";
import {
    LyricExtendType,
    LyricsEntry,
    LyricSyllabic,
} from "../../VoiceData/Lyrics/LyricsEntry";
import {ITextTranslation} from "../../Interfaces/ITextTranslation";
import {MusicSheet} from "../../MusicSheet";

export class LyricsReader {
    private openLyricWords: { [_: string]: LyricWord } = {};
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
                    const extendType: LyricExtendType = this.readExtendType(lyricNode);
                    let syllabic: LyricSyllabic = this.readSyllabic(lyricNode);
                    let textNode: IXmlElement = lyricNode.element("text");
                    if (!textNode && extendType === LyricExtendType.None) {
                        continue;
                    }

                    let text: string = "";
                    if (textNode) {
                        const textAndElisionNodes: IXmlElement[] = lyricNode.elements();
                        for (const node of textAndElisionNodes) {
                            if (node.name === "text" || node.name === "elision") {
                                text += node.value;
                            }
                        }
                        text = text.replace("  ", " "); // filter multiple spaces from concatenating e.g. text "a " with elision " "
                        // <elision> separates multiple syllables on a single lyric note.
                        // "-" text indicating separated syllables should be ignored;
                        // the dash is calculated much later.
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
                                syllabic = LyricSyllabic.Middle;
                            }
                        }
                    }

                    const currentLyricVerseName: string = this.readLyricVerseName(lyricNode);
                    const currentLyricVerseNumber: string =
                        this.resolveLyricVerseIdentifier(lyricNode, currentLyricVerseName);
                    const lyricsEntry: LyricsEntry = textNode
                        ? this.createTextLyricEntry(
                            text,
                            currentLyricVerseNumber,
                            currentLyricVerseName,
                            syllabic,
                            extendType,
                            currentVoiceEntry,
                        )
                        : new LyricsEntry(
                            "",
                            currentLyricVerseNumber,
                            undefined,
                            currentVoiceEntry,
                            -1,
                            currentLyricVerseName,
                            syllabic,
                            extendType,
                        );
                    this.attachLyricEntry(lyricsEntry, currentLyricVerseNumber, currentVoiceEntry);
                } catch (err) {
                    const errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/LyricError", "Error while reading lyric entry.");
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    continue;
                }
            }
        }
    }

    private createTextLyricEntry(
        text: string,
        verseNumber: string,
        verseName: string,
        syllabic: LyricSyllabic,
        extendType: LyricExtendType,
        currentVoiceEntry: VoiceEntry,
    ): LyricsEntry {
        let lyricsEntry: LyricsEntry;
        if (syllabic === LyricSyllabic.Single || syllabic === LyricSyllabic.End) {
            if (this.openLyricWords[verseNumber]) { // word end given or some word still open
                this.currentLyricWord = this.openLyricWords[verseNumber];
                lyricsEntry = new LyricsEntry(
                    text,
                    verseNumber,
                    this.currentLyricWord,
                    currentVoiceEntry,
                    this.currentLyricWord.Syllables.length,
                    verseName,
                    syllabic,
                    extendType,
                );
                this.currentLyricWord.addSyllable(lyricsEntry);
                delete this.openLyricWords[verseNumber];
                this.currentLyricWord = undefined;
            } else { // single syllable given or end given while no word has been started
                lyricsEntry = new LyricsEntry(
                    text,
                    verseNumber,
                    undefined,
                    currentVoiceEntry,
                    -1,
                    verseName,
                    syllabic,
                    extendType,
                );
            }
        } else if (syllabic === LyricSyllabic.Begin) {
            // Finish a word left open by malformed input before starting the new one.
            if (this.openLyricWords[verseNumber]) {
                delete this.openLyricWords[verseNumber];
                this.currentLyricWord = undefined;
            }
            this.currentLyricWord = new LyricWord();
            this.openLyricWords[verseNumber] = this.currentLyricWord;
            lyricsEntry = new LyricsEntry(
                text,
                verseNumber,
                this.currentLyricWord,
                currentVoiceEntry,
                0,
                verseName,
                syllabic,
                extendType,
            );
            this.currentLyricWord.addSyllable(lyricsEntry);
        } else if (this.openLyricWords[verseNumber]) {
            this.currentLyricWord = this.openLyricWords[verseNumber];
            lyricsEntry = new LyricsEntry(
                text,
                verseNumber,
                this.currentLyricWord,
                currentVoiceEntry,
                this.currentLyricWord.Syllables.length,
                verseName,
                syllabic,
                extendType,
            );
            this.currentLyricWord.addSyllable(lyricsEntry);
        } else {
            // In case the wrong syllable information is given, create a standalone entry.
            lyricsEntry = new LyricsEntry(
                text,
                verseNumber,
                undefined,
                currentVoiceEntry,
                -1,
                verseName,
                syllabic,
                extendType,
            );
        }
        return lyricsEntry;
    }

    private attachLyricEntry(lyricsEntry: LyricsEntry, verseNumber: string, currentVoiceEntry: VoiceEntry): void {
        // Only add the lyric entry if another entry has not already been given.
        if (!currentVoiceEntry.LyricsEntries[verseNumber]) {
            currentVoiceEntry.LyricsEntries.setValue(verseNumber, lyricsEntry);
            if (currentVoiceEntry.ParentSourceStaffEntry?.VerticalContainerParent?.ParentMeasure) {
                currentVoiceEntry.ParentSourceStaffEntry.VerticalContainerParent.ParentMeasure.hasLyrics = true;
            }
        }
        // Save the verse number in the current instrument (only once).
        if (!currentVoiceEntry.ParentVoice.Parent.LyricVersesNumbers.includes(verseNumber)) {
            currentVoiceEntry.ParentVoice.Parent.LyricVersesNumbers.push(verseNumber);
        }
    }

    private readSyllabic(lyricNode: IXmlElement): LyricSyllabic {
        const value: string = lyricNode.element("syllabic")?.value?.trim().toLowerCase();
        switch (value) {
            case LyricSyllabic.Begin:
                return LyricSyllabic.Begin;
            case LyricSyllabic.Middle:
                return LyricSyllabic.Middle;
            case LyricSyllabic.End:
                return LyricSyllabic.End;
            default:
                return LyricSyllabic.Single;
        }
    }

    private readExtendType(lyricNode: IXmlElement): LyricExtendType {
        const extendNode: IXmlElement = lyricNode.element("extend");
        if (!extendNode) {
            return LyricExtendType.None;
        }
        const value: string = extendNode.attribute("type")?.value?.trim().toLowerCase();
        switch (value) {
            case LyricExtendType.Continue:
                return LyricExtendType.Continue;
            case LyricExtendType.Stop:
                return LyricExtendType.Stop;
            default:
                // MusicXML 3.x commonly emits a bare <extend/>. It begins an
                // extender just like MusicXML 4's explicit type="start".
                return LyricExtendType.Start;
        }
    }

    private readLyricVerseName(lyricNode: IXmlElement): string {
        if (lyricNode.attributes() === undefined || !lyricNode.attribute("name")) {
            return "";
        }
        return lyricNode.attribute("name").value.trim().toLowerCase();
    }

    private resolveLyricVerseIdentifier(lyricNode: IXmlElement, lyricVerseName: string): string {
        const lyricNumberAttribute: string = lyricNode.attribute("number")?.value?.trim() || "";
        if (lyricVerseName && !lyricNumberAttribute) {
            return lyricVerseName;
        }
        if (!lyricVerseName || lyricVerseName === "verse" || !lyricNumberAttribute) {
            return lyricNumberAttribute || "1";
        }
        if (lyricNumberAttribute.toLowerCase() === lyricVerseName) {
            return lyricNumberAttribute;
        }
        return `${lyricVerseName}:${lyricNumberAttribute}`;
    }
}
