import { Dictionary } from "typescript-collections";

// OSMD itself doesn't use these three additions to Array.prototype anymore: a library shouldn't change the arrays of the
//   page it runs in, or the Array type of every TypeScript project that imports it. They stay defined for now, for apps
//   that came to rely on them, and will be removed in a future major version.
//   OSMD's code uses instead: CollectionUtil.getLastElement(array), array.includes(element), and array.length = 0, which
//   empties an array in place (see clear() below).
declare global {
    interface Array<T> {
        /** Returns the last element from an array.
         *  @deprecated Added to Array.prototype by OSMD, to be removed in a future major version.
         *  Use `array[array.length - 1]` (or `CollectionUtil.getLastElement(array)`). */
        last(): T;
        /** Deletes all elements from an array.
         *  @deprecated Added to Array.prototype by OSMD, to be removed in a future major version. Use `array.length = 0`:
         *  JavaScript's way to empty an array in place, and all this method did. It removes every element, so that they
         *  can be garbage collected, and everyone holding the array sees it empty (`array = []` would make a new array
         *  and leave the old one as it is). */
        clear(): void;
        /** Returns true if the element is found in the array.
         *  @deprecated Added to Array.prototype by OSMD, to be removed in a future major version. Use `array.includes(elem)`. */
        contains(elem: T): boolean;
    }
}

if (!Array.prototype.last) {
    // using Object.defineProperty instead of assigning Array.prototype.x directly prevents prototype pollution, see #980
    Object.defineProperty(Array.prototype, "last", {
        enumerable: false,
        writable: true,
        value: function<T>(): T {
            return this[this.length - 1];
        }
    });
}

if (!Array.prototype.clear) {
    Object.defineProperty(Array.prototype, "clear", {
        enumerable: false,
        writable: true,
        value: function(): void {
            this.length = 0;
        }
    });
}

if (!Array.prototype.contains) {
    Object.defineProperty(Array.prototype, "contains", {
        enumerable: false,
        writable: true,
        value: function<T>(elem: T): boolean {
            return this.indexOf(elem) !== -1;
        }
    });
}

/**
 * This class implements static methods to perform useful operations on lists, dictionaries, ...
 */
export class CollectionUtil {

    public static contains2(array: any[], object: any): boolean {
        for (let i: number = 0; i < array.length; i++) {
            if (array[i] === object) {
                return true;
            }
        }
        return false;
    }

    public static last(array: any[]): any {
        return array[array.length - 1];
    }

    /** Array.flat(), introduced in ES2019, polyfilled here to stick with ES2017 target in tsconfig.json.
     *  Performance tests: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1299#issuecomment-1399062038
     */
    public static flat(array: any[]): any {
        return [].concat(...array);
    }

    /**
     * Iterates through a dictionary and calls iterationFunction.
     * If iterationFunction returns true the key gets stored.
     * all stored key will finally be removed from the dictionary.
     * @param dict
     * @param iterationFunction
     */
    public static removeDictElementIfTrue<S, T, V>(thisPointer: S, dict: Dictionary<T, V>,
                                                   iterationFunction: (thisPointer: S, key: T, value: V) => boolean): void {
        const toDeleteEntries: T[] = [];
        dict.forEach(function (key: T, value: V): void {
            const shallDelete: boolean = iterationFunction(thisPointer, key, value);
            if (shallDelete) {
                toDeleteEntries.push(key);
            }
        });

        for (let i: number = 0; i < toDeleteEntries.length; i++) {
            dict.remove(toDeleteEntries[i]);
        }
    }

    public static getLastElement<T>(array: T[]): T {
        return array[array.length - 1];
    }

    public static binarySearch<T>(array: T[],
                                  element: T,
                                  cmp: (elem1: T, elem2: T) => number,
                                  startIndex: number = 0,
                                  endIndex: number = array.length - 1): number {
        let mid: number = 1;
        let lastMidChecked: number = -1;
        while (startIndex <= endIndex) {
            mid = Math.floor((startIndex + endIndex) / 2);
            if (mid === lastMidChecked) {
                break;
                // this fixes a rare infinite loop when no matching element can be found,
                //   e.g. with very small fraction difference in AbsoluteTimestamp like 511/1024 instead of 1/2 (#1201)
            }
            const c: number = cmp(array[mid], element);
            if (c === 0) {
                return mid;
            }
            if (c < 0) {
                startIndex = mid + 1;
            }
            if (0 < c) {
                endIndex = mid;
            }
            lastMidChecked = mid;
        }

        return -mid;
    }
}
