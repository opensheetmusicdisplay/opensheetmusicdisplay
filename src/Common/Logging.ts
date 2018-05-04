/* tslint:disable:no-console */

/**
 * Class for logging messages, mainly for debugging purposes.
 * It should be refactored soon, when an external logging framework
 * will be chosen (probably log4js).
 */
export class Logging {
    public static debug(...args: any[]): void {
        console.debug("[opensheetmusicdisplay] ", args.join(" "));
    }
    public static log(...args: any[]): void {
        console.log("[opensheetmusicdisplay] ", args.join(" "));
    }
    public static error(...args: any[]): void {
        console.error("[opensheetmusicdisplay] ", args.join(" "));
    }
    public static warn(...args: any[]): void {
        console.warn("[opensheetmusicdisplay] ", args.join(" "));
    }
}
