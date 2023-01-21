import { SkyBottomLineBatchCalculatorBackendType } from "../../OpenSheetMusicDisplay";
import { EngravingRules } from "./EngravingRules";
import { PlainSkyBottomLineBatchCalculatorBackend } from "./PlainSkyBottomLineBatchCalculatorBackend";
import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import { SkyBottomLineBatchCalculatorBackend } from "./SkyBottomLineBatchCalculatorBackend";
import { SkyBottomLineCalculationResult } from "./SkyBottomLineCalculationResult";
import { StaffLine } from "./StaffLine";
import { VexFlowMeasure } from "./VexFlow/VexFlowMeasure";
import { WebGLSkyBottomLineBatchCalculatorBackend } from "./WebGLSkyBottomLineBatchCalculatorBackend";
import log from "loglevel";
import { CollectionUtil } from "../../Util/CollectionUtil";

interface IBatchEntry {
    skyBottomLineCalculator: SkyBottomLineCalculator;
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

    constructor(staffLines: StaffLine[], preferredBackend: SkyBottomLineBatchCalculatorBackendType) {
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
                skyBottomLineCalculator: staffLine.SkyBottomLineCalculator,
                measures: staffLine.Measures as VexFlowMeasure[]
            });
        }

        this.batches = new Map<EngravingRules, IBatch>();
        for (const [rules, batchEntryArray] of batchEntryArrayList.entries()) {
            const measures: VexFlowMeasure[] = CollectionUtil.flat(batchEntryArray.map(entry => entry.measures));
            const backend: SkyBottomLineBatchCalculatorBackend = ((): SkyBottomLineBatchCalculatorBackend => {
                if (preferredBackend === SkyBottomLineBatchCalculatorBackendType.Plain) {
                    return new PlainSkyBottomLineBatchCalculatorBackend(rules, measures).initialize();
                } else {
                    try {
                        return new WebGLSkyBottomLineBatchCalculatorBackend(rules, measures).initialize();
                    } catch {
                        log.info("Couldn't create WebGLBackend for Skyline. Using fallback.");
                        return new PlainSkyBottomLineBatchCalculatorBackend(rules, measures).initialize();
                    }
                }
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
            for (const { skyBottomLineCalculator, measures } of entries) {
                const end: number = start + measures.length;
                skyBottomLineCalculator.updateLines(results.slice(start, end));
                start = end;
            }
        }
    }
}
