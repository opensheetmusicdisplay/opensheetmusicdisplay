/* tslint:disable:no-console */

export class Logging {
    public static debug(...args: any[]): void {
        console.debug("[OSMD] ", args.join(" "));
    }
    public static log(...args: any[]): void {
        console.log("[OSMD] ", args.join(" "));
    }
    public static error(...args: any[]): void {
        console.error("[OSMD] ", args.join(" "));
    }
    public static warn(...args: any[]): void {
        console.warn("[OSMD] ", args.join(" "));
    }
}
