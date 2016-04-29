// skeleton by Andrea

export class MusicSheetErrors {
    public measureErrors: { [n: number]: string[] };

    private errors: string[];
    private tempErrors: string[];

    public TransferTempErrorsToDict(measureNumber: number): void {
        for (let errorString of this.tempErrors) {
            this.addErrorMessageAtIndex(measureNumber, errorString);
        }
        this.tempErrors = [];
    }

    // Add an error message to the temporary errors list
    public pushTemp(errorMsg: string): void {
        this.tempErrors.push(errorMsg);
    }

    public push(errorMsg: string): void {
        this.errors.push(errorMsg);
    }

    private addErrorMessageAtIndex(measureNumber: number, errorString: string): void {
        let list: string[] = this.measureErrors[measureNumber];
        if (list === undefined) {
            this.measureErrors[measureNumber] = [errorString];
        } else {
            list.push(errorString);
        }
    }
}
