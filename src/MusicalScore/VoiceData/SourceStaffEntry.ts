import {Fraction} from "../../Common/DataObjects/Fraction";
import {VerticalSourceStaffEntryContainer} from "./VerticalSourceStaffEntryContainer";
import {Staff} from "./Staff";
import {AbstractNotationInstruction} from "./Instructions/AbstractNotationInstruction";
import {VoiceEntry} from "./VoiceEntry";
import {Note} from "./Note";
import {StaffEntryLink} from "./StaffEntryLink";
import {ChordSymbolContainer} from "./ChordSymbolContainer";
import {ClefInstruction} from "./Instructions/ClefInstruction";
import {KeyInstruction} from "./Instructions/KeyInstruction";
import {RhythmInstruction} from "./Instructions/RhythmInstruction";

/**
 * A [[SourceStaffEntry]] is a container spanning all the [[VoiceEntry]]s at one timestamp for one [[StaffLine]].
 */
export class SourceStaffEntry {
    constructor(verticalContainerParent: VerticalSourceStaffEntryContainer, parentStaff: Staff) {
        this.verticalContainerParent = verticalContainerParent;
        this.parentStaff = parentStaff;
    }

    private parentStaff: Staff;
    private verticalContainerParent: VerticalSourceStaffEntryContainer;
    private voiceEntries: VoiceEntry[] = [];
    private staffEntryLink: StaffEntryLink;
    private instructions: AbstractNotationInstruction[] = [];
    private chordSymbolContainer: ChordSymbolContainer;

    public get ParentStaff(): Staff {
        return this.parentStaff;
    }

    public get VerticalContainerParent(): VerticalSourceStaffEntryContainer {
        return this.verticalContainerParent;
    }

    public get Timestamp(): Fraction {
        if (this.VerticalContainerParent !== undefined) {
            return this.VerticalContainerParent.Timestamp;
        }
        return undefined;
    }

    public get AbsoluteTimestamp(): Fraction {
        if (this.VerticalContainerParent !== undefined) {
            return Fraction.plus(this.VerticalContainerParent.ParentMeasure.AbsoluteTimestamp, this.VerticalContainerParent.Timestamp);
        }
        return undefined;
    }

    public get VoiceEntries(): VoiceEntry[] {
        return this.voiceEntries;
    }

    public set VoiceEntries(value: VoiceEntry[]) {
        this.voiceEntries = value;
    }

    public get Link(): StaffEntryLink {
        return this.staffEntryLink;
    }

    public set Link(value: StaffEntryLink) {
        this.staffEntryLink = value;
    }

    public get Instructions(): AbstractNotationInstruction[] {
        return this.instructions;
    }

    public set Instructions(value: AbstractNotationInstruction[]) {
        this.instructions = value;
    }

    public get ChordContainer(): ChordSymbolContainer {
        return this.chordSymbolContainer;
    }

    public set ChordContainer(value: ChordSymbolContainer) {
        this.chordSymbolContainer = value;
    }

    // public removeAllInstructionsOfType(type: AbstractNotationInstruction): number {
    //     let i: number = 0;
    //     let ret: number = 0;
    //     while (i < this.instructions.length) {
    //         let instruction: AbstractNotationInstruction = this.instructions[i];
    //         if (instruction instanceof type) {
    //             this.instructions.splice(i, 1);
    //             ret++;
    //         } else {
    //             i++;
    //         }
    //     }
    //     return ret;
    // }
    //
    // public removeFirstInstructionOfType(type: AbstractNotationInstruction): boolean {
    //     for (let i: number = 0; i < this.instructions.length; i++) {
    //         if (this.instructions[i] instanceof type) {
    //             this.instructions.splice(i, 1);
    //             return true;
    //         }
    //     }
    //     return false;
    // }

    public removeAllInstructionsOfTypeClefInstruction(): number {
        let i: number = 0;
        let ret: number = 0;
        while (i < this.instructions.length) {
            if (this.instructions[i] instanceof ClefInstruction) {
                this.instructions.splice(i, 1);
                ret++;
            } else {
                i++;
            }
        }
        return ret;
    }

    /**
     * Similar to RemoveAllInstructionsOfType but faster,
     * because it stops searching when the first instruction of the given type is found.
     * @returns {boolean}
     */
    public removeFirstInstructionOfTypeClefInstruction(): boolean {
        for (let i: number = 0; i < this.instructions.length; i++) {
            if (this.instructions[i] instanceof ClefInstruction) {
                this.instructions.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    public removeAllInstructionsOfTypeKeyInstruction(): number {
        let i: number = 0;
        let ret: number = 0;
        while (i < this.instructions.length) {
            if (this.instructions[i] instanceof KeyInstruction) {
                this.instructions.splice(i, 1);
                ret++;
            } else {
                i++;
            }
        }
        return ret;
    }

    /**
     * Similar to RemoveAllInstructionsOfType but faster,
     * because it stops searching when the first instruction of the given type is found.
     * @returns {boolean}
     */
    public removeFirstInstructionOfTypeKeyInstruction(): boolean {
        for (let i: number = 0; i < this.instructions.length; i++) {
            if (this.instructions[i] instanceof KeyInstruction) {
                this.instructions.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    public removeAllInstructionsOfTypeRhythmInstruction(): number {
        let i: number = 0;
        let ret: number = 0;
        while (i < this.instructions.length) {
            if (this.instructions[i] instanceof RhythmInstruction) {
                this.instructions.splice(i, 1);
                ret++;
            } else {
                i++;
            }
        }
        return ret;
    }

    public removeFirstInstructionOfTypeRhythmInstruction(): boolean {
        for (let i: number = 0; i < this.instructions.length; i++) {
            if (this.instructions[i] instanceof RhythmInstruction) {
                this.instructions.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * Calculate the [[SourceStaffEntry]]'s minimum NoteLength.
     * @returns {Fraction}
     */
    public calculateMinNoteLength(): Fraction {
        let duration: Fraction = new Fraction(Number.MAX_VALUE, 1);
        for (let idx: number = 0, len: number = this.VoiceEntries.length; idx < len; ++idx) {
            const voiceEntry: VoiceEntry = this.VoiceEntries[idx];
            for (let idx2: number = 0, len2: number = voiceEntry.Notes.length; idx2 < len2; ++idx2) {
                const note: Note = voiceEntry.Notes[idx2];
                if (note.Length.lt(duration)) {
                    duration = note.Length;
                }
            }
        }
        return duration;
    }

    public calculateMaxNoteLength(): Fraction {
        let duration: Fraction = new Fraction(0, 1);
        for (let idx: number = 0, len: number = this.VoiceEntries.length; idx < len; ++idx) {
            const voiceEntry: VoiceEntry = this.VoiceEntries[idx];
            for (let idx2: number = 0, len2: number = voiceEntry.Notes.length; idx2 < len2; ++idx2) {
                const note: Note = voiceEntry.Notes[idx2];
                if (note.NoteTie !== undefined) {
                    // only add notes from this and after this sse!!
                    const tieRestDuration: Fraction = Fraction.createFromFraction(note.Length);
                    let addFollowingNotes: boolean = false;
                    for (const n of note.NoteTie.Notes) {
                        if (n === note) {
                            addFollowingNotes = true;
                            continue;
                        }
                        if (addFollowingNotes) {
                            tieRestDuration.Add(n.Length);
                        }
                    }
                    if (duration.lt(tieRestDuration)) {
                        duration = tieRestDuration;
                    }
                } else if (duration.lt(note.Length)) {
                    duration = note.Length;
                }
            }
        }
        return duration;
    }

    public hasNotes(): boolean {
        for (let idx: number = 0, len: number = this.VoiceEntries.length; idx < len; ++idx) {
            const voiceEntry: VoiceEntry = this.VoiceEntries[idx];
            if (voiceEntry.Notes.length > 0) {
                return true;
            }
        }
        return false;
    }

    public hasTie(): boolean {
        for (let idx: number = 0, len: number = this.VoiceEntries.length; idx < len; ++idx) {
            const voiceEntry: VoiceEntry = this.VoiceEntries[idx];
            if (voiceEntry.hasTie()) {
                return true;
            }
        }
        return false;
    }

    public findLinkedNotes(linkedNotes: Note[]): void {
        for (let idx: number = 0, len: number = this.voiceEntries.length; idx < len; ++idx) {
            const voiceEntry: VoiceEntry = this.voiceEntries[idx];
            for (let idx2: number = 0, len2: number = voiceEntry.Notes.length; idx2 < len2; ++idx2) {
                const note: Note = voiceEntry.Notes[idx2];
                if (note.ParentStaffEntry === this) {
                    linkedNotes.push(note);
                }
            }
        }
    }
}
