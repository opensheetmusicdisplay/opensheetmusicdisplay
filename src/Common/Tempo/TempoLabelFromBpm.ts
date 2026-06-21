/**
 * Maps a quarter-note BPM to a conventional Italian tempo term.
 *
 * Ranges overlap (e.g. 100 BPM matches both Andante and Andantino). They are
 * scanned fastest-first and the first match is returned, so the faster term wins
 * on overlap.
 */
interface TempoRange {
    name: string;
    /** Inclusive lower bound (quarter-note BPM). */
    min: number;
    /** Inclusive upper bound. Omit for an open-ended top range (e.g. Prestissimo). */
    max?: number;
}

// Ordered fastest-first so the faster term wins when ranges overlap.
const tempoRanges: TempoRange[] = [
    { name: "Prestissimo", min: 200 },
    { name: "Presto", min: 168, max: 200 },
    { name: "Vivacissimo", min: 172, max: 176 },
    { name: "Vivace", min: 156, max: 176 },
    { name: "Allegro", min: 120, max: 156 },
    { name: "Allegretto", min: 112, max: 120 },
    { name: "Moderato", min: 108, max: 120 },
    { name: "Andantino", min: 80, max: 112 },
    { name: "Andante", min: 76, max: 108 },
    { name: "Adagietto", min: 70, max: 80 },
    { name: "Adagio", min: 66, max: 76 },
    { name: "Lento", min: 45, max: 60 },
    { name: "Largo", min: 40, max: 60 },
    { name: "Grave", min: 25, max: 45 },
    { name: "Larghissimo", min: 20, max: 24 },
];

/** Returns the tempo term for the given BPM, or undefined if it is outside all known ranges. */
export function tempoLabelFromBpm(bpm: number): string | undefined {
    if (!(bpm > 0)) {
        return undefined;
    }
    for (const range of tempoRanges) {
        if (bpm >= range.min && (range.max === undefined || bpm <= range.max)) {
            return range.name;
        }
    }
    // Below the slowest defined range: fall back to the slowest term so very low
    // BPMs still get a label rather than nothing.
    if (bpm < tempoRanges[tempoRanges.length - 1].min) {
        return tempoRanges[tempoRanges.length - 1].name;
    }
    return undefined;
}
