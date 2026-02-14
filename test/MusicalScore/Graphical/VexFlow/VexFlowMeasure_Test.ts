/* eslint-disable @typescript-eslint/no-unused-expressions */
import {GraphicalMusicSheet} from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import {IXmlElement} from "../../../../src/Common/FileIO/Xml";
import {MusicSheet} from "../../../../src/MusicalScore/MusicSheet";
import {MusicSheetReader} from "../../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import {VexFlowMusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import {TestUtils} from "../../../Util/TestUtils";
import {SourceMeasure} from "../../../../src/MusicalScore/VoiceData/SourceMeasure";
import {SourceStaffEntry} from "../../../../src/MusicalScore/VoiceData/SourceStaffEntry";
import {MusicSheetCalculator} from "../../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import {EngravingRules} from "../../../../src/MusicalScore/Graphical/EngravingRules";
import { Staff } from "../../../../src/MusicalScore/VoiceData/Staff";
import { Instrument } from "../../../../src/MusicalScore/Instrument";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { GraphicalOctaveShift } from "../../../../src/MusicalScore/Graphical/GraphicalOctaveShift";
import { GraphicalMusicPage } from "../../../../src/MusicalScore/Graphical/GraphicalMusicPage";
import { MusicSystem } from "../../../../src/MusicalScore/Graphical/MusicSystem";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";

describe("VexFlow Measure", () => {

   it("Can create GraphicalMusicSheet", (done: Mocha.Done) => {
      const path: string = "MuzioClementi_SonatinaOpus36No1_Part1.xml";
      const score: Document = TestUtils.getScore(path);
      chai.expect(score).to.not.be.undefined;
      const partwise: Element = TestUtils.getPartWiseElement(score);
      chai.expect(partwise).to.not.be.undefined;
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      // console.log(gms);
      chai.expect(gms).to.not.be.undefined; // at least necessary for linter so that variable is not unused
      done();
   });

   it("Can have a single empty Measure", (done: Mocha.Done) => {
      const sheet: MusicSheet = new MusicSheet();
      sheet.Rules = new EngravingRules();
      sheet.Staves.push(new Staff(new Instrument(0, "", sheet, null), 0));
      const measure: SourceMeasure = new SourceMeasure(1, sheet.Rules);
      measure.FirstInstructionsStaffEntries[0] = new SourceStaffEntry(undefined, undefined);
      sheet.addMeasure(measure);
      const calc: MusicSheetCalculator = new VexFlowMusicSheetCalculator(sheet.Rules);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      chai.expect(gms.MeasureList.length).to.equal(1);
      chai.expect(gms.MeasureList[0].length).to.equal(1);
      chai.expect(gms.MeasureList[0][0].staffEntries.length).to.equal(0);
      done();
   });

   // Non-regression test for grace note fingering positioning
   // Before fix: baseFingeringXOffset was calculated across all notes in the staff entry,
   // causing grace notes to have incorrect offsets based on collision with other grace notes
   // at different horizontal positions. The fix calculates offsets per voice entry for grace notes.
   it("Grace notes should have baseFingeringXOffset calculated per voice entry", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_grace_note_fingerings_position.musicxml");
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(
         (_: {}) => {
            osmd.render();

            // Get the first measure and staff entry
            const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);
            const staffEntry: GraphicalStaffEntry = gm.staffEntries[0];

            // Get grace voice entries (each containing a single grace note)
            const graceVoiceEntries: GraphicalVoiceEntry[] = staffEntry.graphicalVoiceEntries.filter(
               (gve: VexFlowVoiceEntry) => gve.parentVoiceEntry?.IsGrace
            );
            chai.expect(graceVoiceEntries.length).to.equal(2);

            // Each grace note is alone in its voice entry, so baseFingeringXOffset should be 0.
            // Before the fix, the second grace note had offset=1 due to collision detection
            // with the first grace note (which is at a different horizontal position).
            for (const gve of graceVoiceEntries) {
               for (const note of gve.notes) {
                  chai.expect(note.baseFingeringXOffset).to.equal(0,
                     "Single grace notes should have baseFingeringXOffset=0");
               }
            }

            done();
         },
         done
      );
   });

   // Non-regression test for octave shift spanning 3+ systems.
   // Before fix: the condition `i < systemsInBetweenCount - 1` compared a system ID against
   // a count, causing graphicalEndAtMeasureEnd to never be set on intermediate systems when
   // the octave shift started on system ID >= 1. The dashed line would stop at the last note
   // instead of extending to the end of the measure.
   it("Octave shift on intermediate system should have graphicalEndAtMeasureEnd set", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_octaveshift_multiline_grace_notes.musicxml");
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, {
         autoResize: false,
         newSystemFromXML: true,
      });

      osmd.load(score).then(
         (_: {}) => {
            osmd.render();

            const musicPage: GraphicalMusicPage = osmd.GraphicSheet.MusicPages[0];
            // System 0: no octave shift (measure 1)
            // System 1: 8va starts (measure 2)
            // System 2: intermediate (measure 3 with grace notes) - this is where the bug was
            // System 3: 8va ends (measures 4-5)
            chai.expect(musicPage.MusicSystems.length).to.be.greaterThanOrEqual(4,
               "Score should have at least 4 systems for this test to be valid");

            // The intermediate system (index 2) should have an octave shift
            const intermediateSystem: MusicSystem = musicPage.MusicSystems[2];
            const staffLine: StaffLine = intermediateSystem.StaffLines[0];
            const octaveShifts: GraphicalOctaveShift[] = staffLine.OctaveShifts;

            chai.expect(octaveShifts.length).to.equal(1,
               "Intermediate system should have exactly one octave shift");

            const shift: GraphicalOctaveShift = octaveShifts[0];
            chai.expect(shift.endsOnDifferentStaffLine).to.be.true;
            chai.expect(shift.graphicalEndAtMeasureEnd).to.be.true;
            chai.expect(shift.endMeasure).to.not.be.undefined;

            done();
         },
         done
      );
   });

});
