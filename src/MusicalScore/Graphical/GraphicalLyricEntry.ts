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
    private rules: EngravingRules;

    constructor(lyricsEntry: LyricsEntry, graphicalStaffEntry: GraphicalStaffEntry, lyricsHeight: number, staffHeight: number) {
        this.lyricsEntry = lyricsEntry;
        this.graphicalStaffEntry = graphicalStaffEntry;
        this.rules = this.graphicalStaffEntry.parentMeasure.parentSourceMeasure.Rules;
        const rules: EngravingRules = this.rules;
        const lyricsTextAlignment: TextAlignmentEnum = rules.LyricsAlignmentStandard;
        const label: Label = new Label(lyricsEntry.Text);
        label.fontStyle = lyricsEntry.FontStyle;
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

    /**
     * Stable identity for the lyric line this entry belongs to.
     *
     * A positional array index is not stable when a timestamp omits one or more
     * verses, and a chorus may share a numeric MusicXML verse identifier with a
     * regular verse. Keep both concerns explicit in the key.
     */
    public getLineIdentity(): string {
        const kind: string = this.lyricsEntry.IsChorus
            ? "chorus"
            : this.lyricsEntry.IsTranslation
                ? "translation"
                : "verse";
        return `${kind}:${this.lyricsEntry.VerseNumber || "1"}`;
    }

    /** Measure a rendered lyric dash using this entry's actual lyric font. */
    public getDashWidth(): number {
        const sourceLabel: Label = this.graphicalLabel.Label;
        const dashLabel: Label = new Label(
            "-",
            TextAlignmentEnum.CenterBottom,
            sourceLabel.font,
        );
        dashLabel.fontFamily = sourceLabel.fontFamily;
        dashLabel.fontStyle = sourceLabel.fontStyle;
        dashLabel.colorDefault = sourceLabel.colorDefault;
        const dash: GraphicalLabel = new GraphicalLabel(
            dashLabel,
            sourceLabel.fontHeight,
            TextAlignmentEnum.CenterBottom,
            this.rules,
        );
        dash.setLabelPositionAndShapeBorders();
        return Math.max(0, dash.PositionAndShape.Size.width);
    }
}
