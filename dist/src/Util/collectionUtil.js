"use strict";
var CollectionUtil = (function () {
    function CollectionUtil() {
    }
    CollectionUtil.contains2 = function (array, object) {
        for (var i = 0; i < array.length; i++) {
            if (array[i] === object) {
                return true;
            }
        }
        return false;
    };
    CollectionUtil.last = function (array) {
        return array[array.length - 1];
    };
    /**
     * Iterates through a dictionary and calls iterationFunction.
     * If iterationFunction returns true the key gets stored.
     * all stored key will finally be removed from the dictionary.
     * @param dict
     * @param iterationFunction
     */
    CollectionUtil.removeDictElementIfTrue = function (dict, iterationFunction) {
        var toDeleteEntries = [];
        dict.forEach(function (key, value) {
            var shallDelete = iterationFunction(key, value);
            if (shallDelete) {
                toDeleteEntries.push(key);
            }
        });
        for (var i = 0; i < toDeleteEntries.length; i++) {
            dict.remove(toDeleteEntries[i]);
        }
    };
    CollectionUtil.getLastElement = function (array) {
        return array[array.length - 1];
    };
    CollectionUtil.binarySearch = function (array, element, cmp, startIndex, endIndex) {
        if (startIndex === void 0) { startIndex = 0; }
        if (endIndex === void 0) { endIndex = array.length; }
        var mid = 1;
        while (startIndex < endIndex) {
            mid = Math.floor((startIndex + endIndex) / 2);
            var c = cmp(array[mid], element);
            if (c === 0) {
                return mid;
            }
            if (c < 0) {
                startIndex = mid + 1;
            }
            if (0 < c) {
                endIndex = mid;
            }
        }
        return -mid;
    };
    return CollectionUtil;
}());
exports.CollectionUtil = CollectionUtil;
