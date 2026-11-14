import Vex from "vexflow";
import VF = Vex.Flow;
import { Fraction } from "../../../Common/DataObjects/Fraction";
import { TabBendSegment, TabNote } from "../../VoiceData/TabNote";
import { Staff } from "../../VoiceData/Staff";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { VexFlowStaffEntry } from "./VexFlowStaffEntry";
import { VexFlowConverter } from "./VexFlowConverter";
import { StaffLine } from "../StaffLine";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import { Arpeggio } from "../../VoiceData/Arpeggio";
import { Voice } from "../../VoiceData/Voice";
import { log } from "../../../Common/Logging";
import { ClefEnum, ClefInstruction } from "../../VoiceData/Instructions/ClefInstruction";

/** Endpoints supported by our patched VexFlow Bend (omitted from the VexFlow 1.x typings). */
interface SpanBend extends VF.Bend {
    setSpanTargets(targets: VF.TabNote[], release?: SpanBend): void;
}

interface BendTabNote extends VF.TabNote {
    getModifiers(): VF.Modifier[];
}

export class VexFlowTabMeasure extends VexFlowMeasure {
    public multiRestElement: any; // VexFlow: Element

    constructor(staff: Staff, sourceMeasure: SourceMeasure = undefined, staffLine: StaffLine = undefined) {
        super(staff, sourceMeasure, staffLine);
        this.isTabMeasure = true;
    }

    /**
     * Reset all the geometric values and parameters of this measure and put it in an initialized state.
     * This is needed to evaluate a measure a second time by system builder.
     */
    public resetLayout(): void {
        // Take into account some space for the begin and end lines of the stave
        // Will be changed when repetitions will be implemented
        //this.beginInstructionsWidth = 20 / UnitInPixels;
        //this.endInstructionsWidth = 20 / UnitInPixels;
        const stafflineCount: number = this.ParentStaff.StafflineCount ?? 6; // if undefined, 6 by default (same as Vexflow default)
        this.stave = new VF.TabStave(0, 0, 0, {
            space_above_staff_ln: 0,
            space_below_staff_ln: 0,
            num_lines: stafflineCount
        });
        // also see VexFlowMusicSheetDrawer.drawSheet() for some other vexflow default value settings (like default font scale)
        this.updateInstructionWidth();
    }

    public graphicalMeasureCreatedCalculations(): void {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: VexFlowStaffEntry = (this.staffEntries[idx] as VexFlowStaffEntry);
            // grace notes are collected until their main note (the next non-grace entry) is reached,
            //   like in VexFlowMeasure.graphicalMeasureCreatedCalculations() (#1721)
            let graceGVoiceEntriesBefore: VexFlowVoiceEntry[] = [];
            let graceSlur: boolean = false;

            // create vex flow Notes:
            for (const gve of graphicalStaffEntry.graphicalVoiceEntries as VexFlowVoiceEntry[]) {
                const isRest: boolean = gve.notes[0].sourceNote.isRest();
                if (isRest) {
                    const ghostNotes: VF.GhostNote[] = VexFlowConverter.GhostNotes(gve.notes[0].sourceNote.Length);
                    gve.vfStaveNote = ghostNotes[0];
                    gve.vfGhostNotes = ghostNotes; // we actually need multiple ghost notes sometimes, see #1062 Sep. 23 2021 comment
                } else {
                    gve.vfStaveNote = VexFlowConverter.CreateTabNote(gve); // a GraceTabNote (smaller fret number) for a grace note
                }
                if (gve.parentVoiceEntry.IsGrace) {
                    if (gve.parentVoiceEntry.GraceAfterMainNote) {
                        // grace notes after their main note (see InstrumentReader.attachGraceNotesAfterMainNote):
                        //   drawn as their own tickables right of the main note (added to the vexflow voice below)
                        continue;
                    }
                    graceGVoiceEntriesBefore.push(gve);
                    graceSlur = graceSlur || gve.parentVoiceEntry.GraceSlur;
                    continue;
                }
                if (graceGVoiceEntriesBefore.length > 0) {
                    if (isRest) {
                        // a GhostNote (rest in a tab measure) doesn't draw modifiers, so these grace notes are drawn as their own tickables
                        for (const graceGve of graceGVoiceEntriesBefore) {
                            graceGve.isStandAloneGrace = true; // added to the vexflow voice below
                        }
                    } else {
                        // attach the grace notes to their main note in a Vexflow GraceNoteGroup, which formats and draws them
                        //   left of the main note (as for classical notes). Otherwise they would never be drawn: they are not
                        //   tickables of the vexflow voice (see below), which is why they were missing in tabs before (#1721).
                        const vfGraceNotes: VF.TabNote[] = graceGVoiceEntriesBefore.map(
                            (graceGve: VexFlowVoiceEntry) => graceGve.vfStaveNote as VF.TabNote);
                        const graceNoteGroup: VF.GraceNoteGroup = new VF.GraceNoteGroup(vfGraceNotes as unknown as VF.GraceNote[], graceSlur);
                        // note the argument order: (Tab)Note.addModifier(modifier, index), unlike StaveNote.addModifier(index, modifier)
                        (gve.vfStaveNote as VF.TabNote).addModifier(graceNoteGroup, 0);
                    }
                    graceGVoiceEntriesBefore = [];
                    graceSlur = false;
                }
            }
            // remaining grace notes without a main note after them (e.g. at the end of the measure): stand-alone grace notes
            for (const graceGve of graceGVoiceEntriesBefore) {
                graceGve.isStandAloneGrace = true;
            }
        }

        this.finalizeTuplets(); // this is necessary for x-alignment even when we don't want to show tuplet brackets or numbers

        const voices: Voice[] = this.getVoicesWithinMeasure();

        for (const voice of voices) {
            if (!voice) {
                continue;
            }

            // add a vexFlow voice for this voice:
            // Fraction keeps the whole part apart (WholeValue): a 4/4 measure is 1 0/1, so its Numerator is 0.
            this.vfVoices[voice.VoiceId] = new VF.Voice({
                        beat_value: this.parentSourceMeasure.Duration.Denominator,
                        num_beats: this.parentSourceMeasure.Duration.GetExpandedNumerator(),
                        resolution: VF.RESOLUTION,
                    }).setMode(VF.Voice.Mode.SOFT);

            const restFilledEntries: GraphicalVoiceEntry[] =  this.getRestFilledVexFlowStaveNotesPerVoice(voice);
            // create vex flow voices and add tickables to it:
            for (const voiceEntry of restFilledEntries) {
                if (voiceEntry.parentVoiceEntry) {
                    if (voiceEntry.parentVoiceEntry.IsGrace && !voiceEntry.parentVoiceEntry.GraceAfterMainNote &&
                        !(voiceEntry as VexFlowVoiceEntry).isStandAloneGrace) {
                        continue;
                    }
                }

                const vexFlowVoiceEntry: VexFlowVoiceEntry = voiceEntry as VexFlowVoiceEntry;
                if (voiceEntry.notes.length === 0 || !voiceEntry.notes[0] || !voiceEntry.notes[0].sourceNote.isVisible()) {
                    // GhostNote, don't add modifiers like in-measure clefs
                    if (vexFlowVoiceEntry.vfGhostNotes) {
                        for (const ghostNote of vexFlowVoiceEntry.vfGhostNotes) {
                            this.vfVoices[voice.VoiceId].addTickable(ghostNote);
                        }
                    } else {
                        this.vfVoices[voice.VoiceId].addTickable(vexFlowVoiceEntry.vfStaveNote);
                    }
                    continue;
                }

                // don't add non-tab fingerings for tab measures (doesn't work yet for tabnotes in vexflow, see VexFlowMeasure.createFingerings())
                // if (voiceEntry.parentVoiceEntry && this.rules.RenderFingerings) {
                //     this.createFingerings(voiceEntry);
                // }

                // add Arpeggio
                if (voiceEntry.parentVoiceEntry && voiceEntry.parentVoiceEntry.Arpeggio) {
                    const arpeggio: Arpeggio = voiceEntry.parentVoiceEntry.Arpeggio;
                    // TODO right now our arpeggio object has all arpeggio notes from arpeggios across all voices.
                    // see VoiceGenerator. Doesn't matter for Vexflow for now though
                    if (voiceEntry.notes && voiceEntry.notes.length > 1) {
                        const type: VF.Stroke.Type = VexFlowConverter.StrokeTypeFromArpeggioType(arpeggio.type);
                        const stroke: VF.Stroke = new VF.Stroke(type, {
                            all_voices: this.rules.ArpeggiosGoAcrossVoices
                            // default: false. This causes arpeggios to always go across all voices, which is often unwanted.
                            // also, this can cause infinite height of stroke, see #546
                        });
                        //if (arpeggio.notes.length === vexFlowVoiceEntry.notes.length) { // different workaround for endless y bug
                        if (this.rules.RenderArpeggios) {
                            vexFlowVoiceEntry.vfStaveNote.addStroke(0, stroke);
                        }
                    } else {
                        log.debug(`[OSMD] arpeggio in measure ${this.MeasureNumber} could not be drawn.
                        voice entry had less than two notes, arpeggio is likely between voice entries, not currently supported in Vexflow.`);
                        // TODO: create new arpeggio with all the arpeggio's notes (arpeggio.notes), perhaps with GhostNotes in a new vfStaveNote. not easy.
                    }
                }

                if (vexFlowVoiceEntry.vfGhostNotes) {
                    for (const ghostNote of vexFlowVoiceEntry.vfGhostNotes) {
                        this.vfVoices[voice.VoiceId].addTickable(ghostNote);
                    }
                } else {
                    this.vfVoices[voice.VoiceId].addTickable(vexFlowVoiceEntry.vfStaveNote);
                }
            }
        }
        this.createInStaffInstructionVoice();
        //this.createArticulations();
        //this.createOrnaments();
    }

    /** Whether a visible single-note bend has MuseScore's hidden-fret endpoint at the bent pitch. */
    private isHiddenBendEnd(first: TabNote, target: TabNote): boolean {
        if (!first?.Pitch || !target?.Pitch || !first.isVisible() || !target.isVisible() || first.BendArray?.length !== 1) {
            return false;
        }
        const bend: TabBendSegment = first.BendArray[0];
        if (bend.direction !== "up" || bend.bendalter <= 0) {
            return false;
        }
        if (target.FretVisible !== false || first.StringNumberTab !== target.StringNumberTab || first.FretNumber !== target.FretNumber ||
            Math.abs(target.Pitch.getHalfTone() - first.Pitch.getHalfTone() - bend.bendalter) > 1e-8) {
            return false;
        }
        const targetBends: TabBendSegment[] = target.BendArray;
        if (targetBends?.length > 0 && (targetBends.length !== 1 || targetBends[0].direction !== "down" ||
            Math.abs(targetBends[0].bendalter) !== bend.bendalter)) {
            return false;
        }
        return true;
    }

    /** After a hidden bend endpoint, whether its release returns to the original string, fret and pitch. */
    private isMatchingReleaseEnd(first: TabNote, target: TabNote, end: TabNote): boolean {
        if (!end?.Pitch || !end.isVisible()) {
            return false;
        }
        const release: TabBendSegment[] = target.BendArray;
        return release?.length === 1 && release[0].direction === "down" &&
            Math.abs(release[0].bendalter) === first.BendArray[0].bendalter &&
            end.StringNumberTab === first.StringNumberTab && end.FretNumber === first.FretNumber &&
            end.Pitch.getHalfTone() === first.Pitch.getHalfTone();
    }

    /** Connects only adjacent, single-note gestures within this measure and voice. A hidden fret identifies
     *  a bend endpoint; parentheses alone do not imply a continuation or change a note's attack. */
    private configureBendSpans(): void {
        const voices: Map<Voice, VexFlowVoiceEntry[]> = new Map();
        const bendOf: (entry: VexFlowVoiceEntry) => SpanBend = entry => {
            const note: BendTabNote = entry?.vfStaveNote as BendTabNote;
            const bends: VF.Modifier[] = note instanceof VF.TabNote ? note.getModifiers().filter(modifier => modifier instanceof VF.Bend) : [];
            return bends.length === 1 ? bends[0] as SpanBend : undefined;
        };
        for (const staffEntry of this.staffEntries) {
            for (const entry of staffEntry.graphicalVoiceEntries as VexFlowVoiceEntry[]) {
                const voice: Voice = entry.parentVoiceEntry.ParentVoice;
                if (!voices.has(voice)) { voices.set(voice, []); }
                voices.get(voice).push(entry);
                bendOf(entry)?.setSpanTargets([]);
            }
        }
        const sourceOf: (entry: VexFlowVoiceEntry) => TabNote = entry =>
            entry?.notes.length === 1 && !entry.parentVoiceEntry.IsGrace && entry.notes[0].sourceNote instanceof TabNote
                ? entry.notes[0].sourceNote as TabNote : undefined;
        const adjacent: (first: VexFlowVoiceEntry, next: VexFlowVoiceEntry) => boolean = (first, next) =>
            Fraction.plus(first.parentVoiceEntry.Timestamp, first.notes[0].sourceNote.Length).Equals(next.parentVoiceEntry.Timestamp);
        for (const entries of voices.values()) {
            for (let i: number = 0; i + 1 < entries.length; i++) {
                const first: TabNote = sourceOf(entries[i]);
                const target: TabNote = sourceOf(entries[i + 1]);
                const bend: SpanBend = bendOf(entries[i]);
                if (!bend || !this.isHiddenBendEnd(first, target) || !adjacent(entries[i], entries[i + 1])) {
                    continue;
                }
                const targets: VF.TabNote[] = [entries[i + 1].vfStaveNote as VF.TabNote];
                let release: SpanBend;
                const end: TabNote = sourceOf(entries[i + 2]);
                if (this.isMatchingReleaseEnd(first, target, end) && adjacent(entries[i + 1], entries[i + 2])) {
                    release = bendOf(entries[i + 1]);
                    if (release) { targets.push(entries[i + 2].vfStaveNote as VF.TabNote); }
                }
                // Targets need the skyline's or final render's stave position before Voice.draw() reaches them.
                for (const note of targets) { note.setStave(this.stave); }
                bend.setSpanTargets(targets, release);
            }
        }
    }

     public addClefAtBegin(clef: ClefInstruction): void {
        if (clef.ClefType === ClefEnum.TAB) {
            super.addClefAtBegin(clef);
        }
        // else return; // we don't need clefs in tabs.
     }

     public draw(ctx: Vex.IRenderContext): void {
        this.configureBendSpans();
        this.updateTabNoteBackgroundColors();
        super.draw(ctx);

        // draw multi-measure rest: unlike a classical measure, this is not a VexFlowMultiRestMeasure class,
        //   so we need to add the multiple measure rest element drawing here.
        const sourceMeasure: SourceMeasure = this.parentSourceMeasure;
        if (sourceMeasure.multipleRestMeasures && this.rules.RenderMultipleRestMeasures) {
            this.multiRestElement = new VF.MultiMeasureRest(sourceMeasure.multipleRestMeasures, {
                        // number_line: 3
            });
            ctx.openGroup("multirest"); // like VexFlowMultiRestMeasure.draw()
            this.multiRestElement.setStave(this.stave);
            this.multiRestElement.setContext(ctx);
            this.multiRestElement.draw();
            ctx.closeGroup();
        }
     }

    /**
     * Gives the box behind each fret number, which interrupts the string line, the current page background color
     * (EngravingRules.PageBackgroundColor, if UsePageBackgroundColorForTabNotes), read by TabNote.draw() in the VexFlowPatch.
     * VexFlowConverter.CreateTabNote() sets the color of the time the note was created: this follows a later change, e.g.
     * osmd.setOptions({darkMode: true}) or pageBackgroundColor after load(), which render() applies without creating the notes anew.
     */
    private updateTabNoteBackgroundColors(): void {
        if (!this.rules.UsePageBackgroundColorForTabNotes) {
            return;
        }
        for (const staffEntry of this.staffEntries) {
            for (const gve of staffEntry.graphicalVoiceEntries) {
                const vfnote: VF.StemmableNote = (gve as VexFlowVoiceEntry).vfStaveNote;
                if (vfnote instanceof VF.TabNote) { // also a grace note (GraceTabNote), not a rest
                    (vfnote as any).BackgroundColor = this.rules.PageBackgroundColor; // undefined (transparent page): a white box
                }
            }
        }
    }
}
