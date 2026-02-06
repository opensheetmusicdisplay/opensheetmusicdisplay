/* eslint-disable no-bitwise */
import { MusicSheet } from "../MusicSheet";
import { Note } from "../VoiceData/Note";
import { VoiceEntry, ArticulationEnum } from "../VoiceData/VoiceEntry";
import { Instrument } from "../Instrument";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { MidiInstrument } from "../VoiceData/Instructions/ClefInstruction";
import { DynamicEnum } from "../VoiceData/Expressions/InstantaneousDynamicExpression";
import { SourceMeasure } from "../VoiceData/SourceMeasure";
import { MultiExpression } from "../VoiceData/Expressions/MultiExpression";

/**
 * MIDI event types
 */
enum MidiEventType {
    NoteOff = 0x80,
    NoteOn = 0x90,
    ControlChange = 0xB0,
    ProgramChange = 0xC0,
    ChannelPressure = 0xD0,
    PitchBend = 0xE0,
    MetaEvent = 0xFF
}

/**
 * MIDI meta event types
 */
enum MidiMetaEventType {
    SequenceNumber = 0x00,
    TextEvent = 0x01,
    CopyrightNotice = 0x02,
    TrackName = 0x03,
    InstrumentName = 0x04,
    Lyrics = 0x05,
    Marker = 0x06,
    CuePoint = 0x07,
    ChannelPrefix = 0x20,
    EndOfTrack = 0x2F,
    SetTempo = 0x51,
    SMPTEOffset = 0x54,
    TimeSignature = 0x58,
    KeySignature = 0x59,
    SequencerSpecific = 0x7F
}

/**
 * MIDI Control Change numbers
 */
enum MidiControlChange {
    SustainPedal = 64,
    Sostenuto = 66,
    SoftPedal = 67,
    AllSoundOff = 120,
    AllNotesOff = 123
}

/**
 * Represents a scheduled note event with timing info
 */
interface ScheduledNoteEvent {
    absoluteTicks: number;
    midiPitch: number;
    velocity: number;
    channel: number;
    isNoteOn: boolean;
    trackIndex: number;
}

/**
 * Represents a scheduled control change event
 */
interface ScheduledControlEvent {
    absoluteTicks: number;
    channel: number;
    controller: number;
    value: number;
}

/**
 * Options for MIDI export
 */
export interface MidiExportOptions {
    /** Ticks per quarter note (default: 480) */
    ticksPerQuarterNote?: number;
    /** Default velocity for notes when no dynamics are specified (0-127, default: 80) */
    defaultVelocity?: number;
    /** Whether to include tempo changes (default: true) */
    includeTempoChanges?: boolean;
    /** Whether to include time signature changes (default: true) */
    includeTimeSignatures?: boolean;
    /** Whether to apply dynamics from the score (default: true) */
    applyDynamics?: boolean;
    /** Whether to apply articulations (staccato, accent, etc.) (default: true) */
    applyArticulations?: boolean;
    /** Whether to include pedal events (default: true) */
    includePedal?: boolean;
    /** Whether to include grace notes (default: true) */
    includeGraceNotes?: boolean;
    /**
     * Whether to expand repeats in the MIDI output (default: false).
     * When false, the MIDI contains only the written measures once (ignoring repeat signs).
     * When true, repeats would be expanded (NOT YET IMPLEMENTED - will behave as false).
     */
    expandRepeats?: boolean;
    /** Staccato note length multiplier (default: 0.5 = 50% of written duration) */
    staccatoLengthMultiplier?: number;
    /** Grace note duration in ticks (default: 60 = 1/8 of quarter note at 480 tpq) */
    graceNoteDuration?: number;
    /** Accent velocity boost (added to base velocity, default: 20) */
    accentVelocityBoost?: number;
    /** Creator/software name for the MIDI file */
    creatorName?: string;
}

/**
 * Maps DynamicEnum to MIDI velocity values (0-127)
 */
const DYNAMIC_TO_VELOCITY: Map<DynamicEnum, number> = new Map([
    [DynamicEnum.pppppp, 8],
    [DynamicEnum.ppppp, 12],
    [DynamicEnum.pppp, 16],
    [DynamicEnum.ppp, 24],
    [DynamicEnum.pp, 36],
    [DynamicEnum.p, 49],
    [DynamicEnum.mp, 64],
    [DynamicEnum.mf, 80],
    [DynamicEnum.f, 96],
    [DynamicEnum.ff, 112],
    [DynamicEnum.fff, 120],
    [DynamicEnum.ffff, 124],
    [DynamicEnum.fffff, 126],
    [DynamicEnum.ffffff, 127],
    // Accent dynamics - treat as forte with accent
    [DynamicEnum.sf, 112],
    [DynamicEnum.sff, 120],
    [DynamicEnum.sfp, 96],
    [DynamicEnum.sfpp, 80],
    [DynamicEnum.fp, 96],
    [DynamicEnum.rf, 100],
    [DynamicEnum.rfz, 112],
    [DynamicEnum.sfz, 120],
    [DynamicEnum.sffz, 127],
    [DynamicEnum.fz, 112],
    [DynamicEnum.other, 80]
]);

/**
 * MidiExporter converts a MusicSheet to a Standard MIDI File (SMF) format.
 * Exports as Format 1 (multi-track) MIDI file with support for:
 * - Multiple instruments/tracks
 * - Tempo and time signature changes
 * - Dynamic markings (pp, p, mp, mf, f, ff, etc.)
 * - Articulations (staccato, accent, tenuto)
 * - Grace notes
 * - Sustain pedal
 */
export class MidiExporter {
    private sheet: MusicSheet;
    private options: Required<MidiExportOptions>;
    private ticksPerQuarterNote: number;

    // Track current dynamics per staff (staffIndex -> velocity)
    private currentDynamics: Map<number, number> = new Map();

    constructor(sheet: MusicSheet, options: MidiExportOptions = {}) {
        this.sheet = sheet;
        this.ticksPerQuarterNote = options.ticksPerQuarterNote ?? 480;
        this.options = {
            ticksPerQuarterNote: this.ticksPerQuarterNote,
            defaultVelocity: options.defaultVelocity ?? 80,
            includeTempoChanges: options.includeTempoChanges ?? true,
            includeTimeSignatures: options.includeTimeSignatures ?? true,
            applyDynamics: options.applyDynamics ?? true,
            applyArticulations: options.applyArticulations ?? true,
            includePedal: options.includePedal ?? true,
            includeGraceNotes: options.includeGraceNotes ?? true,
            expandRepeats: options.expandRepeats ?? false, // Currently not implemented, always behaves as false
            staccatoLengthMultiplier: options.staccatoLengthMultiplier ?? 0.5,
            graceNoteDuration: options.graceNoteDuration ?? 60,
            accentVelocityBoost: options.accentVelocityBoost ?? 20,
            creatorName: options.creatorName ?? "OpenSheetMusicDisplay"
        };
    }

    /**
     * Export the music sheet as a MIDI file.
     * @returns Uint8Array containing the MIDI file data
     * @throws Error if export fails due to invalid sheet data
     */
    public export(): Uint8Array {
        try {
            if (!this.sheet) {
                throw new Error("No music sheet provided");
            }

            if (!this.sheet.SourceMeasures || this.sheet.SourceMeasures.length === 0) {
                throw new Error("Music sheet has no measures");
            }

            // Initialize dynamics tracking
            this.initializeDynamics();

            const tracks: Uint8Array[] = [];

            // Track 0: Tempo track (conductor track) with tempo, time signature, etc.
            tracks.push(this.createTempoTrack());

            // Create one track per instrument
            for (let i: number = 0; i < this.sheet.Instruments.length; i++) {
                const instrument: Instrument = this.sheet.Instruments[i];
                if (instrument?.Visible) {
                    try {
                        tracks.push(this.createInstrumentTrack(instrument, i));
                    } catch (trackError) {
                        console.warn(`[MidiExporter] Failed to create track for instrument ${i}: ${trackError}`);
                        // Continue with other instruments
                    }
                }
            }

            if (tracks.length === 0) {
                throw new Error("No tracks could be created from the music sheet");
            }

            // Build the complete MIDI file
            return this.buildMidiFile(tracks);
        } catch (error) {
            console.error("[MidiExporter] Export failed:", error);
            throw error;
        }
    }

    /**
     * Export and trigger a download of the MIDI file
     * @param filename The filename for the download (default: based on sheet title)
     */
    public exportAndDownload(filename?: string): void {
        const midiData: Uint8Array = this.export();
        const blob: Blob = new Blob([midiData as BlobPart], { type: "audio/midi" });
        const url: string = URL.createObjectURL(blob);

        const defaultFilename: string = this.getDefaultFilename();
        const finalFilename: string = filename ?? defaultFilename;

        const a: HTMLAnchorElement = document.createElement("a");
        a.href = url;
        a.download = finalFilename.endsWith(".mid") ? finalFilename : finalFilename + ".mid";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Initialize dynamics tracking for all staves
     */
    private initializeDynamics(): void {
        this.currentDynamics.clear();

        // Set default dynamics for all instruments
        for (let i: number = 0; i < this.sheet.Instruments.length; i++) {
            const instrument: Instrument = this.sheet.Instruments[i];
            for (const staff of instrument.Staves) {
                this.currentDynamics.set(staff.idInMusicSheet, this.options.defaultVelocity);
            }
        }

        // Pre-scan for initial dynamics at the beginning of the piece
        if (this.sheet.SourceMeasures.length > 0) {
            const firstMeasure: SourceMeasure = this.sheet.SourceMeasures[0];
            this.processDynamicsInMeasure(firstMeasure, new Fraction(0, 1));
        }
    }

    /**
     * Process dynamics in a measure and update current dynamics state
     */
    private processDynamicsInMeasure(measure: SourceMeasure, upToTimestamp: Fraction): void {
        for (let staffIdx: number = 0; staffIdx < measure.StaffLinkedExpressions.length; staffIdx++) {
            const expressions: MultiExpression[] = measure.StaffLinkedExpressions[staffIdx];
            for (const expr of expressions) {
                // Only process expressions up to the given timestamp
                if (expr.Timestamp.RealValue <= upToTimestamp.RealValue + Fraction.FloatInaccuracyTolerance) {
                    if (expr.InstantaneousDynamic) {
                        const dynEnum: DynamicEnum = expr.InstantaneousDynamic.DynEnum;
                        const velocity: number = DYNAMIC_TO_VELOCITY.get(dynEnum) ?? this.options.defaultVelocity;
                        this.currentDynamics.set(staffIdx, velocity);
                    }
                }
            }
        }
    }

    /**
     * Get current velocity for a staff, considering dynamics
     */
    private getVelocityForStaff(staffIndex: number): number {
        if (!this.options.applyDynamics) {
            return this.options.defaultVelocity;
        }
        return this.currentDynamics.get(staffIndex) ?? this.options.defaultVelocity;
    }

    /**
     * Apply articulation modifications to velocity and duration
     */
    private applyArticulations(
        voiceEntry: VoiceEntry,
        baseVelocity: number,
        baseDurationTicks: number
    ): { velocity: number, durationTicks: number } {
        let velocity: number = baseVelocity;
        let durationTicks: number = baseDurationTicks;

        if (!this.options.applyArticulations) {
            return { velocity, durationTicks };
        }

        for (const articulation of voiceEntry.Articulations) {
            switch (articulation.articulationEnum) {
                case ArticulationEnum.staccato:
                case ArticulationEnum.staccatissimo:
                case ArticulationEnum.spiccato:
                    // Shorten note duration
                    durationTicks = Math.round(durationTicks * this.options.staccatoLengthMultiplier);
                    break;

                case ArticulationEnum.accent:
                case ArticulationEnum.strongaccent:
                case ArticulationEnum.marcatoup:
                case ArticulationEnum.marcatodown:
                    // Boost velocity
                    velocity = Math.min(127, velocity + this.options.accentVelocityBoost);
                    break;

                case ArticulationEnum.tenuto:
                    // Full note length (no shortening), slight velocity boost
                    velocity = Math.min(127, velocity + 5);
                    break;

                case ArticulationEnum.softaccent:
                    // Slight velocity boost
                    velocity = Math.min(127, velocity + 10);
                    break;

                default:
                    // No modification for other articulations
                    break;
            }
        }

        // Ensure minimum duration
        durationTicks = Math.max(1, durationTicks);

        return { velocity, durationTicks };
    }

    /**
     * Get a default filename based on the sheet title
     */
    private getDefaultFilename(): string {
        let name: string = this.sheet.TitleString || "untitled";
        // Sanitize filename
        name = name.replace(/[<>:"/\\|?*]/g, "_").trim();
        return name + ".mid";
    }

    /**
     * Build the complete MIDI file from tracks
     */
    private buildMidiFile(tracks: Uint8Array[]): Uint8Array {
        // Calculate total size
        const headerSize: number = 14; // MThd + length(4) + format(2) + tracks(2) + division(2)
        let totalSize: number = headerSize;
        for (const track of tracks) {
            totalSize += 8 + track.length; // MTrk + length(4) + data
        }

        const buffer: Uint8Array = new Uint8Array(totalSize);
        let offset: number = 0;

        // Write header chunk
        // "MThd"
        buffer[offset++] = 0x4D; // M
        buffer[offset++] = 0x54; // T
        buffer[offset++] = 0x68; // h
        buffer[offset++] = 0x64; // d

        // Header length (always 6)
        offset = this.writeUint32(buffer, offset, 6);

        // Format type (1 = multi-track)
        offset = this.writeUint16(buffer, offset, 1);

        // Number of tracks
        offset = this.writeUint16(buffer, offset, tracks.length);

        // Division (ticks per quarter note)
        offset = this.writeUint16(buffer, offset, this.ticksPerQuarterNote);

        // Write track chunks
        for (const track of tracks) {
            // "MTrk"
            buffer[offset++] = 0x4D; // M
            buffer[offset++] = 0x54; // T
            buffer[offset++] = 0x72; // r
            buffer[offset++] = 0x6B; // k

            // Track length
            offset = this.writeUint32(buffer, offset, track.length);

            // Track data
            buffer.set(track, offset);
            offset += track.length;
        }

        return buffer;
    }

    /**
     * Create the tempo/conductor track (track 0)
     */
    private createTempoTrack(): Uint8Array {
        const events: number[] = [];

        // Track name
        const trackName: string = this.sheet.TitleString || "Tempo Track";
        this.addMetaEvent(events, 0, MidiMetaEventType.TrackName, this.stringToBytes(trackName));

        // Copyright if available
        if (this.sheet.CopyrightString) {
            this.addMetaEvent(events, 0, MidiMetaEventType.CopyrightNotice, this.stringToBytes(this.sheet.CopyrightString));
        }

        // Creator/software text
        this.addMetaEvent(events, 0, MidiMetaEventType.TextEvent, this.stringToBytes(`Created by ${this.options.creatorName}`));

        // Initial time signature
        if (this.options.includeTimeSignatures && this.sheet.SourceMeasures.length > 0) {
            const firstMeasure: SourceMeasure = this.sheet.SourceMeasures[0];
            if (firstMeasure.ActiveTimeSignature) {
                this.addTimeSignatureEvent(events, 0, firstMeasure.ActiveTimeSignature);
            }
        }

        // Initial tempo
        if (this.options.includeTempoChanges) {
            const initialTempo: number = this.sheet.getExpressionsStartTempoInBPM() || 120;
            this.addTempoEvent(events, 0, initialTempo);
        }

        // Process tempo changes throughout the score
        if (this.options.includeTempoChanges) {
            let lastTempo: number = this.sheet.getExpressionsStartTempoInBPM() || 120;
            let lastTimeSignature: Fraction | null = this.sheet.SourceMeasures[0]?.ActiveTimeSignature || null;

            for (const measure of this.sheet.SourceMeasures) {
                const measureStartTicks: number = this.fractionToTicks(measure.AbsoluteTimestamp);

                // Check for tempo expressions in this measure
                for (const tempoExpr of measure.TempoExpressions) {
                    if (tempoExpr.InstantaneousTempo) {
                        const newTempo: number = tempoExpr.InstantaneousTempo.TempoInBpm;
                        if (Math.abs(newTempo - lastTempo) > 0.1) {
                            const tempoTicks: number = this.fractionToTicks(tempoExpr.AbsoluteTimestamp);
                            this.addTempoEvent(events, tempoTicks, newTempo);
                            lastTempo = newTempo;
                        }
                    }
                }

                // Check for time signature changes
                if (this.options.includeTimeSignatures && measure.ActiveTimeSignature) {
                    if (!lastTimeSignature ||
                        measure.ActiveTimeSignature.Numerator !== lastTimeSignature.Numerator ||
                        measure.ActiveTimeSignature.Denominator !== lastTimeSignature.Denominator) {
                        this.addTimeSignatureEvent(events, measureStartTicks, measure.ActiveTimeSignature);
                        lastTimeSignature = measure.ActiveTimeSignature;
                    }
                }
            }
        }

        // End of track
        const lastMeasure: SourceMeasure | undefined =
            this.sheet.SourceMeasures[this.sheet.SourceMeasures.length - 1];
        const endTicks: number = lastMeasure ?
            this.fractionToTicks(Fraction.plus(lastMeasure.AbsoluteTimestamp, lastMeasure.Duration)) : 0;
        this.addMetaEvent(events, endTicks, MidiMetaEventType.EndOfTrack, []);

        return this.convertToTrackWithDeltas(events);
    }

    /**
     * Create a track for an instrument
     */
    private createInstrumentTrack(instrument: Instrument, instrumentIndex: number): Uint8Array {
        const events: number[] = [];
        const channel: number = this.getChannelForInstrument(instrumentIndex);

        // Track name
        const trackName: string = instrument.Name || `Instrument ${instrumentIndex + 1}`;
        this.addMetaEvent(events, 0, MidiMetaEventType.TrackName, this.stringToBytes(trackName));

        // Program change (instrument selection)
        const midiProgram: number = this.getMidiProgram(instrument);
        this.addProgramChange(events, 0, channel, midiProgram);

        // Collect all note events and control events
        const noteEvents: ScheduledNoteEvent[] = [];
        const controlEvents: ScheduledControlEvent[] = [];

        // Get staff indices for this instrument
        const staffIndices: number[] = instrument.Staves.map(s => s.idInMusicSheet);

        // Process each measure
        for (const measure of this.sheet.SourceMeasures) {
            // Update dynamics state for this measure
            for (const staffIdx of staffIndices) {
                if (staffIdx < measure.StaffLinkedExpressions.length) {
                    const expressions: MultiExpression[] = measure.StaffLinkedExpressions[staffIdx];
                    for (const expr of expressions) {
                        const exprTicks: number = this.fractionToTicks(expr.AbsoluteTimestamp);

                        // Process instantaneous dynamics
                        if (expr.InstantaneousDynamic) {
                            const dynEnum: DynamicEnum = expr.InstantaneousDynamic.DynEnum;
                            const velocity: number = DYNAMIC_TO_VELOCITY.get(dynEnum) ?? this.options.defaultVelocity;
                            this.currentDynamics.set(staffIdx, velocity);
                        }

                        // Process pedal events
                        if (this.options.includePedal) {
                            if (expr.PedalStart) {
                                controlEvents.push({
                                    absoluteTicks: exprTicks,
                                    channel: channel,
                                    controller: MidiControlChange.SustainPedal,
                                    value: 127 // Pedal down
                                });
                            }
                            if (expr.PedalEnd) {
                                controlEvents.push({
                                    absoluteTicks: exprTicks,
                                    channel: channel,
                                    controller: MidiControlChange.SustainPedal,
                                    value: 0 // Pedal up
                                });
                            }
                        }
                    }
                }
            }
        }

        // Process notes from voices
        for (const voice of instrument.Voices) {
            if (!voice.Visible) {
                continue;
            }

            for (const voiceEntry of voice.VoiceEntries) {
                // Get staff index for this voice entry
                const staffIdx: number = voiceEntry.ParentSourceStaffEntry?.ParentStaff?.idInMusicSheet ?? 0;

                this.processVoiceEntry(voiceEntry, channel, instrumentIndex, staffIdx, noteEvents);
            }
        }

        // Sort note events by absolute time, then by note-off before note-on
        noteEvents.sort((a, b) => {
            if (a.absoluteTicks !== b.absoluteTicks) {
                return a.absoluteTicks - b.absoluteTicks;
            }
            // Note-offs should come before note-ons at the same time
            if (a.isNoteOn !== b.isNoteOn) {
                return a.isNoteOn ? 1 : -1;
            }
            return a.midiPitch - b.midiPitch;
        });

        // Sort control events by time
        controlEvents.sort((a, b) => a.absoluteTicks - b.absoluteTicks);

        // Merge note and control events, maintaining time order
        let noteIdx: number = 0;
        let ctrlIdx: number = 0;

        while (noteIdx < noteEvents.length || ctrlIdx < controlEvents.length) {
            const noteEvent: ScheduledNoteEvent | undefined = noteEvents[noteIdx];
            const ctrlEvent: ScheduledControlEvent | undefined = controlEvents[ctrlIdx];

            if (!ctrlEvent || (noteEvent && noteEvent.absoluteTicks <= ctrlEvent.absoluteTicks)) {
                // Add note event
                if (noteEvent.isNoteOn) {
                    this.addNoteOn(events, noteEvent.absoluteTicks, noteEvent.channel, noteEvent.midiPitch, noteEvent.velocity);
                } else {
                    this.addNoteOff(events, noteEvent.absoluteTicks, noteEvent.channel, noteEvent.midiPitch);
                }
                noteIdx++;
            } else {
                // Add control event
                this.addControlChange(events, ctrlEvent.absoluteTicks, ctrlEvent.channel, ctrlEvent.controller, ctrlEvent.value);
                ctrlIdx++;
            }
        }

        // End of track
        const lastTicks: number = noteEvents.length > 0 ?
            noteEvents[noteEvents.length - 1].absoluteTicks + this.ticksPerQuarterNote : 0;
        this.addMetaEvent(events, lastTicks, MidiMetaEventType.EndOfTrack, []);

        return this.convertToTrackWithDeltas(events);
    }

    /**
     * Process a voice entry and add its notes to the event list
     */
    private processVoiceEntry(
        voiceEntry: VoiceEntry,
        channel: number,
        trackIndex: number,
        staffIndex: number,
        noteEvents: ScheduledNoteEvent[]
    ): void {
        if (!voiceEntry) {
            return;
        }

        const timestamp: Fraction | undefined = voiceEntry.Timestamp;
        if (!timestamp) {
            return;
        }

        const sourceMeasure: SourceMeasure | undefined =
            voiceEntry.ParentSourceStaffEntry?.VerticalContainerParent?.ParentMeasure;

        if (!sourceMeasure || !sourceMeasure.AbsoluteTimestamp) {
            return;
        }

        // Handle grace notes
        if (voiceEntry.IsGrace) {
            if (!this.options.includeGraceNotes) {
                return;
            }
            this.processGraceNotes(voiceEntry, channel, trackIndex, staffIndex, sourceMeasure, noteEvents);
            return;
        }

        const absoluteTimestamp: Fraction = Fraction.plus(sourceMeasure.AbsoluteTimestamp, timestamp);
        const startTicks: number = this.fractionToTicks(absoluteTimestamp);

        // Get base velocity from current dynamics
        const baseVelocity: number = this.getVelocityForStaff(staffIndex);

        const notes: Note[] = voiceEntry.Notes;
        if (!notes || notes.length === 0) {
            return;
        }

        for (const note of notes) {
            try {
                if (!note || note.isRest() || !note.Pitch) {
                    continue;
                }

                // Handle tied notes - only play the first note of a tie
                if (note.NoteTie && note.NoteTie.StartNote !== note) {
                    continue;
                }

                // Calculate note duration (including ties)
                let noteDuration: Fraction = note.Length;
                if (!noteDuration) {
                    continue;
                }

                if (note.NoteTie && note.NoteTie.Notes) {
                    // Sum up all tied note durations
                    noteDuration = new Fraction(0, 1);
                    for (const tiedNote of note.NoteTie.Notes) {
                        if (tiedNote?.Length) {
                            noteDuration = Fraction.plus(noteDuration, tiedNote.Length);
                        }
                    }
                }

                let durationTicks: number = this.fractionToTicks(noteDuration);
                if (durationTicks <= 0) {
                    durationTicks = 1; // Minimum duration
                }

                const midiPitch: number = this.pitchToMidiNote(note);
                if (midiPitch < 0 || midiPitch > 127) {
                    continue; // Invalid MIDI pitch
                }

                // Apply articulations (modifies velocity and duration)
                const articulated: { velocity: number, durationTicks: number } =
                    this.applyArticulations(voiceEntry, baseVelocity, durationTicks);
                const velocity: number = Math.max(1, Math.min(127, articulated.velocity));
                durationTicks = Math.max(1, articulated.durationTicks);

                // Add note-on event
                noteEvents.push({
                    absoluteTicks: startTicks,
                    midiPitch,
                    velocity,
                    channel,
                    isNoteOn: true,
                    trackIndex
                });

                // Add note-off event
                noteEvents.push({
                    absoluteTicks: startTicks + durationTicks,
                    midiPitch,
                    velocity: 0,
                    channel,
                    isNoteOn: false,
                    trackIndex
                });
            } catch (noteError) {
                // Skip problematic notes but continue processing
                console.warn(`[MidiExporter] Skipping note due to error: ${noteError}`);
            }
        }
    }

    /**
     * Process grace notes
     */
    private processGraceNotes(
        voiceEntry: VoiceEntry,
        channel: number,
        trackIndex: number,
        staffIndex: number,
        sourceMeasure: SourceMeasure,
        noteEvents: ScheduledNoteEvent[]
    ): void {
        const timestamp: Fraction = voiceEntry.Timestamp;
        const absoluteTimestamp: Fraction = Fraction.plus(sourceMeasure.AbsoluteTimestamp, timestamp);
        let startTicks: number = this.fractionToTicks(absoluteTimestamp);

        // Grace notes are played slightly before the main note
        // Acciaccatura (with slash) - very short, played "on" the beat but stealing time
        // Appoggiatura (without slash) - takes time from the following note
        const graceNoteDuration: number = this.options.graceNoteDuration;

        // If grace notes come after main note (at end of measure), play them at their position
        // Otherwise, shift them slightly before
        if (!voiceEntry.GraceAfterMainNote) {
            // Shift grace notes to play before the beat
            const graceNoteCount: number = voiceEntry.Notes.filter(n => !n.isRest() && n.Pitch).length;
            startTicks = Math.max(0, startTicks - graceNoteDuration * graceNoteCount);
        }

        const baseVelocity: number = this.getVelocityForStaff(staffIndex);
        // Grace notes typically slightly softer
        const graceVelocity: number = Math.max(1, baseVelocity - 10);

        let graceOffset: number = 0;
        for (const note of voiceEntry.Notes) {
            if (note.isRest() || !note.Pitch) {
                continue;
            }

            const midiPitch: number = this.pitchToMidiNote(note);
            const noteStartTicks: number = startTicks + graceOffset;

            noteEvents.push({
                absoluteTicks: noteStartTicks,
                midiPitch,
                velocity: graceVelocity,
                channel,
                isNoteOn: true,
                trackIndex
            });

            noteEvents.push({
                absoluteTicks: noteStartTicks + graceNoteDuration,
                midiPitch,
                velocity: 0,
                channel,
                isNoteOn: false,
                trackIndex
            });

            graceOffset += graceNoteDuration;
        }
    }

    /**
     * Convert pitch to MIDI note number
     * MIDI note 60 = Middle C = C4
     */
    private pitchToMidiNote(note: Note): number {
        if (!note.Pitch) {
            return 60; // Default to middle C
        }

        // OSMD halfTone is an octave lower, so when creating the midi we kinda
        // need to compensate!
        return note.halfTone + 12;
    }

    /**
     * Get the MIDI channel for an instrument (0-15, channel 10 reserved for drums)
     */
    private getChannelForInstrument(instrumentIndex: number): number {
        const instrument: Instrument = this.sheet.Instruments[instrumentIndex];
        const midiInstrument: MidiInstrument = instrument.MidiInstrumentId;

        // Channel 10 (index 9) is reserved for drums/percussion
        if (midiInstrument === MidiInstrument.Percussion) {
            return 9;
        }

        // Use instrument index, skipping channel 10
        let channel: number = instrumentIndex;
        if (channel >= 9) {
            channel++;
        }
        return channel % 16;
    }

    /**
     * Get the MIDI program number (0-127) for an instrument
     */
    private getMidiProgram(instrument: Instrument): number {
        const midiInstrument: MidiInstrument = instrument.MidiInstrumentId;
        // MidiInstrument enum values should map to GM program numbers
        return midiInstrument ?? 0;
    }

    /**
     * Convert a Fraction timestamp to MIDI ticks
     */
    private fractionToTicks(fraction: Fraction): number {
        // A quarter note = ticksPerQuarterNote ticks
        // fraction.RealValue gives the value in whole notes
        // So multiply by 4 to get quarter notes, then by ticksPerQuarterNote
        return Math.round(fraction.RealValue * 4 * this.ticksPerQuarterNote);
    }

    /**
     * Add a note-on event
     */
    private addNoteOn(events: number[], absoluteTicks: number, channel: number, pitch: number, velocity: number): void {
        events.push(absoluteTicks);
        events.push(MidiEventType.NoteOn | (channel & 0x0F));
        events.push(pitch & 0x7F);
        events.push(velocity & 0x7F);
    }

    /**
     * Add a note-off event
     */
    private addNoteOff(events: number[], absoluteTicks: number, channel: number, pitch: number): void {
        events.push(absoluteTicks);
        events.push(MidiEventType.NoteOff | (channel & 0x0F));
        events.push(pitch & 0x7F);
        events.push(0); // velocity 0 for note-off
    }

    /**
     * Add a program change event
     */
    private addProgramChange(events: number[], absoluteTicks: number, channel: number, program: number): void {
        events.push(absoluteTicks);
        events.push(MidiEventType.ProgramChange | (channel & 0x0F));
        events.push(program & 0x7F);
    }

    /**
     * Add a control change event
     */
    private addControlChange(events: number[], absoluteTicks: number, channel: number, controller: number, value: number): void {
        events.push(absoluteTicks);
        events.push(MidiEventType.ControlChange | (channel & 0x0F));
        events.push(controller & 0x7F);
        events.push(value & 0x7F);
    }

    /**
     * Add a tempo event (microseconds per quarter note)
     */
    private addTempoEvent(events: number[], absoluteTicks: number, bpm: number): void {
        const microsecondsPerQuarter: number = Math.round(60000000 / bpm);
        const data: number[] = [
            (microsecondsPerQuarter >> 16) & 0xFF,
            (microsecondsPerQuarter >> 8) & 0xFF,
            microsecondsPerQuarter & 0xFF
        ];
        this.addMetaEvent(events, absoluteTicks, MidiMetaEventType.SetTempo, data);
    }

    /**
     * Add a time signature event
     */
    private addTimeSignatureEvent(events: number[], absoluteTicks: number, timeSignature: Fraction): void {
        const numerator: number = timeSignature.Numerator;
        const denominator: number = timeSignature.Denominator;

        // MIDI uses power of 2 for denominator (e.g., 4 = 2^2 = 2, 8 = 2^3 = 3)
        const denominatorPower: number = Math.log2(denominator);
        const midiClocksPer24: number = 24; // MIDI clocks per metronome click
        const thirtySecondsPerQuarter: number = 8; // 32nd notes per quarter note

        const data: number[] = [
            numerator & 0xFF,
            denominatorPower & 0xFF,
            midiClocksPer24,
            thirtySecondsPerQuarter
        ];
        this.addMetaEvent(events, absoluteTicks, MidiMetaEventType.TimeSignature, data);
    }

    /**
     * Add a meta event
     */
    private addMetaEvent(events: number[], absoluteTicks: number, type: MidiMetaEventType, data: number[]): void {
        events.push(absoluteTicks);
        events.push(MidiEventType.MetaEvent);
        events.push(type);
        // Add variable length data length
        const lengthBytes: number[] = this.toVariableLength(data.length);
        for (const b of lengthBytes) {
            events.push(b);
        }
        // Add data
        for (const b of data) {
            events.push(b);
        }
    }

    /**
     * Convert events with absolute times to track data with delta times
     */
    private convertToTrackWithDeltas(events: number[]): Uint8Array {
        const result: number[] = [];
        let lastTicks: number = 0;
        let i: number = 0;

        while (i < events.length) {
            const absoluteTicks: number = events[i++];
            const deltaTime: number = absoluteTicks - lastTicks;
            lastTicks = absoluteTicks;

            // Write variable-length delta time
            const deltaBytes: number[] = this.toVariableLength(deltaTime);
            for (const b of deltaBytes) {
                result.push(b);
            }

            // Write event type
            const eventType: number = events[i++];
            result.push(eventType);

            if (eventType === MidiEventType.MetaEvent) {
                // Meta event: type + length + data
                const metaType: number = events[i++];
                result.push(metaType);

                // Read variable-length data length
                let dataLength: number = 0;
                let shift: number = 0;
                while (i < events.length) {
                    const b: number = events[i++];
                    result.push(b);
                    dataLength |= (b & 0x7F) << shift;
                    if ((b & 0x80) === 0) {
                        break;
                    }
                    shift += 7;
                }

                // Copy data
                for (let j: number = 0; j < dataLength; j++) {
                    result.push(events[i++]);
                }
            } else if ((eventType & 0xF0) === MidiEventType.ProgramChange ||
                       (eventType & 0xF0) === MidiEventType.ChannelPressure) {
                // Single data byte events
                result.push(events[i++]);
            } else if ((eventType & 0xF0) >= MidiEventType.NoteOff &&
                       (eventType & 0xF0) <= MidiEventType.PitchBend) {
                // Two data byte events (note on/off, control change, pitch bend)
                result.push(events[i++]);
                result.push(events[i++]);
            }
        }

        return new Uint8Array(result);
    }

    /**
     * Convert a number to variable-length encoding
     */
    private toVariableLength(value: number): number[] {
        if (value < 0) {
            value = 0;
        }

        const result: number[] = [];
        result.push(value & 0x7F);
        value >>= 7;

        while (value > 0) {
            result.push((value & 0x7F) | 0x80);
            value >>= 7;
        }

        return result.reverse();
    }

    /**
     * Convert string to byte array
     */
    private stringToBytes(str: string): number[] {
        const bytes: number[] = [];
        for (let i: number = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i) & 0xFF);
        }
        return bytes;
    }

    /**
     * Write a 32-bit unsigned integer in big-endian format
     */
    private writeUint32(buffer: Uint8Array, offset: number, value: number): number {
        buffer[offset++] = (value >> 24) & 0xFF;
        buffer[offset++] = (value >> 16) & 0xFF;
        buffer[offset++] = (value >> 8) & 0xFF;
        buffer[offset++] = value & 0xFF;
        return offset;
    }

    /**
     * Write a 16-bit unsigned integer in big-endian format
     */
    private writeUint16(buffer: Uint8Array, offset: number, value: number): number {
        buffer[offset++] = (value >> 8) & 0xFF;
        buffer[offset++] = value & 0xFF;
        return offset;
    }
}
