import { IStafflineNoteCalculator } from "../../Interfaces/IStafflineNoteCalculator";
import { GraphicalNote } from "../GraphicalNote";
import { ClefInstruction, ClefEnum, StemDirectionType } from "../../VoiceData";
import { Pitch, NoteEnum, AccidentalEnum } from "../../../Common";
import { VexFlowGraphicalNote } from "./VexFlowGraphicalNote";

export class VexflowStafflineNoteCalculator implements IStafflineNoteCalculator {
    public positionNote(graphicalNote: GraphicalNote, currentClef: ClefInstruction, stafflineCount: number): GraphicalNote {
        if (!(graphicalNote instanceof VexFlowGraphicalNote) || currentClef.ClefType !== ClefEnum.percussion) {
            return graphicalNote;
        }

        const vfGraphicalNote: VexFlowGraphicalNote = graphicalNote as VexFlowGraphicalNote;
        const voiceCount: number = graphicalNote.parentVoiceEntry.parentStaffEntry.sourceStaffEntry.ParentStaff.Voices.length;
        const voiceNumber: number = graphicalNote.parentVoiceEntry.parentVoiceEntry.ParentVoice.VoiceId;
        let fundamental: NoteEnum = NoteEnum.B;
        let octave: number = 1;
        let renderPitch: Pitch = undefined;
        let i: number = Pitch.pitchEnumValues.indexOf(fundamental);
        let direction: boolean = true;

        if (voiceCount > 1) {
            if (voiceNumber > 1) {
                if (vfGraphicalNote.sourceNote.StemDirectionXml === StemDirectionType.Up) {
                    i += voiceNumber;
                    direction = true;
                } else {
                    i -= voiceNumber;
                    direction = false;
                }
            }
        }
        const wrapAround: {value: number, overflow: number} = this.progressPitch(fundamental, i, direction);
        fundamental = wrapAround.value;
        octave += wrapAround.overflow;

        renderPitch = new Pitch(fundamental, octave, AccidentalEnum.NONE);
        if (renderPitch !== undefined) {
            vfGraphicalNote.setAccidental(renderPitch);
        }
        return graphicalNote;
    }

    private progressPitch(fundamental: NoteEnum, idx: number, direction: boolean): { value: number; overflow: number; } {
        //Get the number of fundamentals up that the voice will render
        idx = idx % Pitch.pitchEnumValues.length;
        const newFundamental: NoteEnum = Pitch.pitchEnumValues[idx];
        let halfToneDiff: number = 0;
        //need the correct direction
        if (direction) {
            if (newFundamental < fundamental) {
                halfToneDiff = (12 - fundamental) + newFundamental;
            } else {
                halfToneDiff = fundamental - newFundamental;
            }
        } else {
            if (newFundamental > fundamental) {
                halfToneDiff = (12 - newFundamental) + fundamental;
            } else {
                halfToneDiff = fundamental - newFundamental;
            }
        }
        //check for a wrap around
        return Pitch.WrapAroundCheck((fundamental - halfToneDiff), 12);
    }
}
