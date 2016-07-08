import Dictionary from "typescript-collections/dist/lib/Dictionary";
export declare class CollectionUtil {
    static contains2(array: any[], object: any): boolean;
    static last(array: any[]): any;
    /**
     * Iterates through a dictionary and calls iterationFunction.
     * If iterationFunction returns true the key gets stored.
     * all stored key will finally be removed from the dictionary.
     * @param dict
     * @param iterationFunction
     */
    static removeDictElementIfTrue<T, V>(dict: Dictionary<T, V>, iterationFunction: (key: T, value: V) => boolean): void;
    static getLastElement<T>(array: T[]): T;
    static binarySearch<T>(array: T[], element: T, cmp: (elem1: T, elem2: T) => number, startIndex?: number, endIndex?: number): number;
}
