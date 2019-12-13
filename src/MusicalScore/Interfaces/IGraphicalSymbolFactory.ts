import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {Note} from "../VoiceData/Note";
import {OctaveEnum} from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import {Pitch} from "../../Common/DataObjects/Pitch";
import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import { TechnicalInstruction } from "../VoiceData/Instructions/TechnicalInstruction";

export interface IGraphicalSymbolFactory {

    createNote(
        note: Note,
        graphicalVoiceEntry: any,
        activeClef: ClefInstruction,
        octaveShift: OctaveEnum,
        graphicalNoteLength: Fraction): any;

    createGraceNote(
        note: Note,
        graphicalVoiceEntry: any,
        activeClef: ClefInstruction,
        octaveShift: OctaveEnum): any;

    addGraphicalAccidental(graphicalNote: any, pitch: Pitch): void;

    addFermataAtTiedEndNote(tiedNote: Note, graphicalStaffEntry: any): void;

    createGraphicalTechnicalInstruction(
        technicalInstruction: TechnicalInstruction,
        graphicalStaffEntry: any): void;


    createInStaffClef(graphicalStaffEntry: any, clefInstruction: ClefInstruction): void;

    createChordSymbols(
        sourceStaffEntry: SourceStaffEntry,
        graphicalStaffEntry: any,
        transposeHalftones: number): void;
}
