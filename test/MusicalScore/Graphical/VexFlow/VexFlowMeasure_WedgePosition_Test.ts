import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { IXmlElement } from "../../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "../../../Util/TestUtils";
import { GraphicalContinuousDynamicExpression } from "../../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
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
  const wedgesByKey: Map<string, WedgeSnapshot> = new Map<string, WedgeSnapshot>();
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
        const key: string = [
          expression.ContinuousDynamic.DynamicType,
          expression.ContinuousDynamic.StartMultiExpression.AbsoluteTimestamp.RealValue,
          expression.ContinuousDynamic.EndMultiExpression.AbsoluteTimestamp.RealValue,
        ].join(":");
        if (!wedgesByKey.has(key)) {
          const startMeasure: GraphicalMeasure = expression.StartMeasure;
          const leftX: number = getLeftEdge(expression);
          const rightX: number = getRightEdge(expression);
          const measureLeftX: number = startMeasure.PositionAndShape.RelativePosition.x;
          const measureRightX: number = measureLeftX + startMeasure.PositionAndShape.Size.width;
          wedgesByKey.set(key, {
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
  }
  return Array.from(wedgesByKey.values()).sort((left, right) => left.startTimestamp - right.startTimestamp);
}

function getLeftEdge(wedge: GraphicalContinuousDynamicExpression): number {
  return wedge.PositionAndShape.RelativePosition.x + wedge.PositionAndShape.BorderMarginLeft;
}

function getRightEdge(wedge: GraphicalContinuousDynamicExpression): number {
  return wedge.PositionAndShape.RelativePosition.x + wedge.PositionAndShape.BorderMarginRight;
}

function findStaffEntryAtTimestamp(measure: GraphicalMeasure, relTimestamp: number): GraphicalStaffEntry | undefined {
  return measure.staffEntries.find((se) =>
    Math.abs(se.relInMeasureTimestamp.RealValue - relTimestamp) < 0.001);
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

    chai.expect(wedges).to.have.length(4);
    for (const wedge of wedges) {
      chai.expect(wedge.expression.Lines).to.have.length(2);
      chai.expect(Math.abs(wedge.expression.Lines[0].Start.y - wedge.expression.Lines[1].Start.y)).to.be.lessThan(0.0001);
      chai.expect(wedge.leftX).to.be.at.least(wedge.measureLeftX - 0.5);
      chai.expect(wedge.rightX).to.be.at.most(wedge.measureRightX + 0.001);
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
      chai.expect(Math.abs(diminuendo.apexX - crescendo.apexX)).to.be.lessThan(0.1);
      chai.expect(Math.abs(diminuendo.apexY - crescendo.apexY)).to.be.lessThan(0.1);
      chai.expect(Math.abs(diminuendo.rightX - crescendo.leftX)).to.be.lessThan(0.1);
    }

    const firstMeasureDiminuendo: WedgeSnapshot = wedges[0];
    const firstMeasureCrescendo: WedgeSnapshot = wedges[1];
    const secondMeasureDiminuendo: WedgeSnapshot = wedges[2];
    const secondMeasureCrescendo: WedgeSnapshot = wedges[3];
    chai.expect(firstMeasureDiminuendo.measureLeftX).to.equal(firstMeasureCrescendo.measureLeftX);
    chai.expect(firstMeasureDiminuendo.measureRightX).to.equal(firstMeasureCrescendo.measureRightX);
    chai.expect(secondMeasureDiminuendo.measureLeftX).to.equal(secondMeasureCrescendo.measureLeftX);
    chai.expect(secondMeasureDiminuendo.measureRightX).to.equal(secondMeasureCrescendo.measureRightX);

    // Each wedge must start after the instruction area (bar line, clef, key, time)
    // but just before the note it attaches to.
    for (const wedge of wedges) {
      const startMeasure: GraphicalMeasure = wedge.expression.StartMeasure;
      chai.expect(wedge.leftX, `Wedge ts=${wedge.startTimestamp} leftX should be >= beginInstructionsWidth`)
        .to.be.at.least(startMeasure.beginInstructionsWidth);
    }

    // Wedge 0: diminuendo, ts 0 → 0.5. Open end clamped to beginInstructionsWidth (after instructions,
    // just before the first note), apex at M1 n2 center.
    const dim0StartSE: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(firstMeasureDiminuendo.expression.StartMeasure, 0);
    if (!dim0StartSE) {
      throw new Error("Missing staff entry at dim0 start (ts=0)");
    }
    // Clamped to beginInstructionsWidth, so open end is after the instruction margin.
    chai.expect(firstMeasureDiminuendo.leftX).to.be.at.least(firstMeasureDiminuendo.expression.StartMeasure.beginInstructionsWidth);
    // And before the first note's center.
    const dim0NoteCenterX: number = getStaffEntryGlobalCenter(dim0StartSE, firstMeasureDiminuendo.expression.StartMeasure);
    chai.expect(firstMeasureDiminuendo.leftX).to.be.at.most(dim0NoteCenterX + 0.01);

    const dim0EndSE: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(firstMeasureDiminuendo.expression.EndMeasure, 0.5);
    if (!dim0EndSE) {
      throw new Error("Missing staff entry at dim0 end (ts=0.5)");
    }
    const dim0ExpectedApexX: number = getStaffEntryGlobalCenter(dim0EndSE, firstMeasureDiminuendo.expression.EndMeasure);
    chai.expect(Math.abs(firstMeasureDiminuendo.apexX - dim0ExpectedApexX)).to.be.lessThan(0.1);

    // Wedge 1: crescendo, ts 0.5 → 1.0. Apex at preceding dim end (collision code), open end near end of M1.
    chai.expect(Math.abs(firstMeasureCrescendo.leftX - firstMeasureDiminuendo.apexX)).to.be.lessThan(0.1);
    chai.expect(firstMeasureCrescendo.rightX).to.be.at.most(firstMeasureCrescendo.measureRightX + 0.001);
    chai.expect(firstMeasureCrescendo.rightX).to.be.greaterThan(firstMeasureCrescendo.leftX);

    // Wedge 2: diminuendo, ts 1.0 → 1.5. Open end at M2 n1 left edge, apex at M2 n2 center.
    const dim2StartSE: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(secondMeasureDiminuendo.expression.StartMeasure, 0);
    if (!dim2StartSE) {
      throw new Error("Missing staff entry at dim2 start (ts=1.0)");
    }
    // M2 has no instruction area affecting the note, so the open end goes to the note's left border.
    const dim2NoteCenterX: number = getStaffEntryGlobalCenter(dim2StartSE, secondMeasureDiminuendo.expression.StartMeasure);
    chai.expect(secondMeasureDiminuendo.leftX).to.be.at.least(secondMeasureDiminuendo.expression.StartMeasure.beginInstructionsWidth);
    chai.expect(secondMeasureDiminuendo.leftX).to.be.at.most(dim2NoteCenterX + 0.01);

    const dim2EndSE: GraphicalStaffEntry | undefined = findStaffEntryAtTimestamp(secondMeasureDiminuendo.expression.EndMeasure, 0.5);
    if (!dim2EndSE) {
      throw new Error("Missing staff entry at dim2 end (ts=1.5)");
    }
    const dim2ExpectedApexX: number = getStaffEntryGlobalCenter(dim2EndSE, secondMeasureDiminuendo.expression.EndMeasure);
    chai.expect(Math.abs(secondMeasureDiminuendo.apexX - dim2ExpectedApexX)).to.be.lessThan(0.1);

    // Wedge 3: crescendo, ts 1.5 → 2.0. Apex at preceding dim end (collision code), open end near end of M2.
    chai.expect(Math.abs(secondMeasureCrescendo.leftX - secondMeasureDiminuendo.apexX)).to.be.lessThan(0.1);
    chai.expect(secondMeasureCrescendo.rightX).to.be.at.most(secondMeasureCrescendo.measureRightX + 0.001);
    chai.expect(secondMeasureCrescendo.rightX).to.be.greaterThan(secondMeasureCrescendo.leftX);
  });
});
