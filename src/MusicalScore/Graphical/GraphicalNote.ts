import {Note} from "../VoiceData/Note";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {OctaveEnum} from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import {Pitch} from "../../Common/DataObjects/Pitch";
import {GraphicalObject} from "./GraphicalObject";
import {MusicSheetCalculator} from "./MusicSheetCalculator";
import {BoundingBox} from "./BoundingBox";
import {GraphicalVoiceEntry} from "./GraphicalVoiceEntry";
import {GraphicalMusicPage} from "./GraphicalMusicPage";

/**
 * The graphical counterpart of a [[Note]]
 */
export class GraphicalNote extends GraphicalObject {
    constructor(note: Note, parent: GraphicalVoiceEntry, graphicalNoteLength: Fraction = undefined) {
        super();
        this.sourceNote = note;
        this.parentVoiceEntry = parent;
        this.PositionAndShape = new BoundingBox(this, parent.PositionAndShape);
        if (graphicalNoteLength) {
            this.graphicalNoteLength = graphicalNoteLength;
        } else {
            this.graphicalNoteLength = note.Length;
        }

        this.numberOfDots = this.calculateNumberOfNeededDots(this.graphicalNoteLength);
    }

    public sourceNote: Note;
    public graphicalNoteLength: Fraction;
    public parentVoiceEntry: GraphicalVoiceEntry;
    public numberOfDots: number;

    public Transpose(keyInstruction: KeyInstruction, activeClef: ClefInstruction, halfTones: number, octaveEnum: OctaveEnum): Pitch {
        let transposedPitch: Pitch = this.sourceNote.Pitch;
        if (MusicSheetCalculator.transposeCalculator) {
            transposedPitch = MusicSheetCalculator.transposeCalculator.transposePitch(this.sourceNote.Pitch, keyInstruction, halfTones);
        }
        return transposedPitch;
    }

    /**
     * Return the number of dots needed to represent the given fraction.
     * @param fraction
     * @returns {number}
     */
    private calculateNumberOfNeededDots(fraction: Fraction): number {
      let num: number = 1;
      let product: number = 2;
      const expandedNumerator: number = fraction.GetExpandedNumerator();
      if (!this.sourceNote || !this.sourceNote.NoteTuplet) {
        while (product < expandedNumerator) {
          num++;
          product = Math.pow(2, num);
        }
      }
      return Math.min(3, num - 1);
    }

    public get ParentMusicPage(): GraphicalMusicPage {
      return this.parentVoiceEntry.parentStaffEntry.parentMeasure.ParentMusicSystem.Parent;
    }
}
