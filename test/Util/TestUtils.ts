import log from "loglevel";
import { MockInstance, onTestFinished, vi } from "vitest";
import { OpenSheetMusicDisplay } from "../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

/**
 * This class collects useful methods to interact with test data.
 * During tests, test/Util/vitestSetup.mjs provides the XML and MXL documents of test/data
 * (window.__xml__, window.__raw__, as karma's preprocessors did), and this is some helper code to retrieve them.
 */
export class TestUtils {

    public static getScore(name: string): Document {
        const path: string = "test/data/" + name;
        return ((window as any).__xml__)[path];
    }

    public static getMXL(scoreName: string): string {
        const path: string = "test/data/" + scoreName;
        return ((window as any).__raw__)[path];
    }

    public static getDivElement(document: Document): HTMLElement {
        const div: HTMLElement = document.createElement("div");
        const body: HTMLElement = document.getElementsByTagName("body")[0];
        body.appendChild(div);
        return div;
    }

    /**
     * Retrieve from a XML document the first element with name "score-partwise"
     * @param doc is the XML Document
     * @returns {Element}
     */
    public static getPartWiseElement(doc: Document): Element {
        const nodes: NodeList = doc.childNodes;
        for (let i: number = 0, length: number = nodes.length; i < length; i += 1) {
            const node: Node = nodes[i];
            if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() === "score-partwise") {
                return <Element>node;
            }
        }
    }

    public static createOpenSheetMusicDisplay(div: HTMLElement): OpenSheetMusicDisplay {
        return new OpenSheetMusicDisplay(div, {autoResize: false});
    }

    /**
     * Catches the warnings and errors logged from now until the test ends (loglevel's log.warn() and log.error(), which
     * OSMD logs with, and console.warn() and console.error()) instead of printing them. For a test that expects some and
     * checks them, so that the test output only shows unexpected ones.
     * @returns the messages caught, added as they're logged (an Error as its text, e.g. "Error: Corrupted zip ...")
     */
    public static catchLogs(): string[] {
        const messages: string[] = [];
        const catchMessage: (...args: unknown[]) => void = (...args: unknown[]): void => {
            messages.push(args.map(String).join(" "));
        };
        const spies: MockInstance[] = [];
        for (const level of ["warn", "error"] as const) {
            spies.push(vi.spyOn(log, level).mockImplementation(catchMessage), vi.spyOn(console, level).mockImplementation(catchMessage));
        }
        onTestFinished((): void => spies.forEach((spy: MockInstance): void => spy.mockRestore()));
        return messages;
    }

    /**
     * Puts setTimeout(), clearTimeout() and Date on Vitest's fake clock until the test ends, so that the test lets time pass
     * at once with vi.advanceTimersByTime() or vi.runAllTimers() instead of waiting, e.g. for OSMD's resize timers or for a
     * click, which OSMD reports only after the 200 ms of a double click (measured with Date). Does nothing if the fake clock
     * is on already. Promises, requestAnimationFrame() and the browser's own callbacks (e.g. ResizeObserver's) stay real.
     */
    public static useFakeClock(): void {
        if (vi.isFakeTimers()) {
            return;
        }
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
        onTestFinished((): void => { vi.useRealTimers(); });
    }
}
