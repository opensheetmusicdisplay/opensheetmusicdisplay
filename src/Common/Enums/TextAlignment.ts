/**
 * The Alignment of a TextLabel.
 * Specifically the label's position coordinates within the Bounding Box.
 * For LeftBottom, the label's position is at the left bottom corner of its Bounding Box.
 * (used for example with title, composer, author, etc.)
 * (see Show Bounding Box For -> Labels in the local demo)
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
/*
 * TODO this could be split into two alignments, e.g. <Left, Top> for LeftTop.
 * A function like IsLeft would be easier with the split.
 * On the other hand, accessing these values will be more complex
*/

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
