import { IXmlElement } from "./Xml";
import JSZip from "jszip";
import log from "loglevel";

/**
 * Some helper methods to handle MXL files.
 */
export class MXLHelper {
    /** Returns the documentElement of MXL data. */
    public static MXLtoIXmlElement(data: string): Promise<IXmlElement> {
        return this.MXLtoXMLstring(data)
        .then(
            (content: string) => {
                const parser: DOMParser = new DOMParser();
                const xml: Document = parser.parseFromString(content, "text/xml");
                const doc: IXmlElement = new IXmlElement(xml.documentElement);
                return Promise.resolve(doc);
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
            async (_: any) => {
                let container: string = await zip.file("META-INF/container.xml").async("text");
                if (!container.startsWith("<")) {
                    const uint8Array: Uint8Array = await zip.file("META-INF/container.xml").async("uint8array");
                    container = new TextDecoder("utf-8").decode(uint8Array);
                }
                if (!container.startsWith("<")) {
                    // assume UTF-16
                    const uint8Array: Uint8Array = await zip.file("META-INF/container.xml").async("uint8array");
                    container = new TextDecoder("utf-16").decode(uint8Array);
                }
                const parser: DOMParser = new DOMParser();
                const doc: Document = parser.parseFromString(container, "text/xml");
                const rootFile: string = doc.getElementsByTagName("rootfile")[0].getAttribute("full-path");
                const xmlText: string = await zip.file(rootFile).async("text");

                if (!xmlText.substring(0, 1).startsWith("<")) {
                    // assume UTF-16
                    const uint8Array: Uint8Array = await zip.file(rootFile).async("uint8array");
                    return new TextDecoder("utf-16").decode(uint8Array);
                }
                return xmlText;
            },
            (err: any) => {
                log.error(err);
                throw err;
            }
        );
    }
}
