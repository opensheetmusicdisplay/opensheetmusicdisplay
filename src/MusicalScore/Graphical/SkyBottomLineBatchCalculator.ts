import { EngravingRules } from "./EngravingRules";
import { PlainSkyBottomLineBatchCalculatorBackend } from "./PlainSkyBottomLineBatchCalculatorBackend";
import { SkyBottomLine } from "./SkyBottomLine";
import { SkyBottomLineBatchCalculatorBackend } from "./SkyBottomLineBatchCalculatorBackend";
import { SkyBottomLineCalculationResult } from "./SkyBottomLineCalculationResult";
import { StaffLine } from "./StaffLine";
import { VexFlowMeasure } from "./VexFlow/VexFlowMeasure";

interface IBatchEntry {
    skyBottomLine: SkyBottomLine;
    measures: VexFlowMeasure[];
}

interface IBatch {
    backend: SkyBottomLineBatchCalculatorBackend;
    entries: IBatchEntry[];
}

/**
 * This class calculates the skylines and the bottom lines for multiple stafflines.
 */
export class SkyBottomLineBatchCalculator {
    private batches: Map<EngravingRules, IBatch>;

    constructor(staffLines: StaffLine[]) {
        const batchEntryArrayList: Map<EngravingRules, IBatchEntry[]> = new Map<EngravingRules, IBatchEntry[]>();
        for (const staffLine of staffLines) {
            const rules: EngravingRules = staffLine.ParentMusicSystem.rules;
            const batchEntryArray: IBatchEntry[] = ((): IBatchEntry[] => {
                if (batchEntryArrayList.has(rules)) {
                    return batchEntryArrayList.get(rules)!;
                } else {
                    const array: IBatchEntry[] = [];
                    batchEntryArrayList.set(rules, array);
                    return array;
                }
            })();
            batchEntryArray.push({
                skyBottomLine: staffLine.SkyBottomLine,
                measures: staffLine.Measures as VexFlowMeasure[]
            });
        }

        this.batches = new Map<EngravingRules, IBatch>();
        for (const [rules, batchEntryArray] of batchEntryArrayList.entries()) {
            const measures: VexFlowMeasure[] = batchEntryArray.map(entry => entry.measures).flat();
            const backend: SkyBottomLineBatchCalculatorBackend = ((): SkyBottomLineBatchCalculatorBackend => {
                return new PlainSkyBottomLineBatchCalculatorBackend(rules, measures);
            })();
            backend.initialize();

            this.batches.set(rules, {
                backend,
                entries: batchEntryArray
            });
        }
    }

    /**
     * This method calculates the skylines and the bottom lines for the stafflines passed to the constructor.
     */
    public calculateLines(): void {
        for (const [, { backend, entries }] of this.batches) {
            const results: SkyBottomLineCalculationResult[] = backend.calculateLines();
            let start: number = 0;
            for (const { skyBottomLine, measures } of entries) {
                const end: number = start + measures.length;
                skyBottomLine.updateLines(results.slice(start, end));
                start = end;
            }
        }
    }
}
