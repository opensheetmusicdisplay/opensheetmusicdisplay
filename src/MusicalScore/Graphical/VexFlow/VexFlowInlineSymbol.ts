import Vex, { IRenderContext } from "vexflow";
import VF = Vex.Flow;
import { isSupportedTextSymbol } from "../../Label";

/** Basic SMuFL metronome notes, composed from the bundled VexFlow outlines.
 *  Measurement and SVG/Canvas drawing share this geometry; the ink fits inside one text line. */
export class VexFlowInlineSymbol {
    private glyphs: {glyph: VF.Glyph, x: number, y: number}[] = [];
    private stem: {x: number, y: number, height: number};
    private left: number = 0;
    private top: number = 0;
    private scale: number;
    private height: number;
    public Width: number;

    public static create(name: string): VexFlowInlineSymbol {
        if (!isSupportedTextSymbol(name)) { return undefined; }
        if (name === "metAugmentationDot") {
            return new VexFlowInlineSymbol("dot");
        }
        const match: RegExpMatchArray = /^metNote(Whole|Half|Quarter|8th|16th|32nd|64th|128th)(Up|Down)?$/.exec(name);
        if (!match || (match[1] === "Whole" ? !!match[2] : !match[2])) { return undefined; }
        const durations: {[name: string]: string} = {Whole: "w", Half: "h", Quarter: "q",
            "8th": "8", "16th": "16", "32nd": "32", "64th": "64", "128th": "128"};
        return new VexFlowInlineSymbol(durations[match[1]], match[2] === "Down");
    }

    private constructor(duration: string, down: boolean = false) {
        if (duration === "dot") {
            this.addGlyph("v23", 0, 0);
            const box: VF.BoundingBox = (this.glyphs[0].glyph as any).bbox;
            this.left = box.getX();
            this.top = box.getY();
            this.scale = 0.12 / box.getH();
            this.height = 0.12;
            this.Width = box.getW() * this.scale + 0.15;
            return;
        }
        const props: any = (VF as any).getGlyphProps(duration);
        this.addGlyph(props.code_head, 0, 0);
        const headWidth: number = this.glyphs[0].glyph.getMetrics().width;
        if (props.stem) {
            // SMuFL's text notes use shorter stems than notes on a staff.
            let stemHeight: number = 22;
            const stemX: number = down ? 0 : headWidth - 1;
            if (props.flag) {
                this.addGlyph(down ? props.code_flag_downstem : props.code_flag_upstem, stemX, 0);
                const box: VF.BoundingBox = (this.glyphs[1].glyph as any).bbox;
                stemHeight = Math.max(stemHeight, (down ? -box.getY() : box.getY() + box.getH()) - 4);
                this.glyphs[1].y = down ? stemHeight : -stemHeight;
            }
            this.stem = {x: stemX, y: down ? 0 : -stemHeight, height: stemHeight};
        }
        let right: number = this.stem ? this.stem.x + 1 : 0;
        let bottom: number = this.stem ? this.stem.y + this.stem.height : 0;
        this.top = this.stem?.y ?? 0;
        for (const part of this.glyphs) {
            const box: VF.BoundingBox = (part.glyph as any).bbox;
            this.left = Math.min(this.left, part.x + box.getX());
            this.top = Math.min(this.top, part.y + box.getY());
            right = Math.max(right, part.x + box.getX() + box.getW());
            bottom = Math.max(bottom, part.y + box.getY() + box.getH());
        }
        this.scale = Math.min(0.8 / (bottom - this.top), 0.035);
        this.height = (bottom - this.top) * this.scale;
        this.Width = (right - this.left) * this.scale + 0.15;
    }

    private addGlyph(code: string, x: number, y: number): void {
        this.glyphs.push({glyph: new VF.Glyph(code, 32), x, y});
    }

    public draw(ctx: IRenderContext, x: number, y: number, height: number, name: string, color?: string): Node {
        ctx.save();
        const node: Node = ctx.openGroup("wordsymbol");
        if (node) { (node as Element).setAttribute("data-symbol", name); }
        if (color) { ctx.setFillStyle(color); ctx.setStrokeStyle(color); }
        const scale: number = this.scale * height;
        const originX: number = x + 0.075 * height - this.left * scale;
        const originY: number = y + (name === "metAugmentationDot" ? 0.7 : 1 - this.height) * height - this.top * scale;
        for (const part of this.glyphs) {
            (part.glyph as any).setPoint(32 * scale);
            part.glyph.reset();
            part.glyph.render(ctx, originX + part.x * scale, originY + part.y * scale);
        }
        if (this.stem) {
            ctx.fillRect(originX + this.stem.x * scale, originY + this.stem.y * scale, scale, this.stem.height * scale);
        }
        ctx.closeGroup();
        ctx.restore();
        return node;
    }
}
