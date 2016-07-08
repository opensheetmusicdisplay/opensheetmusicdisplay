export declare class MusicSheetReadingException implements Error {
    name: string;
    message: string;
    constructor(message: string, e?: Error);
}
export declare class ArgumentOutOfRangeException implements Error {
    name: string;
    message: string;
    constructor(message: string);
}
export declare class InvalidEnumArgumentException implements Error {
    name: string;
    message: string;
    constructor(message: string);
}
