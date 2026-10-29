import {LyricsEntry} from "../VoiceData/Lyrics/LyricsEntry";
import {GraphicalLyricWord} from "./GraphicalLyricWord";
import {GraphicalLabel} from "./GraphicalLabel";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {Label} from "../Label";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {TextAlignment, TextAlignmentEnum} from "../../Common/Enums/TextAlignment";
import { EngravingRules } from "./EngravingRules";
import { BoundingBox } from "./BoundingBox";
import { SourceStaffEntry } from "../VoiceData/SourceStaffEntry";
import { Staff } from "../VoiceData/Staff";
import { VoiceEntry } from "../VoiceData/VoiceEntry";

/**
 * The graphical counterpart of a [[LyricsEntry]]
 */
export class GraphicalLyricEntry {
    /** The verse numbers at the start of a lyric's text, with their punctuation and what else is before the first letter:
     * "1. " in "1. Si", "1.2." in "1.2.Si" (a lyric of verses 1 and 2). */
    private static readonly leadingNumber: RegExp = /^(?:\p{Nd}+\p{P}[^\p{Nd}\p{L}]*)+(?=\p{L})/u;
    private lyricsEntry: LyricsEntry;
    private graphicalLyricWord: GraphicalLyricWord;
    private graphicalLabel: GraphicalLabel;
    private graphicalStaffEntry: GraphicalStaffEntry;
    /** The relative position of the label before the first layout calculation, see resetPosition(). */
    private initialLabelRelativePosition: PointF2D;
    /** The width of the verse number at the start of the lyric's text, if it is to be left of the lyric, else 0.
     *  See measureLeadingNumber(). */
    private leadingNumberWidth: number = 0;
    /** Whether the verse number is left of the lyric now, see moveLeadingNumberLeftOfLyric(). */
    private leadingNumberMoved: boolean = false;
    /** Whether the verse number is left of the lyric before each layout calculation, as the lyric starts its verse in the staff.
     *  See resetPosition(). */
    private leadingNumberMovedInitially: boolean = false;

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
        this.leadingNumberWidth = this.measureLeadingNumber(rules);
        // the first lyric of a verse in the staff is known now, the first in a system when the systems are built,
        //   see moveLeadingNumberLeftOfLyricInStaffLine()
        this.leadingNumberMovedInitially = this.numbersStartTheirVerses(
            (entry: LyricsEntry): boolean => this.isFirstOfVerseInStaff(entry.VerseNumber));
        this.moveLeadingNumberLeftOfLyric(this.leadingNumberMovedInitially);
        if (this.graphicalLabel.PositionAndShape.Size.width < rules.LyricsExtraXShiftForShortLyricsWidthThreshold) {
            this.graphicalLabel.PositionAndShape.RelativePosition.x += rules.LyricsExtraXShiftForShortLyrics;
            this.graphicalLabel.CenteringXShift = rules.LyricsExtraXShiftForShortLyrics;
        }
        if (lyricsTextAlignment === TextAlignmentEnum.LeftBottom) {
            this.graphicalLabel.PositionAndShape.RelativePosition.x -= 1; // make lyrics optically left-aligned
        }
    }

    /**
     * The width of the verse number at the start of the lyric's text, e.g. "1. " in "1. Si", if the number is to be left of
     * the lyric (EngravingRules.LyricsVerseNumberLeftOfLyric, for left-aligned lyrics), else 0.
     * MusicXML has no element for such a number, it is part of the lyric's text.
     */
    private measureLeadingNumber(rules: EngravingRules): number {
        const label: Label = this.graphicalLabel.Label;
        if (!rules.LyricsVerseNumberLeftOfLyric || !TextAlignment.IsLeft(label.textAlignment)) {
            return 0;
        }
        const leadingNumber: string = GraphicalLyricEntry.leadingNumber.exec(this.graphicalLabel.TextLines?.[0].text ?? "")?.[0];
        if (!leadingNumber) {
            return 0;
        }
        return label.fontHeight *
            rules.TextMeasurer.computeTextWidthToHeightRatio(leadingNumber, label.font, label.fontStyle, label.fontFamily);
    }

    /**
     * Aligns a lyric that starts its verse and whose text starts with the verse number, e.g. "1. Si", like a lyric without one:
     * the number is left of where the lyric starts, instead of the lyric being right of that by the number.
     * The label's box is the lyric without the number, so it is spaced like a lyric without one: no lyrics of its verse are
     * before it. The box's left margin reaches to the number, which keeps the number clear of what is above it.
     * Only if the other lyrics with a verse number at the note start their verses too, see numbersStartTheirVerses().
     * @param moved true to move the number left of the lyric, false to put it back at the note, with the lyric right of it
     */
    private moveLeadingNumberLeftOfLyric(moved: boolean): void {
        if (this.leadingNumberWidth === 0 || moved === this.leadingNumberMoved) {
            return;
        }
        const shift: number = moved ? -this.leadingNumberWidth : this.leadingNumberWidth;
        const box: BoundingBox = this.graphicalLabel.PositionAndShape;
        // read the borders before setting them: BorderMarginRight returns at least BorderRight, so once BorderRight has moved
        //   right (putting the number back), the margin would be read as BorderRight and end up the number's width right of it
        const right: number = box.BorderRight;
        const marginRight: number = box.BorderMarginRight;
        const marginLeft: number = box.BorderMarginLeft;
        box.BorderRight = right + shift;
        box.BorderMarginRight = marginRight + shift;
        box.BorderMarginLeft = marginLeft + shift;
        for (const line of this.graphicalLabel.TextLines) {
            line.xOffset += shift;
        }
        this.leadingNumberMoved = moved;
    }

    /**
     * Moves the verse number left of the lyric if the lyric is the first of its verse in its staff line, e.g. at the start of
     * a system in a hymn that repeats the verse numbers in every system, like for the first lyric of the verse in the staff.
     * Called when the lyrics of a staff line are positioned: the systems are built after the lyrics are created and the
     * measures are spaced, so the space for the number after the note stays reserved. resetPosition() puts the number back
     * before the next layout calculation, which spaces the measures again.
     * @param isFirstOfVerseInStaffLine whether no lyric of the given lyric's verse is before it in the staff line
     */
    public moveLeadingNumberLeftOfLyricInStaffLine(isFirstOfVerseInStaffLine: (lyricsEntry: LyricsEntry) => boolean): void {
        this.moveLeadingNumberLeftOfLyric(this.numbersStartTheirVerses(isFirstOfVerseInStaffLine));
    }

    /**
     * Whether each lyric with a verse number at this lyric's note, in any voice of its staff, is the first lyric of its verse,
     * in the staff or in the staff line. The numbers of a note are moved together, so that its lyrics stay aligned, e.g. where
     * verse 1 sang the measures before ("1.2. When I was young") and goes on with "1. Sea" while verse 2 starts with "2. Sea".
     * @param isFirstOfVerse whether the given lyric is the first of its verse
     */
    private numbersStartTheirVerses(isFirstOfVerse: (lyricsEntry: LyricsEntry) => boolean): boolean {
        for (const voiceEntry of this.lyricsEntry.Parent.ParentSourceStaffEntry.VoiceEntries) {
            for (const lyricsEntry of voiceEntry.LyricsEntries.values()) {
                if (GraphicalLyricEntry.leadingNumber.test(lyricsEntry.Text.trim()) && !isFirstOfVerse(lyricsEntry)) {
                    return false;
                }
            }
        }
        return true;
    }

    /** Whether no lyric of the given verse is before this lyric in its staff. */
    private isFirstOfVerseInStaff(verseNumber: string): boolean {
        const staffEntry: SourceStaffEntry = this.lyricsEntry.Parent.ParentSourceStaffEntry;
        const staff: Staff = staffEntry.ParentStaff;
        for (const measure of staff.ParentInstrument.GetMusicSheet.SourceMeasures) {
            for (const container of measure.VerticalSourceStaffEntryContainers) {
                const earlier: SourceStaffEntry = container.StaffEntries[staff.idInMusicSheet];
                if (earlier?.AbsoluteTimestamp.lt(staffEntry.AbsoluteTimestamp) && earlier.VoiceEntries.some(
                    (voiceEntry: VoiceEntry) => voiceEntry.LyricsEntries.containsKey(verseNumber))) {
                    return false;
                }
            }
            if (measure === staffEntry.VerticalContainerParent.ParentMeasure) {
                break;
            }
        }
        return true;
    }

    /**
     * Puts the label back where it was before the first layout calculation, called before each calculation.
     * MusicSheetCalculator.calculateSingleStaffLineLyricsPosition() moves the label below the staffline, but the bounding box
     * of the staff entry is calculated from its children (including the label) before that, e.g. in
     * VexFlowStaffEntry.calculateXPosition(). Without the reset, a re-render would include the previous render's position of
     * the label there, where the first render included the initial one - e.g. after a resize, a staff entry whose lyrics were
     * lower in the previous layout kept that lower bottom border, making the page taller.
     * The verse number goes back too, see moveLeadingNumberLeftOfLyricInStaffLine(): the measures are spaced by the label's
     * width before the systems are built (VexFlowMusicSheetCalculator.calculateElongationFactor()). Without the reset, a
     * re-render (or the next batch of renderNext()) would space them with the numbers of the previous calculation's systems,
     * e.g. a lyric that started a system then would get the space of a lyric without a number, also where it is in the middle
     * of a system now.
     * The first call takes the snapshot of the initial position.
     */
    public resetPosition(): void {
        this.moveLeadingNumberLeftOfLyric(this.leadingNumberMovedInitially);
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
