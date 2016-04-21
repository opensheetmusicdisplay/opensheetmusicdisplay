export class IXmlAttribute {
  public Name: string;
  public Value: string;

  constructor(attr: Attr) {
    this.Name = attr.name;
    this.Value = attr.value;
  };
}

export class IXmlElement {
  public Name: string;
  public Value: string;
  public HasAttributes: boolean = false;
  public FirstAttribute: IXmlAttribute;
  public HasElements: boolean;

  private _attrs: IXmlAttribute[];
  private _elem: Element;

  constructor(elem: Element) {
    this._elem = elem;
    this.Name = elem.nodeName;

    if (elem.hasAttributes()) {
      this.HasAttributes = true;
      this.FirstAttribute = new IXmlAttribute(elem.attributes[0]);
      }
    this.HasElements = elem.hasChildNodes();
    // Look for a value
    if (
      elem.childNodes.length === 1 &&
      elem.childNodes[0].nodeType === Node.TEXT_NODE
    ) {
      this.Value = elem.childNodes[0].nodeValue;
    }
  }

  public Attribute(attributeName: string): IXmlAttribute {
    return new IXmlAttribute(this._elem.attributes.getNamedItem(attributeName));
  }

  public Attributes(): IXmlAttribute[] {
    if (typeof this._attrs === "undefined") {
      let attributes: NamedNodeMap = this._elem.attributes;
      let attrs: IXmlAttribute[] = new Array();
      for (let i: number = 0; i < attributes.length; i += 1) {
        attrs.push(new IXmlAttribute(attributes[i]));
      }
      this._attrs = attrs;
    }
    return this._attrs;
  }

  public Element(elementName: string): IXmlElement {
    return this.Elements(elementName)[0];
  }

  public Elements(nodeName?: string): IXmlElement[] {
    let nodes: NodeList = this._elem.childNodes;
    let ret: IXmlElement[] = new Array();
    let nameUnset: boolean = typeof nodeName === "undefined";
    for (let i: number = 0; i < nodes.length; i += 1) {
      let node: Node = nodes[i];
      if (node.nodeType === Node.ELEMENT_NODE &&
        (nameUnset || node.nodeName === nodeName)) {
          ret.push(new IXmlElement(<Element> node));
        }
    }
    return ret;
  }
}
