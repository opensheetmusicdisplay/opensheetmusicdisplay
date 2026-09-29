import {expect} from "chai";
import {TestUtils} from "../../Util/TestUtils";
import {OpenSheetMusicDisplay} from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import {VexFlowGraphicalNote} from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import {GraphicalStaffEntry} from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import {AccidentalEnum} from "../../../src/Common/DataObjects/Pitch";

describe("Staff-specific MusicXML keys", (): void => {
  it("renders each staff's signature and its covered pitches through a new system", async (): Promise<void> => {
    const div: HTMLElement = TestUtils.getDivElement(document);
    div.style.width = "800px";
    const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
    try {
      osmd.setOptions({newSystemFromXML: true});
      await osmd.load(TestUtils.getScore("test_staff_specific_keys.musicxml"));
      osmd.render();
      const signatures: SVGGraphicsElement[] = Array.from(div.querySelectorAll<SVGGraphicsElement>(".vf-keysignature"));
      expect(signatures, "the independent opening keys, their new-system carries, and the common keys are rendered")
        .to.have.length(6);
      const notes: VexFlowGraphicalNote[] = osmd.GraphicSheet.MeasureList.flatMap((measures) => measures.flatMap(
        (measure) => measure.staffEntries.flatMap((entry: GraphicalStaffEntry) => entry.graphicalVoiceEntries.flatMap(
          (voiceEntry) => voiceEntry.notes as VexFlowGraphicalNote[],
        )),
      ));
      expect(notes, "all four pitches are rendered").to.have.length(4);
      expect(notes.map((note: VexFlowGraphicalNote): AccidentalEnum => note.DrawnAccidental))
        .to.deep.equal([AccidentalEnum.NONE, AccidentalEnum.NONE, AccidentalEnum.NONE, AccidentalEnum.NONE]);
      const signatureRightEdges: number[] = signatures.map((signature: SVGGraphicsElement): number => {
        const bounds: DOMRect = signature.getBBox();
        return bounds.x + bounds.width;
      });
      const firstSystemNoteX: number = notes[0].vfnote[0].getAbsoluteX();
      const secondSystemNoteX: number = notes[2].vfnote[0].getAbsoluteX();
      expect(signatureRightEdges[0], "the opening upper-staff key precedes its note").to.be.lessThan(firstSystemNoteX);
      expect(signatureRightEdges[2], "the opening lower-staff key precedes its note").to.be.lessThan(firstSystemNoteX);
      expect(signatureRightEdges[1], "the carried upper-staff key stays at the previous system's end")
        .to.be.greaterThan(firstSystemNoteX);
      expect(signatureRightEdges[3], "the carried lower-staff key stays at the previous system's end")
        .to.be.greaterThan(firstSystemNoteX);
      expect(Math.max(...signatureRightEdges.slice(4)), "the common key precedes both second-system notes")
        .to.be.lessThan(secondSystemNoteX);
    } finally {
      osmd.clear();
      div.remove();
    }
  });
});
