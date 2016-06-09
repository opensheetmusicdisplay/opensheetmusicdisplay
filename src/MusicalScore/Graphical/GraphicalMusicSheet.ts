import {MusicSheet} from "../MusicSheet";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {StaffMeasure} from "./StaffMeasure";
import {FontInfo} from "./FontInfo";
import {GraphicalMusicPage} from "./GraphicalMusicPage";
import {VerticalGraphicalStaffEntryContainer} from "./VerticalGraphicalStaffEntryContainer";
import {GraphicalLabel} from "./GraphicalLabel";
import {GraphicalLine} from "./GraphicalLine";
import {MusicSystem} from "./MusicSystem";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {PointF_2D} from "../../Common/DataObjects/PointF_2D";
import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {AbstractNotationInstruction} from "../VoiceData/Instructions/AbstractNotationInstruction";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {Fraction} from "../../Common/DataObjects/fraction";
import {GraphicalNote} from "./GraphicalNote";
import {Instrument} from "../Instrument";
import {BoundingBox} from "./BoundingBox";
import {VoiceEntry} from "../VoiceData/VoiceEntry";
import {Note} from "../VoiceData/Note";
import {MusicSheetCalculator} from "./MusicSheetCalculator";
export class GraphicalMusicSheet {
    constructor(musicSheet: MusicSheet, calculator: MusicSheetCalculator) {
        this.musicSheet = musicSheet;
        this.numberOfStaves = this.musicSheet.Staves.Count;
        this.calculator = calculator;
        this.SourceToGraphicalMeasureLinks = new Dictionary<SourceMeasure, List<StaffMeasure>>();
        this.calculator.initialize(this);
    }
    private musicSheet: MusicSheet;
    private fontInfo: FontInfo = this.FontInfo.Info;
    private calculator: MusicSheetCalculator;
    private musicPages: List<GraphicalMusicPage> = new List<GraphicalMusicPage>();
    private measureList: List<List<StaffMeasure>> = new List<List<StaffMeasure>>();
    private verticalGraphicalStaffEntryContainers: List<VerticalGraphicalStaffEntryContainer> = new List<VerticalGraphicalStaffEntryContainer>();
    private title: GraphicalLabel;
    private subtitle: GraphicalLabel;
    private composer: GraphicalLabel;
    private lyricist: GraphicalLabel;
    private scoreFollowingLines: List<GraphicalLine> = new List<GraphicalLine>();
    private maxAllowedSystemWidth: number;
    private systemImages: Dictionary<MusicSystem, SystemImageProperties> = new Dictionary<MusicSystem, SystemImageProperties>();
    private numberOfStaves: number;
    private leadSheet: boolean = false;
    public get ParentMusicSheet(): MusicSheet {
        return this.musicSheet;
    }
    public get GetCalculator(): MusicSheetCalculator {
        return this.calculator;
    }
    public get MusicPages(): List<GraphicalMusicPage> {
        return this.musicPages;
    }
    public set MusicPages(value: List<GraphicalMusicPage>) {
        this.musicPages = value;
    }
    public get FontInfo(): FontInfo {
        return this.fontInfo;
    }
    public get MeasureList(): List<List<StaffMeasure>> {
        return this.measureList;
    }
    public set MeasureList(value: List<List<StaffMeasure>>) {
        this.measureList = value;
    }
    public get VerticalGraphicalStaffEntryContainers(): List<VerticalGraphicalStaffEntryContainer> {
        return this.verticalGraphicalStaffEntryContainers;
    }
    public set VerticalGraphicalStaffEntryContainers(value: List<VerticalGraphicalStaffEntryContainer>) {
        this.verticalGraphicalStaffEntryContainers = value;
    }
    public get Title(): GraphicalLabel {
        return this.title;
    }
    public set Title(value: GraphicalLabel) {
        this.title = value;
    }
    public get Subtitle(): GraphicalLabel {
        return this.subtitle;
    }
    public set Subtitle(value: GraphicalLabel) {
        this.subtitle = value;
    }
    public get Composer(): GraphicalLabel {
        return this.composer;
    }
    public set Composer(value: GraphicalLabel) {
        this.composer = value;
    }
    public get Lyricist(): GraphicalLabel {
        return this.lyricist;
    }
    public set Lyricist(value: GraphicalLabel) {
        this.lyricist = value;
    }
    public get ScoreFollowingLines(): List<GraphicalLine> {
        return this.scoreFollowingLines;
    }
    public get MaxAllowedSystemWidth(): number {
        return this.maxAllowedSystemWidth;
    }
    public set MaxAllowedSystemWidth(value: number) {
        this.maxAllowedSystemWidth = value;
    }
    public get SystemImages(): Dictionary<MusicSystem, SystemImageProperties> {
        return this.systemImages;
    }
    public SourceToGraphicalMeasureLinks: Dictionary<SourceMeasure, List<StaffMeasure>>;
    public get NumberOfStaves(): number {
        return this.numberOfStaves;
    }
    public get LeadSheet(): boolean {
        return this.leadSheet;
    }
    public set LeadSheet(value: boolean) {
        this.leadSheet = value;
    }
    public static transformRelativeToAbsolutePosition(graphicalMusicSheet: GraphicalMusicSheet): void {
        for (var i: number = 0; i < graphicalMusicSheet.MusicPages.Count; i++) {
            var pageAbsolute: PointF_2D = graphicalMusicSheet.MusicPages[i].setMusicPageAbsolutePosition(i, graphicalMusicSheet.ParentMusicSheet.Rules);
            var page: GraphicalMusicPage = graphicalMusicSheet.MusicPages[i];
            page.PositionAndShape.calculateAbsolutePositionsRecursive(pageAbsolute.X, pageAbsolute.Y);
        }
    }
    public Initialize(): void {
        this.verticalGraphicalStaffEntryContainers.Clear();
        this.musicPages.Clear();
        this.measureList.Clear();
    }
    public reCalculate(): void {
        this.calculator.calculate();
    }
    public prepare(): void {
        this.calculator.prepareGraphicalMusicSheet();
    }
    public EnforceRedrawOfMusicSystems(): void {
        for (var idx: number = 0, len = this.musicPages.Count; idx < len; ++idx) {
            var graphicalMusicPage: GraphicalMusicPage = this.musicPages[idx];
            for (var idx2: number = 0, len2 = graphicalMusicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                var musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                musicSystem.NeedsToBeRedrawn = true;
            }
        }
    }
    public getClickedObject<T>(positionOnMusicSheet: PointF_2D): T {
        for (var idx: number = 0, len = this.MusicPages.Count; idx < len; ++idx) {
            var graphicalMusicPage: GraphicalMusicPage = this.MusicPages[idx];
            return graphicalMusicPage.PositionAndShape.getClickedObjectOfType<T>(positionOnMusicSheet);
        }
        return null;
    }
    public findGraphicalStaffEntryFromMeasureList(staffIndex: number, measureIndex: number,
        sourceStaffEntry: SourceStaffEntry): GraphicalStaffEntry {
        for (var i: number = measureIndex; i < this.measureList.Count; i++) {
            var graphicalMeasure: StaffMeasure = this.measureList[i][staffIndex];
            for (var idx: number = 0, len = graphicalMeasure.StaffEntries.Count; idx < len; ++idx) {
                var graphicalStaffEntry: GraphicalStaffEntry = graphicalMeasure.StaffEntries[idx];
                if (graphicalStaffEntry.SourceStaffEntry == sourceStaffEntry)
                    return graphicalStaffEntry;
            }
        }
        return null;
    }
    public findNextGraphicalStaffEntry(staffIndex: number, measureIndex: number,
        graphicalStaffEntry: GraphicalStaffEntry): GraphicalStaffEntry {
        var graphicalMeasure: StaffMeasure = graphicalStaffEntry.ParentMeasure;
        var graphicalStaffEntryIndex: number = graphicalMeasure.StaffEntries.IndexOf(graphicalStaffEntry);
        if (graphicalStaffEntryIndex < graphicalMeasure.StaffEntries.Count - 1) {
            return graphicalMeasure.StaffEntries[graphicalStaffEntryIndex + 1];
        }
        else if (measureIndex < this.measureList.Count - 1) {
            var nextMeasure: StaffMeasure = this.measureList[measureIndex + 1][staffIndex];
            if (nextMeasure.StaffEntries.Count > 0)
                return nextMeasure.StaffEntries[0];
        }
        return null;
    }
    public getFirstVisibleMeasuresListFromIndeces(start: number, end: number): List<StaffMeasure> {
        var graphicalMeasures: List<StaffMeasure> = new List<StaffMeasure>();
        var numberOfStaves: number = this.measureList[0].Count;
        for (var i: number = start; i <= end; i++)
            for (var j: number = 0; j < numberOfStaves; j++)
                if (this.measureList[i][j].isVisible()) {
                    graphicalMeasures.Add(this.measureList[i][j]);
                    break;
                }
        return graphicalMeasures;
    }
    public orderMeasuresByStaffLine(measures: List<StaffMeasure>): List<List<StaffMeasure>> {
        var orderedMeasures: List<List<StaffMeasure>> = new List<List<StaffMeasure>>();
        var mList: List<StaffMeasure> = new List<StaffMeasure>();
        orderedMeasures.Add(mList);
        for (var i: number = 0; i < measures.Count; i++) {
            if (i == 0)
                mList.Add(measures[0]);
            else {
                if (measures[i].ParentStaffLine == measures[i - 1].ParentStaffLine)
                    mList.Add(measures[i]);
                else {
                    if (!orderedMeasures.Contains(mList))
                        orderedMeasures.Add(mList);
                    mList = new List<StaffMeasure>();
                    orderedMeasures.Add(mList);
                    mList.Add(measures[i]);
                }
            }
        }
        return orderedMeasures;
    }
    public initializeActiveClefs(): List<ClefInstruction> {
        var activeClefs: List<ClefInstruction> = new List<ClefInstruction>();
        var firstSourceMeasure: SourceMeasure = this.musicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure != null) {
            for (var i: number = 0; i < firstSourceMeasure.CompleteNumberOfStaves; i++) {
                for (var idx: number = 0, len = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions.Count; idx < len; ++idx) {
                    var abstractNotationInstruction: AbstractNotationInstruction = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions[idx];
                    if (abstractNotationInstruction instanceof ClefInstruction) {
                        activeClefs.Add(<ClefInstruction>abstractNotationInstruction);
                    }
                }
            }
        }
        return activeClefs;
    }
    public GetMainKey(): KeyInstruction {
        var firstSourceMeasure: SourceMeasure = this.musicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure != null) {
            for (var i: number = 0; i < firstSourceMeasure.CompleteNumberOfStaves; i++) {
                for (var idx: number = 0, len = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions.Count; idx < len; ++idx) {
                    var abstractNotationInstruction: AbstractNotationInstruction = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions[idx];
                    if (abstractNotationInstruction instanceof KeyInstruction) {
                        return <KeyInstruction>abstractNotationInstruction;
                    }
                }
            }
        }
        return null;
    }
    public getOrCreateVerticalContainer(timestamp: Fraction): VerticalGraphicalStaffEntryContainer {
        if (this.verticalGraphicalStaffEntryContainers.Count == 0 || timestamp > this.verticalGraphicalStaffEntryContainers.Last().AbsoluteTimestamp) {
            var verticalGraphicalStaffEntryContainer: VerticalGraphicalStaffEntryContainer = new VerticalGraphicalStaffEntryContainer(this.numberOfStaves, timestamp);
            this.verticalGraphicalStaffEntryContainers.Add(verticalGraphicalStaffEntryContainer);
            return verticalGraphicalStaffEntryContainer;
        }
        var i: number;
        for (; i >= 0; i--) {
            if (this.verticalGraphicalStaffEntryContainers[i].AbsoluteTimestamp < timestamp) {
                var verticalGraphicalStaffEntryContainer: VerticalGraphicalStaffEntryContainer = new VerticalGraphicalStaffEntryContainer(this.numberOfStaves, timestamp);
                this.verticalGraphicalStaffEntryContainers.Insert(i + 1, verticalGraphicalStaffEntryContainer);
                return verticalGraphicalStaffEntryContainer;
            }
            if (this.verticalGraphicalStaffEntryContainers[i].AbsoluteTimestamp == timestamp)
                return this.verticalGraphicalStaffEntryContainers[i];
        }
        return null;
    }
    public GetVerticalContainerFromTimestamp(timestamp: Fraction, startIndex: number): VerticalGraphicalStaffEntryContainer {
        var index: number = this.verticalGraphicalStaffEntryContainers.BinarySearch(startIndex,
            this.verticalGraphicalStaffEntryContainers.Count - startIndex,
            new VerticalGraphicalStaffEntryContainer(0,
                timestamp),
            new VerticalGraphicalStaffEntryContainer.VgseContainerTimestampComparer());
        if (index >= 0)
            return this.verticalGraphicalStaffEntryContainers[index];
        return null;
    }
    public GetVerticalContainerFromTimestamp(timestamp: Fraction): VerticalGraphicalStaffEntryContainer {
        var index: number = this.verticalGraphicalStaffEntryContainers.BinarySearch(new VerticalGraphicalStaffEntryContainer(0, timestamp),
            new VerticalGraphicalStaffEntryContainer.VgseContainerTimestampComparer());
        if (index >= 0)
            return this.verticalGraphicalStaffEntryContainers[index];
        return null;
    }
    public GetInterpolatedIndexInVerticalContainers(musicTimestamp: Fraction): number {
        var containers: List<VerticalGraphicalStaffEntryContainer> = this.verticalGraphicalStaffEntryContainers;
        var leftIndex: number = 0;
        var rightIndex: number = containers.Count - 1;
        var foundIndex: number;
        var leftTS: Fraction = null;
        var rightTS: Fraction = null;
        if (musicTimestamp <= containers.Last().AbsoluteTimestamp) {
            while (rightIndex - leftIndex > 1) {
                var middleIndex: number = (rightIndex + leftIndex) / 2;
                if (containers[leftIndex].AbsoluteTimestamp == musicTimestamp) {
                    rightIndex = leftIndex;
                    break;
                }
                else if (containers[rightIndex].AbsoluteTimestamp == musicTimestamp) {
                    leftIndex = rightIndex;
                    break;
                }
                else if (containers[middleIndex].AbsoluteTimestamp == musicTimestamp) {
                    return this.verticalGraphicalStaffEntryContainers.IndexOf(containers[middleIndex]);
                }
                else if (containers[middleIndex].AbsoluteTimestamp > musicTimestamp) {
                    rightIndex = middleIndex;
                }
                else {
                    leftIndex = middleIndex;
                }
            }
            if (leftIndex == rightIndex)
                return this.verticalGraphicalStaffEntryContainers.IndexOf(containers[leftIndex]);
            leftTS = containers[leftIndex].AbsoluteTimestamp;
            rightTS = containers[rightIndex].AbsoluteTimestamp;
        }
        else {
            leftTS = containers.Last().AbsoluteTimestamp;
            rightTS = new Fraction(getLongestStaffEntryDuration(containers.Count - 1) + leftTS);
            rightIndex = containers.Count;
        }
        var diff: number = rightTS.RealValue - leftTS.RealValue;
        var diffTS: number = rightTS.RealValue - musicTimestamp.RealValue;
        foundIndex = rightIndex - (diffTS / diff);
        return Math.Min(foundIndex, this.verticalGraphicalStaffEntryContainers.Count);
    }
    private getLongestStaffEntryDuration(index: number): Fraction {
        var maxLength: Fraction = new Fraction(0, 1);
        for (var idx: number = 0, len = this.verticalGraphicalStaffEntryContainers[index].StaffEntries.Count; idx < len; ++idx) {
            var graphicalStaffEntry: GraphicalStaffEntry = this.verticalGraphicalStaffEntryContainers[index].StaffEntries[idx];
            if (graphicalStaffEntry == null)
                continue;
            for (var idx2: number = 0, len2 = graphicalStaffEntry.Notes.Count; idx2 < len2; ++idx2) {
                var graphicalNotes: List<GraphicalNote> = graphicalStaffEntry.Notes[idx2];
                for (var idx3: number = 0, len3 = graphicalNotes.Count; idx3 < len3; ++idx3) {
                    var note: GraphicalNote = graphicalNotes[idx3];
                    if (note.GraphicalNoteLength > maxLength)
                        maxLength = note.GraphicalNoteLength;
                }
            }
        }
        return maxLength;
    }
    public getVisibleStavesIndecesFromSourceMeasure(visibleMeasures: List<StaffMeasure>): List<number> {
        var visibleInstruments: List<Instrument> = new List<Instrument>();
        var visibleStavesIndeces: List<number> = new List<number>();
        for (var idx: number = 0, len = visibleMeasures.Count; idx < len; ++idx) {
            var graphicalMeasure: StaffMeasure = visibleMeasures[idx];
            var instrument: Instrument = graphicalMeasure.ParentStaff.ParentInstrument;
            if (!visibleInstruments.Contains(instrument))
                visibleInstruments.Add(instrument);
        }
        for (var idx: number = 0, len = visibleInstruments.Count; idx < len; ++idx) {
            var instrument: Instrument = visibleInstruments[idx];
            var index: number = this.musicSheet.GetGlobalStaffIndexOfFirstStaff(instrument);
            for (var j: number = 0; j < instrument.Staves.Count; j++)
                visibleStavesIndeces.Add(index + j);
        }
        return visibleStavesIndeces;
    }
    public getGraphicalMeasureFromSourceMeasureAndIndex(sourceMeasure: SourceMeasure, index: number): StaffMeasure {
        for (var i: number = 0; i < this.measureList.Count; i++) {
            if (this.measureList[i][0].ParentSourceMeasure == sourceMeasure)
                return this.measureList[i][index];
        }
        return null;
    }
    public getMeasureIndex(graphicalMeasure: StaffMeasure, measureIndex: number, inListIndex: number): boolean {
        measureIndex = 0;
        inListIndex = 0;
        for (; measureIndex < this.measureList.Count; measureIndex++) {
            for (var idx: number = 0, len = this.measureList[measureIndex].Count; idx < len; ++idx) {
                var measure: StaffMeasure = this.measureList[measureIndex][idx];
                if (measure == graphicalMeasure)
                    return true;
            }
        }
        return false;
    }
    public getMeasureIndex(entry: GraphicalStaffEntry, measureIndex: number, inListIndex: number): boolean {
        return this.getMeasureIndex(entry.ParentMeasure, measureIndex, inListIndex);
    }
    public GetNearesNote(clickPosition: PointF_2D, maxClickDist: PointF_2D): GraphicalNote {
        var initialSearchArea: number = 10;
        var foundNotes: List<GraphicalNote> = new List<GraphicalNote>();
        var region: BoundingBox = new BoundingBox(null);
        region.BorderLeft = clickPosition.X - initialSearchArea;
        region.BorderTop = clickPosition.Y - initialSearchArea;
        region.BorderRight = clickPosition.X + initialSearchArea;
        region.BorderBottom = clickPosition.Y + initialSearchArea;
        region.AbsolutePosition = new PointF_2D(0, 0);
        for (var idx: number = 0, len = this.MusicPages.Count; idx < len; ++idx) {
            var graphicalMusicPage: GraphicalMusicPage = this.MusicPages[idx];
            var entries: IEnumerable<GraphicalNote> = graphicalMusicPage.PositionAndShape.getObjectsInRegion<GraphicalNote>(region);
            var entriesArr: GraphicalNote[] = __as__<GraphicalNote[]>(entries, GraphicalNote[]) ?? entries.ToArray();
            if (entries == null) {
                continue;
            }
            else {
                for (var idx2: number = 0, len2 = entriesArr.length; idx2 < len2; ++idx2) {
                    var note: GraphicalNote = entriesArr[idx2];
                    if (Math.Abs(note.PositionAndShape.AbsolutePosition.X - clickPosition.X) < maxClickDist.X && Math.Abs(note.PositionAndShape.AbsolutePosition.Y - clickPosition.Y) < maxClickDist.Y)
                        foundNotes.Add(note);
                }
            }
        }
        var closest: GraphicalNote = null;
        for (var idx: number = 0, len = foundNotes.Count; idx < len; ++idx) {
            var note: GraphicalNote = foundNotes[idx];
            if (closest == null)
                closest = note;
            else {
                if (note.ParentStaffEntry.RelInMeasureTimestamp == null)
                    continue;
                var deltaNew: number = this.CalculateDistance(note.PositionAndShape.AbsolutePosition, clickPosition);
                var deltaOld: number = this.CalculateDistance(closest.PositionAndShape.AbsolutePosition, clickPosition);
                if (deltaNew < deltaOld)
                    closest = note;
            }
        }
        if (closest != null)
            return closest;
        return null;
    }
    public GetClickableLabel(clickPosition: PointF_2D): GraphicalLabel {
        var initialSearchAreaX: number = 4;
        var initialSearchAreaY: number = 4;
        var region: BoundingBox = new BoundingBox(null);
        region.BorderLeft = clickPosition.X - initialSearchAreaX;
        region.BorderTop = clickPosition.Y - initialSearchAreaY;
        region.BorderRight = clickPosition.X + initialSearchAreaX;
        region.BorderBottom = clickPosition.Y + initialSearchAreaY;
        region.AbsolutePosition = new PointF_2D(0, 0);
        for (var idx: number = 0, len = this.MusicPages.Count; idx < len; ++idx) {
            var graphicalMusicPage: GraphicalMusicPage = this.MusicPages[idx];
            var entries: GraphicalLabel[] = graphicalMusicPage.PositionAndShape.getObjectsInRegion<GraphicalLabel>(region).ToArray();
            if (entries.length != 1) {
                continue;
            }
            else {
                for (var idx2: number = 0, len2 = entries.length; idx2 < len2; ++idx2) {
                    var clickedLabel: GraphicalLabel = entries[idx2];
                    return clickedLabel;
                }
            }
        }
        return null;
    }
    public GetNearestStaffEntry(clickPosition: PointF_2D): GraphicalStaffEntry {
        var initialSearchArea: number = 10;
        var foundEntries: List<GraphicalStaffEntry> = new List<GraphicalStaffEntry>();
        var region: BoundingBox = new BoundingBox(null);
        region.BorderLeft = clickPosition.X - initialSearchArea;
        region.BorderTop = clickPosition.Y - initialSearchArea;
        region.BorderRight = clickPosition.X + initialSearchArea;
        region.BorderBottom = clickPosition.Y + initialSearchArea;
        region.AbsolutePosition = new PointF_2D(0, 0);
        for (var idx: number = 0, len = this.MusicPages.Count; idx < len; ++idx) {
            var graphicalMusicPage: GraphicalMusicPage = this.MusicPages[idx];
            var entries: GraphicalStaffEntry[] = graphicalMusicPage.PositionAndShape.getObjectsInRegion<GraphicalStaffEntry>(region, false).ToArray();
            if (entries == null || entries.Count() == 0) {
                continue;
            }
            else {
                for (var idx2: number = 0, len2 = entries.Count(); idx2 < len2; ++idx2) {
                    var gse: GraphicalStaffEntry = entries[idx2];
                    foundEntries.Add(gse);
                }
            }
        }
        var closest: GraphicalStaffEntry = null;
        for (var idx: number = 0, len = foundEntries.Count; idx < len; ++idx) {
            var gse: GraphicalStaffEntry = foundEntries[idx];
            if (closest == null)
                closest = gse;
            else {
                if (gse.RelInMeasureTimestamp == null)
                    continue;
                var deltaNew: number = this.CalculateDistance(gse.PositionAndShape.AbsolutePosition, clickPosition);
                var deltaOld: number = this.CalculateDistance(closest.PositionAndShape.AbsolutePosition, clickPosition);
                if (deltaNew < deltaOld)
                    closest = gse;
            }
        }
        if (closest != null)
            return closest;
        return null;
    }
    public GetPossibleCommentAnchor(clickPosition: PointF_2D): SourceStaffEntry {
        var entry: GraphicalStaffEntry = this.GetNearestStaffEntry(clickPosition);
        if (entry == null)
            return null;
        return entry.SourceStaffEntry;
    }
    public getClickedObjectOfType<T>(positionOnMusicSheet: PointF_2D): T {
        for (var idx: number = 0, len = this.musicPages.Count; idx < len; ++idx) {
            var page: GraphicalMusicPage = this.musicPages[idx];
            var o: Object = page.PositionAndShape.getClickedObjectOfType<T>(positionOnMusicSheet);
            if (o != null)
                return __as__<T>(o, T);
        }
        return null;
    }
    public tryGetTimestampFromPosition(positionOnMusicSheet: PointF_2D): Fraction {
        var entry: GraphicalStaffEntry = this.getClickedObjectOfType<GraphicalStaffEntry>(positionOnMusicSheet);
        if (entry == null)
            return null;
        return entry.getAbsoluteTimestamp();
    }
    public tryGetClickableLabel(positionOnMusicSheet: PointF_2D): GraphicalLabel {
        try {
            return this.GetClickableLabel(positionOnMusicSheet);
        }
        catch (ex) {
            Logger.DefaultLogger.LogError(LogLevel.NORMAL, "GraphicalMusicSheet.tryGetClickableObject",
                "positionOnMusicSheet: " + positionOnMusicSheet, ex);
        }

        return null;
    }
    public tryGetTimeStampFromPosition(positionOnMusicSheet: PointF_2D): Fraction {
        try {
            var entry: GraphicalStaffEntry = this.GetNearestStaffEntry(positionOnMusicSheet);
            if (entry == null)
                return null;
            return entry.getAbsoluteTimestamp();
        }
        catch (ex) {
            Logger.DefaultLogger.LogError(LogLevel.NORMAL, "GraphicalMusicSheet.tryGetTimeStampFromPosition",
                "positionOnMusicSheet: " + positionOnMusicSheet, ex);
        }

        return null;
    }
    private CalculateDistance(pt1: PointF_2D, pt2: PointF_2D): number {
        var deltaX: number = pt1.X - pt2.X;
        var deltaY: number = pt1.Y - pt2.Y;
        return (deltaX * deltaX) + (deltaY * deltaY);
    }
    public getStaffEntry(index: number): GraphicalStaffEntry {
        return this.getStaffEntry(this.VerticalGraphicalStaffEntryContainers[index]);
    }
    public getStaffEntry(container: VerticalGraphicalStaffEntryContainer): GraphicalStaffEntry {
        var staffEntry: GraphicalStaffEntry = null;
        try {
            for (var idx: number = 0, len = container.StaffEntries.Count; idx < len; ++idx) {
                var entry: GraphicalStaffEntry = container.StaffEntries[idx];
                if (entry == null || !entry.SourceStaffEntry.ParentStaff.ParentInstrument.Visible)
                    continue;
                if (staffEntry == null) {
                    staffEntry = entry;
                }
                else if (entry.PositionAndShape != null && staffEntry.PositionAndShape != null) {
                    if (staffEntry.PositionAndShape.RelativePosition.X > entry.PositionAndShape.RelativePosition.X)
                        staffEntry = entry;
                }
            }
        }
        catch (ex) {
            Logger.DefaultLogger.LogError(LogLevel.NORMAL, "GraphicalMusicSheet.getStaffEntry", ex);
        }

        return staffEntry;
    }
    public GetPreviousVisibleContainerIndex(index: number): number {
        for (var i: number = index - 1; i >= 0; i--) {
            var entries: List<GraphicalStaffEntry> = this.verticalGraphicalStaffEntryContainers[i].StaffEntries;
            for (var idx: number = 0, len = entries.Count; idx < len; ++idx) {
                var entry: GraphicalStaffEntry = entries[idx];
                if (entry != null && entry.SourceStaffEntry.ParentStaff.ParentInstrument.Visible)
                    return i;
            }
        }
        return -1;
    }
    public GetNextVisibleContainerIndex(index: number): number {
        for (var i: number = index + 1; i < this.verticalGraphicalStaffEntryContainers.Count; ++i) {
            var entries: List<GraphicalStaffEntry> = this.verticalGraphicalStaffEntryContainers[i].StaffEntries;
            for (var idx: number = 0, len = entries.Count; idx < len; ++idx) {
                var entry: GraphicalStaffEntry = entries[idx];
                if (entry != null && entry.SourceStaffEntry.ParentStaff.ParentInstrument.Visible)
                    return i;
            }
        }
        return -1;
    }
    public findClosestLeftStaffEntry(fractionalIndex: number, searchOnlyVisibleEntries: boolean): GraphicalStaffEntry {
        var foundEntry: GraphicalStaffEntry = null;
        var leftIndex: number = <number>Math.Floor(fractionalIndex);
        leftIndex = Math.Min(this.VerticalGraphicalStaffEntryContainers.Count - 1, leftIndex);
        for (var i: number = leftIndex; i >= 0; i--) {
            foundEntry = this.getStaffEntry(i);
            if (foundEntry != null) {
                if (searchOnlyVisibleEntries) {
                    if (foundEntry.SourceStaffEntry.ParentStaff.ParentInstrument.Visible)
                        return foundEntry;
                }
                else return foundEntry;
            }
        }
        return null;
    }
    public findClosestRightStaffEntry(fractionalIndex: number, returnOnlyVisibleEntries: boolean): GraphicalStaffEntry {
        var foundEntry: GraphicalStaffEntry = null;
        var rightIndex: number = <number>Math.Max(0, Math.Ceiling(fractionalIndex));
        for (var i: number = rightIndex; i < this.VerticalGraphicalStaffEntryContainers.Count; i++) {
            foundEntry = this.getStaffEntry(i);
            if (foundEntry != null) {
                if (returnOnlyVisibleEntries) {
                    if (foundEntry.SourceStaffEntry.ParentStaff.ParentInstrument.Visible)
                        return foundEntry;
                }
                else return foundEntry;
            }
        }
        return null;
    }
    public calculateXPositionFromTimestamp(timeStamp: Fraction, currentMusicSystem: MusicSystem): number {
        var fractionalIndex: number = this.GetInterpolatedIndexInVerticalContainers(timeStamp);
        var previousStaffEntry: GraphicalStaffEntry = this.findClosestLeftStaffEntry(fractionalIndex, true);
        var nextStaffEntry: GraphicalStaffEntry = this.findClosestRightStaffEntry(fractionalIndex, true);
        var currentTimeStamp: number = timeStamp.RealValue;
        if (previousStaffEntry == null && nextStaffEntry == null) {
            currentMusicSystem = null;
            return 0;
        }
        var previousStaffEntryMusicSystem: MusicSystem = null;
        if (previousStaffEntry != null) {
            previousStaffEntryMusicSystem = previousStaffEntry.ParentMeasure.ParentStaffLine.ParentMusicSystem;
        }
        else {
            previousStaffEntryMusicSystem = nextStaffEntry.ParentMeasure.ParentStaffLine.ParentMusicSystem;
        }
        var nextStaffEntryMusicSystem: MusicSystem = null;
        if (nextStaffEntry != null) {
            nextStaffEntryMusicSystem = nextStaffEntry.ParentMeasure.ParentStaffLine.ParentMusicSystem;
        }
        else {
            nextStaffEntryMusicSystem = previousStaffEntry.ParentMeasure.ParentStaffLine.ParentMusicSystem;
        }
        if (previousStaffEntryMusicSystem == nextStaffEntryMusicSystem) {
            currentMusicSystem = previousStaffEntryMusicSystem;
            var fraction: number;
            var previousStaffEntryPositionX: number;
            var nextStaffEntryPositionX: number;
            if (previousStaffEntry == null) {
                previousStaffEntryPositionX = nextStaffEntryPositionX = nextStaffEntry.PositionAndShape.AbsolutePosition.X;
                fraction = 0;
            }
            else if (nextStaffEntry == null) {
                previousStaffEntryPositionX = previousStaffEntry.PositionAndShape.AbsolutePosition.X;
                nextStaffEntryPositionX = currentMusicSystem.GetRightBorderAbsoluteXPosition();
                fraction = (currentTimeStamp - previousStaffEntry.getAbsoluteTimestamp().RealValue) / ((previousStaffEntry.ParentMeasure.ParentSourceMeasure.AbsoluteTimestamp + previousStaffEntry.ParentMeasure.ParentSourceMeasure.Duration).RealValue - previousStaffEntry.getAbsoluteTimestamp().RealValue);
            }
            else {
                previousStaffEntryPositionX = previousStaffEntry.PositionAndShape.AbsolutePosition.X;
                nextStaffEntryPositionX = nextStaffEntry.PositionAndShape.AbsolutePosition.X;
                if (previousStaffEntry == nextStaffEntry)
                    fraction = 0;
                else fraction = (currentTimeStamp - previousStaffEntry.getAbsoluteTimestamp().RealValue) / (nextStaffEntry.getAbsoluteTimestamp().RealValue - previousStaffEntry.getAbsoluteTimestamp().RealValue);
            }
            fraction = Math.Min(1, Math.Max(0, fraction));
            var interpolatedXPosition: number = previousStaffEntryPositionX + fraction * (nextStaffEntryPositionX - previousStaffEntryPositionX);
            return interpolatedXPosition;
        }
        else {
            var nextSystemLeftBorderTimeStamp: number = nextStaffEntry.ParentMeasure.ParentSourceMeasure.AbsoluteTimestamp.RealValue;
            var fraction: number;
            var interpolatedXPosition: number;
            if (currentTimeStamp < nextSystemLeftBorderTimeStamp) {
                currentMusicSystem = previousStaffEntryMusicSystem;
                var previousStaffEntryPositionX: number = previousStaffEntry.PositionAndShape.AbsolutePosition.X;
                var previousSystemRightBorderX: number = currentMusicSystem.GetRightBorderAbsoluteXPosition();
                fraction = (currentTimeStamp - previousStaffEntry.getAbsoluteTimestamp().RealValue) / (nextSystemLeftBorderTimeStamp - previousStaffEntry.getAbsoluteTimestamp().RealValue);
                fraction = Math.Min(1, Math.Max(0, fraction));
                interpolatedXPosition = previousStaffEntryPositionX + fraction * (previousSystemRightBorderX - previousStaffEntryPositionX);
            }
            else {
                currentMusicSystem = nextStaffEntryMusicSystem;
                var nextStaffEntryPositionX: number = nextStaffEntry.PositionAndShape.AbsolutePosition.X;
                var nextSystemLeftBorderX: number = currentMusicSystem.GetLeftBorderAbsoluteXPosition();
                fraction = (currentTimeStamp - nextSystemLeftBorderTimeStamp) / (nextStaffEntry.getAbsoluteTimestamp().RealValue - nextSystemLeftBorderTimeStamp);
                fraction = Math.Min(1, Math.Max(0, fraction));
                interpolatedXPosition = nextSystemLeftBorderX + fraction * (nextStaffEntryPositionX - nextSystemLeftBorderX);
            }
            return interpolatedXPosition;
        }
    }
    public GetNumberOfVisibleInstruments(): number {
        var visibleInstrumentCount: number = 0;
        for (var idx: number = 0, len = this.musicSheet.Instruments.Count; idx < len; ++idx) {
            var instrument: Instrument = this.musicSheet.Instruments[idx];
            if (instrument.Visible == true)
                visibleInstrumentCount++;
        }
        return visibleInstrumentCount;
    }
    public GetNumberOfFollowedInstruments(): number {
        var followedInstrumentCount: number = 0;
        for (var idx: number = 0, len = this.musicSheet.Instruments.Count; idx < len; ++idx) {
            var instrument: Instrument = this.musicSheet.Instruments[idx];
            if (instrument.Following == true)
                followedInstrumentCount++;
        }
        return followedInstrumentCount;
    }
    public GetGraphicalFromSourceMeasure(sourceMeasure: SourceMeasure): List<StaffMeasure> {
        return this.SourceToGraphicalMeasureLinks[sourceMeasure];
    }
    public GetGraphicalFromSourceStaffEntry(sourceStaffEntry: SourceStaffEntry): GraphicalStaffEntry {
        var graphicalMeasure: StaffMeasure = this.SourceToGraphicalMeasureLinks[sourceStaffEntry.VerticalContainerParent.ParentMeasure][sourceStaffEntry.ParentStaff.IdInMusicSheet];
        return graphicalMeasure.findGraphicalStaffEntryFromTimestamp(sourceStaffEntry.Timestamp);
    }
    public GetGraphicalFromSourceStaffEntry(voiceEntries: List<VoiceEntry>): GraphicalStaffEntry {
        if (voiceEntries.Count == 0)
            return null;
        var sse: SourceStaffEntry = voiceEntries[0].ParentSourceStaffEntry;
        var graphicalMeasure: StaffMeasure = this.SourceToGraphicalMeasureLinks[sse.VerticalContainerParent.ParentMeasure][sse.ParentStaff.IdInMusicSheet];
        return graphicalMeasure.findGraphicalStaffEntryFromTimestamp(sse.Timestamp);
    }
    public GetGraphicalNoteFromSourceNote(note: Note, containingGse: GraphicalStaffEntry): GraphicalNote {
        for (var idx: number = 0, len = containingGse.Notes.Count; idx < len; ++idx) {
            var graphicalNotes: List<GraphicalNote> = containingGse.Notes[idx];
            for (var idx2: number = 0, len2 = graphicalNotes.Count; idx2 < len2; ++idx2) {
                var graphicalNote: GraphicalNote = graphicalNotes[idx2];
                if (graphicalNote.SourceNote == note)
                    return graphicalNote;
            }
        }
        return null;
    }
}
export class SystemImageProperties {
    public PositionInPixels: PointF_2D;
    public SystemImageId: number;
    public System: MusicSystem;
}