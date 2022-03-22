import { EngravingRules } from "./EngravingRules";
import { VexFlowMeasure } from "./VexFlow/VexFlowMeasure";
import { ISkyBottomLineBatchCalculatorBackendTableConfiguration, SkyBottomLineBatchCalculatorBackend } from "./SkyBottomLineBatchCalculatorBackend";
import { SkyBottomLineCalculationResult } from "./SkyBottomLineCalculationResult";

/**
 * This class calculates the skylines and the bottom lines by iterating over pixels retrieved via
 * CanvasRenderingContext2D.getImageData().
 */
export class PlainSkyBottomLineBatchCalculatorBackend extends SkyBottomLineBatchCalculatorBackend {
    constructor(rules: EngravingRules, measures: VexFlowMeasure[]) {
        super(rules, measures);
    }

    protected getPreferredRenderingConfiguration(maxWidth: number, elementHeight: number): ISkyBottomLineBatchCalculatorBackendTableConfiguration {
        return {
            elementWidth: Math.ceil(maxWidth),
            numColumns: 5,
            numRows: 5,
        };
    }

    protected onInitialize(tableConfiguration: ISkyBottomLineBatchCalculatorBackendTableConfiguration): void {
        // does nothing
    }

    protected calculateFromCanvas(
        canvas: HTMLCanvasElement,
        vexFlowContext: Vex.Flow.CanvasContext,
        measures: VexFlowMeasure[],
        samplingUnit: number,
        tableConfiguration: ISkyBottomLineBatchCalculatorBackendTableConfiguration & { elementHeight: number }
    ): SkyBottomLineCalculationResult[] {
        const debugTmpCanvas: boolean = false;

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

            if (debugTmpCanvas) {
                context.fillStyle = "#FF0000";
                skyLine.forEach((y, x) => context.fillRect(x - 1 + xStart, y - 1 + yStart, 2, 2));
                context.fillStyle = "#0000FF";
                bottomLine.forEach((y, x) => context.fillRect(x - 1 + xStart, y - 1 + yStart, 2, 2));
            }

            result.push(new SkyBottomLineCalculationResult(skyLine, bottomLine));
        }

        if (debugTmpCanvas) {
            const url: string = canvas.toDataURL("image/png");
            const img: HTMLImageElement = document.createElement("img");
            img.src = url;
            document.body.appendChild(img);
        }

        return result;
    }
}
