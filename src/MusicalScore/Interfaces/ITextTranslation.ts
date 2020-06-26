export class ITextTranslation {
    public static defaultTextTranslation: ITextTranslation;

    public static translateText(tag: string, text: string): string {
        if (!this.defaultTextTranslation) {
            return text;
        }

        //return this.DefaultTextTranslation.translate(tag, text);
    }

    //declare public translate(tag: string, text: string): string;
}
