export class ITextTranslation {
    public static DefaultTextTranslation: ITextTranslation;

    public static translateText(tag: string, text: string): string {
        if (this.DefaultTextTranslation == undefined) {
            return text;
        }

        //return this.DefaultTextTranslation.translate(tag, text);
    }

    //declare public translate(tag: string, text: string): string;
}