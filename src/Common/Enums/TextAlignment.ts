/**
 * The possible positioning of text on the sheet music
 * (used for example with title, composer, author, etc.)
 */
export enum TextAlignmentEnum {
    LeftTop,
    LeftCenter,
    LeftBottom,
    CenterTop,
    CenterCenter,
    CenterBottom,
    RightTop,
    RightCenter,
    RightBottom
}

export class TextAlignment {
    public static IsLeft(textAlignment: TextAlignmentEnum): boolean {
        return textAlignment === TextAlignmentEnum.LeftTop
            || textAlignment === TextAlignmentEnum.LeftCenter
            || textAlignment === TextAlignmentEnum.LeftBottom;
    }

    public static IsCenter(textAlignment: TextAlignmentEnum): boolean {
        return textAlignment === TextAlignmentEnum.CenterTop
            || textAlignment === TextAlignmentEnum.CenterCenter
            || textAlignment === TextAlignmentEnum.CenterBottom;
    }

    public static IsRight(textAlignment: TextAlignmentEnum): boolean {
        return textAlignment === TextAlignmentEnum.RightTop
            || textAlignment === TextAlignmentEnum.RightCenter
            || textAlignment === TextAlignmentEnum.RightBottom;
    }
}
