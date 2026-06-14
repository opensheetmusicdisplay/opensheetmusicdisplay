import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";
import { GraphicalSlur } from "../../../../src/MusicalScore/Graphical/GraphicalSlur";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";

describe("Dorico Say Something — bottom stave slur flattening", () => {
  let osmd: OpenSheetMusicDisplay;

  before(async function (): Promise<void> {
    this.timeout(30000);
    const score: Document = TestUtils.getScore("test_notations_nodes_dorico_say_something.musicxml");
    const div: HTMLElement = TestUtils.getDivElement(document);
    osmd = new OpenSheetMusicDisplay(div, { autoResize: false });
    await osmd.load(score);
    osmd.render();
  });

  it("wide slur on bottom stave is flattened to ~5 units or less", () => {
    const bottomSlurs: GraphicalSlur[] = [];
    for (const page of osmd.GraphicSheet.MusicPages) {
      for (const system of page.MusicSystems) {
        const bottomStaffLine: StaffLine = system.StaffLines[system.StaffLines.length - 1];
        for (const s of bottomStaffLine.GraphicalSlurs) {
          if (s.staffEntries.length < 2) {
            continue;
          }
          const startM: number = s.staffEntries[0].parentMeasure.MeasureNumber;
          const endM: number = s.staffEntries[s.staffEntries.length - 1].parentMeasure.MeasureNumber;
          const eX: number = s.bezierEndPt.x - s.bezierStartPt.x;
          if (startM === 1 && endM === 4 && eX > 50) {
            bottomSlurs.push(s);
          }
        }
      }
    }

    expect(bottomSlurs.length, "should find the wide m1-m4 slur on bottom stave").to.equal(1);

    const slur: GraphicalSlur = bottomSlurs[0];
    const startY: number = slur.bezierStartPt.y;
    const endY: number = slur.bezierEndPt.y;
    const startCPY: number = slur.bezierStartControlPt.y;
    const endCPY: number = slur.bezierEndControlPt.y;

    const cpDistFromStartPt: number = startCPY - startY;
    const cpDistFromEndPt: number = endCPY - endY;
    const endX: number = slur.bezierEndPt.x - slur.bezierStartPt.x;

    console.log(
      `slur m1-m4 width=${endX.toFixed(2)}` +
      ` startPt=(${slur.bezierStartPt.x.toFixed(2)},${startY.toFixed(2)})` +
      ` endPt=(${slur.bezierEndPt.x.toFixed(2)},${endY.toFixed(2)})`,
    );
    console.log(
      `  startCP=(${slur.bezierStartControlPt.x.toFixed(2)},${startCPY.toFixed(2)})` +
      ` endCP=(${slur.bezierEndControlPt.x.toFixed(2)},${endCPY.toFixed(2)})`,
    );
    console.log(`  cpDistFromStartPt=${cpDistFromStartPt.toFixed(2)} cpDistFromEndPt=${cpDistFromEndPt.toFixed(2)}`);

    // Before fix: cpDist was ~-8.93. After fix: ~-4.65.
    // The flattening should keep CP within ~5.5 units of start point.
    expect(
      Math.abs(cpDistFromStartPt),
      `m1-m4 slur: CP too high above start (${cpDistFromStartPt.toFixed(2)}u, expected <= 6)`,
    ).to.be.at.most(6);

    expect(
      Math.abs(cpDistFromEndPt),
      `m1-m4 slur: end CP too high (${cpDistFromEndPt.toFixed(2)}u, expected <= 6)`,
    ).to.be.at.most(6);

    // Sanity: slur should be wide enough to trigger flattening
    expect(endX, "m1-m4 slur should be wide").to.be.at.least(50);
  });
});
