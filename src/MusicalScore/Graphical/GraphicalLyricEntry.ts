import {LyricsEntry} from "../VoiceData/Lyrics/LyricsEntry";
import {GraphicalLyricWord} from "./GraphicalLyricWord";
import {GraphicalLabel} from "./GraphicalLabel";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {Label} from "../Label";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {TextAlignment, TextAlignmentEnum} from "../../Common/Enums/TextAlignment";
import { EngravingRules } from "./EngravingRules";
import { BoundingBox } from "./BoundingBox";
import { MusicSheetCalculator } from "./MusicSheetCalculator";
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
        this.moveLeadingNumberLeftOfLyric(rules);
        if (this.graphicalLabel.PositionAndShape.Size.width < rules.LyricsExtraXShiftForShortLyricsWidthThreshold) {
            this.graphicalLabel.PositionAndShape.RelativePosition.x += rules.LyricsExtraXShiftForShortLyrics;
            this.graphicalLabel.CenteringXShift = rules.LyricsExtraXShiftForShortLyrics;
        }
        if (lyricsTextAlignment === TextAlignmentEnum.LeftBottom) {
            this.graphicalLabel.PositionAndShape.RelativePosition.x -= 1; // make lyrics optically left-aligned
        }
    }

    /**
     * Aligns the first lyric of a verse whose text starts with the verse number, e.g. "1. Si", like a lyric without one, if
     * lyrics are left-aligned: the number is left of where the lyric starts, instead of the lyric being right of that by the number.
     * MusicXML has no element for such a number, it is part of the lyric's text.
     * The label's box is the lyric without the number, so it is spaced like a lyric without one: no lyrics of its verse are
     * before it. The box's left margin reaches to the number, which keeps the number clear of what is above it.
     * Only if the other lyrics with a verse number at the note are the first of their verses too, see numbersStartTheirVerses().
     */
    private moveLeadingNumberLeftOfLyric(rules: EngravingRules): void {
        const label: Label = this.graphicalLabel.Label;
        if (!rules.LyricsVerseNumberLeftOfLyric || !TextAlignment.IsLeft(label.textAlignment)) {
            return;
        }
        const leadingNumber: string = GraphicalLyricEntry.leadingNumber.exec(this.graphicalLabel.TextLines?.[0].text ?? "")?.[0];
        if (!leadingNumber || !this.numbersStartTheirVerses()) {
            return;
        }
        const numberWidth: number = label.fontHeight *
            MusicSheetCalculator.TextMeasurer.computeTextWidthToHeightRatio(leadingNumber, label.font, label.fontStyle, label.fontFamily);
        const box: BoundingBox = this.graphicalLabel.PositionAndShape;
        box.BorderRight -= numberWidth;
        box.BorderMarginRight -= numberWidth;
        box.BorderMarginLeft -= numberWidth;
        for (const line of this.graphicalLabel.TextLines) {
            line.xOffset -= numberWidth;
        }
    }

    /**
     * Whether each lyric with a verse number at this lyric's note, in any voice of its staff, is the first lyric of its verse
     * there. The numbers of a note are moved together, so that its lyrics stay aligned, e.g. where verse 1 sang the measures
     * before ("1.2. When I was young") and goes on with "1. Sea" while verse 2 starts with "2. Sea".
     */
    private numbersStartTheirVerses(): boolean {
        for (const voiceEntry of this.lyricsEntry.Parent.ParentSourceStaffEntry.VoiceEntries) {
            for (const lyricsEntry of voiceEntry.LyricsEntries.values()) {
                if (GraphicalLyricEntry.leadingNumber.test(lyricsEntry.Text.trim()) && !this.isFirstOfVerseInStaff(lyricsEntry.VerseNumber)) {
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
