import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { SkyBottomLineCalculator } from "../../../src/MusicalScore/Graphical/SkyBottomLineCalculator";
import { TestUtils } from "../../Util/TestUtils";

/** Compares the geometric skyline/bottom-line calculation (GeometricSkyBottomLineContext)
 *  with the pixel-based (raster) calculation. The two should agree within a small tolerance:
 *  differences come from anti-aliasing/font hinting (sub-pixel) in the raster method,
 *  see GeometricSkyBottomLineContext for details. */
describe("GeometricSkyBottomLineCalculation", () => {
    interface ICapturedLine { sky: number[], bottom: number[] }
    // capture the lines directly after they are calculated (before later layout steps update them),
    // by wrapping SkyBottomLineCalculator.updateLines, which both calculation methods call with their results.
    let capture: ICapturedLine[];
    const originalUpdateLines: any = (SkyBottomLineCalculator.prototype as any).updateLines;
    let savedOverflowY: string;

    before((): void => {
        (SkyBottomLineCalculator.prototype as any).updateLines = function (results: any): void {
            originalUpdateLines.call(this, results);
            if (capture) {
                capture.push({ sky: [...this.SkyLine], bottom: [...this.BottomLine] });
            }
        };
        // Always reserve the vertical scrollbar so the container width - and thus the page width, the
        // system widths and the skyline array lengths - can't change between the two renders compared
        // below. OSMD reads the page width from the container's offsetWidth at render time; otherwise the
        // first render of a tall sheet has no scrollbar yet and reads a wider container, then the scrollbar
        // appears and steals its width (~12px with classic scrollbars, e.g. on Linux/Firefox), so the
        // second render is narrower. That is a DOM container-size feedback, not covered by the per-render
        // VexFlow state resets, and environment-dependent: browsers with overlay scrollbars that reserve no
        // width (e.g. Firefox on Windows) don't show it. It made the geometric (first) and raster (second)
        // captures disagree on staffline 0's length (352 vs 349) on Linux/Firefox. Reserving the scrollbar
        // makes the very first render see the settled width, so both captures share one identical layout.
        savedOverflowY = document.documentElement.style.overflowY;
        document.documentElement.style.overflowY = "scroll";
    });

    after((): void => {
        (SkyBottomLineCalculator.prototype as any).updateLines = originalUpdateLines;
        document.documentElement.style.overflowY = savedOverflowY;
    });

    /** Describes the measure at a given staffline (by capture order) and skyline index, for failure messages. */
    function describeMeasureAt(osmd: OpenSheetMusicDisplay, stafflineIndex: number, skylineIndex: number): string {
        try {
            const xUnits: number = skylineIndex / osmd.EngravingRules.SamplingUnit;
            let currentIndex: number = 0;
            for (const page of osmd.GraphicSheet.MusicPages) {
                for (const system of page.MusicSystems) {
                    for (const staffLine of system.StaffLines) {
                        if (currentIndex++ !== stafflineIndex) {
                            continue;
                        }
                        for (const measure of staffLine.Measures) {
                            const x: number = measure.PositionAndShape.RelativePosition.x;
                            if (xUnits >= x && xUnits < x + measure.PositionAndShape.Size.width) {
                                return ` = x ${xUnits.toFixed(1)} units, measure ${measure.MeasureNumber}`;
                            }
                        }
                        return ` = x ${xUnits.toFixed(1)} units, no measure`;
                    }
                }
            }
        } catch (e) {
            // diagnostics only
        }
        return "";
    }

    interface ICompareOptions {
        /** Sets EngravingRules.NewSystemAtXMLNewSystemAttribute, e.g. for test_octaveshift_extragraphicalmeasure. */
        newSystemAttribute?: boolean;
        /** Tolerance for the fraction of values differing by more than 0.5 units (default 0.005).
         *  E.g. the tablature sample has known benign difference classes slightly above the default. */
        bigDiffFractionTolerance?: number;
        /** Tolerance for mean absolute difference (default 0.15). */
        meanAbsTolerance?: number;
        /** Tolerance for skyline array length difference in sampling units (default 0 = exact).
         *  VF4→VF5 migration can shift measure widths by a few pixels. */
        lengthTolerance?: number;
    }

    /** Fresh load + one captured first render with the given method.
     *  (Re-renders are identical to the first render since the state resets in
     *  VexFlowMusicSheetCalculator.calculateMeasureXLayout()/clearRecreatedObjects(),
     *  so the first render is the canonical state, and both captures start from
     *  identical input state simply by fresh-loading.) */
    async function capturedRender(osmd: OpenSheetMusicDisplay, score: Document, geometric: boolean,
                                  options: ICompareOptions): Promise<ICapturedLine[]> {
        osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometric;
        osmd.EngravingRules.AlwaysSetPreferredSkyBottomLineBackendAutomatically = false;
        osmd.EngravingRules.SkyBottomLineBatchMinMeasures = 9999999; // use the non-batched raster path
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = !!options.newSystemAttribute;
        await osmd.load(score);
        capture = [];
        osmd.render();
        const result: ICapturedLine[] = capture;
        capture = undefined;
        osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = true;
        osmd.EngravingRules.AlwaysSetPreferredSkyBottomLineBackendAutomatically = true;
        osmd.EngravingRules.SkyBottomLineBatchMinMeasures = 5;
        return result;
    }

    async function compareGeometricWithRaster(filename: string, options: ICompareOptions = {}): Promise<void> {
        const score: Document = TestUtils.getScore(filename);
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false });
        const geometric: ICapturedLine[] = await capturedRender(osmd, score, true, options);
        const raster: ICapturedLine[] = await capturedRender(osmd, score, false, options);

        expect(geometric.length, "number of stafflines").to.equal(raster.length);
        expect(geometric.length, "number of stafflines").to.be.greaterThan(0);
        let valuesCompared: number = 0;
        let sumAbsoluteDifference: number = 0;
        let valuesAboveHalfUnit: number = 0;
        let worstInfo: string = "";
        let worstDifference: number = 0;
        const lengthTolerance: number = options.lengthTolerance ?? 0;
        for (let i: number = 0; i < geometric.length; i++) {
            const lenDiff: number = Math.abs(geometric[i].sky.length - raster[i].sky.length);
            expect(lenDiff, `skyline length diff of staffline ${i} (geo=${geometric[i].sky.length} raster=${raster[i].sky.length})`)
                .to.be.at.most(lengthTolerance);
            for (const part of ["sky", "bottom"]) {
                const geometricValues: number[] = (geometric[i] as never)[part];
                const rasterValues: number[] = (raster[i] as never)[part];
                const minLen: number = Math.min(geometricValues.length, rasterValues.length);
                for (let j: number = 0; j < minLen; j++) {
                    if (isNaN(geometricValues[j]) || isNaN(rasterValues[j])) {
                        continue;
                    }
                    const difference: number = Math.abs(geometricValues[j] - rasterValues[j]);
                    valuesCompared++;
                    sumAbsoluteDifference += difference;
                    if (difference > 0.5) {
                        valuesAboveHalfUnit++;
                        if (difference > worstDifference) {
                            worstDifference = difference;
                            const measureInfo: string = describeMeasureAt(osmd, i, j);
                            worstInfo = ` (worst: ${part} staffline ${i} index ${j}${measureInfo}:`
                                + ` geometric ${geometricValues[j].toFixed(2)} vs raster ${rasterValues[j].toFixed(2)})`;
                        }
                    }
                }
            }
        }
        expect(valuesCompared).to.be.greaterThan(0);
        const meanAbsoluteDifference: number = sumAbsoluteDifference / valuesCompared;
        // tolerances: sub-pixel differences are expected (the raster method quantizes to pixels and includes
        // the anti-aliasing halo, which e.g. Firefox spreads up to ~0.1 units wider than Chrome).
        // A missing element class would push the mean far beyond these bounds.
        expect(meanAbsoluteDifference, "mean abs difference (units) between geometric and raster lines" + worstInfo)
          .to.be.below(options.meanAbsTolerance ?? 0.15);
        expect(valuesAboveHalfUnit / valuesCompared, "fraction of values differing by more than 0.5 units" + worstInfo)
            .to.be.below(options.bigDiffFractionTolerance ?? 0.005);
    }

    it("agrees with the raster calculation for OSMD_function_test_all", async function (): Promise<void> {
        this.timeout(30000);
        await compareGeometricWithRaster("OSMD_function_test_all.xml",
            { lengthTolerance: 5, meanAbsTolerance: 0.20, bigDiffFractionTolerance: 0.11 });
    });

    it("agrees with the raster calculation for chord symbols", async function (): Promise<void> {
        this.timeout(30000);
        await compareGeometricWithRaster("OSMD_function_test_chord_symbols.musicxml",
            { lengthTolerance: 5, bigDiffFractionTolerance: 0.042 });
    });

    it("agrees with the raster calculation for a one-line (percussion) staff", async function (): Promise<void> {
        this.timeout(30000);
        await compareGeometricWithRaster("OSMD_function_test_drumset.musicxml");
    });

    it("agrees with the raster calculation for tablature with effects", async function (): Promise<void> {
        this.timeout(30000);
        await compareGeometricWithRaster("OSMD_Function_Test_Tablature_Alleffects.musicxml",
            { bigDiffFractionTolerance: 0.012, meanAbsTolerance: 0.18, lengthTolerance: 5 });
    });

    it("agrees with the raster calculation on the first render with extra graphical measures", async function (): Promise<void> {
        this.timeout(30000);
        await compareGeometricWithRaster("test_octaveshift_extragraphicalmeasure.musicxml",
            { newSystemAttribute: true, bigDiffFractionTolerance: 0.10, lengthTolerance: 5 });
    });
});
