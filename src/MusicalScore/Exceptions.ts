// OSMD's exceptions are Errors: they have a stack, `instanceof Error` is true and String(e) is "<name>: <message>".
//   (The name is a string, not constructor.name, which a minified build changes.)

export class MusicSheetReadingException extends Error {
    constructor(message: string, e?: Error) {
        super(message);
        this.name = "MusicSheetReadingException";
        if (e) {
            this.message += " " + e.toString();
        }
    }
}


export class ArgumentOutOfRangeException extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ArgumentOutOfRangeException";
    }
}

export class InvalidEnumArgumentException extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidEnumArgumentException";
    }
}
