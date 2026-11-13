// skeleton by Andrea

export class MusicSheetErrors {
    public measureErrors: { [n: number]: string[] } = {};

    private errors: string[] = [];
    private tempErrors: string[] = [];

    /** The errors that don't belong to a measure, e.g. a part that was skipped. */
    public get Errors(): string[] {
        return this.errors;
    }

    public finalizeMeasure(measureNumber: number): void {
        let list: string[] = this.measureErrors[measureNumber];
        if (!list) {
            list = [];
        }
        this.measureErrors[measureNumber] = list.concat(this.tempErrors);
        this.tempErrors = [];
    }

    public pushMeasureError(errorMsg: string): void {
        this.tempErrors.push(errorMsg);
    }

    public push(errorMsg: string): void {
        this.errors.push(errorMsg);
    }
}
