import { IStafflineNoteCalculator } from "../../Interfaces/IStafflineNoteCalculator";
import { GraphicalNote } from "../GraphicalNote";
import { Pitch, NoteEnum } from "../../../Common/DataObjects/Pitch";
import { VexFlowGraphicalNote } from "./VexFlowGraphicalNote";
import { Dictionary } from "typescript-collections";
import { EngravingRules } from "../EngravingRules";
import { ClefEnum } from "../../VoiceData/Instructions/ClefInstruction";
import { StemDirectionType, VoiceEntry } from "../../VoiceData/VoiceEntry";

export class VexflowStafflineNoteCalculator implements IStafflineNoteCalculator {
    private rules: EngravingRules;
    private staffPitchListMapping: Dictionary<number, Array<Pitch>> = new Dictionary<number, Array<Pitch>>();
    //These render on the single line by default
    private baseLineNote: NoteEnum = NoteEnum.B;
    private baseLineOctave: number = 1;

    constructor(rules: EngravingRules) {
        this.rules = rules;
    }
    /**
     * This method is called for each note during the calc phase. We want to track all possible positions to make decisions
     * during layout about where notes should be positioned.
     * This directly puts notes that share a line to the same position, regardless of voice
     * @param graphicalNote The note to be checked/positioned
     * @param staffIndex The staffline the note is on
     */
    public trackNote(graphicalNote: GraphicalNote): void {
        if (!(graphicalNote instanceof VexFlowGraphicalNote) || graphicalNote.Clef().ClefType !== ClefEnum.percussion ||
        graphicalNote.sourceNote.isRest() || this.rules.PercussionOneLineCutoff === 0 ||
        this.rules.PercussionForceVoicesOneLineCutoff === -1) {
            return;
        }
        const staffIndex: number =
                graphicalNote.parentVoiceEntry.parentStaffEntry.sourceStaffEntry.ParentStaff.idInMusicSheet;

        let currentPitchList: Array<Pitch> = undefined;
        if (!this.staffPitchListMapping.containsKey(staffIndex)) {
            this.staffPitchListMapping.setValue(staffIndex, new Array<Pitch>());
        }
        currentPitchList = this.staffPitchListMapping.getValue(staffIndex);
        const pitch: Pitch = graphicalNote.sourceNote.Pitch;
        VexflowStafflineNoteCalculator.findOrInsert(currentPitchList, pitch);
    }

    private static PitchIndexOf(array: Array<Pitch>, pitch: Pitch, start: number = 0): number {
        if (start > array.length - 1) {
            return -1;
        }

        for (let i: number = start; i < array.length; i++) {
            const p2: Pitch = array[i];
            if (pitch.OperatorEquals(p2)) {
                return i;
            }
        }
        return -1;
    }

    private static findOrInsert(array: Array<Pitch>, pitch: Pitch): number {
        for (let i: number = 0; i < array.length; i++) {
            const p2: Pitch = array[i];
            if (pitch.OperatorEquals(p2)) {
                return i;
            } else {
                if (pitch.OperatorFundamentalLessThan(p2)) {
                    array.splice(i, 0, pitch);
                    return i;
                }
            }
        }
        //If we reach here, we've reached the end of the array.
        //Means its the greatest pitch
        array.push(pitch);
        return array.length - 1;
    }

    /**
     * This method is called for each note, and should make any necessary position changes based on the number of stafflines, clef, etc.
     * @param graphicalNote The note to be checked/positioned
     * @param staffIndex The staffline that this note exists on
     * @returns the newly positioned note
     */
    public positionNote(graphicalNote: GraphicalNote): GraphicalNote {
        const staffIndex: number =
                graphicalNote.parentVoiceEntry.parentStaffEntry.sourceStaffEntry.ParentStaff.idInMusicSheet;

        if (!(graphicalNote instanceof VexFlowGraphicalNote) || graphicalNote.sourceNote.isRest()
            || !this.staffPitchListMapping.containsKey(staffIndex)) {
            return graphicalNote;
        }
        const currentPitchList: Array<Pitch> = this.staffPitchListMapping.getValue(staffIndex);
        //const xmlSingleStaffline: boolean = graphicalNote.parentVoiceEntry.parentStaffEntry.parentMeasure.ParentStaff.StafflineCount === 1;
        const positionByXml: boolean = this.rules.PercussionUseXMLDisplayStep &&
            graphicalNote.sourceNote.displayStepUnpitched !== undefined;
        if (currentPitchList.length > this.rules.PercussionOneLineCutoff && !positionByXml) {
            //Don't need to position notes. We aren't under the cutoff
            return graphicalNote;
        }
        const vfGraphicalNote: VexFlowGraphicalNote = graphicalNote as VexFlowGraphicalNote;
        const notePitch: Pitch = graphicalNote.sourceNote.Pitch;

        let displayNote: NoteEnum = this.baseLineNote;
        let displayOctave: number = this.baseLineOctave;
        if (this.rules.PercussionUseXMLDisplayStep
            && graphicalNote.sourceNote.displayStepUnpitched !== undefined) {
            //&& xmlSingleStaffline) {
            displayNote = graphicalNote.sourceNote.displayStepUnpitched;
            displayOctave = graphicalNote.sourceNote.displayOctaveUnpitched + this.rules.PercussionOneLineXMLDisplayStepOctaveOffset;
        }
        //If we only need to render on one line
        if (currentPitchList.length <= this.rules.PercussionForceVoicesOneLineCutoff) {
            vfGraphicalNote.setAccidental(new Pitch(displayNote, displayOctave, notePitch.Accidental));
        } else {
            const pitchIndex: number = VexflowStafflineNoteCalculator.PitchIndexOf(currentPitchList, notePitch);
            if (pitchIndex > -1) {
                const half: number = Math.ceil(currentPitchList.length / 2);
                if (!this.rules.PercussionUseXMLDisplayStep) {
                    if (pitchIndex >= half) {
                        //position above
                        displayOctave = 2;
                        switch ((pitchIndex - half) % 5) {
                            case 1:
                                displayNote = NoteEnum.E;
                                break;
                            case 2:
                                displayNote = NoteEnum.G;
                                break;
                            case 3:
                                displayNote = NoteEnum.B;
                                break;
                            case 4:
                                displayNote = NoteEnum.D;
                                displayOctave = 3;
                                break;
                            default:
                                displayNote = NoteEnum.C;
                                break;
                        }
                    } else { //position below
                        switch (pitchIndex % 5) {
                            case 1:
                                displayNote = NoteEnum.F;
                                break;
                            case 2:
                                displayNote = NoteEnum.D;
                                break;
                            case 3:
                                displayNote = NoteEnum.B;
                                displayOctave = 0;
                                break;
                            case 4:
                                displayNote = NoteEnum.G;
                                displayOctave = 0;
                                break;
                            default:
                                displayNote = NoteEnum.A;
                                break;
                        }
                    }
                }
                const mappedPitch: Pitch = new Pitch(displayNote, displayOctave, notePitch.Accidental);
                //Map the pitch, set stems properly
                vfGraphicalNote.setAccidental(mappedPitch);
                const parentVoiceEntry: VoiceEntry = vfGraphicalNote.parentVoiceEntry.parentVoiceEntry;
                // Only switch stems if we aren't sharing stems with another note
                if (!this.rules.SetWantedStemDirectionByXml && parentVoiceEntry.Notes.length < 2) {
                    if (mappedPitch.Octave > this.baseLineOctave ||
                        (mappedPitch.FundamentalNote === this.baseLineNote && mappedPitch.Octave === this.baseLineOctave)) {
                        vfGraphicalNote.parentVoiceEntry.parentVoiceEntry.WantedStemDirection = StemDirectionType.Up;
                    } else {
                        vfGraphicalNote.parentVoiceEntry.parentVoiceEntry.WantedStemDirection = StemDirectionType.Down;
                    }
                }
            }
        }
        return vfGraphicalNote;
    }
    /**
     * Get the number of unique "voices" or note positions
     * @param staffIndex The Staffline to get the count of
     */
    public getStafflineUniquePositionCount(staffIndex: number): number {
        if (this.staffPitchListMapping.containsKey(staffIndex)) {
            return this.staffPitchListMapping.getValue(staffIndex).length;
        }
        return 0;
    }
}
