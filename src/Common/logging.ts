/**
 * Created by acondolu on 26/04/16.
 */


export class logging {
    public static debug(...args: any[]) {
        console.log("[OSMD] DEBUG: ", args.join(" "));
    }
    public static log(...args: any[]) {
        console.log("[OSMD] ", args.join(" "));
    }
}