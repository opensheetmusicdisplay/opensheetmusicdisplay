import {BoundingBox} from "./BoundingBox";
module PhonicScore.MusicalScore.Graphical.SheetData {
    import GraphicalLabel = PhonicScore.MusicalScore.Graphical.Primitives.GraphicalLabel;
    import PointF_2D = PhonicScore.Common.DataObjects.PointF_2D;
    export class GraphicalMusicPage extends GraphicalObject {
        private musicSystems: List<MusicSystem> = new List<MusicSystem>();
        private labels: List<GraphicalLabel> = new List<GraphicalLabel>();
        private parent: GraphicalMusicSheet;
        constructor(parent: GraphicalMusicSheet) {
            this.parent = parent;
            this.boundingBox = new BoundingBox(null, this);
        }
        public get MusicSystems(): List<MusicSystem> {
            return this.musicSystems;
        }
        public set MusicSystems(value: List<MusicSystem>) {
            this.musicSystems = value;
        }
        public get Labels(): List<GraphicalLabel> {
            return this.labels;
        }
        public set Labels(value: List<GraphicalLabel>) {
            this.labels = value;
        }
        public get Parent(): GraphicalMusicSheet {
            return this.parent;
        }
        public set Parent(value: GraphicalMusicSheet) {
            this.parent = value;
        }
        public setMusicPageAbsolutePosition(pageIndex: number, rules: EngravingRules): PointF_2D {
            if (rules.PagePlacement == PagePlacementEnum.Down)
                return new PointF_2D(0.0f, pageIndex * rules.PageHeight);
            else if (rules.PagePlacement == PagePlacementEnum.Right)
                return new PointF_2D(pageIndex * this.parent.ParentMusicSheet.PageWidth, 0.0f);
            else {
                if (pageIndex % 2 == 0) {
                    if (pageIndex == 0)
                        return new PointF_2D(0.0f, pageIndex * rules.PageHeight);
                    else return new PointF_2D(0.0f, (pageIndex - 1) * rules.PageHeight);
                }
                else {
                    if (pageIndex == 1)
                        return new PointF_2D(this.parent.ParentMusicSheet.PageWidth, (pageIndex - 1) * rules.PageHeight);
                    else return new PointF_2D(this.parent.ParentMusicSheet.PageWidth, (pageIndex - 2) * rules.PageHeight);
                }
            }
        }
    }
    export enum PagePlacementEnum {
        Down,

        Right,

        RightDown
    }
}