// skeleton by Andrea

export class MusicSheetErrors {
    public Errors: string[];
    public TempErrors: string[];
    public MeasureErrors: { [n: number]: string[] };

    // Add an error message to the temporary errors list
    public pushTemp(errorMsg: string) {
        this.TempErrors.push(errorMsg);
    }

    public push(errorMsg: string) {
        this.Errors.push(errorMsg);
    }
}
