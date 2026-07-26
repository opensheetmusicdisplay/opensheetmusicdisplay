import {LyricsEntry} from "../VoiceData/Lyrics/LyricsEntry";
import {GraphicalLyricWord} from "./GraphicalLyricWord";
import {GraphicalLabel} from "./GraphicalLabel";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {Label} from "../Label";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {TextAlignmentEnum} from "../../Common/Enums/TextAlignment";
import { EngravingRules } from "./EngravingRules";
import { BoundingBox } from "./BoundingBox";

export interface LyricFootprint {
    anchorX: number;
    labelWidth: number;
    leftEdgeX: number;
    leftExtent: number;
    rightEdgeX: number;
    rightExtent: number;
}

/**
 * The graphical counterpart of a [[LyricsEntry]]
 */
export class GraphicalLyricEntry {
    private lyricsEntry: LyricsEntry;
    private graphicalLyricWord: GraphicalLyricWord;
    private graphicalLabel: GraphicalLabel;
    private graphicalStaffEntry: GraphicalStaffEntry;

    constructor(lyricsEntry: LyricsEntry, graphicalStaffEntry: GraphicalStaffEntry, lyricsHeight: number, staffHeight: number) {
        this.lyricsEntry = lyricsEntry;
        this.graphicalStaffEntry = graphicalStaffEntry;
        const rules: EngravingRules = this.graphicalStaffEntry.parentMeasure.parentSourceMeasure.Rules;
        const lyricsTextAlignment: TextAlignmentEnum = rules.LyricsAlignmentStandard;
        const label: Label = new Label(lyricsEntry.Text);
        this.graphicalLabel = new GraphicalLabel(
            label,
            lyricsHeight,
            lyricsTextAlignment,
            rules,
            graphicalStaffEntry.PositionAndShape,
        );
        this.graphicalLabel.Label.colorDefault = rules.DefaultColorLyrics; // if undefined, no change. saves an if check
        this.graphicalLabel.PositionAndShape.RelativePosition = new PointF2D(0, staffHeight);
        if (lyricsTextAlignment === TextAlignmentEnum.CenterBottom) {
            this.graphicalLabel.SvgTextAnchor = "middle";
        }
        this.graphicalLabel.setLabelPositionAndShapeBorders(); // needed to have Size.width
    }

    public hasDashFromLyricWord(): boolean {
        if (!this.ParentLyricWord) {
            return false;
        }
        const lyricWordIndex: number = this.ParentLyricWord.GraphicalLyricsEntries.indexOf(this);
        return this.ParentLyricWord.GraphicalLyricsEntries.length > 1 && lyricWordIndex < this.ParentLyricWord.GraphicalLyricsEntries.length - 1;
    }

    public get LyricsEntry(): LyricsEntry {
        return this.lyricsEntry;
    }
    public get ParentLyricWord(): GraphicalLyricWord {
        return this.graphicalLyricWord;
    }
    public set ParentLyricWord(value: GraphicalLyricWord) {
        this.graphicalLyricWord = value;
    }
    public get GraphicalLabel(): GraphicalLabel {
        return this.graphicalLabel;
    }
    public set GraphicalLabel(value: GraphicalLabel) {
        this.graphicalLabel = value;
    }
    public get StaffEntryParent(): GraphicalStaffEntry {
        return this.graphicalStaffEntry;
    }
    public set StaffEntryParent(value: GraphicalStaffEntry) {
        this.graphicalStaffEntry = value;
    }

    public getAnchorX(staffEntryXPosition: number = 0): number {
        return staffEntryXPosition + this.graphicalLabel.PositionAndShape.RelativePosition.x;
    }

    public getFootprint(staffEntryXPosition: number = 0): LyricFootprint {
        const anchorX: number = this.getAnchorX(staffEntryXPosition);
        const boundingBox: BoundingBox = this.graphicalLabel.PositionAndShape;
        const leftEdgeX: number = anchorX + boundingBox.BorderLeft;
        const rightEdgeX: number = anchorX + boundingBox.BorderRight;
        return {
            anchorX,
            labelWidth: boundingBox.Size.width,
            leftEdgeX,
            leftExtent: anchorX - leftEdgeX,
            rightEdgeX,
            rightExtent: rightEdgeX - anchorX,
        };
    }
}
