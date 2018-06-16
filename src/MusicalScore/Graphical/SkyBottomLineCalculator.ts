import {EngravingRules} from "./EngravingRules";
import {StaffLine} from "./StaffLine";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {CanvasVexFlowBackend} from "./VexFlow/CanvasVexFlowBackend";
import {VexFlowMeasure} from "./VexFlow/VexFlowMeasure";
import {unitInPixels} from "./VexFlow/VexFlowMusicSheetDrawer";
import * as log from "loglevel";

export class SkyBottomLineCalculator {
    private mStaffLineParent: StaffLine;
    private mSkyLine: number[];
    private mBottomLine: number[];

    constructor(staffLineParent: StaffLine = undefined) {
        this.StaffLineParent = staffLineParent;
    }

    /**
     * This method calculates the Sky- and BottomLines for a StaffLine.
     */
    public calculateLines(): void {
        // calculate arrayLength
        const arrayLength: number = Math.max(Math.ceil(this.StaffLineParent.PositionAndShape.Size.width * this.SamplingUnit), 1);
        this.mSkyLine = [];
        this.mBottomLine = [];

        // and initialize
        this.initialize();

        // search through all Measures
        for (const measure of this.StaffLineParent.Measures as VexFlowMeasure[]) {
            // must calculate first AbsolutePositions
            measure.PositionAndShape.calculateAbsolutePositionsRecursive(0, 0);

            // Create a temporary canvas outside the DOM to draw the measure in.
            const tmpCanvas: CanvasVexFlowBackend = new CanvasVexFlowBackend();
            tmpCanvas.initializeHeadless(measure.getVFStave().getWidth());

            const width: number = (tmpCanvas.getCanvas() as any).width;
            const height: number = (tmpCanvas.getCanvas() as any).height;
            const ctx: any = (tmpCanvas.getContext() as any);

            measure.getVFStave().setY((measure.getVFStave() as any).y + 40);
            const oldMeasureWidth: number = measure.getVFStave().getWidth();
            // We need to tell the VexFlow stave about the canvas width. This looks
            // redundant because it should know the canvas but somehow it doesn't.
            // Maybe I am overlooking something but for no this does the trick
            measure.getVFStave().setWidth(width);
            measure.format();
            measure.getVFStave().setWidth(oldMeasureWidth);
            measure.draw(tmpCanvas.getContext());

            // imageData.data is a Uint8ClampedArray representing a one-dimensional array containing the data in the RGBA order
            // RGBA is 32 bit word with 8 bits red, 8 bits green, 8 bits blue and 8 bit alpha. Alpha should be 0 for all background colors.
            // Since we are only interested in black or white we can take 32bit words at once
            const imageData: any = ctx.getImageData(0, 0, width, height);
            const rgbaLength: number = 4;
            const measureArrayLength: number = Math.max(Math.ceil(measure.PositionAndShape.Size.width * EngravingRules.Rules.SamplingUnit), 1);
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
            this.mSkyLine.push(...tmpSkyLine);
            this.mBottomLine.push(...tmpBottomLine);

            const debugTmpCanvas: boolean = false;
            if (debugTmpCanvas) {
                tmpSkyLine.forEach((y, x) => this.drawPixel(new PointF2D(x, y), tmpCanvas));
                tmpBottomLine.forEach((y, x) => this.drawPixel(new PointF2D(x, y), tmpCanvas, "blue"));
                const img: any = (tmpCanvas.getCanvas() as any).toDataURL("image/png");
                document.write('<img src="' + img + '"/>');
            }
            tmpCanvas.clear();
        }
        // Subsampling
        // The pixel width is bigger then the measure size in units. So we split the array into
        // chunks with the size of MeasurePixelWidth/measureUnitWidth and reduce the value to its
        // average
        const arrayChunkSize: number = this.mSkyLine.length / arrayLength;

        const subSampledSkyLine: number[] = [];
        const subSampledBottomLine: number[] = [];
        for (let chunkIndex: number = 0; chunkIndex < this.mSkyLine.length; chunkIndex += arrayChunkSize) {
            let chunk: number[] = this.mSkyLine.slice(chunkIndex, chunkIndex + arrayChunkSize);
            subSampledSkyLine.push(Math.min(...chunk));
            chunk = this.mBottomLine.slice(chunkIndex, chunkIndex + arrayChunkSize);
            subSampledBottomLine.push(Math.max(...chunk));
        }

        this.mSkyLine = subSampledSkyLine;
        this.mBottomLine = subSampledBottomLine;
        if (this.mSkyLine.length !== arrayLength) {
            log.debug(`SkyLine calculation was not correct (${this.mSkyLine.length} instead of ${arrayLength})`);
        }
        if (this.mBottomLine.length !== arrayLength) {
            log.debug(`BottomLine calculation was not correct (${this.mBottomLine.length} instead of ${arrayLength})`);
        }
        // Remap the values from 0 to +/- height in units
        this.mSkyLine = this.mSkyLine.map(v => (v - Math.max(...this.mSkyLine)) / unitInPixels);
        this.mBottomLine = this.mBottomLine.map(v => (v - Math.min(...this.mBottomLine)) / unitInPixels + EngravingRules.Rules.StaffHeight);
    }

    private drawPixel(coord: PointF2D, backend: CanvasVexFlowBackend, color: string = "#FF0000FF"): void {
        const ctx: any = backend.getContext();
        const oldStyle: string = ctx.fillStyle;
        ctx.fillStyle = color;
        ctx.fillRect( coord.x, coord.y, 2, 2 );
        ctx.fillStyle = oldStyle;
    }

    /**
     * This method initializes the Sky- and BottomLines with Float.Max and Float.Min correspondingly.
     */
    public initialize(): void {
        for (let i: number = 0; i < this.SkyLine.length; i++) {
            // TODO: Hope this MAX, MIN values work as expected. MIN might have to be negativ becuase float.MinValue is negative
            this.SkyLine[i] = Number.MAX_VALUE;
            this.BottomLine[i] = Number.MIN_VALUE;
        }
    }


    /**
     * This method updates the SkyLine for a given Wedge.
     * @param  to update the SkyLine for
     * @param start Start point of the wedge
     * @param end End point of the wedge
     */
    public updateSkyLineWithWedge(start: PointF2D, end: PointF2D): void {
        let startIndex: number = Math.floor(start.x * this.SamplingUnit);
        let endIndex: number = Math.ceil(end.x * this.SamplingUnit);

        let slope: number = (end.y - start.y) / (end.x - start.x);

        if (endIndex - startIndex <= 1) {
            endIndex++;
            slope = 0;
        }

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (startIndex >= this.BottomLine.length) {
            startIndex = this.BottomLine.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (endIndex >= this.BottomLine.length) {
            endIndex = this.BottomLine.length;
        }

        this.SkyLine[startIndex] = start.y;
        for (let i: number = startIndex + 1; i < Math.min(endIndex, this.SkyLine.length); i++) {
            this.SkyLine[i] = this.SkyLine[i - 1] + slope / this.SamplingUnit;
        }
    }

    /**
     * This method updates the BottomLine for a given Wedge.
     * @param  to update the bottomline for
     * @param start Start point of the wedge
     * @param end End point of the wedge
     */
    public updateBottomLineWithWedge(start: PointF2D, end: PointF2D): void {
        let startIndex: number = Math.floor(start.x * this.SamplingUnit);
        let endIndex: number = Math.ceil(end.x * this.SamplingUnit);

        let slope: number = (end.y - start.y) / (end.x - start.x);
        if (endIndex - startIndex <= 1) {
            endIndex++;
            slope = 0;
        }

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (startIndex >= this.BottomLine.length) {
            startIndex = this.BottomLine.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (endIndex >= this.BottomLine.length) {
            endIndex = this.BottomLine.length;
        }

        this.BottomLine[startIndex] = start.y;
        for (let i: number = startIndex + 1; i < endIndex; i++) {
            this.BottomLine[i] = this.BottomLine[i - 1] + slope / this.SamplingUnit;
        }
    }

    /**
     * This method updates the SkyLine for a given range with a given value
     * @param  to update the SkyLine for
     * @param start Start index of the range
     * @param end End index of the range
     * @param value ??
     */
    public updateSkyLineInRange(startIndex: number, endIndex: number, value: number): void {

        //FIXME: Might be not or always needed in TypeScript
        const floatVersion: boolean = true;

        if (floatVersion) {
            startIndex = Math.floor(startIndex * this.SamplingUnit);
            endIndex = Math.ceil(endIndex * this.SamplingUnit);
        }

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (startIndex >= this.SkyLine.length) {
            startIndex = this.SkyLine.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (endIndex >= this.SkyLine.length) {
            endIndex = this.SkyLine.length;
        }

        if (startIndex >= 0 && endIndex <= this.SkyLine.length) {
            for (let i: number = startIndex; i < endIndex; i++) {
                this.SkyLine[i] = value;
            }
        }
    }

    /**
     * This method updates the BottomLine for a given range with a given value
     * @param  to update the BottomLine for
     * @param start Start index of the range
     * @param end End index of the range
     * @param value ??
     */
    public updateBottomLineInRange(startIndex: number, endIndex: number, value: number): void {
        this.updateInRange(this.BottomLine, startIndex, endIndex, value);
    }

    /**
     * Resets a SkyLine in a range to its original value
     * @param  to reset the SkyLine in
     * @param startIndex Start index of the range
     * @param endIndex End index of the range
     */
    public resetSkyLineInRange(startIndex: number, endIndex: number): void {
        this.updateInRange(this.SkyLine, startIndex, endIndex);
    }

    /**
     * Resets a bottom line in a range to its original value
     * @param  to reset the bottomline in
     * @param startIndex Start index of the range
     * @param endIndex End index of the range
     */
    public resetBottomLineInRange(startIndex: number, endIndex: number): void {
        this.updateInRange(this.BottomLine, startIndex, endIndex);
    }

    public updateSkyLineWithValue(value: number): void {
        this.SkyLine.forEach(sl => sl = value);
    }

    public updateBottomLineWithValue(value: number): void {
        this.BottomLine.forEach(bl => bl = value);
    }

    public getLeftIndexForPointX(x: number, length: number): number {
        const index: number = Math.floor(x * this.SamplingUnit);

        if (index < 0) {
            return 0;
        }

        if (index >= length) {
            return length - 1;
        }

        return index;
    }

    public getRightIndexForPointX(x: number, length: number): number {
        const index: number = Math.ceil(x * this.SamplingUnit);

        if (index < 0) {
            return 0;
        }

        if (index >= length) {
            return length - 1;
        }

        return index;
    }

    /**
     * This method updates the StaffLine Borders with the Sky- and BottomLines Min- and MaxValues.
     * @param  to apply to
     */
    public updateStaffLineBorders(): void {
        this.mStaffLineParent.PositionAndShape.BorderTop = this.getSkyLineMin();
        this.mStaffLineParent.PositionAndShape.BorderMarginTop = this.getSkyLineMin();
        this.mStaffLineParent.PositionAndShape.BorderBottom = this.getBottomLineMax();
        this.mStaffLineParent.PositionAndShape.BorderMarginBottom = this.getBottomLineMax();
    }

    /**
     * This method finds the minimum value of the SkyLine.
     * @param staffLine StaffLine to apply to
     */
    public getSkyLineMin(): number {
        return Math.min(...this.SkyLine.filter(s => !isNaN(s)));
    }

    public getSkyLineMinAtPoint(point: number): number {
        const istart: number = Math.floor(point * this.SamplingUnit);
        const iend: number = Math.ceil(point * this.SamplingUnit);
        return this.getSkyLineMinInRange(istart, iend);
    }

    /**
     * This method finds the SkyLine's minimum value within a given range.
     * @param staffLine Staffline to apply to
     * @param startIndex Starting index
     * @param endIndex End index
     */
    public getSkyLineMinInRange(startIndex: number, endIndex: number): number {
        // TODO: Refactor with private functions
        // return this.getMinInRange(this.SkyLine, startIndex, endIndex);
        //FIXME: Might be not or always needed in TypeScript
        const floatVersion: boolean = true;

        if (floatVersion) {
            startIndex = Math.floor(startIndex * this.SamplingUnit);
            endIndex = Math.ceil(endIndex * this.SamplingUnit);
        }

        let minValue: number = Number.MAX_VALUE;

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (this.SkyLine !== undefined && startIndex >= this.SkyLine.length) {
            startIndex = this.SkyLine.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (this.SkyLine !== undefined && endIndex >= this.SkyLine.length) {
            endIndex = this.SkyLine.length;
        }

        if (this.SkyLine !== undefined && startIndex >= 0 && endIndex <= this.SkyLine.length) {
            for (let i: number = startIndex; i < endIndex; i++) {
                minValue = Math.min(minValue, this.SkyLine[i]);
            }
        }

        return minValue;
    }

    /**
     * This method finds the maximum value of the BottomLine.
     * @param staffLine Staffline to apply to
     */
    public getBottomLineMax(): number {
        let maxValue: number = Number.MIN_VALUE;
        const len: number = this.BottomLine.length;

        for (let idx: number = 0; idx < len; ++idx) {
            const f: number = this.BottomLine[idx];
            maxValue = Math.max(f, maxValue);
        }

        return maxValue;
    }

    public getBottomLineMaxAtPoint(point: number): number {
        const istart: number = Math.floor(point * this.SamplingUnit);
        const iend: number = Math.ceil(point * this.SamplingUnit);
        return this.getBottomLineMaxInRange(istart, iend);
    }

    /**
     * This method finds the BottomLine's maximum value within a given range.
     * @param staffLine Staffline to find the max value in
     * @param startIndex Start index of the range
     * @param endIndex End index of the range
     */
    public getBottomLineMaxInRange(startIndex: number, endIndex: number): number {
        //FIXME: Might be not or always needed in TypeScript
        const floatVersion: boolean = true;

        if (floatVersion) {
            startIndex = Math.floor(startIndex * this.SamplingUnit);
            endIndex = Math.ceil(endIndex * this.SamplingUnit);
        }

        let maxValue: number = Number.MIN_VALUE;

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (this.BottomLine !== undefined && startIndex >= this.BottomLine.length) {
            startIndex = this.BottomLine.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (this.BottomLine !== undefined && endIndex >= this.BottomLine.length) {
            endIndex = this.BottomLine.length;
        }

        if (this.BottomLine !== undefined && startIndex >= 0 && endIndex <= this.BottomLine.length) {
            for (let i: number = startIndex; i < endIndex; i++) {
                maxValue = Math.max(maxValue, this.BottomLine[i]);
            }
        }

        return maxValue;
    }


    //#region Private methods

    /**
     * Update an array value inside a range
     * @param array Array to fill in the new value
     * @param startIndex start index to begin with (default: 0)
     * @param endIndex end index of array (default: array length)
     * @param value value to fill in (default: 0)
     */
    private updateInRange(array: number[], startIndex: number = 0, endIndex: number = array.length, value: number = 0): void {
        startIndex = Math.floor(startIndex * this.SamplingUnit);
        endIndex = Math.ceil(endIndex * this.SamplingUnit);

        if (endIndex < startIndex) {
            throw new Error("start index of line is greater then the end index");
        }

        if (startIndex < 0) {
            startIndex = 0;
        }

        if (endIndex > array.length) {
            endIndex = array.length;
        }

        for (let i: number = startIndex; i < endIndex; i++) {
            array[i] = value;
        }
    }

    // //FIXME: Replacement methods for all the get min max bottom sky calls
    // private getMinInRange(skyBottomArray: number[], startIndex: number, endIndex: number): number {
    //     const floatVersion: boolean = true;

    //     if (floatVersion) {
    //         startIndex = Math.floor(startIndex * this.SamplingUnit);
    //         endIndex = Math.ceil(endIndex * this.SamplingUnit);
    //     }

    //     if (skyBottomArray === undefined) {
    //         // Highly questionable
    //         return Number.MAX_VALUE;
    //     }

    //     if (startIndex < 0) {
    //         startIndex = 0;
    //     }
    //     if (startIndex >= skyBottomArray.length) {
    //         startIndex = skyBottomArray.length - 1;
    //     }
    //     if (endIndex < 0) {
    //         endIndex = 0;
    //     }
    //     if (endIndex >= skyBottomArray.length) {
    //         endIndex = skyBottomArray.length;
    //     }

    //     if (startIndex >= 0 && endIndex <= skyBottomArray.length) {
    //         return Math.min(...skyBottomArray.slice(startIndex, endIndex));
    //     }
    // }

    // private getMaxInRange(skyBottomArray: number[], startIndex: number, endIndex: number): number {
    //     const floatVersion: boolean = true;

    //     if (floatVersion) {
    //         startIndex = Math.floor(startIndex * this.SamplingUnit);
    //         endIndex = Math.ceil(endIndex * this.SamplingUnit);
    //     }

    //     if (skyBottomArray === undefined) {
    //         // Highly questionable
    //         return Number.MIN_VALUE;
    //     }

    //     if (startIndex < 0) {
    //         startIndex = 0;
    //     }
    //     if (startIndex >= skyBottomArray.length) {
    //         startIndex = skyBottomArray.length - 1;
    //     }
    //     if (endIndex < 0) {
    //         endIndex = 0;
    //     }
    //     if (endIndex >= skyBottomArray.length) {
    //         endIndex = skyBottomArray.length;
    //     }

    //     if (startIndex >= 0 && endIndex <= skyBottomArray.length) {
    //         return Math.max(...skyBottomArray.slice(startIndex, endIndex));
    //     }
    // }

    // private isStaffLineUpper(): boolean {
    //     const instrument: Instrument = this.StaffLineParent.ParentStaff.ParentInstrument;

    //     if (this.StaffLineParent.ParentStaff === instrument.Staves[0]) {
    //         return true;
    //     } else {
    //         return false;
    //     }
    // }
    //#endregion

    //#region Getter / Setter
    get SamplingUnit(): number {
        return EngravingRules.Rules.SamplingUnit;
    }

    get StaffLineParent(): StaffLine {
        return this.mStaffLineParent;
    }

    set StaffLineParent(staffLineParent: StaffLine) {
        this.mStaffLineParent = staffLineParent;
    }

    get SkyLine(): number[] {
        return this.mSkyLine;
    }

    //TODO: Really??
    set SkyLine(skyLine: number[]) {
        this.mSkyLine = skyLine;
    }

    get BottomLine(): number[] {
        return this.mBottomLine;
    }

    //TODO: Really??
    set BottomLine(bottomLine: number[]) {
        this.mBottomLine = bottomLine;
    }

    //#endregion
}
