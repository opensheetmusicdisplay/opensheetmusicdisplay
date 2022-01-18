import {Note} from "./Note";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { Pitch } from "../../Common/DataObjects/Pitch";
import { TieTypes } from "../../Common/Enums/";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import log from "loglevel";

/**
 * A [[Tie]] connects two notes of the same pitch and name, indicating that they have to be played as a single note.
 */
export class Tie {

    constructor(note: Note, type: TieTypes) {
        this.AddNote(note);
        this.type = type;
    }

    private notes: Note[] = [];
    private type: TieTypes;
    public TieNumber: number = 1;
    public TieDirection: PlacementEnum = PlacementEnum.NotYetDefined;
    /** Can contain tie directions at certain note indices.
     *  For example, if it contains {2: PlacementEnum.Below}, then
     *  the tie should go downwards from Tie.Notes[2] onwards,
     *  even if tie.TieDirection is PlacementEnum.Above (tie starts going up on Notes[0]).
     */
    public NoteIndexToTieDirection: NoteIndexToPlacementEnum = {};

    public getTieDirection(startNote?: Note): PlacementEnum {
        if (!startNote) {
            return this.TieDirection;
        }
        for (let i: number = 0; i < this.Notes.length; i++) {
            const tieNote: Note = this.Notes[i];
            if (tieNote === startNote) {
                const directionAtIndex: PlacementEnum = this.NoteIndexToTieDirection[i];
                if (directionAtIndex) {
                    return directionAtIndex;
                } else {
                    return this.TieDirection;
                }
            }
        }
        log.debug("tie.getTieDuration note not in tie.Notes");
        // ^ happens in Christbaum measure 19 - probably note sharing stem
        return this.TieDirection;
    }

    public get Notes(): Note[] {
        return this.notes;
    }

    public get Type(): TieTypes {
        return this.type;
    }

    public get StartNote(): Note {
        return this.notes[0];
    }

    public get Duration(): Fraction {
        const duration: Fraction = new Fraction();
        for (const note of this.notes) {
            duration.Add(note.Length);
        }
        return duration;
    }

    public get Pitch(): Pitch {
        return this.StartNote.Pitch;
    }

    public AddNote(note: Note): void {
        this.notes.push(note);
        note.NoteTie = this;
    }
}

export interface NoteIndexToPlacementEnum {
    [key: number]: PlacementEnum;
  }
