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
import { BoundingBox } from "../../../../src/MusicalScore/Graphical/BoundingBox";
import { OctaveEnum } from "../../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { Tuplet } from "../../../../src/MusicalScore/VoiceData/Tuplet";
import { Note } from "../../../../src/MusicalScore/VoiceData/Note";
import { VoiceEntry } from "../../../../src/MusicalScore/VoiceData/VoiceEntry";
import { TabNote } from "../../../../src/MusicalScore/VoiceData/TabNote";
import { PointF2D } from "../../../../src/Common/DataObjects/PointF2D";
import { GraphicalTie } from "../../../../src/MusicalScore/Graphical/GraphicalTie";
import { AccidentalEnum, NoteEnum, Pitch } from "../../../../src/Common/DataObjects/Pitch";
import { GraphicalNote } from "../../../../src/MusicalScore/Graphical/GraphicalNote";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
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

   /** The accidentals of the ornament on the first note of each measure, above and below, each from left to right */
   function drawnOrnamentAccidentals(osmd: OpenSheetMusicDisplay): string[][][] {
      const accidentalTypes: any = (VF as any).accidentalCodes.accidentals;
      const types: (accidental: any) => string[] = (accidental: any): string[] => !accidental ? [] :
         (accidental.glyphs ?? [accidental]).map((glyph: any): string =>
            Object.keys(accidentalTypes).find((type: string): boolean => accidentalTypes[type].code === glyph.code));
      return firstNoteModifiers(osmd, "ornaments").map((ornaments: any[]): string[][] =>
         [types(ornaments[0].accidentalUpper), types(ornaments[0].accidentalLower)]);
   }

   // Turns in G sharp minor whose lower note F double sharp is marked double-sharp (m. 1) and sharp-sharp (m. 2), a turn whose
   //   lower note is F sharp again, marked natural-sharp (m. 3), and a turn whose upper note F double sharp is marked sharp-sharp (m. 4).
   it("Renders sharp-sharp and natural-sharp accidental marks of ornaments as two signs, like note accidentals", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_ornament_accidental_mark_sharp-sharp.musicxml");
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      osmd.load(score).then(() => {
         osmd.render();
         expect(drawnOrnamentAccidentals(osmd), "[above, below] of each measure's turn").to.deep.equal(
            [[[], ["##"]], [[], ["#", "#"]], [[], ["n", "#"]], [["#", "#"], []]]);
         // the two sharps of measure 2 are drawn side by side with a space between them, before the turn itself
         const ornamentPaths: Element[] = Array.from((osmd.GraphicSheet.MeasureList[1][0].staffEntries[0].graphicalVoiceEntries[0]
            .notes[0] as VexFlowGraphicalNote).getModifierSVGs()[0].children);
         const [first, second] = ornamentPaths.map((path: Element): DOMRect => (path as SVGGraphicsElement).getBBox());
         // the accidentalSpacing (3) is scaled by 1/1.3, like the ornament's accidentals themselves
         expect(second.x - (first.x + first.width), "the space between the two sharps").to.be.closeTo(3 / 1.3, 1.5);
         done();
      }).catch(done);
   });

   // One ornament per measure: a trill with a triple-sharp mark, a turn below with a triple-flat mark, a mordent with a
   //   natural-flat mark and an inverted mordent with a slash-flat mark.
   it("Renders triple, natural-flat and slash-flat accidental marks of ornaments instead of failing or leaving them out", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_ornament_accidental_mark_values.musicxml");
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      osmd.load(score).then(() => {
         osmd.render();
         expect(drawnOrnamentAccidentals(osmd), "[above, below] of each measure's ornament").to.deep.equal(
            [[["#", "##"], []], [[], ["b", "bb"]], [[], ["n", "b"]], [["bs"], []]]);
         // the sharp and the double sharp of the triple sharp share one line, like the accidentals of a note
         const ornamentPaths: Element[] = Array.from((osmd.GraphicSheet.MeasureList[0][0].staffEntries[0].graphicalVoiceEntries[0]
            .notes[0] as VexFlowGraphicalNote).getModifierSVGs()[0].children);
         const [sharp, doubleSharp] = ornamentPaths.slice(1).map((path: Element): DOMRect => (path as SVGGraphicsElement).getBBox());
         expect(sharp.y + sharp.height / 2, "the centers of the sharp and the double sharp")
            .to.be.closeTo(doubleSharp.y + doubleSharp.height / 2, 1);
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

   // The same hidden unison note where the two heads have different shapes: a hidden eighth under a half note, which
   // MuseScore writes at the half note's default-x, so that the half note's open head serves both voices. Vexflow
   // staggered the two heads, and the hidden eighth's head was drawn beside the open one. Now it shares the half
   // note's column, stays transparent there, and its stem rises from the open head to the beam.
   // Its tuplet has to count it too, otherwise the VF.Tuplet is built from the remaining notes and the number is
   // centered over those. E.g. Debussy Arabesque no. 1 m.3, also Clair de lune and Liszt's Liebestraum no. 3.
   it("Lets a hidden unison eighth share the head of a half note instead of staggering it, and counts it in its tuplet", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_unison_notehead_tuplet_arabesque_measure3.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmd.load(score).then(() => {
         osmd.render();
         const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);
         // the triplet's first eighth (hidden, print-object="no") and the half note it's in unison with
         const heads: { hidden?: any, visible?: any } = {};
         const vfStaveNotes: { hidden?: any, visible?: any } = {};
         for (const gve of gm.staffEntries[0].graphicalVoiceEntries) {
            const key: string = gve.notes[0].sourceNote.PrintObject ? "visible" : "hidden";
            vfStaveNotes[key] = (gve as VexFlowVoiceEntry).vfStaveNote;
            heads[key] = vfStaveNotes[key].note_heads[0];
         }
         const hiddenVfStaveNote: any = vfStaveNotes.hidden;
         expect(hiddenVfStaveNote, "should find the invisible unison note").to.not.be.undefined;
         expect(vfStaveNotes.visible, "should find the half note").to.not.be.undefined;
         expect(heads.hidden.getAbsoluteX(), "the two heads share one column").to.equal(heads.visible.getAbsoluteX());
         expect(vfStaveNotes.visible.getXShift(), "the half note isn't shifted aside").to.equal(0);
         expect(heads.hidden.getStyle()?.fillStyle, "the hidden eighth's head stays transparent").to.equal("#00000000");
         expect(hiddenVfStaveNote.getStemStyle()?.fillStyle, "its stem rises from the shared head").to.not.equal("#00000000");
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
      // head Vexflow merges with the hidden eighth's (same shape), once as a whole note in a 4/4 bar, whose wider head
      // it doesn't merge with, so the hidden head is laid out beside it
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
      const redWhole: string = `
         <note color="#FF0000"><pitch><step>F</step><alter>1</alter><octave>3</octave></pitch><duration>24</duration><voice>1</voice>
            <type>whole</type></note>`;
      const redEighth: string = `
         <note color="#FF0000"><pitch><step>F</step><alter>1</alter><octave>3</octave></pitch><duration>3</duration><voice>1</voice>
            <type>eighth</type><stem>down</stem></note>
         <note><rest/><duration>3</duration><voice>1</voice><type>eighth</type></note>
         <note><rest/><duration>6</duration><voice>1</voice><type>quarter</type></note>`;
      const bar: (voice1: string, beats: number) => string = (voice1: string, beats: number) => `<?xml version="1.0" encoding="UTF-8"?>
         <score-partwise version="3.0"><part-list><score-part id="P1"><part-name/></score-part></part-list>
         <part id="P1"><measure number="1">
            <attributes><divisions>6</divisions><key><fifths>4</fifths></key><time><beats>${beats}</beats><beat-type>4</beat-type></time>
               <clef><sign>F</sign><line>4</line></clef></attributes>
            ${voice1}<backup><duration>${beats * 6}</duration></backup>${hiddenTripletEighth}${tripletTail}
            ${beats > 2 ? `<note><rest/><duration>${(beats - 2) * 6}</duration><voice>2</voice><type>half</type></note>` : ""}
         </measure></part></score-partwise>`;

      for (const [variant, voice1, beats, headsMerged] of
         [["merged", redEighth, 2, true], ["displaced", redWhole, 4, false]] as [string, string, number, boolean][]) {
         const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
         await osmd.load(bar(voice1, beats));
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
         // premise: the two heads share a column for same-shaped heads, and don't for an eighth under a whole note
         expect(hiddenHead.getAbsoluteX() === visibleHead.getAbsoluteX(), `${variant}: heads share one column`).to.equal(headsMerged);
         expect(visibleHead.getStyle()?.fillStyle, `${variant}: visible notehead keeps its XML color`).to.equal("#FF0000");
         expect(hiddenHead.getStyle()?.fillStyle, `${variant}: hidden unison notehead is colored like the visible one`).to.equal("#FF0000");
      }
   });

   // A hidden unison note whose visible partner is the upper note of a chord: Vexflow misses that unison, so it neither
   // staggers the two heads nor gives them one shape, and the hidden eighth's filled head lands on the dotted half's
   // open one. It must stay transparent there, or the dotted half reads as a dotted quarter. Its stem still reaches the
   // beam from the shared head. E.g. Liszt's Liebestraum no. 3 m.42.
   it("Leaves the notehead of a hidden unison note transparent where it would fill a visible head of another shape", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_unison_notehead_over_chord_liebestraum_measure42.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmd.load(score).then(() => {
         osmd.render();
         const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);
         let hiddenVfStaveNote: any;
         let hiddenHead: any;
         let visibleHead: any;
         for (const se of gm.staffEntries) {
            for (const gve of se.graphicalVoiceEntries) {
               for (let i: number = 0; i < gve.notes.length; i++) {
                  const note: Note = gve.notes[i].sourceNote;
                  if (note.Pitch?.FundamentalNote !== NoteEnum.E || note.Pitch.Octave !== 0) {
                     continue; // E3
                  }
                  const vfStaveNote: any = (gve as VexFlowVoiceEntry).vfStaveNote;
                  if (note.PrintObject) {
                     visibleHead = vfStaveNote.note_heads[i];
                  } else if (!hiddenHead) {
                     hiddenVfStaveNote = vfStaveNote;
                     hiddenHead = vfStaveNote.note_heads[i];
                  }
               }
            }
         }
         expect(hiddenHead, "should find the hidden unison note").to.not.be.undefined;
         expect(visibleHead, "should find the visible unison note").to.not.be.undefined;
         // premise: the two heads share one column although their shapes differ
         expect(hiddenHead.getAbsoluteX(), "heads share one column").to.equal(visibleHead.getAbsoluteX());
         expect(hiddenHead.glyph_code, "heads have different shapes").to.not.equal(visibleHead.glyph_code);
         expect(hiddenHead.getStyle()?.fillStyle, "hidden unison notehead stays transparent").to.equal("#00000000");
         expect(visibleHead.getStyle()?.fillStyle, "visible notehead is drawn").to.not.equal("#00000000");
         expect(hiddenVfStaveNote.getStemStyle()?.fillStyle, "hidden unison note stem must not be transparent").to.not.equal("#00000000");
         done();
      }).catch(done);
   });

   // Hidden notes that only write out a tremolo for playback: a dotted half with tremolo strokes, and the same tremolo
   // as twelve hidden 16ths in another voice, beamed among themselves. Only the first 16th shares the dotted half's
   // notehead, so it's the only one that joins its beam, and a beam of one note isn't drawn. The 16th was drawn anyway,
   // as a lone 16th with flags beside the dotted half (its stem and flags since #1038, its head too since #1730).
   // E.g. ActorPreludeSample percussion part "1" m.33-38.
   it("Draws nothing of a hidden unison note whose beam has no other drawn note, e.g. a tremolo written out for playback", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_unison_hidden_tremolo_playback_notes_actor_prelude_measure33.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmd.load(score).then(() => {
         osmd.render();
         const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);
         let hiddenNote: Note;
         let hiddenVfStaveNote: any;
         let visibleVfStaveNote: any;
         for (const gve of gm.staffEntries[0].graphicalVoiceEntries) {
            if (gve.notes[0].sourceNote.PrintObject) {
               visibleVfStaveNote = (gve as VexFlowVoiceEntry).vfStaveNote;
            } else {
               hiddenNote = gve.notes[0].sourceNote;
               hiddenVfStaveNote = (gve as VexFlowVoiceEntry).vfStaveNote;
            }
         }
         expect(hiddenVfStaveNote, "should find the first hidden 16th").to.not.be.undefined;
         expect(visibleVfStaveNote, "should find the dotted half").to.not.be.undefined;
         // premise: the 16th shares the dotted half's notehead, but it's the only note of its beam that is drawn
         expect(hiddenNote.sharesNoteheadWithVisibleUnisonNote(), "the 16th shares the dotted half's notehead").to.be.true;
         expect(hiddenVfStaveNote.beam, "a beam of one note isn't drawn").to.not.be.ok;
         expect(hiddenVfStaveNote.note_heads[0].getStyle()?.fillStyle, "hidden notehead stays transparent").to.equal("#00000000");
         expect(hiddenVfStaveNote.getStemStyle()?.fillStyle, "hidden stem stays transparent").to.equal("#00000000");
         expect(hiddenVfStaveNote.getFlagStyle()?.fillStyle, "hidden flags stay transparent").to.equal("#00000000");
         expect(visibleVfStaveNote.note_heads[0].getStyle()?.fillStyle, "the dotted half is drawn").to.not.equal("#00000000");
         expect(visibleVfStaveNote.getStemStyle()?.fillStyle, "the dotted half's stem is drawn").to.not.equal("#00000000");
         done();
      }).catch(done);
   });

   // A hidden note in unison with a visible one doesn't stagger it: Vexflow shifted one of the two notes aside and lifted
   // the other one's augmentation dot above it, although nothing of the hidden note is drawn there (the tremolo sample
   // of the test above: the dotted half's dot sat a line higher). PrintObject can change between renders, while the
   // Vexflow notes are reused, so the stagger has to follow it both ways.
   it("Keeps a visible unison note and its dot in place for a hidden note, also when PrintObject changes between renders", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_unison_hidden_tremolo_playback_notes_actor_prelude_measure33.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmd.load(score).then(() => {
         const layout: () => { staggered: boolean, dotLifted: boolean } = () => {
            let dottedHalf: any;
            let sixteenth: any;
            for (const gve of osmd.GraphicSheet.findGraphicalMeasure(0, 0).staffEntries[0].graphicalVoiceEntries) {
               if (gve.notes[0].sourceNote.ParentVoiceEntry.ParentVoice.VoiceId === 1) {
                  dottedHalf = (gve as VexFlowVoiceEntry).vfStaveNote;
               } else {
                  sixteenth = (gve as VexFlowVoiceEntry).vfStaveNote;
               }
            }
            const dot: any = dottedHalf.modifiers.find((modifier: any) => modifier.getCategory() === "dots");
            return { staggered: dottedHalf.getXShift() !== sixteenth.getXShift(), dotLifted: dot.y_shift !== 0 };
         };
         const firstSixteenth: Note = osmd.Sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers[0].StaffEntries[0]
            .VoiceEntries.find((ve: VoiceEntry) => ve.ParentVoice.VoiceId === 2).Notes[0];
         osmd.render();
         expect(layout(), "hidden 16th").to.deep.equal({ staggered: false, dotLifted: false });
         firstSixteenth.PrintObject = true;
         osmd.render();
         expect(layout(), "premise: a visible 16th is staggered").to.deep.equal({ staggered: true, dotLifted: true });
         firstSixteenth.PrintObject = false;
         osmd.render();
         expect(layout(), "hidden again").to.deep.equal({ staggered: false, dotLifted: false });
         done();
      }).catch(done);
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

   // A fingering is placed from the sky line (above the staff) or the bottom line (below) in the range of its label's margin box.
   // Before fix: that range was read before the label's borders were set, so it had no width: only the samples at the note's x,
   // which missed a stem beside the note head. E.g. here the 1 of beat 3 (treble staff) was drawn on voice 1's stem,
   // the 1 of beat 1 (bass staff) on voice 6's stem.
   it("Places fingerings clear of the stems under their labels", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_fingering_two_voices_pitch_order.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmd.load(score).then(() => {
         osmd.render();
         let stemsUnderLabels: number = 0;
         for (const staffIndex of [0, 1]) {
            const above: boolean = staffIndex === 0; // fingerings above the treble staff, below the bass staff
            for (const staffEntry of osmd.GraphicSheet.findGraphicalMeasure(0, staffIndex).staffEntries) {
               for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                  // the drawn stem, in the page's units like the fingerings' boxes
                  const stem: SVGGElement = (voiceEntry.notes[0] as VexFlowGraphicalNote).getSVGGElement().querySelector(".vf-stem");
                  const stemBox: DOMRect = stem.getBBox();
                  const stemLeft: number = stemBox.x / unitInPixels;
                  const stemRight: number = (stemBox.x + stemBox.width) / unitInPixels;
                  for (const fingering of staffEntry.FingeringEntries) {
                     const box: BoundingBox = fingering.PositionAndShape;
                     if (stemRight < box.AbsolutePosition.x + box.BorderMarginLeft || stemLeft > box.AbsolutePosition.x + box.BorderMarginRight) {
                        continue;
                     }
                     stemsUnderLabels++;
                     const description: string = `staff ${staffIndex + 1}, fingering ${fingering.Label.text}`;
                     // (a tolerance of 1 pixel. The fingerings overlapped the stems by about a staff space.)
                     if (above) {
                        expect(box.AbsolutePosition.y + box.BorderBottom, `${description} must be above the stem`)
                           .to.be.at.most(stemBox.y / unitInPixels + 0.1);
                     } else {
                        expect(box.AbsolutePosition.y + box.BorderTop, `${description} must be below the stem`)
                           .to.be.at.least((stemBox.y + stemBox.height) / unitInPixels - 0.1);
                     }
                  }
               }
            }
         }
         expect(stemsUnderLabels, "stems under fingering labels").to.be.at.least(2);
         done();
      }).catch(done);
   });

   // A fingering above or below the staff is centred on its note's head, also where Vexflow moves a voice's notes aside from
   // another voice's notes, e.g. the lower of two voices a second apart (m1 beat 1: voice 2's C5 right of voice 1's D5).
   // Before fix: the fingerings of a staff entry were all at its x, the middle of the voice entry reaching the farthest right,
   // so the 4 of the D5 was drawn above the C5. The fingerings of a chord stay in one column (m1 beat 3: C5-D5 in voice 1,
   // whose D5 is drawn right of the stem), above the heads that aren't displaced: before fix, they were above the stem.
   // So do the fingerings of voices drawn in one column (m2: a half note beside a whole note), centred on the wider head.
   it("Centres each fingering on the head of its note, also of a voice moved aside", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_fingering_voices_moved_aside.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmd.load(score).then(() => {
         osmd.render();
         const staffEntries: GraphicalStaffEntry[] = osmd.GraphicSheet.findGraphicalMeasure(0, 0).staffEntries;
         function fingering(staffEntry: GraphicalStaffEntry, text: string): GraphicalLabel {
            return staffEntry.FingeringEntries.find((label: GraphicalLabel) => label.Label.text === text);
         }
         /** The x of the centre of the drawn note head of the fingering's note. */
         function noteX(label: GraphicalLabel): number {
            return osmd.EngravingRules.GNote(label.sourceNote).PositionAndShape.AbsolutePosition.x;
         }

         const d5Fingering: GraphicalLabel = fingering(staffEntries[0], "4");
         const c5Fingering: GraphicalLabel = fingering(staffEntries[0], "3");
         expect(noteX(c5Fingering) - noteX(d5Fingering), "beat 1: the C5 is drawn right of the D5").to.be.above(0.5);
         expect(d5Fingering.PositionAndShape.AbsolutePosition.x, "beat 1: the 4 above the D5").to.be.closeTo(noteX(d5Fingering), 0.001);
         expect(c5Fingering.PositionAndShape.AbsolutePosition.x, "beat 1: the 3 above the C5").to.be.closeTo(noteX(c5Fingering), 0.001);

         const chordC5Fingering: GraphicalLabel = fingering(staffEntries[1], "1");
         const chordD5Fingering: GraphicalLabel = fingering(staffEntries[1], "2");
         expect(noteX(chordD5Fingering) - noteX(chordC5Fingering), "beat 3: the D5 is drawn right of the C5").to.be.above(0.5);
         expect(chordC5Fingering.PositionAndShape.AbsolutePosition.x, "beat 3: the 1 above the C5")
            .to.be.closeTo(noteX(chordC5Fingering), 0.001);
         expect(chordD5Fingering.PositionAndShape.AbsolutePosition.x, "beat 3: the 2 in the column of the 1")
            .to.be.closeTo(chordC5Fingering.PositionAndShape.AbsolutePosition.x, 0.001);

         const columnEntry: GraphicalStaffEntry = osmd.GraphicSheet.findGraphicalMeasure(1, 0).staffEntries[0];
         const halfNoteFingering: GraphicalLabel = fingering(columnEntry, "5");
         const wholeNoteFingering: GraphicalLabel = fingering(columnEntry, "1");
         expect(noteX(wholeNoteFingering) - noteX(halfNoteFingering), "m2: the whole note's head is wider").to.be.above(0.1);
         expect(halfNoteFingering.PositionAndShape.AbsolutePosition.x, "m2: the 5 of the half note in the column of the 1")
            .to.be.closeTo(wholeNoteFingering.PositionAndShape.AbsolutePosition.x, 0.001);
         expect(wholeNoteFingering.PositionAndShape.AbsolutePosition.x, "m2: the 1 above the whole note")
            .to.be.closeTo(noteX(wholeNoteFingering), 0.001);
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

   // An ornament above a stem-up note is drawn from the tip of its stem, which a beam extends. The skyline was measured
   // from a first draw of each measure in which the notes were drawn before their beams, i.e. from the unextended stems:
   // there the mordent sat lower than in the final render, so the fingering placed from the skyline covered it.
   // E.g. Bach's Prelude BWV 847 m.34. Checked with both skyline calculations (geometric and raster).
   it("Places a fingering above the ornament of a beamed stem-up note", (done: Mocha.Done) => {
      const score: Document = TestUtils.getScore("test_ornament_fingering_beamed_stem_up_bwv847_measure34.musicxml");
      if (!score) {
         done(new Error("Score file not found"));
         return;
      }
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));

      osmd.load(score).then(() => {
         for (const geometricSkyline of [true, false]) {
            const skyline: string = geometricSkyline ? "geometric skyline" : "raster skyline";
            osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometricSkyline;
            osmd.render();
            const staffEntry: GraphicalStaffEntry = osmd.GraphicSheet.findGraphicalMeasure(0, 0).staffEntries[0];
            const note: VexFlowGraphicalNote = staffEntry.graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
            const fingering: GraphicalLabel = staffEntry.FingeringEntries[0];
            expect(fingering?.Label.text, `${skyline}: fingering of the ornamented note`).to.equal("3");
            // the mordent is the note's only modifier. Its drawn box, in the page's units like the fingering's:
            const ornament: SVGGElement = note.getSVGGElement().querySelector(".vf-modifiers");
            const ornamentTop: number = ornament.getBBox().y / unitInPixels;
            const fingeringBottom: number = fingering.PositionAndShape.AbsolutePosition.y + fingering.PositionAndShape.BorderBottom;
            // (a tolerance of 1 pixel for the raster skyline. The fingering overlapped the mordent by more than a staff space.)
            expect(fingeringBottom, `${skyline}: the fingering must be above the mordent`).to.be.at.most(ornamentTop + 0.1);
         }
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

   // A measure makes no VexFlow tuplet for a tuplet with fewer than two notes to draw in it, e.g. a cross-staff tuplet with
   //   one note in the staff, or a tuplet with invisible rests. draw() pairs the measure's tuplets with its VexFlow tuplets
   //   by index, so each VexFlow tuplet after such a tuplet showed or hid its number as decided for the tuplet before its own.
   // In test_tuplet_crossstaff_first_triplet_number, voice 1 plays four triplets without brackets, the first one with its
   //   first two notes on the lower staff, and the default rules show the numbers of the first two triplets only. The upper
   //   staff showed the 3rd triplet's number too, as it got the 2nd triplet's decision. The same with the first two notes as
   //   invisible rests on the upper staff.
   for (const [variant, invisibleRests] of [
      ["a cross-staff tuplet with one note in the staff", false],
      ["a tuplet with invisible rests", true],
   ] as [string, boolean][]) {
      it(`Shows the tuplet numbers decided for the tuplets after ${variant}`, async () => {
         let score: Document = TestUtils.getScore("test_tuplet_crossstaff_first_triplet_number.musicxml");
         if (invisibleRests) {
            score = score.cloneNode(true) as Document;
            for (const note of Array.from(score.getElementsByTagName("note")).slice(0, 2)) {
               note.setAttribute("print-object", "no");
               note.replaceChild(score.createElement("rest"), note.getElementsByTagName("pitch")[0]);
               note.getElementsByTagName("staff")[0].textContent = "1";
            }
         }
         const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
         await osmd.load(score);
         osmd.render();
         const triplets: Tuplet[] = [];
         for (const voiceEntry of osmd.Sheet.Instruments[0].Voices[0].VoiceEntries) {
            if (!triplets.includes(voiceEntry.Notes[0].NoteTuplet)) {
               triplets.push(voiceEntry.Notes[0].NoteTuplet);
            }
         }
         expect(triplets.length, "triplets of voice 1").to.equal(4);
         expect(triplets.map((tuplet: Tuplet) => tuplet.RenderTupletNumber), "numbers to show").to.deep.equal([true, true, false, false]);
         const [upperMeasure, lowerMeasure] = osmd.GraphicSheet.MeasureList[0];
         const drawnNotes: (tuplet: Tuplet, measure: GraphicalMeasure) => Note[] = (tuplet: Tuplet, measure: GraphicalMeasure): Note[] =>
            tuplet.Notes.flat().filter((note: Note) => note.PrintObject && note.ParentStaff === measure.ParentStaff);
         expect(drawnNotes(triplets[0], upperMeasure).length, "notes of the first triplet drawn on the upper staff").to.equal(1);

         // The indices of the triplets with a number drawn in the measure. The numbers are the glyphs (filled paths) in the
         //   measure's SVG group that belong to no note, beam, clef, key or time signature, which have groups of their own
         //   (the staff lines are stroked). A number is centered over the triplet's notes in the staff.
         const numberedTriplets: (measure: GraphicalMeasure) => number[] = (measure: GraphicalMeasure): number[] => {
            const measureGroup: Element = (measure.staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote)
               .getSVGGElement().closest("g.vf-measure");
            const numbers: Element[] = Array.from(measureGroup.querySelectorAll("path[stroke='none']")).filter((path: Element) =>
               !path.closest("g.vf-stavenote, g.vf-beam, g.vf-clef, g.vf-keysignature, g.vf-timesignature"));
            return numbers.map((tupletNumber: Element) => {
               const numberBox: DOMRect = (tupletNumber as SVGGraphicsElement).getBBox();
               const centerX: number = numberBox.x + numberBox.width / 2;
               return triplets.findIndex((tuplet: Tuplet) => {
                  const noteBoxes: DOMRect[] = drawnNotes(tuplet, measure).map((note: Note) =>
                     (osmd.EngravingRules.GNote(note) as VexFlowGraphicalNote).getSVGGElement().getBBox());
                  return noteBoxes.length > 0 && Math.min(...noteBoxes.map((box: DOMRect) => box.x)) <= centerX &&
                     centerX <= Math.max(...noteBoxes.map((box: DOMRect) => box.x + box.width));
               });
            });
         };
         expect(numberedTriplets(upperMeasure), "triplets with a number on the upper staff").to.deep.equal([1]);
         expect(numberedTriplets(lowerMeasure), "triplets with a number on the lower staff").to.deep.equal(invisibleRests ? [] : [0]);
      });
   }

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
   // slur start and a slur stop with the same number (how Dolet for Sibelius writes a slur whose end isn't attached to
   // a note). The stop used to close the start on its very own note, creating a zero-length slur whose curve
   // calculation divided 0 by 0, ending up as an invalid SVG path (<path d="... CNaN NaN ...">). Now no self-slur is
   // created: the slur has no end note (see Slur.HasUnattachedEnd), and isn't drawn, as its whole note isn't the
   // measure's last note.
   it("Creates no zero-length (NaN-curve) slur for a note with both a slur start and a slur stop", (done: Mocha.Done) => {
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

   // A grace note alone in its voice later in the measure (here voice 2 at the third beat) is drawn at its time, right of the
   //   whole note of voice 1, and its staff entry takes its position from it (the cursor position there).
   //   Rendering doesn't change the model (GraceAfterMainNote), so this also holds after updateGraphic().
   for (const tablature of [false, true]) {
      it(`Draws a grace note that a voice holds alone at its time in the measure${tablature ? " in a tablature staff" : ""}`, (done: Mocha.Done) => {
         const clef: string = tablature ?
            "<clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>6</staff-lines></staff-details>" :
            "<clef><sign>G</sign><line>2</line></clef>";
         const technical: (stringNumber: number, fret: number) => string = (stringNumber: number, fret: number): string =>
            tablature ? `<notations><technical><string>${stringNumber}</string><fret>${fret}</fret></technical></notations>` : "";
         const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
         <score-partwise version="4.0">
            <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
            <part id="P1">
               <measure number="1">
                  <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>${clef}</attributes>
                  <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type>${technical(1, 8)}</note>
                  <backup><duration>4</duration></backup>
                  <forward><duration>2</duration><voice>2</voice></forward>
                  <note><grace/><pitch><step>D</step><octave>4</octave></pitch><voice>2</voice><type>eighth</type>${technical(3, 7)}</note>
               </measure>
            </part>
         </score-partwise>`;
         const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
         osmd.load(xml).then(() => {
            osmd.render();
            for (const layout of ["first layout", "after updateGraphic()"]) {
               if (layout !== "first layout") {
                  osmd.updateGraphic();
                  osmd.render();
               }
               const measure: VexFlowMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0) as VexFlowMeasure;
               const staffEntries: GraphicalStaffEntry[] = measure.staffEntries;
               expect(staffEntries.length, `${layout}: the whole note, and the grace note at the third beat`).to.equal(2);
               const wholeNote: VexFlowVoiceEntry = staffEntries[0].graphicalVoiceEntries[0] as VexFlowVoiceEntry;
               const graceNote: VexFlowVoiceEntry = staffEntries[1].graphicalVoiceEntries[0] as VexFlowVoiceEntry;
               expect(graceNote.vfStaveNote.getAbsoluteX(), `${layout}: the grace note is drawn right of the whole note`)
                  .to.be.greaterThan(wholeNote.vfStaveNote.getAbsoluteX());
               expect(staffEntries[1].PositionAndShape.RelativePosition.x, `${layout}: its staff entry is right of the whole note's`)
                  .to.be.greaterThan(staffEntries[0].PositionAndShape.RelativePosition.x);
               expect(graceNote.parentVoiceEntry.GraceAfterMainNote, `${layout}: rendering doesn't mark it as a grace note after a main note`)
                  .to.equal(false);
            }
            done();
         }).catch(done);
      });
   }

   // Grace notes attached to another voice's main note take no time in their own voice.
   it("Keeps notes aligned after a grace note attached to another voice", (done: Mocha.Done) => {
      const xml: string = scoreWithMeasure(
         `<note><grace/>${xmlPitch("D", 5)}<voice>1</voice><type>eighth</type></note>
         <forward><duration>2</duration><voice>1</voice></forward>
         <note>${xmlPitch("E", 5)}<duration>2</duration><voice>1</voice><type>half</type></note>
         <backup><duration>4</duration></backup>
         <note>${xmlPitch("C", 4)}<duration>2</duration><voice>2</voice><type>half</type></note>
         <note>${xmlPitch("D", 4)}<duration>2</duration><voice>2</voice><type>half</type></note>`);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      osmd.load(xml).then(() => {
         osmd.render();
         expect(voiceEntryAt(osmd, 0.5, 1).vfStaveNote.getAbsoluteX(), "E5 and D4 start together")
            .to.be.closeTo(voiceEntryAt(osmd, 0.5, 2).vfStaveNote.getAbsoluteX(), 0.01);
         expect(voiceEntryAt(osmd, 0, 1, true).vfStaveNote.getAbsoluteX(), "the grace note stays before voice 2's C4")
            .to.be.lessThan(voiceEntryAt(osmd, 0, 2).vfStaveNote.getAbsoluteX());
         done();
      }).catch(done);
   });
   /** The grace notes of the given measure, in the order of their staff entries and voices */
   function graceNotesOfMeasure(osmd: OpenSheetMusicDisplay, measureIndex: number = 0): VexFlowVoiceEntry[] {
      const graceEntries: VexFlowVoiceEntry[] = [];
      for (const staffEntry of osmd.GraphicSheet.findGraphicalMeasure(measureIndex, 0).staffEntries) {
         for (const gve of staffEntry.graphicalVoiceEntries) {
            if (gve.parentVoiceEntry.IsGrace) {
               graceEntries.push(gve as VexFlowVoiceEntry);
            }
         }
      }
      return graceEntries;
   }

   // Grace notes drawn on their own keep slash="yes", like a GraceNoteGroup: only the first of several grace notes in a row
   //   gets it. Here two after their main note at the end of measure 1, leading to measure 2, and two alone in voice 2.
   it("Keeps the slash of the first of grace notes drawn on their own", (done: Mocha.Done) => {
      const grace: (step: string, octave: number, voice: number, beam: string) => string =
         (step: string, octave: number, voice: number, beam: string): string =>
            `<note><grace slash="yes"/><pitch><step>${step}</step><octave>${octave}</octave></pitch><voice>${voice}</voice>` +
            `<type>eighth</type><beam number="1">${beam}</beam></note>`;
      const hiddenGrace: (step: string, voice: number) => string = (step: string, voice: number): string =>
         `<note print-object="no"><grace slash="yes"/>${xmlPitch(step, 5)}<voice>${voice}</voice><type>eighth</type></note>`;
      const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
      <score-partwise version="4.0">
         <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
         <part id="P1">
            <measure number="1">
               <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
                  <clef><sign>G</sign><line>2</line></clef></attributes>
               <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note>
               <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note>
               ${grace("E", 5, 1, "begin")}${grace("F", 5, 1, "end")}
               <backup><duration>4</duration></backup>
               <forward><duration>2</duration><voice>2</voice></forward>
               ${grace("G", 4, 2, "begin")}${grace("A", 4, 2, "end")}
            </measure>
            <measure number="2">
               ${hiddenGrace("D", 1)}
               <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
               ${hiddenGrace("E", 1)}
               <backup><duration>4</duration></backup>
               <forward><duration>2</duration><voice>2</voice></forward>
               ${hiddenGrace("G", 2)}
            </measure>
         </part>
      </score-partwise>`;
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      osmd.load(xml).then(() => {
         osmd.render();
         const graceEntries: VexFlowVoiceEntry[] = graceNotesOfMeasure(osmd);
         const slashes: (entries: VexFlowVoiceEntry[]) => boolean[] = (entries: VexFlowVoiceEntry[]): boolean[] =>
            entries.map((gve: VexFlowVoiceEntry) => gve.GraceSlash === true);
         expect(slashes(graceEntries.filter((gve: VexFlowVoiceEntry) => gve.parentVoiceEntry.GraceAfterMainNote)),
            "the grace notes after their main note").to.deep.equal([true, false]);
         expect(slashes(graceEntries.filter((gve: VexFlowVoiceEntry) => gve.parentVoiceEntry.ParentVoice.VoiceId === 2)),
            "the grace notes alone in voice 2").to.deep.equal([true, false]);
         const hidden: VexFlowVoiceEntry[] = graceNotesOfMeasure(osmd, 1);
         expect(hidden.length, "hidden notes before, after and without a main note").to.equal(3);
         expect(slashes(hidden), "hidden notes have no slash").to.deep.equal([false, false, false]);
         done();
      }).catch(done);
   });

   /** A score with the given notes in measure 1 (4/4, treble clef and divisions 1 unless given) and a whole note G4 in measure 2. */
   function scoreWithMeasure(notes: string, clef: string = "<clef><sign>G</sign><line>2</line></clef>", divisions: number = 1): string {
      return `<?xml version="1.0" encoding="UTF-8"?>
      <score-partwise version="4.0">
         <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
         <part id="P1">
            <measure number="1">
               <attributes><divisions>${divisions}</divisions><time><beats>4</beats><beat-type>4</beat-type></time>${clef}</attributes>
               ${notes}
            </measure>
            <measure number="2">
               <note><pitch><step>G</step><octave>4</octave></pitch><duration>${4 * divisions}</duration><voice>1</voice><type>whole</type></note>
            </measure>
         </part>
      </score-partwise>`;
   }
   const xmlPitch: (step: string, octave: number, alter?: number) => string = (step: string, octave: number, alter?: number): string =>
      `<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ""}<octave>${octave}</octave></pitch>`;
   /** The graphical voice entry of the given voice in the staff entry of measure 1 at the given time (in whole notes) */
   function voiceEntryAt(osmd: OpenSheetMusicDisplay, time: number, voiceId: number, grace: boolean = false): VexFlowVoiceEntry {
      const staffEntry: GraphicalStaffEntry = osmd.GraphicSheet.findGraphicalMeasure(0, 0).staffEntries.find(
         (entry: GraphicalStaffEntry) => entry.relInMeasureTimestamp.RealValue === time);
      return staffEntry.graphicalVoiceEntries.find((gve: GraphicalVoiceEntry) =>
         gve.parentVoiceEntry.ParentVoice.VoiceId === voiceId && gve.parentVoiceEntry.IsGrace === grace) as VexFlowVoiceEntry;
   }

   // Stand-alone grace notes stay between the surrounding notes, and the following notes of both voices stay aligned.
   const eighth: string = "<type>eighth</type>";
   const triplet: (position: string) => string = (position: string): string =>
      eighth + "<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>" +
      (position ? `<notations><tuplet type="${position}"/></notations>` : "");
   for (const { description, graces, gap } of [
      { description: "three eighths in the time of a quarter", graces: [eighth, eighth, eighth], gap: 2 },
      { description: "three triplet eighths in the time of a quarter", graces: [triplet("start"), triplet(""), triplet("stop")], gap: 2 },
   ]) {
      it(`Keeps the note after stand-alone grace notes aligned with the other voices: ${description}`, (done: Mocha.Done) => {
         const eighths: string = ["C", "D", "E", "F", "G", "A", "B", "C"].map((step: string, i: number) =>
            `<note>${xmlPitch(step, i < 7 ? 5 : 6)}<duration>1</duration><voice>1</voice><type>eighth</type></note>`).join("");
         const graceNotes: string = graces.map((typeAndNotations: string, i: number) =>
            `<note><grace/>${xmlPitch(["E", "F", "G"][i], 4)}<voice>2</voice>${typeAndNotations}</note>`).join("");
         const xml: string = scoreWithMeasure(
            `${eighths}<backup><duration>8</duration></backup>
            <forward><duration>2</duration><voice>2</voice></forward>${graceNotes}<forward><duration>${gap}</duration><voice>2</voice></forward>
            <note>${xmlPitch("F", 4)}<duration>1</duration><voice>2</voice><type>eighth</type></note>
            <forward><duration>${5 - gap}</duration><voice>2</voice></forward>`, undefined, 2);
         const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
         osmd.load(xml).then(() => {
            osmd.render();
            const noteTime: number = (2 + gap) / 8;
            expect(voiceEntryAt(osmd, noteTime, 2).vfStaveNote.getAbsoluteX(), "the note of voice 2 after the grace notes")
               .to.be.closeTo(voiceEntryAt(osmd, noteTime, 1).vfStaveNote.getAbsoluteX(), 0.01);
            const left: number = voiceEntryAt(osmd, 0.125, 1).vfStaveNote.getAbsoluteX();
            const right: number = voiceEntryAt(osmd, noteTime, 1).vfStaveNote.getAbsoluteX();
            const positions: number[] = graceNotesOfMeasure(osmd).map((gve: VexFlowVoiceEntry) => gve.vfStaveNote.getAbsoluteX());
            expect(positions.length, "all three grace notes are drawn").to.equal(3);
            for (let i: number = 0; i < positions.length; i++) {
               expect(positions[i], "grace notes follow the preceding note and each other").to.be.greaterThan(i === 0 ? left : positions[i - 1]);
               expect(positions[i], "grace notes precede the following note").to.be.lessThan(right);
            }
            done();
         }).catch(done);
      });
   }

   // Stand-alone grace notes that don't fit into the measure (here ten eighth grace notes in voice 2 beside a whole note)
   //   are fitted into it: they don't run past the end of the measure.
   it("Fits stand-alone grace notes that are longer than the measure into it", (done: Mocha.Done) => {
      const graceNotes: string = ["C", "D", "E", "F", "G", "A", "B", "C", "D", "E"].map((step: string, i: number) =>
         `<note><grace/>${xmlPitch(step, i < 7 ? 4 : 5)}<voice>2</voice><type>eighth</type></note>`).join("");
      const xml: string = scoreWithMeasure(
         `<note>${xmlPitch("C", 5)}<duration>4</duration><voice>1</voice><type>whole</type></note>
         <backup><duration>4</duration></backup>${graceNotes}`);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      osmd.load(xml).then(() => {
         osmd.render();
         const measure: VexFlowMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0) as VexFlowMeasure;
         const graceEntries: VexFlowVoiceEntry[] = graceNotesOfMeasure(osmd);
         expect(graceEntries.length, "all ten grace notes are drawn").to.equal(10);
         const lastGraceNote: VF.BoundingBox = (graceEntries[9].vfStaveNote as VF.StaveNote).getBoundingBox();
         expect(lastGraceNote.getX() + lastGraceNote.getW(), "the last grace note ends before the end of the measure")
            .to.be.at.most(measure.getVFStave().getNoteEndX());
         done();
      }).catch(done);
   });

   // Rendering doesn't mark stand-alone grace notes as grace notes after their main note, whose accidentals are calculated after
   //   the other notes of the measure. So after updateGraphic() (e.g. for a transposition), the sharp stays on the grace note F#5
   //   of voice 2 at the third beat, not on the grace note F#5 after the whole note of voice 1, and nothing moves.
   //   Only the grace note of voice 2 has an accidental in the XML: one given for voice 1 would be drawn as a courtesy accidental.
   it("Keeps the accidental and the position of a stand-alone grace note after updateGraphic()", (done: Mocha.Done) => {
      const graceFSharp: (voice: number, accidental: string) => string = (voice: number, accidental: string): string =>
         `<note><grace/>${xmlPitch("F", 5, 1)}<voice>${voice}</voice><type>eighth</type>${accidental}</note>`;
      const xml: string = scoreWithMeasure(
         `<note>${xmlPitch("C", 5)}<duration>4</duration><voice>1</voice><type>whole</type></note>${graceFSharp(1, "")}
         <backup><duration>4</duration></backup><forward><duration>2</duration><voice>2</voice></forward>
         ${graceFSharp(2, "<accidental>sharp</accidental>")}`);
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      const layout: () => { sharp: boolean, x: number }[] = (): { sharp: boolean, x: number }[] =>
         [voiceEntryAt(osmd, 0, 1, true), voiceEntryAt(osmd, 0.5, 2, true)].map((gve: VexFlowVoiceEntry) => ({
            sharp: (gve.notes[0] as VexFlowGraphicalNote).DrawnAccidental === AccidentalEnum.SHARP,
            x: Math.round(gve.vfStaveNote.getAbsoluteX()),
         }));
      osmd.load(xml).then(() => {
         osmd.render();
         const firstLayout: { sharp: boolean, x: number }[] = layout();
         expect(firstLayout.map((grace: { sharp: boolean }) => grace.sharp), "sharp on the grace note of voice 2 only")
            .to.deep.equal([false, true]);
         osmd.updateGraphic();
         osmd.render();
         expect(layout(), "after updateGraphic()").to.deep.equal(firstLayout);
         done();
      }).catch(done);
   });

   // In a tablature staff, a grace note before a rest (a GhostNote, which can't carry a GraceNoteGroup) is drawn on its own
   //   before the rest without delaying the following notes, also after updateGraphic().
   it("Keeps a grace note before a rest in a tablature staff in place after updateGraphic()", (done: Mocha.Done) => {
      const fret: (stringNumber: number, fretNumber: number) => string = (stringNumber: number, fretNumber: number): string =>
         `<notations><technical><string>${stringNumber}</string><fret>${fretNumber}</fret></technical></notations>`;
      const xml: string = scoreWithMeasure(
         `<note><grace/>${xmlPitch("C", 4)}<voice>1</voice><type>eighth</type>${fret(2, 1)}</note>
         <note><rest/><duration>1</duration><voice>1</voice><type>quarter</type></note>
         <note>${xmlPitch("D", 4)}<duration>1</duration><voice>1</voice><type>quarter</type>${fret(2, 3)}</note>
         <note>${xmlPitch("E", 4)}<duration>2</duration><voice>1</voice><type>half</type>${fret(1, 0)}</note>
         <backup><duration>4</duration></backup>
         <note>${xmlPitch("G", 3)}<duration>1</duration><voice>2</voice><type>quarter</type>${fret(3, 0)}</note>
         <note>${xmlPitch("A", 3)}<duration>1</duration><voice>2</voice><type>quarter</type>${fret(3, 2)}</note>
         <note>${xmlPitch("B", 3)}<duration>2</duration><voice>2</voice><type>half</type>${fret(3, 4)}</note>`,
         "<clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>6</staff-lines></staff-details>");
      const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
      const layout: () => { grace: number, rest: number } = (): { grace: number, rest: number } => ({
         grace: Math.round(voiceEntryAt(osmd, 0, 1, true).vfStaveNote.getAbsoluteX()),
         rest: Math.round(voiceEntryAt(osmd, 0, 1).vfStaveNote.getAbsoluteX()),
      });
      osmd.load(xml).then(() => {
         osmd.render();
         const firstLayout: { grace: number, rest: number } = layout();
         expect(firstLayout.grace, "the grace note before the rest").to.be.lessThan(firstLayout.rest);
         for (const time of [0.25, 0.5]) {
            expect(voiceEntryAt(osmd, time, 1).vfStaveNote.getAbsoluteX(), "notes after the rest align with voice 2")
               .to.be.closeTo(voiceEntryAt(osmd, time, 2).vfStaveNote.getAbsoluteX(), 0.01);
         }
         osmd.updateGraphic();
         osmd.render();
         expect(layout(), "after updateGraphic()").to.deep.equal(firstLayout);
         for (const time of [0.25, 0.5]) {
            expect(voiceEntryAt(osmd, time, 1).vfStaveNote.getAbsoluteX(), "notes after the rest still align after updateGraphic()")
               .to.be.closeTo(voiceEntryAt(osmd, time, 2).vfStaveNote.getAbsoluteX(), 0.01);
         }
         done();
      }).catch(done);
   });
});
