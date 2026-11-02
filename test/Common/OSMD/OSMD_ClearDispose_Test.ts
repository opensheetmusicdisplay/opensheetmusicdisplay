import { expect } from "chai";
import * as OSMDExports from "../../../src";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { GraphicalObject } from "../../../src/MusicalScore/Graphical/GraphicalObject";

/**
 * clear() releases the loaded sheet, so that an app that keeps a cleared instance doesn't keep the sheet's memory: its data, its
 * graphical objects, and the SVG elements they drew (1.7 GB for a score of 23,000 notes in jsdom). Before, the drawer, the cursors,
 * EngravingRules.NoteToGraphicalNoteMap and the sheet's links to its graphical measures kept the whole rendering.
 * A dropped instance is freed: no static field keeps an instance's rules or rendering (the static MusicSheetCalculator.TextMeasurer
 * did), and the window's resize listener of autoResize, which kept every instance until dispose(), reaches the instance only
 * through a WeakRef. The container keeps the instance instead, so that it's freed together with its container. dispose() and
 * turning autoResize off remove the listener.
 */
describe("OSMD clear() and dispose()", () => {
    const sampleName: string = "MuzioClementi_SonatinaOpus36No1_Part1.xml";

    /**
     * Returns the objects and DOM nodes that `root` references, directly or indirectly, with the path to each: through the values of
     * properties, array elements, and the entries of Maps and Sets. DOM nodes and the window aren't followed (the container leads to the
     * whole page), nor are functions: what a closure references, e.g. a listener, can't be reached from JavaScript.
     * For a class (the root), these are its static fields; its prototype only has its methods.
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
                if (typeof object === "function" && name === "prototype") {
                    continue;
                }
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

    /** The paths (see referencedBy()) to the sheet's graphical objects and to the SVG elements they drew. */
    function pathsToRendering(paths: Map<object, string>, drawnElements: Element[]): string[] {
        const found: string[] = [];
        paths.forEach((path: string, object: object) => {
            if (object instanceof GraphicalMusicSheet || object instanceof GraphicalObject) {
                found.push(path);
            }
        });
        return found.concat(drawnElements.filter(element => paths.has(element)).map(element => paths.get(element)));
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
            const sheet: MusicSheet = osmd.Sheet; // e.g. an app that keeps the sheet's data

            osmd.clear();
            const afterClear: Map<object, string> = referencedBy(osmd, "osmd");
            const keptByInstance: string[] = pathsToRendering(afterClear, drawnElements);
            afterClear.forEach((path: string, object: object) => {
                if (object instanceof MusicSheet) {
                    keptByInstance.push(path);
                }
            });
            expect(keptByInstance.length, `after clear(), the instance references the sheet: ${keptByInstance.slice(0, 5).join(", ")}`)
                .to.equal(0);
            const keptBySheet: string[] = pathsToRendering(referencedBy(sheet, "sheet"), drawnElements);
            expect(keptBySheet.length, `after clear(), the sheet references its rendering: ${keptBySheet.slice(0, 5).join(", ")}`)
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

    it("keeps no instance's rules, sheet or rendering in static fields", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        try {
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            await osmd.load(TestUtils.getScore(sampleName));
            osmd.render();
            const drawnElements: Element[] = Array.from(container.querySelectorAll("svg *"));
            // what the exported classes reference through their static fields (and the other exports, e.g. enums)
            const kept: string[] = [];
            for (const [name, exported] of Object.entries(OSMDExports)) {
                if (typeof exported !== "function" && (typeof exported !== "object" || exported === null)) {
                    continue;
                }
                const paths: Map<object, string> = referencedBy(exported, name);
                kept.push(...pathsToRendering(paths, drawnElements));
                paths.forEach((path: string, object: object) => {
                    if (object === osmd || object === osmd.EngravingRules || object instanceof MusicSheet) {
                        kept.push(path);
                    }
                });
            }
            expect(kept.length, `static fields reference an instance's rules, sheet or rendering: ${kept.slice(0, 5).join(", ")}`)
                .to.equal(0);
        } finally {
            container.remove();
        }
    });

    interface IListenerRecord {
        /** The number of listeners of an event type that were added while recording and not removed. */
        count: (type: string) => number;
        /** The listeners of an event type that were added while recording and not removed, in the order they were added. */
        listeners: (type: string) => EventListener[];
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
            listeners: (type: string): EventListener[] => Array.from(listeners.get(type) ?? []) as EventListener[],
            restore: (): void => {
                // the patched methods are own properties: deleting them restores the prototype's methods
                delete (target as any).addEventListener;
                delete (target as any).removeEventListener;
            }
        };
    }

    it("dispose() removes the listeners on the window and ends incremental rendering, and the drawing stays", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const windowListeners: IListenerRecord = recordListeners(window);
        try {
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container); // autoResize is on by default
            expect(windowListeners.count("resize"), "with autoResize").to.equal(1);
            await osmd.load(TestUtils.getScore(sampleName));
            osmd.enableIncrementalRenderingOnScroll({ measures: 4 }); // draws the first measures, the next ones when the page is scrolled
            expect(windowListeners.count("scroll"), "while rendering incrementally on scroll").to.equal(1);
            const drawnElements: number = container.querySelectorAll("svg *").length;

            osmd.dispose();
            expect(windowListeners.count("resize"), "resize listeners after dispose()").to.equal(0);
            expect(windowListeners.count("scroll"), "scroll listeners after dispose()").to.equal(0);
            expect(osmd.IncrementalRenderingActive, "incremental rendering after dispose()").to.equal(false);
            expect(container.querySelectorAll("svg *").length, "SVG elements after dispose()").to.equal(drawnElements);
        } finally {
            windowListeners.restore();
            container.remove();
        }
    });

    it("turning autoResize off removes the window's resize listener, turning it on adds it again", () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const windowListeners: IListenerRecord = recordListeners(window);
        try {
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container); // autoResize is on by default
            expect(windowListeners.count("resize"), "with autoResize").to.equal(1);
            osmd.setOptions({ autoResize: false });
            expect(windowListeners.count("resize"), "after setOptions({autoResize: false})").to.equal(0);
            osmd.setOptions({ autoResize: true });
            osmd.setOptions({ autoResize: true });
            expect(windowListeners.count("resize"), "after setOptions({autoResize: true}), twice").to.equal(1);
            osmd.AutoResizeEnabled = false;
            expect(windowListeners.count("resize"), "after AutoResizeEnabled = false").to.equal(0);
            expect(osmd.AutoResizeEnabled, "AutoResizeEnabled after it was set to false").to.equal(false);
            osmd.AutoResizeEnabled = true;
            expect(windowListeners.count("resize"), "after AutoResizeEnabled = true").to.equal(1);
            osmd.dispose();
            expect(windowListeners.count("resize"), "after dispose()").to.equal(0);
            new OpenSheetMusicDisplay(container, { autoResize: false }).dispose();
            expect(windowListeners.count("resize"), "created with autoResize false").to.equal(0);
        } finally {
            windowListeners.restore();
            container.remove();
        }
    });

    it("turning autoResize on again re-renders a rendered sheet only if the container's width changed meanwhile", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "800px";
        /** Waits for the re-render that turning autoResize on schedules (timers of 0 and 1 ms), if any. */
        const timers: () => Promise<void> = (): Promise<void> => new Promise((resolve: () => void) => setTimeout(resolve, 100));
        try {
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container); // autoResize is on by default
            await osmd.load(TestUtils.getScore(sampleName));
            osmd.render();
            const rendered: number = osmd.EngravingRules.RenderCount;
            osmd.setOptions({ autoResize: false });
            osmd.setOptions({ autoResize: true });
            await timers();
            expect(osmd.EngravingRules.RenderCount, "renders after off and on, same width").to.equal(rendered);
            osmd.AutoResizeEnabled = false;
            container.style.width = "600px";
            osmd.AutoResizeEnabled = true;
            await timers();
            expect(osmd.EngravingRules.RenderCount, "renders after off, a narrower container, and on").to.equal(rendered + 1);
            osmd.dispose();
        } finally {
            container.remove();
        }
    });

    it("the window's resize listener reaches the instance only through a WeakRef, re-renders it, and removes itself once it's freed",
       async () => {
        const weakRefs: ReleasableWeakRef[] = [];
        /** A WeakRef whose target the test can release, as the garbage collector frees an object that only WeakRefs reach. */
        class ReleasableWeakRef {
            private target: object;
            constructor(target: object) {
                this.target = target;
                weakRefs.push(this);
            }
            public deref(): object {
                return this.target;
            }
            public release(): void {
                this.target = undefined;
            }
        }
        const global: any = globalThis;
        const weakRefClass: unknown = global.WeakRef;
        const windowListeners: IListenerRecord = recordListeners(window);
        const containers: HTMLElement[] = [TestUtils.getDivElement(document), TestUtils.getDivElement(document)];
        const instances: OpenSheetMusicDisplay[] = [];
        try {
            global.WeakRef = ReleasableWeakRef;
            instances.push(new OpenSheetMusicDisplay(containers[0])); // autoResize is on by default
            global.WeakRef = undefined; // like browsers before 2021: then the listener keeps the instance
            instances.push(new OpenSheetMusicDisplay(containers[1]));
            global.WeakRef = weakRefClass;
            const [osmd, osmdWithoutWeakRef] = instances;
            expect(weakRefs.length, "WeakRefs made").to.equal(1);
            expect(weakRefs[0].deref() === osmd, "the WeakRef's target is the instance").to.equal(true);
            const [listener, listenerWithoutWeakRef] = windowListeners.listeners("resize");

            // a resize re-renders the instance, once no resize event came for 200 ms
            for (const instance of instances) {
                await instance.load(TestUtils.getScore("HelloWorld.xml"));
                instance.render();
            }
            const rendered: number = osmd.EngravingRules.RenderCount;
            listener(new Event("resize"));
            listenerWithoutWeakRef(new Event("resize"));
            for (let waited: number = 0; waited < 2000; waited += 20) {
                if (instances.every((instance: OpenSheetMusicDisplay) => instance.EngravingRules.RenderCount > rendered)) {
                    break;
                }
                await new Promise<void>((resolve: () => void) => setTimeout(resolve, 20));
            }
            expect(osmd.EngravingRules.RenderCount, "renders after a resize").to.equal(rendered + 1);
            expect(osmdWithoutWeakRef.EngravingRules.RenderCount, "renders after a resize, without WeakRef").to.equal(rendered + 1);

            weakRefs[0].release(); // as if the instance had been freed
            listener(new Event("resize"));
            expect(windowListeners.count("resize"), "resize listeners after a resize event, once the instance was freed").to.equal(1);
            expect(windowListeners.listeners("resize")[0] === listenerWithoutWeakRef, "the one without WeakRef stays").to.equal(true);
        } finally {
            global.WeakRef = weakRefClass;
            instances.forEach((instance: OpenSheetMusicDisplay) => instance.dispose());
            windowListeners.restore();
            containers.forEach((container: HTMLElement) => container.remove());
        }
    });

    /** Whether an own property of the element has the object as its value, also a non-enumerable one or one keyed by a symbol. */
    function keeps(element: HTMLElement, object: object): boolean {
        return Reflect.ownKeys(element).some((key: PropertyKey) => Object.getOwnPropertyDescriptor(element, key).value === object);
    }

    it("with autoResize, the container keeps the instance until autoResize is turned off or dispose(), a newer instance replaces it", () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        try {
            const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container); // autoResize is on by default
            expect(keeps(container, osmd), "with autoResize").to.equal(true);
            osmd.setOptions({ autoResize: false });
            expect(keeps(container, osmd), "after setOptions({autoResize: false})").to.equal(false);
            osmd.AutoResizeEnabled = true;
            expect(keeps(container, osmd), "after AutoResizeEnabled = true").to.equal(true);
            // e.g. an app that makes an instance for each score it shows in the container, and doesn't call dispose()
            const newer: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container);
            expect(keeps(container, osmd), "the older instance, after a newer one was made for the container").to.equal(false);
            expect(keeps(container, newer), "the newer instance").to.equal(true);
            osmd.dispose();
            expect(keeps(container, newer), "the newer instance, after the older one's dispose()").to.equal(true);
            newer.dispose();
            expect(keeps(container, newer), "after dispose()").to.equal(false);
            const withoutAutoResize: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(container, { autoResize: false });
            expect(keeps(container, withoutAutoResize), "created with autoResize false").to.equal(false);
        } finally {
            container.remove();
        }
    });
});
