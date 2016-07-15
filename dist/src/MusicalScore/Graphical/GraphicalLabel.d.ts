import { Label } from "../Label";
import { TextAlignment } from "../../Common/Enums/TextAlignment";
import { Clickable } from "./Clickable";
import { BoundingBox } from "./BoundingBox";
export declare class GraphicalLabel extends Clickable {
    private label;
    constructor(label: Label, textHeight: number, alignment: TextAlignment, parent?: BoundingBox);
    Label: Label;
    toString(): string;
    setLabelPositionAndShapeBorders(): void;
}
