import {MusicSystem} from "./MusicSystem";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {StaffLine} from "./StaffLine";
import {Staff} from "../VoiceData/Staff";
import {GraphicalObject} from "./GraphicalObject";
import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {RhythmInstruction} from "../VoiceData/Instructions/RhythmInstruction";
import {Fraction} from "../../Common/DataObjects/fraction";
import {Voice} from "../VoiceData/Voice";
import {VoiceEntry} from "../VoiceData/VoiceEntry";
import {GraphicalNote} from "./GraphicalNote";
import {SystemLinesEnum} from "./SystemLinesEnum";
import {BoundingBox} from "./BoundingBox";

export class StaffMeasure extends GraphicalObject {
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
    public beginInstructionsWidth: number;
    public minimumStaffEntriesWidth: number;
    public staffEntriesScaleFactor: number;
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

    public ResetLayout(): void {
    }

    public GetLineWidth(line: SystemLinesEnum): number {
        return undefined;
    }

    public AddClefAtBegin(clef: ClefInstruction): void {
    }

    public AddKeyAtBegin(currentKey: KeyInstruction, previousKey: KeyInstruction, currentClef: ClefInstruction): void {
    }

    public AddRhythmAtBegin(rhythm: RhythmInstruction): void {
    }

    public AddClefAtEnd(clef: ClefInstruction): void {
    }

    public SetPositionInStaffline(xPos: number): void {
    }

    public SetWidth(width: number): void {
    }

    public LayoutSymbols(): void {
    }

    public findGraphicalStaffEntryFromTimestamp(relativeTimestamp: Fraction): GraphicalStaffEntry {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            let graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.relInMeasureTimestamp === relativeTimestamp) {
                return graphicalStaffEntry;
            }
        }
        return undefined;
    }

    public findGraphicalStaffEntryFromVerticalContainerTimestamp(absoluteTimestamp: Fraction): GraphicalStaffEntry {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            let graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.sourceStaffEntry.VerticalContainerParent.getAbsoluteTimestamp() === absoluteTimestamp) {
                return graphicalStaffEntry;
            }
        }
        return undefined;
    }

    public hasSameDurationWithSourceMeasureParent(): boolean {
        let duration: Fraction = new Fraction(0, 1);
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            let graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            duration.Add(graphicalStaffEntry.findStaffEntryMinNoteLength());
        }
        return duration === this.parentSourceMeasure.Duration;
    }

    public hasMultipleVoices(): boolean {
        if (this.staffEntries.length === 0) {
            return false;
        }
        let voices: Voice[] = [];
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            let staffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            for (let idx2: number = 0, len2: number = staffEntry.sourceStaffEntry.VoiceEntries.length; idx2 < len2; ++idx2) {
                let voiceEntry: VoiceEntry = staffEntry.sourceStaffEntry.VoiceEntries[idx2];
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
        let voices: Voice[] = [];
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            let graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            for (let idx2: number = 0, len2: number = graphicalStaffEntry.sourceStaffEntry.VoiceEntries.length; idx2 < len2; ++idx2) {
                let voiceEntry: VoiceEntry = graphicalStaffEntry.sourceStaffEntry.VoiceEntries[idx2];
                if (voices.indexOf(voiceEntry.ParentVoice) < 0) {
                    voices.push(voiceEntry.ParentVoice);
                }
            }
        }
        for (let idx: number = 0, len: number = voices.length; idx < len; ++idx) {
            let voice: Voice = voices[idx];
            let voiceDuration: Fraction = new Fraction(0, 1);
            for (let idx2: number = 0, len2: number = this.staffEntries.length; idx2 < len2; ++idx2) {
                let graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx2];
                for (let idx3: number = 0, len3: number = graphicalStaffEntry.notes.length; idx3 < len3; ++idx3) {
                    let graphicalNotes: GraphicalNote[] = graphicalStaffEntry.notes[idx3];
                    if (graphicalNotes.length > 0 && graphicalNotes[0].sourceNote.ParentVoiceEntry.ParentVoice === voice) {
                        voiceDuration.Add(graphicalNotes[0].graphicalNoteLength);
                    }
                }
            }
            if (voiceDuration > duration) {
                duration = Fraction.createFromFraction(voiceDuration);
            }
        }
        return duration;
    }

    public addGraphicalStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
        this.staffEntries.push(graphicalStaffEntry);
        this.PositionAndShape.ChildElements.push(graphicalStaffEntry.PositionAndShape);
    }

    public addGraphicalStaffEntryAtTimestamp(staffEntry: GraphicalStaffEntry): void {
        if (staffEntry !== undefined) {
            if (this.staffEntries.length === 0 || this.staffEntries[this.staffEntries.length - 1].relInMeasureTimestamp < staffEntry.relInMeasureTimestamp) {
                this.staffEntries.push(staffEntry);
            } else {
                for (let i: number = this.staffEntries.length - 1; i >= 0; i--) {
                    if (this.staffEntries[i].relInMeasureTimestamp < staffEntry.relInMeasureTimestamp) {
                        this.staffEntries.splice(i + 1, 0, staffEntry);
                        break;
                    }
                    if (i === 0) {
                        this.staffEntries.splice(i, 0, staffEntry);
                    }
                }
            }
            this.PositionAndShape.ChildElements.push(staffEntry.PositionAndShape);
        }
    }

    public beginsWithLineRepetition(): boolean {
        let sourceMeasure: SourceMeasure = this.parentSourceMeasure;
        if (sourceMeasure === undefined) {
            return false;
        }
        return sourceMeasure.beginsWithLineRepetition();
    }

    public endsWithLineRepetition(): boolean {
        let sourceMeasure: SourceMeasure = this.parentSourceMeasure;
        if (sourceMeasure === undefined) {
            return false;
        }
        return sourceMeasure.endsWithLineRepetition();
    }

    public beginsWithWordRepetition(): boolean {
        let sourceMeasure: SourceMeasure = this.parentSourceMeasure;
        if (sourceMeasure === undefined) {
            return false;
        }
        return sourceMeasure.beginsWithWordRepetition();
    }

    public endsWithWordRepetition(): boolean {
        let sourceMeasure: SourceMeasure = this.parentSourceMeasure;
        if (sourceMeasure === undefined) {
            return false;
        }
        return sourceMeasure.endsWithWordRepetition();
    }
}
