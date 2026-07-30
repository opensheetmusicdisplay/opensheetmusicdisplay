import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../../src/MusicalScore/Graphical/GraphicalSlur";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { TestUtils } from "../../../Util/TestUtils";

interface SlurSnapshot {
   articulationTypes: string[];
   end: {x: number, y: number};
   endControl: {x: number, y: number};
   endHeadLeft?: number;
   placement: number;
   segmentCount: number;
   segmentIndex: number;
   start: {x: number, y: number};
   startControl: {x: number, y: number};
   startHeadRight?: number;
}

function articulationScore(): string {
   const articulations: {tag: string, stem: "up" | "down"}[] = [
      {tag: "staccato", stem: "up"},
      {tag: "tenuto", stem: "down"},
      {tag: "accent", stem: "up"},
      {tag: "strong-accent", stem: "down"},
   ];
   const measures: string = articulations.map(({tag, stem}, index): string => `
      <measure number="${index + 1}">
         ${index === 0 ? `
         <attributes>
            <divisions>1</divisions>
            <key><fifths>0</fifths></key>
            <time><beats>4</beats><beat-type>4</beat-type></time>
            <clef><sign>G</sign><line>2</line></clef>
         </attributes>` : ""}
         <note>
            <pitch><step>C</step><octave>4</octave></pitch>
            <duration>2</duration><voice>1</voice><type>half</type><stem>${stem}</stem>
         </note>
         <note>
            <chord/>
            <pitch><step>D</step><octave>4</octave></pitch>
            <duration>2</duration><voice>1</voice><type>half</type><stem>${stem}</stem>
            <notations>
               <slur number="1" type="start" placement="above"/>
               <articulations><${tag} placement="above"/></articulations>
            </notations>
         </note>
         <note>
            <pitch><step>G</step><octave>4</octave></pitch>
            <duration>2</duration><voice>1</voice><type>half</type>
            <stem>${stem === "up" ? "down" : "up"}</stem>
            <notations><slur number="1" type="stop"/></notations>
         </note>
      </measure>`).join("");
   return `<?xml version="1.0" encoding="UTF-8"?>
      <score-partwise version="4.0">
         <part-list><score-part id="P1"><part-name>Slur geometry</part-name></score-part></part-list>
         <part id="P1">${measures}</part>
      </score-partwise>`;
}

function systemBreakScore(): string {
   return `<?xml version="1.0" encoding="UTF-8"?>
      <score-partwise version="4.0">
         <part-list><score-part id="P1"><part-name>System slur</part-name></score-part></part-list>
         <part id="P1">
            <measure number="1">
               <attributes>
                  <divisions>1</divisions>
                  <time><beats>4</beats><beat-type>4</beat-type></time>
                  <clef><sign>G</sign><line>2</line></clef>
               </attributes>
               <note>
                  <pitch><step>C</step><octave>5</octave></pitch>
                  <duration>4</duration><voice>1</voice><type>whole</type>
                  <notations><slur number="1" type="start" placement="above"/></notations>
               </note>
            </measure>
            <measure number="2">
               <print new-system="yes"/>
               <note>
                  <pitch><step>D</step><octave>5</octave></pitch>
                  <duration>4</duration><voice>1</voice><type>whole</type>
                  <notations><slur number="1" type="stop"/></notations>
               </note>
            </measure>
         </part>
      </score-partwise>`;
}

function allSlurs(osmd: OpenSheetMusicDisplay): {slur: GraphicalSlur, staffLine: StaffLine}[] {
   return osmd.GraphicSheet.MusicPages.flatMap((page) =>
      page.MusicSystems.flatMap((system) =>
         system.StaffLines.flatMap((staffLine) =>
            staffLine.GraphicalSlurs.map((slur): {slur: GraphicalSlur, staffLine: StaffLine} => ({slur, staffLine}))
         )
      )
   );
}

function snapshot(osmd: OpenSheetMusicDisplay): SlurSnapshot[] {
   return allSlurs(osmd).map(({slur}): SlurSnapshot => ({
      articulationTypes: slur.diagnostics.articulationShifts.map((shift) => shift.type),
      end: {x: slur.bezierEndPt.x, y: slur.bezierEndPt.y},
      endControl: {x: slur.bezierEndControlPt.x, y: slur.bezierEndControlPt.y},
      endHeadLeft: slur.diagnostics.endNotehead?.left,
      placement: slur.diagnostics.placement,
      segmentCount: slur.diagnostics.segmentCount,
      segmentIndex: slur.diagnostics.segmentIndex,
      start: {x: slur.bezierStartPt.x, y: slur.bezierStartPt.y},
      startControl: {x: slur.bezierStartControlPt.x, y: slur.bezierStartControlPt.y},
      startHeadRight: slur.diagnostics.startNotehead?.right,
   }));
}

describe("Stage 6 slur geometry", (): void => {
   it("anchors to selected chord heads and clears endpoint articulations in the final skyline", async (): Promise<void> => {
      const container: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
      await osmd.load(articulationScore());
      osmd.render();

      const slurs: {slur: GraphicalSlur, staffLine: StaffLine}[] = allSlurs(osmd);
      expect(slurs).to.have.length(4);
      const seenTypes: Set<string> = new Set();
      for (const {slur, staffLine} of slurs) {
         expect(slur.diagnostics.startNotehead, "selected start notehead geometry").to.not.equal(undefined);
         expect(slur.diagnostics.endNotehead, "selected end notehead geometry").to.not.equal(undefined);
         expect(slur.bezierStartPt.x).to.be.closeTo(slur.diagnostics.startNotehead.right, 0.001);
         expect(slur.bezierEndPt.x).to.be.closeTo(slur.diagnostics.endNotehead.left, 0.001);

         for (const shift of slur.diagnostics.articulationShifts) {
            seenTypes.add(shift.type);
            expect(shift.finalShiftPx).to.be.at.least(shift.previousShiftPx);
            const maximumBottom: number = slur.diagnostics.startNotehead.top
               - osmd.EngravingRules.SlurNoteHeadYOffset
               - osmd.EngravingRules.SlurArticulationClearance;
            expect(shift.bounds.bottom, `${shift.type} clears the fixed slur attachment`)
               .to.be.at.most(maximumBottom + 0.001);
            expect(
               staffLine.SkyBottomLineCalculator.getSkyLineMinInRange(shift.bounds.left, shift.bounds.right),
               `${shift.type} contributes its displaced final bounds to the skyline`,
            ).to.be.at.most(shift.bounds.top + 0.05);

            expect(shift.glyph, `${shift.type} exposes its rendered SMuFL glyph`).to.not.equal("");
         }
      }
      expect(Array.from(seenTypes).sort()).to.deep.equal(["a-", "a.", "a>", "a^"]);

      const first: SlurSnapshot[] = snapshot(osmd);
      osmd.updateGraphic();
      osmd.render();
      const rebuilt: SlurSnapshot[] = snapshot(osmd);
      expect(rebuilt).to.have.length(first.length);
      for (let index: number = 0; index < first.length; index++) {
         expect(rebuilt[index].articulationTypes).to.deep.equal(first[index].articulationTypes);
         expect(rebuilt[index].start.x).to.be.closeTo(first[index].start.x, 0.001);
         expect(rebuilt[index].start.y).to.be.closeTo(first[index].start.y, 0.001);
         expect(rebuilt[index].startControl.x).to.be.closeTo(first[index].startControl.x, 0.001);
         expect(rebuilt[index].startControl.y).to.be.closeTo(first[index].startControl.y, 0.001);
         expect(rebuilt[index].endControl.x).to.be.closeTo(first[index].endControl.x, 0.001);
         expect(rebuilt[index].endControl.y).to.be.closeTo(first[index].endControl.y, 0.001);
         expect(rebuilt[index].end.x).to.be.closeTo(first[index].end.x, 0.001);
         expect(rebuilt[index].end.y).to.be.closeTo(first[index].end.y, 0.001);
      }
   });

   it("links cross-system segments with shared placement and horizontal break tangents", async (): Promise<void> => {
      const osmd: OpenSheetMusicDisplay =
         TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      await osmd.load(systemBreakScore());
      osmd.Sheet.Rules.NewSystemAtXMLNewSystemAttribute = true;
      osmd.updateGraphic();
      osmd.render();

      const segments: GraphicalSlur[] = allSlurs(osmd)
         .map(({slur}) => slur)
         .sort((left, right): number => left.diagnostics.segmentIndex - right.diagnostics.segmentIndex);
      expect(segments).to.have.length(2);
      expect(segments[0].diagnostics.segmentCount).to.equal(2);
      expect(segments[1].diagnostics.segmentCount).to.equal(2);
      expect(segments[0].diagnostics.placement).to.equal(segments[1].diagnostics.placement);
      expect(segments[0].bezierEndControlPt.y).to.be.closeTo(segments[0].bezierEndPt.y, 0.001);
      expect(segments[1].bezierStartControlPt.y).to.be.closeTo(segments[1].bezierStartPt.y, 0.001);
      expect(segments[0].bezierStartPt.x).to.be.closeTo(segments[0].diagnostics.startNotehead.right, 0.001);
      expect(segments[1].bezierEndPt.x).to.be.closeTo(segments[1].diagnostics.endNotehead.left, 0.001);
   });

   it("preserves the existing same-system cross-staff route", async (): Promise<void> => {
      const osmd: OpenSheetMusicDisplay =
         TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      await osmd.load(TestUtils.getScore("test_slur_across_staves_left_to_right_hand.musicxml"));
      osmd.render();

      const crossed: GraphicalSlur[] = allSlurs(osmd)
         .map(({slur}) => slur)
         .filter((slur): boolean => slur.slur.isCrossed());
      expect(crossed).to.have.length(1);
      expect(crossed[0].diagnostics.unsupportedRouting).to.equal(undefined);
      for (const point of [
         crossed[0].bezierStartPt,
         crossed[0].bezierStartControlPt,
         crossed[0].bezierEndControlPt,
         crossed[0].bezierEndPt,
      ]) {
         expect(Number.isFinite(point?.x) && Number.isFinite(point?.y)).to.equal(true);
      }
   });
});
