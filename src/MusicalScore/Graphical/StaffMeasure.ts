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
export class StaffMeasure extends GraphicalObject {
    protected firstInstructionStaffEntry: GraphicalStaffEntry;
    protected lastInstructionStaffEntry: GraphicalStaffEntry;
    private staff: Staff;
    private measureNumber: number = -1;
    private parentStaffLine: StaffLine;
    constructor(staff: Staff, parentSourceMeasure: SourceMeasure) {
        this.staff = staff;
        this.ParentSourceMeasure = parentSourceMeasure;
        this.StaffEntries = [];
        if (this.ParentSourceMeasure !== undefined)
            this.measureNumber = this.ParentSourceMeasure.MeasureNumber;
    }
    constructor(staffLine: StaffLine) {
        this.parentStaffLine = staffLine;
        this.staff = staffLine.ParentStaff;
        this.StaffEntries = [];
    }
    public ParentSourceMeasure: SourceMeasure;
    public StaffEntries: GraphicalStaffEntry[];
    public ParentMusicSystem: MusicSystem;
    public BeginInstructionsWidth: number;
    public MinimumStaffEntriesWidth: number;
    public StaffEntriesScaleFactor: number;
    public EndInstructionsWidth: number;
    public hasError: boolean;
    public get ParentStaff(): Staff {
        return this.staff;
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
        if (this.parentStaffLine !== undefined)
            this.PositionAndShape.Parent = this.parentStaffLine.PositionAndShape;
    }
    public ResetLayout(): void { throw new Error('not implemented'); }
    public GetLineWidth(line: SystemLinesEnum): number { throw new Error('not implemented'); }
    public AddClefAtBegin(clef: ClefInstruction): void { throw new Error('not implemented'); }
    public AddKeyAtBegin(currentKey: KeyInstruction, previousKey: KeyInstruction, currentClef: ClefInstruction): void { throw new Error('not implemented'); }
    public AddRhythmAtBegin(rhythm: RhythmInstruction): void { throw new Error('not implemented'); }
    public AddClefAtEnd(clef: ClefInstruction): void { throw new Error('not implemented'); }
    public SetPositionInStaffline(xPos: number): void { throw new Error('not implemented'); }
    public SetWidth(width: number): void { throw new Error('not implemented'); }
    public LayoutSymbols(): void { throw new Error('not implemented'); }
    public findGraphicalStaffEntryFromTimestamp(relativeTimestamp: Fraction): GraphicalStaffEntry {
        for (let idx: number = 0, len: number = this.StaffEntries.length; idx < len; ++idx) {
            let graphicalStaffEntry: GraphicalStaffEntry = this.StaffEntries[idx];
            if (graphicalStaffEntry.RelInMeasureTimestamp === relativeTimestamp)
                return graphicalStaffEntry;
        }
        return undefined;
    }
    public findGraphicalStaffEntryFromVerticalContainerTimestamp(absoluteTimestamp: Fraction): GraphicalStaffEntry {
        for (let idx: number = 0, len: number = this.StaffEntries.length; idx < len; ++idx) {
            let graphicalStaffEntry: GraphicalStaffEntry = this.StaffEntries[idx];
            if (graphicalStaffEntry.SourceStaffEntry.VerticalContainerParent.getAbsoluteTimestamp() === absoluteTimestamp)
                return graphicalStaffEntry;
        }
        return undefined;
    }
    public hasSameDurationWithSourceMeasureParent(): boolean {
        let duration: Fraction = new Fraction(0, 1);
        for (let idx: number = 0, len: number = this.StaffEntries.length; idx < len; ++idx) {
            let graphicalStaffEntry: GraphicalStaffEntry = this.StaffEntries[idx];
            duration.Add(graphicalStaffEntry.findStaffEntryMinNoteLength());
        }
        return duration === this.ParentSourceMeasure.Duration;
    }
    public hasMultipleVoices(): boolean {
        if (this.StaffEntries.length === 0)
            return false;
        let voices: Voice[] = [];
        for (let idx: number = 0, len: number = this.StaffEntries.length; idx < len; ++idx) {
            let staffEntry: GraphicalStaffEntry = this.StaffEntries[idx];
            for (let idx2: number = 0, len2: number = staffEntry.SourceStaffEntry.VoiceEntries.length; idx2 < len2; ++idx2) {
                let voiceEntry: VoiceEntry = staffEntry.SourceStaffEntry.VoiceEntries[idx2];
                if (voices.indexOf(voiceEntry.ParentVoice) < 0)
                    voices.push(voiceEntry.ParentVoice);
            }
        }
        if (voices.length > 1)
            return true;
        return false;
    }
    public isVisible(): boolean {
        return this.ParentStaff.ParentInstrument.Visible;
    }
    public getGraphicalMeasureDurationFromStaffEntries(): Fraction {
        let duration: Fraction = new Fraction(0, 1);
        let voices: Voice[] = [];
        for (let idx: number = 0, len: number = this.StaffEntries.length; idx < len; ++idx) {
            let graphicalStaffEntry: GraphicalStaffEntry = this.StaffEntries[idx];
            for (let idx2: number = 0, len2: number = graphicalStaffEntry.SourceStaffEntry.VoiceEntries.length; idx2 < len2; ++idx2) {
                let voiceEntry: VoiceEntry = graphicalStaffEntry.SourceStaffEntry.VoiceEntries[idx2];
                if (voices.indexOf(voiceEntry.ParentVoice) < 0)
                    voices.push(voiceEntry.ParentVoice);
            }
        }
        for (let idx: number = 0, len: number = voices.length; idx < len; ++idx) {
            let voice: Voice = voices[idx];
            let voiceDuration: Fraction = new Fraction(0, 1);
            for (let idx2: number = 0, len2: number = this.StaffEntries.length; idx2 < len2; ++idx2) {
                let graphicalStaffEntry: GraphicalStaffEntry = this.StaffEntries[idx2];
                for (let idx3: number = 0, len3: number = graphicalStaffEntry.Notes.length; idx3 < len3; ++idx3) {
                    let graphicalNotes: GraphicalNote[] = graphicalStaffEntry.Notes[idx3];
                    if (graphicalNotes.length > 0 && graphicalNotes[0].SourceNote.ParentVoiceEntry.ParentVoice === voice)
                        voiceDuration.Add(graphicalNotes[0].GraphicalNoteLength);
                }
            }
            if (voiceDuration > duration)
                duration = Fraction.createFromFraction(voiceDuration);
        }
        return duration;
    }
    public addGraphicalStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
        this.StaffEntries.push(graphicalStaffEntry);
        this.PositionAndShape.ChildElements.push(graphicalStaffEntry.PositionAndShape);
    }
    public addGraphicalStaffEntryAtTimestamp(staffEntry: GraphicalStaffEntry): void {
        if (staffEntry !== undefined) {
            if (this.StaffEntries.length === 0 || this.StaffEntries[this.StaffEntries.length - 1].RelInMeasureTimestamp < staffEntry.RelInMeasureTimestamp)
                this.StaffEntries.push(staffEntry);
            else {
                for (let i: number = this.StaffEntries.length - 1; i >= 0; i--) {
                    if (this.StaffEntries[i].RelInMeasureTimestamp < staffEntry.RelInMeasureTimestamp) {
                        this.StaffEntries.splice(i + 1, 0, staffEntry);
                        break;
                    }
                    if (i === 0)
                        this.StaffEntries.splice(i, 0, staffEntry);
                }
            }
            this.PositionAndShape.ChildElements.push(staffEntry.PositionAndShape);
        }
    }
    public beginsWithLineRepetition(): boolean {
        let sourceMeasure: SourceMeasure = this.ParentSourceMeasure;
        if (sourceMeasure === undefined)
            return false;
        return sourceMeasure.beginsWithLineRepetition();
    }
    public endsWithLineRepetition(): boolean {
        let sourceMeasure: SourceMeasure = this.ParentSourceMeasure;
        if (sourceMeasure === undefined)
            return false;
        return sourceMeasure.endsWithLineRepetition();
    }
    public beginsWithWordRepetition(): boolean {
        let sourceMeasure: SourceMeasure = this.ParentSourceMeasure;
        if (sourceMeasure === undefined)
            return false;
        return sourceMeasure.beginsWithWordRepetition();
    }
    public endsWithWordRepetition(): boolean {
        let sourceMeasure: SourceMeasure = this.ParentSourceMeasure;
        if (sourceMeasure === undefined)
            return false;
        return sourceMeasure.endsWithWordRepetition();
    }
}