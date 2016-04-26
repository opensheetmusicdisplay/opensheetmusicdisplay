// skeleton by Andrea

export class MusicSheetErrors {
    private errors: string[];
    private tempErrors: string[];
    public MeasureErrors: { [n: number]: string[] };

    public TransferTempErrorsToDict(measureNumber: number) {
        for (let errorString of this.tempErrors) {
            this.addErrorMessageAtIndex(measureNumber, errorString);
        }
        this.tempErrors = [];
    }

    // Add an error message to the temporary errors list
    public pushTemp(errorMsg: string) {
        this.tempErrors.push(errorMsg);
    }

    public push(errorMsg: string) {
        this.errors.push(errorMsg);
    }

    private addErrorMessageAtIndex(measureNumber: number, errorString: string) {
        let list: string[] = this.MeasureErrors[measureNumber];
        if (list === undefined) {
            this.MeasureErrors[measureNumber] = [errorString];
        } else {
            list.push(errorString);
        }
    }
}
