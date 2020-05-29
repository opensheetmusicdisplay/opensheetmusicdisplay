import { IStafflineNoteCalculator } from "../../Interfaces/IStafflineNoteCalculator";
import { GraphicalNote } from "../GraphicalNote";
import { ClefInstruction, ClefEnum } from "../../VoiceData";
import { Pitch, NoteEnum, AccidentalEnum } from "../../../Common";
import { VexFlowGraphicalNote } from "./VexFlowGraphicalNote";
import { Dictionary } from "typescript-collections";
import { EngravingRules } from "../EngravingRules";

export class VexflowStafflineNoteCalculator implements IStafflineNoteCalculator {
    private instrumentVoiceMapping: Dictionary<string, Dictionary<number, {note: NoteEnum, octave: number}>> =
                                                new Dictionary<string, Dictionary<number, {note: NoteEnum, octave: number}>>();
    private rules: EngravingRules;

    constructor(rules: EngravingRules) {
        this.rules = rules;
    }
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
        graphicalNote.sourceNote.isRest() || stafflineCount > 1) {
            return graphicalNote;
        }

        const instrumentId: string = graphicalNote.sourceNote.PlaybackInstrumentId;
        //const instrumentId: number = graphicalNote.parentVoiceEntry.parentVoiceEntry.ParentVoice.Parent.Id;
        const voiceNumber: number = graphicalNote.parentVoiceEntry.parentVoiceEntry.ParentVoice.VoiceId;
        //const mappingId: number = instrumentId * 10 + voiceNumber;
        let currentInstrumentMapping: Dictionary<number, {note: NoteEnum, octave: number}> = undefined;

        if (!this.instrumentVoiceMapping.containsKey(instrumentId)) {
            currentInstrumentMapping = new Dictionary<number, {note: NoteEnum, octave: number}>();
            this.instrumentVoiceMapping.setValue(instrumentId, currentInstrumentMapping);
        } else {
            currentInstrumentMapping = this.instrumentVoiceMapping.getValue(instrumentId);
        }

        let fundamental: NoteEnum = NoteEnum.B;
        let octave: number = 1;
        const vfGraphicalNote: VexFlowGraphicalNote = graphicalNote as VexFlowGraphicalNote;

        //if we are forcing to one line, just set to B
        if (!this.rules.ForcePercussionVoicesOneLine) {
            if (!currentInstrumentMapping.containsKey(voiceNumber)) {
                //Direct mapping for more than one voice, position voices
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
                currentInstrumentMapping.setValue(voiceNumber, {note: fundamental, octave: octave});
            } else {
                const storageObj: {note: NoteEnum, octave: number} = currentInstrumentMapping.getValue(voiceNumber);
                fundamental = storageObj.note;
                octave = storageObj.octave;
            }
        }

        //TODO: Check for playback side effects
        vfGraphicalNote.setAccidental(new Pitch(fundamental, octave, AccidentalEnum.NONE));
        return graphicalNote;
    }
}
