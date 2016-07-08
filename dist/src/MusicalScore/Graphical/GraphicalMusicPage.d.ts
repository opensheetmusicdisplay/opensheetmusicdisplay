import { GraphicalObject } from "./GraphicalObject";
import { GraphicalLabel } from "./GraphicalLabel";
import { MusicSystem } from "./MusicSystem";
import { EngravingRules } from "./EngravingRules";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { GraphicalMusicSheet } from "./GraphicalMusicSheet";
export declare class GraphicalMusicPage extends GraphicalObject {
    private musicSystems;
    private labels;
    private parent;
    constructor(parent: GraphicalMusicSheet);
    MusicSystems: MusicSystem[];
    Labels: GraphicalLabel[];
    Parent: GraphicalMusicSheet;
    setMusicPageAbsolutePosition(pageIndex: number, rules: EngravingRules): PointF2D;
}
export declare enum PagePlacementEnum {
    Down = 0,
    Right = 1,
    RightDown = 2,
}
