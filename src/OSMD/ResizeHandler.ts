/**
 * Helper function for managing window's onResize events
 * @param startCallback is the function called when resizing starts
 * @param endCallback is the function called when resizing (kind-of) ends
 */
export function handleResize(startCallback: () => void, endCallback: () => void): void {
    "use strict";
    let rtime: number;
    let timeout: number = undefined;
    let delta: number = 200;

    function resizeEnd(): void {
        timeout = undefined;
        window.clearTimeout(timeout);
        if ((new Date()).getTime() - rtime < delta) {
            timeout = window.setTimeout(resizeEnd, delta);
        } else {
            endCallback();
        }
    }

    function resizeStart(): void {
        rtime = (new Date()).getTime();
        if (!timeout) {
            startCallback();
            rtime = (new Date()).getTime();
            timeout = window.setTimeout(resizeEnd, delta);
        }
    }

    if ((<any>window).attachEvent) {
        // Support IE<9
        (<any>window).attachEvent("onresize", resizeStart);
    } else {
        window.addEventListener("resize", resizeStart);
    }

    window.setTimeout(startCallback, 0);
    window.setTimeout(endCallback, 1);
}
