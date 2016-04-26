/**
 * Created by acondolu on 26/04/16.
 */


export class logging {
    public static debug(...arguments: any[]) {
        console.log("[OSMD] DEBUG: ", arguments.join(" "));
    }
    public static log(...arguments: any[]) {
        console.log("[OSMD] ", arguments.join(" "));
    }
}