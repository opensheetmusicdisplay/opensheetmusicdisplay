import { PlacementEnum } from "./Expressions/AbstractExpression";
import { Note } from "./Note";

/**
 * MusicXML `<arrow-direction>` values, in Unicode arrow terminology.
 * The paired values point both ways (a shaft with a head at each end).
 */
export enum ArrowDirection {
    Up = "up",
    Down = "down",
    Left = "left",
    Right = "right",
    Northwest = "northwest",
    Northeast = "northeast",
    Southeast = "southeast",
    Southwest = "southwest",
    LeftRight = "left right",
    UpDown = "up down",
    NorthwestSoutheast = "northwest southeast",
    NortheastSouthwest = "northeast southwest",
}

/** MusicXML `<circular-arrow>` values. */
export enum CircularArrowDirection {
    Clockwise = "clockwise",
    Anticlockwise = "anticlockwise",
}

/**
 * An arrow technical indication (`<notations><technical><arrow>`).
 * Dorico writes a guitar down-strum this way: an unpitched x-notehead with
 * `<arrow placement="above"><arrow-direction>down</arrow-direction></arrow>`.
 * One of `direction` and `circular` is set, matching the MusicXML choice.
 */
export class TechnicalArrow {
    public direction: ArrowDirection;
    public circular: CircularArrowDirection;
    /** `placement` attribute. Above when the attribute is absent. */
    public placement: PlacementEnum = PlacementEnum.Above;
    public sourceNote: Note;
    /** `smufl` attribute. Kept for callers; drawing follows `direction` or `circular`. */
    public smufl: string;

    public static directionFromXml(value: string): ArrowDirection | undefined {
        if (!value) {
            return undefined;
        }
        const text: string = value.trim().toLowerCase();
        for (const direction of Object.keys(ArrowDirection) as (keyof typeof ArrowDirection)[]) {
            if (ArrowDirection[direction] === text) {
                return ArrowDirection[direction];
            }
        }
        return undefined;
    }

    public static circularFromXml(value: string): CircularArrowDirection | undefined {
        if (!value) {
            return undefined;
        }
        const text: string = value.trim().toLowerCase();
        if (text === CircularArrowDirection.Clockwise || text === CircularArrowDirection.Anticlockwise) {
            return text as CircularArrowDirection;
        }
        return undefined;
    }
}
