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

    private attrs: IXmlAttribute[] = undefined;
    private elem: Element;
    // value, hasAttributes, firstAttribute and hasElements are read from the element when they are first used
    //   (or set), not for every wrapper: most wrappers (~80% when reading a score) are only used for their name,
    //   attributes or child elements, and each of these reads is a call into the DOM.
    //   (All fields are initialized here, so that all wrappers have the same shape for the JavaScript engine.)
    private valueOfElement: string = undefined;
    private valueKnown: boolean = false;
    private hasAttributesOfElement: boolean = false;
    private firstAttributeOfElement: IXmlAttribute = undefined;
    private attributeFieldsKnown: boolean = false;
    private hasElementsOfElement: boolean = false;
    private hasElementsKnown: boolean = false;
    // The child elements and their lower-cased node names, from the second lookup of child elements on (see childList()).
    private childElements: Element[] = undefined;
    private childNames: string[] = undefined;
    private childLookups: number = 0;

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
    }

    /** The text of the element if it only contains one text node, otherwise "". */
    public get value(): string {
        if (!this.valueKnown) {
            const first: Node = this.elem.firstChild;
            this.valueOfElement = first && !first.nextSibling && first.nodeType === Node.TEXT_NODE ? first.nodeValue : "";
            this.valueKnown = true;
        }
        return this.valueOfElement;
    }

    public set value(value: string) {
        this.valueOfElement = value;
        this.valueKnown = true;
    }

    /** Whether the element has attributes. */
    public get hasAttributes(): boolean {
        this.readAttributeFields();
        return this.hasAttributesOfElement;
    }

    public set hasAttributes(value: boolean) {
        this.readAttributeFields();
        this.hasAttributesOfElement = value;
    }

    /** The first attribute of the element, undefined if it has none. */
    public get firstAttribute(): IXmlAttribute {
        this.readAttributeFields();
        return this.firstAttributeOfElement;
    }

    public set firstAttribute(value: IXmlAttribute) {
        this.readAttributeFields();
        this.firstAttributeOfElement = value;
    }

    /** Whether the element has child nodes (of any kind, e.g. also text). */
    public get hasElements(): boolean {
        if (!this.hasElementsKnown) {
            this.hasElementsOfElement = this.elem.hasChildNodes();
            this.hasElementsKnown = true;
        }
        return this.hasElementsOfElement;
    }

    public set hasElements(value: boolean) {
        this.hasElementsOfElement = value;
        this.hasElementsKnown = true;
    }

    /** Reads hasAttributes and firstAttribute from the element, if not done yet. */
    private readAttributeFields(): void {
        if (this.attributeFieldsKnown) {
            return;
        }
        this.attributeFieldsKnown = true;
        this.hasAttributesOfElement = false;
        if (this.elem.hasAttributes()) {
            this.hasAttributesOfElement = true;
            this.firstAttributeOfElement = this.elem.attributes[0];
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
        const children: Element[] = this.childList();
        if (children) {
            const names: string[] = this.childNames;
            for (let i: number = 0; i < names.length; i++) {
                if (names[i] === elementName) {
                    return new IXmlElement(children[i], elementName);
                }
            }
            return undefined;
        }
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
        const children: Element[] = this.childList();
        if (children) {
            const names: string[] = this.childNames;
            for (let i: number = 0; i < children.length; i++) {
                if (nameUnset) {
                    ret.push(new IXmlElement(children[i], names[i]));
                } else if (names[i] === nodeName) {
                    ret.push(new IXmlElement(children[i], nodeName));
                }
            }
            return ret;
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
        const combine: (otherNode: Element) => void = (otherNode: Element): void => {
            if (!firstNode) {
                firstNode = otherNode;
                return;
            }
            const childNodes: NodeList = otherNode.childNodes;
            for (let j: number = 0, numChildNodes: number = childNodes.length; j < numChildNodes; j += 1) {
                const childNode: Node = childNodes[j];
                firstNode.appendChild(childNode.cloneNode(true));
            }
        };
        // (appending to the first node doesn't change this element's child elements, so the cached list stays valid)
        const children: Element[] = this.childList();
        if (children) {
            const names: string[] = this.childNames;
            for (let i: number = 0; i < children.length; i++) {
                if (names[i] === elementName) {
                    combine(children[i]);
                }
            }
        } else {
            for (let otherNode: Element = this.elem.firstElementChild; otherNode; otherNode = otherNode.nextElementSibling) {
                if (otherNode.nodeName.toLowerCase() === elementName) {
                    combine(otherNode);
                }
            }
        }
        if (firstNode) {
            return new IXmlElement(firstNode, elementName);
        }
    }

    /**
     * The child elements of the element, for a wrapper that is looked up in repeatedly (e.g. a note, about 10 times when
     * reading a score): scanning this list with their names is much faster than walking the child elements in the DOM for
     * every lookup, especially for the many lookups of names that aren't there. Read at the second lookup (most wrappers are
     * looked up in once, which walks the DOM as before), and read again if the element has another last child element,
     * i.e. if child elements were appended, like combinedElement() appends to the first element with a name.
     * @returns the child elements (with their names in childNames), or undefined for a first lookup, which walks the DOM
     */
    private childList(): Element[] {
        if (this.childElements) {
            const last: Element = this.childElements.length > 0 ? this.childElements[this.childElements.length - 1] : null;
            if (this.elem.lastElementChild === last) {
                return this.childElements;
            }
        } else if (++this.childLookups < 2) {
            return undefined;
        }
        const elements: Element[] = [];
        const names: string[] = [];
        for (let node: Element = this.elem.firstElementChild; node; node = node.nextElementSibling) {
            elements.push(node);
            names.push(node.nodeName.toLowerCase());
        }
        this.childElements = elements;
        this.childNames = names;
        return elements;
    }
}
