
export class MusicSheetReadingException implements Error {
    public name: string;
    public message: string;
    constructor(message: string, e?: Error) {
        //super(message);
        this.message = message;
        if (e) {
            this.message += " " + e.toString();
        }
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

export class InvalidEnumArgumentException implements Error {
    public name: string;
    public message: string;
    constructor(message: string) {
        this.message = message;
    }
}
