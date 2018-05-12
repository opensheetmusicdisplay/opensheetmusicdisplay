import { EngravingRules } from "./EngravingRules";
import { StaffLine } from "./StaffLine";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { MusicSystem } from "./MusicSystem";
import { CanvasVexFlowBackend } from "./VexFlow/CanvasVexFlowBackend";
import { VexFlowMeasure } from "./VexFlow/VexFlowMeasure";

export class SkyBottomLineCalculator {
    private mStaffLineParent: StaffLine;
    private mSamplingUnit: number;
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
        // FIXME: Do subsampling at getter!
        /* tslint:disable:no-unused-variable */
        const arrayLength: number = Math.max(Math.ceil(this.StaffLineParent.PositionAndShape.Size.width * EngravingRules.Rules.SamplingUnit), 1);

        this.mSkyLine = [];
        this.mBottomLine = [];

        // set pointers
        this.StaffLineParent.SkyLine = this.mSkyLine;
        this.StaffLineParent.BottomLine = this.mBottomLine;

        // and initialize
        this.initialize();

        // search through all Measures
        for (const measure of this.StaffLineParent.Measures as VexFlowMeasure[]) {
            // must calculate first AbsolutePositions
            measure.PositionAndShape.calculateAbsolutePositionsRecursive(0, 0);

            const tmpCanvas: CanvasVexFlowBackend = new CanvasVexFlowBackend();
            tmpCanvas.initializeHeadless();

            const width: number = (tmpCanvas.getCanvas() as any).width;
            const height: number = (tmpCanvas.getCanvas() as any).height;
            const ctx: any = (tmpCanvas.getContext() as any);

            measure.getVFStave().setY((measure.getVFStave() as any).y + 40);
            const oldMeasureWidth: number = measure.getVFStave().getWidth();
            measure.getVFStave().setWidth(width);
            measure.format();
            measure.getVFStave().setWidth(oldMeasureWidth);
            measure.draw(tmpCanvas.getContext());
            // let img: any = (tmpCanvas.getCanvas() as any).toDataURL("image/png");
            // document.write('<img src="' + img + '"/>');


            //imageData.data is a Uint8ClampedArray representing a one-dimensional array containing the data in the RGBA order
            // RGBA is 32 bit word with 8 bits red, 8 bits green, 8 bits blue and 8 bit alpha. Alpha should be 0 for all background colors.
            // Since we are only interested in black or white we can take 32bit words at once
            const imageData: any = ctx.getImageData(0, 0, width, height);
            const rgbaLength: number = 4;
            for (let x: number = 0; x < width; x++) {
                for (let y: number = 0; y < height; y++) {
                    const yOffset: number = y * width * rgbaLength;
                    const bufIndex: number = yOffset + x * rgbaLength;
                    const alpha: number = imageData.data[bufIndex + 3];
                    if (alpha > 0) {
                        this.mSkyLine.push(y);
                        break;
                    }
                }
            }
            for (let x: number = 0; x < width; x++) {
                for (let y: number = height; y > 0; y--) {
                    const yOffset: number = y * width * rgbaLength;
                    const bufIndex: number = yOffset + x * rgbaLength;
                    const alpha: number = imageData.data[bufIndex + 3];
                    if (alpha > 0) {
                        this.mBottomLine.push(y);
                        break;
                    }
                }
            }
            tmpCanvas.clear();
        }
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
     * @param staffLine: StaffLine to update the skyline for
     * @param start Start point of the wedge
     * @param end End point of the wedge
     */
    public updateSkyLineWithWedge(staffLine: StaffLine, start: PointF2D, end: PointF2D): void {
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
        if (startIndex >= staffLine.BottomLine.length) {
            startIndex = staffLine.BottomLine.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (endIndex >= staffLine.BottomLine.length) {
            endIndex = staffLine.BottomLine.length;
        }

        staffLine.SkyLine[startIndex] = start.y;
        for (let i: number = startIndex + 1; i < Math.min(endIndex, staffLine.SkyLine.length); i++) {
            staffLine.SkyLine[i] = staffLine.SkyLine[i - 1] + slope / this.SamplingUnit;
        }
    }

    /**
     * This method updates the BottomLine for a given Wedge.
     * @param staffLine: StaffLine to update the bottomline for
     * @param start Start point of the wedge
     * @param end End point of the wedge
     */
    public updateBottomLineWithWedge(staffLine: StaffLine, start: PointF2D, end: PointF2D): void {
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
        if (startIndex >= staffLine.BottomLine.length) {
            startIndex = staffLine.BottomLine.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (endIndex >= staffLine.BottomLine.length) {
            endIndex = staffLine.BottomLine.length;
        }

        staffLine.BottomLine[startIndex] = start.y;
        for (let i: number = startIndex + 1; i < endIndex; i++) {
            staffLine.BottomLine[i] = staffLine.BottomLine[i - 1] + slope / this.SamplingUnit;
        }
    }

    /**
     * This method updates the SkyLine for a given range with a given value
     * @param staffLine: StaffLine to update the skyline for
     * @param start Start index of the range
     * @param end End index of the range
     * @param value ??
     */
    public updateSkyLineInRange(staffLine: StaffLine, startIndex: number, endIndex: number, value: number): void {

        //FIXME: Might be not or always needed in TypeScript
        const floatVersion: boolean = true;

        if (floatVersion) {
            startIndex = Math.floor(startIndex * this.SamplingUnit);
            endIndex = Math.ceil(endIndex * this.SamplingUnit);
        }

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (startIndex >= staffLine.SkyLine.length) {
            startIndex = staffLine.SkyLine.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (endIndex >= staffLine.SkyLine.length) {
            endIndex = staffLine.SkyLine.length;
        }

        if (startIndex >= 0 && endIndex <= staffLine.SkyLine.length) {
            for (let i: number = startIndex; i < endIndex; i++) {
                staffLine.SkyLine[i] = value;
            }
        }
    }

    /**
     * This method updates the BottomLine for a given range with a given value
     * @param staffLine: StaffLine to update the BottomLine for
     * @param start Start index of the range
     * @param end End index of the range
     * @param value ??
     */
    public updateBottomLineInRange(staffLine: StaffLine, startIndex: number, endIndex: number, value: number): void {

        //FIXME: Might be not or always needed in TypeScript
        const floatVersion: boolean = true;

        if (floatVersion) {
            startIndex = Math.floor(startIndex * this.SamplingUnit);
            endIndex = Math.ceil(endIndex * this.SamplingUnit);
        }

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (startIndex >= staffLine.BottomLine.length) {
            startIndex = staffLine.BottomLine.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (endIndex >= staffLine.BottomLine.length) {
            endIndex = staffLine.BottomLine.length;
        }

        if (startIndex >= 0 && endIndex <= staffLine.BottomLine.length) {
            for (let i: number = startIndex; i < endIndex; i++) {
                staffLine.BottomLine[i] = value;
            }
        }
    }

    /**
     * Resets a skyline in a range to its original value
     * @param staffLine: StaffLine to reset the skyline in
     * @param startIndex Start index of the range
     * @param endIndex End index of the range
     */
    public resetSkyLineInRange(staffLine: StaffLine, startIndex: number, endIndex: number): void {
        const start: number = Math.floor(startIndex * this.SamplingUnit);
        const end: number = Math.ceil(endIndex * this.SamplingUnit);

        if (start >= 0 && end <= staffLine.SkyLine.length) {
            for (let i: number = start; i < end; i++) {
                staffLine.SkyLine[i] = Math.min(0, staffLine.SkyLine[i]);
            }
        }
    }

    /**
     * Resets a bottom line in a range to its original value
     * @param staffLine: StaffLine to reset the bottomline in
     * @param startIndex Start index of the range
     * @param endIndex End index of the range
     */
    public resetBottomLineInRange(staffLine: StaffLine, startIndex: number, endIndex: number): void {
        const start: number = Math.floor(startIndex * this.SamplingUnit);
        const end: number = Math.ceil(endIndex * this.SamplingUnit);

        if (start >= 0 && end <= staffLine.BottomLine.length) {
            for (let i: number = start; i < end; i++) {
                staffLine.BottomLine[i] = Math.min(4, staffLine.BottomLine[i]);
            }
        }
    }

    public updateSkyLineWithValue(staffLine: StaffLine, value: number): void {
        for (let i: number = 0; i < staffLine.SkyLine.length; i++) {
            staffLine.SkyLine[i] = Math.min(value, staffLine.SkyLine[i]);
        }
    }

    public updateBottomLineWithValue(staffLine: StaffLine, value: number): void {
        for (let i: number = 0; i < staffLine.BottomLine.length; i++) {
            staffLine.BottomLine[i] = Math.max(value, staffLine.BottomLine[i]);
        }
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
     * @param staffLine: StaffLine to apply to
     */
    public updateStaffLineBorders(staffLine: StaffLine): void {
        staffLine.PositionAndShape.BorderTop = this.getSkyLineMin(staffLine);
        staffLine.PositionAndShape.BorderMarginTop = this.getSkyLineMin(staffLine);
        staffLine.PositionAndShape.BorderBottom = this.getBottomLineMax(staffLine);
        staffLine.PositionAndShape.BorderMarginBottom = this.getBottomLineMax(staffLine);
    }

    /**
     * This method finds the minimum value of the SkyLine.
     * @param staffLine StaffLine to apply to
     */
    public getSkyLineMin(staffLine: StaffLine): number {
        let minValue: number = Number.MAX_VALUE;
        const len: number = staffLine.SkyLine.length;

        for (let idx: number = 0; idx < len; ++idx) {
            const f: number = staffLine.SkyLine[idx];
            if (isNaN(f)) {
                continue;
            }

            minValue = Math.min(f, minValue);
        }

        return minValue;
    }

    public getSkyLineMinAtPoint(staffLine: StaffLine, point: number): number {
        const istart: number = Math.floor(point * this.SamplingUnit);
        const iend: number = Math.ceil(point * this.SamplingUnit);
        return this.getSkyLineMinInRange(staffLine, istart, iend);
    }

    /**
     * This method finds the SkyLine's minimum value within a given range.
     * @param staffLine Staffline to apply to
     * @param startIndex Starting index
     * @param endIndex End index
     */
    public getSkyLineMinInRange(staffLine: StaffLine, startIndex: number, endIndex: number): number {
        // TODO: Refactor with private functions
        // return this.getMinInRange(staffLine.SkyLine, startIndex, endIndex);
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
        if (staffLine.SkyLine !== undefined && startIndex >= staffLine.SkyLine.length) {
            startIndex = staffLine.SkyLine.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (staffLine.SkyLine !== undefined && endIndex >= staffLine.SkyLine.length) {
            endIndex = staffLine.SkyLine.length;
        }

        if (staffLine.SkyLine !== undefined && startIndex >= 0 && endIndex <= staffLine.SkyLine.length) {
            for (let i: number = startIndex; i < endIndex; i++) {
                minValue = Math.min(minValue, staffLine.SkyLine[i]);
            }
        }

        return minValue;
    }

    /**
     * This method finds the maximum value of the BottomLine.
     * @param staffLine Staffline to apply to
     */
    public getBottomLineMax(staffLine: StaffLine): number {
        let maxValue: number = Number.MIN_VALUE;
        const len: number = staffLine.BottomLine.length;

        for (let idx: number = 0; idx < len; ++idx) {
            const f: number = staffLine.BottomLine[idx];
            maxValue = Math.max(f, maxValue);
        }

        return maxValue;
    }

    public getBottomLineMaxAtPoint(staffLine: StaffLine, point: number): number {
        const istart: number = Math.floor(point * this.SamplingUnit);
        const iend: number = Math.ceil(point * this.SamplingUnit);
        return this.getBottomLineMaxInRange(staffLine, istart, iend);
    }

    /**
     * This method finds the BottomLine's maximum value within a given range.
     * @param staffLine Staffline to find the max value in
     * @param startIndex Start index of the range
     * @param endIndex End index of the range
     */
    public getBottomLineMaxInRange(staffLine: StaffLine, startIndex: number, endIndex: number): number {
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
        if (staffLine.BottomLine !== undefined && startIndex >= staffLine.BottomLine.length) {
            startIndex = staffLine.BottomLine.length - 1;
        }
        if (endIndex < 0) {
            endIndex = 0;
        }
        if (staffLine.BottomLine !== undefined && endIndex >= staffLine.BottomLine.length) {
            endIndex = staffLine.BottomLine.length;
        }

        if (staffLine.BottomLine !== undefined && startIndex >= 0 && endIndex <= staffLine.BottomLine.length) {
            for (let i: number = startIndex; i < endIndex; i++) {
                maxValue = Math.max(maxValue, staffLine.BottomLine[i]);
            }
        }

        return maxValue;
    }

    //#region Yspacing Position calculations
    /// <summary>
    /// This method checks the distances between two System's StaffLines and if needed, shifts the lower down.
    /// </summary>
    /// <param name="musicSystem"></param>
    public optimizeDistanceBetweenStaffLines(musicSystem: MusicSystem): void {
        musicSystem.PositionAndShape.calculateAbsolutePositionsRecursive(0, 0);

        // const tmpCanvas: CanvasVexFlowBackend = new CanvasVexFlowBackend();
        // tmpCanvas.initializeHeadless();

        // don't perform any y-spacing in case of a StaffEntryLink (in both StaffLines)
        if (!musicSystem.checkStaffEntriesForStaffEntryLink()) {
            for (let i: number = 0; i < musicSystem.StaffLines.length - 1; i++) {
                // const absoluteUpperPosition: number = musicSystem.StaffLines[i].PositionAndShape.AbsolutePosition.y;
                // const absoluteLowerPosition: number = musicSystem.StaffLines[i + 1].PositionAndShape.AbsolutePosition.y;

                // const upperBottomLine: number[] = musicSystem.StaffLines[i].BottomLine;
                // const lowerSkyLine: number[] = musicSystem.StaffLines[i + 1].SkyLine;

                // for (const measure of musicSystem.StaffLines[i].Measures as VexFlowMeasure[]) {
                //     measure.getVFStave().setY((measure.getVFStave() as any).y + 40);
                //     measure.format();
                //     measure.draw(tmpCanvas.getContext());
                //     let img: any = (tmpCanvas.getCanvas() as any).toDataURL("image/png");
                //     // document.write('<img src="' + img + '"/>');

                //     const width: number = (tmpCanvas.getCanvas() as any).width;
                //     const height: number = (tmpCanvas.getCanvas() as any).height;
                //     const ctx: any = (tmpCanvas.getContext() as any);

                //     const skyline: number[] = new Array(width);
                //     const bottomline: number[] = new Array(width);

                //     console.time("whole Buffer");
                //     //imageData.data is a Uint8ClampedArray representing a one-dimensional array containing the data in the RGBA order
                //     // RGBA is 32 bit word with 8 bits red, 8 bits green, 8 bits blue and 8 bit alpha. Alpha should be 0 for all background colors.
                //     // Since we are only interested in black or white we can take 32bit words at once
                //     const imageData: any = ctx.getImageData(0, 0, width, height);
                //     const rgbaLength: number = 4;
                //     for (let x: number = 0; x < width; x++) {
                //         for (let y: number = 0; y < height; y++) {
                //             const yOffset: number = y * width * rgbaLength;
                //             const bufIndex: number = yOffset + x * rgbaLength;
                //             const alpha: number = imageData.data[bufIndex + 3];
                //             if (alpha > 0) {
                //                 skyline[x] = y;
                //                 break;
                //             }
                //         }
                //     }
                //     for (let x: number = 0; x < width; x++) {
                //         for (let y: number = height; y > 0; y--) {
                //             const yOffset: number = y * width * rgbaLength;
                //             const bufIndex: number = yOffset + x * rgbaLength;
                //             const alpha: number = imageData.data[bufIndex + 3];
                //             if (alpha > 0) {
                //                 bottomline[x] = y;
                //                 break;
                //             }
                //         }
                //     }
                //     console.timeEnd("whole Buffer");

                //     const drawPixel = function(ctx: any, x: number, y: number): void {
                //         const oldStyle: string = ctx.fillStyle;
                //         ctx.fillStyle = "#FF0000FF";
                //         ctx.fillRect( x, y, 2, 2 );
                //         ctx.fillStyle = oldStyle;
                //      };

                //     skyline.forEach((value, idx) => drawPixel(ctx, idx, value));
                //     bottomline.forEach((value, idx) => drawPixel(ctx, idx, value));

                //     img = (tmpCanvas.getCanvas() as any).toDataURL("image/png");
                //     document.write('<img src="' + img + '"/>');

                //     tmpCanvas.clear();
                // }
            }
        }
    }

    //#endregion


    //#region Private methods

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
        return this.mSamplingUnit;
    }

    set SamplingUnit(samplingUnit: number) {
        this.mSamplingUnit = samplingUnit;
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
