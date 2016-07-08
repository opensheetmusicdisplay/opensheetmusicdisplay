/**
 * Created by acondolu on 26/04/16.
 */
"use strict";
var Logging = (function () {
    function Logging() {
    }
    Logging.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.log("[OSMD] DEBUG: ", args.join(" "));
    };
    Logging.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.log("[OSMD] ", args.join(" "));
    };
    return Logging;
}());
exports.Logging = Logging;
