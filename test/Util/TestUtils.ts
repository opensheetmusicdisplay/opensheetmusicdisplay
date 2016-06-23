import {IXmlElement} from "../../src/Common/FileIO/Xml";

export class TestUtils {
    public static getScore(path: string): IXmlElement {
        let doc: Document = ((window as any).__xml__)[path];
        if (doc === undefined) {
            return;
        }
        let elem: Element = doc.getElementsByTagName("score-partwise")[0];
        if (elem === undefined) {
            return;
        }
        return new IXmlElement(elem);
    }
}
