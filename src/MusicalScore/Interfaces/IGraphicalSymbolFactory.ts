import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {GraphicalMusicPage} from "../Graphical/GraphicalMusicPage";
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

export interface IGraphicalSymbolFactory {

    createMusicSystem(page: GraphicalMusicPage, systemIndex: number): MusicSystem;

    createStaffLine(parentSystem: MusicSystem, parentStaff: Staff): StaffLine;

    createGraphicalMeasure(sourceMeasure: SourceMeasure, staff: Staff): GraphicalMeasure;

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

    createChordSymbol(
        sourceStaffEntry: SourceStaffEntry,
        graphicalStaffEntry: GraphicalStaffEntry,
        transposeHalftones: number): void;
}
