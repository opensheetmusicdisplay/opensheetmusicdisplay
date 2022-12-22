import Vex from "vexflow";
import VF = Vex.Flow;
import { EngravingRules } from "./EngravingRules";
import { VexFlowMeasure } from "./VexFlow/VexFlowMeasure";
import { SkyBottomLineCalculationResult } from "./SkyBottomLineCalculationResult";
import {
    ISkyBottomLineBatchCalculatorBackendPartialTableConfiguration,
    ISkyBottomLineBatchCalculatorBackendTableConfiguration,
    SkyBottomLineBatchCalculatorBackend
} from "./SkyBottomLineBatchCalculatorBackend";

/**
 * This class calculates the skylines and the bottom lines by iterating over pixels retrieved via
 * CanvasRenderingContext2D.getImageData().
 */
export class PlainSkyBottomLineBatchCalculatorBackend extends SkyBottomLineBatchCalculatorBackend {
    constructor(rules: EngravingRules, measures: VexFlowMeasure[]) {
        super(rules, measures);
    }

    protected getPreferredRenderingConfiguration(maxWidth: number, elementHeight: number): ISkyBottomLineBatchCalculatorBackendPartialTableConfiguration {
        return {
            elementWidth: Math.ceil(maxWidth),
            numColumns: 6,
            numRows: 6,
        };
    }

    protected onInitialize(tableConfiguration: ISkyBottomLineBatchCalculatorBackendTableConfiguration): void {
        // does nothing
    }

    protected calculateFromCanvas(
        canvas: HTMLCanvasElement,
        vexFlowContext: VF.CanvasContext,
        measures: VexFlowMeasure[],
        samplingUnit: number,
        tableConfiguration: ISkyBottomLineBatchCalculatorBackendTableConfiguration
    ): SkyBottomLineCalculationResult[] {
        // vexFlowContext is CanvasRenderingContext2D in runtime
        const canvasWidth: number = canvas.width;
        const context: CanvasRenderingContext2D = vexFlowContext as unknown as CanvasRenderingContext2D;
        const imageData: ImageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const rgbaLength: number = 4;
        const { elementWidth, elementHeight, numColumns } = tableConfiguration;

        const result: SkyBottomLineCalculationResult[] = [];
        for (let i: number = 0; i < measures.length; ++i) {
            const measure: VexFlowMeasure = measures[i];
            const measureWidth: number = Math.floor(measure.getVFStave().getWidth());
            const measureArrayLength: number =  Math.max(Math.ceil(measure.PositionAndShape.Size.width * samplingUnit), 1);
            const u: number = i % numColumns;
            const v: number = Math.floor(i / numColumns);

            const xStart: number = u * elementWidth;
            const xEnd: number = xStart + measureWidth;
            const yStart: number = v * elementHeight;
            const yEnd: number = yStart + elementHeight;

            const skyLine: number[] = new Array(Math.max(measureArrayLength, measureWidth)).fill(0);
            const bottomLine: number[] = new Array(Math.max(measureArrayLength, measureWidth)).fill(0);

            for (let x: number = xStart; x < xEnd; ++x) {
                // SkyLine
                skyLine[x - xStart] = 0;
                for (let y: number = yStart; y < yEnd; ++y) {
                    const yOffset: number = y * canvasWidth * rgbaLength;
                    const bufIndex: number = yOffset + x * rgbaLength;
                    const alpha: number = imageData.data[bufIndex + 3];
                    if (alpha > 0) {
                        skyLine[x - xStart] = y - yStart;
                        break;
                    }
                }
                // BottomLine
                bottomLine[x - xStart] = elementHeight;
                for (let y: number = yEnd - 1; y >= yStart; y--) {
                    const yOffset: number = y * canvasWidth * rgbaLength;
                    const bufIndex: number = yOffset + x * rgbaLength;
                    const alpha: number = imageData.data[bufIndex + 3];
                    if (alpha > 0) {
                        bottomLine[x - xStart] = y - yStart;
                        break;
                    }
                }
            }

            const lowestSkyLine: number = Math.max(...skyLine);
            const highestBottomLine: number = Math.min(...bottomLine);

            for (let x: number = 0; x < measureWidth; ++x) {
                skyLine[x] = skyLine[x] === 0 ? lowestSkyLine : skyLine[x];
                bottomLine[x] = bottomLine[x] === elementHeight ? highestBottomLine : bottomLine[x];
            }

            result.push(new SkyBottomLineCalculationResult(skyLine, bottomLine));
        }
        return result;
    }
}
