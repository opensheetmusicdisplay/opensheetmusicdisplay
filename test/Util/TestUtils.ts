import { OpenSheetMusicDisplay } from "../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

/**
 * This class collects useful methods to interact with test data.
 * During tests, XML and MXL documents are preprocessed by karma,
 * and this is some helper code to retrieve them.
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
        return new OpenSheetMusicDisplay(div);
    }
}
