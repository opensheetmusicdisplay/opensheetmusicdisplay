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
    /** The relative position of the label before the first layout calculation, see resetPosition(). */
    private initialLabelRelativePosition: PointF2D;

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
        label.language = lyricsEntry.language;
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

    /**
     * Puts the label back where it was before the first layout calculation, called before each calculation.
     * MusicSheetCalculator.calculateSingleStaffLineLyricsPosition() moves the label below the staffline, but the bounding box
     * of the staff entry is calculated from its children (including the label) before that, e.g. in
     * VexFlowStaffEntry.calculateXPosition(). Without the reset, a re-render would include the previous render's position of
     * the label there, where the first render included the initial one - e.g. after a resize, a staff entry whose lyrics were
     * lower in the previous layout kept that lower bottom border, making the page taller.
     * The first call takes the snapshot of the initial position.
     */
    public resetPosition(): void {
        const relativePosition: PointF2D = this.graphicalLabel.PositionAndShape.RelativePosition;
        if (!this.initialLabelRelativePosition) {
            this.initialLabelRelativePosition = new PointF2D(relativePosition.x, relativePosition.y);
            return;
        }
        relativePosition.x = this.initialLabelRelativePosition.x;
        relativePosition.y = this.initialLabelRelativePosition.y;
    }

    /**
     * How far the label reaches below the line of its verse: a lyric with line breaks has its first line there, and its
     * further lines below. 0 for a single line. The label is placed by its bottom (below the last line).
     */
    public get HeightBelowVerseLine(): number {
        const furtherLines: number = (this.graphicalLabel.TextLines?.length ?? 1) - 1;
        return furtherLines * this.graphicalLabel.Label.fontHeight;
    }

    /** The y of the line of the lyric's verse relative to the staff line, where the lyric's first line, its dashes and extend line are. */
    public get VerseLineY(): number {
        return this.graphicalLabel.PositionAndShape.RelativePosition.y - this.HeightBelowVerseLine;
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
