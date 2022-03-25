import { StaffLine } from "./StaffLine";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { CanvasVexFlowBackend } from "./VexFlow/CanvasVexFlowBackend";
import { VexFlowMeasure } from "./VexFlow/VexFlowMeasure";
import log from "loglevel";
import { SkyBottomLineCalculationResult } from "./SkyBottomLineCalculationResult";
/**
 * This class calculates the skyline and bottom line information for one measure.
 */
export class SkyBottomLineCalculator {
    /**
     * This method calculates the Sky- and BottomLines for a StaffLine.
     */
    public calculateLines(staffLine: StaffLine): SkyBottomLineCalculationResult[] {
        const samplingUnit: number = staffLine.ParentMusicSystem.rules.SamplingUnit;
        const results: SkyBottomLineCalculationResult[] = [];

        // Create a temporary canvas outside the DOM to draw the measure in.
        const tmpCanvas: any = new CanvasVexFlowBackend(staffLine.ParentMusicSystem.rules);
        // search through all Measures
        for (const measure of staffLine.Measures as VexFlowMeasure[]) {
            // must calculate first AbsolutePositions
            measure.PositionAndShape.calculateAbsolutePositionsRecursive(0, 0);

            // Pre initialize and get stuff for more performance
            const vsStaff: any = measure.getVFStave();
            let width: number = vsStaff.getWidth();
            if (!(width > 0) && !measure.IsExtraGraphicalMeasure) {
                log.warn("SkyBottomLineCalculator: width not > 0 in measure " + measure.MeasureNumber);
                width = 50;
            }
            // Headless because we are outside the DOM
            tmpCanvas.initializeHeadless(width);
            const ctx: any = tmpCanvas.getContext();
            const canvas: any = tmpCanvas.getCanvas();
            width = canvas.width;
            const height: number = canvas.height;

            // This magic number is an offset from the top image border so that
            // elements above the staffline can be drawn correctly.
            vsStaff.setY(vsStaff.y + 100);
            const oldMeasureWidth: number = vsStaff.getWidth();
            // We need to tell the VexFlow stave about the canvas width. This looks
            // redundant because it should know the canvas but somehow it doesn't.
            // Maybe I am overlooking something but for now this does the trick
            vsStaff.setWidth(width);
            measure.format();
            vsStaff.setWidth(oldMeasureWidth);
            try {
                measure.draw(ctx);
                // Vexflow errors can happen here, then our complete rendering loop would halt without catching errors.
            } catch (ex) {
                log.warn("SkyBottomLineCalculator.calculateLines.draw", ex);
            }

            // imageData.data is a Uint8ClampedArray representing a one-dimensional array containing the data in the RGBA order
            // RGBA is 32 bit word with 8 bits red, 8 bits green, 8 bits blue and 8 bit alpha. Alpha should be 0 for all background colors.
            // Since we are only interested in black or white we can take 32bit words at once
            const imageData: any = ctx.getImageData(0, 0, width, height);
            const rgbaLength: number = 4;
            const measureArrayLength: number = Math.max(Math.ceil(measure.PositionAndShape.Size.width * samplingUnit), 1);
            const tmpSkyLine: number[] = new Array(measureArrayLength);
            const tmpBottomLine: number[] = new Array(measureArrayLength);
            for (let x: number = 0; x < width; x++) {
                // SkyLine
                for (let y: number = 0; y < height; y++) {
                    const yOffset: number = y * width * rgbaLength;
                    const bufIndex: number = yOffset + x * rgbaLength;
                    const alpha: number = imageData.data[bufIndex + 3];
                    if (alpha > 0) {
                        tmpSkyLine[x] = y;
                        break;
                    }
                }
                // BottomLine
                for (let y: number = height; y > 0; y--) {
                    const yOffset: number = y * width * rgbaLength;
                    const bufIndex: number = yOffset + x * rgbaLength;
                    const alpha: number = imageData.data[bufIndex + 3];
                    if (alpha > 0) {
                        tmpBottomLine[x] = y;
                        break;
                    }
                }
            }

            for (let idx: number = 0; idx < tmpSkyLine.length; idx++) {
                if (tmpSkyLine[idx] === undefined) {
                    tmpSkyLine[idx] = Math.max(this.findPreviousValidNumber(idx, tmpSkyLine), this.findNextValidNumber(idx, tmpSkyLine));
                }
            }
            for (let idx: number = 0; idx < tmpBottomLine.length; idx++) {
                if (tmpBottomLine[idx] === undefined) {
                    tmpBottomLine[idx] = Math.max(this.findPreviousValidNumber(idx, tmpBottomLine), this.findNextValidNumber(idx, tmpBottomLine));
                }
            }

            results.push(new SkyBottomLineCalculationResult(tmpSkyLine, tmpBottomLine));

            // Set to true to only show the "mini canvases" and the corresponding skylines
            const debugTmpCanvas: boolean = false;
            if (debugTmpCanvas) {
                tmpSkyLine.forEach((y, x) => this.drawPixel(new PointF2D(x, y), tmpCanvas));
                tmpBottomLine.forEach((y, x) => this.drawPixel(new PointF2D(x, y), tmpCanvas, "blue"));
                const img: any = canvas.toDataURL("image/png");
                document.write('<img src="' + img + '"/>');
            }
            tmpCanvas.clear();
        }
        return results;
    }

    /**
     * go backwards through the skyline array and find a number so that
     * we can properly calculate the average
     * @param start
     * @param backend
     * @param color
     */
    private findPreviousValidNumber(start: number, tSkyLine: number[]): number {
        for (let idx: number = start; idx >= 0; idx--) {
            if (!isNaN(tSkyLine[idx])) {
                return tSkyLine[idx];
            }
        }
        return 0;
    }

    /**
     * go forward through the skyline array and find a number so that
     * we can properly calculate the average
     * @param start
     * @param backend
     * @param color
     */
    private findNextValidNumber(start: number, tSkyLine: Array<number>): number {
        if (start >= tSkyLine.length) {
            return tSkyLine[start - 1];
        }
        for (let idx: number = start; idx < tSkyLine.length; idx++) {
            if (!isNaN(tSkyLine[idx])) {
                return tSkyLine[idx];
            }
        }
        return 0;
    }

    /**
     * Debugging drawing function that can draw single pixels
     * @param coord Point to draw to
     * @param backend the backend to be used
     * @param color the color to be used, default is red
     */
    private drawPixel(coord: PointF2D, backend: CanvasVexFlowBackend, color: string = "#FF0000FF"): void {
        const ctx: any = backend.getContext();
        const oldStyle: string = ctx.fillStyle;
        ctx.fillStyle = color;
        ctx.fillRect(coord.x, coord.y, 2, 2);
        ctx.fillStyle = oldStyle;
    }
}
