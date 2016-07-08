export declare type IXmlAttribute = Attr;
export declare class IXmlElement {
    name: string;
    value: string;
    hasAttributes: boolean;
    firstAttribute: IXmlAttribute;
    hasElements: boolean;
    private attrs;
    private elem;
    constructor(elem: Element);
    attribute(attributeName: string): IXmlAttribute;
    attributes(): IXmlAttribute[];
    element(elementName: string): IXmlElement;
    elements(nodeName?: string): IXmlElement[];
}
