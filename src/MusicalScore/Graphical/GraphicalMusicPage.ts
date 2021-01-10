import {BoundingBox} from "./BoundingBox";
import {GraphicalObject} from "./GraphicalObject";
import {GraphicalLabel} from "./GraphicalLabel";
import {MusicSystem} from "./MusicSystem";
import {EngravingRules} from "./EngravingRules";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {GraphicalMusicSheet} from "./GraphicalMusicSheet";

export class GraphicalMusicPage extends GraphicalObject {
    private musicSystems: MusicSystem[] = [];
    private labels: GraphicalLabel[] = [];
    private parent: GraphicalMusicSheet;
    private pageNumber: number;

    constructor(parent: GraphicalMusicSheet) {
        super();
        this.parent = parent;
        this.boundingBox = new BoundingBox(this, undefined);
    }

    public get MusicSystems(): MusicSystem[] {
        return this.musicSystems;
    }

    public set MusicSystems(value: MusicSystem[]) {
        this.musicSystems = value;
    }

    public get Labels(): GraphicalLabel[] {
        return this.labels;
    }

    public set Labels(value: GraphicalLabel[]) {
        this.labels = value;
    }

    public get Parent(): GraphicalMusicSheet {
        return this.parent;
    }

    public set Parent(value: GraphicalMusicSheet) {
        this.parent = value;
    }

    public get PageNumber(): number {
        return this.pageNumber;
    }

    public set PageNumber(value: number) {
        this.pageNumber = value;
    }

    /**
     * This method calculates the absolute Position of each GraphicalMusicPage according to a given placement
     * @param pageIndex
     * @param rules
     * @returns {PointF2D}
     */
    public setMusicPageAbsolutePosition(pageIndex: number, rules: EngravingRules): PointF2D {
        return new PointF2D(0.0, 0.0);

        // use this code if pages are rendered on only one canvas:
        // if (rules.PagePlacement === PagePlacementEnum.Down) {
        //     return new PointF2D(0.0, pageIndex * rules.PageHeight);
        // } else if (rules.PagePlacement === PagePlacementEnum.Right) {
        //     return new PointF2D(pageIndex * this.parent.ParentMusicSheet.pageWidth, 0.0);
        // } else {
        //     // placement RightDown
        //     if (pageIndex % 2 === 0) {
        //         if (pageIndex === 0) {
        //             return new PointF2D(0.0, pageIndex * rules.PageHeight);
        //         } else {
        //             return new PointF2D(0.0, (pageIndex - 1) * rules.PageHeight);
        //         }
        //     } else {
        //         if (pageIndex === 1) {
        //             return new PointF2D(this.parent.ParentMusicSheet.pageWidth, (pageIndex - 1) * rules.PageHeight);
        //         } else {
        //             return new PointF2D(this.parent.ParentMusicSheet.pageWidth, (pageIndex - 2) * rules.PageHeight);
        //         }
        //     }
        // }
    }
}

export enum PagePlacementEnum {
    Down,
    Right,
    RightDown
}
