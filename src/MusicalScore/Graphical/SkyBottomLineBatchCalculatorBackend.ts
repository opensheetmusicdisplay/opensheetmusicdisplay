import { EngravingRules } from "./EngravingRules";
import { SkyBottomLineCalculationResult } from "./SkyBottomLineCalculationResult";
import { CanvasVexFlowBackend } from "./VexFlow/CanvasVexFlowBackend";
import { VexFlowMeasure } from "./VexFlow/VexFlowMeasure";
import log from "loglevel";

/**
 * SkyBottomLineBatchCalculatorBackend renders measures in a borderless table.
 * This interface contains the configuration for the table returned by classes
 * implementing SkyBottomLineBatchCalculatorBackend. The height of a cell is
 * set to a fixed value by SkyBottomLineBatchCalculatorBackend.
 */
 export interface ISkyBottomLineBatchCalculatorBackendTableConfiguration {
    /** The width of each cell */
    elementWidth: number;
    /** The number of cell in a row */
    numColumns: number;
    /** The number of cell in a column */
    numRows: number;
}

/**
 * This class calculates the sky lines and the bottom lines for multiple stafflines.
 */
export abstract class SkyBottomLineBatchCalculatorBackend {
    /** The canvas where the measures are to be drawn in */
    private readonly canvas: CanvasVexFlowBackend;
    /** The measures to draw */
    private readonly measures: VexFlowMeasure[];
    /** The width of the widest measure */
    private readonly maxWidth: number;
    /**
     * The default height used by CanvasVexFlowBackend. Update this value when the
     * default height value of CanvasVexFlowBackend.initializeHeadless is updated.
     * This value is used as a height of each cell in the table rendered by this class.
     */
    private readonly elementHeight: number = 300;
    /**
     * The table configuration returned by getPreferredRenderingConfiguration. This value
     * is set after initialize() returns.
     */
    private tableConfiguration: ISkyBottomLineBatchCalculatorBackendTableConfiguration;

    constructor(rules: EngravingRules, measures: VexFlowMeasure[]) {
        this.canvas = new CanvasVexFlowBackend(rules);
        this.measures = measures;
        this.maxWidth = Math.max(...this.measures.map(measure => {
            let width: number = measure.getVFStave().getWidth();
            if (!(width > 0) && !measure.IsExtraGraphicalMeasure) {
                log.warn("SkyBottomLineBatchCalculatorBackend: width not > 0 in measure " + measure.MeasureNumber);
                width = 50;
            }
            return width;
        }));
    }

    /**
     * This method returns the configuration for the table where the measures are to be rendered.
     * @param maxWidth the width of the widest measure
     * @param elementHeight the height of each cell
     */
    protected abstract getPreferredRenderingConfiguration(
        maxWidth: number,
        elementHeight: number
    ): ISkyBottomLineBatchCalculatorBackendTableConfiguration;

    /**
     * This method allocates resources required by the implementation class.
     * @param tableConfiguration the table configuration returned by getPreferredRenderingConfiguration
     */
    protected abstract onInitialize(tableConfiguration: ISkyBottomLineBatchCalculatorBackendTableConfiguration): void;

    /**
     * This method allocates required resources for the calculation.
     */
    public initialize(): void {
        this.tableConfiguration = this.getPreferredRenderingConfiguration(this.maxWidth, this.elementHeight);
        if (this.tableConfiguration.elementWidth < this.maxWidth) {
            log.warn("SkyBottomLineBatchCalculatorBackend: elementWidth in tableConfiguration is less than the width of widest measure");
        }

        const width: number = this.tableConfiguration.elementWidth * this.tableConfiguration.numColumns;
        const height: number = this.elementHeight * this.tableConfiguration.numRows;
        this.canvas.initializeHeadless(width, height);
        this.onInitialize(this.tableConfiguration);
    }

    /**
     * This method calculates the skylines and the bottom lines for the measures rendered in the given canvas.
     * @param canvas the canvas where the measures are rendered
     * @param context the drawing context of canvas
     * @param measures the rendered measures
     * @param tableConfiguration the table configuration returned by getPreferredRenderingConfiguration
     */
    protected abstract calculateFromCanvas(
        canvas: HTMLCanvasElement,
        context: Vex.Flow.CanvasContext,
        measures: VexFlowMeasure[],
        tableConfiguration: ISkyBottomLineBatchCalculatorBackendTableConfiguration
    ): SkyBottomLineCalculationResult[];

    /**
     * This method calculates the skylines and the bottom lines for the measures passed to the constructor.
     */
    public calculateLines(): SkyBottomLineCalculationResult[]
    {
        const { numColumns, numRows, elementWidth } = this.tableConfiguration;
        const elementHeight: number = this.elementHeight;
        const numElementsPerTable: number = numColumns * numRows;

        const context: Vex.Flow.CanvasContext = this.canvas.getContext();
        const canvasElement: HTMLCanvasElement = this.canvas.getCanvas() as HTMLCanvasElement;

        const results: SkyBottomLineCalculationResult[] = [];
        for (let i: number = 0; i < this.measures.length; i += numElementsPerTable) {
            context.clear();

            const measures: VexFlowMeasure[] = this.measures.slice(i, i + numElementsPerTable);

            for (let j: number = 0; j < measures.length; ++j) {
                const measure: VexFlowMeasure = measures[j];
                const vsStaff: Vex.Flow.Stave = measure.getVFStave();

                // (u, v) is the position of measure in the table
                const u: number = j % numColumns;
                const v: number = Math.floor(j / numColumns);

                let currentWidth: number = vsStaff.getWidth();
                if (!(currentWidth > 0) && !measure.IsExtraGraphicalMeasure) {
                    currentWidth = 50;
                }
                currentWidth = Math.floor(currentWidth);

                // must calculate first AbsolutePositions
                measure.PositionAndShape.calculateAbsolutePositionsRecursive(0, 0);

                vsStaff.setX(u * elementWidth);
                // The magic number 100 is an offset from the top image border so that
                // elements above the staffline can be drawn correctly.
                vsStaff.setY(v * elementHeight + ((<any>vsStaff).y as number) + 100);
                const oldMeasureWidth: number = vsStaff.getWidth();
                // We need to tell the VexFlow stave about the canvas width. This looks
                // redundant because it should know the canvas but somehow it doesn't.
                // Maybe I am overlooking something but for now this does the trick
                vsStaff.setWidth(currentWidth);
                measure.format();
                vsStaff.setWidth(oldMeasureWidth);

                try {
                    measure.draw(context);
                    // Vexflow errors can happen here, then our complete rendering loop would halt without catching errors.
                } catch (ex) {
                    log.warn("SkyBottomLineBatchCalculatorBackend.calculateLines.draw", ex);
                }
            }

            results.push(...this.calculateFromCanvas(canvasElement, context, measures, this.tableConfiguration));
        }

        return results;
    }
}
