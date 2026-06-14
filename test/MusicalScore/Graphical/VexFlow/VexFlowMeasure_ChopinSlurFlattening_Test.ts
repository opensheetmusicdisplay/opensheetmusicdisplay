import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";
import { GraphicalSlur } from "../../../../src/MusicalScore/Graphical/GraphicalSlur";

describe("Chopin Slur Arc Flattening", () => {
  let osmd: OpenSheetMusicDisplay;

  before(async function (): Promise<void> {
    this.timeout(30000);
    const score: Document = TestUtils.getScore("test_slurs_long_steep_arc_flattening_chopin.musicxml");
    const div: HTMLElement = TestUtils.getDivElement(document);
    osmd = new OpenSheetMusicDisplay(div, { autoResize: false });
    await osmd.load(score);
    osmd.render();
  });

  it("steep wide slur is flattened — control point stays within ~8 units of start point", () => {
    const slurs: GraphicalSlur[] = [];
    for (const page of osmd.GraphicSheet.MusicPages) {
      for (const system of page.MusicSystems) {
        for (const staffLine of system.StaffLines) {
          for (const slur of staffLine.GraphicalSlurs) {
            if (slur.staffEntries.length < 2) {
              continue;
            }
            slurs.push(slur);
          }
        }
      }
    }

    expect(slurs.length, "should find at least one slur").to.be.at.least(1);

    for (const slur of slurs) {
      const startM: number = slur.staffEntries[0].parentMeasure.MeasureNumber;
      const endM: number = slur.staffEntries[slur.staffEntries.length - 1].parentMeasure.MeasureNumber;
      const endX: number = slur.bezierEndPt.x - slur.bezierStartPt.x;
      const startY: number = slur.bezierStartPt.y;
      const endY: number = slur.bezierEndPt.y;
      const startCPY: number = slur.bezierStartControlPt.y;
      const endCPY: number = slur.bezierEndControlPt.y;

      console.log(
        `slur m${startM}-m${endM} width=${endX.toFixed(2)}` +
        ` startPt=(${slur.bezierStartPt.x.toFixed(2)},${startY.toFixed(2)})` +
        ` endPt=(${slur.bezierEndPt.x.toFixed(2)},${endY.toFixed(2)})`,
      );
      console.log(
        `  startCP=(${slur.bezierStartControlPt.x.toFixed(2)},${startCPY.toFixed(2)})` +
        ` endCP=(${slur.bezierEndControlPt.x.toFixed(2)},${endCPY.toFixed(2)})`,
      );

      // Over slur: control points should be more negative Y than endpoints
      const cpDistFromStartPt: number = startCPY - startY;
      const cpDistFromEndPt: number = endCPY - endY;

      console.log(`  cpDistFromStartPt=${cpDistFromStartPt.toFixed(2)} cpDistFromEndPt=${cpDistFromEndPt.toFixed(2)}`);

      // For this steep, wide Chopin slur, the flattening ensures the control point
      // stays relatively close to the start point. A regression (e.g., "super high"
      // slur) would show cpDistFromStartPt < -15 or more extreme.
      // Measured value: ~-7.0 units. Allow tolerance up to -10.
      expect(
        cpDistFromStartPt,
        `slur m${startM}-m${endM}: CP Y too high above start (${cpDistFromStartPt.toFixed(2)}), flattening broken?`,
      ).to.be.at.least(-10);

      // End control point should also be reasonably close
      expect(cpDistFromEndPt, `slur m${startM}-m${endM}: end control point Y too high (${cpDistFromEndPt.toFixed(2)})`).to.be.at.least(-12);

      // Sanity: width should be large enough to trigger flattening
      expect(endX, `slur m${startM}-m${endM}: expected wide slur (>40 units)`).to.be.at.least(40);
    }
  });
});
