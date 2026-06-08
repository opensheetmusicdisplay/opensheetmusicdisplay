import log from "loglevel";

/**
 * A virtual VexFlow rendering context that computes the vertical extents (min and max y)
 * of everything drawn into it, per (pixel) column, instead of rasterizing to a canvas.
 *
 * This is used by SkyBottomLineCalculator to calculate the skyline and bottom-line of a measure
 * geometrically from the same VexFlowMeasure.draw() call that was previously made on a hidden canvas,
 * without the very expensive CanvasRenderingContext2D.getImageData() call (GPU->CPU transfer)
 * and without rasterizing/allocating a canvas at all. (see #937)
 *
 * It implements the subset of the CanvasRenderingContext2D interface that VexFlow 1.2.93 uses,
 * plus the extra methods VexFlow adds in Renderer.bolsterCanvasContext() (setFont, setFillStyle,
 * openGroup, etc., see VexFlow's canvascontext.js).
 *
 * Accuracy notes compared to the pixel-based (raster) method:
 * - Values are exact geometry instead of pixel indices, i.e. not quantized to integers and without
 *   the up-to-1px anti-aliasing halo of the raster method. Differences are well below 1px (0.1 units).
 * - Where a shape's edge lies (almost) exactly on a pixel column boundary (e.g. the tangent of a notehead
 *   ellipse, or a stem edge), the rasterizer can round the sliver of coverage down to nothing, while this
 *   context includes the column. Conservative, at most one extra pixel column per edge.
 * - Text is merged from per-character ink extents (probed once per font + character from a tiny canvas,
 *   see probeCharacterInk()). Font hinting can shift rasterized glyph edges by up to a pixel depending on
 *   the fractional pen position, which is not predictable; the unrounded extents used here are conservative.
 * - Completely transparent fills/strokes (e.g. "#00000000" used for invisible elements) are skipped,
 *   like in the raster method, where the alpha > 0 pixel test ignored them.
 * - clearRect() (only used by VexFlow's TabNote to erase stave lines behind fret numbers) is a no-op,
 *   so this context keeps the bottom stave line of tablatures solid, while the raster method saw holes in it,
 *   which even shifted its relative anchoring of the whole bottom line by ~0.2 units on tab staves.
 *   The geometric (solid) result is the more correct one.
 * - The raster method clipped contents above/below its 300px canvas (~10 units above the stave).
 *   This context has no such limit, which is more correct for extreme cases.
 * - Drawing is clipped horizontally to [0, width) like on the per-measure canvas of the raster method.
 * - Dashed/dotted strokes are treated as solid lines (conservative). Miter join spikes of stroked
 *   multi-segment paths are not modeled (only relevant for sharp angles, which VexFlow doesn't stroke).
 */
export class GeometricSkyBottomLineContext {
    /** Conversion factor pt -> px for font sizes, as used by canvas. */
    private readonly PT_TO_PX: number = 4 / 3;
    /** Fallback font ascent as a fraction of the font size in px, if TextMetrics.actualBoundingBoxAscent is unavailable. */
    private readonly FALLBACK_FONT_ASCENT: number = 0.9;
    /** Fallback font descent as a fraction of the font size in px, if TextMetrics.actualBoundingBoxDescent is unavailable. */
    private readonly FALLBACK_FONT_DESCENT: number = 0.25;
    /** Fallback per-character width as a fraction of the font size in px, if no 2D context is available for measureText. */
    private readonly FALLBACK_CHAR_WIDTH: number = 0.6;
    /** Maximum number of line segments a Bézier curve or arc is flattened into. */
    private readonly MAX_FLATTENING_SEGMENTS: number = 64;
    /** Target length (in px) of the line segments a Bézier curve is flattened into. */
    private readonly FLATTENING_SEGMENT_LENGTH: number = 3;

    /** Caches for text measurements and glyph outline flattening, typically owned by EngravingRules
     *  (one per OSMD instance) so they persist across measures, stafflines and renders. */
    private readonly caches: GeometricSkyBottomLineCaches;

    /** Minimum drawn y per pixel column (the skyline, in device pixels). +Infinity = column untouched. */
    private minY: Float64Array = new Float64Array(0);
    /** Maximum drawn y per pixel column (the bottom-line, in device pixels). -Infinity = column untouched. */
    private maxY: Float64Array = new Float64Array(0);
    private width: number = 0;

    // current drawing state
    private translateX: number = 0;
    private translateY: number = 0;
    private scaleX: number = 1;
    private scaleY: number = 1;
    private currentLineWidth: number = 1;
    private currentFillStyle: string = "#000000";
    private fillTransparent: boolean = false;
    private currentStrokeStyle: string = "#000000";
    private strokeTransparent: boolean = false;
    private currentFont: string = "10pt Arial";
    private stateStack: IGeometricContextState[] = [];

    // current path: flattened line segments in device coordinates, stored as quadruples (x0, y0, x1, y1)
    private pathSegments: number[] = [];
    private hasCurrentPoint: boolean = false;
    private currentX: number = 0;
    private currentY: number = 0;
    private subpathStartX: number = 0;
    private subpathStartY: number = 0;

    /** Set by VexFlow's Renderer.bolsterCanvasContext() pattern, some code accesses ctx.vexFlowCanvasContext. */
    public vexFlowCanvasContext: GeometricSkyBottomLineContext = this;
    /** Mimics CanvasRenderingContext2D.canvas (width/height only). Some code checks for its existence. */
    public canvas: {width: number, height: number} = {width: 0, height: 0};
    // note: no "svg" property, so VexFlow's "if (ctx.svg)" checks correctly take the canvas branch.

    constructor(width: number = 0, height: number = 300, caches?: GeometricSkyBottomLineCaches) {
        this.caches = caches ?? new GeometricSkyBottomLineCaches();
        this.initialize(width, height);
    }

    /** Resets the context for a new measure of the given pixel width. */
    public initialize(width: number, height: number = 300): void {
        this.width = Math.max(0, Math.floor(width));
        if (this.minY.length < this.width) {
            this.minY = new Float64Array(this.width);
            this.maxY = new Float64Array(this.width);
        }
        this.minY.fill(Number.POSITIVE_INFINITY, 0, this.width);
        this.maxY.fill(Number.NEGATIVE_INFINITY, 0, this.width);
        this.canvas.width = this.width;
        this.canvas.height = height;
        this.translateX = 0;
        this.translateY = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.currentLineWidth = 1;
        this.setFillStyle("#000000");
        this.setStrokeStyle("#000000");
        this.currentFont = "10pt Arial";
        this.stateStack.length = 0;
        this.beginPath();
    }

    /**
     * Writes the computed extents into the given skyline/bottomline arrays (in device pixels,
     * indexed by pixel column), in the same format the raster method produced them:
     * columns where nothing was drawn are left undefined.
     */
    public copyExtentsInto(skyLine: number[], bottomLine: number[]): void {
        for (let x: number = 0; x < this.width; x++) {
            if (this.minY[x] !== Number.POSITIVE_INFINITY) {
                skyLine[x] = this.minY[x];
                bottomLine[x] = this.maxY[x];
            }
        }
    }

    //#region path building

    public beginPath(): void {
        this.pathSegments.length = 0;
        this.hasCurrentPoint = false;
    }

    public moveTo(x: number, y: number): void {
        const dx: number = this.deviceX(x);
        const dy: number = this.deviceY(y);
        if (!isFinite(dx) || !isFinite(dy)) {
            return; // canvas ignores non-finite coordinates
        }
        this.currentX = dx;
        this.currentY = dy;
        this.subpathStartX = dx;
        this.subpathStartY = dy;
        this.hasCurrentPoint = true;
    }

    public lineTo(x: number, y: number): void {
        const dx: number = this.deviceX(x);
        const dy: number = this.deviceY(y);
        if (!isFinite(dx) || !isFinite(dy)) {
            return;
        }
        if (!this.hasCurrentPoint) {
            this.moveTo(x, y);
            return;
        }
        this.pathSegments.push(this.currentX, this.currentY, dx, dy);
        this.currentX = dx;
        this.currentY = dy;
    }

    public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
        const dcpx: number = this.deviceX(cpx);
        const dcpy: number = this.deviceY(cpy);
        const dx: number = this.deviceX(x);
        const dy: number = this.deviceY(y);
        if (!isFinite(dcpx) || !isFinite(dcpy) || !isFinite(dx) || !isFinite(dy)) {
            return;
        }
        if (!this.hasCurrentPoint) {
            this.moveTo(cpx, cpy);
        }
        const x0: number = this.currentX;
        const y0: number = this.currentY;
        const segments: number = this.flatteningSegments(
            Math.abs(dcpx - x0) + Math.abs(dx - dcpx) + Math.abs(dcpy - y0) + Math.abs(dy - dcpy));
        let prevX: number = x0;
        let prevY: number = y0;
        for (let i: number = 1; i <= segments; i++) {
            const t: number = i / segments;
            const mt: number = 1 - t;
            const px: number = mt * mt * x0 + 2 * mt * t * dcpx + t * t * dx;
            const py: number = mt * mt * y0 + 2 * mt * t * dcpy + t * t * dy;
            this.pathSegments.push(prevX, prevY, px, py);
            prevX = px;
            prevY = py;
        }
        this.currentX = dx;
        this.currentY = dy;
    }

    public bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
        const dcp1x: number = this.deviceX(cp1x);
        const dcp1y: number = this.deviceY(cp1y);
        const dcp2x: number = this.deviceX(cp2x);
        const dcp2y: number = this.deviceY(cp2y);
        const dx: number = this.deviceX(x);
        const dy: number = this.deviceY(y);
        if (!isFinite(dcp1x) || !isFinite(dcp1y) || !isFinite(dcp2x) || !isFinite(dcp2y) || !isFinite(dx) || !isFinite(dy)) {
            return;
        }
        if (!this.hasCurrentPoint) {
            this.moveTo(cp1x, cp1y);
        }
        const x0: number = this.currentX;
        const y0: number = this.currentY;
        const segments: number = this.flatteningSegments(
            Math.abs(dcp1x - x0) + Math.abs(dcp2x - dcp1x) + Math.abs(dx - dcp2x) +
            Math.abs(dcp1y - y0) + Math.abs(dcp2y - dcp1y) + Math.abs(dy - dcp2y));
        let prevX: number = x0;
        let prevY: number = y0;
        for (let i: number = 1; i <= segments; i++) {
            const t: number = i / segments;
            const mt: number = 1 - t;
            const a: number = mt * mt * mt;
            const b: number = 3 * mt * mt * t;
            const c: number = 3 * mt * t * t;
            const d: number = t * t * t;
            const px: number = a * x0 + b * dcp1x + c * dcp2x + d * dx;
            const py: number = a * y0 + b * dcp1y + c * dcp2y + d * dy;
            this.pathSegments.push(prevX, prevY, px, py);
            prevX = px;
            prevY = py;
        }
        this.currentX = dx;
        this.currentY = dy;
    }

    public arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, antiClockwise: boolean = false): void {
        const cx: number = this.deviceX(x);
        const cy: number = this.deviceY(y);
        const r: number = radius * (Math.abs(this.scaleX) + Math.abs(this.scaleY)) / 2;
        if (!isFinite(cx) || !isFinite(cy) || !isFinite(r) || r < 0 || !isFinite(startAngle) || !isFinite(endAngle)) {
            return;
        }
        let sweep: number = endAngle - startAngle;
        if (antiClockwise) {
            if (sweep <= -2 * Math.PI || sweep > 0) {
                sweep = sweep % (2 * Math.PI);
                if (sweep > 0) {
                    sweep -= 2 * Math.PI;
                }
                if (sweep === 0 && endAngle !== startAngle) {
                    sweep = -2 * Math.PI;
                }
            }
        } else {
            if (sweep >= 2 * Math.PI || sweep < 0) {
                sweep = sweep % (2 * Math.PI);
                if (sweep < 0) {
                    sweep += 2 * Math.PI;
                }
                if (sweep === 0 && endAngle !== startAngle) {
                    sweep = 2 * Math.PI;
                }
            }
        }
        const segments: number = Math.min(
            this.MAX_FLATTENING_SEGMENTS,
            Math.max(4, Math.ceil(r * Math.abs(sweep) / 2)));
        const startX: number = cx + r * Math.cos(startAngle);
        const startY: number = cy + r * Math.sin(startAngle);
        // canvas semantics: a line connects the current point to the arc start
        if (this.hasCurrentPoint) {
            this.pathSegments.push(this.currentX, this.currentY, startX, startY);
        } else {
            this.subpathStartX = startX;
            this.subpathStartY = startY;
            this.hasCurrentPoint = true;
        }
        let prevX: number = startX;
        let prevY: number = startY;
        for (let i: number = 1; i <= segments; i++) {
            const angle: number = startAngle + sweep * (i / segments);
            const px: number = cx + r * Math.cos(angle);
            const py: number = cy + r * Math.sin(angle);
            this.pathSegments.push(prevX, prevY, px, py);
            prevX = px;
            prevY = py;
        }
        this.currentX = prevX;
        this.currentY = prevY;
    }

    public rect(x: number, y: number, width: number, height: number): void {
        this.moveTo(x, y);
        this.lineTo(x + width, y);
        this.lineTo(x + width, y + height);
        this.lineTo(x, y + height);
        this.closePath();
        this.moveTo(x, y);
    }

    public closePath(): void {
        if (this.hasCurrentPoint && (this.currentX !== this.subpathStartX || this.currentY !== this.subpathStartY)) {
            this.pathSegments.push(this.currentX, this.currentY, this.subpathStartX, this.subpathStartY);
            this.currentX = this.subpathStartX;
            this.currentY = this.subpathStartY;
        }
    }

    //#endregion

    //#region drawing (merging into the extent arrays)

    /**
     * For min/max per column, the fill of a closed path has the same extents as its outline:
     * the topmost/bottommost filled point of a column always lies on the path boundary
     * (holes like in half note noteheads never contain a column's extremes).
     */
    public fill(): void {
        if (this.fillTransparent) {
            return;
        }
        const segments: number[] = this.pathSegments;
        for (let i: number = 0; i < segments.length; i += 4) {
            this.mergeSegment(segments[i], segments[i + 1], segments[i + 2], segments[i + 3]);
        }
    }

    public stroke(): void {
        if (this.strokeTransparent || !(this.currentLineWidth > 0)) {
            return;
        }
        const halfWidth: number = this.currentLineWidth * (Math.abs(this.scaleX) + Math.abs(this.scaleY)) / 4;
        const segments: number[] = this.pathSegments;
        for (let i: number = 0; i < segments.length; i += 4) {
            this.mergeStrokedSegment(segments[i], segments[i + 1], segments[i + 2], segments[i + 3], halfWidth);
        }
    }

    public fillRect(x: number, y: number, width: number, height: number): void {
        if (this.fillTransparent) {
            return;
        }
        let left: number = this.deviceX(x);
        let top: number = this.deviceY(y);
        let right: number = this.deviceX(x + width);
        let bottom: number = this.deviceY(y + height);
        if (!isFinite(left) || !isFinite(top) || !isFinite(right) || !isFinite(bottom)) {
            return;
        }
        if (right < left) {
            const tmp: number = left;
            left = right;
            right = tmp;
        }
        if (bottom < top) {
            const tmp: number = top;
            top = bottom;
            bottom = tmp;
        }
        this.mergeColumns(left, right, top, bottom);
    }

    /** Only used by VexFlow's TabNote to erase the stave lines behind fret numbers,
     *  which never affects the extents (skyline/bottom-line). Erasing is not supported by this context. */
    public clearRect(x: number, y: number, width: number, height: number): void {
        // no-op
    }

    /**
     * Merges the ink extents of the text, character by character (a single box for the whole string
     * would e.g. claim ascender height above lowercase letters, unlike the rasterized text the
     * raster method saw, which has per-character contours).
     */
    public fillText(text: string, x: number, y: number): void {
        if (this.fillTransparent || !text) {
            return;
        }
        let pen: number = this.deviceX(x);
        const baseline: number = this.deviceY(y);
        if (!isFinite(pen) || !isFinite(baseline)) {
            return;
        }
        const absScaleX: number = Math.abs(this.scaleX);
        const absScaleY: number = Math.abs(this.scaleY);
        for (const character of text) {
            const charExtents: ICharacterExtents = this.measureCharacter(character);
            // note: rasterizers with font hinting can shift glyph edges by up to a pixel depending on
            // the fractional pen position, which can't be predicted here. The exact (unrounded) edges
            // are the conservative choice: they never miss ink, at most claiming up to a pixel more.
            const inkLeft: number = pen + charExtents.inkLeft * absScaleX;
            const inkRight: number = pen + charExtents.inkRight * absScaleX;
            if (inkRight > inkLeft) { // e.g. spaces have no ink
                this.mergeColumns(inkLeft, inkRight,
                    baseline - charExtents.ascent * absScaleY, baseline + charExtents.descent * absScaleY);
            }
            pen += charExtents.advance * absScaleX;
        }
    }

    public measureText(text: string): TextMetrics {
        const metrics: TextMetrics = this.measureTextInternal(text);
        if (metrics) {
            return metrics;
        }
        if (!this.caches.measureTextWarningLogged) {
            this.caches.measureTextWarningLogged = true;
            log.info("GeometricSkyBottomLineContext: no 2D context available for measureText, using estimates.");
        }
        return {width: this.fontSizeInPixels() * this.FALLBACK_CHAR_WIDTH * text.length} as TextMetrics;
    }

    /**
     * Fast path for glyphs, called by VexFlow's (patched) Glyph.renderOutline() instead of issuing
     * the outline's dozens of path commands: merges the glyph outline's flattened line segments,
     * cached once per outline + scale (the curve flattening and command parsing are the expensive
     * part of glyph drawing, and the same glyphs repeat constantly: noteheads, accidentals, ...).
     * The merged segments are identical to the ones the normal path commands would produce,
     * so the result is exactly the same.
     * Returns true if handled (VexFlow then skips the normal path commands).
     */
    public drawCachedGlyphOutline(outline: object, scale: number, xPos: number, yPos: number): boolean {
        if (this.scaleX !== 1 || this.scaleY !== 1) {
            return false; // segments are cached per glyph scale only: use the normal path commands instead
        }
        if (this.fillTransparent) {
            return true; // invisible glyph (e.g. "#00000000"): nothing to merge, like in fill()
        }
        const deviceX: number = this.deviceX(xPos);
        const deviceY: number = this.deviceY(yPos);
        if (!isFinite(deviceX) || !isFinite(deviceY) || !isFinite(scale)) {
            return true; // canvas ignores non-finite coordinates
        }
        const segments: Float64Array = this.getGlyphSegments(outline as string[], scale);
        for (let i: number = 0; i < segments.length; i += 4) {
            this.mergeSegment(
                segments[i] + deviceX, segments[i + 1] + deviceY,
                segments[i + 2] + deviceX, segments[i + 3] + deviceY);
        }
        this.beginPath(); // the normal path would have cleared the current path, mirror that
        return true;
    }

    //#endregion

    //#region state

    public save(): void {
        this.stateStack.push({
            translateX: this.translateX,
            translateY: this.translateY,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            lineWidth: this.currentLineWidth,
            fillStyle: this.currentFillStyle,
            fillTransparent: this.fillTransparent,
            strokeStyle: this.currentStrokeStyle,
            strokeTransparent: this.strokeTransparent,
            font: this.currentFont,
        });
    }

    public restore(): void {
        const state: IGeometricContextState = this.stateStack.pop();
        if (state) {
            this.translateX = state.translateX;
            this.translateY = state.translateY;
            this.scaleX = state.scaleX;
            this.scaleY = state.scaleY;
            this.currentLineWidth = state.lineWidth;
            this.currentFillStyle = state.fillStyle;
            this.fillTransparent = state.fillTransparent;
            this.currentStrokeStyle = state.strokeStyle;
            this.strokeTransparent = state.strokeTransparent;
            this.currentFont = state.font;
        }
    }

    public scale(x: number, y: number): void {
        this.scaleX *= x;
        this.scaleY *= y;
    }

    public translate(x: number, y: number): void {
        this.translateX += x * this.scaleX;
        this.translateY += y * this.scaleY;
    }

    // style setters, both as VexFlow context methods and as canvas properties:

    public setFillStyle(style: string): GeometricSkyBottomLineContext {
        this.currentFillStyle = style;
        this.fillTransparent = isTransparent(style);
        return this;
    }

    public get fillStyle(): string {
        return this.currentFillStyle;
    }

    public set fillStyle(style: string) {
        this.setFillStyle(style);
    }

    public setStrokeStyle(style: string): GeometricSkyBottomLineContext {
        this.currentStrokeStyle = style;
        this.strokeTransparent = isTransparent(style);
        return this;
    }

    public get strokeStyle(): string {
        return this.currentStrokeStyle;
    }

    public set strokeStyle(style: string) {
        this.setStrokeStyle(style);
    }

    public setLineWidth(width: number): GeometricSkyBottomLineContext {
        this.currentLineWidth = width;
        return this;
    }

    public get lineWidth(): number {
        return this.currentLineWidth;
    }

    public set lineWidth(width: number) {
        this.currentLineWidth = width;
    }

    public setFont(f?: string | Record<string, any>, size?: number, weight?: string | number): GeometricSkyBottomLineContext {
        // Handle VF5 FontInfo object (e.g. {family, size, weight, style})
        if (typeof f === "object" && f !== null) {
            const fi: any = f;
            const family: string = fi.family || "";
            const sz: number = typeof fi.size === "number" ? fi.size : parseInt(String(fi.size), 10) || 10;
            const wt: string = fi.weight && fi.weight !== "normal" ? String(fi.weight) + " " : "";
            this.currentFont = wt + sz + "pt " + family;
            return this;
        }
        // Handle VF4-style (family: string, size: number, weight?: string|number)
        this.currentFont = (weight || "") + " " + (size ?? 10) + "pt " + (f || "Arial");
        return this;
    }

    public setRawFont(font: string): GeometricSkyBottomLineContext {
        this.currentFont = font;
        return this;
    }

    public get font(): string {
        return this.currentFont;
    }

    public set font(font: string) {
        this.currentFont = font;
    }

    //#endregion

    //#region no-ops (irrelevant for extents calculation)

    public clear(): void {
        this.minY.fill(Number.POSITIVE_INFINITY, 0, this.width);
        this.maxY.fill(Number.NEGATIVE_INFINITY, 0, this.width);
    }

    public pointerRect(x: number, y: number, width: number, height: number): this {
        return this; // no-op: pointer regions are irrelevant for skyline/bottomline extents
    }

    public openRotation(angleDegrees: number, x: number, y: number): void {
        // no-op: rotation for stroke decorations (arpeggios, rolls) doesn't affect extents
    }

    public closeRotation(): void {
        // no-op
    }

    public openGroup(cls?: string, id?: string, attrs?: object): undefined {
        return undefined; // like on a canvas context: groups only exist in SVG
    }

    public closeGroup(): void {
        // no-op
    }

    public getGroup(): undefined {
        return undefined;
    }

    public add(): void {
        // no-op
    }

    public setBackgroundFillStyle(style: string): GeometricSkyBottomLineContext {
        return this; // background is never drawn here
    }

    public setShadowColor(style: string): GeometricSkyBottomLineContext {
        return this; // shadows are not used by OSMD
    }

    public setShadowBlur(blur: number): GeometricSkyBottomLineContext {
        return this;
    }

    public setLineCap(capType: string): GeometricSkyBottomLineContext {
        return this; // butt caps are assumed; round/square caps would add at most lineWidth/2
    }

    public setLineDash(dash: number[]): GeometricSkyBottomLineContext {
        return this; // dashed lines are treated as solid (conservative)
    }

    public set lineCap(capType: string) {
        // no-op
    }

    public set lineDash(dash: number[]) {
        // no-op
    }

    public glow(): GeometricSkyBottomLineContext {
        return this;
    }

    //#endregion

    //#region private helpers

    private deviceX(x: number): number {
        return x * this.scaleX + this.translateX;
    }

    private deviceY(y: number): number {
        return y * this.scaleY + this.translateY;
    }

    private flatteningSegments(controlPolygonLength: number): number {
        return Math.min(
            this.MAX_FLATTENING_SEGMENTS,
            Math.max(2, Math.ceil(controlPolygonLength / this.FLATTENING_SEGMENT_LENGTH)));
    }

    /** Merges a line segment (in device coordinates) into the extent arrays. */
    private mergeSegment(x0: number, y0: number, x1: number, y1: number): void {
        if (x1 < x0) {
            let tmp: number = x0;
            x0 = x1;
            x1 = tmp;
            tmp = y0;
            y0 = y1;
            y1 = tmp;
        }
        if (x1 - x0 < 1e-7) {
            // (Nearly) vertical segment: a single column.
            // If it lies exactly on a column boundary, it covers nothing of either column, and the
            // rasterizer paints nothing - e.g. the end cap of a stroke ending exactly at x = 0,
            // which occurs for the negative-width staves of some extra graphical measures
            // (see test_octaveshift_extragraphicalmeasure): claiming the column there would also
            // poison the "fill empty columns from neighbors" step for such mostly empty measures.
            if (x0 === Math.trunc(x0)) {
                return;
            }
            const column: number = Math.floor(x0);
            if (column < 0 || column >= this.width) {
                return; // outside the measure (horizontal clipping like on the per-measure canvas)
            }
            const lo: number = Math.min(y0, y1);
            const hi: number = Math.max(y0, y1);
            if (lo < this.minY[column]) {
                this.minY[column] = lo;
            }
            if (hi > this.maxY[column]) {
                this.maxY[column] = hi;
            }
            return;
        }
        const firstColumn: number = Math.max(0, Math.floor(x0));
        // a segment whose right end lies exactly on a column boundary covers nothing of that column:
        const lastColumn: number = Math.min(this.width - 1, Math.floor(x1 - 1e-9));
        if (lastColumn < firstColumn) {
            return; // outside the measure (horizontal clipping like on the per-measure canvas)
        }
        const slope: number = (y1 - y0) / (x1 - x0);
        for (let column: number = firstColumn; column <= lastColumn; column++) {
            const xa: number = Math.max(x0, column);
            const xb: number = Math.min(x1, column + 1);
            const ya: number = y0 + (xa - x0) * slope;
            const yb: number = y0 + (xb - x0) * slope;
            let lo: number = ya;
            let hi: number = yb;
            if (lo > hi) {
                const tmp: number = lo;
                lo = hi;
                hi = tmp;
            }
            if (lo < this.minY[column]) {
                this.minY[column] = lo;
            }
            if (hi > this.maxY[column]) {
                this.maxY[column] = hi;
            }
        }
    }

    /** Merges a stroked line segment by merging the outline of its (butt-capped) stroke rectangle. */
    private mergeStrokedSegment(x0: number, y0: number, x1: number, y1: number, halfWidth: number): void {
        const dx: number = x1 - x0;
        const dy: number = y1 - y0;
        const length: number = Math.sqrt(dx * dx + dy * dy);
        if (length < 1e-7) {
            // degenerate segment: stroke it as a (cap-less) point with extents in both directions, conservatively
            this.mergeColumns(x0 - halfWidth, x0 + halfWidth, y0 - halfWidth, y0 + halfWidth);
            return;
        }
        // outline of the stroke rectangle: the segment offset by +/- halfWidth along its normal
        const normalX: number = -dy / length * halfWidth;
        const normalY: number = dx / length * halfWidth;
        this.mergeSegment(x0 + normalX, y0 + normalY, x1 + normalX, y1 + normalY);
        this.mergeSegment(x1 + normalX, y1 + normalY, x1 - normalX, y1 - normalY);
        this.mergeSegment(x1 - normalX, y1 - normalY, x0 - normalX, y0 - normalY);
        this.mergeSegment(x0 - normalX, y0 - normalY, x0 + normalX, y0 + normalY);
    }

    /** Merges the vertical range [top, bottom] into all columns intersecting [left, right) (device coordinates). */
    private mergeColumns(left: number, right: number, top: number, bottom: number): void {
        if (!(right > left)) {
            return; // zero or negative width: nothing is drawn
        }
        const firstColumn: number = Math.max(0, Math.floor(left));
        const lastColumn: number = Math.min(this.width - 1, Math.ceil(right) - 1);
        for (let column: number = firstColumn; column <= lastColumn; column++) {
            if (top < this.minY[column]) {
                this.minY[column] = top;
            }
            if (bottom > this.maxY[column]) {
                this.maxY[column] = bottom;
            }
        }
    }

    /** Font size in px, parsed from the current font string (e.g. "italic 10pt Arial" or "12px Times"). */
    private fontSizeInPixels(): number {
        const match: RegExpMatchArray = this.currentFont?.match(/([0-9.]+)\s*(pt|px)/);
        if (!match) {
            return 10 * this.PT_TO_PX;
        }
        const size: number = parseFloat(match[1]);
        return match[2] === "pt" ? size * this.PT_TO_PX : size;
    }

    /** Returns the cached flattened segments for a glyph outline at the given scale,
     *  computing them on first use (see drawCachedGlyphOutline()). */
    private getGlyphSegments(outline: string[], scale: number): Float64Array {
        let segmentsByScale: Map<number, Float64Array> = this.caches.glyphSegments.get(outline);
        if (!segmentsByScale) {
            segmentsByScale = new Map<number, Float64Array>();
            this.caches.glyphSegments.set(outline, segmentsByScale);
        }
        let segments: Float64Array = segmentsByScale.get(scale);
        if (!segments) {
            segments = this.computeGlyphSegments(outline, scale);
            segmentsByScale.set(scale, segments);
        }
        return segments;
    }

    /** Flattens a glyph outline at the given scale into line segments relative to the glyph origin,
     *  by replaying the outline (the same way VexFlow's Glyph.processOutline does, with y inverted)
     *  into a scratch context's path, so the segments are identical to the normal path commands'. */
    private computeGlyphSegments(outline: string[], scale: number): Float64Array {
        if (!this.caches.glyphSegmentsScratch) {
            this.caches.glyphSegmentsScratch = new GeometricSkyBottomLineContext(0, 300, this.caches);
        }
        const scratch: GeometricSkyBottomLineContext = this.caches.glyphSegmentsScratch;
        scratch.initialize(0); // only the path is used, nothing is merged
        // replay the outline like VexFlow's processOutline(outline, 0, 0, scale, -scale, ...):
        let i: number = 0;
        while (i < outline.length) {
            switch (outline[i++]) {
                case "m":
                    scratch.moveTo(Number(outline[i++]) * scale, Number(outline[i++]) * -scale);
                    break;
                case "l":
                    scratch.lineTo(Number(outline[i++]) * scale, Number(outline[i++]) * -scale);
                    break;
                case "q": {
                    const x: number = Number(outline[i++]) * scale;
                    const y: number = Number(outline[i++]) * -scale;
                    scratch.quadraticCurveTo(Number(outline[i++]) * scale, Number(outline[i++]) * -scale, x, y);
                    break;
                }
                case "b": {
                    const x: number = Number(outline[i++]) * scale;
                    const y: number = Number(outline[i++]) * -scale;
                    scratch.bezierCurveTo(
                        Number(outline[i++]) * scale, Number(outline[i++]) * -scale,
                        Number(outline[i++]) * scale, Number(outline[i++]) * -scale,
                        x, y);
                    break;
                }
                default:
                    break;
            }
        }
        return Float64Array.from(scratch.pathSegments);
    }

    /** Measures the ink extents of a single character in the current font, cached.
     *  Uses TextMetrics.actualBoundingBox* (exact ink extents) where available,
     *  with estimates from the font size as a fallback. */
    private measureCharacter(character: string): ICharacterExtents {
        const cacheKey: string = this.currentFont + " " + character;
        let extents: ICharacterExtents = this.caches.characterExtents.get(cacheKey);
        if (extents) {
            return extents;
        }
        const fontSizePx: number = this.fontSizeInPixels();
        const metrics: TextMetrics = this.measureTextInternal(character);
        if (metrics) {
            const advance: number = metrics.width;
            // most accurate: probe the actual rasterized ink of the character (same rasterizer
            // the raster method used, including font hinting and side bearings)
            extents = this.probeCharacterInk(character, advance, fontSizePx);
            if (!extents && metrics.actualBoundingBoxAscent !== undefined) {
                extents = {
                    advance,
                    ascent: metrics.actualBoundingBoxAscent,
                    descent: metrics.actualBoundingBoxDescent,
                    // ink span relative to the pen: [-actualBoundingBoxLeft, actualBoundingBoxRight],
                    // clamped to the advance box (some environments report slightly off side bearings)
                    inkLeft: Math.max(0, -metrics.actualBoundingBoxLeft),
                    inkRight: Math.min(advance, metrics.actualBoundingBoxRight),
                };
            }
            if (!extents) {
                extents = {
                    advance,
                    ascent: fontSizePx * this.FALLBACK_FONT_ASCENT,
                    descent: fontSizePx * this.FALLBACK_FONT_DESCENT,
                    inkLeft: 0,
                    inkRight: character.trim().length === 0 ? 0 : advance,
                };
            }
        } else {
            const advance: number = fontSizePx * this.FALLBACK_CHAR_WIDTH;
            extents = {
                advance,
                ascent: fontSizePx * this.FALLBACK_FONT_ASCENT,
                descent: fontSizePx * this.FALLBACK_FONT_DESCENT,
                inkLeft: 0,
                inkRight: character.trim().length === 0 ? 0 : advance,
            };
        }
        this.caches.characterExtents.set(cacheKey, extents);
        return extents;
    }

    /** Renders a single character to a small hidden canvas and scans its exact ink extents.
     *  Only happens once per font + character (see characterExtentsCache); the canvas is tiny
     *  (a few hundred pixels), so this has none of the performance issues of the per-measure
     *  getImageData calls of the raster method. Returns undefined if no canvas is available. */
    private probeCharacterInk(character: string, advance: number, fontSizePx: number): ICharacterExtents {
        const caches: GeometricSkyBottomLineCaches = this.caches;
        if (!caches.characterProbeContext && !caches.characterProbeCreationFailed) {
            try {
                caches.characterProbeCanvas = document.createElement("canvas");
                caches.characterProbeContext = caches.characterProbeCanvas.getContext("2d", {willReadFrequently: true}) as CanvasRenderingContext2D;
            } catch (e) {
                // e.g. document does not exist (pure node without DOM)
            }
            if (!caches.characterProbeContext) {
                caches.characterProbeCreationFailed = true;
            }
        }
        const context: CanvasRenderingContext2D = caches.characterProbeContext;
        if (!context) {
            return undefined;
        }
        const padding: number = Math.ceil(fontSizePx); // room for side bearings / italic overhang
        const width: number = Math.ceil(advance) + 2 * padding;
        const height: number = Math.ceil(3 * fontSizePx) + 2;
        const penX: number = padding;
        const baselineY: number = Math.ceil(2 * fontSizePx);
        try {
            const canvas: HTMLCanvasElement = caches.characterProbeCanvas;
            if (canvas.width < width) {
                canvas.width = width;
            }
            if (canvas.height < height) {
                canvas.height = height;
            }
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.font = this.currentFont;
            context.fillStyle = "#000000";
            context.fillText(character, penX, baselineY);
            const imageData: ImageData = context.getImageData(0, 0, width, height);
            const data: Uint8ClampedArray = imageData.data;
            let minX: number = Number.MAX_SAFE_INTEGER;
            let maxX: number = -1;
            let minY: number = Number.MAX_SAFE_INTEGER;
            let maxY: number = -1;
            for (let pixelY: number = 0; pixelY < height; pixelY++) {
                const rowOffset: number = pixelY * width * 4;
                for (let pixelX: number = 0; pixelX < width; pixelX++) {
                    if (data[rowOffset + pixelX * 4 + 3] > 0) {
                        if (pixelX < minX) {
                            minX = pixelX;
                        }
                        if (pixelX > maxX) {
                            maxX = pixelX;
                        }
                        if (pixelY < minY) {
                            minY = pixelY;
                        }
                        if (pixelY > maxY) {
                            maxY = pixelY;
                        }
                    }
                }
            }
            if (maxX < 0) { // no ink, e.g. a space
                return {advance, ascent: 0, descent: 0, inkLeft: 0, inkRight: 0};
            }
            return {
                advance,
                ascent: baselineY - minY,
                descent: maxY + 1 - baselineY,
                inkLeft: minX - penX,
                inkRight: maxX + 1 - penX,
            };
        } catch (e) {
            caches.characterProbeCreationFailed = true; // e.g. canvas without 2D rasterizer
            return undefined;
        }
    }

    private measureTextInternal(text: string): TextMetrics {
        const caches: GeometricSkyBottomLineCaches = this.caches;
        if (!caches.textMeasureContext && !caches.textMeasureContextCreationFailed) {
            try {
                const canvas: HTMLCanvasElement = document.createElement("canvas");
                caches.textMeasureContext = canvas.getContext("2d");
            } catch (e) {
                // e.g. document does not exist (pure node without DOM): fall back to estimates
            }
            if (!caches.textMeasureContext) {
                caches.textMeasureContextCreationFailed = true;
            }
        }
        const context: CanvasRenderingContext2D = caches.textMeasureContext;
        if (!context) {
            return undefined;
        }
        if (context.font !== this.currentFont) {
            context.font = this.currentFont;
        }
        return context.measureText(text);
    }

    //#endregion
}

/** Whether a fill/stroke style is completely transparent, i.e. invisible,
 *  like "#12345600" (8-digit hex with alpha 00, as used by OSMD for invisible elements) or "rgba(0,0,0,0)".
 *  The raster method ignored these via its alpha > 0 pixel test. */
function isTransparent(style: string): boolean {
    if (!style || typeof style !== "string") {
        return false; // unknown style (e.g. gradient object): assume visible
    }
    if (style === "none" || style === "transparent") {
        return true;
    }
    if (style[0] === "#") {
        if (style.length === 9) { // #rrggbbaa
            return style[7] === "0" && style[8] === "0";
        }
        if (style.length === 5) { // #rgba
            return style[4] === "0";
        }
        return false;
    }
    const rgbaMatch: RegExpMatchArray = style.match(/^rgba\s*\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\s*\)/i);
    if (rgbaMatch) {
        return parseFloat(rgbaMatch[1]) === 0;
    }
    return false;
}

/**
 * Caches and shared helper objects for GeometricSkyBottomLineContext. All cached values are pure
 * functions of their keys (font + character, glyph outline + scale), so they could in principle be
 * shared globally - but they are kept as an instanced object (owned by EngravingRules, like e.g.
 * NoteToGraphicalNoteMap) to avoid mutable static state, so that multiple OSMD instances on one
 * page stay fully independent (and the caches are freed with the instance).
 */
export class GeometricSkyBottomLineCaches {
    /** Shared hidden canvas context used only for measureText() (cheap, no pixel readback). */
    public textMeasureContext: CanvasRenderingContext2D;
    public textMeasureContextCreationFailed: boolean = false;
    public measureTextWarningLogged: boolean = false;
    /** Character ink extents, cached by font + character (see measureCharacter()). */
    public characterExtents: Map<string, ICharacterExtents> = new Map<string, ICharacterExtents>();
    /** Flattened line segments of glyph outlines (quadruples x0,y0,x1,y1, relative to the glyph
     *  origin, already scaled and y-inverted), cached per outline (by reference) and scale, see
     *  drawCachedGlyphOutline(). VexFlow caches the outline arrays on its font glyph entries,
     *  so they are stable keys that live as long as the font. */
    public glyphSegments: WeakMap<object, Map<number, Float64Array>> =
        new WeakMap<object, Map<number, Float64Array>>();
    /** Scratch context used to flatten glyph outlines (reused, see computeGlyphSegments()). */
    public glyphSegmentsScratch: GeometricSkyBottomLineContext;
    /** Tiny hidden canvas used to probe the exact rasterized ink extents of single characters
     *  (once per font + character, then cached in characterExtents). */
    public characterProbeCanvas: HTMLCanvasElement;
    public characterProbeContext: CanvasRenderingContext2D;
    public characterProbeCreationFailed: boolean = false;
}

/** Ink extents of a single character, in px for the font it was measured with.
 *  inkLeft/inkRight are relative to the pen position (inkLeft can be slightly negative,
 *  e.g. italic overhang, and inkRight can exceed the advance width). */
interface ICharacterExtents {
    advance: number;
    ascent: number;
    descent: number;
    inkLeft: number;
    inkRight: number;
}

/** Drawing state that can be saved/restored with save()/restore(), mirroring canvas semantics. */
interface IGeometricContextState {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    lineWidth: number;
    fillStyle: string;
    fillTransparent: boolean;
    strokeStyle: string;
    strokeTransparent: boolean;
    font: string;
}
