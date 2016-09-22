/**
 * This class collects useful methods to interact with test data.
 * During tests, XML and MXL documents are preprocessed by karma,
 * and this is some helper code to retrieve them.
 */
export class TestUtils {

    public static getScore(name: string): Document {
        let path: string = "test/data/" + name;
        return ((window as any).__xml__)[path];
    }

    public static getMXL(scoreName: string): string {
        let path: string = "test/data/" + scoreName;
        return ((window as any).__raw__)[path];
    }

    /**
     * Retrieve from a XML document the first element with name "score-partwise"
     * @param doc is the XML Document
     * @returns {Element}
     */
    public static getPartWiseElement(doc: Document): Element {
        let nodes: NodeList = doc.childNodes;
        for (let i: number = 0, length: number = nodes.length; i < length; i += 1) {
            let node: Node = nodes[i];
            if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() === "score-partwise") {
                return <Element>node;
            }
        }
    }

}
