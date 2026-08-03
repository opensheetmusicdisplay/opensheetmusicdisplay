import * as VF from "vexflow/core";
import { BoundingBox } from "../BoundingBox";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import { GraphicalPedal } from "../GraphicalPedal";
import { Pedal } from "../../VoiceData/Expressions/ContinuousExpressions/Pedal";
import { MusicSymbol } from "../MusicSymbol";
import { GraphicalMeasure } from "../GraphicalMeasure";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { Fraction } from "../../../Common/DataObjects/Fraction";
import { DORICO_DEFAULT_TEXT_FONT_FAMILY } from "../DoricoTextFontRouting";

/**
 * OSMD distinguishes open-ended pedal segments while modern VexFlow exposes
 * only the three drawing types. Keep the richer values in the OSMD adapter
 * and map them to the closest VexFlow drawing type at the boundary.
 */
export interface VexFlowPedalStyleMap {
    TEXT: number;
    BRACKET: number;
    MIXED: number;
    BRACKET_OPEN_BEGIN: number;
    BRACKET_OPEN_END: number;
    BRACKET_OPEN_BOTH: number;
    MIXED_OPEN_END: number;
}

export const VexFlowPedalStyles: Readonly<VexFlowPedalStyleMap> = {
    TEXT: 1,
    BRACKET: 2,
    MIXED: 3,
    BRACKET_OPEN_BEGIN: 4,
    BRACKET_OPEN_END: 5,
    BRACKET_OPEN_BOTH: 6,
    MIXED_OPEN_END: 7,
};

function vexFlowPedalType(style: number): number {
    if (style === VexFlowPedalStyles.TEXT) {
        return VF.PedalMarking.type.TEXT;
    }
    if (style === VexFlowPedalStyles.MIXED || style === VexFlowPedalStyles.MIXED_OPEN_END) {
        return VF.PedalMarking.type.MIXED;
    }
    return VF.PedalMarking.type.BRACKET;
}
/**
 * The vexflow adaptation of a pedal marking
 */
export class VexFlowPedal extends GraphicalPedal {
    /** Defines the note where the pedal starts */
    public startNote: VF.StemmableNote;
    /** Defines the note where the pedal ends.
     *  (for pedal lines, visually, the pedal end is BEFORE the note, as in Vexflow,
     *  UNLESS pedal.EndsStave is set, in which case it ends at the end (furthest x) of the stave.
     */
    public endNote: VF.StemmableNote;
    private vfStyle: number = VexFlowPedalStyles.BRACKET;
    public DepressText: string;
    public ReleaseText: string;
    public startVfVoiceEntry: VexFlowVoiceEntry;
    public endVfVoiceEntry: VexFlowVoiceEntry;
    public endMeasure: GraphicalMeasure;
    public ChangeBegin: boolean = false;
    public ChangeEnd: boolean = false;
    private line: number = -3;

    public EndSymbolPositionAndShape: BoundingBox = undefined;
    /**
     * Create a new vexflow pedal marking
     * @param pedal the object read by the ExpressionReader
     * @param parent the bounding box of the parent
     */
    constructor(pedal: Pedal, parent: BoundingBox, openBegin: boolean = false, openEnd: boolean = false) {
        super(pedal, parent);
        this.ChangeBegin = pedal.ChangeBegin;
        this.ChangeEnd = pedal.ChangeEnd;
        switch (this.pedalSymbol) {
            case MusicSymbol.PEDAL_SYMBOL:
                //This renders the pedal symbols in VF.
                this.vfStyle = VexFlowPedalStyles.TEXT;
                this.EndSymbolPositionAndShape = new BoundingBox(this, parent);
            break;
            case MusicSymbol.PEDAL_MIXED:
                if (openBegin && openEnd) {
                    this.vfStyle = VexFlowPedalStyles.BRACKET_OPEN_BOTH;
                } else if (openBegin) {
                    this.vfStyle = VexFlowPedalStyles.BRACKET_OPEN_BEGIN;
                } else if (openEnd) {
                    this.vfStyle = VexFlowPedalStyles.MIXED_OPEN_END;
                } else {
                    this.vfStyle = VexFlowPedalStyles.MIXED;
                }
            break;
            case MusicSymbol.PEDAL_BRACKET:
            default:
                if (openBegin && openEnd) {
                    this.vfStyle = VexFlowPedalStyles.BRACKET_OPEN_BOTH;
                } else if (openBegin) {
                    this.vfStyle = VexFlowPedalStyles.BRACKET_OPEN_BEGIN;
                } else if (openEnd) {
                    this.vfStyle = VexFlowPedalStyles.BRACKET_OPEN_END;
                } else {
                    this.vfStyle = VexFlowPedalStyles.BRACKET;
                }
            break;
        }
    }

    /**
     * Set a start note using a staff entry
     * @param graphicalStaffEntry the staff entry that holds the start note
     */
    public setStartNote(graphicalStaffEntry: GraphicalStaffEntry): boolean {
        if(!graphicalStaffEntry){
            return false;
        }
        for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
            const vve: VexFlowVoiceEntry = (gve as VexFlowVoiceEntry);
            if (vve?.vfStaveNote) {
                this.startNote = vve.vfStaveNote;
                this.startVfVoiceEntry = vve;
                return true;
            }
        }
        return false; // couldn't find a startNote
    }

    /**
     * Set an end note using a staff entry
     * @param graphicalStaffEntry the staff entry that holds the end note
     */
    public setEndNote(graphicalStaffEntry: GraphicalStaffEntry): boolean {
        // this is duplicate code from setStartNote, but if we make one general method, we add a lot of branching.
        if (!graphicalStaffEntry) {
            return false;
        }
        for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
            const vve: VexFlowVoiceEntry = (gve as VexFlowVoiceEntry);
            if (vve?.vfStaveNote) {
                this.endNote = vve.vfStaveNote;
                this.endVfVoiceEntry = vve;
                return true;
            }
        }
        return false; // couldn't find an endNote
    }

    public setEndMeasure(graphicalMeasure: GraphicalMeasure): void {
        this.endMeasure = graphicalMeasure;
    }

    public CalculateBoundingBox(): void {
        //TODO?
    }

    public setLine(line: number): void {
        this.line = line;
    }
    /**
     * Get the actual vexflow Pedal Marking used for drawing
     */
    public getPedalMarking(): VF.PedalMarking {
        const pedalMarking: VF.PedalMarking = new VF.PedalMarking([
            this.startNote as unknown as VF.StaveNote,
            this.endNote as unknown as VF.StaveNote,
        ]);
        if (this.endMeasure) {
            (pedalMarking as any).setEndStave?.((this.endMeasure as VexFlowMeasure).getVFStave());
        }
        pedalMarking.setType(vexFlowPedalType(this.vfStyle));
        (pedalMarking as any).style = this.vfStyle;
        pedalMarking.setLine(this.line);
        (pedalMarking as any).setFont?.({ family: DORICO_DEFAULT_TEXT_FONT_FAMILY });
        pedalMarking.setCustomText(this.DepressText, this.ReleaseText);
        //If our end note is at the end of a stave, set that value
        if(!this.endVfVoiceEntry ||
            this.getPedal.EndsStave
            //|| this.endVfVoiceEntry?.parentStaffEntry === this.endVfVoiceEntry?.parentStaffEntry?.parentMeasure?.staffEntries.last()
            //   the above condition prevents the ability to stop BEFORE the last staff entry.
            //   see test_pedal_stop_before_last_staffentry and OSMD Function test - Color, compare with Beethoven - Geliebte (pedal symbols vs lines)
        ){
            (pedalMarking as any).EndsStave = true;
        }
        if (this.getPedal.BeginsStave) {
            (pedalMarking as any).BeginsStave = true;
        }
        (pedalMarking as any).ChangeBegin = this.ChangeBegin;
        (pedalMarking as any).ChangeEnd = this.ChangeEnd;
        return pedalMarking;
    }

    public setEndsStave(endMeasure: GraphicalMeasure, endTimeStamp: Fraction): void {
        if (endTimeStamp?.gte(endMeasure.parentSourceMeasure.Duration)) {
            this.getPedal.EndsStave = true;
        }
    }

    public setBeginsStave(isRest: boolean, startTimeStamp: Fraction): void {
        if (isRest && startTimeStamp.RealValue === 0) {
            this.getPedal.BeginsStave = true;
        }
    }
}
