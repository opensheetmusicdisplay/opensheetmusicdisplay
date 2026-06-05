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

    before((): void => {
        (SkyBottomLineCalculator.prototype as any).updateLines = function (results: any): void {
            originalUpdateLines.call(this, results);
            if (capture) {
                capture.push({ sky: [...this.SkyLine], bottom: [...this.BottomLine] });
            }
        };
    });

    after((): void => {
        (SkyBottomLineCalculator.prototype as any).updateLines = originalUpdateLines;
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
        /** Capture the very first render after load (like the actual rendering pipeline) instead of a
         *  settled re-render. Some state (e.g. extra graphical measure widths) differs on the first render. */
        firstRender?: boolean;
        /** Sets EngravingRules.NewSystemAtXMLNewSystemAttribute, e.g. for test_octaveshift_extragraphicalmeasure. */
        newSystemAttribute?: boolean;
    }

    /** Fresh load + a settle render with the geometric method, then one captured render with the given method.
     *  The settle render's skylines feed into some element placements of the next render (pre-existing re-render
     *  behavior, independent of the skyline method), so both captures must start from identical input state:
     *  a fresh load and a settle render that uses the same (geometric) method for both.
     *  With options.firstRender, the settle render is skipped and the first render is captured instead
     *  (fresh loads at the same render index are also identical input states). */
    async function capturedRender(osmd: OpenSheetMusicDisplay, score: Document, geometric: boolean,
                                  options: ICompareOptions): Promise<ICapturedLine[]> {
        osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = options.firstRender ? geometric : true;
        osmd.EngravingRules.AlwaysSetPreferredSkyBottomLineBackendAutomatically = false;
        osmd.EngravingRules.SkyBottomLineBatchMinMeasures = 9999999; // use the non-batched raster path
        osmd.EngravingRules.NewSystemAtXMLNewSystemAttribute = !!options.newSystemAttribute;
        await osmd.load(score);
        if (!options.firstRender) {
            osmd.render(); // settle render (the first render after load also differs slightly from re-renders)
            osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometric;
        }
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
        for (let i: number = 0; i < geometric.length; i++) {
            expect(geometric[i].sky.length, `skyline length of staffline ${i}`).to.equal(raster[i].sky.length);
            for (const part of ["sky", "bottom"]) {
                const geometricValues: number[] = (geometric[i] as never)[part];
                const rasterValues: number[] = (raster[i] as never)[part];
                for (let j: number = 0; j < geometricValues.length; j++) {
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
        expect(meanAbsoluteDifference, "mean abs difference (units) between geometric and raster lines" + worstInfo).to.be.below(0.15);
        expect(valuesAboveHalfUnit / valuesCompared, "fraction of values differing by more than 0.5 units" + worstInfo).to.be.below(0.005);
    }

    it("agrees with the raster calculation for OSMD_function_test_all", async function (): Promise<void> {
        this.timeout(30000);
        await compareGeometricWithRaster("OSMD_function_test_all.xml");
    });

    it("agrees with the raster calculation for chord symbols", async function (): Promise<void> {
        this.timeout(30000);
        await compareGeometricWithRaster("OSMD_function_test_chord_symbols.musicxml");
    });

    it("agrees with the raster calculation for a one-line (percussion) staff", async function (): Promise<void> {
        this.timeout(30000);
        await compareGeometricWithRaster("OSMD_function_test_drumset.musicxml");
    });

    it("agrees with the raster calculation for tablature with effects", async function (): Promise<void> {
        this.timeout(30000);
        await compareGeometricWithRaster("OSMD_Function_Test_Tablature_Alleffects.musicxml");
    });

    it("agrees with the raster calculation on the first render with extra graphical measures", async function (): Promise<void> {
        // extra graphical measures can have negative widths on the first render, which the raster method
        // ran through canvas.width coercion - the geometric calculation has to mirror that (#937)
        this.timeout(30000);
        await compareGeometricWithRaster("test_octaveshift_extragraphicalmeasure.musicxml",
            { firstRender: true, newSystemAttribute: true });
    });
});
