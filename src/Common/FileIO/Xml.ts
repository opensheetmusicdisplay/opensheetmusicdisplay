class XmlAttribute {
  public Name: string;
  public Value: string;

  constructor(attr: Attr) {
    this.Name = attr.name;
    this.Value = attr.value;
  };
}

class XmlElement {
  public Name: string;
  public Value: string;
  public HasAttributes: boolean = false;
  public FirstAttribute: XmlAttribute;
  public HasElements: boolean;

  private _attrs: XmlAttribute[];
  private _elem: Element;

  constructor(elem: Element) {
    this._elem = elem;
    if (elem.hasAttributes()) {
      this.HasAttributes = true;
      this.FirstAttribute = new XmlAttribute(elem.attributes[0]);
      }
    this.HasElements = elem.hasChildNodes();
  }

  public Attribute(attributeName: string): XmlAttribute {
    return new XmlAttribute(this._elem.attributes.getNamedItem(attributeName));
  }

  public Attributes(): XmlAttribute[] {
    if (typeof this._attrs === "undefined") {
      let attributes: NamedNodeMap = this._elem.attributes;
      let attrs: XmlAttribute[] = new Array();
      for (let i: number = 0; i < attributes.length; i += 1) {
        attrs.push(new XmlAttribute(attributes[i]));
      }
      this._attrs = attrs;
    }
    return this._attrs;
  }

  public Element(elementName: string): XmlElement {
    return this.Elements(elementName)[0];
  }

  public Elements(nodeName: string): XmlElement[] {
    let nodes: NodeList = this._elem.childNodes;
    let ret: XmlElement[] = new Array();
    let nameUnset: boolean = typeof nodeName === "undefined";
    for (let i: number = 0; i < nodes.length; i += 1) {
      let node: Node = nodes[i];
      if (node.nodeType === 1 && (nameUnset || node.nodeName === nodeName)) {
          ret.push(new XmlElement(<Element> node));
        }
    }
    return ret;
  }
}
