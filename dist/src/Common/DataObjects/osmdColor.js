"use strict";
var OSMDColor = (function () {
    // FIXME:
    /*constructor(alpha: number, red: number, green: number, blue: number) {
        this.alpha = alpha;
        this.red = red;
        this.green = green;
        this.blue = blue;
    }*/
    function OSMDColor(red, green, blue) {
        this.alpha = 255;
        this.red = red;
        this.green = green;
        this.blue = blue;
    }
    Object.defineProperty(OSMDColor, "Black", {
        get: function () {
            return new OSMDColor(0, 0, 0);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OSMDColor, "DeepSkyBlue", {
        get: function () {
            return new OSMDColor(0, 191, 255);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OSMDColor, "Green", {
        get: function () {
            return new OSMDColor(20, 160, 20);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OSMDColor, "Magenta", {
        get: function () {
            return new OSMDColor(255, 0, 255);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OSMDColor, "Orange", {
        get: function () {
            return new OSMDColor(255, 128, 0);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OSMDColor, "Red", {
        get: function () {
            return new OSMDColor(240, 20, 20);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OSMDColor, "Disabled", {
        get: function () {
            return new OSMDColor(225, 225, 225);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OSMDColor, "DarkBlue", {
        get: function () {
            return new OSMDColor(0, 0, 140);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OSMDColor, "Debug1", {
        // For debugging:
        get: function () {
            return new OSMDColor(200, 0, 140);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OSMDColor, "Debug2", {
        get: function () {
            return new OSMDColor(100, 100, 200);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OSMDColor, "Debug3", {
        get: function () {
            return new OSMDColor(0, 50, 140);
        },
        enumerable: true,
        configurable: true
    });
    OSMDColor.prototype.toString = function () {
        // FIXME RGBA
        return "rgb(" + this.red + "," + this.green + "," + this.blue + ")";
    };
    return OSMDColor;
}());
exports.OSMDColor = OSMDColor;
