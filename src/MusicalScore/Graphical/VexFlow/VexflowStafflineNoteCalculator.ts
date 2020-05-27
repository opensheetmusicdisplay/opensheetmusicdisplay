import { IStafflineNoteCalculator } from "../../Interfaces/IStafflineNoteCalculator";
import { GraphicalNote } from "../GraphicalNote";
import { ClefInstruction, ClefEnum } from "../../VoiceData";
import { Pitch, NoteEnum, AccidentalEnum } from "../../../Common";
import { VexFlowGraphicalNote } from "./VexFlowGraphicalNote";

export class VexflowStafflineNoteCalculator implements IStafflineNoteCalculator {

  /**
   * This method is called for each note, and should make any necessary position changes based on the number of stafflines, clef, etc.
   * Right now this just directly maps a voice number to a position above or below a staffline
   * @param graphicalNote The note to be checked/positioned
   * @param currentClef The clef that is active for this note
   * @param stafflineCount The number of stafflines we are rendering on
   * @returns the minimum required x width of the source measure (=list of staff measures)
   */
    public positionNote(graphicalNote: GraphicalNote, currentClef: ClefInstruction, stafflineCount: number): GraphicalNote {
        if (!(graphicalNote instanceof VexFlowGraphicalNote) || currentClef.ClefType !== ClefEnum.percussion ||
        graphicalNote.sourceNote.isRest()) {
            return graphicalNote;
        }

        const vfGraphicalNote: VexFlowGraphicalNote = graphicalNote as VexFlowGraphicalNote;
        const voiceCount: number = graphicalNote.parentVoiceEntry.parentStaffEntry.sourceStaffEntry.ParentStaff.Voices.length;
        const voiceNumber: number = graphicalNote.parentVoiceEntry.parentVoiceEntry.ParentVoice.VoiceId;
        let fundamental: NoteEnum = NoteEnum.B;
        let octave: number = 1;

        //Direct mapping for more than one voice, position voices
        if (voiceCount > 1) {
            switch (voiceNumber) {
                case 2:
                    fundamental = NoteEnum.A;
                    break;
                case 3:
                    fundamental = NoteEnum.F;
                    break;
                case 4:
                    fundamental = NoteEnum.D;
                    break;
                case 5:
                    fundamental = NoteEnum.B;
                    octave = 0;
                    break;
                default:
                    fundamental = NoteEnum.C;
                    octave = 2;
                    break;
            }
        }
        //TODO: Check for playback side effects
        vfGraphicalNote.setAccidental(new Pitch(fundamental, octave, AccidentalEnum.NONE));
        return graphicalNote;
    }
}
