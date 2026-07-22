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
import { PointF2D } from "../../../../src/Common/DataObjects/PointF2D";
import { GraphicalTie } from "../../../../src/MusicalScore/Graphical/GraphicalTie";
import { AccidentalEnum } from "../../../../src/Common/DataObjects/Pitch";

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
            // the widest slur spans a (near-)flat passage, so flattening should cut its arc well below half
            expect(arcWith, `widest slur's flattened arc (${arcWith.toFixed(1)}) should be far below unflattened (${arcWithout.toFixed(1)})`)
               .to.be.lessThan(arcWithout * 0.65);
            done();
         });
      }).catch(done);
   });

});
