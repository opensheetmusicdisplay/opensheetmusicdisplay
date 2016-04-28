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
}
