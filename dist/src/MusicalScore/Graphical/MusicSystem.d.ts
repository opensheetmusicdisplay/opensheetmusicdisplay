import { StaffLine } from "./StaffLine";
import { Instrument } from "../Instrument";
import { Fraction } from "../../Common/DataObjects/fraction";
import { InstrumentalGroup } from "../InstrumentalGroup";
import { GraphicalMusicPage } from "./GraphicalMusicPage";
import { GraphicalLabel } from "./GraphicalLabel";
import { StaffMeasure } from "./StaffMeasure";
import { GraphicalObject } from "./GraphicalObject";
import { EngravingRules } from "./EngravingRules";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { SystemLinesEnum } from "./SystemLinesEnum";
import Dictionary from "typescript-collections/dist/lib/Dictionary";
import { GraphicalComment } from "./GraphicalComment";
import { GraphicalMarkedArea } from "./GraphicalMarkedArea";
import { SystemLine } from "./SystemLine";
import { SystemLinePosition } from "./SystemLinePosition";
export declare abstract class MusicSystem extends GraphicalObject {
    needsToBeRedrawn: boolean;
    protected parent: GraphicalMusicPage;
    protected id: number;
    protected staffLines: StaffLine[];
    protected graphicalMeasures: StaffMeasure[][];
    protected labels: Dictionary<GraphicalLabel, Instrument>;
    protected measureNumberLabels: GraphicalLabel[];
    protected maxLabelLength: number;
    protected objectsToRedraw: [Object[], Object][];
    protected instrumentBrackets: GraphicalObject[];
    protected groupBrackets: GraphicalObject[];
    protected graphicalMarkedAreas: GraphicalMarkedArea[];
    protected graphicalComments: GraphicalComment[];
    protected systemLines: SystemLine[];
    protected rules: EngravingRules;
    constructor(parent: GraphicalMusicPage, id: number);
    Parent: GraphicalMusicPage;
    StaffLines: StaffLine[];
    GraphicalMeasures: StaffMeasure[][];
    MeasureNumberLabels: GraphicalLabel[];
    Labels: GraphicalLabel[];
    ObjectsToRedraw: [Object[], Object][];
    InstrumentBrackets: GraphicalObject[];
    GroupBrackets: GraphicalObject[];
    GraphicalMarkedAreas: GraphicalMarkedArea[];
    GraphicalComments: GraphicalComment[];
    SystemLines: SystemLine[];
    Id: number;
    /**
     * This method creates the left vertical Line connecting all staves of the MusicSystem.
     * @param lineWidth
     * @param systemLabelsRightMargin
     */
    createSystemLeftLine(lineWidth: number, systemLabelsRightMargin: number): void;
    /**
     * This method creates the vertical Lines after the End of all StaffLine's Measures
     * @param xPosition
     * @param lineWidth
     * @param lineType
     * @param linePosition indicates if the line belongs to start or end of measure
     * @param measureIndex the measure index within the staffline
     * @param measure
     */
    createVerticalLineForMeasure(xPosition: number, lineWidth: number, lineType: SystemLinesEnum, linePosition: SystemLinePosition, measureIndex: number, measure: StaffMeasure): void;
    setYPositionsToVerticalLineObjectsAndCreateLines(rules: EngravingRules): void;
    calculateBorders(rules: EngravingRules): void;
    alignBeginInstructions(): void;
    GetLeftBorderAbsoluteXPosition(): number;
    GetRightBorderAbsoluteXPosition(): number;
    AddStaffMeasures(graphicalMeasures: StaffMeasure[]): void;
    GetSystemsFirstTimeStamp(): Fraction;
    GetSystemsLastTimeStamp(): Fraction;
    createInstrumentBrackets(instruments: Instrument[], staffHeight: number): void;
    createGroupBrackets(instrumentGroups: InstrumentalGroup[], staffHeight: number, recursionDepth: number): void;
    createMusicSystemLabel(instrumentLabelTextHeight: number, systemLabelsRightMargin: number, labelMarginBorderFactor: number): void;
    setMusicSystemLabelsYPosition(): void;
    checkStaffEntriesForStaffEntryLink(): boolean;
    getBottomStaffLine(topStaffLine: StaffLine): StaffLine;
    /**
     * Here the system line is generated, which acts as the container of graphical lines and dots that will be finally rendered.
     * It holds al the logical parameters of the system line.
     * @param xPosition The x position within the system
     * @param lineWidth The total x width
     * @param lineType The line type enum
     * @param linePosition indicates if the line belongs to start or end of measure
     * @param musicSystem
     * @param topMeasure
     * @param bottomMeasure
     */
    protected createSystemLine(xPosition: number, lineWidth: number, lineType: SystemLinesEnum, linePosition: SystemLinePosition, musicSystem: MusicSystem, topMeasure: StaffMeasure, bottomMeasure?: StaffMeasure): SystemLine;
    protected createLinesForSystemLine(systemLine: SystemLine): void;
    protected calcInstrumentsBracketsWidth(): number;
    protected createInstrumentBracket(rightUpper: PointF2D, rightLower: PointF2D): void;
    protected createGroupBracket(rightUpper: PointF2D, rightLower: PointF2D, staffHeight: number, recursionDepth: number): void;
    private findFirstVisibleInstrumentInInstrumentalGroup(instrumentalGroup);
    private findLastVisibleInstrumentInInstrumentalGroup(instrumentalGroup);
    private updateMusicSystemStaffLineXPosition(systemLabelsRightMargin);
}
