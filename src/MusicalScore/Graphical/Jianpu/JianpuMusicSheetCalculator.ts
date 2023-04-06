import { GraphicalMusicSheet } from "../GraphicalMusicSheet";
//import { MusicSheetCalculator } from "../MusicSheetCalculator";
import { VexFlowMusicSheetCalculator } from "../VexFlow/VexFlowMusicSheetCalculator";

export class JianpuMusicSheetCalculator extends VexFlowMusicSheetCalculator {
    // protected calculateMeasureXLayout(measures: GraphicalMeasure[]): number {
    //     const width = super(measures);
    // }

    // TODO do we actually need a JianpuMusicSheetCalculator? see JianpuMeasure.calculateYLayout()
    public override calculateYLayout(gSheet: GraphicalMusicSheet): void {
        // for (const measures of gSheet.MeasureList) {
        //     for (const measure of measures) {
        //         measure.calculateYLayout();
        //     }
        // }
    }
}
