export class CollectionUtil {

    public static contains(array: any[], object: any): boolean {
        for (let i: number = 0; i < array.length; i++) {
            if (array[i] === object) {
                return true;
            }
        }

        return false;
    }
}
