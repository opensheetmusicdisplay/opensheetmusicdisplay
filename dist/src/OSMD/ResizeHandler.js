/**
 * Created by acondolu on 15/07/16.
 */
"use strict";
/**
 * Helper function for managing window's onResize events
 * @param startCallback
 * @param endCallback
 */
function handleResize(startCallback, endCallback) {
    "use strict";
    var rtime;
    var timeout = undefined;
    var delta = 200;
    function resizeEnd() {
        //timeout = undefined;
        window.clearTimeout(timeout);
        if ((new Date()).getTime() - rtime < delta) {
            timeout = window.setTimeout(resizeEnd, delta);
        }
        else {
            endCallback();
        }
    }
    function resizeStart() {
        rtime = (new Date()).getTime();
        if (!timeout) {
            startCallback();
            rtime = (new Date()).getTime();
            timeout = window.setTimeout(resizeEnd, delta);
        }
    }
    if (window.attachEvent) {
        // Support IE<9
        window.attachEvent("onresize", resizeStart);
    }
    else {
        window.addEventListener("resize", resizeStart);
    }
    window.setTimeout(startCallback, 0);
    window.setTimeout(endCallback, 1);
}
exports.handleResize = handleResize;
