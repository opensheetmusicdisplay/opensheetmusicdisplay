export interface IGraphicalSymbolFactory {
    createMusicSystem(page: GraphicalMusicPage, systemIndex: number): MusicSystem;
    createStaffLine(parentSystem: MusicSystem, parentStaff: Staff): StaffLine;
    createStaffMeasure(sourceMeasure: SourceMeasure, staff: Staff): StaffMeasure;
    createExtraStaffMeasure(staffLine: StaffLine): StaffMeasure;
    createStaffEntry(sourceStaffEntry: SourceStaffEntry, measure: StaffMeasure): GraphicalStaffEntry;
    createGraceStaffEntry(staffEntryParent: GraphicalStaffEntry, measure: StaffMeasure): GraphicalStaffEntry;
    createNote(note: Note, numberOfDots: number, graphicalStaffEntry: GraphicalStaffEntry, activeClef: ClefInstruction,
        octaveShift: OctaveEnum = OctaveEnum.NONE): GraphicalNote;
    createGraceNote(note: Note, numberOfDots: number, graphicalStaffEntry: GraphicalStaffEntry, activeClef: ClefInstruction,
        octaveShift: OctaveEnum = OctaveEnum.NONE): GraphicalNote;
    addGraphicalAccidental(graphicalNote: GraphicalNote, pitch: Pitch, grace: boolean, graceScalingFactor: number): void;
    addFermataAtTiedEndNote(tiedNote: Note, graphicalStaffEntry: GraphicalStaffEntry): void;
    createGraphicalTechnicalInstruction(technicalInstruction: TechnicalInstruction,
        graphicalStaffEntry: GraphicalStaffEntry): void;
    createInStaffClef(graphicalStaffEntry: GraphicalStaffEntry, clefInstruction: ClefInstruction): void;
    createChordSymbol(sourceStaffEntry: SourceStaffEntry, graphicalStaffEntry: GraphicalStaffEntry,
        transposeHalftones: number): void;
}
