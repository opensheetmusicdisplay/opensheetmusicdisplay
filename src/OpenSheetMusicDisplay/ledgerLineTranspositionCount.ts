import { Pitch, NoteEnum } from "../Common/DataObjects/Pitch";
import { Fraction } from "../Common/DataObjects/Fraction";
import { MusicSheet } from "../MusicalScore/MusicSheet";
import { MusicSheetCalculator } from "../MusicalScore/Graphical/MusicSheetCalculator";
import { OctaveShiftParams } from "../MusicalScore/Graphical/OctaveShiftParams";
import { Note } from "../MusicalScore/VoiceData/Note";
import { SourceMeasure } from "../MusicalScore/VoiceData/SourceMeasure";
import { SourceStaffEntry } from "../MusicalScore/VoiceData/SourceStaffEntry";
import { ClefEnum, ClefInstruction } from "../MusicalScore/VoiceData/Instructions/ClefInstruction";
import { KeyInstruction } from "../MusicalScore/VoiceData/Instructions/KeyInstruction";
import { MultiExpression } from "../MusicalScore/VoiceData/Expressions/MultiExpression";
import { OctaveEnum, OctaveShift } from "../MusicalScore/VoiceData/Expressions/ContinuousExpressions/OctaveShift";

/**
 * Read-only: does not set `MusicSheet.Transpose` or render. Counts printed notes that would fall
 * outside treble D4–G5 or bass F2–B3 (MusicXML octaves) after hypothetically transposing by `transposeHalftones`.
 * Octave-shift resolution and draw pitch follow [[MusicSheetCalculator.createGraphicalMeasure]] / [[VexFlowGraphicalNote]]
 * (transpose then `OctaveShift.getPitchFromOctaveShift`).
 */
export function countLedgerLineNotesForTransposition(sheet: MusicSheet | undefined, transposeHalftones: number): number {
    if (!sheet) {
        return 0;
    }

    const activeClefs: Map<number, ClefInstruction> = new Map<number, ClefInstruction>();
    const activeKeys: Map<number, KeyInstruction> = new Map<number, KeyInstruction>();
    const completeNumberOfStaves: number = sheet.getCompleteNumberOfStaves();
    const openOctaveShifts: (OctaveShiftParams | undefined)[] = [];
    for (let i: number = 0; i < completeNumberOfStaves; i++) {
        openOctaveShifts.push(undefined);
    }
    seedOpenOctaveShiftsFromSkippedMeasures(sheet, openOctaveShifts);

    let ledgerLineNoteCount: number = 0;

    for (const sourceMeasure of sheet.SourceMeasures) {
        updateLedgerLineActiveInstructions(sourceMeasure.FirstInstructionsStaffEntries, activeClefs, activeKeys);

        for (let staffIndex: number = 0; staffIndex < sourceMeasure.CompleteNumberOfStaves; staffIndex++) {
            const octaveShifts: MultiExpression[] = buildLedgerLineOctaveShiftStateForMeasureStaff(
                sourceMeasure,
                staffIndex,
                openOctaveShifts
            );

            for (const container of sourceMeasure.VerticalSourceStaffEntryContainers) {
                const staffEntry: SourceStaffEntry = container.StaffEntries[staffIndex];
                if (!staffEntry || !staffEntry.ParentStaff?.isVisible()) {
                    continue;
                }

                const activeClefForStaff: ClefInstruction | undefined = activeClefs.get(staffIndex);
                if (activeClefForStaff?.ClefType === ClefEnum.TAB) {
                    continue;
                }

                updateLedgerLineActiveInstructions([staffEntry], activeClefs, activeKeys);

                const clef: ClefInstruction = activeClefs.get(staffIndex) ?? getDefaultLedgerLineClef(staffIndex);
                const key: KeyInstruction = activeKeys.get(staffIndex) ?? new KeyInstruction(undefined, 0);
                const octaveShiftValue: OctaveEnum = resolveLedgerLineOctaveShiftValue(
                    staffEntry,
                    staffIndex,
                    openOctaveShifts,
                    octaveShifts
                );
                ledgerLineNoteCount += countLedgerLineNotesInStaffEntry(
                    staffEntry,
                    clef,
                    key,
                    transposeHalftones,
                    octaveShiftValue
                );
            }

            updateLedgerLineActiveInstructions(
                ledgerLineLastInstructionStaffEntryArray(sourceMeasure, staffIndex),
                activeClefs,
                activeKeys
            );
            clearLedgerLineOpenOctaveShiftAtMeasureEnd(sourceMeasure, staffIndex, openOctaveShifts);
        }
    }

    return ledgerLineNoteCount;
}

/**
 * Mirrors [[MusicSheetCalculator.prepareGraphicalMusicSheet]]: if drawing starts after measure 0,
 * carry open octave brackets across skipped measures so staff state matches the calculator.
 */
function seedOpenOctaveShiftsFromSkippedMeasures(
    musicSheet: MusicSheet,
    openOctaveShifts: (OctaveShiftParams | undefined)[]
): void {
    const startMeasureIndex: number = musicSheet.Rules?.MinMeasureToDrawIndex ?? 0;
    if (startMeasureIndex <= 0) {
        return;
    }

    const sourceMeasures: SourceMeasure[] = musicSheet.SourceMeasures;
    const lastSourceMeasure: SourceMeasure = sourceMeasures[sourceMeasures.length - 1];
    const sheetEndTimestamp: Fraction = Fraction.plus(lastSourceMeasure.AbsoluteTimestamp, lastSourceMeasure.Duration);

    for (let staffIndex: number = 0; staffIndex < openOctaveShifts.length; staffIndex++) {
        let openShift: OctaveShift = undefined;
        let openShiftStart: Fraction = undefined;
        let openShiftEnd: Fraction = undefined;
        for (let m: number = 0; m < startMeasureIndex; m++) {
            const sm: SourceMeasure = sourceMeasures[m];
            const expressions: MultiExpression[] = sm.StaffLinkedExpressions[staffIndex] ?? [];
            for (let e: number = 0; e < expressions.length; e++) {
                const multi: MultiExpression = expressions[e];
                if (multi.OctaveShiftStart) {
                    openShift = multi.OctaveShiftStart;
                    openShiftStart = openShift.ParentStartMultiExpression.AbsoluteTimestamp;
                    openShiftEnd = openShift.ParentEndMultiExpression?.AbsoluteTimestamp ?? sheetEndTimestamp;
                } else if (multi.OctaveShiftEnd && openShift && multi.OctaveShiftEnd === openShift) {
                    openShift = undefined;
                    openShiftStart = undefined;
                    openShiftEnd = undefined;
                }
            }
        }
        if (openShift) {
            openOctaveShifts[staffIndex] = new OctaveShiftParams(openShift, openShiftStart, openShiftEnd);
        }
    }
}

/**
 * Same loop as the start of [[MusicSheetCalculator.createGraphicalMeasure]]: collect `octaveShifts` for the staff
 * and refresh `openOctaveShifts[staffIndex]` from measure-linked expressions.
 */
function buildLedgerLineOctaveShiftStateForMeasureStaff(
    sourceMeasure: SourceMeasure,
    staffIndex: number,
    openOctaveShifts: (OctaveShiftParams | undefined)[]
): MultiExpression[] {
    const octaveShifts: MultiExpression[] = [];
    const expressions: MultiExpression[] = sourceMeasure.StaffLinkedExpressions[staffIndex] ?? [];
    for (let idx: number = 0, len: number = expressions.length; idx < len; ++idx) {
        const multiExpression: MultiExpression = expressions[idx];
        let targetOctaveShift: OctaveShift = undefined;
        if (multiExpression.OctaveShiftStart) {
            targetOctaveShift = multiExpression.OctaveShiftStart;
        } else if (multiExpression.OctaveShiftEnd) {
            // also check for octave shift that is ending here but starting in earlier measure, see test_octaveshift_notes_shifted_octave_shift_end.musicxml
            targetOctaveShift = multiExpression.OctaveShiftEnd;
        }
        if (targetOctaveShift) {
            octaveShifts.push(multiExpression);
            const openOctaveShift: OctaveShift = targetOctaveShift;
            let absoluteEnd: Fraction = openOctaveShift?.ParentEndMultiExpression?.AbsoluteTimestamp;
            if (!openOctaveShift?.ParentEndMultiExpression) {
                const measureEndTimestamp: Fraction = Fraction.plus(sourceMeasure.AbsoluteTimestamp, sourceMeasure.Duration);
                absoluteEnd = measureEndTimestamp;
            }
            openOctaveShifts[staffIndex] = new OctaveShiftParams(
                openOctaveShift,
                openOctaveShift.ParentStartMultiExpression.AbsoluteTimestamp,
                absoluteEnd
            );
        }
    }
    return octaveShifts;
}

function resolveLedgerLineOctaveShiftValue(
    sourceStaffEntry: SourceStaffEntry,
    staffIndex: number,
    openOctaveShifts: (OctaveShiftParams | undefined)[],
    octaveShifts: MultiExpression[]
): OctaveEnum {
    let octaveShiftValue: OctaveEnum = OctaveEnum.NONE;
    if (openOctaveShifts[staffIndex]) {
        if (openOctaveShifts[staffIndex].getAbsoluteStartTimestamp.lte(sourceStaffEntry.AbsoluteTimestamp) &&
            sourceStaffEntry.AbsoluteTimestamp.lte(openOctaveShifts[staffIndex].getAbsoluteEndTimestamp)) {
            octaveShiftValue = openOctaveShifts[staffIndex].getOpenOctaveShift.Type;
        }
    }
    if (octaveShiftValue === OctaveEnum.NONE) {
        for (const octaveShift of octaveShifts) {
            let targetOctaveShift: OctaveShift;
            if (octaveShift.OctaveShiftStart) {
                targetOctaveShift = octaveShift.OctaveShiftStart;
            } else if (octaveShift.OctaveShiftEnd) {
                targetOctaveShift = octaveShift.OctaveShiftEnd;
            } else {
                continue;
            }
            if (targetOctaveShift?.ParentStartMultiExpression?.AbsoluteTimestamp.lte(sourceStaffEntry.AbsoluteTimestamp) &&
                !targetOctaveShift.ParentEndMultiExpression?.AbsoluteTimestamp.lt(sourceStaffEntry.AbsoluteTimestamp)) {
                octaveShiftValue = targetOctaveShift.Type;
                break;
            }
        }
    }
    return octaveShiftValue;
}

function clearLedgerLineOpenOctaveShiftAtMeasureEnd(
    sourceMeasure: SourceMeasure,
    staffIndex: number,
    openOctaveShifts: (OctaveShiftParams | undefined)[]
): void {
    const expressions: MultiExpression[] = sourceMeasure.StaffLinkedExpressions[staffIndex] ?? [];
    for (let idx: number = 0, len: number = expressions.length; idx < len; ++idx) {
        const multiExpression: MultiExpression = expressions[idx];
        if (multiExpression.OctaveShiftEnd !== undefined && openOctaveShifts[staffIndex] !== undefined &&
            multiExpression.OctaveShiftEnd === openOctaveShifts[staffIndex].getOpenOctaveShift) {
            openOctaveShifts[staffIndex] = undefined;
        }
    }
}

function ledgerLineLastInstructionStaffEntryArray(
    sourceMeasure: SourceMeasure,
    staffIndex: number
): SourceStaffEntry[] {
    const last: SourceStaffEntry = sourceMeasure.LastInstructionsStaffEntries[staffIndex];
    return last ? [last] : [];
}

function updateLedgerLineActiveInstructions(
    staffEntries: SourceStaffEntry[],
    activeClefs: Map<number, ClefInstruction>,
    activeKeys: Map<number, KeyInstruction>
): void {
    for (const staffEntry of staffEntries) {
        if (!staffEntry) {
            continue;
        }

        const staffIndex: number = staffEntry.ParentStaff?.idInMusicSheet ?? -1;
        if (staffIndex < 0) {
            continue;
        }

        for (const instruction of staffEntry.Instructions) {
            if (instruction instanceof ClefInstruction) {
                activeClefs.set(staffIndex, instruction);
            } else if (instruction instanceof KeyInstruction) {
                activeKeys.set(staffIndex, instruction);
            }
        }
    }
}

function countLedgerLineNotesInStaffEntry(
    staffEntry: SourceStaffEntry,
    clef: ClefInstruction,
    key: KeyInstruction,
    transposeHalftones: number,
    octaveShiftValue: OctaveEnum
): number {
    let count: number = 0;

    for (const voiceEntry of staffEntry.VoiceEntries) {
        for (const note of voiceEntry.Notes) {
            if (!shouldCountLedgerLineForNote(note)) {
                continue;
            }

            const pitch: Pitch = getLedgerLineDrawPitch(note.Pitch, key, transposeHalftones, octaveShiftValue);
            if (pitchExceedsLedgerLineRange(pitch, clef)) {
                count++;
            }
        }
    }

    return count;
}

function shouldCountLedgerLineForNote(note: Note): boolean {
    return !!note?.Pitch && !note.isRest() && note.PrintObject;
}

/** Same order as [[VexFlowGraphicalNote.Transpose]]: transpose for hypothetical semitones, then octave-shift draw pitch. */
function getLedgerLineDrawPitch(
    pitch: Pitch,
    key: KeyInstruction,
    transposeHalftones: number,
    octaveShift: OctaveEnum
): Pitch {
    let p: Pitch = pitch;
    if (transposeHalftones !== 0 && MusicSheetCalculator.transposeCalculator) {
        p = MusicSheetCalculator.transposeCalculator.transposePitch(pitch, key, transposeHalftones);
    }
    if (!p) {
        return p;
    }
    return OctaveShift.getPitchFromOctaveShift(p, octaveShift);
}

function pitchExceedsLedgerLineRange(pitch: Pitch, clef: ClefInstruction): boolean {
    const halfTone: number = getLedgerLineComparableHalfTone(pitch);

    if (clef.ClefType === ClefEnum.F) {
        return halfTone < getXmlHalfTone(NoteEnum.F, 2) || halfTone > getXmlHalfTone(NoteEnum.B, 3);
    }

    return halfTone < getXmlHalfTone(NoteEnum.D, 4) || halfTone > getXmlHalfTone(NoteEnum.G, 5);
}

function getLedgerLineComparableHalfTone(pitch: Pitch): number {
    return (pitch.Octave + Pitch.OctaveXmlDifference) * 12
        + <number>pitch.FundamentalNote
        + pitch.AccidentalHalfTones;
}

function getXmlHalfTone(note: NoteEnum, octave: number): number {
    return octave * 12 + <number>note;
}

function getDefaultLedgerLineClef(staffIndex: number): ClefInstruction {
    return staffIndex % 2 === 1
        ? new ClefInstruction(ClefEnum.F, 0, 4)
        : new ClefInstruction(ClefEnum.G, 0, 2);
}
