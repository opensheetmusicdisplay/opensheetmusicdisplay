import { VexFlowMusicSheetDrawer } from "../MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

export class RangeSelectionElementCollector {
    private cachedTupletElements: SVGGraphicsElement[] = [];
    private cachedStructuralElements: SVGGraphicsElement[] = [];
    private dirty: boolean = true;

    public invalidate(): void {
        this.dirty = true;
        this.cachedTupletElements = [];
        this.cachedStructuralElements = [];
    }

    public getTupletElements(drawer: VexFlowMusicSheetDrawer): SVGGraphicsElement[] {
        if (!this.dirty && this.cachedTupletElements.length > 0) {
            // A virtualized system is intentionally disconnected but its retained SVG nodes are still valid.
            return this.cachedTupletElements;
        }
        const elementSet: Set<SVGGraphicsElement> = new Set<SVGGraphicsElement>();
        const selectors: string[] = [
            ".vf-tuplet",
            ".vf-tupletnum",
            ".vf-tuplet-bracket",
            ".vf-triplet",
            ".vf-tripletnum",
            ".vf-triplet-bracket",
            ".vf-stavetie.vf-tuplet",
            "[class*='tuplet']",
            "[class*='triplet']",
            "[id*='tuplet']",
            "[id*='triplet']"
        ];
        for (const renderRoot of this.getRenderRoots(drawer)) {
            if (!renderRoot) {
                continue;
            }
            for (const selector of selectors) {
                const matches: NodeListOf<SVGGraphicsElement> = renderRoot.querySelectorAll<SVGGraphicsElement>(selector);
                for (const match of matches) {
                    elementSet.add(match);
                }
            }
        }
        const elements: SVGGraphicsElement[] = Array.from(elementSet);
        this.cachedTupletElements = elements;
        this.dirty = false;
        return elements;
    }

    public getStructuralElements(drawer: VexFlowMusicSheetDrawer): SVGGraphicsElement[] {
        if (!this.dirty && this.cachedStructuralElements.length > 0) {
            // A virtualized system is intentionally disconnected but its retained SVG nodes are still valid.
            return this.cachedStructuralElements;
        }
        const elementSet: Set<SVGGraphicsElement> = new Set<SVGGraphicsElement>();
        const selectors: string[] = [
            ".vf-stavebarline",
            ".vf-barline",
            ".vf-staveline",
            ".vf-connector",
            ".vf-connector *",
            ".vf-brace",
            ".vf-brace *",
            ".staffline > .vf-text > text",
            ".vf-clef",
            ".vf-stave-clef",
            ".vf-timesignature",
            ".vf-timesignature *",
            ".vf-stave-timesignature",
            ".vf-dynamic",
            ".vf-expression",
            ".vf-crescendo",
            ".vf-decrescendo",
            ".vf-slur",
            ".vf-tie",
            "[class*='barline']",
            "[class*='staveline']",
            "[class*='connector']",
            "[class*='brace']",
            "[class*='clef']",
            "[class*='timesig']",
            "[class*='timesignature']",
            "[class*='dynamic']",
            "[class*='expression']",
            "[class*='crescendo']",
            "[class*='decrescendo']",
            "[class*='slur']",
            "[class*='tie']",
            "[id*='brace']",
            "[id*='clef']",
            "[id*='timesig']",
            "[id*='-slur']",
            "[id*='-tie']"
        ];
        for (const renderRoot of this.getRenderRoots(drawer)) {
            if (!renderRoot) {
                continue;
            }
            for (const selector of selectors) {
                const matches: NodeListOf<SVGGraphicsElement> = renderRoot.querySelectorAll<SVGGraphicsElement>(selector);
                for (const match of matches) {
                    if (this.shouldExcludeStructuralElement(match)) {
                        continue;
                    }
                    elementSet.add(match);
                }
            }
            const measureChildPrimitives: NodeListOf<SVGGraphicsElement> =
                renderRoot.querySelectorAll<SVGGraphicsElement>(".vf-measure > path, .vf-measure > rect, .vf-measure > text");
            for (const primitive of measureChildPrimitives) {
                if (this.shouldExcludeStructuralElement(primitive)) {
                    continue;
                }
                elementSet.add(primitive);
            }
        }
        const elements: SVGGraphicsElement[] = Array.from(elementSet);
        this.cachedStructuralElements = elements;
        this.dirty = false;
        return elements;
    }

    private getRenderRoots(drawer: VexFlowMusicSheetDrawer): ParentNode[] {
        const roots: Set<ParentNode> = new Set<ParentNode>();
        for (const backend of drawer?.Backends ?? []) {
            const renderRoot: HTMLElement = backend.getRenderElement();
            if (renderRoot) {
                roots.add(renderRoot);
            }
        }
        for (const systemGroup of drawer?.SystemGroups ?? []) {
            if (!systemGroup.isConnected) {
                roots.add(systemGroup);
            }
        }
        return Array.from(roots);
    }

    private shouldExcludeStructuralElement(element: SVGGraphicsElement): boolean {
        if (!element) {
            return true;
        }
        if (element.matches(".vf-measure > path")) {
            const strokeWidthAttribute: string = element.getAttribute("stroke-width");
            const inlineStrokeWidth: string = (element as SVGElement).style?.strokeWidth;
            const strokeWidthValue: number = Number.parseFloat(strokeWidthAttribute ?? inlineStrokeWidth ?? "");
            if (Number.isFinite(strokeWidthValue) && Math.abs(strokeWidthValue - 1) < 0.001) {
                return true;
            }
        }
        if (element.closest(".vf-notehead, .vf-stem, .vf-flag, .vf-beam, .vf-accidental, .vf-modifiers, .vf-stavenote, .vf-note")) {
            return true;
        }
        if (element.matches(".vf-text text") || element.closest(".vf-text")) {
            const textContainer: SVGGraphicsElement = element.closest(".vf-text");
            if (!textContainer?.closest(".staffline")) {
                return true;
            }
        }
        if (element.matches(".vf-curve, [id*='-slur'], .vf-slur") || element.closest(".vf-curve, [id*='-slur'], .vf-slur")) {
            return true;
        }
        if (element.matches(".vf-stavetie, [id*='-tie'], .vf-tie") || element.closest(".vf-stavetie, [id*='-tie'], .vf-tie")) {
            return true;
        }
        const className: string = (element.getAttribute("class") ?? "").toLowerCase();
        const elementId: string = (element.id ?? "").toLowerCase();
        const signature: string = `${className} ${elementId}`;
        const excludedNameFragments: string[] = [
            "notehead",
            "stavenote",
            "note",
            "stem",
            "flag",
            "beam",
            "accidental",
            "ledger",
            "rest",
            "modifiers"
        ];
        return excludedNameFragments.some((fragment: string): boolean => signature.includes(fragment));
    }
}
