import { IXmlElement } from "./Xml";
import JSZip from "jszip";
import { log } from "../Logging";

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

    /**
     * Returns the text of the score file of an MXL file (a zip archive): the file that META-INF/container.xml names as
     * the rootfile. If the container file is missing or names no file of the archive (e.g. a MusicXML file that was
     * zipped by hand), the first .musicxml file of the archive is read instead, or else its first .xml file, with a warning.
     * Rejects with an Error that says what is missing if the archive has no such file either.
     */
    public static async jszipToXMLstring(zip: JSZip): Promise<string> {
        // asynchronously load zip file and process it - with Promises
        let rootFile: string;
        let problem: string = "META-INF/container.xml is missing";
        if (zip.file("META-INF/container.xml")) {
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
            rootFile = doc.getElementsByTagName("rootfile")[0]?.getAttribute("full-path");
            if (!rootFile) {
                problem = "META-INF/container.xml names no rootfile";
            } else if (!zip.file(rootFile)) {
                problem = `the rootfile "${rootFile}" of META-INF/container.xml is not in the archive`;
                rootFile = undefined;
            }
        }
        if (!rootFile) {
            const scoreFiles: string[] = Object.keys(zip.files).filter((name: string): boolean =>
                !zip.files[name].dir && !name.startsWith("META-INF/") && !name.startsWith("__MACOSX/"));
            rootFile = scoreFiles.find((name: string): boolean => name.toLowerCase().endsWith(".musicxml"))
                ?? scoreFiles.find((name: string): boolean => name.toLowerCase().endsWith(".xml"));
            if (!rootFile) {
                throw new Error(`${problem}, and the archive has no other .musicxml or .xml file`);
            }
            log.warn(`[OSMD] MXL file: ${problem}, reading "${rootFile}" instead.`);
        }
        let xmlText: string = await zip.file(rootFile).async("text");
        if (xmlText.startsWith("\ufeff")) {
            // UTF-8 with a byte order mark: JSZip decodes it but keeps the mark (U+FEFF), which the check below would take for UTF-16
            xmlText = xmlText.substring(1);
        }

        if (!xmlText.startsWith("<")) {
            // maybe UTF-16. If that doesn't give XML either, the text stays as it is: XML after white space, or not XML,
            //   which load() then names in its error as it is written in the file
            const uint8Array: Uint8Array = await zip.file(rootFile).async("uint8array");
            const utf16Text: string = new TextDecoder("utf-16").decode(uint8Array);
            if (utf16Text.trimStart().startsWith("<")) {
                return utf16Text;
            }
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
