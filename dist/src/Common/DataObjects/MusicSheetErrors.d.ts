export declare class MusicSheetErrors {
    measureErrors: {
        [n: number]: string[];
    };
    private errors;
    private tempErrors;
    finalizeMeasure(measureNumber: number): void;
    pushMeasureError(errorMsg: string): void;
    push(errorMsg: string): void;
}
