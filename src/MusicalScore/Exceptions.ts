export class MusicSheetReadingException implements Error {
    public name: string;
    public message: string;
    constructor(message: string, exitCode: number) {
        //super(message);
        this.message = message;
    }
}


export class ArgumentOutOfRangeException implements Error {
    public name: string;
    public message: string;
    constructor(message: string) {
        //super(message);
        this.message = message;
    }
}
