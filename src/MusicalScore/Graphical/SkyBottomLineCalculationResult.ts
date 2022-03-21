/**
 * Contains a skyline and a bottomline for a measure.
 */
export class SkyBottomLineCalculationResult {
    public skyLine: number[];
    public bottomLine: number[];

    constructor(skyLine: number[], bottomLine: number[]) {
        this.skyLine = skyLine;
        this.bottomLine = bottomLine;
    }
}
