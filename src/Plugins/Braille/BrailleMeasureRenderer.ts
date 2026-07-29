import { Slur } from "../../MusicalScore/VoiceData/Expressions/ContinuousExpressions/Slur";
import { OctaveShift } from "../../MusicalScore/VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { SourceMeasure } from "../../MusicalScore/VoiceData/SourceMeasure";
import { VerticalSourceStaffEntryContainer } from "../../MusicalScore/VoiceData/VerticalSourceStaffEntryContainer";
import { SourceStaffEntry } from "../../MusicalScore/VoiceData/SourceStaffEntry";
import { VoiceEntry } from "../../MusicalScore/VoiceData/VoiceEntry";
import { Voice } from "../../MusicalScore/VoiceData/Voice";
import { Note } from "../../MusicalScore/VoiceData/Note";
import { Pitch } from "../../Common/DataObjects/Pitch";
import { KeyInstruction } from "../../MusicalScore/VoiceData/Instructions/KeyInstruction";
import { ClefInstruction, ClefEnum } from "../../MusicalScore/VoiceData/Instructions/ClefInstruction";
import { RepetitionInstructionEnum, AlignmentType } from "../../MusicalScore/VoiceData/Instructions/RepetitionInstruction";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { MultiExpression } from "../../MusicalScore/VoiceData/Expressions/MultiExpression";
import { BrailleNoteRenderer, BrailleNoteResult, BrailleNoteDebugInfo } from "./BrailleNoteRenderer";
import { BrailleChordRenderer } from "./BrailleChordRenderer";
import { BrailleOctaveTracker } from "./BrailleOctaveTracker";
import { renderKeySignature, BrailleKeySignatureResult } from "./BrailleKeySignature";
import { renderTimeSignature, BrailleTimeSignatureResult } from "./BrailleTimeSignature";
import {
    BRAILLE_FULL_MEASURE_IN_ACCORD,
    BRAILLE_CRESC_HAIRPIN,
    BRAILLE_DIM_HAIRPIN,
    BRAILLE_FORWARD_REPEAT,
    BRAILLE_BACKWARD_REPEAT,
    BRAILLE_SLUR,
    BRAILLE_BRACKET_SLUR_OPEN,
    BRAILLE_BRACKET_SLUR_CLOSE,
    getVoltaBraille,
    getNavigationBraille,
    getNavigationName,
    BRAILLE_AUGMENTATION_DOT,
    BRAILLE_SYLLABIC_SLUR,
    getOttavaBraille,
    getOttavaName,
    BRAILLE_OTTAVA_END,
} from "./BrailleSymbols";
import { renderDynamic, BrailleExpressionResult } from "./BrailleExpressions";
import { ContDynamicEnum } from "../../MusicalScore/VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";

/**
 * State passed between measures during braille conversion.
 * Persists across measure boundaries to maintain context.
 */
export interface BrailleState {
    /** Tracks octave context for octave mark decisions */
    octaveTracker: BrailleOctaveTracker;
    /** Current key signature (undefined = not yet encountered) */
    currentKey?: KeyInstruction;
    /** Current time signature (undefined = not yet encountered) */
    currentRhythm?: Fraction;
    /** Whether output is facsimile (mirrors print layout) or nonfacsimile (standard braille). */
    facsimile: boolean;
    /** Current clef type for chord interval direction. Default: G (treble). */
    currentClef: ClefEnum;
    /** Whether the previous measure used in-accord (forces octave mark on next measure). */
    hadInAccord: boolean;
    /** Active slurs being tracked across voice entries (for emitting slur signs on intermediate notes). */
    activeSlurs: Set<Slur>;
    /** Pre-computed slur lengths (number of notes in each slur). Used to choose short vs bracket slurs. */
    slurLengths: Map<Slur, number>;
    /**
     * Active ottava bracket (8va/8vb/15ma/15mb) affecting the current passage.
     * When set in facsimile mode, note pitches are adjusted to staff (visual) pitch.
     * Set when an OctaveShift starts, cleared when it ends.
     */
    activeOctaveShift?: OctaveShift;
    /**
     * When true, chord intervals are always read upward regardless of clef.
     * Used in ensemble mode where all parts read intervals upward (Par. 33.4.2).
     */
    ensembleMode?: boolean;
    /**
     * Set of VoiceEntries that are continuation notes in a melisma (lyrics mode).
     * A melisma is when a single syllable is sung across multiple notes (Par. 35.2).
     * When a VoiceEntry is in this set, a syllabic slur sign (⠉) is emitted
     * after the note in the music line. Indicated by `<extend/>` in MusicXML.
     */
    melismaSlurNotes?: Set<VoiceEntry>;
}

/**
 * Result of rendering a single measure.
 */
export interface BrailleMeasureResult {
    /** The braille string for this measure (without surrounding barlines/spaces) */
    braille: string;
    /** Debug entries for all elements in this measure */
    debugEntries: BrailleNoteDebugInfo[];
    /** The measure number (1-based, from MusicXML) */
    measureNumber: number;
}

/**
 * Iterate VoiceEntries in a measure for a given staff, in beat order.
 * Handles all null-guard boilerplate for the OSMD container/staff/voice traversal.
 *
 * @param measure The SourceMeasure to traverse
 * @param staffIndex Which staff to read (0-based global index)
 * @param callback Called for each VoiceEntry array (all voices at one beat position)
 */
export function forEachVoiceEntryInMeasure(
    measure: SourceMeasure, staffIndex: number,
    callback: (voiceEntries: VoiceEntry[]) => void
): void {
    const containers: VerticalSourceStaffEntryContainer[] = measure.VerticalSourceStaffEntryContainers;
    for (const container of containers) {
        const staffEntries: SourceStaffEntry[] = container.StaffEntries;
        if (!staffEntries || staffIndex >= staffEntries.length) {
            continue;
        }
        const staffEntry: SourceStaffEntry = staffEntries[staffIndex];
        if (!staffEntry) {
            continue;
        }
        const voiceEntries: VoiceEntry[] = staffEntry.VoiceEntries;
        if (!voiceEntries || voiceEntries.length === 0) {
            continue;
        }
        callback(voiceEntries);
    }
}

/**
 * A voice group: all VoiceEntries belonging to a single Voice within a measure.
 */
interface VoiceGroup {
    /** The Voice object */
    voice: Voice;
    /** VoiceEntries for this voice, in beat order */
    entries: VoiceEntry[];
}

/**
 * Converts a single SourceMeasure to its braille representation.
 *
 * Handles single voice (M1-M3) and multiple voices (M4) on a single staff.
 * Multiple voices are rendered using full-measure in-accord signs.
 */
export class BrailleMeasureRenderer {
    private noteRenderer: BrailleNoteRenderer;
    private chordRenderer: BrailleChordRenderer;

    constructor() {
        this.noteRenderer = new BrailleNoteRenderer();
        this.chordRenderer = new BrailleChordRenderer();
    }

    /**
     * Render a single measure to braille.
     *
     * @param measure The SourceMeasure to convert
     * @param staffIndex Which staff to render (0-based)
     * @param state Persistent state across measures (octave tracking, etc.)
     * @returns BrailleMeasureResult with braille string and debug info
     */
    public render(measure: SourceMeasure, staffIndex: number, state: BrailleState): BrailleMeasureResult {
        const brailleParts: string[] = [];
        const debugEntries: BrailleNoteDebugInfo[] = [];

        // If previous measure used in-accord, force octave mark on this measure's first note
        if (state.hadInAccord) {
            state.octaveTracker.reset();
            state.hadInAccord = false;
        }

        // Clef: update state from FirstInstructionsStaffEntries (needed for chord interval direction).
        // In facsimile mode, clef rendering is handled by BrailleConverter.renderFacsimileClef()
        // using GraphicalMeasure.InitiallyActiveClef (which is authoritative — OSMD stores mid-score
        // clef changes on the previous measure's LastInstructionsStaffEntries, not the current one).
        if (!state.facsimile) {
            const firstInstructions: SourceStaffEntry | undefined = measure.FirstInstructionsStaffEntries[staffIndex];
            if (firstInstructions) {
                for (const instruction of firstInstructions.Instructions) {
                    if (instruction instanceof ClefInstruction) {
                        state.currentClef = (instruction as ClefInstruction).ClefType;
                    }
                }
            }
        }

        // Key signature: render if changed or first occurrence
        const keyInstruction: KeyInstruction | undefined = measure.getKeyInstruction(staffIndex);
        if (keyInstruction) {
            const keyChanged: boolean = !state.currentKey || state.currentKey.OperatorNotEqual(keyInstruction);
            if (keyChanged) {
                state.currentKey = keyInstruction;
                const keySigResult: BrailleKeySignatureResult = renderKeySignature(keyInstruction);
                if (keySigResult.braille) {
                    brailleParts.push(keySigResult.braille);
                    debugEntries.push(...keySigResult.debugEntries);
                }
            }
        }

        // Time signature: render if changed or first occurrence
        const timeSignature: Fraction | undefined = measure.ActiveTimeSignature;
        if (timeSignature) {
            const timeChanged: boolean = !state.currentRhythm ||
                state.currentRhythm.Numerator !== timeSignature.Numerator ||
                state.currentRhythm.Denominator !== timeSignature.Denominator;
            if (timeChanged) {
                state.currentRhythm = timeSignature;
                const timeSigResult: BrailleTimeSignatureResult = renderTimeSignature(timeSignature);
                if (timeSigResult.braille) {
                    brailleParts.push(timeSigResult.braille);
                    debugEntries.push(...timeSigResult.debugEntries);
                }
            }
        }

        // Volta endings (Par. 17.1.1: placed before the first sign of the measure)
        // Must come before forward repeat sign.
        const voltaResult: RepeatSignResult = this.renderVoltas(measure);
        if (voltaResult.braille) {
            brailleParts.push(voltaResult.braille);
            debugEntries.push(...voltaResult.debugEntries);
            // Par. 17.1.1: first note after volta requires octave mark
            state.octaveTracker.reset();
        }

        // Navigation signs at measure start: Segno and Coda markers
        const navStartResult: RepeatSignResult = this.renderNavigationStart(measure);
        if (navStartResult.braille) {
            brailleParts.push(navStartResult.braille);
            debugEntries.push(...navStartResult.debugEntries);
            // First note after navigation sign requires octave mark
            state.octaveTracker.reset();
        }

        // Forward repeat barline (Par. 17.1: part of the measure, before first note)
        if (this.hasForwardRepeat(measure)) {
            brailleParts.push(BRAILLE_FORWARD_REPEAT);
            debugEntries.push({
                braille: BRAILLE_FORWARD_REPEAT,
                meaning: "forward repeat",
            });
            // Par. 17.1: first note after repeat sign requires octave mark
            state.octaveTracker.reset();
        }

        // Collect dynamics and hairpins for this staff from StaffLinkedExpressions
        const dynamicEvents: DynamicEvent[] = this.collectDynamicEvents(measure, staffIndex);

        // Collect OctaveShift events (facsimile mode only — nonfacsimile ignores ottava)
        const ottavaEvents: OctaveShiftEvent[] = state.facsimile
            ? this.collectOctaveShiftEvents(measure, staffIndex) : [];

        // Group voice entries by voice
        const voiceGroups: VoiceGroup[] = this.groupVoiceEntries(measure, staffIndex);

        if (voiceGroups.length <= 1) {
            // Single voice: render normally (existing M1-M3 path)
            const allEntries: VoiceEntry[] = voiceGroups.length === 1 ? voiceGroups[0].entries : [];
            const result: BrailleNoteResult = this.renderVoiceEntries(allEntries, state, dynamicEvents, ottavaEvents);
            brailleParts.push(result.braille);
            debugEntries.push(...result.debugEntries);
        } else {
            // Multiple voices: render with full-measure in-accord signs
            // Dynamics and ottava events are only emitted with the first voice to avoid duplication
            const orderedGroups: VoiceGroup[] = this.orderVoices(voiceGroups, state.currentClef);

            for (let i: number = 0; i < orderedGroups.length; i++) {
                // Reset octave tracker before each voice (mandatory octave mark per Par. 11.1)
                state.octaveTracker.reset();

                const eventsForVoice: DynamicEvent[] = i === 0 ? dynamicEvents : [];
                const ottavaForVoice: OctaveShiftEvent[] = i === 0 ? ottavaEvents : [];
                const voiceResult: BrailleNoteResult =
                    this.renderVoiceEntries(orderedGroups[i].entries, state, eventsForVoice, ottavaForVoice);

                if (i > 0) {
                    // Insert in-accord sign before subsequent voices
                    brailleParts.push(BRAILLE_FULL_MEASURE_IN_ACCORD);
                    debugEntries.push({
                        braille: BRAILLE_FULL_MEASURE_IN_ACCORD,
                        meaning: "full-measure in-accord",
                    });
                }

                brailleParts.push(voiceResult.braille);
                debugEntries.push(...voiceResult.debugEntries);
            }

            // Flag for next measure: octave mark is mandatory after in-accord
            state.hadInAccord = true;
        }

        // Backward repeat barline (Par. 17.1: placed after the last sign of the measure)
        if (this.hasBackwardRepeat(measure)) {
            brailleParts.push(BRAILLE_BACKWARD_REPEAT);
            debugEntries.push({
                braille: BRAILLE_BACKWARD_REPEAT,
                meaning: "backward repeat",
            });
            // Par. 17.1: first note following either repeat sign requires octave mark
            state.octaveTracker.reset();
        }

        // Navigation signs at measure end: D.C., D.S., Fine, ToCoda, and compound forms
        const navEndResult: RepeatSignResult = this.renderNavigationEnd(measure);
        if (navEndResult.braille) {
            brailleParts.push(navEndResult.braille);
            debugEntries.push(...navEndResult.debugEntries);
            // First note after any navigation sign requires octave mark
            state.octaveTracker.reset();
        }

        return {
            braille: brailleParts.join(""),
            debugEntries: debugEntries,
            measureNumber: measure.MeasureNumber,
        };
    }

    /**
     * Group all VoiceEntries in a measure by their parent Voice.
     * Returns an array of VoiceGroups, one per voice, with entries in beat order.
     */
    private groupVoiceEntries(measure: SourceMeasure, staffIndex: number): VoiceGroup[] {
        const voiceMap: Map<number, VoiceGroup> = new Map();
        forEachVoiceEntryInMeasure(measure, staffIndex, (voiceEntries: VoiceEntry[]): void => {
            for (const ve of voiceEntries) {
                const voiceId: number = ve.ParentVoice.VoiceId;
                let group: VoiceGroup | undefined = voiceMap.get(voiceId);
                if (!group) {
                    group = { voice: ve.ParentVoice, entries: [] };
                    voiceMap.set(voiceId, group);
                }
                group.entries.push(ve);
            }
        });

        // Convert map to array, sorted by voice ID for deterministic ordering
        const groups: VoiceGroup[] = Array.from(voiceMap.values());
        groups.sort((a: VoiceGroup, b: VoiceGroup): number => a.voice.VoiceId - b.voice.VoiceId);
        return groups;
    }

    /**
     * Order voice groups for braille output.
     * Treble/C clef: highest voice first. Bass clef: lowest voice first.
     * "Highest/lowest" is determined by the first note's pitch in each voice.
     */
    private orderVoices(groups: VoiceGroup[], clefType: ClefEnum): VoiceGroup[] {
        // Find the first pitched note in each voice group for comparison
        const withPitch: Array<{ group: VoiceGroup, halfTone: number }> = [];
        for (const group of groups) {
            const firstPitch: number = this.getFirstPitchHalfTone(group);
            withPitch.push({ group: group, halfTone: firstPitch });
        }

        if (clefType === ClefEnum.F) {
            // Bass clef: lowest first
            withPitch.sort((a: { halfTone: number }, b: { halfTone: number }): number =>
                a.halfTone - b.halfTone);
        } else {
            // Treble/C clef: highest first
            withPitch.sort((a: { halfTone: number }, b: { halfTone: number }): number =>
                b.halfTone - a.halfTone);
        }

        return withPitch.map((item: { group: VoiceGroup }): VoiceGroup => item.group);
    }

    /**
     * Get the half-tone value of the first pitched note in a voice group.
     * Used for voice ordering. Returns 0 if no pitched notes found.
     */
    private getFirstPitchHalfTone(group: VoiceGroup): number {
        for (const ve of group.entries) {
            for (const note of ve.Notes) {
                if (note.Pitch) {
                    return note.Pitch.getHalfTone();
                }
            }
        }
        return 0;
    }

    /**
     * Render a sequence of VoiceEntries (from a single voice) to braille.
     * Each VoiceEntry is rendered as a single note or chord.
     * Dynamics and ottava events are interleaved by matching timestamps.
     *
     * Per Par. 22.3(e), a note following a word-sign expression (dynamic/ottava)
     * requires an octave mark, so we reset the octave tracker after emitting one.
     *
     * In facsimile mode, ottava events adjust note pitches to staff (visual) pitch
     * during the ottava passage. The start marker goes before the first affected note,
     * and the end marker goes after the last affected note (Par. 3.3.1).
     */
    private renderVoiceEntries(entries: VoiceEntry[], state: BrailleState,
                               dynamicEvents: DynamicEvent[] = [],
                               ottavaEvents: OctaveShiftEvent[] = []): BrailleNoteResult {
        const parts: string[] = [];
        const debugEntries: BrailleNoteDebugInfo[] = [];

        // Track which dynamic and ottava events have been emitted
        let dynIndex: number = 0;
        let ottavaIndex: number = 0;

        for (const voiceEntry of entries) {
            const notes: Note[] = voiceEntry.Notes;
            const entryTimestamp: number = voiceEntry.Timestamp ? voiceEntry.Timestamp.RealValue : 0;

            // Emit any dynamics that occur at or before this note's timestamp
            while (dynIndex < dynamicEvents.length &&
                   dynamicEvents[dynIndex].timestamp <= entryTimestamp + 0.0001) {
                const dynEvent: DynamicEvent = dynamicEvents[dynIndex];
                parts.push(dynEvent.braille);
                debugEntries.push(...dynEvent.debugEntries);
                // Par. 22.3(e): octave mark required after word-sign expression
                state.octaveTracker.reset();
                dynIndex++;
            }

            // Emit ottava events (start/end) at or before this note's timestamp
            while (ottavaIndex < ottavaEvents.length &&
                   ottavaEvents[ottavaIndex].timestamp <= entryTimestamp + 0.0001) {
                const ottEvent: OctaveShiftEvent = ottavaEvents[ottavaIndex];
                if (ottEvent.kind === "end") {
                    // Ottava ends: emit end marker, clear active shift
                    parts.push(BRAILLE_OTTAVA_END);
                    debugEntries.push({ braille: BRAILLE_OTTAVA_END, meaning: "end ottava" });
                    state.activeOctaveShift = undefined;
                    state.octaveTracker.reset();
                } else {
                    // Ottava starts: emit word expression, set active shift
                    const ottBraille: string = getOttavaBraille(ottEvent.shift.Type);
                    const ottName: string = getOttavaName(ottEvent.shift.Type);
                    if (ottBraille) {
                        parts.push(ottBraille);
                        debugEntries.push({ braille: ottBraille, meaning: ottName });
                        state.activeOctaveShift = ottEvent.shift;
                        // Word-sign expression: octave mark required on following note
                        state.octaveTracker.reset();
                    }
                }
                ottavaIndex++;
            }

            // Bracket slur open: emit before the first note of a long slur (> 4 notes)
            const bracketOpenResult: RepeatSignResult = this.handleBracketSlurOpen(notes, state);
            if (bracketOpenResult.braille) {
                parts.push(bracketOpenResult.braille);
                debugEntries.push(...bracketOpenResult.debugEntries);
            }

            // In facsimile with active ottava, adjust pitches to staff (visual) pitch.
            // We create adjusted pitch references for the renderers to use.
            const pitchOverride: Pitch | undefined = this.getOttavaPitchOverride(notes[0], state);

            if (notes.length === 1) {
                // Single note — pass voiceEntry for articulation/ornament data
                const noteResult: BrailleNoteResult =
                    this.noteRenderer.render(notes[0], state.octaveTracker, voiceEntry, pitchOverride);
                parts.push(noteResult.braille);
                debugEntries.push(...noteResult.debugEntries);
            } else if (notes.length > 1) {
                // Chord — articulations/ornaments handled via voiceEntry in chord renderer
                const chordResult: BrailleNoteResult =
                    this.chordRenderer.render(notes, state.currentClef, state.octaveTracker, voiceEntry,
                                              state.activeOctaveShift, state.ensembleMode);
                parts.push(chordResult.braille);
                debugEntries.push(...chordResult.debugEntries);
            }

            // Syllabic slur for melisma in lyrics mode (Par. 35.2)
            if (state.melismaSlurNotes && state.melismaSlurNotes.has(voiceEntry)) {
                parts.push(BRAILLE_SYLLABIC_SLUR);
                debugEntries.push({ braille: BRAILLE_SYLLABIC_SLUR, meaning: "syllabic slur (melisma)" });
            }

            // Slur tracking and rendering (Par. 13.2)
            // In nonfacsimile, slurs concurrent with ties are omitted (Par. 13.5).
            const slurResult: RepeatSignResult = this.handleSlurs(notes, state);
            if (slurResult.braille) {
                parts.push(slurResult.braille);
                debugEntries.push(...slurResult.debugEntries);
            }
        }

        // Emit any remaining dynamics after the last note
        while (dynIndex < dynamicEvents.length) {
            const dynEvent: DynamicEvent = dynamicEvents[dynIndex];
            parts.push(dynEvent.braille);
            debugEntries.push(...dynEvent.debugEntries);
            dynIndex++;
        }

        // Emit any remaining ottava end events after the last note
        while (ottavaIndex < ottavaEvents.length) {
            const ottEvent: OctaveShiftEvent = ottavaEvents[ottavaIndex];
            if (ottEvent.kind === "end") {
                parts.push(BRAILLE_OTTAVA_END);
                debugEntries.push({ braille: BRAILLE_OTTAVA_END, meaning: "end ottava" });
                state.activeOctaveShift = undefined;
            } else {
                // Ottava starting after last note in measure — set state for next measure
                const ottBraille: string = getOttavaBraille(ottEvent.shift.Type);
                const ottName: string = getOttavaName(ottEvent.shift.Type);
                if (ottBraille) {
                    parts.push(ottBraille);
                    debugEntries.push({ braille: ottBraille, meaning: ottName });
                    state.activeOctaveShift = ottEvent.shift;
                }
            }
            ottavaIndex++;
        }

        return {
            braille: parts.join(""),
            debugEntries: debugEntries,
        };
    }

    /**
     * Handle slur sign emission for the current voice entry's notes.
     * Tracks active slurs in state, emits slur sign after each note except the last
     * in a slurred phrase (Par. 13.2). Slurs concurrent with ties are omitted in
     * nonfacsimile (Par. 13.5).
     */
    private handleSlurs(notes: Note[], state: BrailleState): RepeatSignResult {
        const parts: string[] = [];
        const debugEntries: BrailleNoteDebugInfo[] = [];
        const primaryNote: Note = notes[0];

        // Check if any note in this voice entry starts a new slur
        for (const note of notes) {
            if (note.NoteSlurs) {
                for (const slur of note.NoteSlurs) {
                    if (slur.StartNote === note) {
                        state.activeSlurs.add(slur);
                    }
                }
            }
        }

        // Check if any active slur ends on this note
        const endingSlurs: Slur[] = [];
        for (const slur of state.activeSlurs) {
            for (const note of notes) {
                if (slur.EndNote === note) {
                    endingSlurs.push(slur);
                }
            }
        }

        // Determine if we should emit a slur sign:
        // Emit if there are active slurs AND this note is NOT the last note of all active slurs
        const hasActiveSlur: boolean = state.activeSlurs.size > 0;
        const allSlursEnding: boolean = endingSlurs.length > 0 && endingSlurs.length >= state.activeSlurs.size;

        // Determine if ALL active slurs are short (≤4 notes)
        const hasShortSlur: boolean = this.hasActiveShortSlur(state);

        if (hasActiveSlur && !allSlursEnding && hasShortSlur) {
            // Short slur (≤4 notes): emit slur sign after each note except the last (Par. 13.2)
            // Par. 13.5: In nonfacsimile, omit slur when note also has a tie
            const hasTie: boolean = primaryNote.NoteTie !== undefined &&
                primaryNote.NoteTie.StartNote === primaryNote;
            if (!state.facsimile && hasTie) {
                // Slur omitted — tie takes precedence
            } else {
                parts.push(BRAILLE_SLUR);
                debugEntries.push({
                    braille: BRAILLE_SLUR,
                    meaning: "slur",
                });
            }
        }
        // Long slurs (>4 notes) use bracket slurs: open was emitted before first note,
        // close is emitted after the last note (when all slurs end)

        // Emit bracket slur close for ending long slurs
        for (const slur of endingSlurs) {
            const slurLength: number = state.slurLengths.get(slur) ?? 0;
            if (slurLength > 4) {
                parts.push(BRAILLE_BRACKET_SLUR_CLOSE);
                debugEntries.push({
                    braille: BRAILLE_BRACKET_SLUR_CLOSE,
                    meaning: "bracket slur close",
                });
            }
        }

        // Remove ending slurs from active set
        for (const slur of endingSlurs) {
            state.activeSlurs.delete(slur);
        }

        return {
            braille: parts.join(""),
            debugEntries: debugEntries,
        };
    }

    /**
     * Check if any active slur is a short slur (≤4 notes).
     * Used to decide whether to emit per-note short slur signs.
     */
    private hasActiveShortSlur(state: BrailleState): boolean {
        for (const slur of state.activeSlurs) {
            const length: number = state.slurLengths.get(slur) ?? 0;
            if (length <= 4 && length > 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a measure starts with a forward repeat barline (StartLine instruction).
     */
    private hasForwardRepeat(measure: SourceMeasure): boolean {
        for (const instr of measure.FirstRepetitionInstructions) {
            if (instr.type === RepetitionInstructionEnum.StartLine) {
                // Skip virtual "overall repetition" markers created by RepetitionCalculator
                if (instr.parentRepetition && instr.parentRepetition.FromWords) {
                    continue;
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a measure ends with a backward repeat barline (BackJumpLine instruction).
     */
    private hasBackwardRepeat(measure: SourceMeasure): boolean {
        for (const instr of measure.LastRepetitionInstructions) {
            if (instr.type === RepetitionInstructionEnum.BackJumpLine) {
                return true;
            }
        }
        return false;
    }

    /**
     * Render volta (alternate ending) signs for a measure.
     * Returns empty result if no volta begins at this measure.
     * Par. 17.1.1: volta sign = number sign + ending number.
     * If the following sign contains dot 1, 2, or 3, a dot 3 separator is added.
     */
    private renderVoltas(measure: SourceMeasure): RepeatSignResult {
        const parts: string[] = [];
        const debugEntries: BrailleNoteDebugInfo[] = [];

        for (const instr of measure.FirstRepetitionInstructions) {
            if (instr.type === RepetitionInstructionEnum.Ending &&
                instr.alignment === AlignmentType.Begin &&
                instr.endingIndices && instr.endingIndices.length > 0) {
                // Render each ending number
                for (const endingNum of instr.endingIndices) {
                    const voltaBraille: string = getVoltaBraille(endingNum);
                    if (voltaBraille) {
                        parts.push(voltaBraille);
                        debugEntries.push({
                            braille: voltaBraille,
                            meaning: "volta " + endingNum,
                        });
                    }
                }
                // Par. 17.1.1: if the following sign contains dot 1, 2, or 3,
                // add a dot 3 separator. Key/time sigs and notes all contain lower dots,
                // so we add the separator by default for safety.
                parts.push(BRAILLE_AUGMENTATION_DOT);
                debugEntries.push({
                    braille: BRAILLE_AUGMENTATION_DOT,
                    meaning: "volta separator",
                });
            }
        }

        return {
            braille: parts.join(""),
            debugEntries: debugEntries,
        };
    }

    /**
     * Render navigation signs (Segno, Coda) that appear at the START of a measure.
     * Segno goes to FirstRepetitionInstructions. Coda can appear in either.
     */
    private renderNavigationStart(measure: SourceMeasure): RepeatSignResult {
        const parts: string[] = [];
        const debugEntries: BrailleNoteDebugInfo[] = [];
        const navTypes: Set<RepetitionInstructionEnum> = new Set([
            RepetitionInstructionEnum.Segno,
            RepetitionInstructionEnum.Coda,
        ]);

        for (const instr of measure.FirstRepetitionInstructions) {
            if (navTypes.has(instr.type)) {
                const braille: string = getNavigationBraille(instr.type);
                const name: string = getNavigationName(instr.type);
                if (braille) {
                    parts.push(braille);
                    debugEntries.push({ braille: braille, meaning: name });
                }
            }
        }

        return { braille: parts.join(""), debugEntries: debugEntries };
    }

    /**
     * Render navigation signs (D.C., D.S., Fine, ToCoda, compound forms) at the END of a measure.
     * These go to LastRepetitionInstructions.
     */
    private renderNavigationEnd(measure: SourceMeasure): RepeatSignResult {
        const parts: string[] = [];
        const debugEntries: BrailleNoteDebugInfo[] = [];
        const navTypes: Set<RepetitionInstructionEnum> = new Set([
            RepetitionInstructionEnum.Fine,
            RepetitionInstructionEnum.ToCoda,
            RepetitionInstructionEnum.DaCapo,
            RepetitionInstructionEnum.DalSegno,
            RepetitionInstructionEnum.DaCapoAlFine,
            RepetitionInstructionEnum.DalSegnoAlFine,
            RepetitionInstructionEnum.DaCapoAlCoda,
            RepetitionInstructionEnum.DalSegnoAlCoda,
            // Coda can also appear at measure end (destination marker)
            RepetitionInstructionEnum.Coda,
            RepetitionInstructionEnum.Segno,
        ]);

        for (const instr of measure.LastRepetitionInstructions) {
            if (navTypes.has(instr.type)) {
                const braille: string = getNavigationBraille(instr.type);
                const name: string = getNavigationName(instr.type);
                if (braille) {
                    parts.push(braille);
                    debugEntries.push({ braille: braille, meaning: name });
                }
            }
        }

        return { braille: parts.join(""), debugEntries: debugEntries };
    }

    /**
     * Check if a bracket slur should open before the current note.
     * Bracket slurs are used for slurred phrases of more than 4 notes (Par. 13.3).
     * The open sign (⠰⠃) is placed BEFORE the first note of the phrase.
     */
    private handleBracketSlurOpen(notes: Note[], state: BrailleState): RepeatSignResult {
        const parts: string[] = [];
        const debugEntries: BrailleNoteDebugInfo[] = [];

        for (const note of notes) {
            if (note.NoteSlurs) {
                for (const slur of note.NoteSlurs) {
                    if (slur.StartNote === note) {
                        const slurLength: number = state.slurLengths.get(slur) ?? 0;
                        if (slurLength > 4) {
                            parts.push(BRAILLE_BRACKET_SLUR_OPEN);
                            debugEntries.push({
                                braille: BRAILLE_BRACKET_SLUR_OPEN,
                                meaning: "bracket slur open",
                            });
                        }
                    }
                }
            }
        }

        return { braille: parts.join(""), debugEntries: debugEntries };
    }

    /**
     * Get an adjusted pitch for a note when an ottava is active in facsimile mode.
     * Returns the staff (visual) pitch if ottava is active, or undefined if no adjustment needed.
     * Uses OctaveShift.getPitchFromOctaveShift() to compute the visual pitch.
     */
    private getOttavaPitchOverride(note: Note, state: BrailleState): Pitch | undefined {
        if (!state.facsimile || !state.activeOctaveShift || !note || !note.Pitch) {
            return undefined;
        }
        return OctaveShift.getPitchFromOctaveShift(note.Pitch, state.activeOctaveShift.Type);
    }

    /**
     * Collect instantaneous dynamics and continuous dynamics (hairpins) for a staff
     * from SourceMeasure.StaffLinkedExpressions. Returns them sorted by timestamp.
     */
    private collectDynamicEvents(measure: SourceMeasure, staffIndex: number): DynamicEvent[] {
        const events: DynamicEvent[] = [];

        const expressionArrays: MultiExpression[][] = measure.StaffLinkedExpressions;
        if (!expressionArrays || staffIndex >= expressionArrays.length) {
            return events;
        }

        const expressions: MultiExpression[] = expressionArrays[staffIndex];
        if (!expressions) {
            return events;
        }

        for (const multiExpr of expressions) {
            const timestamp: number = multiExpr.Timestamp ? multiExpr.Timestamp.RealValue : 0;

            // Instantaneous dynamics (p, f, mf, etc.)
            if (multiExpr.InstantaneousDynamic) {
                const dynResult: BrailleExpressionResult =
                    renderDynamic(multiExpr.InstantaneousDynamic.DynEnum);
                if (dynResult.braille) {
                    events.push({
                        timestamp: timestamp,
                        braille: dynResult.braille,
                        debugEntries: dynResult.debugEntries,
                    });
                }
            }

            // Continuous dynamics (crescendo/diminuendo hairpins)
            if (multiExpr.StartingContinuousDynamic) {
                const contDyn: ContDynamicEnum = multiExpr.StartingContinuousDynamic.DynamicType;
                const hairpinBraille: string = contDyn === ContDynamicEnum.crescendo
                    ? BRAILLE_CRESC_HAIRPIN
                    : BRAILLE_DIM_HAIRPIN;
                const hairpinName: string = contDyn === ContDynamicEnum.crescendo
                    ? "crescendo" : "diminuendo";
                events.push({
                    timestamp: timestamp,
                    braille: hairpinBraille,
                    debugEntries: [{ braille: hairpinBraille, meaning: hairpinName }],
                });
            }
        }

        // Sort by timestamp
        events.sort((a: DynamicEvent, b: DynamicEvent): number => a.timestamp - b.timestamp);
        return events;
    }

    /**
     * Collect OctaveShift start/end events for a staff from StaffLinkedExpressions.
     * Only relevant in facsimile mode (nonfacsimile ignores ottava markings).
     * Returns events sorted by timestamp, with "end" events before "start" events
     * at the same timestamp (so loco is emitted before a new ottava begins).
     */
    private collectOctaveShiftEvents(measure: SourceMeasure, staffIndex: number): OctaveShiftEvent[] {
        const events: OctaveShiftEvent[] = [];

        const expressionArrays: MultiExpression[][] = measure.StaffLinkedExpressions;
        if (!expressionArrays || staffIndex >= expressionArrays.length) {
            return events;
        }

        const expressions: MultiExpression[] = expressionArrays[staffIndex];
        if (!expressions) {
            return events;
        }

        for (const multiExpr of expressions) {
            const timestamp: number = multiExpr.Timestamp ? multiExpr.Timestamp.RealValue : 0;

            if (multiExpr.OctaveShiftStart) {
                events.push({
                    timestamp: timestamp,
                    kind: "start",
                    shift: multiExpr.OctaveShiftStart,
                });
            }
            if (multiExpr.OctaveShiftEnd) {
                events.push({
                    timestamp: timestamp,
                    kind: "end",
                    shift: multiExpr.OctaveShiftEnd,
                });
            }
        }

        // Sort by timestamp; "end" before "start" at same timestamp
        events.sort((a: OctaveShiftEvent, b: OctaveShiftEvent): number => {
            if (a.timestamp !== b.timestamp) {
                return a.timestamp - b.timestamp;
            }
            // "end" (0) before "start" (1) at same timestamp
            return (a.kind === "end" ? 0 : 1) - (b.kind === "end" ? 0 : 1);
        });
        return events;
    }
}

/**
 * Result from rendering repeat/volta signs.
 */
interface RepeatSignResult {
    /** Braille string for the sign(s) */
    braille: string;
    /** Debug entries */
    debugEntries: BrailleNoteDebugInfo[];
}

/**
 * A dynamic event to be interleaved with note rendering.
 */
interface DynamicEvent {
    /** Timestamp within the measure (as real value fraction of a whole note) */
    timestamp: number;
    /** Braille string for this dynamic */
    braille: string;
    /** Debug entries */
    debugEntries: BrailleNoteDebugInfo[];
}

/**
 * An OctaveShift event (start or end) at a specific timestamp.
 * Used in facsimile mode to emit ottava word expressions and adjust pitches.
 */
interface OctaveShiftEvent {
    /** Timestamp within the measure */
    timestamp: number;
    /** "start" = ottava begins, "end" = ottava ends (loco) */
    kind: "start" | "end";
    /** The OctaveShift object (for type and pitch adjustment) */
    shift: OctaveShift;
}
