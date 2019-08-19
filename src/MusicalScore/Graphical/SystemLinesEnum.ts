export enum SystemLinesEnum {
    SingleThin = 0,       /*SINGLE,       [bar-style=regular]*/
    DoubleThin = 1,       /*DOUBLE,       [bar-style=light-light]*/
    ThinBold = 2,         /*END,          [bar-style=light-heavy]*/
    BoldThinDots = 3,     /*REPEAT_BEGIN, repeat[direction=forward]*/
    DotsThinBold = 4,     /*REPEAT_END,   repeat[direction=backward]*/
    DotsBoldBoldDots = 5, /*REPEAT_BOTH*/
    None = 6,             /*              [bar-style=none]*/
    Dotted = 7,           /*              [bar-style=dotted]*/
    Dashed = 8,           /*              [bar-style=dashed]*/
    Bold = 9,             /*              [bar-style=heavy]*/
    BoldThin = 10,        /*              [bar-style=heavy-light]*/
    DoubleBold = 11,      /*              [bar-style=heavy-heavy]*/
    Tick = 12,            /*              [bar-style=tick]*/
    Short = 13            /*              [bar-style=short]*/
}
