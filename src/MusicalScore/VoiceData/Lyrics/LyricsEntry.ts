import {LyricWord} from "./LyricsWord";
import {VoiceEntry} from "../VoiceEntry";
import { FontStyles } from "../../../Common/Enums/FontStyles";

/** MusicXML's syllabic position for one lyric entry. */
export enum LyricSyllabic {
    Single = "single",
    Begin = "begin",
    Middle = "middle",
    End = "end",
}

/** MusicXML's typed lyric extender state. */
export enum LyricExtendType {
    None = "none",
    Start = "start",
    Continue = "continue",
    Stop = "stop",
}

/** Horizontal anchoring used by the graphical lyric body. */
export enum LyricAlignmentMode {
    Center = "center",
    MelismaLeft = "melisma-left",
}

export class LyricsEntry {
    constructor(
        text: string,
        verseNumber: string,
        word: LyricWord,
        parent: VoiceEntry,
        syllableNumber: number = -1,
        verseName?: string,
        syllabic: LyricSyllabic = LyricSyllabic.Single,
        extendType: LyricExtendType = LyricExtendType.None,
    ) {
        this.setTextAndStanzaPrefix(text);
        this.word = word;
        this.parent = parent;
        this.verseNumber = verseNumber;
        this.verseName = verseName?.trim().toLowerCase() || "";
        this.syllabic = syllabic;
        this.extendType = extendType;
        if (syllableNumber >= 0) {
            this.syllableIndex = syllableNumber;
        }
    }
    private text: string;
    private lyricText: string;
    private stanzaNumberPrefix: string;
    private word: LyricWord;
    private parent: VoiceEntry;
    private verseNumber: string;
    private verseName: string;
    private syllableIndex: number;
    private syllabic: LyricSyllabic;
    private extendType: LyricExtendType;
    private inferredMelisma: boolean = false;

    public get Text(): string {
        return this.text;
    }
    public set Text(value: string) {
        this.setTextAndStanzaPrefix(value);
    }
    /** The singable text, excluding a literal leading stanza number such as `1. `. */
    public get LyricText(): string {
        return this.lyricText;
    }
    /** A literal leading stanza number, including its original following whitespace. */
    public get StanzaNumberPrefix(): string {
        return this.stanzaNumberPrefix;
    }
    public get Word(): LyricWord {
        return this.word;
    }
    public get Parent(): VoiceEntry {
        return this.parent;
    }
    public set Parent(value: VoiceEntry) {
        this.parent = value;
    }

    public get VerseNumber(): string {
        return this.verseNumber;
    }

    public get SyllableIndex(): number {
        return this.syllableIndex;
    }

    public get VerseName(): string {
        return this.verseName;
    }

    public get Syllabic(): LyricSyllabic {
        return this.syllabic;
    }

    public get ExtendType(): LyricExtendType {
        return this.extendType;
    }

    public set ExtendType(value: LyricExtendType) {
        this.extendType = value;
    }

    /**
     * Compatibility surface for callers that predate typed MusicXML extenders.
     * A stop closes an existing extender but does not begin another segment.
     */
    public get extend(): boolean {
        return this.extendType === LyricExtendType.Start || this.extendType === LyricExtendType.Continue;
    }

    public set extend(value: boolean) {
        this.extendType = value ? LyricExtendType.Start : LyricExtendType.None;
    }

    public get IsMelismatic(): boolean {
        return this.extendType === LyricExtendType.Start || this.inferredMelisma;
    }

    public get AlignmentMode(): LyricAlignmentMode {
        return this.IsMelismatic ? LyricAlignmentMode.MelismaLeft : LyricAlignmentMode.Center;
    }

    public markAsInferredMelisma(): void {
        this.inferredMelisma = true;
    }

    public get IsTranslation(): boolean {
        return this.VerseName.endsWith("translation") || this.VerseNumber.endsWith("translation");
    }

    public get IsChorus(): boolean {
        return this.VerseName === "chorus" || this.VerseNumber.startsWith("chorus");
    }

    public get FontStyle(): FontStyles {
        return this.IsChorus || this.IsTranslation ? FontStyles.Italic : FontStyles.Regular;
    }

    private setTextAndStanzaPrefix(value: string): void {
        this.text = value ?? "";
        const stanzaMatch: RegExpMatchArray = this.text.match(/^(\d+[.)][\s\u00a0]+)(\S.*)$/u);
        this.stanzaNumberPrefix = stanzaMatch?.[1] ?? "";
        this.lyricText = stanzaMatch?.[2] ?? this.text;
    }
}
