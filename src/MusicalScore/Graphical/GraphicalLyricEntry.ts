import {LyricsEntry} from "../VoiceData/Lyrics/LyricsEntry";
import {GraphicalLyricWord} from "./GraphicalLyricWord";
import {GraphicalLabel} from "./GraphicalLabel";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {Label} from "../Label";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import { EngravingRules } from "./EngravingRules";
import { TextAlignmentEnum } from "../../Common/Enums/TextAlignment";

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
        const lyricsTextAlignment: TextAlignmentEnum = EngravingRules.Rules.LyricsAlignmentStandard;
        // for small notes with long text, use center alignment
        // TODO use this, fix center+left alignment combination spacing
        if (lyricsEntry.Text.length >= 4
            && lyricsEntry.Parent.Notes[0].Length.Denominator > 4
            && lyricsTextAlignment === TextAlignmentEnum.LeftBottom) {
            // lyricsTextAlignment = TextAlignmentAndPlacement.CenterBottom;
        }
        this.graphicalLabel = new GraphicalLabel(
            new Label(lyricsEntry.Text),
            lyricsHeight,
            lyricsTextAlignment,
            graphicalStaffEntry.PositionAndShape
        );
        this.graphicalLabel.PositionAndShape.RelativePosition = new PointF2D(0, staffHeight);
        if (lyricsTextAlignment === TextAlignmentEnum.LeftBottom) {
            this.graphicalLabel.PositionAndShape.RelativePosition.x -= 1; // make lyrics optically left-aligned
        }
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
