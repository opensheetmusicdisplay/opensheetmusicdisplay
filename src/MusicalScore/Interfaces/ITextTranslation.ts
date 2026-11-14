export class ITextTranslation {
    /** Returns the text of a message of the reader, e.g. of an error in the MusicXML. The tag names the message
     *  (e.g. "ReaderErrorMessages/TieError"), for a translation of the messages, which OSMD doesn't have: returns the given text.
     */
    public static translateText(tag: string, text: string): string {
        return text;
    }
}
