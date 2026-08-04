import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {
   GraphicalSlur,
   GraphicalSlurArticulationShiftDiagnostics,
} from "../../../../src/MusicalScore/Graphical/GraphicalSlur";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { SlurObstacle } from "../../../../src/MusicalScore/Graphical/SlurLayout/SlurLayoutTypes";
import { PlacementEnum } from "../../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { TestUtils } from "../../../Util/TestUtils";

interface SlurSnapshot {
   articulationTypes: string[];
   endAttachment?: string;
   end: {x: number, y: number};
   endControl: {x: number, y: number};
   endHeadLeft?: number;
   placement: number;
   mode?: string;
   candidateCount?: number;
   segmentCount: number;
   segmentIndex: number;
   startAttachment?: string;
   start: {x: number, y: number};
   startControl: {x: number, y: number};
   startHeadRight?: number;
}

interface RhythmicMeasureSnapshot {
   measureX: number;
   staffEntryXs: number[];
   width: number;
}

interface SlurModeSnapshot {
   rhythm: RhythmicMeasureSnapshot[];
   slurs: SlurSnapshot[];
}

function geometryHintScore(offset: number): string {
   return `<?xml version="1.0" encoding="UTF-8"?>
      <score-partwise version="4.0">
         <part-list><score-part id="P1"><part-name>Geometry hint</part-name></score-part></part-list>
         <part id="P1"><measure number="1">
            <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
               <clef><sign>G</sign><line>2</line></clef></attributes>
            <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>half</type>
               <notations><slur number="1" type="start" placement="above"
                  default-x="${offset}" default-y="${offset}" relative-x="${offset}"
                  relative-y="${offset}" bezier-x="${offset}" bezier-y="${offset}"/></notations></note>
            <note><pitch><step>G</step><octave>5</octave></pitch><duration>2</duration><type>half</type>
               <notations><slur number="1" type="stop" bezier-x="${-offset}" bezier-y="${-offset}"/></notations></note>
         </measure></part>
      </score-partwise>`;
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

function multiSystemArticulationScore(): string {
   return `<?xml version="1.0" encoding="UTF-8"?>
      <score-partwise version="4.0">
         <part-list><score-part id="P1"><part-name>Articulation systems</part-name></score-part></part-list>
         <part id="P1">
            <measure number="1">
               <attributes>
                  <divisions>1</divisions>
                  <time><beats>4</beats><beat-type>4</beat-type></time>
                  <clef><sign>G</sign><line>2</line></clef>
               </attributes>
               <note>
                  <pitch><step>C</step><octave>5</octave></pitch>
                  <duration>2</duration><voice>1</voice><type>half</type><stem>down</stem>
                  <notations>
                     <slur number="1" type="start" placement="above"/>
                     <articulations><staccato placement="above"/></articulations>
                  </notations>
               </note>
               <note>
                  <pitch><step>G</step><octave>5</octave></pitch>
                  <duration>2</duration><voice>1</voice><type>half</type><stem>down</stem>
                  <notations><slur number="1" type="stop"/></notations>
               </note>
            </measure>
            <measure number="2">
               <print new-system="yes"/>
               <note>
                  <pitch><step>D</step><octave>5</octave></pitch>
                  <duration>2</duration><voice>1</voice><type>half</type><stem>down</stem>
                  <notations>
                     <slur number="1" type="start" placement="above"/>
                     <articulations><staccato placement="above"/></articulations>
                  </notations>
               </note>
               <note>
                  <pitch><step>A</step><octave>5</octave></pitch>
                  <duration>2</duration><voice>1</voice><type>half</type><stem>down</stem>
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
      endAttachment: slur.diagnostics.endAttachment,
      end: {x: slur.bezierEndPt.x, y: slur.bezierEndPt.y},
      endControl: {x: slur.bezierEndControlPt.x, y: slur.bezierEndControlPt.y},
      endHeadLeft: slur.diagnostics.endNotehead?.left,
      placement: slur.diagnostics.placement,
      mode: slur.diagnostics.mode,
      candidateCount: slur.diagnostics.candidateCount,
      segmentCount: slur.diagnostics.segmentCount,
      segmentIndex: slur.diagnostics.segmentIndex,
      startAttachment: slur.diagnostics.startAttachment,
      start: {x: slur.bezierStartPt.x, y: slur.bezierStartPt.y},
      startControl: {x: slur.bezierStartControlPt.x, y: slur.bezierStartControlPt.y},
      startHeadRight: slur.diagnostics.startNotehead?.right,
   }));
}

function rhythmicSnapshot(osmd: OpenSheetMusicDisplay): RhythmicMeasureSnapshot[] {
   return osmd.GraphicSheet.MeasureList.flatMap((measureRow) => measureRow.map((measure) => ({
      measureX: measure.PositionAndShape.RelativePosition.x,
      staffEntryXs: measure.staffEntries.map((entry) => entry.PositionAndShape.RelativePosition.x),
      width: measure.PositionAndShape.Size.width,
   })));
}

function graceSlurGroups(osmd: OpenSheetMusicDisplay): {group: any, measureNumber: number}[] {
   return osmd.GraphicSheet.MusicPages.flatMap((page) =>
      page.MusicSystems.flatMap((system) =>
         system.StaffLines.flatMap((staffLine) =>
            staffLine.Measures.flatMap((measure) =>
               measure.staffEntries.flatMap((staffEntry) =>
                  staffEntry.graphicalVoiceEntries.flatMap((voiceEntry) => {
                     const modifiers: any[] = (voiceEntry as any).vfStaveNote?.getModifiers?.() ?? [];
                     return modifiers
                        .filter((modifier): boolean => modifier?.getCategory?.() === "GraceNoteGroup")
                        .map((group): {group: any, measureNumber: number} => ({
                           group,
                           measureNumber: measure.MeasureNumber,
                        }));
                  })
               )
            )
         )
      )
   );
}

describe("Stage 6 slur geometry", (): void => {
   it("uses stem-side attachments and clears a multi-grace beam", async (): Promise<void> => {
      const osmd: OpenSheetMusicDisplay =
         TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      await osmd.load(TestUtils.getScore("OSMD_function_test_GraceNotes.xml"));
      osmd.render();

      const groups: {group: any, measureNumber: number}[] = graceSlurGroups(osmd)
         .filter(({group}) => Boolean(group.getSlurLayout?.()));
      const opening: any = groups.find(({measureNumber}) => measureNumber === 1)?.group;
      expect(opening).to.not.equal(undefined);
      expect(opening.getSlurLayout().startAttachment).to.equal("stem-tip");
      expect(opening.getSlurLayout().endAttachment).to.equal("stem-tip");

      const beamed: any = groups.find(
         ({group, measureNumber}) => measureNumber === 3 && group.getGraceNotes().length === 2,
      )?.group;
      expect(beamed).to.not.equal(undefined);
      expect(beamed.getSlur().getNotes().firstNote).to.equal(beamed.getGraceNotes()[0]);
      expect(beamed.getSlurLayout().startAttachment).to.equal("stem-tip");
      expect(beamed.getSlurLayout().endAttachment).to.equal("notehead-center");
      expect(beamed.getRenderedSlurCurves()[0].start.x).to.be.closeTo(
         beamed.getGraceNotes()[0].getStemX(),
         0.001,
      );
      const beamedCurve: any = beamed.getRenderedSlurCurves()[0];
      const mainNotehead: any = beamed.getSlur().getNotes().lastNote.getSelectedNoteHeadBounds(0);
      expect(beamedCurve.end.x).to.be.closeTo(mainNotehead.centerX, 0.001);
      expect(beamedCurve.start.x).to.be.lessThan(beamed.getGraceNotes()[1].getStemX());
      expect(beamedCurve.end.x).to.be.greaterThan(beamed.getGraceNotes()[1].getStemX());
      const secondGrace: any = beamed.getGraceNotes()[1];
      const secondGraceT: number = (secondGrace.getStemX() - beamedCurve.start.x) /
         (beamedCurve.end.x - beamedCurve.start.x);
      const secondGraceCurveY: number = (1 - secondGraceT) ** 2 * beamedCurve.start.y +
         2 * (1 - secondGraceT) * secondGraceT * beamedCurve.topControl.y +
         secondGraceT ** 2 * beamedCurve.end.y;
      expect(
         secondGraceCurveY,
         `grace slur curve ${JSON.stringify(beamedCurve)}`,
      ).to.be.lessThan(secondGrace.getStemExtents().topY - 3);
   });

   it("selects both internal engines without changing the rhythmic layout", async (): Promise<void> => {
      const renderMode: (mode: "legacy" | "candidate") => Promise<SlurModeSnapshot> = async (mode) => {
         const osmd: OpenSheetMusicDisplay =
            TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
         await osmd.load(TestUtils.getScore("test_slur_double.musicxml"));
         osmd.EngravingRules.SlurLayoutMode = mode;
         osmd.EngravingRules.SlurDiagnosticsLevel = "candidates";
         osmd.updateGraphic();
         osmd.render();
         return {
            rhythm: rhythmicSnapshot(osmd),
            slurs: snapshot(osmd),
         };
      };

      const legacy: SlurModeSnapshot = await renderMode("legacy");
      const candidate: SlurModeSnapshot = await renderMode("candidate");
      expect(candidate.rhythm).to.deep.equal(legacy.rhythm);
      expect(candidate.slurs).to.have.length(legacy.slurs.length);
      for (let index: number = 0; index < legacy.slurs.length; index++) {
         expect(candidate.slurs[index].mode).to.equal("candidate");
         expect(legacy.slurs[index].mode).to.equal("legacy");
         expect(candidate.slurs[index].candidateCount).to.be.greaterThan(1);
      }
   });

   it("deliberately ignores imported MusicXML slur geometry hints", async (): Promise<void> => {
      const render: (offset: number) => Promise<SlurSnapshot[]> = async (offset) => {
         const osmd: OpenSheetMusicDisplay =
            TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
         await osmd.load(geometryHintScore(offset));
         osmd.EngravingRules.SlurLayoutMode = "candidate";
         osmd.updateGraphic();
         osmd.render();
         return snapshot(osmd);
      };

      expect(await render(400)).to.deep.equal(await render(-275));
   });

   it("anchors to selected chord heads and clears endpoint articulations in the final skyline", async (): Promise<void> => {
      const container: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
      await osmd.load(articulationScore());
      osmd.EngravingRules.SlurLayoutMode = "legacy";
      osmd.updateGraphic();
      osmd.render();

      const slurs: {slur: GraphicalSlur, staffLine: StaffLine}[] = allSlurs(osmd);
      expect(slurs).to.have.length(4);
      const seenTypes: Set<string> = new Set();
      for (const {slur, staffLine} of slurs) {
         expect(slur.diagnostics.startNotehead, "selected start notehead geometry").to.not.equal(undefined);
         expect(slur.diagnostics.endNotehead, "selected end notehead geometry").to.not.equal(undefined);
         if (slur.diagnostics.startAttachment === "notehead") {
            expect(slur.bezierStartPt.x).to.be.closeTo(slur.diagnostics.startNotehead.right, 0.001);
            const expectedY: number = slur.placement === PlacementEnum.Above
               ? slur.diagnostics.startNotehead.top - osmd.EngravingRules.SlurNoteHeadYOffset
               : slur.diagnostics.startNotehead.bottom + osmd.EngravingRules.SlurNoteHeadYOffset;
            expect(slur.bezierStartPt.y, "notehead-side start uses the selected head vertically")
               .to.be.closeTo(expectedY, 0.001);
         } else {
            expect(["stem", "voice-entry"]).to.include(slur.diagnostics.startAttachment);
         }
         if (slur.diagnostics.endAttachment === "notehead") {
            expect(slur.bezierEndPt.x).to.be.closeTo(slur.diagnostics.endNotehead.left, 0.001);
            const expectedY: number = slur.placement === PlacementEnum.Above
               ? slur.diagnostics.endNotehead.top - osmd.EngravingRules.SlurNoteHeadYOffset
               : slur.diagnostics.endNotehead.bottom + osmd.EngravingRules.SlurNoteHeadYOffset;
            expect(slur.bezierEndPt.y, "notehead-side end uses the selected head vertically")
               .to.be.closeTo(expectedY, 0.001);
         } else {
            expect(["stem", "voice-entry"]).to.include(slur.diagnostics.endAttachment);
         }

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
         expect(rebuilt[index].startAttachment).to.equal(first[index].startAttachment);
         expect(rebuilt[index].endAttachment).to.equal(first[index].endAttachment);
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

   it("keeps duration articulations inside and moves endpoint force marks outside", async (): Promise<void> => {
      const osmd: OpenSheetMusicDisplay =
         TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      await osmd.load(articulationScore());
      osmd.EngravingRules.SlurLayoutMode = "candidate";
      osmd.updateGraphic();
      osmd.render();

      const shifts: GraphicalSlurArticulationShiftDiagnostics[] =
         allSlurs(osmd).flatMap(({slur}) => slur.diagnostics.articulationShifts);
      expect(shifts.map((shift) => shift.type).sort()).to.deep.equal(["a>", "a^"]);
      expect(shifts.every((shift) => shift.finalShiftPx >= shift.previousShiftPx)).to.equal(true);
   });

   it("refreshes articulation coordinates after a stave moves to a later system", async (): Promise<void> => {
      const container: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
      await osmd.load(multiSystemArticulationScore());
      osmd.EngravingRules.SlurLayoutMode = "legacy";
      osmd.Sheet.Rules.NewSystemAtXMLNewSystemAttribute = true;
      osmd.updateGraphic();
      osmd.render();

      const glyph: string = allSlurs(osmd)
         .flatMap(({slur}) => slur.diagnostics.articulationShifts)
         .find((shift) => shift.type === "a.")?.glyph;
      expect(glyph).to.not.equal(undefined);
      const renderedY: number[] = Array.from(container.querySelectorAll("text"))
         .filter((text): boolean => text.textContent === glyph)
         .map((text): number => Number(text.getAttribute("y")))
         .filter(Number.isFinite)
         .sort((left, right): number => left - right);
      expect(renderedY).to.have.length(2);
      expect(renderedY[1] - renderedY[0]).to.be.greaterThan(20);
   });

   it("uses the outer chord heads for opposing double slurs", async (): Promise<void> => {
      const osmd: OpenSheetMusicDisplay =
         TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      await osmd.load(TestUtils.getScore("test_slur_double.musicxml"));
      osmd.render();

      const slurs: GraphicalSlur[] = allSlurs(osmd).map(({slur}) => slur);
      expect(slurs).to.have.length(2);
      const above: GraphicalSlur = slurs.find((slur) => slur.placement === PlacementEnum.Above);
      const below: GraphicalSlur = slurs.find((slur) => slur.placement === PlacementEnum.Below);
      expect(above.diagnostics.startAttachment, "above start attachment").to.equal("notehead");
      expect(above.diagnostics.endAttachment, "above end attachment").to.equal("notehead");
      expect(below.diagnostics.startAttachment, "below start attachment").to.equal("notehead");
      expect(below.diagnostics.endAttachment, "below end attachment").to.equal("notehead");
      expect(above.bezierStartPt.x).to.be.closeTo(above.diagnostics.startNotehead.right, 0.001);
      expect(above.bezierEndPt.x).to.be.closeTo(above.diagnostics.endNotehead.left, 0.001);
      expect(below.bezierStartPt.x).to.be.closeTo(below.diagnostics.startNotehead.right, 0.001);
      expect(below.bezierEndPt.x).to.be.closeTo(below.diagnostics.endNotehead.left, 0.001);
      expect(above.diagnostics.startNotehead.top).to.be.lessThan(below.diagnostics.startNotehead.top);
      expect(above.diagnostics.endNotehead.top).to.be.lessThan(below.diagnostics.endNotehead.top);
   });

   it("preserves stem-side routing when a slur starts on a tie end", async (): Promise<void> => {
      const osmd: OpenSheetMusicDisplay =
         TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      await osmd.load(TestUtils.getScore("test_slur_starting_on_tie_end_note.musicxml"));
      osmd.render();

      const slurs: GraphicalSlur[] = allSlurs(osmd).map(({slur}) => slur);
      expect(slurs).to.have.length(1);
      expect(slurs[0].diagnostics.startAttachment).to.equal("stem-tip");
      expect(slurs[0].diagnostics.endAttachment).to.equal("notehead-center");
   });

   it("collects finalized beam geometry as a typed obstacle", async (): Promise<void> => {
      const osmd: OpenSheetMusicDisplay =
         TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      await osmd.load(TestUtils.getScore("test_slur_SlurPlacementFromXML_undefined_in_XML.musicxml"));
      osmd.EngravingRules.SlurLayoutMode = "candidate";
      osmd.updateGraphic();
      osmd.render();

      const obstacles: SlurObstacle[] = allSlurs(osmd).flatMap(
         ({slur}) => slur.layoutContext?.obstacles ?? [],
      );
      const obstacleTypes: Set<string> = new Set(obstacles.map((obstacle) => obstacle.type));
      expect(obstacleTypes.has("beam")).to.equal(true);
      expect(obstacles.some((obstacle) => obstacle.type === "beam" && obstacle.endpoint)).to.equal(true);
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
      expect(segments[0].diagnostics.linkedGroupId).to.equal(segments[1].diagnostics.linkedGroupId);
      expect(segments[0].diagnostics.continuationClearance)
         .to.equal(segments[1].diagnostics.continuationClearance);
      expect(segments[0].diagnostics.linkedTangentMismatch).to.equal(0);
      expect(segments[1].diagnostics.linkedTangentMismatch).to.equal(0);
      expect(segments.flatMap((segment) => segment.diagnostics.structuredFaults ?? [])).to.have.length(0);
      expect(segments[0].bezierEndControlPt.y).to.be.closeTo(segments[0].bezierEndPt.y, 0.001);
      expect(segments[1].bezierStartControlPt.y).to.be.closeTo(segments[1].bezierStartPt.y, 0.001);
      expect(segments[0].bezierStartPt.x).to.be.within(
         segments[0].diagnostics.startNotehead.left - 1,
         segments[0].diagnostics.startNotehead.right + 1,
      );
      expect(segments[1].bezierEndPt.x).to.be.within(
         segments[1].diagnostics.endNotehead.left - 1,
         segments[1].diagnostics.endNotehead.right + 1,
      );
   });

   for (const fixture of [
      "test_slur_across_staves_left_to_right_hand.musicxml",
      "test_slur_across_staves_right_to_left_hand.musicxml",
   ]) {
      it(`routes ${fixture} above both noteheads with an upward bow`, async (): Promise<void> => {
         const osmd: OpenSheetMusicDisplay =
            TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
         await osmd.load(TestUtils.getScore(fixture));
         osmd.render();

         const crossed: GraphicalSlur[] = allSlurs(osmd)
            .map(({slur}) => slur)
            .filter((slur): boolean => slur.slur.isCrossed());
         expect(crossed).to.have.length(1);
         expect(crossed[0].diagnostics.unsupportedRouting).to.equal(undefined);
         expect(crossed[0].placement).to.equal(PlacementEnum.Above);
         expect(crossed[0].diagnostics.startNotehead).to.not.equal(undefined);
         expect(crossed[0].diagnostics.endNotehead).to.not.equal(undefined);
         expect(crossed[0].bezierStartPt.x).to.be.closeTo(
            (crossed[0].diagnostics.startNotehead.left + crossed[0].diagnostics.startNotehead.right) / 2,
            0.001,
         );
         expect(crossed[0].bezierEndPt.x).to.be.closeTo(
            (crossed[0].diagnostics.endNotehead.left + crossed[0].diagnostics.endNotehead.right) / 2,
            0.001,
         );
         const startQuarterLineY: number =
            crossed[0].bezierStartPt.y +
            (crossed[0].bezierEndPt.y - crossed[0].bezierStartPt.y) * 0.25;
         const endQuarterLineY: number =
            crossed[0].bezierStartPt.y +
            (crossed[0].bezierEndPt.y - crossed[0].bezierStartPt.y) * 0.75;
         expect(crossed[0].bezierStartControlPt.y).to.be.lessThan(startQuarterLineY);
         expect(crossed[0].bezierEndControlPt.y).to.be.lessThan(endQuarterLineY);
         expect(startQuarterLineY - crossed[0].bezierStartControlPt.y).to.be.greaterThan(2.5);
         expect(endQuarterLineY - crossed[0].bezierEndControlPt.y).to.be.greaterThan(2.5);
         for (const point of [
            crossed[0].bezierStartPt,
            crossed[0].bezierStartControlPt,
            crossed[0].bezierEndControlPt,
            crossed[0].bezierEndPt,
         ]) {
            expect(Number.isFinite(point?.x) && Number.isFinite(point?.y)).to.equal(true);
         }
      });
   }
});
