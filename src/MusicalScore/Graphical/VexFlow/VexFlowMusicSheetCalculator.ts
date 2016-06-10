export class VexFlowMusicSheetCalculator extends MusicSheetCalculator {
    constructor() {
        super(new VexFlowGraphicalSymbolFactory());

    }
    public calculate(): void {
        clearSystemsAndMeasures();
        clearRecreatedObjects();
        calculateXLayout(this.graphicalMusicSheet, maxInstrNameLabelLength());
        this.graphicalMusicSheet.MusicPages.Clear();
        this.calculateMusicSystems();
        this.graphicalMusicSheet.MusicPages[0].PositionAndShape.BorderMarginBottom += 9;
        GraphicalMusicSheet.transformRelativeToAbsolutePosition(this.graphicalMusicSheet);
    }
    protected calculateMeasureXLayout(measures: List<StaffMeasure>): number {
        throw new NotImplementedException();
    }
    protected calculateMusicSystems(): void {
        var measureList: List<List<StaffMeasure>> = this.graphicalMusicSheet.MeasureList.Select(ml => ml.Where(m => m.isVisible()).ToList()).ToList();
        var numberOfStaffLines: number = 0;
        for (var idx: number = 0, len = measureList.Count; idx < len; ++idx) {
            var gmlist: List<StaffMeasure> = measureList[idx];
            numberOfStaffLines = Math.Max(gmlist.Count, numberOfStaffLines);
            break;
        }
        if (numberOfStaffLines == 0)
            return
        var musicSystemBuilder: MusicSystemBuilder = new MusicSystemBuilder();
        musicSystemBuilder.initialize(this.graphicalMusicSheet, measureList, numberOfStaffLines, this.symbolFactory);
        musicSystemBuilder.buildMusicSystems();
        checkMeasuresForWholeRestNotes();
    }
    protected updateStaffLineBorders(staffLine: StaffLine): void {
        throw new NotImplementedException();
    }
    protected calculateMeasureNumberPlacement(musicSystem: MusicSystem): void {
        throw new NotImplementedException();
    }
    protected layoutVoiceEntry(voiceEntry: VoiceEntry, graphicalNotes: List<GraphicalNote>, graphicalStaffEntry: GraphicalStaffEntry, hasPitchedNote: boolean, isGraceStaffEntry: boolean): void {

    }
    protected layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {

    }
    protected calculateSystemYLayout(): void {
        for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
            var graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            if (!leadSheet) {
                for (var idx2: number = 0, len2 = graphicalMusicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                    var musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                }
            }
        }
    }
    protected initStaffMeasuresCreation(): void {

    }
    protected handleTie(tie: Tie, startGraphicalStaffEntry: GraphicalStaffEntry, staffIndex: number, measureIndex: number): void {

    }
    protected layoutGraphicalTie(tie: GraphicalTie, tieIsAtSystemBreak: boolean): void {

    }
    protected calculateSingleStaffLineLyricsPosition(staffLine: StaffLine, lyricVersesNumber: List<number>): void {
        throw new NotImplementedException();
    }
    protected calculateSingleOctaveShift(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
        throw new NotImplementedException();
    }
    protected calculateWordRepetitionInstruction(repetitionInstruction: RepetitionInstruction, measureIndex: number): void {
        throw new NotImplementedException();
    }
    protected calculateMoodAndUnknownExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
        throw new NotImplementedException();
    }
    protected createGraphicalTieNote(beams: List<Beam>, activeClef: ClefInstruction,
        octaveShiftValue: OctaveEnum, graphicalStaffEntry: GraphicalStaffEntry, duration: Fraction, numberOfDots: number,
        openTie: Tie, isLastTieNote: boolean): void {

    }
    protected handleBeam(graphicalNote: GraphicalNote, beam: Beam, openBeams: List<Beam>): void {

    }
    protected handleVoiceEntryLyrics(lyricsEntries: Dictionary<number, LyricsEntry>, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry, openLyricWords: List<LyricWord>): void {

    }
    protected handleVoiceEntryOrnaments(ornamentContainer: OrnamentContainer, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {

    }
    protected handleVoiceEntryArticulations(articulations: List<ArticulationEnum>, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {

    }
    protected handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet, openTuplets: List<Tuplet>): void {

    }
}