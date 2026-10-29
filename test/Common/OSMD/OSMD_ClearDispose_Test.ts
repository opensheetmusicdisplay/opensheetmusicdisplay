import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { GraphicalObject } from "../../../src/MusicalScore/Graphical/GraphicalObject";

/**
 * clear() releases the loaded sheet, so that an app that keeps a cleared instance doesn't keep the sheet's memory: its data, its
 * graphical objects, and the SVG elements they drew (1.7 GB for a score of 23,000 notes in jsdom). Before, the drawer, the cursors and
 * EngravingRules.NoteToGraphicalNoteMap kept the whole rendering. dispose() also removes OSMD's listeners on the window: the resize
 * listener of autoResize (on by default) kept every instance in memory as long as the page was open.
 */
describe("OSMD clear() and dispose()", () => {
    const sampleName: string = "MuzioClementi_SonatinaOpus36No1_Part1.xml";

    /**
     * Returns the objects and DOM nodes that `root` references, directly or indirectly, with the path to each: through the values of
     * properties, array elements, and the entries of Maps and Sets. DOM nodes and the window aren't followed (the container leads to the
     * whole page), nor are functions: what a closure references, e.g. a listener, can't be reached from JavaScript.
     */
    function referencedBy(root: object, rootName: string): Map<object, string> {
        const paths: Map<object, string> = new Map([[root, rootName]]);
        const queue: object[] = [root];
        for (let i: number = 0; i < queue.length; i++) {
            const object: object = queue[i];
            const references: [string, unknown][] = [];
            if (object instanceof Map) {
                object.forEach((value, key) => references.push(["(key)", key], ["(value)", value]));
            } else if (object instanceof Set) {
                object.forEach(value => references.push(["(entry)", value]));
            }
            for (const name of Object.getOwnPropertyNames(object)) {
                // the value of a data property (undefined for an accessor property: getters aren't called)
                references.push(["." + name, Object.getOwnPropertyDescriptor(object, name).value]);
            }
            for (const [name, value] of references) {
                if (typeof value !== "object" || value === null || paths.has(value)) {
                    continue;
                }
                paths.set(value, paths.get(object) + name);
                if (!(value instanceof Node) && value !== window && !ArrayBuffer.isView(value)) {
                    queue.push(value);
                }
            }
        }
        return paths;
    }

    it("clear() releases the sheet and what was drawn, and the instance can load and render again", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1000px"; // the same layout for both renders, with or without the page's scrollbar
        try {
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            await osmd.load(TestUtils.getScore(sampleName));
            osmd.render();
            const drawnElements: Element[] = Array.from(container.querySelectorAll("svg *"));
            // the check finds the rendering while it's shown
            const whileRendered: Map<object, string> = referencedBy(osmd, "osmd");
            expect(whileRendered.has(osmd.GraphicSheet), "the instance references its rendered sheet").to.equal(true);
            expect(drawnElements.filter(element => whileRendered.has(element)).length > 0,
                   "the instance references drawn SVG elements (through the graphical objects)").to.equal(true);

            osmd.clear();
            const afterClear: Map<object, string> = referencedBy(osmd, "osmd");
            const keptObjects: string[] = [];
            afterClear.forEach((path: string, object: object) => {
                if (object instanceof MusicSheet || object instanceof GraphicalMusicSheet || object instanceof GraphicalObject) {
                    keptObjects.push(path);
                }
            });
            expect(keptObjects.length, `after clear(), the instance references the sheet's objects: ${keptObjects.slice(0, 5).join(", ")}`)
                .to.equal(0);
            const keptElements: string[] = drawnElements.filter(element => afterClear.has(element)).map(element => afterClear.get(element));
            expect(keptElements.length, `after clear(), the instance references drawn SVG elements: ${keptElements.slice(0, 5).join(", ")}`)
                .to.equal(0);

            // the cursor is kept, and does nothing without a sheet
            const cursor: Cursor = osmd.cursor;
            cursor.show();
            cursor.next();
            expect(cursor.Iterator === undefined, "the cleared cursor's iterator is undefined").to.equal(true);
            expect(cursor.NotesUnderCursor().length, "notes under the cleared cursor").to.equal(0);
            expect(cursor.cursorElement.style.display, "the cleared cursor is hidden").to.equal("none");

            await osmd.load(TestUtils.getScore(sampleName));
            osmd.render();
            expect(container.querySelectorAll("svg *").length, "SVG elements drawn again").to.equal(drawnElements.length);
            osmd.cursor.show();
            osmd.cursor.next();
            expect(osmd.cursor.NotesUnderCursor().length > 0, "notes under the cursor after next()").to.equal(true);
        } finally {
            container.remove();
        }
    });

    interface IListenerRecord {
        /** The number of listeners of an event type that were added while recording and not removed. */
        count: (type: string) => number;
        restore: () => void;
    }

    /** Records the listeners added to and removed from a target, until restore(). */
    function recordListeners(target: EventTarget): IListenerRecord {
        const listeners: Map<string, Set<EventListenerOrEventListenerObject>> = new Map();
        const add: typeof target.addEventListener = target.addEventListener;
        const remove: typeof target.removeEventListener = target.removeEventListener;
        target.addEventListener = function (type: string, listener: EventListenerOrEventListenerObject, options?: any): void {
            if (!listeners.has(type)) {
                listeners.set(type, new Set());
            }
            listeners.get(type).add(listener);
            add.call(this, type, listener, options);
        };
        target.removeEventListener = function (type: string, listener: EventListenerOrEventListenerObject, options?: any): void {
            listeners.get(type)?.delete(listener);
            remove.call(this, type, listener, options);
        };
        return {
            count: (type: string): number => listeners.get(type)?.size ?? 0,
            restore: (): void => {
                // the patched methods are own properties: deleting them restores the prototype's methods
                delete (target as any).addEventListener;
                delete (target as any).removeEventListener;
            }
        };
    }

    it("dispose() removes the listeners on the window and clears the sheet", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const windowListeners: IListenerRecord = recordListeners(window);
        try {
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container); // autoResize is on by default
            expect(windowListeners.count("resize"), "with autoResize").to.equal(1);
            await osmd.load(TestUtils.getScore(sampleName));
            osmd.enableIncrementalRenderingOnScroll({ measures: 4 }); // draws the first measures, the next ones when the page is scrolled
            expect(windowListeners.count("scroll"), "while rendering incrementally on scroll").to.equal(1);

            osmd.dispose();
            expect(windowListeners.count("resize"), "resize listeners after dispose()").to.equal(0);
            expect(windowListeners.count("scroll"), "scroll listeners after dispose()").to.equal(0);
            expect(osmd.Sheet === undefined && osmd.GraphicSheet === undefined, "the sheet is released").to.equal(true);
            expect(container.querySelectorAll("svg *").length, "SVG elements left after dispose()").to.equal(0);
        } finally {
            windowListeners.restore();
            container.remove();
        }
    });
});
