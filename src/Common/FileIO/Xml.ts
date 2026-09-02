/**
 * IXmlAttribute is just the standard Attr
 */
export type IXmlAttribute = Attr;

/**
 * Just a wrapper for an XML Element object.
 * It facilitates handling of XML elements by OSMD
 */
export class IXmlElement {
    public name: string;
    public value: string;
    public hasAttributes: boolean = false;
    public firstAttribute: IXmlAttribute;
    public hasElements: boolean;

    private attrs: IXmlAttribute[];
    private elem: Element;

    /**
     * Wraps 'elem' Element in a IXmlElement
     * @param elem
     * @param knownName the element's lower-cased node name, when the caller
     * already matched on it - saves a DOM read and a toLowerCase() per wrapper
     */
    constructor(elem: Element, knownName?: string) {
        if (!elem) {
            throw new Error("IXmlElement: expected Element, got undefined");
        }
        this.elem = elem;
        this.name = knownName !== undefined ? knownName : elem.nodeName.toLowerCase();

        if (elem.hasAttributes()) {
            this.hasAttributes = true;
            this.firstAttribute = elem.attributes[0];
        }
        this.hasElements = elem.hasChildNodes();
        // Look for a value
        const first: Node = elem.firstChild;
        if (first && !first.nextSibling && first.nodeType === Node.TEXT_NODE) {
            this.value = first.nodeValue;
        } else {
            this.value = "";
        }
    }

    /**
     * Get the attribute with the given name
     * @param attributeName
     * @returns {Attr}
     */
    public attribute(attributeName: string): IXmlAttribute {
        return this.elem.getAttributeNode(attributeName);
    }

    /**
     * Get all attributes
     * @returns {IXmlAttribute[]}
     */
    public attributes(): IXmlAttribute[] {
        if (!this.attrs) {
            const attributes: NamedNodeMap = this.elem.attributes;
            const attrs: IXmlAttribute[] = [];
            for (let i: number = 0; i < attributes.length; i += 1) {
                attrs.push(attributes[i]);
            }
            this.attrs = attrs;
        }
        return this.attrs;
    }

    /**
     * Get the first child element with the given node name
     * @param elementName
     * @returns {IXmlElement}
     */
    public element(elementName: string): IXmlElement {
        for (let node: Element = this.elem.firstElementChild; node; node = node.nextElementSibling) {
            if (node.nodeName.toLowerCase() === elementName) {
                // A match means elementName IS the lower-cased node name, so it
                // can stand in for the name the wrapper would recompute.
                return new IXmlElement(node, elementName);
            }
        }
    }

    /**
     * Get the children with the given node name (if given, otherwise all child elements)
     * @param nodeName
     * @returns {IXmlElement[]}
     */
    public elements(nodeName?: string): IXmlElement[] {
        const ret: IXmlElement[] = [];
        const nameUnset: boolean = !nodeName;
        if (!nameUnset) {
            nodeName = nodeName.toLowerCase();
        }
        for (let node: Element = this.elem.firstElementChild; node; node = node.nextElementSibling) {
            if (nameUnset) {
                ret.push(new IXmlElement(node));
            } else if (node.nodeName.toLowerCase() === nodeName) {
                ret.push(new IXmlElement(node, nodeName));
            }
        }
        return ret;
    }

    /**
     * Get the first child element with the given node name
     * with all the children of consequent child elements with the same node name.
     * for example two <notations> tags will be combined for better processing
     * @param elementName
     * @returns {IXmlElement}
     */
    public combinedElement(elementName: string): IXmlElement {
        let firstNode: Element;
        for (let otherNode: Element = this.elem.firstElementChild; otherNode; otherNode = otherNode.nextElementSibling) {
            if (otherNode.nodeName.toLowerCase() !== elementName) {
                continue;
            }
            if (!firstNode) {
                firstNode = otherNode;
                continue;
            }
            const childNodes: NodeList = otherNode.childNodes;
            for (let j: number = 0, numChildNodes: number = childNodes.length; j < numChildNodes; j += 1) {
                const childNode: Node = childNodes[j];
                firstNode.appendChild(childNode.cloneNode(true));
            }
        }
        if (firstNode) {
            return new IXmlElement(firstNode, elementName);
        }
    }
}
