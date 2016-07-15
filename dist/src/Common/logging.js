/* tslint:disable:no-console */
"use strict";
var Logging = (function () {
    function Logging() {
    }
    Logging.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.debug("[OSMD] ", args.join(" "));
    };
    Logging.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.log("[OSMD] ", args.join(" "));
    };
    Logging.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.error("[OSMD] ", args.join(" "));
    };
    Logging.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.warn("[OSMD] ", args.join(" "));
    };
    return Logging;
}());
exports.Logging = Logging;
