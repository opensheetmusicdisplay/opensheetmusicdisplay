/**
 * The possible positioning of text on the sheet music
 * (used for example with title, composer, author, etc.)
 * TODO this should be split into alignment and placement, e.g. <Left, Top> for LeftTop.
 * Right now "LeftTop" means left-aligned and top-placed. This is ambiguous for center,
 * which can be alignment or placement.
 * A function like "IsLeft" would be easier with the split.
 */
export enum TextAlignmentAndPlacement {
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
    public static IsLeft(textAlignment: TextAlignmentAndPlacement): boolean {
        return textAlignment === TextAlignmentAndPlacement.LeftTop
            || textAlignment === TextAlignmentAndPlacement.LeftCenter
            || textAlignment === TextAlignmentAndPlacement.LeftBottom;
    }

    public static IsCenterAligned(textAlignment: TextAlignmentAndPlacement): boolean {
        return textAlignment === TextAlignmentAndPlacement.CenterTop
            || textAlignment === TextAlignmentAndPlacement.CenterCenter
            || textAlignment === TextAlignmentAndPlacement.CenterBottom;
    }

    public static IsRight(textAlignment: TextAlignmentAndPlacement): boolean {
        return textAlignment === TextAlignmentAndPlacement.RightTop
            || textAlignment === TextAlignmentAndPlacement.RightCenter
            || textAlignment === TextAlignmentAndPlacement.RightBottom;
    }
}
