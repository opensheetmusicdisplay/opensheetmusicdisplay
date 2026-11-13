import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";
import JSZip from "jszip";
import { IOSMDOptions } from "../../../src/OpenSheetMusicDisplay/OSMDOptions";
import { DrawingParametersEnum } from "../../../src/Common/Enums/DrawingParametersEnum";
import { Cursor } from "../../../src/OpenSheetMusicDisplay/Cursor";
import { MusicPartManagerIterator } from "../../../src/MusicalScore/MusicParts/MusicPartManagerIterator";
import { VoiceEntry } from "../../../src/MusicalScore/VoiceData/VoiceEntry";
import { Instrument } from "../../../src/MusicalScore/Instrument";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { Staff } from "../../../src/MusicalScore/VoiceData/Staff";
import { Voice } from "../../../src/MusicalScore/VoiceData/Voice";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { Fraction } from "../../../src/Common/DataObjects/Fraction";
import { AccidentalEnum, NoteEnum, Pitch } from "../../../src/Common/DataObjects/Pitch";
import { VerticalSourceStaffEntryContainer } from "../../../src/MusicalScore/VoiceData/VerticalSourceStaffEntryContainer";

describe("OpenSheetMusicDisplay Main Export", () => {
    let container1: HTMLElement;

    it("no container", () => {
        expect(() => {
            return new OpenSheetMusicDisplay(undefined);
        }).to.throw(/container/);
    });

    it("container", () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        expect(() => {
            return new OpenSheetMusicDisplay(div);
        }).to.not.throw(Error);
    });

    it("multiple instances", async () => {
        const musicSheetFragmentContainer: HTMLElement = TestUtils.getDivElement(document);
        const fullMusicSheetContainer: HTMLElement = TestUtils.getDivElement(document);

        const musicSheetFragmentOptions: IOSMDOptions = {
            drawComposer: false,
            drawCredits: false,
            drawFingerings: false,
            drawHiddenNotes: false,
            drawLyricist: false,
            drawPartAbbreviations: false,
            drawPartNames: false,
            drawSubtitle: false,
            drawTitle: false,
            drawUpToMeasureNumber: 1,
            drawingParameters: DrawingParametersEnum.compact
        };
        const fullMusicSheetOptions: IOSMDOptions = {
            drawUpToMeasureNumber: 10
        };

        const musicSheetFragment: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(
            musicSheetFragmentContainer,
            musicSheetFragmentOptions
        );
        const fullMusicSheet: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(fullMusicSheetContainer, fullMusicSheetOptions);

        const musicSheet: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        const musicSheetXML: string = new XMLSerializer().serializeToString(musicSheet);

        await musicSheetFragment.load(musicSheetXML);
        musicSheetFragment.render();

        await fullMusicSheet.load(musicSheetXML);
        fullMusicSheet.render();

        // Verify that the music sheet fragment has its options set correctly.
        expect(musicSheetFragment.Sheet.Rules.RenderComposer).to.equal(musicSheetFragmentOptions.drawComposer);
        expect(musicSheetFragment.Sheet.Rules.RenderFingerings).to.equal(musicSheetFragmentOptions.drawFingerings);
        expect(musicSheetFragment.Sheet.Rules.RenderLyricist).to.equal(musicSheetFragmentOptions.drawLyricist);
        expect(musicSheetFragment.Sheet.Rules.RenderPartAbbreviations).to.equal(musicSheetFragmentOptions.drawPartAbbreviations);
        expect(musicSheetFragment.Sheet.Rules.RenderPartNames).to.equal(musicSheetFragmentOptions.drawPartNames);
        expect(musicSheetFragment.Sheet.Rules.RenderSubtitle).to.equal(musicSheetFragmentOptions.drawSubtitle);
        expect(musicSheetFragment.Sheet.Rules.RenderTitle).to.equal(musicSheetFragmentOptions.drawTitle);
        expect(musicSheetFragment.Sheet.Rules.MaxMeasureToDrawIndex).to.equal(musicSheetFragmentOptions.drawUpToMeasureNumber - 1);

        // Verify that the full music sheet has its options set correctly.
        expect(fullMusicSheet.Sheet.Rules.RenderComposer).to.not.equal(musicSheetFragmentOptions.drawComposer);
        expect(fullMusicSheet.Sheet.Rules.RenderFingerings).to.not.equal(musicSheetFragmentOptions.drawFingerings);
        expect(fullMusicSheet.Sheet.Rules.RenderLyricist).to.not.equal(musicSheetFragmentOptions.drawLyricist);
        expect(fullMusicSheet.Sheet.Rules.RenderPartAbbreviations).to.not.equal(musicSheetFragmentOptions.drawPartAbbreviations);
        expect(fullMusicSheet.Sheet.Rules.RenderPartNames).to.not.equal(musicSheetFragmentOptions.drawPartNames);
        expect(fullMusicSheet.Sheet.Rules.RenderSubtitle).to.not.equal(musicSheetFragmentOptions.drawSubtitle);
        expect(fullMusicSheet.Sheet.Rules.RenderTitle).to.not.equal(musicSheetFragmentOptions.drawTitle);
        expect(fullMusicSheet.Sheet.Rules.MaxMeasureToDrawIndex).to.equal(fullMusicSheetOptions.drawUpToMeasureNumber - 1);
    });

    it("load MXL from string", async () => {
        const mxl: string = TestUtils.getMXL("Mozart_Clarinet_Quintet_Excerpt.mxl");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await opensheetmusicdisplay.load(mxl);
        opensheetmusicdisplay.render();
    });

    it("load invalid MXL from string", async () => {
        const mxl: string = "\x50\x4b\x03\x04";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        const logged: string[] = TestUtils.catchLogs();
        await expect(opensheetmusicdisplay.load(mxl), "corrupted MXL").rejects.toThrow(/invalid/i);
        expect(logged.length, "errors logged").to.be.greaterThan(0);
        expect(logged.filter((message: string) => !message.includes("Corrupted zip")), "other messages").to.deep.equal([]);
    });

    it("load XML string", async () => {
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        const xml: string = new XMLSerializer().serializeToString(score);
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await opensheetmusicdisplay.load(xml);
        opensheetmusicdisplay.render();
    });

    it("load XML Document", async () => {
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await opensheetmusicdisplay.load(score);
        opensheetmusicdisplay.render();
    });

    it("load missing file by URL", async () => {
        // e.g. a typo in the path: the test server answers 404, like any web server
        const url: string = "base/test/data/does_not_exist.musicxml";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await expect(opensheetmusicdisplay.load(url), "a missing file").rejects.toThrow(/404/);
    });

    it("load MXL Document by URL", async () => {
        const url: string = "base/test/data/Mozart_Clarinet_Quintet_Excerpt.mxl";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await opensheetmusicdisplay.load(url);
        opensheetmusicdisplay.render();
    });

    it("uses tempTitle as the title of a score without one, also for a Blob, an MXL file or a URL", async () => {
        const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
            <score-partwise version="4.0">
                <part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>
                <part id="P1"><measure number="1">
                    <attributes><divisions>1</divisions></attributes>
                    <note><rest/><duration>4</duration><type>whole</type></note>
                </measure></part>
            </score-partwise>`;
        const zip: JSZip = new JSZip();
        zip.file("META-INF/container.xml", "<container><rootfiles><rootfile full-path='score.xml'/></rootfiles></container>");
        zip.file("score.xml", xml);
        const contents: [string, string | Blob][] = [
            ["XML string", xml],
            ["XML string with byte order mark", "\uf7ef\uf7bb\uf7bf" + xml],
            ["XML Blob", new Blob([xml])],
            ["MXL string", await zip.generateAsync({type: "binarystring"})],
            ["MXL Blob", await zip.generateAsync({type: "blob"})],
            ["URL", URL.createObjectURL(new Blob([xml]))],
        ];
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
        const titles: string[] = [];
        for (const [name, content] of contents) {
            await opensheetmusicdisplay.load(content, "Evening Song");
            titles.push(`${name}: ${opensheetmusicdisplay.Sheet.TitleString}`);
        }
        expect(titles, titles.join("; ")).to.deep.equal(contents.map(([name]) => `${name}: Evening Song`));
    });

    it("loads MusicXML without the XML declaration, e.g. starting with <!DOCTYPE or <score-partwise>, also from a Blob, an MXL file or a URL", async () => {
        // the declaration (<?xml ...?>) is optional: e.g. jsdom's XMLSerializer and Python's ElementTree write none (#1840)
        const scorePartwise: string = `<score-partwise version="4.0">
                <part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>
                <part id="P1"><measure number="1">
                    <attributes><divisions>1</divisions></attributes>
                    <note><rest/><duration>4</duration><type>whole</type></note>
                </measure></part>
            </score-partwise>`;
        const doctype: string = '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">';
        const zip: JSZip = new JSZip();
        zip.file("META-INF/container.xml", "<container><rootfiles><rootfile full-path='score.xml'/></rootfiles></container>");
        zip.file("score.xml", doctype + scorePartwise);
        const zipWithNewline: JSZip = new JSZip(); // (was taken for UTF-16, as it doesn't start with "<")
        zipWithNewline.file("META-INF/container.xml", "<container><rootfiles><rootfile full-path='score.xml'/></rootfiles></container>");
        zipWithNewline.file("score.xml", "\n" + scorePartwise);
        const contents: [string, string | Blob][] = [
            ["<!DOCTYPE", doctype + scorePartwise],
            ["<score-partwise>", scorePartwise],
            ["comment", "<!-- generated -->\n" + scorePartwise],
            ["byte order mark and newline", "\uFEFF\n" + doctype + "\n" + scorePartwise],
            ["Blob", new Blob([doctype + scorePartwise])],
            ["MXL Blob", await zip.generateAsync({type: "blob"})],
            ["MXL Blob, score file starting with a newline", await zipWithNewline.generateAsync({type: "blob"})],
            ["URL", URL.createObjectURL(new Blob([scorePartwise]))],
        ];
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
        let xmlReads: number = 0;
        opensheetmusicdisplay.OnXMLRead = (xml: string): string => { xmlReads++; return xml; };
        const results: string[] = [];
        for (const [name, content] of contents) {
            try {
                await opensheetmusicdisplay.load(content, "Evening Song");
                results.push(`${name}: ${opensheetmusicdisplay.Sheet.TitleString}`);
            } catch (error) {
                results.push(`${name}: ${error.message}`);
            }
        }
        expect(results, results.join("; ")).to.deep.equal(contents.map(([name]) => `${name}: Evening Song`));
        expect(xmlReads, "calls of OnXMLRead").to.equal(contents.length);
    });

    it("load invalid URL", async () => {
        // port 1 is one of the fetch standard's bad ports, which browsers never connect to: the load fails at once and
        //   without the network (a made-up domain needed a DNS lookup)
        const url: string = "http://127.0.0.1:1/does_not_exist.musicxml";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await expect(opensheetmusicdisplay.load(url), "an invalid URL").rejects.toThrow(/url/i);
    });

    it("load invalid XML string", async () => {
        const xml: string = "<?xml";
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        const logged: string[] = TestUtils.catchLogs();
        await expect(opensheetmusicdisplay.load(xml), "corrupted XML").rejects.toThrow(/XML is malformed.* 1\b/);
        expect(logged).to.deep.equal([]);
    });

    it("load XML that isn't partwise MusicXML", async () => {
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
        const logged: string[] = TestUtils.catchLogs();
        await expect(opensheetmusicdisplay.load("<score-timewise/>"), "timewise MusicXML").rejects.toThrow(/partwise/i);
        expect(logged).to.deep.equal(["Could not parse MusicXML, no valid partwise element found"]);
    });

    describe("load() says what went wrong, always by rejecting", () => {
        const validXml: string = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Black and White</work-title></work>
  <part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>
  <part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure></part>
</score-partwise>`;
        /** The outcome of load(): "resolved", "rejected: <message>", or "threw: <message>" if load() threw instead of returning a promise. */
        async function loadOutcome(osmd: OpenSheetMusicDisplay, content: string | Document | Blob): Promise<string> {
            let promise: Promise<{}>;
            try {
                promise = osmd.load(content);
            } catch (error) {
                return "threw: " + error.message;
            }
            return promise.then((): string => "resolved", (error: Error): string => "rejected: " + error.message);
        }

        it("malformed XML is rejected with the XML parser's line and column, instead of loading the score up to the error", async () => {
            // an unescaped "&" in line 3, column 28. Chrome's document for it still has <score-partwise> as its root, without parts.
            const malformedXml: string = validXml.replace("Black and White", "Black & White");
            const contents: [string, string | Document | Blob][] = [
                ["string", malformedXml],
                ["Blob", new Blob([malformedXml])],
                ["Document", new DOMParser().parseFromString(malformedXml, "application/xml")],
            ];
            const logged: string[] = TestUtils.catchLogs();
            for (const [name, content] of contents) {
                const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
                // Chrome: "error on line 3 at column 28: ...", Firefox: "XML Parsing Error: not well-formed Line Number 3, Column 28"
                expect(await loadOutcome(osmd, content), name).to.match(/^rejected: OpenSheetMusicDisplay: The XML is malformed: .*\b3\b.*\b28\b/);
                expect(osmd.Sheet, name + ": sheet").to.equal(undefined);
            }
            expect(logged).to.deep.equal([]);
            const validOsmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
            expect(await loadOutcome(validOsmd, validXml), "the same score without the error").to.equal("resolved");
        });

        it("an error while creating the graphic of an XML string or Document is a rejection, not a throw, and leaves no sheet", async () => {
            const contents: [string, string | Document | Blob][] = [
                ["string", validXml],
                ["Document", new DOMParser().parseFromString(validXml, "application/xml")],
                ["Blob", new Blob([validXml])],
            ];
            for (const [name, content] of contents) {
                const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
                osmd.updateGraphic = (): void => { throw new Error("no graphic"); };
                expect(await loadOutcome(osmd, content), name).to.equal("rejected: no graphic");
                expect(osmd.Sheet, name + ": no sheet without a graphic").to.equal(undefined);
                expect(osmd.GraphicSheet, name + ": graphic").to.equal(undefined);
            }
        });

        it("a note whose pitch step isn't one of A to G is left out, with an error that names the value, the measure and the part", async () => {
            // "toString": NoteEnum["toString"] is defined (an object's method), so a lookup in the enum doesn't find it invalid
            const badStepXml: string = validXml.replace(/<note>.*<\/note>/,
                "<note><pitch><step>toString</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>" +
                "<note><pitch><step>d</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>");
            const stepError: string = 'Measure 1 of part "Flute" (P1): invalid step "toString", a step is one of A to G. The note is left out.';
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
            const logged: string[] = TestUtils.catchLogs();
            expect(await loadOutcome(osmd, badStepXml)).to.equal("resolved");
            osmd.render();
            expect(logged).to.deep.equal(["MusicSheetReadingException: " + stepError]);
            expect(osmd.Sheet.SheetErrors.measureErrors[1], "the measure's errors").to.deep.equal(["Ignored erroneous Note.", stepError]);
            // the other note stays where it is, on the measure's second half (its step is read in lower case too)
            const noteTimes: string[] = osmd.Sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers.map(
                (container: VerticalSourceStaffEntryContainer): string => {
                    const notes: Note[] = container.StaffEntries[0].VoiceEntries[0].Notes;
                    return `${container.Timestamp.RealValue}: ${notes.map((note: Note): string => NoteEnum[note.Pitch.FundamentalNote]).join()}`;
                });
            expect(noteTimes).to.deep.equal(["0.5: D"]);
        });

        it("a note without divisions whose duration isn't a number is skipped with a warning, instead of load() never returning", async () => {
            const noDivisionsXml: string = validXml.replace("<attributes><divisions>1</divisions></attributes>", "")
                .replace("<duration>4</duration>", "<duration>x</duration>");
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
            const logged: string[] = TestUtils.catchLogs();
            expect(await loadOutcome(osmd, noDivisionsXml)).to.equal("resolved");
            expect(logged).to.deep.equal(['[OSMD] Measure 1 of part "Flute" (P1): skipped the <note> element (element 1 of the measure), ' +
                "which could not be read: Invalid divisions value at Instrument: Flute"]);
        });

        it("a part that isn't in the part-list is skipped with a warning, a score-part without a part or with another's id is rejected by name", async () => {
            const otherPart: string = `<part id="P2"><measure number="1"><attributes><divisions>1</divisions></attributes>
                <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure></part>`;
            const skipped: string = 'Skipped the part "P2": the part-list has no score-part for it.';
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
            const logged: string[] = TestUtils.catchLogs();
            expect(await loadOutcome(osmd, validXml.replace("</score-partwise>", otherPart + "</score-partwise>"))).to.equal("resolved");
            osmd.render();
            expect(osmd.Sheet.Instruments.map((instrument: Instrument): string => instrument.Name), "parts").to.deep.equal(["Flute"]);
            expect(osmd.Sheet.SheetErrors.Errors, "the sheet's errors").to.deep.equal([skipped]);
            expect(logged).to.deep.equal(["[OSMD] MusicSheetReader: " + skipped]);

            // the only part has another id than its score-part (e.g. a typo): nothing to show
            let error: Error & { cause?: Error };
            await osmd.load(validXml.replace('<part id="P1">', '<part id="P9">')).catch((e: Error): void => { error = e; });
            const reason: string = 'No part for the score-part "P1" of the part-list, and no score-part in the part-list for the part "P9"';
            expect(error?.message).to.equal("OpenSheetMusicDisplay: The given music sheet was incomplete or could not be loaded: " + reason);
            // the reader's exceptions are Errors
            expect(error.cause instanceof Error && error.cause.stack !== undefined, "the cause is an Error with a stack").to.equal(true);
            expect(String(error.cause)).to.equal("MusicSheetReadingException: " + reason);

            // two score-parts with the same id: the part could belong to either
            const sameIdXml: string = validXml.replace("</part-list>", '<score-part id="P1"><part-name>Oboe</part-name></score-part></part-list>');
            expect(await loadOutcome(osmd, sameIdXml)).to.equal("rejected: OpenSheetMusicDisplay: The given music sheet was incomplete " +
                'or could not be loaded: The part-list has more than one score-part with the id "P1"');
        });

        it("an error of the reader is passed on in the rejection, as message and cause", async () => {
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
            const logged: string[] = TestUtils.catchLogs();
            let error: Error & { cause?: Error };
            await osmd.load(validXml.replace(/<part-list>.*<\/part-list>/, "")).catch((e: Error): void => { error = e; });
            expect(error?.message).to.equal("OpenSheetMusicDisplay: The given music sheet was incomplete or could not be loaded: Undefined partListNode");
            expect(error.cause?.message, "cause").to.equal("Undefined partListNode");
            expect(logged.length, "the reader still logs its error").to.equal(1);
        });

        it("a zip file that isn't MXL is rejected with what is missing", async () => {
            const zip: JSZip = new JSZip();
            zip.file("notes.txt", "not a score");
            const expected: string = "rejected: OpenSheetMusicDisplay: Invalid MXL file: META-INF/container.xml is missing, " +
                "and the archive has no other .musicxml or .xml file";
            const contents: [string, string | Blob][] = [
                ["Blob", await zip.generateAsync({type: "blob"})],
                ["binary string", await zip.generateAsync({type: "binarystring"})],
            ];
            for (const [name, content] of contents) {
                const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
                expect(await loadOutcome(osmd, content), name).to.equal(expected);
            }
        });

        it("the text of a file is never requested as a URL: a Blob, an MXL file or a URL's response that isn't XML is rejected", async () => {
            // e.g. a wrong or crafted file that a user picks in a file input: its text was requested like a URL given by the app
            const path: string = "/account/delete?confirm=1";
            const zip: JSZip = new JSZip();
            zip.file("META-INF/container.xml", "<container><rootfiles><rootfile full-path='score.xml'/></rootfiles></container>");
            zip.file("score.xml", path);
            const pathUrl: string = URL.createObjectURL(new Blob([path]));
            const emptyUrl: string = URL.createObjectURL(new Blob([" \n"]));
            const notMusicXml: string = 'rejected: OpenSheetMusicDisplay: The file is not MusicXML: it starts with "/account/delete?conf" instead of "<"';
            const contents: [string, string | Blob, string, string[]][] = [
                ["Blob", new Blob([path]), notMusicXml, []],
                ["Blob with byte order mark", new Blob(["﻿" + path]), notMusicXml, []],
                ["MXL Blob", await zip.generateAsync({type: "blob"}), notMusicXml, []],
                ["MXL string", await zip.generateAsync({type: "binarystring"}), notMusicXml, []],
                ["URL", pathUrl, notMusicXml, [pathUrl]],
                ["URL of an empty file", emptyUrl, "rejected: OpenSheetMusicDisplay: The file is not MusicXML: it is empty", [emptyUrl]],
            ];
            const logged: string[] = TestUtils.catchLogs();
            const requestedUrls: string[] = [];
            const open: typeof XMLHttpRequest.prototype.open = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: any[]): void {
                requestedUrls.push(String(url));
                return open.call(this, method, url, ...rest);
            };
            try {
                for (const [name, content, expected, expectedRequests] of contents) {
                    requestedUrls.length = 0;
                    const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
                    expect(await loadOutcome(osmd, content), name).to.equal(expected);
                    expect(requestedUrls, name + ": requested URLs").to.deep.equal(expectedRequests);
                }
            } finally {
                XMLHttpRequest.prototype.open = open;
            }
            expect(logged).to.deep.equal([]);
        });

        it("a long string that is neither XML nor a URL is rejected with its own message", async () => {
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
            const logged: string[] = TestUtils.catchLogs();
            expect(await loadOutcome(osmd, "score-partwise ".repeat(200))).to.equal("rejected: OpenSheetMusicDisplay: " +
                "The string is neither XML nor a URL: it doesn't start with \"<\", and is too long for a URL (3000 characters)");
            expect(logged).to.deep.equal([]);
        });
    });

    it("render without loading", () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        expect(() => {
            return opensheetmusicdisplay.render();
        }).to.throw(/load/);
    });

    it("keeps the zoom when another score is loaded, and over clear()", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        try {
            div.style.width = "600px";
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
            osmd.Zoom = 0.6; // also before the first load()
            await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
            expect(osmd.Zoom, "Zoom after the first load()").to.equal(0.6);
            osmd.render();
            await osmd.load(TestUtils.getScore("test_fingering_left_bach_short.musicxml"));
            expect(osmd.Zoom, "Zoom after another load()").to.equal(0.6);
            osmd.clear();
            expect(osmd.Zoom, "Zoom after clear()").to.equal(0.6);
            await osmd.load(TestUtils.getScore("test_fingering_left_bach_short.musicxml"));
            osmd.render();
            // the layout is made for the zoom: 600 px at zoom 0.6 are 100 units
            expect(osmd.Sheet.pageWidth, "the page width of the layout in units").to.be.closeTo(100, 0.01);
        } finally {
            div.remove();
        }
    });

    beforeAll((): void => {
        // Create the container for the "test width" test
        container1 = TestUtils.getDivElement(document);
    });
    afterAll((): void => {
        // Destroy the container for the "test width" test
        document.body.removeChild(container1);
    });

    it("test width 500", async () => {
        const div: HTMLElement = container1;
        div.style.width = "500px";
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        await opensheetmusicdisplay.load(score);
        opensheetmusicdisplay.render();
        expect(div.offsetWidth).to.equal(500);
    });

    it("test width 200", async () => {
        const div: HTMLElement = container1;
        div.style.width = "200px";
        const opensheetmusicdisplay: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
        const logged: string[] = TestUtils.catchLogs();
        await opensheetmusicdisplay.load(score);
        opensheetmusicdisplay.render();
        expect(div.offsetWidth).to.equal(200);
        // the part names "Piano (right)" and "Piano (left)" give way to the first measure (EngravingRules.FitPartLabelsToMeasures):
        //   before, they left its two staves no width ("SkyBottomLineCalculator: width not > 0 in measure 1" for each)
        expect(logged).to.deep.equal([]);
    });

    /**
     * The page is drawn inside the container's border and padding. It was as wide as the container including them
     * (offsetWidth), so it stuck out of the container by their width.
     */
    it("lays out and draws the page as wide as the container's content box, inside its padding and border", async () => {
        for (const incremental of [false, true]) {
            const div: HTMLElement = TestUtils.getDivElement(document);
            div.style.width = "500px";
            div.style.padding = "0 10px 0 30px";
            div.style.border = "5px solid";
            try {
                const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
                await osmd.load(TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml"));
                if (incremental) {
                    osmd.renderNext();
                    osmd.renderRemaining();
                } else {
                    osmd.render();
                }
                const renderName: string = incremental ? "renderNext()" : "render()";
                expect(osmd.Sheet.pageWidth, `page width in units, ${renderName}`).to.equal(50);
                expect(div.querySelector("svg").getBoundingClientRect().width, `drawn width in pixels, ${renderName}`).to.equal(500);
            } finally {
                div.remove();
            }
        }
    });

    describe("cursor with hidden instrument", () => {
        let osmd: OpenSheetMusicDisplay;
        beforeEach(async () => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            osmd = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document =
                TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
            await osmd.load(score);
            osmd.render();
        });

        it("should move cursor after instrument is hidden", () => {
            osmd.Sheet.Instruments[1].Visible = false;
            osmd.render();
            osmd.cursors[0].show();
            for (let i: number = 0; i < 100; i++) {
                osmd.cursors[0].next();
            }
            // After 100 steps in the visible score, cursor reached 3rd note from 17, a C
            expect(osmd.cursors[0].NotesUnderCursor()[0].halfTone).to.equal(60);
        });
    });
    describe("cursor", () => {
        let opensheetmusicdisplay: OpenSheetMusicDisplay;
        let div: HTMLElement;
        beforeEach(async () => {
            // a container of its own: "test width 200" leaves container1 too narrow for a measure
            div = TestUtils.getDivElement(document);
            opensheetmusicdisplay = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("MuzioClementi_SonatinaOpus36No1_Part1.xml");
            await opensheetmusicdisplay.load(score);
            opensheetmusicdisplay.render();
            opensheetmusicdisplay.cursors[0].show();
        });
        afterEach((): void => {
            div.remove();
        });

        describe("next() and previous()", () => {
            it("is able to advance past end and beginning of sheet", () => {
                const cursor: Cursor = opensheetmusicdisplay.cursors[0];
                expect(cursor.NotesUnderCursor().length).to.greaterThanOrEqual(1);
                cursor.previous(); // do previous from first timestamp in sheet ("beyond beginning")
                expect(cursor.NotesUnderCursor().length).to.equal(0);
                cursor.next();
                expect(cursor.NotesUnderCursor().length).to.greaterThanOrEqual(1);
                expect(cursor.Iterator.currentTimeStamp.RealValue).to.equal(0);
                // go past end of sheet if repetitions are ignored, which we don't do here (anymore). So, we should not reach the end here.
                for (let i: number = 1; i <= 260; i++) {
                    cursor.next();
                }
                expect(cursor.Iterator.EndReached).to.equal(false);
                // go past end of sheet
                for (let i: number = 1; i <= 260; i++) {
                    cursor.next();
                    // go past end of sheet:
                    //   after ~520 times (260 * 2) in Clementi 36/1/1, the last timestamp is reached
                }
                expect(cursor.Iterator.EndReached).to.equal(true);
                // try to go back again after going beyond end of sheet
                cursor.previous();
                cursor.previous();
                expect(cursor.Iterator.EndReached).to.equal(false);
            });
        });

        describe("iterator.clone()", () => {
            it("clone() advancing does not corrupt the original iterator (#1674)", () => {
                const cursor: Cursor = opensheetmusicdisplay.cursors[0];
                cursor.reset(); // reset to first timestamp / notes in the sheet

                const notesBefore: number = cursor.GNotesUnderCursor().length;
                expect(notesBefore).to.be.greaterThan(0);

                // Clone and advance — the common "peek at next position" pattern.
                // Before the fix, the clone shared currentVoiceEntries with the original,
                // so moveToNext() inside the clone wiped the original's entries.
                const clone: MusicPartManagerIterator = cursor.iterator.clone();
                clone.moveToNextVisibleVoiceEntry(false);

                const notesAfter: number = cursor.GNotesUnderCursor().length;
                expect(notesAfter).to.equal(notesBefore);
                // note that cursor.Iterator.CurrentSourceTimestamp was unaffected by this bug, so we have to check e.g. GNotesUnderCursor or NotesUnderCursor.
            });
        });

        describe("get AllVoicesUnderCursor", () => {
            it("retrieves all voices under cursor", () => {
                const voiceEntries: VoiceEntry[] = opensheetmusicdisplay.cursors[0].VoicesUnderCursor();
                expect(voiceEntries.length).to.equal(2);
            });
        });

        describe("VoicesUnderCursor", () => {
            it("retrieves voices for a specific instrument under cursor", () => {
                const voiceEntries: VoiceEntry[] = opensheetmusicdisplay.cursors[0].VoicesUnderCursor();
                expect(voiceEntries.length).to.equal(2);
            });
            it("retrieves all voices under cursor when instrument not specified", () => {
                const instrument: Instrument = opensheetmusicdisplay.Sheet.Instruments[1];
                const voiceEntries: VoiceEntry[] = opensheetmusicdisplay.cursors[0].VoicesUnderCursor(instrument);
                expect(voiceEntries.length).to.equal(1);
            });
        });

        describe("NotesUnderCursor", () => {
            it("gets notes for a specific instrument under cursor", () => {
                const instrument: Instrument = opensheetmusicdisplay.Sheet.Instruments[0];
                const notes: Note[] = opensheetmusicdisplay.cursors[0].NotesUnderCursor(instrument);
                expect(notes.length).to.equal(1);
            });

            it("gets all notes under cursor when instrument unspecified", () => {
                const notes: Note[] = opensheetmusicdisplay.cursors[0].NotesUnderCursor();
                expect(notes.length).to.equal(2);
            });
        });

        describe("updateGraphic", () => {
            it("updates the graphical sheet with mutations on the music sheet", () => {
                const staff: Staff = opensheetmusicdisplay.Sheet.Staves[0];
                const voice: Voice = staff.Voices[0];
                const voiceEntry: VoiceEntry = voice.VoiceEntries[0];
                const numNotesBefore: number = voiceEntry.Notes.length;

                // Validate current state
                {
                    const graphicalStaffEntry: GraphicalStaffEntry = opensheetmusicdisplay.GraphicSheet.getStaffEntry(0);
                    const graphicalNotes: GraphicalNote[] = graphicalStaffEntry.findVoiceEntryGraphicalNotes(voiceEntry);

                    expect(graphicalNotes.length).to.equal(numNotesBefore);
                }

                const newNote: Note = new Note(
                    voiceEntry,
                    voiceEntry.ParentSourceStaffEntry,
                    new Fraction(1),
                    new Pitch(11, 2, AccidentalEnum.NATURAL),
                    voiceEntry.ParentSourceStaffEntry.VerticalContainerParent.ParentMeasure);
                    // note: if the pitch is such that the voice entry frequencies aren't ordered correctly,
                    // Vexflow will complain about unsorted pitches. see below
                voiceEntry.Notes.push(newNote);
                // we could do something like voiceEntry.sort() here to prevent the Vexflow warning about unsorted pitches,
                // but for now sort() only exists on GraphicalVoiceEntry.

                opensheetmusicdisplay.updateGraphic();

                {
                    const graphicalStaffEntry: GraphicalStaffEntry = opensheetmusicdisplay.GraphicSheet.getStaffEntry(0);
                    const graphicalNotes: GraphicalNote[] = graphicalStaffEntry.findVoiceEntryGraphicalNotes(voiceEntry);

                    expect(graphicalNotes.length).to.equal(numNotesBefore + 1);
                }
            });
        });
    });

    describe("cursor with notehead none (invisible notes)", () => {
        let osmd: OpenSheetMusicDisplay;

        beforeEach(async () => {
            const div: HTMLElement = TestUtils.getDivElement(document);
            osmd = TestUtils.createOpenSheetMusicDisplay(div);
            const score: Document = TestUtils.getScore("test_cursor_skip_notehead_none.musicxml");
            await osmd.load(score);
            osmd.render();
        });

        it("should skip entries where all notes have notehead none when SkipInvisibleNotes is true", () => {
            osmd.cursors[0].SkipInvisibleNotes = true;
            osmd.cursors[0].show();

            // Start at first visible note (C4 in treble clef reads as C4 = 60)
            expect(osmd.cursors[0].Iterator.currentTimeStamp.RealValue).to.equal(0);
            const firstNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(firstNotes.length).to.be.greaterThan(0);
            const firstHalfTone: number = firstNotes[0].halfTone;

            // Move to next - should skip the D4 (notehead none) and go to next visible note
            osmd.cursors[0].next();
            const secondNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(secondNotes.length).to.be.greaterThan(0);
            const secondHalfTone: number = secondNotes[0].halfTone;
            // Second note should be different from first (skipped the invisible note)
            expect(secondHalfTone).to.not.equal(firstHalfTone);

            // Move to next - should skip another notehead none entry and reach the final measure
            osmd.cursors[0].next();
            const thirdNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(thirdNotes.length).to.be.greaterThan(0);
            const thirdHalfTone: number = thirdNotes[0].halfTone;
            // Third note should be different from second
            expect(thirdHalfTone).to.not.equal(secondHalfTone);
        });

        it("should not skip entries with notehead none when SkipInvisibleNotes is false", () => {
            osmd.cursors[0].SkipInvisibleNotes = false;
            osmd.cursors[0].show();

            // Start at first note
            expect(osmd.cursors[0].Iterator.currentTimeStamp.RealValue).to.equal(0);
            const firstNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(firstNotes.length).to.be.greaterThan(0);

            // Move through all 4 notes in measure 1 (including the invisible ones)
            osmd.cursors[0].next();
            const secondNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(secondNotes.length).to.be.greaterThan(0);

            osmd.cursors[0].next();
            const thirdNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(thirdNotes.length).to.be.greaterThan(0);

            osmd.cursors[0].next();
            const fourthNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(fourthNotes.length).to.be.greaterThan(0);

            // One more next should move to measure 2
            osmd.cursors[0].next();
            const fifthNotes: Note[] = osmd.cursors[0].NotesUnderCursor();
            expect(fifthNotes.length).to.be.greaterThan(0);

            // Verify we've advanced 5 times total (4 notes in measure 1 + 1 in measure 2)
            expect(osmd.cursors[0].Iterator.currentTimeStamp.RealValue).to.be.greaterThan(0);
        });
    });

});
