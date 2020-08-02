import { IXmlElement } from "./Xml";
import JSZip from "jszip";

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
        // starting with jszip 3.4.0, JSZip.JSZip is not found,
        //    probably because of new possibly conflicting TypeScript definitions
        const zip: JSZip = new JSZip();
        // asynchronously load zip file and process it - with Promises
        const zipLoadedAsync: Promise<JSZip> = zip.loadAsync(data);
        const text: Promise<string> = zipLoadedAsync.then(
            (_: JSZip) => {
                return zip.file("META-INF/container.xml").async("text");
            },
            (err: any) => {
                throw err;
            }
        );
        return text.then(
            (content: string) => {
                const parser: DOMParser = new DOMParser();
                const doc: Document = parser.parseFromString(content, "text/xml");
                const rootFile: string = doc.getElementsByTagName("rootfile")[0].getAttribute("full-path");
                return zip.file(rootFile).async("text");
            },
            (err: any) => {
                throw err;
            }
        ).then(
            (content: string) => {
                const parser: DOMParser = new DOMParser();
                const xml: Document = parser.parseFromString(content, "text/xml");
                const doc: IXmlElement = new IXmlElement(xml.documentElement);
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
        const zip:  JSZip = new JSZip();
        // asynchronously load zip file and process it - with Promises
        return zip.loadAsync(data).then(
            (_: any) => {
                return zip.file("META-INF/container.xml").async("text");
            },
            (err: any) => {
                throw err;
            }
        ).then(
            (content: string) => {
                const parser: DOMParser = new DOMParser();
                const doc: Document = parser.parseFromString(content, "text/xml");
                const rootFile: string = doc.getElementsByTagName("rootfile")[0].getAttribute("full-path");
                return zip.file(rootFile).async("text");
            },
            (err: any) => {
                throw err;
            }
        );
    }
}
