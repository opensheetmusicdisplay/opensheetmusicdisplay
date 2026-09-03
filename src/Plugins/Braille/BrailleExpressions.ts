import { ArticulationEnum } from "../../MusicalScore/VoiceData/VoiceEntry";
import { OrnamentEnum } from "../../MusicalScore/VoiceData/OrnamentContainer";
import { DynamicEnum } from "../../MusicalScore/VoiceData/Expressions/InstantaneousDynamicExpression";
import { Articulation } from "../../MusicalScore/VoiceData/Articulation";
import { BrailleNoteDebugInfo } from "./BrailleNoteRenderer";
import {
    BRAILLE_STACCATO,
    BRAILLE_STACCATISSIMO,
    BRAILLE_MEZZO_STACCATO,
    BRAILLE_TENUTO,
    BRAILLE_ACCENT,
    BRAILLE_MARCATO,
    BRAILLE_FERMATA,
    BRAILLE_TRILL,
    BRAILLE_TURN,
    BRAILLE_TURN_ON_NOTE,
    BRAILLE_INVERTED_TURN,
    BRAILLE_INVERTED_TURN_ON_NOTE,
    BRAILLE_MORDENT,
    BRAILLE_INVERTED_MORDENT,
    getDynamicBraille,
} from "./BrailleSymbols";

/**
 * Result of rendering expression marks (articulations, ornaments, dynamics).
 */
export interface BrailleExpressionResult {
    /** Braille string to insert */
    braille: string;
    /** Debug entries for each expression element */
    debugEntries: BrailleNoteDebugInfo[];
}

// ── Articulation rendering ──────────────────────────────────────────────

/**
 * Get the braille string for an ArticulationEnum value.
 * Returns empty string for unsupported articulations.
 *
 * Per Music Braille Code 2015, Par. 22.1, articulation marks PRECEDE the note
 * and go before any accidental or octave mark.
 */
export function getArticulationBraille(articulationEnum: ArticulationEnum): string {
    switch (articulationEnum) {
        case ArticulationEnum.staccato:            return BRAILLE_STACCATO;
        case ArticulationEnum.staccatissimo:       return BRAILLE_STACCATISSIMO;
        case ArticulationEnum.spiccato:            return BRAILLE_STACCATISSIMO; // same sign in braille
        case ArticulationEnum.detachedlegato:      return BRAILLE_MEZZO_STACCATO;
        case ArticulationEnum.tenuto:              return BRAILLE_TENUTO;
        case ArticulationEnum.accent:              return BRAILLE_ACCENT;
        case ArticulationEnum.softaccent:          return BRAILLE_ACCENT;
        case ArticulationEnum.strongaccent:        return BRAILLE_MARCATO;
        case ArticulationEnum.marcatoup:           return BRAILLE_MARCATO;
        case ArticulationEnum.marcatodown:         return BRAILLE_MARCATO;
        case ArticulationEnum.invertedstrongaccent: return BRAILLE_MARCATO;
        default:                                   return "";
    }
}

/**
 * Get a human-readable name for an articulation (for debug output).
 */
export function getArticulationName(articulationEnum: ArticulationEnum): string {
    switch (articulationEnum) {
        case ArticulationEnum.staccato:            return "staccato";
        case ArticulationEnum.staccatissimo:       return "staccatissimo";
        case ArticulationEnum.spiccato:            return "spiccato";
        case ArticulationEnum.detachedlegato:      return "mezzo-staccato";
        case ArticulationEnum.tenuto:              return "tenuto";
        case ArticulationEnum.accent:              return "accent";
        case ArticulationEnum.softaccent:          return "soft accent";
        case ArticulationEnum.strongaccent:        return "strong accent";
        case ArticulationEnum.marcatoup:           return "marcato";
        case ArticulationEnum.marcatodown:         return "marcato";
        case ArticulationEnum.invertedstrongaccent: return "inverted strong accent";
        default:                                   return "";
    }
}

/**
 * Render articulations for a note/chord.
 * Returns braille string to insert BEFORE the note (before accidentals and octave marks).
 *
 * Per Par. 22.1, order is: staccato/staccatissimo → accent → tenuto → others.
 * Fermatas are handled separately (they follow the note, per Par. 22.2).
 */
export function renderArticulations(articulations: Articulation[]): BrailleExpressionResult {
    const parts: string[] = [];
    const debugEntries: BrailleNoteDebugInfo[] = [];

    // Sort articulations in prescribed order (Par. 22.1):
    // staccato/staccatissimo → accent types → tenuto → others
    const sorted: Articulation[] = [...articulations].sort(
        (a: Articulation, b: Articulation): number => articulationOrder(a.articulationEnum) - articulationOrder(b.articulationEnum)
    );

    for (const art of sorted) {
        // Skip fermata (rendered after note, not before)
        if (art.articulationEnum === ArticulationEnum.fermata ||
            art.articulationEnum === ArticulationEnum.invertedfermata) {
            continue;
        }
        // Skip breath marks (rendered after note)
        if (art.articulationEnum === ArticulationEnum.breathmark ||
            art.articulationEnum === ArticulationEnum.caesura) {
            continue;
        }

        const braille: string = getArticulationBraille(art.articulationEnum);
        if (braille) {
            parts.push(braille);
            debugEntries.push({
                braille: braille,
                meaning: getArticulationName(art.articulationEnum),
            });
        }
    }

    return { braille: parts.join(""), debugEntries: debugEntries };
}

/**
 * Check if a list of articulations contains a fermata.
 * Returns the fermata braille string if present, empty string otherwise.
 * Fermatas follow the note (Par. 22.2).
 */
export function renderFermata(articulations: Articulation[]): BrailleExpressionResult {
    for (const art of articulations) {
        if (art.articulationEnum === ArticulationEnum.fermata ||
            art.articulationEnum === ArticulationEnum.invertedfermata) {
            return {
                braille: BRAILLE_FERMATA,
                debugEntries: [{ braille: BRAILLE_FERMATA, meaning: "fermata" }],
            };
        }
    }
    return { braille: "", debugEntries: [] };
}

/**
 * Sort priority for articulations per Par. 22.1.
 * Lower number = comes first.
 */
function articulationOrder(artEnum: ArticulationEnum): number {
    switch (artEnum) {
        case ArticulationEnum.staccato:
        case ArticulationEnum.staccatissimo:
        case ArticulationEnum.spiccato:
            return 0;
        case ArticulationEnum.accent:
        case ArticulationEnum.softaccent:
        case ArticulationEnum.strongaccent:
        case ArticulationEnum.marcatoup:
        case ArticulationEnum.marcatodown:
        case ArticulationEnum.invertedstrongaccent:
            return 1;
        case ArticulationEnum.tenuto:
            return 2;
        case ArticulationEnum.detachedlegato:
            return 3;
        default:
            return 10;
    }
}

// ── Ornament rendering ──────────────────────────────────────────────────

/**
 * Get the braille string for an OrnamentEnum value.
 * Returns empty string for unsupported ornaments.
 *
 * Per Music Braille Code 2015, Par. 16.3-16.5, ornament signs precede the note,
 * before any accidental or octave mark.
 */
export function getOrnamentBraille(ornamentEnum: OrnamentEnum): string {
    switch (ornamentEnum) {
        case OrnamentEnum.Trill:             return BRAILLE_TRILL;
        case OrnamentEnum.Turn:              return BRAILLE_TURN;
        case OrnamentEnum.InvertedTurn:      return BRAILLE_INVERTED_TURN;
        case OrnamentEnum.DelayedTurn:       return BRAILLE_TURN_ON_NOTE;
        case OrnamentEnum.DelayedInvertedTurn: return BRAILLE_INVERTED_TURN_ON_NOTE;
        case OrnamentEnum.Mordent:           return BRAILLE_MORDENT;
        case OrnamentEnum.InvertedMordent:   return BRAILLE_INVERTED_MORDENT;
        default:                             return "";
    }
}

/**
 * Get a human-readable name for an ornament (for debug output).
 */
export function getOrnamentName(ornamentEnum: OrnamentEnum): string {
    switch (ornamentEnum) {
        case OrnamentEnum.Trill:             return "trill";
        case OrnamentEnum.Turn:              return "turn";
        case OrnamentEnum.InvertedTurn:      return "inverted turn";
        case OrnamentEnum.DelayedTurn:       return "delayed turn";
        case OrnamentEnum.DelayedInvertedTurn: return "delayed inverted turn";
        case OrnamentEnum.Mordent:           return "mordent";
        case OrnamentEnum.InvertedMordent:   return "inverted mordent";
        default:                             return "";
    }
}

// ── Dynamic rendering ───────────────────────────────────────────────────

/**
 * Get the braille string for a dynamic marking, given its playback enum and (optionally) its text as written.
 *
 * A combined marking like sfmp (<sf/><mp/>) or ffz is transcribed letter by letter from its text, since its
 * enum is only its first symbol (sf, ff). Free text like "cresc." or "f con fuoco" falls back to the enum,
 * so that no stray letters get transcribed.
 *
 * Per Music Braille Code 2015, Par. 22.3.3, dynamic markings are word-sign
 * expressions placed before the affected note. An octave mark is REQUIRED
 * on the note following any word-sign expression (Par. 22.3(e)).
 */
export function renderDynamic(dynamicEnum: DynamicEnum, dynamicText?: string): BrailleExpressionResult {
    let name: string = DynamicEnum[dynamicEnum];
    const normalizedText: string = dynamicText?.trim().toLowerCase();
    if (normalizedText && /^[pfmsrz]+$/.test(normalizedText)) { // only the letters getDynamicBraille() transcribes
        name = normalizedText;
    }
    if (!name || name === "other") {
        return { braille: "", debugEntries: [] };
    }

    const braille: string = getDynamicBraille(name);
    if (!braille) {
        return { braille: "", debugEntries: [] };
    }

    return {
        braille: braille,
        debugEntries: [{ braille: braille, meaning: name + " (dynamic)" }],
    };
}
