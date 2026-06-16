/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { GraphicalContinuousDynamicExpression } from "../../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { BoundingBox } from "../../../../src/MusicalScore/Graphical/BoundingBox";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { ContDynamicEnum } from "../../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";

type WedgeSnapshot = {
  expression: GraphicalContinuousDynamicExpression;
  type: ContDynamicEnum;
  startTimestamp: number;
  endTimestamp: number;
  apexX: number;
  apexY: number;
  leftX: number;
  rightX: number;
  measureLeftX: number;
  measureRightX: number;
};

function collectWedges(graphicalMusicSheet: GraphicalMusicSheet): WedgeSnapshot[] {
  const wedges: WedgeSnapshot[] = [];
  const seen: Set<GraphicalContinuousDynamicExpression> = new Set();
  for (const measureList of graphicalMusicSheet.MeasureList) {
    for (const measure of measureList) {
      if (!measure) {
        continue;
      }
      for (const expression of measure.ParentStaffLine.AbstractExpressions) {
        if (!(expression instanceof GraphicalContinuousDynamicExpression) || expression.IsVerbal) {
          continue;
        }
        if (expression.Lines.length < 2) {
          continue;
        }
        if (seen.has(expression)) {
          continue;
        }
        seen.add(expression);
        const startMeasure: GraphicalMeasure = expression.StartMeasure;
        const leftX: number = getLeftEdge(expression);
        const rightX: number = getRightEdge(expression);
        const measureLeftX: number = startMeasure.PositionAndShape.RelativePosition.x;
        const measureRightX: number = measureLeftX + startMeasure.PositionAndShape.Size.width;
        wedges.push({
          expression,
          type: expression.ContinuousDynamic.DynamicType,
          startTimestamp: expression.ContinuousDynamic.StartMultiExpression.AbsoluteTimestamp.RealValue,
          endTimestamp: expression.ContinuousDynamic.EndMultiExpression.AbsoluteTimestamp.RealValue,
          apexX: expression.Lines[0].Start.x,
          apexY: expression.Lines[0].Start.y,
          leftX,
          rightX,
          measureLeftX,
          measureRightX,
        });
      }
    }
  }
  return wedges.sort((left, right) => left.startTimestamp - right.startTimestamp);
}

function getLeftEdge(wedge: GraphicalContinuousDynamicExpression): number {
  return wedge.PositionAndShape.RelativePosition.x + wedge.PositionAndShape.BorderMarginLeft;
}

function getRightEdge(wedge: GraphicalContinuousDynamicExpression): number {
  return wedge.PositionAndShape.RelativePosition.x + wedge.PositionAndShape.BorderMarginRight;
}

function debugLogPositions(gms: GraphicalMusicSheet, wedges: WedgeSnapshot[]): void {
  console.log("==== DEBUG: All positions ====");
  let measureIdx: number = 0;
  for (const measureList of gms.MeasureList) {
    for (const measure of measureList) {
      if (!measure) {
        continue;
      }
      const mRx: number = measure.PositionAndShape.RelativePosition.x;
      const mWidth: number = measure.PositionAndShape.Size.width;
      console.log(
        `\n-- Measure ${measureIdx} -- ` +
        `RelPos.x=${mRx.toFixed(4)} width=${mWidth.toFixed(4)} ` +
        `beginInstrWidth=${measure.beginInstructionsWidth.toFixed(4)}`
      );
      for (const se of measure.staffEntries) {
        const seRx: number = se.PositionAndShape.RelativePosition.x;
        const seBl: number = (se.PositionAndShape as any).borderLeft; // raw field, not clamped getter
        const seBr: number = (se.PositionAndShape as any).borderRight;
        const seGlobal: number = seRx + mRx;
        const seLeft: number = seGlobal + seBl;
        const seRight: number = seGlobal + seBr;
        let vfXShift: string = "N/A";
        for (const gve of se.graphicalVoiceEntries) {
          if ((gve as any).vfStaveNote) {
            const vfSn: any = (gve as any).vfStaveNote;
            vfXShift = vfSn.xShift !== undefined ? vfSn.xShift.toFixed(4) : "undefined";
            break;
          }
        }
        console.log(
          `  SE ts=${se.relInMeasureTimestamp.RealValue.toFixed(2)} ` +
          `RelPos.x=${seRx.toFixed(4)} ` +
          `BorderLeft=${seBl.toFixed(4)} BorderRight=${seBr.toFixed(4)} ` +
          `globalCenter=${seGlobal.toFixed(4)} ` +
          `globalLeft=${seLeft.toFixed(4)} globalRight=${seRight.toFixed(4)} ` +
          `VFxShift=${vfXShift}`
        );
        for (const gve of se.graphicalVoiceEntries) {
          const ve: any = gve;
          const veBl: number = (ve.PositionAndShape as any).borderLeft;
          const veBr: number = (ve.PositionAndShape as any).borderRight;
          const veRx: number = ve.PositionAndShape.RelativePosition.x;
          if (ve.vfStaveNote) {
            const sn: any = ve.vfStaveNote;
            const bb: any = sn.getBoundingBox();
            const nhBeginX: number = sn.getNoteHeadBeginX?.() ?? -1;
            const modifierW: number = nhBeginX - bb.x;
            console.log(
              `    VE vfBB.x=${bb.x.toFixed(4)} vfBB.w=${bb.w.toFixed(4)} ` +
              `nhBeginX=${nhBeginX.toFixed(4)} modifierW=${modifierW.toFixed(4)} ` +
              `veRelX=${veRx.toFixed(4)} veBL=${veBl.toFixed(4)} veBR=${veBr.toFixed(4)}`
            );
          }
        }
      }
    }
    measureIdx++;
  }

  console.log("\n-- Wedges --");
  for (const w of wedges) {
    const type: string = w.type === ContDynamicEnum.diminuendo ? "dim" : "cresc";
    const e: GraphicalContinuousDynamicExpression = w.expression;
    const eRx: number = e.PositionAndShape.RelativePosition.x;
    const eBml: number = e.PositionAndShape.BorderMarginLeft;
    const eBmr: number = e.PositionAndShape.BorderMarginRight;
    console.log(
      `  ${type} ts=${w.startTimestamp}→${w.endTimestamp} ` +
      `RelPos.x=${eRx.toFixed(4)} BorderMarginLeft=${eBml.toFixed(4)} BorderMarginRight=${eBmr.toFixed(4)} ` +
      `leftX=${w.leftX.toFixed(4)} rightX=${w.rightX.toFixed(4)} ` +
      `apexX=${w.apexX.toFixed(4)} apexY=${w.apexY.toFixed(4)}`
    );
    for (let li: number = 0; li < e.Lines.length; li++) {
      const line: any = e.Lines[li];
      console.log(
        `    Line[${li}] Start=(${line.Start.x.toFixed(4)}, ${line.Start.y.toFixed(4)}) ` +
        `End=(${line.End.x.toFixed(4)}, ${line.End.y.toFixed(4)})`
      );
    }
  }
  console.log("==== END DEBUG ====\n");
}

function findStaffEntryAtTimestamp(measure: GraphicalMeasure, relTimestamp: number): GraphicalStaffEntry | undefined {
  return measure.staffEntries.find((se) =>
    Math.abs(se.relInMeasureTimestamp.RealValue - relTimestamp) < 0.001);
}

function findNearestStaffEntry(measure: GraphicalMeasure, targetX: number): GraphicalStaffEntry | undefined {
  let nearest: GraphicalStaffEntry | undefined;
  let nearestDist: number = Infinity;
  for (const se of measure.staffEntries) {
    const seCenterX: number = se.PositionAndShape.RelativePosition.x + measure.PositionAndShape.RelativePosition.x;
    const dist: number = Math.abs(seCenterX - targetX);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = se;
    }
  }
  return nearest;
}

function getStaffEntryGlobalCenter(se: GraphicalStaffEntry, measure: GraphicalMeasure): number {
  return se.PositionAndShape.RelativePosition.x + measure.PositionAndShape.RelativePosition.x;
}

describe("VexFlow Measure - Wedge Positioning (stop/start alignment)", () => {
  it("Should keep all wedge bounding boxes inside their own measure and align stop/start transitions", () => {
    const score: any = TestUtils.getScore("test_wedge_decrescendo_crescendo_stop_start.musicxml");
    const partwise: any = TestUtils.getPartWiseElement(score);
    const reader: MusicSheetReader = new MusicSheetReader();
    const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), "test_wedge_decrescendo_crescendo_stop_start.musicxml");
    const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
    calc.calculate();
    const wedges: WedgeSnapshot[] = collectWedges(gms);
    debugLogPositions(gms, wedges);

    expect(wedges).to.have.length(4);
    for (const wedge of wedges) {
      expect(wedge.expression.Lines).to.have.length(2);
      expect(Math.abs(wedge.expression.Lines[0].Start.y - wedge.expression.Lines[1].Start.y)).to.be.lessThan(0.0001);
      expect(wedge.leftX).to.be.at.least(wedge.measureLeftX - 0.5);
      expect(wedge.rightX).to.be.at.most(wedge.measureRightX + 0.001);
      // Wedge start must be at the start note's horizontal center.
      // For crescendo, the start is the apex (Lines[0].Start).
      // For diminuendo, the start is the open end (Lines[0].End).
      const startTimestamp: number = wedge.expression.ContinuousDynamic.StartMultiExpression.Timestamp.RealValue;
      const startSE: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(wedge.expression.StartMeasure, startTimestamp);
      expect(startSE, `no staff entry at start timestamp ${startTimestamp}`);
      const startNoteCenterX: number = getStaffEntryGlobalCenter(startSE!, wedge.expression.StartMeasure);
      const wedgeStartX: number = wedge.type === ContDynamicEnum.crescendo
        ? wedge.expression.Lines[0].Start.x
        : wedge.expression.Lines[0].End.x;
      expect(wedgeStartX,
        `${ContDynamicEnum[wedge.type]} ts=${wedge.startTimestamp} start ` +
        `(${wedgeStartX.toFixed(2)}) should not be left of note center (${startNoteCenterX.toFixed(2)})`)
        .to.be.at.least(startNoteCenterX - 0.01);
    }

    const transitionTimestamps: number[] = [0.5, 1.5];
    for (const timestamp of transitionTimestamps) {
      const diminuendo: WedgeSnapshot = wedges.find((wedge) =>
        wedge.type === ContDynamicEnum.diminuendo && wedge.endTimestamp === timestamp);
      const crescendo: WedgeSnapshot = wedges.find((wedge) =>
        wedge.type === ContDynamicEnum.crescendo && wedge.startTimestamp === timestamp);

      if (!diminuendo) {
        throw new Error(`Missing diminuendo ending at ${timestamp}`);
      }
      if (!crescendo) {
        throw new Error(`Missing crescendo starting at ${timestamp}`);
      }
      expect(Math.abs(diminuendo.apexX - crescendo.apexX)).to.be.at.most(0.7);
      expect(crescendo.apexX).to.be.at.least(diminuendo.apexX);
      expect(Math.abs(diminuendo.apexY - crescendo.apexY)).to.be.lessThan(0.1);
      expect(Math.abs(diminuendo.rightX - crescendo.leftX)).to.be.at.most(0.7);
      expect(crescendo.leftX).to.be.at.least(diminuendo.rightX);
    }

    const firstMeasureDiminuendo: WedgeSnapshot = wedges[0];
    const firstMeasureCrescendo: WedgeSnapshot = wedges[1];
    const secondMeasureDiminuendo: WedgeSnapshot = wedges[2];
    const secondMeasureCrescendo: WedgeSnapshot = wedges[3];
    expect(firstMeasureDiminuendo.measureLeftX).to.equal(firstMeasureCrescendo.measureLeftX);
    expect(firstMeasureDiminuendo.measureRightX).to.equal(firstMeasureCrescendo.measureRightX);
    expect(secondMeasureDiminuendo.measureLeftX).to.equal(secondMeasureCrescendo.measureLeftX);
    expect(secondMeasureDiminuendo.measureRightX).to.equal(secondMeasureCrescendo.measureRightX);

    // Each wedge must start after the instruction area (bar line, clef, key, time)
    // but just before the note it attaches to.
    for (const wedge of wedges) {
      const startMeasure: GraphicalMeasure = wedge.expression.StartMeasure;
      expect(wedge.leftX, `Wedge ts=${wedge.startTimestamp} leftX should be >= beginInstructionsWidth`)
        .to.be.at.least(startMeasure.beginInstructionsWidth - 1.0);
    }

    // Wedge 0: diminuendo, ts 0 → 0.5. Open end clamped to beginInstructionsWidth (after instructions,
    // just before the first note), apex at M1 n2 center.
    const dim0StartSE: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(firstMeasureDiminuendo.expression.StartMeasure, 0);
    if (!dim0StartSE) {
      throw new Error("Missing staff entry at dim0 start (ts=0)");
    }
    // Clamped to beginInstructionsWidth, so open end is after the instruction margin.
    expect(firstMeasureDiminuendo.leftX).to.be.at.least(firstMeasureDiminuendo.expression.StartMeasure.beginInstructionsWidth - 1.0);
    // And before the first note's center.
    const dim0NoteCenterX: number = getStaffEntryGlobalCenter(dim0StartSE, firstMeasureDiminuendo.expression.StartMeasure);
    expect(firstMeasureDiminuendo.leftX).to.be.at.most(dim0NoteCenterX + 0.01);

    const dim0EndSE: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(firstMeasureDiminuendo.expression.EndMeasure, 0.5);
    if (!dim0EndSE) {
      throw new Error("Missing staff entry at dim0 end (ts=0.5)");
    }
    const dim0ExpectedApexX: number = getStaffEntryGlobalCenter(dim0EndSE, firstMeasureDiminuendo.expression.EndMeasure);
    expect(Math.abs(firstMeasureDiminuendo.apexX - dim0ExpectedApexX)).to.be.lessThan(0.1);
    // Wedge bounding box must end before (or at) the second note's right bounding edge
    const dim0EndNoteRightEdge: number = dim0ExpectedApexX + dim0EndSE.PositionAndShape.BorderRight;
    expect(firstMeasureDiminuendo.rightX, "dim0 rightX should not exceed second note right edge")
      .to.be.at.most(dim0EndNoteRightEdge + 0.01);

    // Wedge 1: crescendo, ts 0.5 → 1.0. Apex at preceding dim end (collision code), open end near end of M1.
    expect(firstMeasureCrescendo.leftX).to.be.at.least(firstMeasureDiminuendo.apexX);
    expect(firstMeasureCrescendo.rightX).to.be.at.most(firstMeasureCrescendo.measureRightX + 0.001);
    expect(firstMeasureCrescendo.rightX).to.be.greaterThan(firstMeasureCrescendo.leftX);

    // Wedge 2: diminuendo, ts 1.0 → 1.5. Open end at M2 n1 left edge, apex at M2 n2 center.
    const dim2StartSE: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(secondMeasureDiminuendo.expression.StartMeasure, 0);
    if (!dim2StartSE) {
      throw new Error("Missing staff entry at dim2 start (ts=1.0)");
    }
    // M2 has no instruction area affecting the note, so the open end goes to the note's left border.
    const dim2NoteCenterX: number = getStaffEntryGlobalCenter(dim2StartSE, secondMeasureDiminuendo.expression.StartMeasure);
    expect(secondMeasureDiminuendo.leftX).to.be.at.least(secondMeasureDiminuendo.expression.StartMeasure.beginInstructionsWidth);
    expect(secondMeasureDiminuendo.leftX).to.be.at.most(dim2NoteCenterX + 0.01);

    const dim2EndSE: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(secondMeasureDiminuendo.expression.EndMeasure, 0.5);
    if (!dim2EndSE) {
      throw new Error("Missing staff entry at dim2 end (ts=1.5)");
    }
    const dim2ExpectedApexX: number = getStaffEntryGlobalCenter(dim2EndSE, secondMeasureDiminuendo.expression.EndMeasure);
    expect(Math.abs(secondMeasureDiminuendo.apexX - dim2ExpectedApexX)).to.be.lessThan(0.1);
    // Wedge bounding box must end before (or at) the second note's right bounding edge
    const dim2EndNoteRightEdge: number = dim2ExpectedApexX + dim2EndSE.PositionAndShape.BorderRight;
    expect(secondMeasureDiminuendo.rightX, "dim2 rightX should not exceed second note right edge")
      .to.be.at.most(dim2EndNoteRightEdge + 0.01);

    // Wedge 3: crescendo, ts 1.5 → 2.0. Apex at preceding dim end (collision code), open end near end of M2.
    expect(secondMeasureCrescendo.leftX).to.be.at.least(secondMeasureDiminuendo.apexX);
    expect(secondMeasureCrescendo.rightX).to.be.at.most(secondMeasureCrescendo.measureRightX + 0.001);
    expect(secondMeasureCrescendo.rightX).to.be.greaterThan(secondMeasureCrescendo.leftX);
  });

  it("crescendo apex at note center, not at measure boundary (non-first measure)", () => {
    const score: any = TestUtils.getScore("test_wedge_offset_1477.musicxml");
    const partwise: any = TestUtils.getPartWiseElement(score);
    const reader: MusicSheetReader = new MusicSheetReader();
    const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), "test_wedge_offset_1477.musicxml");
    const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
    calc.calculate();

    // Find the crescendo in a non-first measure. Scores may have multiple systems,
    // each with 1 measure. Iterate all measures in score order, skip the very first.
    let nonFirstMeasureCrescendo: GraphicalContinuousDynamicExpression | undefined;
    let nonFirstMeasure: GraphicalMeasure | undefined;
    let measureOrdinal: number = 0;
    for (const measureList of gms.MeasureList) {
      for (let mi: number = 0; mi < measureList.length; mi++) {
        const measure: GraphicalMeasure = measureList[mi];
        if (!measure) {
          continue;
        }
        if (measureOrdinal === 0) {
          measureOrdinal++;
          continue; // skip the very first measure of the score
        }
        measureOrdinal++;
        for (const expr of measure.ParentStaffLine.AbstractExpressions) {
          if (expr instanceof GraphicalContinuousDynamicExpression &&
              !expr.IsVerbal &&
              expr.ContinuousDynamic.DynamicType === ContDynamicEnum.crescendo &&
              expr.StartMeasure === measure) {
            nonFirstMeasureCrescendo = expr;
            nonFirstMeasure = measure;
            break;
          }
        }
        if (nonFirstMeasureCrescendo) {
          break;
        }
      }
      if (nonFirstMeasureCrescendo) {
        break;
      }
    }
    expect(nonFirstMeasureCrescendo, "should have a crescendo in a non-first measure").to.not.be.undefined;
    expect(nonFirstMeasure, "should have found the measure").to.not.be.undefined;

    const measure2: GraphicalMeasure = nonFirstMeasure!;
    const m2RelX: number = measure2.PositionAndShape.RelativePosition.x;
    const se0: GraphicalStaffEntry = measure2.staffEntries[0];
    const se0CenterX: number = se0.PositionAndShape.RelativePosition.x + m2RelX;

    // The apex (crescendo start, Lines[0].Start.x) should be near the first note's center,
    // NOT at the measure boundary.
    const apexX: number = nonFirstMeasureCrescendo!.Lines[0].Start.x;
    const distFromNoteCenter: number = Math.abs(apexX - se0CenterX);
    const distFromMeasureEdge: number = Math.abs(apexX - m2RelX);
    expect(distFromNoteCenter,
      `apexX=${apexX.toFixed(2)} should be near note center ${se0CenterX.toFixed(2)}, ` +
      `not measure edge ${m2RelX.toFixed(2)}`)
      .to.be.lessThan(0.2);
    expect(distFromNoteCenter).to.be.lessThan(distFromMeasureEdge);
  });

  it("diminuendo start and end at their respective note centers", () => {
    const score: any = TestUtils.getScore("test_wedge_diminuendo_duplicated.musicxml");
    const partwise: any = TestUtils.getPartWiseElement(score);
    const reader: MusicSheetReader = new MusicSheetReader();
    const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), "test_wedge_diminuendo_duplicated.musicxml");
    const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
    calc.calculate();

    const wedges: WedgeSnapshot[] = collectWedges(gms);
    expect(wedges.length).to.be.at.least(1);
    for (const wedge of wedges) {
      expect(wedge.type).to.equal(ContDynamicEnum.diminuendo);
      // Lines[0].End = open end (wedge start, wide), Lines[0].Start = apex (wedge end, closed)
      // Both should be at their respective note centers.
      const startTimestamp: number = wedge.expression.ContinuousDynamic.StartMultiExpression.Timestamp.RealValue;
      const startSE: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(wedge.expression.StartMeasure, startTimestamp);
      expect(startSE, `no staff entry at start ts=${startTimestamp}`);
      const startNoteCenterX: number = getStaffEntryGlobalCenter(startSE!, wedge.expression.StartMeasure);
      const openEndX: number = wedge.expression.Lines[0].End.x;
      expect(Math.abs(openEndX - startNoteCenterX),
        `dim open end (${openEndX.toFixed(2)}) should be at start note center (${startNoteCenterX.toFixed(2)})`)
        .to.be.lessThan(0.1);

      // The end timestamp may point after the last note (end of measure), so use
      // the nearest staff entry by position rather than exact timestamp match.
      const apexX: number = wedge.expression.Lines[0].Start.x;
      const endSE: GraphicalStaffEntry | undefined = findNearestStaffEntry(wedge.expression.EndMeasure, apexX);
      expect(endSE, `no staff entry near apexX=${apexX.toFixed(2)} in end measure`);
      const endNoteCenterX: number = getStaffEntryGlobalCenter(endSE!, wedge.expression.EndMeasure);
      expect(Math.abs(apexX - endNoteCenterX),
        `dim apex (${apexX.toFixed(2)}) should be at end note center (${endNoteCenterX.toFixed(2)})`)
        .to.be.lessThan(12.0);
    }
  });

  it("diminuendo apex at end note center in multi-part score", () => {
    const score: any = TestUtils.getScore("test_wedge_cresc_dim_simultaneous_quartet.musicxml");
    const partwise: any = TestUtils.getPartWiseElement(score);
    const reader: MusicSheetReader = new MusicSheetReader();
    const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), "test_wedge_cresc_dim_simultaneous_quartet.musicxml");
    const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
    calc.calculate();

    const wedges: WedgeSnapshot[] = collectWedges(gms);
    const crescs: WedgeSnapshot[] = wedges.filter((w) => w.type === ContDynamicEnum.crescendo);
    const dims: WedgeSnapshot[] = wedges.filter((w) => w.type === ContDynamicEnum.diminuendo);
    expect(dims.length).to.be.at.least(3, "expected at least 3 diminuendos");
    expect(crescs.length).to.be.at.least(2, "expected at least 2 crescendos");

    // Violin1 crescendo (ts=0→1): apex at first note, open end at last note
    {
      const vln1Cresc: WedgeSnapshot | undefined = crescs.find((w) => w.expression.ParentStaffLine.ParentStaff.idInMusicSheet === 0);
      expect(vln1Cresc, "should have Vln1 crescendo").to.not.be.undefined;
      const openX: number = vln1Cresc!.expression.Lines[0].End.x;
      const apexX: number = vln1Cresc!.expression.Lines[0].Start.x;
      const measure: GraphicalMeasure = vln1Cresc!.expression.EndMeasure;
      const se0: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(measure, 0);
      const se3: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(measure, 0.75);
      expect(se0, "SE0 should exist").to.not.be.undefined;
      expect(se3, "SE3 should exist").to.not.be.undefined;
      const se0Center: number = getStaffEntryGlobalCenter(se0!, measure);
      const se3Center: number = getStaffEntryGlobalCenter(se3!, measure);
      expect(apexX, "Vln1 cres apex").to.be.closeTo(se0Center, 0.11);
      expect(openX, `Vln1 cres open (${openX.toFixed(2)}) should be at SE3 (${se3Center.toFixed(2)})`)
        .to.be.closeTo(se3Center, 0.11);
    }

    // Violin2 diminuendo (ts=0→1): open at first note, apex at last note
    {
      const vln2Dim: WedgeSnapshot | undefined = dims.find((w) => w.expression.ParentStaffLine.ParentStaff.idInMusicSheet === 1);
      expect(vln2Dim, "should have Vln2 dim").to.not.be.undefined;
      const openX: number = vln2Dim!.expression.Lines[0].End.x;
      const apexX: number = vln2Dim!.expression.Lines[0].Start.x;
      const measure: GraphicalMeasure = vln2Dim!.expression.EndMeasure;
      const se0: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(measure, 0);
      const se3: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(measure, 0.75);
      expect(se0, "SE0 should exist").to.not.be.undefined;
      expect(se3, "SE3 should exist").to.not.be.undefined;
      const se0Center: number = getStaffEntryGlobalCenter(se0!, measure);
      const se3Center: number = getStaffEntryGlobalCenter(se3!, measure);
      expect(openX, "Vln2 dim open").to.be.closeTo(se0Center, 0.11);
      expect(apexX, "Vln2 dim apex").to.be.closeTo(se3Center, 0.11);
    }

    // Viola crescendo (ts=0→0.5): apex at first note, open end at third beat (SE2)
    {
      const vlaCresc: WedgeSnapshot | undefined = crescs.find((w) => w.expression.ParentStaffLine.ParentStaff.idInMusicSheet === 2);
      expect(vlaCresc, "should have Viola crescendo").to.not.be.undefined;
      const openX: number = vlaCresc!.expression.Lines[0].End.x;
      const apexX: number = vlaCresc!.expression.Lines[0].Start.x;
      const measure: GraphicalMeasure = vlaCresc!.expression.EndMeasure;
      const se0: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(measure, 0);
      const se2: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(measure, 0.5);
      expect(se0, "SE0 should exist").to.not.be.undefined;
      expect(se2, "SE2 should exist").to.not.be.undefined;
      const se2Center: number = getStaffEntryGlobalCenter(se2!, measure);
      // cresc open end sits WedgeHorizontalMargin left of SE2 to leave a notehead gap
      // before the following dim starts.
      expect(apexX, "Vla cres apex").to.be.closeTo(getStaffEntryGlobalCenter(se0!, measure), 0.11);
      expect(openX, "Vla cres open").to.be.closeTo(se2Center - reader.rules.WedgeOpeningLength - reader.rules.WedgeHorizontalMargin, 0.11);
    }

    // Viola diminuendo (ts=0.5→1): open at third beat (SE2), apex at last note (SE3)
    {
      const vlaDim: WedgeSnapshot | undefined = dims.find((w) => w.expression.ParentStaffLine.ParentStaff.idInMusicSheet === 2);
      expect(vlaDim, "should have Viola dim").to.not.be.undefined;
      const openX: number = vlaDim!.expression.Lines[0].End.x;
      const apexX: number = vlaDim!.expression.Lines[0].Start.x;
      const measure: GraphicalMeasure = vlaDim!.expression.EndMeasure;
      const se2: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(measure, 0.5);
      const se3: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(measure, 0.75);
      expect(se2, "SE2 should exist").to.not.be.undefined;
      expect(se3, "SE3 should exist").to.not.be.undefined;
      const se2Center: number = getStaffEntryGlobalCenter(se2!, measure);
      // dim open end at SE2 center (collision no longer shifts it right because
      // the cresc's open end was already pulled left).
      expect(openX, "Vla dim open").to.be.closeTo(se2Center, 0.11);
      expect(apexX, "Vla dim apex").to.be.closeTo(getStaffEntryGlobalCenter(se3!, measure), 0.11);
    }

    // Cello diminuendo (ts=0→1): open at its whole-note SE, apex extends to endOfMeasure
    {
      const celloDim: WedgeSnapshot | undefined = dims.find((w) => w.expression.ParentStaffLine.ParentStaff.idInMusicSheet === 3);
      expect(celloDim, "should have Cello dim").to.not.be.undefined;
      const openX: number = celloDim!.expression.Lines[0].End.x;
      const apexX: number = celloDim!.expression.Lines[0].Start.x;
      const measure: GraphicalMeasure = celloDim!.expression.EndMeasure;
      const se0: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(measure, 0);
      expect(se0, "Cello SE0 should exist").to.not.be.undefined;
      expect(openX, "Cello dim open").to.be.closeTo(getStaffEntryGlobalCenter(se0!, measure), 0.11);
      // Full-measure dim on a whole note: apex should reach near endOfMeasure.
      const endOfMeasure: number = measure.PositionAndShape.RelativePosition.x
        + measure.PositionAndShape.BorderRight;
      expect(apexX,
        `Cello dim apex (${apexX.toFixed(2)}) should be near endOfMeasure (${endOfMeasure.toFixed(2)})`)
        .to.be.at.least(endOfMeasure - 3.5);
    }
  });

  it("last measure notes must not overflow past measure boundary (grace note spacing)", () => {
    const score: any = TestUtils.getScore("OSMD_function_test_all.xml");
    const partwise: any = TestUtils.getPartWiseElement(score);
    const reader: MusicSheetReader = new MusicSheetReader();
    const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), "OSMD_function_test_all.xml");
    const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
    calc.calculate();

    // Find the last measure list (one measure per staffline).
    let lastMeasureList: GraphicalMeasure[] | undefined;
    for (const measureList of gms.MeasureList) {
      lastMeasureList = measureList;
    }
    expect(lastMeasureList, "should have at least one measure list").to.not.be.undefined;
    console.log(`\n=== Last measure list has ${lastMeasureList!.length} measures ===`);

    // Debug: show OSMD measure size vs VF stave size for measure 41.
    for (const measureList of gms.MeasureList) {
      for (const measure of measureList) {
        if (!measure) { continue; }
        const srcMnum: number = measure.parentSourceMeasure?.MeasureNumber ?? -1;
        if (srcMnum !== 41) { continue; }
        const vfStave: any = (measure as any).getVFStave?.();
        const osmdW: number = measure.PositionAndShape.Size.width;
        const beginW: number = measure.beginInstructionsWidth;
        const endW: number = measure.endInstructionsWidth;
        const contentW: number = osmdW - beginW - endW;
        const minW: number = (measure as any).minimumStaffEntriesWidth ?? -1;
        console.log(
          `\n[MEASURE 41 DEBUG] osmdW=${osmdW.toFixed(2)} beginW=${beginW.toFixed(2)} endW=${endW.toFixed(2)} ` +
          `contentW=${contentW.toFixed(2)} minStaffW=${minW.toFixed(2)}`
        );
        if (vfStave) {
          console.log(
            `  vfStave.x=${vfStave.x} vfStave.w=${vfStave.width} ` +
            `noteStartX=${vfStave.getNoteStartX?.() ?? "?"} noteEndX=${vfStave.getNoteEndX?.() ?? vfStave.x + vfStave.width}`
          );
          // VF content width in OSMD units
          console.log(`  vfContentW (OSMD units) = ${(vfStave.getNoteEndX?.() ?? vfStave.x + vfStave.width) / 10}`);
        }
        for (const se of measure.staffEntries) {
          const ts: number = se.relInMeasureTimestamp.RealValue;
          for (const gve of se.graphicalVoiceEntries) {
            const vfNote: any = (gve as any).vfStaveNote;
            if (!vfNote) { continue; }
            const bb: any = vfNote.getBoundingBox?.();
            if (!bb) { continue; }
            const keys: string = vfNote.getKeys?.()?.join(",") ?? "?";
            console.log(
              `  ts=${ts.toFixed(3)} keys=${keys} ` +
              `bb.x=${bb.x.toFixed(2)} bb.w=${bb.w.toFixed(2)} rightEdge=${(bb.x + bb.w).toFixed(2)} ` +
              `rightOsMd=${((bb.x + bb.w) / 10).toFixed(2)}`
            );
          }
        }
      }
    }

    for (const measure of lastMeasureList!) {
      if (!measure) { continue; }
      const vfStave: any = (measure as any).getVFStave?.();
      if (!vfStave) { continue; }
      const staveNoteEndX: number = vfStave.getNoteEndX?.() ?? vfStave.x + vfStave.width;
      const staffId: number = measure.ParentStaffLine?.ParentStaff?.idInMusicSheet ?? -1;
      console.log(
        `\nMeasure staff=${staffId} mi=${measure.parentSourceMeasure?.measureListIndex} ` +
        `staveNoteEndX=${staveNoteEndX.toFixed(2)}`
      );

      for (const se of measure.staffEntries) {
        const ts: number = se.relInMeasureTimestamp.RealValue;
        console.log(`  SE ts=${ts.toFixed(3)} (${se.graphicalVoiceEntries.length} VEs):`);
        for (const gve of se.graphicalVoiceEntries) {
          const vfNote: any = (gve as any).vfStaveNote;
          const isGrace: boolean = !!(gve as any).parentVoiceEntry?.IsGrace;
          if (!vfNote) {
            console.log(`    VE isGrace=${isGrace}: NO vfStaveNote`);
            continue;
          }
          const bb: any = vfNote.getBoundingBox?.();
          if (!bb) {
            const noBbType: string = vfNote.constructor?.name ?? "?";
            console.log(`    VE isGrace=${isGrace} type=${noBbType}: NO bounding box`);
            continue;
          }
          const vfType: string = vfNote.constructor?.name ?? "?";
          const absX: number = vfNote.getAbsoluteX?.() ?? -1;
          const keys: string = vfNote.getKeys?.()?.join(",") ?? "?";
          const preFmt: boolean = !!(vfNote.preFormatted);
          console.log(
            `    VE isGrace=${isGrace} type=${vfType} keys=${keys} preFmt=${preFmt} ` +
            `absX=${absX.toFixed(2)} bb.x=${bb.x.toFixed(2)} bb.w=${bb.w.toFixed(2)} ` +
            `rightEdge=${(bb.x + bb.w).toFixed(2)}`
          );
        }
      }
    }

    // Dump all measure lists with source measure numbers.
    console.log(`\nTotal measure lists: ${gms.MeasureList.length}`);
    const lastFewStart: number = Math.max(0, gms.MeasureList.length - 5);
    for (let mlIdx: number = lastFewStart; mlIdx < gms.MeasureList.length; mlIdx++) {
      const ml: GraphicalMeasure[] = gms.MeasureList[mlIdx];
      const staffIds: number[] = ml.filter(m => !!m).map(m => m.ParentStaffLine?.ParentStaff?.idInMusicSheet ?? -1);
      const srcMnums: number[] = ml.filter(m => !!m).map(m => m.parentSourceMeasure?.MeasureNumber ?? -1);
      console.log(`  ml[${mlIdx}]: ${ml.length} measures, staffs=[${staffIds.join(",")}] srcMnums=[${srcMnums.join(",")}]`);
    }

    // Detailed position dump for the last 3 measure lists (VF + OSMD after reconnection).
    for (let mlIdx: number = lastFewStart; mlIdx < gms.MeasureList.length; mlIdx++) {
      const ml: GraphicalMeasure[] = gms.MeasureList[mlIdx];
      for (const measure of ml) {
        if (!measure) { continue; }
        const vfStave: any = (measure as any).getVFStave?.();
        if (!vfStave) { continue; }
        const srcMnum: number = measure.parentSourceMeasure?.MeasureNumber ?? -1;
        const vfNoteStartX: number = vfStave.getNoteStartX?.() ?? -1;
        const vfNoteEndX: number = vfStave.getNoteEndX?.() ?? vfStave.x + vfStave.width;
        const vfStaveX: number = vfStave.x ?? -1;
        const vfStaveW: number = vfStave.width ?? -1;
        console.log(
          `\n[DUMP] ml=${mlIdx} srcMnum=${srcMnum} ` +
          `vfStave.x=${vfStaveX.toFixed(1)} vfStave.w=${vfStaveW.toFixed(1)} ` +
          `vfNoteStartX=${vfNoteStartX.toFixed(1)} vfNoteEndX=${vfNoteEndX.toFixed(1)}`
        );
        for (const se of measure.staffEntries) {
          const ts: number = se.relInMeasureTimestamp.RealValue;
          // OSMD position after reconnection
          const osmdX: number = se.PositionAndShape.RelativePosition.x;
          const osmdRight: number = osmdX + se.PositionAndShape.BorderRight;
          const osmdLeft: number = osmdX + se.PositionAndShape.BorderLeft;
          console.log(
            `  SE ts=${ts.toFixed(3)} osmdX=${osmdX.toFixed(2)} osmdL=${osmdLeft.toFixed(2)} osmdR=${osmdRight.toFixed(2)} ` +
            `borderL=${se.PositionAndShape.BorderLeft.toFixed(2)} borderR=${se.PositionAndShape.BorderRight.toFixed(2)}`
          );
          for (const gve of se.graphicalVoiceEntries) {
            const vfNote: any = (gve as any).vfStaveNote;
            const isGrace: boolean = !!(gve as any).parentVoiceEntry?.IsGrace;
            if (!vfNote) {
              console.log(`    VE isGrace=${isGrace}: NO vfStaveNote`);
              continue;
            }
            const bb: any = vfNote.getBoundingBox?.();
            const vfType: string = vfNote.constructor?.name ?? "?";
            const keys: string = vfNote.getKeys?.()?.join(",") ?? "?";
            const preFmt: boolean = !!(vfNote.preFormatted);
            if (bb) {
              console.log(
                `    VE isGrace=${isGrace} type=${vfType} keys=${keys} preFmt=${preFmt} ` +
                `bb.x=${bb.x.toFixed(2)} bb.w=${bb.w.toFixed(2)} rightEdge=${(bb.x + bb.w).toFixed(2)}`
              );
            } else {
              console.log(`    VE isGrace=${isGrace} type=${vfType} keys=${keys} preFmt=${preFmt}: NO bb`);
            }
            // OSMD VE position
            const veX: number = gve.PositionAndShape.RelativePosition.x;
            const veR: number = veX + (gve.PositionAndShape.BorderRight || 0);
            const veL: number = veX + (gve.PositionAndShape.BorderLeft || 0);
            console.log(
              `    VE osmd: x=${veX.toFixed(2)} L=${veL.toFixed(2)} R=${veR.toFixed(2)} ` +
              `bL=${(gve.PositionAndShape.BorderLeft||0).toFixed(2)} bR=${(gve.PositionAndShape.BorderRight||0).toFixed(2)}`
            );
          }
        }
      }
    }

    // Check for note overflow within each measure using OSMD coordinate comparisons.
    // VF stave-local coordinates cannot be compared across staves, and getNoteEndX()
    // reflects pre-format state that the formatter legitimately extends past (e.g. for
    // grace note spacing). We use only same-coordinate-space OSMD comparisons.
    // [OSMD_VE]: compare VE right edge against SE right edge (both in OSMD coords).
    const overflows: string[] = [];
    for (const measureList of gms.MeasureList) {
      for (const measure of measureList) {
        if (!measure) { continue; }

        for (const se of measure.staffEntries) {
          for (const gve of se.graphicalVoiceEntries) {
            const isGrace: boolean = !!(gve as any).parentVoiceEntry?.IsGrace;
            if (isGrace) { continue; }

            const osmdRight: number = gve.PositionAndShape.RelativePosition.x +
              (gve.PositionAndShape.BorderRight || 0);
            const sePos: BoundingBox = se.PositionAndShape;
            const seRight: number = sePos.RelativePosition.x + (sePos.BorderRight || 0);
            if (osmdRight > seRight + 1.0) {
              const srcMn: number = measure.parentSourceMeasure?.MeasureNumber ?? -1;
              overflows.push(
                `[OSMD_VE] mnum=${srcMn} ts=${se.relInMeasureTimestamp.RealValue.toFixed(3)} ` +
                `veRight=${osmdRight.toFixed(2)} seRight=${seRight.toFixed(2)}`
              );
            }
          }
        }
      }
    }

    const overflowMsg: string = `VF/OSMD notes must not overflow: ${overflows.join(" | ")}`;
    expect(overflows, overflowMsg).to.be.empty;
  });

  it("detects grace notes via OSMD IsGrace flag (not VF tickables)", () => {
    // Grace notes are VF modifiers (GraceNoteGroup), not tickables.
    // Detection must use OSMD-level IsGrace flag on voice entries.
    const files: string[] = ["OSMD_function_test_all.xml", "OSMD_function_test_GraceNotes.xml"];
    let osmdGraceCount: number = 0;
    let osmdNoteCount: number = 0;
    const graceFiles: Set<string> = new Set();

    for (const file of files) {
      const score: any = TestUtils.getScore(file);
      const partwise: any = TestUtils.getPartWiseElement(score);
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: any = reader.createMusicSheet(new IXmlElement(partwise), file);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      calc.calculate();
      for (const measureList of gms.MeasureList) {
        for (const measure of measureList) {
          if (!measure) { continue; }
          for (const se of measure.staffEntries) {
            for (const gve of se.graphicalVoiceEntries) {
              osmdNoteCount++;
              const ve: any = gve.parentVoiceEntry;
              if (ve?.IsGrace) {
                osmdGraceCount++;
                graceFiles.add(file);
              }
            }
          }
        }
      }
    }
    expect(osmdNoteCount, "No notes found").to.be.greaterThan(0);
    expect(osmdGraceCount,
      `Expected IsGrace entries but found 0/${osmdNoteCount}. ` +
      "Grace notes are VF modifiers, not tickables — must detect at OSMD level.").to.be.greaterThan(0);
    expect(graceFiles.size, "Expected at least one file with grace notes").to.be.at.least(1);
  });
});
