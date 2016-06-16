import {Dictionary} from 'typescript-collections/dist/lib/Dictionary';

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

    /**
     * Iterates through a dictionary and calls iterationFunction.
     * If iterationFunction returns true the key gets stored.
     * all stored key will finally be removed from the dictionary.
     * @param dict
     * @param iterationFunction
     */
    public static removeDictElementIfTrue<T, V>(dict: Dictionary<T, V>, iterationFunction: (key: T, value: V) => boolean): void
    {
        let toDeleteEntries: T[] = [];
        dict.forEach(function(key: T, value: V) {
            let shallDelete: boolean = iterationFunction(key, value);
            if (shallDelete)
                toDeleteEntries.push(key);
        });

        for (let i: number = 0; i < toDeleteEntries.length; i++) {
            dict.remove(toDeleteEntries[i]);
        }
    }
    
    public static getLastElement<T>(array: T[]): T{
        return array[array.length-1];
    }
}
