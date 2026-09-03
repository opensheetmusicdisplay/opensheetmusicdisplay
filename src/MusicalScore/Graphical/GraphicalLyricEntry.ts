import {
    LyricAlignmentMode,
    LyricsEntry,
} from "../VoiceData/Lyrics/LyricsEntry";
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
 * A lyric label whose optional stanza prefix hangs to the left of the
 * independently anchored lyric body.
 */
class GraphicalLyricLabel extends GraphicalLabel {
    private bodyLeftOffset: number = 0;
    private bodyRightOffset: number = 0;
    private readonly stanzaNumberPrefix: string;

    constructor(
        label: Label,
        textHeight: number,
        alignment: TextAlignmentEnum,
        rules: EngravingRules,
        parent: BoundingBox,
        stanzaNumberPrefix: string,
    ) {
        super(label, textHeight, alignment, rules, parent);
        this.stanzaNumberPrefix = stanzaNumberPrefix;
    }

    public setLabelPositionAndShapeBorders(): void {
        super.setLabelPositionAndShapeBorders();
        const boundingBox: BoundingBox = this.PositionAndShape;
        if (!this.stanzaNumberPrefix || !this.TextLines?.[0]?.runs?.length) {
            this.bodyLeftOffset = boundingBox.BorderLeft;
            this.bodyRightOffset = boundingBox.BorderRight;
            return;
        }

        const prefixWidth: number = this.TextLines[0].runs[0]?.width ?? 0;
        const bodyWidth: number = this.TextLines[0].runs
            .slice(1)
            .reduce((width: number, run): number => width + run.width, 0);
        switch (this.Label.textAlignment) {
            case TextAlignmentEnum.LeftBottom:
            case TextAlignmentEnum.LeftCenter:
            case TextAlignmentEnum.LeftTop:
                this.bodyLeftOffset = 0;
                break;
            case TextAlignmentEnum.RightBottom:
            case TextAlignmentEnum.RightCenter:
            case TextAlignmentEnum.RightTop:
                this.bodyLeftOffset = -bodyWidth;
                break;
            default:
                this.bodyLeftOffset = -bodyWidth / 2;
                break;
        }
        this.bodyRightOffset = this.bodyLeftOffset + bodyWidth;
        const labelLeftOffset: number = this.bodyLeftOffset - prefixWidth;
        this.TextLines[0].xOffset = labelLeftOffset;

        const leftMargin: number = boundingBox.BorderLeft - boundingBox.BorderMarginLeft;
        const rightMargin: number = boundingBox.BorderMarginRight - boundingBox.BorderRight;
        boundingBox.BorderLeft = labelLeftOffset;
        boundingBox.BorderRight = this.bodyRightOffset;
        boundingBox.BorderMarginLeft = labelLeftOffset - leftMargin;
        boundingBox.BorderMarginRight = this.bodyRightOffset + rightMargin;
    }

    public get BodyLeftOffset(): number {
        return this.bodyLeftOffset;
    }

    public get BodyRightOffset(): number {
        return this.bodyRightOffset;
    }
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
        const lyricsTextAlignment: TextAlignmentEnum =
            lyricsEntry.AlignmentMode === LyricAlignmentMode.MelismaLeft
                ? TextAlignmentEnum.LeftBottom
                : rules.LyricsAlignmentStandard;
        const label: Label = new Label(lyricsEntry.Text);
        label.fontStyle = lyricsEntry.FontStyle;
        if (lyricsEntry.StanzaNumberPrefix) {
            label.textLines = [{
                runs: [
                    { text: lyricsEntry.StanzaNumberPrefix },
                    { text: lyricsEntry.LyricText },
                ],
            }];
        }
        this.graphicalLabel = new GraphicalLyricLabel(
            label,
            lyricsHeight,
            lyricsTextAlignment,
            rules,
            graphicalStaffEntry.PositionAndShape,
            lyricsEntry.StanzaNumberPrefix,
        );
        this.graphicalLabel.Label.colorDefault = rules.DefaultColorLyrics; // if undefined, no change. saves an if check
        this.graphicalLabel.PositionAndShape.RelativePosition = new PointF2D(0, staffHeight);
        // Multi-run stanza labels use the anchor offset to cancel drawLabel's
        // full-label alignment before applying their body-relative xOffset.
        // The SVG text-anchor itself is only attached to single-run labels.
        if (lyricsTextAlignment === TextAlignmentEnum.CenterBottom) {
            this.graphicalLabel.SvgTextAnchor = "middle";
        } else if (lyricsTextAlignment === TextAlignmentEnum.LeftBottom) {
            this.graphicalLabel.SvgTextAnchor = "start";
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

    /** The lyric body's footprint, excluding a hanging literal stanza prefix. */
    public getBodyFootprint(staffEntryXPosition: number = 0): LyricFootprint {
        const anchorX: number = this.getAnchorX(staffEntryXPosition);
        const lyricLabel: GraphicalLyricLabel = this.graphicalLabel as GraphicalLyricLabel;
        const leftEdgeX: number = anchorX + lyricLabel.BodyLeftOffset;
        const rightEdgeX: number = anchorX + lyricLabel.BodyRightOffset;
        return {
            anchorX,
            labelWidth: rightEdgeX - leftEdgeX,
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
