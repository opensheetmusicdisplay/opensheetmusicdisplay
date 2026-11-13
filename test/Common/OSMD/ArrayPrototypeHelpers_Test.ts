import { expect } from "vitest";
import "../../../src/Util/CollectionUtil";

describe("Array.prototype helpers of CollectionUtil.ts (deprecated)", () => {
    it("are still defined for apps that use them, and not enumerable", () => {
        // OSMD's own code doesn't call them anymore. They stay until a major version removes them.
        const array: number[] = [1, 2, 3];
        expect(Array.prototype.last.call(array), "last()").to.equal(3);
        expect(Array.prototype.contains.call(array, 2), "contains(2)").to.equal(true);
        expect(Array.prototype.contains.call(array, 4), "contains(4)").to.equal(false);
        Array.prototype.clear.call(array);
        expect(array.length, "length after clear()").to.equal(0);
        for (const name of ["last", "contains", "clear"]) {
            expect(Object.prototype.propertyIsEnumerable.call(Array.prototype, name), name + " is enumerable (for...in)").to.equal(false);
        }
    });
});
