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
        }
    }

    public attribute(attributeName: string): IXmlAttribute {
        return this.elem.attributes.getNamedItem(attributeName);
    }

    public attributes(): IXmlAttribute[] {
        if (typeof this.attrs === "undefined") {
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
        return this.elements(elementName)[0];
    }

    public elements(nodeName?: string): IXmlElement[] {
        let nodes: NodeList = this.elem.childNodes;
        let ret: IXmlElement[] = [];
        let nameUnset: boolean = nodeName === undefined;
        if (!nameUnset) {
            nodeName = nodeName.toLowerCase();
        }
        // console.log("-", nodeName, nodes.length, this.elem.childElementCount, this.elem.getElementsByTagName(nodeName).length);
        // if (nodeName === "measure") {
        //   console.log(this.elem);
        // }
        for (let i: number = 0; i < nodes.length; i += 1) {
            let node: Node = nodes[i];
            //console.log("node: ", this.elem.nodeName, ">>", node.nodeName, node.nodeType === Node.ELEMENT_NODE);
            if (node.nodeType === Node.ELEMENT_NODE &&
                (nameUnset || node.nodeName.toLowerCase() === nodeName)) {
                ret.push(new IXmlElement(node as Element));
            }
        }
        return ret;
    }
}
