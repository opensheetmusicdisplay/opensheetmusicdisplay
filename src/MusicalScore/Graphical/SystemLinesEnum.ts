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

export class SystemLinesEnumHelper {
    public static xmlBarlineStyleToSystemLinesEnum(xmlValue: string): SystemLinesEnum {
        if (xmlValue === "regular") {
            return SystemLinesEnum.SingleThin;
        } else if (xmlValue === "dotted") {
            return SystemLinesEnum.Dotted;
        } else if (xmlValue === "dashed") {
            return SystemLinesEnum.Dashed;
        } else if (xmlValue === "heavy") {
            return SystemLinesEnum.Bold;
        } else if (xmlValue === "light-light") {
            return SystemLinesEnum.DoubleThin;
        } else if (xmlValue === "light-heavy") {
            return SystemLinesEnum.ThinBold;
        } else if (xmlValue === "heavy-light") {
            return SystemLinesEnum.BoldThin;
        } else if (xmlValue === "heavy-heavy") {
            return SystemLinesEnum.DoubleBold;
        } else if (xmlValue === "tick") {
            return SystemLinesEnum.Tick;
        } else if (xmlValue === "short") {
            return SystemLinesEnum.Short;
        } else if (xmlValue === "none") {
            return SystemLinesEnum.None;
        }
        return SystemLinesEnum.SingleThin;
    }
}
