import { expect } from "chai";
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
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { GraphicalLabel } from "../../../../src/MusicalScore/Graphical/GraphicalLabel";
import { OctaveEnum } from "../../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { Tuplet } from "../../../../src/MusicalScore/VoiceData/Tuplet";
import { Note } from "../../../../src/MusicalScore/VoiceData/Note";
import { TabNote } from "../../../../src/MusicalScore/VoiceData/TabNote";
import { PointF2D } from "../../../../src/Common/DataObjects/PointF2D";
import { GraphicalTie } from "../../../../src/MusicalScore/Graphical/GraphicalTie";
import { AccidentalEnum, NoteEnum, Pitch } from "../../../../src/Common/DataObjects/Pitch";
import { GraphicalNote } from "../../../../src/MusicalScore/Graphical/GraphicalNote";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import Vex from "vexflow";
import VF = Vex.Flow;

describe("VexFlow Measure", () => {

   it("Can create GraphicalMusicSheet", (done: Mocha.Done) => {
      const path: string = "MuzioClementi_SonatinaOpus36No1_Part1.xml";
      const score: Document = TestUtils.getScore(path);
      expect(score).to.not.be.undefined;
      const partwise: Element = TestUtils.getPartWiseElement(score);
      expect(partwise).to.not.be.undefined;
      const reader: MusicSheetReader = new MusicSheetReader();
      const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
      const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
      const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
      // console.log(gms);
      expect(gms).to.not.be.undefined; // at least necessary for linter so that variable is not unused
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
      expect(gms.MeasureList.length).to.equal(1);
      expect(gms.MeasureList[0].length).to.equal(1);
      expect(gms.MeasureList[0][0].staffEntries.length).to.equal(0);
      done();
   });

   it("Renders a tie between enharmonic spellings", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_tie_enharmonic_spelling_1694.musicxml");
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(() => {
         osmd.render();
         const graphicalTies: GraphicalTie[] = osmd.GraphicSheet.MeasureList
            .flatMap((measureList: GraphicalMeasure[]): GraphicalMeasure[] => measureList)
            .flatMap((measure: GraphicalMeasure): GraphicalStaffEntry[] => measure.staffEntries)
            .flatMap((staffEntry: GraphicalStaffEntry): GraphicalTie[] => staffEntry.GraphicalTies);

         expect(graphicalTies.length).to.equal(1);
         const tieStartNote: VexFlowGraphicalNote = graphicalTies[0].StartNote as VexFlowGraphicalNote;
         expect(tieStartNote.getTieSVGs().length, "tie curve is present in the rendered SVG").to.be.greaterThan(0);
         // The tie is enharmonic (F#–Gb), so unlike a same-spelling tie the continued note keeps its
         // own accidental: the second note must still draw its flat, not read as a plain G (#1694).
         const tieEndNote: VexFlowGraphicalNote = graphicalTies[0].EndNote as VexFlowGraphicalNote;
         expect(tieEndNote.DrawnAccidental, "continued enharmonic tie note keeps its accidental")
            .to.equal(AccidentalEnum.FLAT);
         done();
      }).catch(done);
   });

   // Regression guard for #1695: the enharmonic-accidental fix must not make a same-letter tie
   // re-draw its accidental. In this sample (Bb key) a B-natural at the end of m.9 is tied to a
   // B in m.10; the continued note is the same written note held on, so no natural should be
   // drawn on it (it was not drawn before the fix). More generally, no continued tie note here
   // should introduce a natural.
   it("Does not draw a natural on the continued note of a same-letter tie", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("TelemannWV40.102_Sonate-Nr.1.2-Allegro-F-Dur.xml");
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(() => {
         osmd.render();
         const graphicalTies: GraphicalTie[] = osmd.GraphicSheet.MeasureList
            .flatMap((measureList: GraphicalMeasure[]): GraphicalMeasure[] => measureList)
            .flatMap((measure: GraphicalMeasure): GraphicalStaffEntry[] => measure.staffEntries)
            .flatMap((staffEntry: GraphicalStaffEntry): GraphicalTie[] => staffEntry.GraphicalTies);

         expect(graphicalTies.length, "sample contains tied notes").to.be.greaterThan(0);
         const continuedNaturals: GraphicalTie[] = graphicalTies.filter(
            (t: GraphicalTie) => t.EndNote && (t.EndNote as VexFlowGraphicalNote).DrawnAccidental === AccidentalEnum.NATURAL);
         expect(continuedNaturals.length, "no continued tie note re-draws a natural").to.equal(0);
         done();
      }).catch(done);
   });

   /** The VexFlow modifiers of one category on the first note of each measure (samples with one staff). */
   function firstNoteModifiers(osmd: OpenSheetMusicDisplay, category: string): any[][] {
      return osmd.GraphicSheet.MeasureList.map((measures: GraphicalMeasure[]): any[] =>
         ((measures[0].staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote).vfnote[0] as any)
            .getModifiers().filter((modifier: any): boolean => modifier.getCategory() === category));
   }

   it("Renders sharp-sharp as two sharp signs and double-sharp as the double sharp symbol", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_accidental_sharp-sharp_double-sharp.musicxml");
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(() => {
         osmd.render();
         const accidentals: string[][] = firstNoteModifiers(osmd, "accidentals")
            .map((modifiers: any[]): string[] => modifiers.map((accidental: any): string => accidental.type));
         expect(accidentals, "measure 1: double-sharp, measure 2: sharp-sharp").to.deep.equal([["##"], ["#", "#"]]);
         done();
      }).catch(done);
   });

   it("Renders natural-sharp and natural-flat as a natural sign followed by a sharp or flat sign", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_accidental_natural-sharp_natural-flat.musicxml");
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(() => {
         osmd.render();
         // accidentals are drawn left of the notehead: the smaller (more negative) the x shift, the further left
         const accidentalsLeftToRight: string[][] = firstNoteModifiers(osmd, "accidentals")
            .map((modifiers: any[]): string[] => modifiers
               .sort((a: any, b: any): number => a.getXShift() - b.getXShift())
               .map((accidental: any): string => accidental.type));
         expect(accidentalsLeftToRight, "double-sharp, natural-sharp, flat-flat, natural-flat").to.deep.equal(
            [["##"], ["n", "#"], ["bb"], ["n", "b"]]);
         done();
      }).catch(done);
   });

   it("Draws the single-note tremolo of notes with a triple sharp or triple flat", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_tremolo_single_note_triple_accidentals.musicxml");
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(() => {
         osmd.render();
         expect(firstNoteModifiers(osmd, "tremolo").map((tremolos: any[]): number => tremolos.length)).to.deep.equal([1, 1]);
         expect(firstNoteModifiers(osmd, "accidentals").map((modifiers: any[]): string[] =>
            modifiers.map((accidental: any): string => accidental.type))).to.deep.equal([["##", "#"], ["bb", "b"]]);
         done();
      }).catch(done);
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
            expect(graceVoiceEntries.length).to.equal(2);

            // Each grace note is alone in its voice entry, so baseFingeringXOffset should be 0.
            // Before the fix, the second grace note had offset=1 due to collision detection
            // with the first grace note (which is at a different horizontal position).
            for (const gve of graceVoiceEntries) {
               for (const note of gve.notes) {
                  expect(note.baseFingeringXOffset).to.equal(0,
                     "Single grace notes should have baseFingeringXOffset=0");
               }
            }

            done();
         },
         done
      );
   });

   // Non-regression test for octave shift stop placed after grace notes.
   // Before fix: addOctaveShift used previousFraction as end timestamp, but previousFraction
   // is only updated for real notes (not grace notes). When the stop is placed after grace notes,
   // previousFraction still points to the position of the last real note before the grace notes,
   // causing the octave shift to end too early and miss the grace notes entirely.
   // Fix: use currentFraction instead (like addPedalMarking already does).
   it("Octave shift should apply to grace notes before the stop direction", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_octaveshift_stop_after_grace_notes.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(
         (_: {}) => {
            try {
               osmd.render();

               const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);

               // Collect octave shift values for all grace notes in the measure
               const graceOctaveShifts: OctaveEnum[] = [];
               for (const staffEntry of gm.staffEntries) {
                  for (const gve of staffEntry.graphicalVoiceEntries) {
                     if (gve.parentVoiceEntry?.IsGrace) {
                        const note: VexFlowGraphicalNote = gve.notes[0] as VexFlowGraphicalNote;
                        graceOctaveShifts.push(note.octaveShift);
                     }
                  }
               }

               // 6 grace notes total: 4 under 8va, then 2 after the stop
               expect(graceOctaveShifts.length).to.equal(6, "Should have 6 grace notes");

               // First 4 grace notes should have octave shift applied (VA8 = 8va)
               for (let i: number = 0; i < 4; i++) {
                  expect(graceOctaveShifts[i]).to.not.equal(OctaveEnum.NONE,
                     `Grace note ${i} should be under 8va`);
               }

               done();
            } catch (e) {
               done(e);
            }
         },
         done
      );
   });

   it("Draws ornaments with placement=\"below\" below the staff and their note, and other ornaments above", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_ornament_placement_below.musicxml");
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(() => {
         osmd.render();
         const box: (element: Element) => DOMRect = (element: Element): DOMRect => (element as SVGGraphicsElement).getBBox();
         const placements: string[] = [];
         for (const measures of osmd.GraphicSheet.MeasureList) {
            const stave: any = (measures[0] as any).getVFStave(); // getBBox() is in the coordinates of the stave's lines
            for (const staffEntry of measures[0].staffEntries) {
               for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                  if (!voiceEntry.parentVoiceEntry.OrnamentContainer) {
                     continue;
                  }
                  const note: VexFlowGraphicalNote = voiceEntry.notes[0] as VexFlowGraphicalNote;
                  const ornament: DOMRect = box(note.getModifierSVGs()[0]); // the ornament is the note's only modifier
                  const noteBottom: number = Math.max(...[...note.getNoteheadSVGs(), note.getStemSVG()]
                     .map((element: Element): number => box(element).y + box(element).height));
                  if (ornament.y > Math.max(stave.getYForLine(4), noteBottom)) {
                     placements.push("below");
                  } else if (ornament.y + ornament.height < stave.getYForLine(0)) {
                     placements.push("above");
                  } else {
                     placements.push("between");
                  }
               }
            }
         }
         // measure 1: voice 1 turn without placement; voice 2 trill, mordent and turn with an accidental-mark (placement="below").
         //   measure 2: trill with placement="below" and a wavy line, which is always drawn above
         expect(placements).to.deep.equal(["above", "below", "below", "below", "above"]);
         done();
      }).catch(done);
   });

   // Non-regression test for EngravingRules.RenderTimeSignaturesForSamplesWithoutTimeSignature.
   // Pieces without a time signature in the source (e.g. Satie's Gnossiennes) should not render a
   // (synthesized default 4/4) time signature by default, but should when the rule is enabled.
   it("Does not render a time signature for samples without one, unless the rule is enabled", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_time_signature_missing_deliberately_gnossienne.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const xml: string = new XMLSerializer().serializeToString(score);

      function firstMeasureHasTimeSignature(osmd: OpenSheetMusicDisplay): boolean {
         const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);
         const stave: any = (gm as any).stave; // VexFlowMeasure.stave is protected, only need it here in the test
         return stave.getModifiers().some((m: { getCategory(): string }) => m.getCategory() === "timesignatures");
      }

      const osmdDefault: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      const osmdRuleOn: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmdDefault.load(xml).then(() => {
         osmdDefault.render();
         expect(firstMeasureHasTimeSignature(osmdDefault), "default: no time signature for a piece without one").to.equal(false);

         return osmdRuleOn.load(xml);
      }).then(() => {
         osmdRuleOn.EngravingRules.RenderTimeSignaturesForSamplesWithoutTimeSignature = true;
         osmdRuleOn.render();
         expect(firstMeasureHasTimeSignature(osmdRuleOn), "rule enabled: time signature is rendered").to.equal(true);
         done();
      }).catch(done);
   });

   it("Draws a double barline before a key change that only a later part has", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_key_change_later_part_double_barline.musicxml");
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(() => {
         osmd.render();
         for (const measure of osmd.GraphicSheet.MeasureList[0] as VexFlowMeasure[]) {
            const barline: any = measure.getVFStave().getModifiers(VF.StaveModifier.Position.END, "barlines")[0];
            expect(barline.getType(), `barline at the end of measure 1 on staff ${measure.ParentStaff.idInMusicSheet + 1}`)
               .to.equal(VF.Barline.type.DOUBLE);
         }
         done();
      }).catch(done);
   });

   it("Keeps the file's barline style before a key change if we can draw it, and draws a double barline otherwise", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_key_change_keeps_given_barline_style.musicxml");
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(() => {
         osmd.render();
         const endBarlineTypes: number[] = osmd.GraphicSheet.MeasureList.slice(0, 5).map((measures: GraphicalMeasure[]): number =>
            ((measures[0] as VexFlowMeasure).getVFStave().getModifiers(VF.StaveModifier.Position.END, "barlines")[0] as any).getType());
         expect(endBarlineTypes, "measures 1-5 end with no barline, a regular one, light-heavy, dashed (can't be drawn) and none in the file")
            .to.deep.equal([VF.Barline.type.DOUBLE, VF.Barline.type.DOUBLE, VF.Barline.type.END, VF.Barline.type.DOUBLE, VF.Barline.type.NONE]);
         done();
      }).catch(done);
   });

   // Non-regression test for a beamed note whose notehead is hidden because it's shared with a unison note in
   // another voice (print-object="no"). Its stem must still join the beam (not become an orphan flagged note with
   // a transparent stem, which made the beam look like it was hanging in the air).
   // E.g. Beethoven Moonlight Sonata 1st mvt. m.37: an eighth note shares a notehead with a dotted quarter.
   it("Renders the stem of a beamed note sharing a hidden unison notehead, joined to the beam", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_unison_notehead_moonlight_sonata_measure37.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(() => {
         osmd.render();
         // find the single invisible (print-object="no") note - the eighth note that shares the unison notehead
         let invisibleVfNote: any;
         for (let staffIdx: number = 0; staffIdx < 2; staffIdx++) {
            const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, staffIdx);
            for (const se of gm.staffEntries) {
               for (const gve of se.graphicalVoiceEntries) {
                  for (const note of gve.notes) {
                     if (!note.sourceNote.isRest() && !note.sourceNote.PrintObject) {
                        invisibleVfNote = (gve as VexFlowVoiceEntry).vfStaveNote;
                     }
                  }
               }
            }
         }
         expect(invisibleVfNote, "should find the invisible unison note").to.not.be.undefined;
         // it must be part of the beam (not an orphan flagged eighth note) ...
         expect(invisibleVfNote.beam, "invisible unison note should be beamed").to.be.ok;
         // ... and its stem must be visible (not transparent), so the beam doesn't hang in the air
         const stemStyle: { fillStyle?: string } = invisibleVfNote.getStem()?.getStyle();
         if (stemStyle?.fillStyle) {
            expect(stemStyle.fillStyle, "unison note stem must not be transparent").to.not.equal("#00000000");
         }
         done();
      }).catch(done);
   });

   // Non-regression test for the same hidden unison note, in the case where Vexflow can't merge the two noteheads
   // into one column: the hidden eighth's head can't be merged with the half note's, so Vexflow lays it out beside
   // it, where it has to be drawn - a transparent head left the beam ending on a bare stem with nothing under it.
   // Its tuplet has to count it too, otherwise the VF.Tuplet is built from the remaining notes and the number is
   // centered over those. E.g. Debussy Arabesque no. 1 m.3, also Clair de lune and Liszt's Liebestraum no. 3.
   it("Draws the notehead of a hidden unison note laid out beside the shared one, and counts it in its tuplet", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_unison_notehead_tuplet_arabesque_measure3.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmd.load(score).then(() => {
         osmd.render();
         const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);
         // find the single invisible (print-object="no") note: the triplet's first eighth, in unison with the half note
         let hiddenNoteheadStyle: { fillStyle?: string };
         let hiddenVfStaveNote: any;
         for (const se of gm.staffEntries) {
            for (const gve of se.graphicalVoiceEntries) {
               for (let i: number = 0; i < gve.notes.length; i++) {
                  if (!gve.notes[i].sourceNote.PrintObject) {
                     hiddenVfStaveNote = (gve as VexFlowVoiceEntry).vfStaveNote;
                     hiddenNoteheadStyle = hiddenVfStaveNote.note_heads[i].getStyle();
                  }
               }
            }
         }
         expect(hiddenVfStaveNote, "should find the invisible unison note").to.not.be.undefined;
         // its notehead has a column of its own (the half note's head can't stand in for it), so it has to be drawn
         expect(hiddenNoteheadStyle?.fillStyle, "unison notehead must not be transparent").to.not.equal("#00000000");
         // and it is one of the triplet's three notes, so that the 3 is centered over all of them
         const vftuplets: { [voiceID: number]: any[] } = (gm as any).vftuplets; // private, only needed here in the test
         const allVfTuplets: any[] = Object.keys(vftuplets).reduce((all: any[], voiceID: string) => all.concat(vftuplets[voiceID]), []);
         expect(allVfTuplets.length, "should find the triplet").to.equal(1);
         expect(allVfTuplets[0].notes, "the triplet has to contain all three of its notes").to.have.lengthOf(3);
         expect(allVfTuplets[0].notes, "the triplet has to contain the hidden note").to.include(hiddenVfStaveNote);
         done();
      }).catch(done);
   });

   // A hidden unison note drawn for its visible partner (see the two tests above) takes that partner's notehead
   // color. Where Vexflow merges the two heads into one column, its head is inked exactly over the visible one
   // (after it, if its voice comes later) and must not overprint a color set on that note - e.g. by an app
   // highlighting the notes under the cursor, which never sees the hidden note. Where the head is laid out
   // beside the visible one, it's colored like the head it stands in for.
   it("Colors the drawn notehead of a hidden unison note like the visible note whose head it shares", async () => {
      // the Arabesque bar of the test above with the visible voice-1 note colored red: once as an eighth note, whose
      // head Vexflow merges with the hidden eighth's (same shape), once as the original half note, whose head can't
      // merge with it, so the hidden head is laid out beside it
      const tripletTail: string = `
         <note><pitch><step>A</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice><type>eighth</type>
            <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
            <stem>up</stem><beam number="1">continue</beam></note>
         <note><pitch><step>C</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration><voice>2</voice><type>eighth</type>
            <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
            <stem>up</stem><beam number="1">end</beam><notations><tuplet type="stop"/></notations></note>`;
      const hiddenTripletEighth: string = `
         <note print-object="no"><pitch><step>F</step><alter>1</alter><octave>3</octave></pitch><duration>4</duration><voice>2</voice>
            <type>eighth</type><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
            <stem>up</stem><beam number="1">begin</beam><notations><tuplet type="start" bracket="no"/></notations></note>`;
      const redHalf: string = `
         <note color="#FF0000"><pitch><step>F</step><alter>1</alter><octave>3</octave></pitch><duration>12</duration><voice>1</voice>
            <type>half</type><stem>down</stem></note>`;
      const redEighth: string = `
         <note color="#FF0000"><pitch><step>F</step><alter>1</alter><octave>3</octave></pitch><duration>3</duration><voice>1</voice>
            <type>eighth</type><stem>down</stem></note>
         <note><rest/><duration>3</duration><voice>1</voice><type>eighth</type></note>
         <note><rest/><duration>6</duration><voice>1</voice><type>quarter</type></note>`;
      const bar: (voice1: string) => string = (voice1: string) => `<?xml version="1.0" encoding="UTF-8"?>
         <score-partwise version="3.0"><part-list><score-part id="P1"><part-name/></score-part></part-list>
         <part id="P1"><measure number="1">
            <attributes><divisions>6</divisions><key><fifths>4</fifths></key><time><beats>2</beats><beat-type>4</beat-type></time>
               <clef><sign>F</sign><line>4</line></clef></attributes>
            ${voice1}<backup><duration>12</duration></backup>${hiddenTripletEighth}${tripletTail}
         </measure></part></score-partwise>`;

      for (const [variant, voice1, headsMerged] of [["merged", redEighth, true], ["displaced", redHalf, false]] as [string, string, boolean][]) {
         const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
         await osmd.load(bar(voice1));
         osmd.render();
         const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);
         let hiddenHead: any;
         let visibleHead: any;
         for (const se of gm.staffEntries) {
            for (const gve of se.graphicalVoiceEntries) {
               for (let i: number = 0; i < gve.notes.length; i++) {
                  const note: GraphicalNote = gve.notes[i];
                  if (note.sourceNote.isRest() || note.sourceNote.Pitch.FundamentalNote !== NoteEnum.F) {
                     continue;
                  }
                  const head: any = ((gve as VexFlowVoiceEntry).vfStaveNote as any).note_heads[i];
                  if (note.sourceNote.PrintObject) {
                     visibleHead = head;
                  } else {
                     hiddenHead = head;
                  }
               }
            }
         }
         expect(hiddenHead, `${variant}: should find the hidden unison note`).to.not.be.undefined;
         expect(visibleHead, `${variant}: should find the visible unison note`).to.not.be.undefined;
         // premise: the two heads share a column for same-shaped heads, and don't for an eighth under a half note
         expect(hiddenHead.getAbsoluteX() === visibleHead.getAbsoluteX(), `${variant}: heads share one column`).to.equal(headsMerged);
         expect(visibleHead.getStyle()?.fillStyle, `${variant}: visible notehead keeps its XML color`).to.equal("#FF0000");
         expect(hiddenHead.getStyle()?.fillStyle, `${variant}: hidden unison notehead is colored like the visible one`).to.equal("#FF0000");
      }
   });

   // Non-regression test for a tie starting at a notehead two voices share: MuseScore writes the unison by hiding
   // one of the two notes with print-object="no". The tie's start note was looked up by pitch and timestamp only,
   // found the hidden note of the other voice first, and handleTie() then skipped the tie since it doesn't draw a tie
   // to a hidden note. E.g. Bach BWV 847 m.35: the held C2's first tie was missing, its second one was drawn.
   it("Draws a tie that starts at a notehead shared with a hidden unison note of another voice", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_tie_hidden_unison_bwv847_measure35.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmd.load(score).then(() => {
         osmd.render();
         expect(drawnTieStarts(osmd)).to.deep.equal([
            "1:B2@0.125", "1:B2@0.25", // the moving voice's B2, eighth to quarter to half
            "2:C2@0.0625", "2:C2@0.25", // the held C2, from the shared notehead: dotted eighth to quarter to half
         ]);
         done();
      }).catch(done);
   });

   /** "voice:pitch@timestamp" of the start note of each tie drawn in the first measure (OSMD octaves are MusicXML's minus 3) */
   function drawnTieStarts(osmd: OpenSheetMusicDisplay): string[] {
      const tieStarts: string[] = [];
      for (const se of osmd.GraphicSheet.findGraphicalMeasure(0, 0).staffEntries) {
         for (const graphicalTie of se.GraphicalTies) {
            const note: Note = graphicalTie.StartNote.sourceNote;
            const pitch: string = Pitch.getNoteEnumString(note.Pitch.FundamentalNote) + (note.Pitch.Octave + 3);
            tieStarts.push(`${note.ParentVoiceEntry.ParentVoice.VoiceId}:${pitch}@${note.getAbsoluteTimestamp().RealValue}`);
         }
      }
      return tieStarts.sort();
   }

   // The same measure with the other one of the two unison notes hidden, the held C2's dotted eighth that carries the tie:
   // MuseScore shows the same picture whichever of the two it hides. The tie is drawn from the visible note whose
   // notehead the hidden note shares. (Looking the tie note up by its own GraphicalNote alone would skip this tie,
   // and the pitch lookup before that only drew it because the visible note happened to be in the first voice.)
   it("Draws the tie of a hidden unison note from the visible note whose notehead it shares", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_tie_hidden_unison_bwv847_measure35.musicxml").cloneNode(true) as Document;
      score.querySelector("note[print-object]").removeAttribute("print-object"); // voice 1's 16th C2 is the visible one now
      score.querySelector("dot").parentElement.setAttribute("print-object", "no"); // voice 2's dotted eighth C2, tied
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmd.load(score).then(() => {
         osmd.render();
         expect(drawnTieStarts(osmd)).to.deep.equal([
            "1:B2@0.125", "1:B2@0.25",
            "1:C2@0.0625", "2:C2@0.25", // the held C2's first tie starts at voice 1's C2, the notehead it shares
         ]);
         done();
      }).catch(done);
   });

   // A hidden voice doubling visible tied notes in unison (e.g. a voice for playback only): its tie isn't drawn a second
   // time at the visible notes, which have their own tie. (The pitch lookup drew it, one tie above and one below.)
   it("Draws the tie of notes doubled in unison by a hidden voice only once", (done: Mocha.Done) => {
      const tiedHalfNotes: (voice: number, printObject: string) => string = (voice: number, printObject: string) =>
         ["start", "stop"].map((tieType: string) =>
            `<note${printObject}><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><tie type="${tieType}"/>` +
            `<voice>${voice}</voice><type>half</type><notations><tied type="${tieType}"/></notations></note>`).join("");
      const score: string = "<?xml version='1.0' encoding='UTF-8'?><score-partwise version='3.0'>" +
         "<part-list><score-part id='P1'><part-name/></score-part></part-list><part id='P1'><measure number='1'>" +
         "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>" +
         "<clef><sign>G</sign><line>2</line></clef></attributes>" +
         tiedHalfNotes(1, "") + "<backup><duration>4</duration></backup>" + tiedHalfNotes(2, " print-object='no'") +
         "</measure></part></score-partwise>";
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmd.load(score).then(() => {
         osmd.render();
         expect(drawnTieStarts(osmd)).to.deep.equal(["1:A4@0"]);
         done();
      }).catch(done);
   });

   // Non-regression test for EngravingRules.RenderMeasureNumbersForImplicitMeasures.
   // Measures marked implicit="yes" in the MusicXML (e.g. measures without a meter like in Satie's Gnossiennes)
   // don't show a measure number by default, as per the MusicXML standard, but do when the rule is enabled.
   it("Does not render a measure number for implicit measures, unless the rule is enabled", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_time_signature_missing_deliberately_gnossienne.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const xml: string = new XMLSerializer().serializeToString(score);

      function measureNumberLabels(osmd: OpenSheetMusicDisplay): string[] {
         const labels: string[] = [];
         for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
               for (const label of system.MeasureNumberLabels) {
                  labels.push(label.Label.text);
               }
            }
         }
         return labels;
      }

      const osmdDefault: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      const osmdRuleOn: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmdDefault.load(xml).then(() => {
         osmdDefault.render();
         // the single measure is implicit="yes", so its number ("0") is not rendered
         expect(measureNumberLabels(osmdDefault), "default: no measure number for an implicit measure").to.not.include("0");

         return osmdRuleOn.load(xml);
      }).then(() => {
         osmdRuleOn.EngravingRules.RenderMeasureNumbersForImplicitMeasures = true;
         osmdRuleOn.render();
         expect(measureNumberLabels(osmdRuleOn), "rule enabled: implicit measure number is rendered").to.include("0");
         done();
      }).catch(done);
   });

   // Non-regression test for the stacking order of fingerings collected from multiple voices.
   // Before fix: fingerings were stacked in voice order, so the second voice's fingering ended up
   // at the outer end of the stack even when its note was the lowest of the beat (e.g. Beethoven
   // Pathetique 2nd mvt m24: a two-note chord in voice 1 over the beat's lowest note in voice 2).
   // Fix: fingerings are sorted by their note's pitch so the stack mirrors the chord.
   it("Stacks fingerings from multiple voices in the pitch order of their notes", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_fingering_two_voices_pitch_order.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(() => {
         osmd.render();

         function fingeringTextsTopToBottom(staffIndex: number, entryIndex: number): string[] {
            const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, staffIndex);
            const labels: GraphicalLabel[] = gm.staffEntries[entryIndex].FingeringEntries;
            return labels
               .slice()
               .sort((a: GraphicalLabel, b: GraphicalLabel) => a.PositionAndShape.RelativePosition.y - b.PositionAndShape.RelativePosition.y)
               .map((label: GraphicalLabel) => label.Label.text);
         }

         // treble staff (Above placement): lowest note's fingering closest to the staff, i.e. at the bottom of the stack
         expect(fingeringTextsTopToBottom(0, 0), "treble staff, beat 1").to.deep.equal(["5", "3", "1"]);
         expect(fingeringTextsTopToBottom(0, 1), "treble staff, beat 3").to.deep.equal(["4", "2", "1"]);
         // bass staff (Below placement): highest note's fingering closest to the staff, i.e. at the top of the stack
         expect(fingeringTextsTopToBottom(1, 0), "bass staff, beat 1").to.deep.equal(["1", "3", "5"]);
         expect(fingeringTextsTopToBottom(1, 1), "bass staff, beat 3").to.deep.equal(["2", "4", "5"]);
         done();
      }).catch(done);
   });

   // A fingering label is stacked in the pitch order of its note, which is not the order the
   // fingerings were read in, so the label's index in FingeringEntries says nothing about which
   // note it belongs to. GraphicalLabel.sourceNote carries that link, letting a consumer find the
   // note a rendered fingering was created for (e.g. to edit or re-position a single label).
   it("Links each fingering label to the note it was created for (GraphicalLabel.sourceNote)", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_fingering_two_voices_pitch_order.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(() => {
         osmd.render();

         function fingeringsByNote(staffIndex: number, entryIndex: number): string[] {
            const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, staffIndex);
            return gm.staffEntries[entryIndex].FingeringEntries
               .map((label: GraphicalLabel) =>
                  `${label.sourceNote.Pitch.ToStringShort(Pitch.OctaveXmlDifference)}=${label.Label.text}`);
         }

         // treble staff: chord G4/C5 in voice 1 (fingerings 3 and 5), lowest note in voice 2 (fingering 1),
         //   stacked E4, G4, C5 from the staff outwards
         expect(fingeringsByNote(0, 0), "treble staff, beat 1").to.deep.equal(["E4=1", "G4=3", "C5=5"]);
         expect(fingeringsByNote(0, 1), "treble staff, beat 3").to.deep.equal(["D4=1", "F4=2", "A4=4"]);
         // bass staff (Below placement): the same stack, highest note first
         expect(fingeringsByNote(1, 0), "bass staff, beat 1").to.deep.equal(["G3=1", "E3=3", "C3=5"]);
         expect(fingeringsByNote(1, 1), "bass staff, beat 3").to.deep.equal(["A3=2", "F3=4", "C3=5"]);
         done();
      }).catch(done);
   });

   // Non-regression test for nested tuplets (issue #1583). The measure has an outer 3:2 tuplet spanning all 5 notes
   // and an inner 9:4 tuplet over the last 3 (beamed) eighth notes that displays "3" (its <tuplet-actual> number).
   // Before the fix the outer tuplet only covered its first two notes and the inner showed "9".
   it("Parses nested tuplets: outer tuplet spans all notes, inner uses its tuplet-actual number", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_tuplet_nested_issue_1583.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(() => {
         osmd.render();
         // collect the distinct tuplets the notes belong to
         const tuplets: Set<Tuplet> = new Set<Tuplet>();
         for (const voiceEntry of osmd.Sheet.Instruments[0].Voices[0].VoiceEntries) {
            for (const note of voiceEntry.Notes) {
               for (const tuplet of note.NoteTuplets) {
                  tuplets.add(tuplet);
               }
            }
         }
         const noteCount: (t: Tuplet) => number = (t: Tuplet) => t.Notes.reduce((sum: number, sub: Note[]) => sum + sub.length, 0);
         const tupletList: Tuplet[] = Array.from(tuplets);
         expect(tupletList.length, "there should be two (nested) tuplets").to.equal(2);

         const outer: Tuplet = tupletList.find((t: Tuplet) => noteCount(t) === 5);
         const inner: Tuplet = tupletList.find((t: Tuplet) => noteCount(t) === 3);
         // the outer tuplet has to include all 5 notes so its bracket spans the whole group
         expect(outer, "outer tuplet should span all 5 notes").to.not.be.undefined;
         expect(inner, "inner tuplet should span 3 notes").to.not.be.undefined;
         expect(outer.TupletLabelNumber, "outer tuplet number").to.equal(3);
         // the inner number comes from <tuplet-actual><tuplet-number>3, not the time-modification actual-notes (9)
         expect(inner.TupletLabelNumber, "inner tuplet number from tuplet-actual").to.equal(3);
         done();
      }).catch(done);
   });

   // Non-regression test for EngravingRules.SlurFlattenToObstacle (issue #1466). Long/steep slurs otherwise arc far
   // above the notes they span; the apex is capped to a small margin above the highest spanned object. This checks
   // that the highest slur arc is meaningfully lower with the flattening on than off.
   it("Flattens a bloated slur's arc height when SlurFlattenToObstacle is enabled", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_grace_note_fingerings_and_strings_Ysaye_excerpt.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const xml: string = new XMLSerializer().serializeToString(score);

      function maxSlurArcHeight(osmd: OpenSheetMusicDisplay): number {
         let maxArc: number = 0;
         for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
               for (const staffLine of system.StaffLines) {
                  for (const gSlur of staffLine.GraphicalSlurs) {
                     const s: PointF2D = gSlur.bezierStartPt; const c1: PointF2D = gSlur.bezierStartControlPt;
                     const c2: PointF2D = gSlur.bezierEndControlPt; const e: PointF2D = gSlur.bezierEndPt;
                     if (!s || !e || !c1 || !c2 || e.x === s.x) {
                        continue;
                     }
                     // sample the bezier and track its largest distance from the straight start-end chord (the arc height)
                     for (let t: number = 0.1; t <= 0.9; t += 0.1) {
                        const mt: number = 1 - t;
                        const x: number = mt*mt*mt*s.x + 3*mt*mt*t*c1.x + 3*mt*t*t*c2.x + t*t*t*e.x;
                        const y: number = mt*mt*mt*s.y + 3*mt*mt*t*c1.y + 3*mt*t*t*c2.y + t*t*t*e.y;
                        const chordY: number = s.y + (x - s.x) / (e.x - s.x) * (e.y - s.y);
                        maxArc = Math.max(maxArc, Math.abs(y - chordY));
                     }
                  }
               }
            }
         }
         return maxArc;
      }

      const osmdOff: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      const osmdOn: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmdOff.load(xml).then(() => {
         osmdOff.EngravingRules.SlurFlattenToObstacle = false;
         osmdOff.render();
         const arcWithout: number = maxSlurArcHeight(osmdOff);

         return osmdOn.load(xml).then(() => {
            osmdOn.render(); // SlurFlattenToObstacle is true by default
            const arcWith: number = maxSlurArcHeight(osmdOn);
            expect(arcWith, `flattened arc (${arcWith.toFixed(1)}) should be well below unflattened (${arcWithout.toFixed(1)})`)
               .to.be.lessThan(arcWithout * 0.9);
            done();
         });
      }).catch(done);
   });

   // Non-regression test for the WIDTH-DRIVEN case of SlurFlattenToObstacle (issue #1466): a wide slur over a
   // (near-)flat passage must not balloon. The minimum-arc floor grows with sqrt(width) rather than linearly, so
   // wide slurs stay proportionally flat. Chopin Étude Op. 10 No. 4 has several system-spanning slurs that would
   // otherwise arc very high; this checks the widest slur on the sheet is flattened substantially.
   it("Keeps a wide slur over a flat passage from ballooning (SlurFlattenToObstacle, width-driven)", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_dynamics_attribute_Chopin_Etudes_op_10_4_Duepree02.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const xml: string = new XMLSerializer().serializeToString(score);

      // arc height (max distance from the straight start-end chord) of the WIDEST slur on the sheet
      function widestSlurArcHeight(osmd: OpenSheetMusicDisplay): number {
         let widestWidth: number = 0;
         let arcOfWidest: number = 0;
         for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
               for (const staffLine of system.StaffLines) {
                  for (const gSlur of staffLine.GraphicalSlurs) {
                     const s: PointF2D = gSlur.bezierStartPt; const c1: PointF2D = gSlur.bezierStartControlPt;
                     const c2: PointF2D = gSlur.bezierEndControlPt; const e: PointF2D = gSlur.bezierEndPt;
                     if (!s || !e || !c1 || !c2 || e.x === s.x) {
                        continue;
                     }
                     const width: number = Math.abs(e.x - s.x);
                     if (width <= widestWidth) {
                        continue;
                     }
                     let arc: number = 0;
                     for (let t: number = 0.1; t <= 0.9; t += 0.1) {
                        const mt: number = 1 - t;
                        const x: number = mt*mt*mt*s.x + 3*mt*mt*t*c1.x + 3*mt*t*t*c2.x + t*t*t*e.x;
                        const y: number = mt*mt*mt*s.y + 3*mt*mt*t*c1.y + 3*mt*t*t*c2.y + t*t*t*e.y;
                        const chordY: number = s.y + (x - s.x) / (e.x - s.x) * (e.y - s.y);
                        arc = Math.max(arc, Math.abs(y - chordY));
                     }
                     widestWidth = width;
                     arcOfWidest = arc;
                  }
               }
            }
         }
         return arcOfWidest;
      }

      const osmdOff: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      const osmdOn: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmdOff.load(xml).then(() => {
         osmdOff.EngravingRules.SlurFlattenToObstacle = false;
         osmdOff.render();
         const arcWithout: number = widestSlurArcHeight(osmdOff);

         return osmdOn.load(xml).then(() => {
            osmdOn.render(); // SlurFlattenToObstacle is true by default
            const arcWith: number = widestSlurArcHeight(osmdOn);
            // the widest slur spans a (near-)flat passage, so flattening should cut its arc substantially (to roughly two thirds).
            // Browsers lay the score out slightly differently (text metrics), so the threshold leaves headroom:
            // 0.65 failed on Chrome, where the ratio is ~0.67 (Windows and macOS), while Firefox (CI) gets down to ~0.5.
            expect(arcWith, `widest slur's flattened arc (${arcWith.toFixed(1)}) should be far below unflattened (${arcWithout.toFixed(1)})`)
               .to.be.lessThan(arcWithout * 0.75);
            done();
         });
      }).catch(done);
   });

   // Regression test for NaN slur curves: measure 23 of the Moonlight sonata sample has a note carrying both a
   // slur start and an orphan slur stop with the same number (Sibelius export quirk). The stop used to close the
   // start on its very own note, creating a zero-length slur whose curve calculation divided 0 by 0, ending up
   // as an invalid SVG path (<path d="... CNaN NaN ...">). Now the stop is ignored and no self-slur is created.
   it("Creates no zero-length (NaN-curve) slur for a note with both a slur start and an orphan stop", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_slurs_long_steep_arc_moonlight_sonata_issue1466.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const xml: string = new XMLSerializer().serializeToString(score);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      osmd.load(xml).then(() => {
         osmd.render();
         let slursChecked: number = 0;
         for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
               for (const staffLine of system.StaffLines) {
                  for (const gSlur of staffLine.GraphicalSlurs) {
                     const measureNumber: number = gSlur.staffEntries[0]?.parentMeasure?.MeasureNumber;
                     expect(gSlur.slur.StartNote, `slur in measure ${measureNumber} should not start and end on the same note`)
                        .to.not.equal(gSlur.slur.EndNote);
                     for (const p of [gSlur.bezierStartPt, gSlur.bezierStartControlPt, gSlur.bezierEndControlPt, gSlur.bezierEndPt]) {
                        if (!p) { // cross-staff slurs can remain uncalculated (skipped at draw time)
                           continue;
                        }
                        expect(Number.isFinite(p.x) && Number.isFinite(p.y),
                           `slur bezier points in measure ${measureNumber} should be finite (got ${p.x}, ${p.y})`).to.equal(true);
                     }
                     slursChecked++;
                  }
               }
            }
         }
         expect(slursChecked, "sanity check: the sample's slurs were iterated").to.be.greaterThan(50);
         done();
      }).catch(done);
   });

   // Non-regression test for correctNotePositions() on a part carrying BOTH a standard staff and a
   // tablature staff (<staves>2</staves>), covering both branches of the measure-scoped rewrite
   // (PR #1703 for the standard branch, plus the tab-branch follow-up). The tab staff's voice entries
   // must be positioned by their string number, and the standard staff's notes must still receive their
   // vertical bounding-box correction. The score has 3 measures, so correct output here also confirms the
   // positioning is measure-local: it does not depend on the voice's entries in other measures.
   it("Positions notes on a combined standard + tablature staff (correctNotePositions, both branches)", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_tab_plus_treble_staff_correctNotePositions_pr1703.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);

      osmd.load(score).then(() => {
         osmd.render(); // correctNotePositions() runs at the end of draw(); this must not throw
         const interlineHeight: number = osmd.EngravingRules.TabStaffInterlineHeightForBboxes;

         const measureCount: number = osmd.GraphicSheet.MeasureList.length;
         expect(measureCount, "sample has 3 measures").to.equal(3);

         let tabEntriesChecked: number = 0;
         let standardNotesCorrected: number = 0;
         for (let m: number = 0; m < measureCount; m++) {
            const standardMeasure: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(m, 0);
            const tabMeasure: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(m, 1);
            expect(standardMeasure.isTabMeasure, `measure ${m}, staff 0 is a standard staff`).to.equal(false);
            expect(tabMeasure.isTabMeasure, `measure ${m}, staff 1 is a tablature staff`).to.equal(true);

            // Tab branch: each voice entry sits at (string - 1) * interline height of its (last) string note.
            for (const se of tabMeasure.staffEntries) {
               for (const gve of se.graphicalVoiceEntries) {
                  let stringNumber: number = -1;
                  for (const note of gve.notes) {
                     const noteString: number = (note.sourceNote as TabNote).StringNumberTab;
                     if (noteString >= 0) {
                        stringNumber = noteString; // last string note wins, mirroring correctNotePositions()
                     }
                  }
                  if (stringNumber < 0) {
                     continue; // rest-only entry
                  }
                  expect(gve.PositionAndShape.RelativePosition.y,
                     `tab entry on string ${stringNumber} is offset by (string - 1) * interline height`)
                     .to.be.closeTo((stringNumber - 1) * interlineHeight, 1e-9);
                  tabEntriesChecked++;
               }
            }

            // Standard (non-tab) branch: notes receive a vertical correction, they are not left at y = 0.
            for (const se of standardMeasure.staffEntries) {
               for (const gve of se.graphicalVoiceEntries) {
                  for (const note of gve.notes) {
                     if (!note.sourceNote.isRest() && note.PositionAndShape.RelativePosition.y !== 0) {
                        standardNotesCorrected++;
                     }
                  }
               }
            }
         }

         expect(tabEntriesChecked, "tab voice entries were positioned by string number").to.be.greaterThan(0);
         expect(standardNotesCorrected, "standard-staff notes received a vertical correction").to.be.greaterThan(0);
         done();
      }).catch(done);
   });


   // Non-regression test for grace notes in tablature staves (#1721). A tab measure converted its grace notes to
   // Vexflow TabNotes, but then dropped them: like in classical measures they are no tickables of the Vexflow voice,
   // but unlike there they were never attached to their main note either, so they were not drawn at all. Now each
   // grace note is a Vexflow GraceTabNote (a TabNote with a smaller fret number) inside a GraceNoteGroup modifier
   // of its main note's TabNote, which formats and draws it left of the main note.
   /** The fret numbers drawn in the SVG, from left to right: TabNote.drawPositions() writes each as a <text> inside the
    *  note's <g class="vf-tabnote">. (Document order differs: a grace note is drawn as a modifier after its main note.) */
   function drawnFretNumbers(div: HTMLElement): { text: string, fontSize: string, x: number }[] {
      const fretNumbers: { text: string, fontSize: string, x: number }[] = [];
      div.querySelectorAll("g.vf-tabnote text").forEach((textElement: Element) => {
         fretNumbers.push({
            text: textElement.textContent,
            fontSize: textElement.getAttribute("font-size"),
            x: Number(textElement.getAttribute("x"))
         });
      });
      return fretNumbers.sort((a, b) => a.x - b.x);
   }

   it("Draws a grace note in a tablature staff as a smaller fret number attached to its main note (#1721)", (done: Mocha.Done) => {
      // one 3/4 measure on a guitar TAB staff: a quarter note (string 2, fret 0),
      //   then a slashed eighth grace note (string 1, fret 1) before a half note (string 1, fret 3)
      const score: Document = TestUtils.getScore("test_tab_grace_note_simple.musicxml");
      const div: HTMLElement = TestUtils.getDivElement(document);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
      osmd.load(score).then(() => {
         osmd.render();
         const tabMeasure: GraphicalMeasure = osmd.GraphicSheet.MeasureList[0][0];
         expect(tabMeasure.isTabMeasure, "the only staff is a tablature staff").to.equal(true);
         expect(tabMeasure.staffEntries.length, "two staff entries: the quarter note, and the grace note with its half note").to.equal(2);

         const graceStaffEntry: GraphicalStaffEntry = tabMeasure.staffEntries[1];
         const graceGve: VexFlowVoiceEntry = graceStaffEntry.graphicalVoiceEntries.find(
            (gve: GraphicalVoiceEntry) => gve.parentVoiceEntry.IsGrace) as VexFlowVoiceEntry;
         const mainGve: VexFlowVoiceEntry = graceStaffEntry.graphicalVoiceEntries.find(
            (gve: GraphicalVoiceEntry) => !gve.parentVoiceEntry.IsGrace) as VexFlowVoiceEntry;
         expect(graceGve !== undefined && mainGve !== undefined, "the grace note and the half note share a staff entry").to.equal(true);
         expect((graceGve.notes[0].sourceNote as TabNote).FretNumber, "the grace note is on fret 1").to.equal(1);
         expect(graceGve.parentVoiceEntry.ParentVoice, "the grace note and the half note are in the same voice")
            .to.equal(mainGve.parentVoiceEntry.ParentVoice);

         // the grace note is a Vexflow GraceTabNote (fret number drawn at a smaller scale) ...
         const vfGraceNote: any = graceGve.vfStaveNote;
         expect(vfGraceNote.getCategory(), "the grace note was converted to a GraceTabNote").to.equal("gracetabnotes");
         expect(vfGraceNote.render_options.scale, "a GraceTabNote's fret number is scaled down").to.be.lessThan(1);
         // ... attached to the half note's TabNote in a GraceNoteGroup, which draws it left of the main note
         const graceNoteGroups: any[] = (mainGve.vfStaveNote as any).modifiers.filter(
            (modifier: any) => modifier.getCategory() === "gracenotegroups");
         expect(graceNoteGroups.length, "the main note carries one GraceNoteGroup").to.equal(1);
         expect(graceNoteGroups[0].getGraceNotes(), "which holds the grace note").to.deep.equal([vfGraceNote]);

         // the SVG contains all three fret numbers, the grace note's in a smaller font and left of its main note
         const fretNumbers: { text: string, fontSize: string, x: number }[] = drawnFretNumbers(div);
         expect(fretNumbers.map((fretNumber) => fretNumber.text), "fret numbers drawn: 0, 1 (grace), 3").to.deep.equal(["0", "1", "3"]);
         expect(fretNumbers[0].fontSize, "normal fret number font").to.equal("10pt");
         expect(fretNumbers[1].fontSize, "grace fret number in a smaller font").to.equal("7.5pt");
         expect(fretNumbers[2].fontSize, "normal fret number font").to.equal("10pt");
         expect(fretNumbers[1].x, "the grace fret number is drawn left of the half note's fret number").to.be.lessThan(fretNumbers[2].x);
         expect(fretNumbers[1].x, "and right of the quarter note's fret number").to.be.greaterThan(fretNumbers[0].x);
         done();
      }).catch(done);
   });
});
