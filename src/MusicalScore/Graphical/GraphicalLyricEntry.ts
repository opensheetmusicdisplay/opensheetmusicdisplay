import {LyricsEntry} from "../VoiceData/Lyrics/LyricsEntry";
import {GraphicalLyricWord} from "./GraphicalLyricWord";
import {GraphicalLabel} from "./GraphicalLabel";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {Label} from "../Label";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {TextAlignmentEnum} from "../../Common/Enums/TextAlignment";
import { EngravingRules } from "./EngravingRules";

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
        const lyricsTextAlignment: TextAlignmentEnum = graphicalStaffEntry.parentMeasure.parentSourceMeasure.Rules.LyricsAlignmentStandard;
        // for small notes with long text, use center alignment
        // TODO use this, fix center+left alignment combination spacing
        if (lyricsEntry.Text.length >= 4
            && lyricsEntry.Parent.Notes[0].Length.Denominator > 4
            && lyricsTextAlignment === TextAlignmentEnum.LeftBottom) {
            // lyricsTextAlignment = TextAlignmentAndPlacement.CenterBottom;
        }
        const label: Label = new Label(lyricsEntry.Text);
        const rules: EngravingRules = this.graphicalStaffEntry.parentMeasure.parentSourceMeasure.Rules;
        this.graphicalLabel = new GraphicalLabel(
            label,
            lyricsHeight,
            lyricsTextAlignment,
            rules,
            graphicalStaffEntry.PositionAndShape,
        );
        this.graphicalLabel.Label.colorDefault = rules.DefaultColorLyrics; // if undefined, no change. saves an if check
        this.graphicalLabel.PositionAndShape.RelativePosition = new PointF2D(0, staffHeight);
        this.graphicalLabel.setLabelPositionAndShapeBorders(); // needed to have Size.width
        if (this.graphicalLabel.PositionAndShape.Size.width < rules.LyricsExtraXShiftForShortLyricsWidthThreshold) {
            this.graphicalLabel.PositionAndShape.RelativePosition.x += rules.LyricsExtraXShiftForShortLyrics;
            this.graphicalLabel.CenteringXShift = rules.LyricsExtraXShiftForShortLyrics;
        }
        if (lyricsTextAlignment === TextAlignmentEnum.LeftBottom) {
            this.graphicalLabel.PositionAndShape.RelativePosition.x -= 1; // make lyrics optically left-aligned
        }
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
}
