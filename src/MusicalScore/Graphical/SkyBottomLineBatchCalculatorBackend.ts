import Vex from "vexflow";
import VF = Vex.Flow;
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
 export interface ISkyBottomLineBatchCalculatorBackendPartialTableConfiguration {
    /** The width of each cell */
    elementWidth: number;
    /** The number of cell in a row */
    numColumns: number;
    /** The number of cell in a column */
    numRows: number;
}

/**
 * This interface contains the complete configuration for the table rendered by
 * SkyBottomLineBatchCalculatorBackend,
 */
export interface ISkyBottomLineBatchCalculatorBackendTableConfiguration
    extends ISkyBottomLineBatchCalculatorBackendPartialTableConfiguration {
    /** The height of each cell determined by SkyBottomLineBatchCalculatorBackend */
    elementHeight: number;
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
    /** The samplingUnit from the EngravingRules */
    private readonly samplingUnit: number;
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
        this.samplingUnit = rules.SamplingUnit;
    }

    /**
     * This method returns the configuration for the table where the measures are to be rendered.
     * @param maxWidth the width of the widest measure
     * @param elementHeight the height of each cell
     */
    protected abstract getPreferredRenderingConfiguration(
        maxWidth: number,
        elementHeight: number
    ): ISkyBottomLineBatchCalculatorBackendPartialTableConfiguration;

    /**
     * This method allocates resources required by the implementation class.
     * @param tableConfiguration the table configuration returned by getPreferredRenderingConfiguration
     */
    protected abstract onInitialize(tableConfiguration: ISkyBottomLineBatchCalculatorBackendTableConfiguration): void;

    /**
     * This method allocates required resources for the calculation.
     */
    public initialize(): SkyBottomLineBatchCalculatorBackend {
        this.tableConfiguration = {
            ...this.getPreferredRenderingConfiguration(this.maxWidth, this.elementHeight),
            elementHeight: this.elementHeight
        };
        if (this.tableConfiguration.numRows < 1 || this.tableConfiguration.numColumns < 1) {
            log.warn("SkyBottomLineBatchCalculatorBackend: numRows or numColumns in tableConfiguration is 0");
            throw new Error("numRows or numColumns in tableConfiguration is 0");
        }

        if (this.tableConfiguration.elementWidth < this.maxWidth) {
            log.warn("SkyBottomLineBatchCalculatorBackend: elementWidth in tableConfiguration is less than the width of widest measure");
        }

        const width: number = this.tableConfiguration.elementWidth * this.tableConfiguration.numColumns;
        const height: number = this.elementHeight * this.tableConfiguration.numRows;
        this.canvas.initializeHeadless(width, height);
        this.onInitialize(this.tableConfiguration);

        return this;
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
        context: VF.CanvasContext,
        measures: VexFlowMeasure[],
        samplingUnit: number,
        tableConfiguration: ISkyBottomLineBatchCalculatorBackendTableConfiguration
    ): SkyBottomLineCalculationResult[];

    /**
     * This method calculates the skylines and the bottom lines for the measures passed to the constructor.
     */
    public calculateLines(): SkyBottomLineCalculationResult[] {
        const debugTmpCanvas: boolean = false;

        const { numColumns, numRows, elementWidth } = this.tableConfiguration;
        const elementHeight: number = this.elementHeight;
        const numElementsPerTable: number = numColumns * numRows;

        const vexFlowContext: VF.CanvasContext = this.canvas.getContext();
        const context: CanvasRenderingContext2D = vexFlowContext as unknown as CanvasRenderingContext2D;
        const canvasElement: HTMLCanvasElement = this.canvas.getCanvas() as HTMLCanvasElement;

        if (debugTmpCanvas) {
            document.querySelectorAll(".osmd-sky-bottom-line-tmp-canvas").forEach(element => element.parentElement.removeChild(element));
        }

        const results: SkyBottomLineCalculationResult[] = [];
        for (let i: number = 0; i < this.measures.length; i += numElementsPerTable) {
            vexFlowContext.clear();

            const measures: VexFlowMeasure[] = this.measures.slice(i, i + numElementsPerTable);

            for (let j: number = 0; j < measures.length; ++j) {
                const measure: VexFlowMeasure = measures[j];
                const vsStaff: VF.Stave = measure.getVFStave();

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

                const x: number = 0;
                vsStaff.setX(x);

                // The magic number 100 is an offset from the top image border so that
                // elements above the staffline can be drawn correctly.
                const y: number = (<any>vsStaff).y as number + 100;
                vsStaff.setY(y);

                const oldMeasureWidth: number = vsStaff.getWidth();
                // We need to tell the VexFlow stave about the canvas width. This looks
                // redundant because it should know the canvas but somehow it doesn't.
                // Maybe I am overlooking something but for now this does the trick
                vsStaff.setWidth(currentWidth);
                measure.format();
                vsStaff.setWidth(oldMeasureWidth);

                try {
                    context.translate(u * elementWidth, v * elementHeight);
                    measure.draw(vexFlowContext);
                    context.translate(-u * elementWidth, -v * elementHeight);
                    // Vexflow errors can happen here, then our complete rendering loop would halt without catching errors.
                } catch (ex) {
                    log.warn("SkyBottomLineBatchCalculatorBackend.calculateLines.draw", ex);
                }
            }

            const result: SkyBottomLineCalculationResult[] = this.calculateFromCanvas(
                canvasElement,
                vexFlowContext,
                measures,
                this.samplingUnit,
                this.tableConfiguration
            );
            results.push(...result);

            if (debugTmpCanvas) {
                const canvasContext: CanvasRenderingContext2D = vexFlowContext as unknown as CanvasRenderingContext2D;
                const oldFillStyle: string | CanvasGradient | CanvasPattern = canvasContext.fillStyle;
                for (let j: number = 0; j < result.length; ++j) {
                    const { skyLine, bottomLine } = result[j];

                    const u: number = j % numColumns;
                    const v: number = Math.floor(j / numColumns);

                    const xStart: number = u * elementWidth;
                    const yStart: number = v * elementHeight;

                    canvasContext.fillStyle = "#FF0000";
                    skyLine.forEach((y, x) => vexFlowContext.fillRect(x - 1 + xStart, y - 1 + yStart, 2, 2));
                    canvasContext.fillStyle = "#0000FF";
                    bottomLine.forEach((y, x) => vexFlowContext.fillRect(x - 1 + xStart, y - 1 + yStart, 2, 2));
                }
                canvasContext.fillStyle = oldFillStyle;
                const url: string = canvasElement.toDataURL("image/png");
                const img: HTMLImageElement = document.createElement("img");
                img.classList.add("osmd-sky-bottom-line-tmp-canvas");
                img.src = url;
                document.body.appendChild(img);

                const hr: HTMLHRElement = document.createElement("hr");
                hr.classList.add("osmd-sky-bottom-line-tmp-canvas");
                document.body.appendChild(hr);
            }
        }

        return results;
    }
}
