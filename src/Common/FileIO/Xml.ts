export type IXmlAttribute = Attr;

export class IXmlElement {
    public name: string;
    public value: string;
    public hasAttributes: boolean = false;
    public firstAttribute: IXmlAttribute;
    public hasElements: boolean;

    private attrs: IXmlAttribute[];
    private elem: Element;

    constructor(elem: Element) {
        if (elem === undefined) {
            throw new Error("IXmlElement: expected Element, got undefined");
        }
        this.elem = elem;
        this.name = elem.nodeName.toLowerCase();

        if (elem.hasAttributes()) {
            this.hasAttributes = true;
            this.firstAttribute = elem.attributes[0];
        }
        this.hasElements = elem.hasChildNodes();
        // Look for a value
        if (elem.childNodes.length === 1 && elem.childNodes[0].nodeType === Node.TEXT_NODE) {
            this.value = elem.childNodes[0].nodeValue;
        } else {
            this.value = "";
        }
    }

    public attribute(attributeName: string): IXmlAttribute {
        return this.elem.attributes.getNamedItem(attributeName);
    }

    public attributes(): IXmlAttribute[] {
        if (!this.attrs) {
            let attributes: NamedNodeMap = this.elem.attributes;
            let attrs: IXmlAttribute[] = [];
            for (let i: number = 0; i < attributes.length; i += 1) {
                attrs.push(attributes[i]);
            }
            this.attrs = attrs;
        }
        return this.attrs;
    }

    public element(elementName: string): IXmlElement {
        let nodes: NodeList = this.elem.childNodes;
        for (let i: number = 0, length: number = nodes.length; i < length; i += 1) {
            let node: Node = nodes[i];
            if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() === elementName) {
                return new IXmlElement(node as Element);
            }
        }
    }

    public elements(nodeName?: string): IXmlElement[] {
        let nodes: NodeList = this.elem.childNodes;
        let ret: IXmlElement[] = [];
        let nameUnset: boolean = nodeName === undefined;
        if (!nameUnset) {
            nodeName = nodeName.toLowerCase();
        }
        for (let i: number = 0; i < nodes.length; i += 1) {
            let node: Node = nodes[i];
            if (node.nodeType === Node.ELEMENT_NODE &&
                (nameUnset || node.nodeName.toLowerCase() === nodeName)
            ) {
                ret.push(new IXmlElement(node as Element));
            }
        }
        return ret;
    }
}
