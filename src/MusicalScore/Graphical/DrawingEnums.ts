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

export enum StyleSets {
    MarkedArea,
    Comment
}

/**
 * The layers which one can draw on (not suppoerted)
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
