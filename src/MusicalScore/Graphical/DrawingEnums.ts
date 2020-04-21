// import * as Collections from "typescript-collections";
import Collections = require("typescript-collections");

/**
 * The supported styles to draw a rectangle on the music sheet
 */
export enum OutlineAndFillStyleEnum {
    BaseWritingColor,
    FollowingCursor,
    AlternativeFollowingCursor,
    PlaybackCursor,
    Highlighted,
    ErrorUnderlay,
    Selected,
    SelectionSymbol,
    DebugColor1,
    DebugColor2,
    DebugColor3,
    SplitScreenDivision,
    GreyTransparentOverlay,
    MarkedArea1,
    MarkedArea2,
    MarkedArea3,
    MarkedArea4,
    MarkedArea5,
    MarkedArea6,
    MarkedArea7,
    MarkedArea8,
    MarkedArea9,
    MarkedArea10,
    Comment1,
    Comment2,
    Comment3,
    Comment4,
    Comment5,
    Comment6,
    Comment7,
    Comment8,
    Comment9,
    Comment10
}

// tslint:disable-next-line:max-line-length A linebreak would be more confusing here
export const OUTLINE_AND_FILL_STYLE_DICT: Collections.Dictionary<OutlineAndFillStyleEnum, string> =
    new Collections.Dictionary<OutlineAndFillStyleEnum, string>();
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.BaseWritingColor, "Thistle");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.FollowingCursor, "Aqua");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.AlternativeFollowingCursor, "Azure");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.PlaybackCursor, "Bisque");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.Highlighted, "CadetBlue");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.ErrorUnderlay, "DarkBlue");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.Selected, "DarkGoldenRod");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.SelectionSymbol, "BlanchedAlmond");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.DebugColor1, "Chartreuse");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.DebugColor2, "DarkGreen");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.DebugColor3, "DarkOrange");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.SplitScreenDivision, "FireBrick");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.GreyTransparentOverlay, "DarkSalmon");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.MarkedArea1, "DarkSeaGreen");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.MarkedArea2, "DarkOrchid");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.MarkedArea3, "Aquamarine");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.MarkedArea4, "DarkKhaki");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.MarkedArea5, "ForestGreen");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.MarkedArea6, "AliceBlue");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.MarkedArea7, "DeepPink");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.MarkedArea8, "Coral");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.MarkedArea9, "DarkOliveGreen");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.MarkedArea10, "Chocolate");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.Comment1, "DodgerBlue");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.Comment2, "Blue");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.Comment3, "Beige");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.Comment4, "Crimson");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.Comment5, "Fuchsia");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.Comment6, "Brown");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.Comment7, "BlanchedAlmond");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.Comment8, "CornflowerBlue");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.Comment9, "Cornsilk");
OUTLINE_AND_FILL_STYLE_DICT.setValue(OutlineAndFillStyleEnum.Comment10, "DarkGrey");

export enum StyleSets {
    MarkedArea,
    Comment
}

/**
 * The layers which one can draw on (not supported)
 */
export enum GraphicalLayers {
    Background,
    Highlight,
    MeasureError,
    SelectionSymbol,
    Cursor,
    PSI_Debug,
    Notes,
    Comment,
    Debug_above
}

export enum NoteState {
    Normal,
    Selected,
    Follow_Confirmed,
    QFeedback_NotFound,
    QFeedback_OK,
    QFeedback_Perfect,
    Debug1,
    Debug2,
    Debug3
}

export enum AutoColorSet {
    /* different (boomwhacker-like) color set*/
    C = "#d82c6b",
    D = "#F89D15",
    E = "#FFE21A",
    F = "#4dbd5c",
    G = "#009D96",
    A = "#43469d",
    B = "#76429c",
    Rest = "#000000"

    // color set from MuseScore Color notehead plugin version 1.1 by Werner Schweer and others
    /*C = "#eeee00",
    D = "#9b30ff",
    E = "#ee9a00",
    F = "#8b4513",
    G = "#ff0000",
    A = "#1e90ff",
    B = "#00ff00"*/
}
