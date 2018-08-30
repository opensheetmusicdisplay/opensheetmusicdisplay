/**
 * The possible positioning of text on the sheet music
 * (used for example with title, composer, author, etc.)
 * TODO this should be split into alignment and placement, e.g. <Left, Top> for LeftTop.
 * Right now "LeftTop" means left-aligned and top-placed. This is ambiguous for center,
 * which can be alignment or placement.
 * A function like "IsLeft" would be easier with the split.
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

    public static IsCenterAligned(textAlignment: TextAlignmentEnum): boolean {
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
