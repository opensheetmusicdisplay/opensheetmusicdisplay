export class VexFlowGraphicalSymbolFactory implements IGraphicalSymbolFactory {
    public createMusicSystem(page: GraphicalMusicPage, systemIndex: number): MusicSystem {
        return new VexFlowMusicSystem(page, systemIndex);
    }
    public createStaffLine(parentSystem: MusicSystem, parentStaff: Staff): StaffLine {
        return new VexFlowStaffLine(parentSystem, parentStaff);
    }
    public createStaffMeasure(sourceMeasure: SourceMeasure, staff: Staff): StaffMeasure {
        var measure: VexFlowMeasure = new VexFlowMeasure(sourceMeasure, staff);
        return measure;
    }
    public createExtraStaffMeasure(staffLine: StaffLine): StaffMeasure {
        var measure: VexFlowMeasure = new VexFlowMeasure(staffLine);
        return measure;
    }
    public createStaffEntry(sourceStaffEntry: SourceStaffEntry, measure: StaffMeasure): GraphicalStaffEntry {
        return new VexFlowStaffEntry(<VexFlowMeasure>measure, sourceStaffEntry, null);
    }
    public createGraceStaffEntry(staffEntryParent: GraphicalStaffEntry, measure: StaffMeasure): GraphicalStaffEntry {
        return new VexFlowStaffEntry(<VexFlowMeasure>measure, null, <VexFlowStaffEntry>staffEntryParent);
    }
    public createNote(note: Note, numberOfDots: number, graphicalStaffEntry: GraphicalStaffEntry, activeClef: ClefInstruction, octaveShift: OctaveEnum = OctaveEnum.NONE): GraphicalNote {
        throw new NotImplementedException();
    }
    public createGraceNote(note: Note, numberOfDots: number, graphicalStaffEntry: GraphicalStaffEntry, activeClef: ClefInstruction, octaveShift: OctaveEnum = OctaveEnum.NONE): GraphicalNote {
        throw new NotImplementedException();
    }
    public addGraphicalAccidental(graphicalNote: GraphicalNote, pitch: Pitch, grace: boolean, graceScalingFactor: number): void {

    }
    public addFermataAtTiedEndNote(tiedNote: Note, graphicalStaffEntry: GraphicalStaffEntry): void {

    }
    public createGraphicalTechnicalInstruction(technicalInstruction: TechnicalInstruction, graphicalStaffEntry: GraphicalStaffEntry): void {

    }
    public createInStaffClef(graphicalStaffEntry: GraphicalStaffEntry, clefInstruction: ClefInstruction): void {

    }
    public createChordSymbol(sourceStaffEntry: SourceStaffEntry, graphicalStaffEntry: GraphicalStaffEntry, transposeHalftones: number): void {

    }
}