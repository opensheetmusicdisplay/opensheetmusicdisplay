import {Note} from "../VoiceData/Note";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {OctaveEnum} from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import {AccidentalEnum, Pitch} from "../../Common/DataObjects/Pitch";
import {GraphicalObject} from "./GraphicalObject";
import {MusicSheetCalculator} from "./MusicSheetCalculator";
import {BoundingBox} from "./BoundingBox";
import {GraphicalVoiceEntry} from "./GraphicalVoiceEntry";
import {GraphicalMusicPage} from "./GraphicalMusicPage";
import { EngravingRules } from "./EngravingRules";

/**
 * The graphical counterpart of a [[Note]]
 */
export class GraphicalNote extends GraphicalObject {
    constructor(note: Note, parent: GraphicalVoiceEntry, rules: EngravingRules, graphicalNoteLength: Fraction = undefined) {
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
        this.rules = rules;
        this.rules.addGraphicalNoteToNoteMap(note, this);
    }

    public sourceNote: Note;
    public DrawnAccidental: AccidentalEnum = AccidentalEnum.NONE;
    public graphicalNoteLength: Fraction;
    public parentVoiceEntry: GraphicalVoiceEntry;
    public numberOfDots: number;
    public rules: EngravingRules;
    public staffLine: number;
    public baseFingeringXOffset: number;
    public baseStringNumberXOffset: number;
    public lineShift: number = 0;

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
      if (!this.sourceNote || !this.sourceNote.NoteTuplet) {
        return fraction.calculateNumberOfNeededDots();
      }
      return 0;
    }

    public get ParentMusicPage(): GraphicalMusicPage {
      return this.parentVoiceEntry.parentStaffEntry.parentMeasure.ParentMusicSystem?.Parent;
    }

    /** Get a GraphicalNote from a Note. Use osmd.rules as the second parameter (instance reference).
     *  Also more easily available via osmd.rules.GNote(note). */
    public static FromNote(note: Note, rules: EngravingRules): GraphicalNote {
      return rules.NoteToGraphicalNoteMap.getValue(note.NoteToGraphicalNoteObjectId);
    }

    public ToStringShort(octaveOffset: number = 0): string {
      return this.sourceNote?.ToStringShort(octaveOffset);
    }
    public get ToStringShortGet(): string {
      return this.ToStringShort(0);
    }

    public getLyricsSVGs(): HTMLElement[] {
      const lyricsEntries: HTMLElement[] = [];
      for (const lyricsEntry of this.parentVoiceEntry?.parentStaffEntry.LyricsEntries) {
        lyricsEntries.push(lyricsEntry.GraphicalLabel?.SVGNode as HTMLElement);
      }
      return lyricsEntries;
    }

    /** Change the color of a note (without re-rendering). See ColoringOptions for options like applyToBeams etc.
     * This requires the SVG backend (default, instead of canvas backend).
     */
    public setColor(color: string, coloringOptions: ColoringOptions): void {
      // implemented in VexFlowGraphicalNote
    }

    /** Toggle visibility of the note, making it and its stem and beams invisible for `false`.
     * By default, this will also hide the note's slurs and ties (see visibilityOptions).
     * (This only works with the default SVG backend, not with the Canvas backend/renderer)
     * To get a GraphicalNote from a Note, use osmd.EngravingRules.GNote(note).
     */
    public setVisible(visible: boolean, visibilityOptions: VisibilityOptions = {}): void {
      // implemented in VexFlowGraphicalNote
    }
}

/** Coloring options for VexFlowGraphicalNote.setColor(). */
export interface ColoringOptions {
  applyToBeams?: boolean;
  applyToFlag?: boolean;
  applyToLedgerLines?: boolean;
  applyToLyrics?: boolean;
  applyToModifiers?: boolean;
  applyToNoteheads?: boolean;
  applyToSlurs?: boolean;
  applyToStem?: boolean;
  applyToTies?: boolean;
}

/** Visibility options for VexFlowGraphicalNote.setVisible().
 * E.g. if setVisible(false, {applyToTies: false}), everything about a note will be invisible except its ties.
 * */
export interface VisibilityOptions {
  applyToBeams?: boolean;
  applyToLedgerLines?: boolean;
  applyToNotehead?: boolean;
  applyToSlurs?: boolean;
  applyToStem?: boolean;
  applyToTies?: boolean;
}
