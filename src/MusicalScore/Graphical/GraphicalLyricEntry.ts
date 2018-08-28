import {LyricsEntry} from "../VoiceData/Lyrics/LyricsEntry";
import {GraphicalLyricWord} from "./GraphicalLyricWord";
import {GraphicalLabel} from "./GraphicalLabel";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {Label} from "../Label";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
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
        this.graphicalLabel = new GraphicalLabel(
            new Label(lyricsEntry.Text),
            lyricsHeight,
            EngravingRules.Rules.LyricsAlignmentStandard,
            graphicalStaffEntry.PositionAndShape
        );
        this.graphicalLabel.PositionAndShape.RelativePosition = new PointF2D(0, staffHeight);
        // if (this.graphicalLabel.Label.textAlignment === TextAlignment.LeftBottom) {
        //     this.graphicalLabel.PositionAndShape.RelativePosition = new PointF2D(-1, staffHeight);
        //         // x = 0 is center of note head in OSMD (left-most x in Vexflow)}
        //         // this gets reset later
        // }
    }

    // FIXME: This should actually be called LyricsEntry or be a function
    public get GetLyricsEntry(): LyricsEntry {
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
