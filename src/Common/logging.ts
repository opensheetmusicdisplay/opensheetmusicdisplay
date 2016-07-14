/**
 * Created by acondolu on 26/04/16.
 */


export class Logging {
    public static debug(...args: any[]): void {
        console.log("[OSMD] DEBUG: ", args.join(" "));
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
