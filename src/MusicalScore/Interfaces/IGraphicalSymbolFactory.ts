import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {GraphicalNote} from "../Graphical/GraphicalNote";
import {GraphicalStaffEntry} from "../Graphical/GraphicalStaffEntry";
import {MusicSystem} from "../Graphical/MusicSystem";
import {Note} from "../VoiceData/Note";
import {OctaveEnum} from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import {Pitch} from "../../Common/DataObjects/Pitch";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {Staff} from "../VoiceData/Staff";
import {StaffLine} from "../Graphical/StaffLine";
import {GraphicalMeasure} from "../Graphical/GraphicalMeasure";
import { TechnicalInstruction } from "../VoiceData/Instructions/TechnicalInstruction";
import { GraphicalVoiceEntry } from "../Graphical/GraphicalVoiceEntry";
import { VoiceEntry } from "../VoiceData/VoiceEntry";
import { EngravingRules } from "../Graphical/EngravingRules";
import { KeyInstruction } from "../VoiceData";

export interface IGraphicalSymbolFactory {

    createMusicSystem(systemIndex: number, rules: EngravingRules): MusicSystem;

    createStaffLine(parentSystem: MusicSystem, parentStaff: Staff): StaffLine;

    createGraphicalMeasure(sourceMeasure: SourceMeasure, staff: Staff): GraphicalMeasure;

    createTabStaffMeasure(sourceMeasure: SourceMeasure, staff: Staff): GraphicalMeasure;

    createExtraGraphicalMeasure(staffLine: StaffLine): GraphicalMeasure;

    createStaffEntry(sourceStaffEntry: SourceStaffEntry, measure: GraphicalMeasure): GraphicalStaffEntry;

    createVoiceEntry(parentVoiceEntry: VoiceEntry, parentStaffEntry: GraphicalStaffEntry): GraphicalVoiceEntry;

    createNote(
        note: Note,
        graphicalVoiceEntry: GraphicalVoiceEntry,
        activeClef: ClefInstruction,
        octaveShift: OctaveEnum,
        graphicalNoteLength: Fraction): GraphicalNote;

    createGraceNote(
        note: Note,
        graphicalVoiceEntry: GraphicalVoiceEntry,
        activeClef: ClefInstruction,
        octaveShift: OctaveEnum): GraphicalNote;

    addGraphicalAccidental(graphicalNote: GraphicalNote, pitch: Pitch): void;

    addFermataAtTiedEndNote(tiedNote: Note, graphicalStaffEntry: GraphicalStaffEntry): void;

    createGraphicalTechnicalInstruction(
        technicalInstruction: TechnicalInstruction,
        graphicalStaffEntry: GraphicalStaffEntry): void;


    createInStaffClef(graphicalStaffEntry: GraphicalStaffEntry, clefInstruction: ClefInstruction): void;

    createChordSymbols(
        sourceStaffEntry: SourceStaffEntry,
        graphicalStaffEntry: GraphicalStaffEntry,
        keyInstruction: KeyInstruction,
        transposeHalftones: number): void;
}
