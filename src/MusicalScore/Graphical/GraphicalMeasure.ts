import {MusicSystem} from "./MusicSystem";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {StaffLine} from "./StaffLine";
import {Staff} from "../VoiceData/Staff";
import {GraphicalObject} from "./GraphicalObject";
import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {RhythmInstruction} from "../VoiceData/Instructions/RhythmInstruction";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {Voice} from "../VoiceData/Voice";
import {VoiceEntry} from "../VoiceData/VoiceEntry";
import {SystemLinesEnum} from "./SystemLinesEnum";
import {BoundingBox} from "./BoundingBox";
import {PointF2D} from "../../Common/DataObjects/PointF2D";

/**
 * Represents a measure in the music sheet (one measure in one staff line)
 */
export abstract class GraphicalMeasure extends GraphicalObject {
    protected firstInstructionStaffEntry: GraphicalStaffEntry;
    protected lastInstructionStaffEntry: GraphicalStaffEntry;

    constructor(staff: Staff = undefined, parentSourceMeasure: SourceMeasure = undefined, staffLine: StaffLine = undefined) {
        super();
        this.parentStaff = staff;
        this.parentSourceMeasure = parentSourceMeasure;
        this.parentStaffLine = staffLine;
        if (staffLine !== undefined) {
            this.parentStaff = staffLine.ParentStaff;
            this.PositionAndShape = new BoundingBox(this, staffLine.PositionAndShape);
        } else {
            this.PositionAndShape = new BoundingBox(this);
        }
        this.PositionAndShape.BorderBottom = 4;
        if (this.parentSourceMeasure !== undefined) {
            this.measureNumber = this.parentSourceMeasure.MeasureNumber;
        }

        this.staffEntries = [];
    }

    public parentSourceMeasure: SourceMeasure;
    public staffEntries: GraphicalStaffEntry[];
    public parentMusicSystem: MusicSystem;
    /**
     * The x-width of possibly existing: repetition start line, clef, key, rhythm.
     */
    public beginInstructionsWidth: number;
    /**
     * The minimum possible x-width of all staff entries without overlapping.
     */
    public minimumStaffEntriesWidth: number;
    /**
     * Will be set by music system builder while building systems.
     */
    public staffEntriesScaleFactor: number;
    /**
     * The x-width of possibly existing: repetition end line, clef.
     */
    public endInstructionsWidth: number;
    public hasError: boolean;

    private parentStaff: Staff;
    private measureNumber: number = -1;
    private parentStaffLine: StaffLine;

    public get ParentStaff(): Staff {
        return this.parentStaff;
    }

    public get MeasureNumber(): number {
        return this.measureNumber;
    }

    public get FirstInstructionStaffEntry(): GraphicalStaffEntry {
        return this.firstInstructionStaffEntry;
    }

    public set FirstInstructionStaffEntry(value: GraphicalStaffEntry) {
        this.firstInstructionStaffEntry = value;
    }

    public get LastInstructionStaffEntry(): GraphicalStaffEntry {
        return this.lastInstructionStaffEntry;
    }

    public set LastInstructionStaffEntry(value: GraphicalStaffEntry) {
        this.lastInstructionStaffEntry = value;
    }

    public get ParentStaffLine(): StaffLine {
        return this.parentStaffLine;
    }

    public set ParentStaffLine(value: StaffLine) {
        this.parentStaffLine = value;
        if (this.parentStaffLine !== undefined) {
            this.PositionAndShape.Parent = this.parentStaffLine.PositionAndShape;
        }
    }

    /**
     * Reset all the geometric values and parameters of this measure and put it in an initialized state.
     * This is needed to evaluate a measure a second time by system builder.
     */
    public resetLayout(): void {
        throw new Error("not implemented");
    }

    /**
     * Return the x-width of a given measure line.
     * @param line
     */
    public getLineWidth(line: SystemLinesEnum): number {
        throw new Error("not implemented");
    }

    /**
     * Add the given clef to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param clef
     */
    public addClefAtBegin(clef: ClefInstruction): void {
        throw new Error("not implemented");
    }

    /**
     * Add the given key to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param currentKey - The new valid key.
     * @param previousKey - The old cancelled key. Needed to show which accidentals are not valid any more.
     * @param currentClef - The valid clef. Needed to put the accidentals on the right y-positions.
     */
    public addKeyAtBegin(currentKey: KeyInstruction, previousKey: KeyInstruction, currentClef: ClefInstruction): void {
        throw new Error("not implemented");
    }

    /**
     * Add the given rhythm to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param rhythm
     */
    public addRhythmAtBegin(rhythm: RhythmInstruction): void {
        throw new Error("not implemented");
    }

    /**
     * Add the given clef to the end of the measure.
     * This has to update/increase EndInstructionsWidth.
     * @param clef
     */
    public addClefAtEnd(clef: ClefInstruction): void {
        throw new Error("not implemented");
    }

    /**
     * Set the x-position relative to the staffline (y-Position is always 0 relative to the staffline).
     * @param xPos
     */
    public setPositionInStaffline(xPos: number): void {
        this.PositionAndShape.RelativePosition = new PointF2D(xPos, 0);
    }

    /**
     * Set the overall x-width of the measure.
     * @param width
     */
    public setWidth(width: number): void {
        this.PositionAndShape.BorderRight = width;
    }

    /**
     * This method is called after the StaffEntriesScaleFactor has been set.
     * Here the final x-positions of the staff entries have to be set.
     * (multiply the minimal positions with the scaling factor, considering the BeginInstructionsWidth).
     */
    public layoutSymbols(): void {
        throw new Error("not implemented");
    }

    public findGraphicalStaffEntryFromTimestamp(relativeTimestamp: Fraction): GraphicalStaffEntry {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.relInMeasureTimestamp.Equals(relativeTimestamp)) {
                return graphicalStaffEntry;
            }
        }
        return undefined;
    }

    /**
     * Iterate from start to end and find the [[GraphicalStaffEntry]] with the same absolute timestamp.
     * @param absoluteTimestamp
     * @returns {any}
     */
    public findGraphicalStaffEntryFromVerticalContainerTimestamp(absoluteTimestamp: Fraction): GraphicalStaffEntry {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.sourceStaffEntry.VerticalContainerParent.getAbsoluteTimestamp().Equals(absoluteTimestamp)) {
                return graphicalStaffEntry;
            }
        }
        return undefined;
    }

    /**
     * Check if the all the [[GraphicalMeasure]]'s [[StaffEntry]]s (their minimum Length) have the same duration with the [[SourceMeasure]].
     * @returns {boolean}
     */
    public hasSameDurationWithSourceMeasureParent(): boolean {
        const duration: Fraction = new Fraction(0, 1);
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            duration.Add(graphicalStaffEntry.findStaffEntryMinNoteLength());
        }
        return duration.Equals(this.parentSourceMeasure.Duration);
    }

    /**
     * Check a whole [[Measure]] for the presence of multiple Voices (used for Stem direction).
     * @returns {boolean}
     */
    public hasMultipleVoices(): boolean {
        if (this.staffEntries.length === 0) {
            return false;
        }
        const voices: Voice[] = [];
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const staffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            for (let idx2: number = 0, len2: number = staffEntry.sourceStaffEntry.VoiceEntries.length; idx2 < len2; ++idx2) {
                const voiceEntry: VoiceEntry = staffEntry.sourceStaffEntry.VoiceEntries[idx2];
                if (voices.indexOf(voiceEntry.ParentVoice) < 0) {
                    voices.push(voiceEntry.ParentVoice);
                }
            }
        }
        if (voices.length > 1) {
            return true;
        }
        return false;
    }

    public isVisible(): boolean {
        return this.ParentStaff.ParentInstrument.Visible;
    }

    public getGraphicalMeasureDurationFromStaffEntries(): Fraction {
        let duration: Fraction = new Fraction(0, 1);
        const voices: Voice[] = [];
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            for (let idx2: number = 0, len2: number = graphicalStaffEntry.sourceStaffEntry.VoiceEntries.length; idx2 < len2; ++idx2) {
                const voiceEntry: VoiceEntry = graphicalStaffEntry.sourceStaffEntry.VoiceEntries[idx2];
                if (voices.indexOf(voiceEntry.ParentVoice) < 0) {
                    voices.push(voiceEntry.ParentVoice);
                }
            }
        }
        for (let idx: number = 0, len: number = voices.length; idx < len; ++idx) {
            const voice: Voice = voices[idx];
            const voiceDuration: Fraction = new Fraction(0, 1);
            for (const graphicalStaffEntry of this.staffEntries) {
                for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
                    if (gve.parentVoiceEntry.ParentVoice === voice && gve.notes.length > 0) {
                        voiceDuration.Add(gve.notes[0].graphicalNoteLength);
                    }
                }
            }
            if (duration.lt(voiceDuration)) {
                duration = Fraction.createFromFraction(voiceDuration);
            }
        }
        return duration;
    }

    public addGraphicalStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
        this.staffEntries.push(graphicalStaffEntry);
    }

    /**
     * Add a [[StaffEntry]] (along with its [[BoundingBox]]) to the current Measure.
     * @param staffEntry
     */
    public addGraphicalStaffEntryAtTimestamp(staffEntry: GraphicalStaffEntry): void {
        if (staffEntry !== undefined) {
            if (this.staffEntries.length === 0 || this.staffEntries[this.staffEntries.length - 1].relInMeasureTimestamp.lt(staffEntry.relInMeasureTimestamp)) {
                this.staffEntries.push(staffEntry);
            } else {
                for (let i: number = this.staffEntries.length - 1; i >= 0; i--) {
                    if (this.staffEntries[i].relInMeasureTimestamp.lt(staffEntry.relInMeasureTimestamp)) {
                        this.staffEntries.splice(i + 1, 0, staffEntry);
                        break;
                    }
                    if (i === 0) {
                        this.staffEntries.splice(i, 0, staffEntry);
                    }
                }
            }
        }
    }

    public beginsWithLineRepetition(): boolean {
        const sourceMeasure: SourceMeasure = this.parentSourceMeasure;
        if (sourceMeasure === undefined) {
            return false;
        }
        return sourceMeasure.beginsWithLineRepetition();
    }

    /**
     * Check if this Measure is a Repetition Ending.
     * @returns {boolean}
     */
    public endsWithLineRepetition(): boolean {
        const sourceMeasure: SourceMeasure = this.parentSourceMeasure;
        if (sourceMeasure === undefined) {
            return false;
        }
        return sourceMeasure.endsWithLineRepetition();
    }

    /**
     * Check if a Repetition starts at the next Measure.
     * @returns {boolean}
     */
    public beginsWithWordRepetition(): boolean {
        const sourceMeasure: SourceMeasure = this.parentSourceMeasure;
        if (sourceMeasure === undefined) {
            return false;
        }
        return sourceMeasure.beginsWithWordRepetition();
    }

    /**
     * Check if this Measure is a Repetition Ending.
     */
    public endsWithWordRepetition(): boolean {
        const sourceMeasure: SourceMeasure = this.parentSourceMeasure;
        if (sourceMeasure === undefined) {
            return false;
        }
        return sourceMeasure.endsWithWordRepetition();
    }
}

