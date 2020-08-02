import { IStafflineNoteCalculator } from "../../Interfaces/IStafflineNoteCalculator";
import { GraphicalNote } from "../GraphicalNote";
import { ClefEnum, StemDirectionType, VoiceEntry } from "../../VoiceData";
import { Pitch, NoteEnum } from "../../../Common";
import { VexFlowGraphicalNote } from "./VexFlowGraphicalNote";
import { Dictionary } from "typescript-collections";
import { EngravingRules } from "../EngravingRules";

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
     * This directly notes that share a line to the same position, regardless of voice
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
        //Don't need to position notes. We aren't under the cutoff
        if (currentPitchList.length > this.rules.PercussionOneLineCutoff) {
            return graphicalNote;
        }
        const vfGraphicalNote: VexFlowGraphicalNote = graphicalNote as VexFlowGraphicalNote;
        const notePitch: Pitch = graphicalNote.sourceNote.Pitch;

        //If we only need to render on one line
        if (currentPitchList.length <= this.rules.PercussionForceVoicesOneLineCutoff) {
            vfGraphicalNote.setAccidental(new Pitch(this.baseLineNote, this.baseLineOctave, notePitch.Accidental));
        } else {
            const pitchIndex: number = VexflowStafflineNoteCalculator.PitchIndexOf(currentPitchList, notePitch);
            if (pitchIndex > -1) {
                let fundamental: NoteEnum = this.baseLineNote;
                let octave: number = this.baseLineOctave;
                const half: number = Math.ceil(currentPitchList.length / 2);
                //position above
                if (pitchIndex >= half) {
                    octave = 2;
                    switch ((pitchIndex - half) % 5) {
                        case 1:
                            fundamental = NoteEnum.E;
                            break;
                        case 2:
                            fundamental = NoteEnum.G;
                            break;
                        case 3:
                            fundamental = NoteEnum.B;
                            break;
                        case 4:
                            fundamental = NoteEnum.D;
                            octave = 3;
                            break;
                        default:
                            fundamental = NoteEnum.C;
                            break;
                    }
                } else { //position below
                    switch (pitchIndex % 5) {
                        case 1:
                            fundamental = NoteEnum.F;
                            break;
                        case 2:
                            fundamental = NoteEnum.D;
                            break;
                        case 3:
                            fundamental = NoteEnum.B;
                            octave = 0;
                            break;
                        case 4:
                            fundamental = NoteEnum.G;
                            octave = 0;
                            break;
                        default:
                            fundamental = NoteEnum.A;
                            break;
                    }
                }
                const mappedPitch: Pitch = new Pitch(fundamental, octave, notePitch.Accidental);
                //Map the pitch, set stems properly
                vfGraphicalNote.setAccidental(mappedPitch);
                const parentVoiceEntry: VoiceEntry = vfGraphicalNote.parentVoiceEntry.parentVoiceEntry;
                if (parentVoiceEntry.Notes.length < 2) { // Only switch stems if we aren't sharing stems with another note
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
