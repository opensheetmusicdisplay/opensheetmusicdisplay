import { expect } from "chai";
import { TestUtils } from "../../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalVoiceEntry } from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import Vex from "vexflow";
import VF = Vex.Flow;

describe("VexFlow Measure - Articulations at the stem end", () => {

   // Without a placement in the XML, an articulation went at the note head, as for a single voice: with another voice in
   // the staff, that is where the other voice's note is, e.g. the accent above a stem-down A4 on the head of a stem-up C5.
   // Two parts sharing a staff put their marks at the stem end (Gould, Behind Bars, pp. 117-118).
   it("Puts the articulations of voices sharing a staff at the stem end, unless placed in the XML", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_articulations_two_voices_stem_end.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmd.load(score).then(() => {
         osmd.render();
         /** The note of the voice in the measure's staff entry. */
         function note(measureIndex: number, staffEntryIndex: number, voiceId: number): VexFlowGraphicalNote {
            return osmd.GraphicSheet.findGraphicalMeasure(measureIndex, 0).staffEntries[staffEntryIndex].graphicalVoiceEntries
               .find((gve: GraphicalVoiceEntry) => gve.parentVoiceEntry.ParentVoice.VoiceId === voiceId).notes[0] as VexFlowGraphicalNote;
         }
         /** The top and bottom of the drawn element of the note, in units (y points down). */
         function yRange(gNote: VexFlowGraphicalNote, selector: string): { top: number, bottom: number } {
            const element: SVGGElement = gNote.getSVGGElement().querySelector(selector);
            expect(element, `${selector} of the note in measure ${gNote.sourceNote.SourceMeasure.MeasureNumber}`).to.not.equal(null);
            const box: DOMRect = element.getBBox();
            return { top: box.y / unitInPixels, bottom: (box.y + box.height) / unitInPixels };
         }
         /** The top and bottom of the note's stem, in units (a beam draws the stems of its notes). */
         function stemRange(gNote: VexFlowGraphicalNote): { top: number, bottom: number } {
            const extents: { topY: number, baseY: number } = (gNote.vfnote[0] as VF.StemmableNote).getStemExtents();
            return { top: Math.min(extents.topY, extents.baseY) / unitInPixels, bottom: Math.max(extents.topY, extents.baseY) / unitInPixels };
         }
         function expectMark(gNote: VexFlowGraphicalNote, side: "above" | "below", element: "stem" | ".vf-notehead",
                             message: string): void {
            const mark: { top: number, bottom: number } = yRange(gNote, ".vf-modifiers");
            const reference: { top: number, bottom: number } = element === "stem" ? stemRange(gNote) : yRange(gNote, element);
            if (side === "above") {
               expect(mark.bottom, message).to.be.at.most(reference.top + 0.01);
            } else {
               expect(mark.top, message).to.be.at.least(reference.bottom - 0.01);
            }
         }

         // m1: C5 (voice 1, stem up) over A4 (voice 2, stem down)
         expectMark(note(0, 0, 2), "below", "stem", "m1 beat 1: the accent of the A4 below its stem, not on the C5");
         expectMark(note(0, 1, 1), "above", "stem", "m1 beat 2: the accent of the C5 above its stem, not on the A4");
         expectMark(note(0, 2, 1), "above", "stem", "m1 beat 3: the staccato of the C5 above its stem");
         expectMark(note(0, 2, 2), "below", "stem", "m1 beat 3: the staccato of the A4 below its stem");
         expectMark(note(0, 3, 2), "above", ".vf-notehead", "m1 beat 4: the accent of the A4 placed above in the XML stays above");

         // m2: the middle of three voices, B4 under E5, A4 under C5 (stems down)
         expectMark(note(1, 0, 2), "below", "stem", "m2 beat 1: the accent of the B4 below its stem, not next to the E5");
         expectMark(note(1, 1, 2), "below", "stem", "m2 beat 3: the accent of the A4 below its stem, not on the C5");

         // m3: a single voice keeps its marks at the note head
         expectMark(note(2, 0, 1), "below", ".vf-notehead", "m3: the accent of a single stem-up A4 below its head");
         expectMark(note(2, 1, 1), "above", ".vf-notehead", "m3: the accent of a single stem-down C5 above its head");

         // m4: hidden notes of another voice (e.g. a voice only for playback) leave the mark at the note head
         expectMark(note(3, 0, 1), "above", ".vf-notehead", "m4: the accent of the C5 above its head, the other voice hidden");

         // m5: the other voice's E4 on beat 2 doesn't sound during the accented A4s on beats 1 and 3
         expectMark(note(4, 0, 1), "below", ".vf-notehead", "m5 beat 1: the accent of the A4 below its head, before the E4");
         expectMark(note(4, 2, 1), "below", ".vf-notehead", "m5 beat 3: the accent of the A4 below its head, after the E4");

         // m6: the E4 sounds under the last two of four beamed eighths, and the group keeps one placement
         for (let i: number = 0; i < 4; i++) {
            expectMark(note(5, i, 1), "above", "stem", `m6: the staccato of eighth ${i + 1} above the beam, as for the others`);
         }
         done();
      }).catch(done);
   });
});
