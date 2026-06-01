import { IXmlElement } from "./Xml";
import JSZip from "jszip";
import log from "loglevel";

export class MXLFile {
    private blob: Blob;
    public zipFile: JSZip;
    public xmlText: string;
    /** Set after tryUnzip(). True if it could be unzipped successfully. */
    public unzipSuccessful: boolean = false;
    public constructor(blob: Blob) {
        this.blob = blob;
    }

    /** Try unzipping to see if this is a zip file.
     * This is a separate method so that we don't need to unzip twice to check whether it's a zip file.
     */
    public async tryUnzip(): Promise<boolean> {
        this.zipFile = new JSZip();
        try {
            this.unzipSuccessful = true;
            await this.zipFile.loadAsync(this.blob);
            return true;
        } catch (e) {
            this.unzipSuccessful = false;
            return false;
        }
    }

    public getXmlString(): Promise<string> {
        return MXLHelper.jszipToXMLstring(this.zipFile);
    }
}

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

    public static async jszipToXMLstring(zip: JSZip): Promise<string> {
        // asynchronously load zip file and process it - with Promises
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
    }

    public static MXLtoXMLstring(data: string | Blob): Promise<string> {
        const zip:  JSZip = new JSZip();
        return zip.loadAsync(data).then(
            async (_: any) => {
                return this.jszipToXMLstring(zip);
            },
            (err: any) => {
                log.error(err);
                throw err;
            }
        );
    }
}
