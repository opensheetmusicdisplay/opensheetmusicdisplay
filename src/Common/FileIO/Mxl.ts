import { IXmlElement } from "./Xml";
import { Promise } from "es6-promise";
import JSZip = require("jszip");

/**
 * Some helper methods to handle MXL files.
 */
export class MXLHelper {
    /**
     *
     * @param data
     * @returns {Promise<IXmlElement>}
     * @constructor
     */
    public static MXLtoIXmlElement(data: string): Promise<IXmlElement> {
        let zip: JSZip.JSZip = new JSZip();
        // asynchronously load zip file and process it - with Promises
        return zip.loadAsync(data).then(
            (_: any) => {
                return zip.file("META-INF/container.xml").async("string");
            },
            (err: any) => {
                throw err;
            }
        ).then(
            (content: string) => {
                let parser: DOMParser = new DOMParser();
                let doc: Document = parser.parseFromString(content, "text/xml");
                let rootFile: string = doc.getElementsByTagName("rootfile")[0].getAttribute("full-path");
                return zip.file(rootFile).async("string");
            },
            (err: any) => {
                throw err;
            }
        ).then(
            (content: string) => {
                let parser: DOMParser = new DOMParser();
                let xml: Document = parser.parseFromString(content, "text/xml");
                let doc: IXmlElement = new IXmlElement(xml.documentElement);
                return Promise.resolve(doc);
            },
            (err: any) => {
                throw err;
            }
        ).then(
            (content: IXmlElement) => {
                return content;
            },
            (err: any) => {
                throw new Error("extractSheetFromMxl: " + err.message);
            }
        );
    }

    public static MXLtoXMLstring(data: string): Promise<string> {
        let zip:  JSZip.JSZip = new JSZip();
        // asynchronously load zip file and process it - with Promises
        return zip.loadAsync(data).then(
            (_: any) => {
                return zip.file("META-INF/container.xml").async("string");
            },
            (err: any) => {
                throw err;
            }
        ).then(
            (content: string) => {
                let parser: DOMParser = new DOMParser();
                let doc: Document = parser.parseFromString(content, "text/xml");
                let rootFile: string = doc.getElementsByTagName("rootfile")[0].getAttribute("full-path");
                return zip.file(rootFile).async("string");
            },
            (err: any) => {
                throw err;
            }
        );
    }
}
