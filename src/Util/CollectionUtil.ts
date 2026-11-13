import { Dictionary } from "typescript-collections";

/**
 * This class implements static methods to perform useful operations on lists, dictionaries, ...
 *
 * Until OSMD 3.0, this file also added last(), contains() and clear() to Array.prototype, for all arrays of the page
 * and of every TypeScript project importing OSMD. A library shouldn't change its host's built-ins, so they are gone.
 * Instead:
 * - `array.last()`: `CollectionUtil.getLastElement(array)` or `array[array.length - 1]`
 * - `array.contains(element)`: `array.includes(element)`
 * - `array.clear()`: `array.length = 0`, JavaScript's way to empty an array in place, and all clear() did. It removes
 *   every element, so that they can be garbage collected, and everyone holding the array sees it empty
 *   (`array = []` would make a new array and leave the old one as it is).
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
