import { expect } from "vitest";
import "../../../src";

describe("Loading OSMD", () => {
    it("adds nothing to Array.prototype of the page", () => {
        // Until 3.0, CollectionUtil.ts added last(), contains() and clear() to all arrays of the page.
        // A new iframe has the browser's own Array.prototype, whatever methods this browser version has.
        const iframe: HTMLIFrameElement = document.createElement("iframe");
        document.body.appendChild(iframe);
        const untouchedNames: string[] = Object.getOwnPropertyNames((iframe.contentWindow as any).Array.prototype);
        document.body.removeChild(iframe);
        const addedNames: string[] = Object.getOwnPropertyNames(Array.prototype).filter(name => !untouchedNames.includes(name));
        expect(addedNames, "names added to Array.prototype").to.deep.equal([]);
    });
});
