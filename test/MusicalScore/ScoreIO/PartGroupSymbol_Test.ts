import { expect } from "vitest";
import { MusicSheetReader } from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";
import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { GroupSymbol, InstrumentalGroup } from "../../../src/MusicalScore/InstrumentalGroup";
import { Instrument } from "../../../src/MusicalScore/Instrument";

/**
 * The group-symbol of a part-group is read into InstrumentalGroup.GroupSymbol: none if it is not given (MusicXML: "It is none
 * if not specified"). A group around a single part or group is left out, as before, unless it is around a group with another
 * symbol: then both are kept (e.g. MuseScore's bracket and square bracket around the same parts).
 */
describe("Part group symbol", () => {
    /** partList: the part-list's part-groups and parts, "[bracket" etc. starts a group with that symbol, "[" one without
     *  a group-symbol, "]" stops the innermost open group, anything else is a part. */
    function readSheet(partList: string[]): MusicSheet {
        let list: string = "";
        let parts: string = "";
        const open: number[] = [];
        for (const token of partList) {
            if (token.startsWith("[")) {
                open.push(open.length + 1);
                const symbol: string = token.length > 1 ? `<group-symbol>${token.substring(1)}</group-symbol>` : "";
                list += `<part-group type="start" number="${open[open.length - 1]}">${symbol}</part-group>`;
            } else if (token === "]") {
                list += `<part-group type="stop" number="${open.pop()}"/>`;
            } else {
                list += `<score-part id="${token}"><part-name>${token}</part-name></score-part>`;
                parts += `<part id="${token}"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats>` +
                    "<beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>" +
                    "<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note></measure></part>";
            }
        }
        const xml: string = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list>${list}</part-list>${parts}</score-partwise>`;
        const doc: Document = new DOMParser().parseFromString(xml, "text/xml");
        return new MusicSheetReader().createMusicSheet(new IXmlElement(doc.getElementsByTagName("score-partwise")[0]), "part groups");
    }

    /** The sheet's groups and parts as nested arrays: a group as [symbol, ...children], a part as its name. */
    function tree(groups: InstrumentalGroup[]): any[] {
        return groups.map((group: InstrumentalGroup): any =>
            group instanceof Instrument ? group.Name : [GroupSymbol[group.GroupSymbol], ...tree(group.InstrumentalGroups)]);
    }

    it("reads each group-symbol value, and none if there is no group-symbol", () => {
        const sheet: MusicSheet = readSheet(["[bracket", "P1", "P2", "]", "[brace", "P3", "P4", "]", "[square", "P5", "P6", "]",
            "[line", "P7", "P8", "]", "[none", "P9", "P10", "]", "[", "P11", "P12", "]"]);
        expect(tree(sheet.InstrumentalGroups)).to.deep.equal([
            ["Bracket", "P1", "P2"], ["Brace", "P3", "P4"], ["Square", "P5", "P6"], ["Line", "P7", "P8"], ["None", "P9", "P10"], ["None", "P11", "P12"]
        ]);
    });

    it("keeps two groups around the same parts when their symbols differ, and leaves out the outer one when they are the same", () => {
        expect(tree(readSheet(["[bracket", "[square", "P1", "P2", "]", "]", "P3"]).InstrumentalGroups))
            .to.deep.equal([["Bracket", ["Square", "P1", "P2"]], "P3"]);
        expect(tree(readSheet(["[bracket", "[bracket", "P1", "P2", "]", "]", "P3"]).InstrumentalGroups))
            .to.deep.equal([["Bracket", "P1", "P2"], "P3"]);
        // a group around a single part is left out as before, whatever its symbol
        expect(tree(readSheet(["[bracket", "P1", "]", "[brace", "P2", "P3", "]"]).InstrumentalGroups))
            .to.deep.equal(["P1", ["Brace", "P2", "P3"]]);
    });

    it("ends a group that is never stopped with the part-list, like a stop", () => {
        // MuseScore 3 writes a brace group before a piano part without a stop: a group around one part, left out
        expect(tree(readSheet(["[brace", "P1"]).InstrumentalGroups)).to.deep.equal(["P1"]);
        expect(tree(readSheet(["P1", "[brace", "P2"]).InstrumentalGroups)).to.deep.equal(["P1", "P2"]);
        // around two parts it is kept, like a stopped one, and so is a group nested in it
        expect(tree(readSheet(["[brace", "P1", "P2"]).InstrumentalGroups)).to.deep.equal([["Brace", "P1", "P2"]]);
        expect(tree(readSheet(["[bracket", "P1", "[square", "P2", "P3"]).InstrumentalGroups))
            .to.deep.equal([["Bracket", "P1", ["Square", "P2", "P3"]]]);
    });
});
