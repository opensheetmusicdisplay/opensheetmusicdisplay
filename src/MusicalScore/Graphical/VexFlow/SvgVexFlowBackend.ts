import Vex = require("vexflow");

import {VexFlowBackend} from "./VexFlowBackend";
import {VexFlowConverter} from "./VexFlowConverter";
import {FontStyles} from "../../../Common/Enums/FontStyles";
import {Fonts} from "../../../Common/Enums/Fonts";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {PointF2D} from "../../../Common/DataObjects/PointF2D";
import { EngravingRules } from "../EngravingRules";

export class SvgVexFlowBackend extends VexFlowBackend {
    private backgroundFillStyle: string = EngravingRules.Rules.BackgroundColorFillStyle;

    public getBackendType(): number {
        return Vex.Flow.Renderer.Backends.SVG;
    }

    public initialize(container: HTMLElement): void {
        this.canvas = document.createElement("div");
        this.inner = this.canvas;
        this.inner.style.position = "relative";
        this.canvas.style.zIndex = "0";
        container.appendChild(this.inner);
        this.renderer = new Vex.Flow.Renderer(this.canvas, this.getBackendType());
        this.ctx = <Vex.Flow.SVGContext>this.renderer.getContext();
        this.ctx.setBackgroundFillStyle(this.backgroundFillStyle);
    }

    public getContext(): Vex.Flow.SVGContext {
        return this.ctx;
    }

    public clear(x: number = -1, y: number = -1, width: number = -1, height: number = -1): void {
        const { svg } = this.ctx;
        if (!svg) {
            return;
        }
        // removes all children from the SVG element,
        // effectively clearing the SVG viewport
        while (svg.lastChild) {
            svg.removeChild(svg.lastChild);
        }

        if (x !== -1) {
            if (this.backgroundFillStyle === "transparent") {
                (this.ctx as any).clearRect(x, y, width, height);
                // should in theory fill with transparency
                // currently fills with bgcolor in vexflow
            } else {
                // filling with background color currently prevents cursor showing if on z=-1
                // note that rect works like canvascontext.fillRect right now
                (this.ctx as any).rect(x, y, width, height, this.ctx.background_attributes);

                // could also use clearRect for now
                // (this.ctx as any).clearRect(x, y, width, height);

                // this alternative prevents the cursor from showing (unless alpha<1)
                // const backgroundRectangle: RectangleF2D = new RectangleF2D(x, y, width, height);
                // this.renderRectangleByStyle(backgroundRectangle, this.backgroundFillStyle, 1);
            }
        }
    }

    public getBackgroundColor(): string {
        return this.backgroundFillStyle;
    }

    public setBackgroundColor(colorOrStyle: string): void {
        this.backgroundFillStyle = colorOrStyle;
        this.ctx.setBackgroundFillStyle(colorOrStyle);
    }

    public scale(k: number): void {
        this.ctx.scale(k, k);
    }

    public translate(x: number, y: number): void {
        // TODO: implement this
    }
    public renderText(fontHeight: number, fontStyle: FontStyles, font: Fonts, text: string,
                      heightInPixel: number, screenPosition: PointF2D): void {
        this.ctx.save();

        this.ctx.setFont("Times New Roman", fontHeight, VexFlowConverter.fontStyle(fontStyle));
        // font size is set by VexFlow in `pt`. This overwrites the font so it's set to px instead
        this.ctx.attributes["font-size"] = `${fontHeight}px`;
        this.ctx.state["font-size"] = `${fontHeight}px`;
        this.ctx.fillText(text, screenPosition.x, screenPosition.y + heightInPixel);
        this.ctx.restore();
    }
    public renderRectangle(rectangle: RectangleF2D, styleId: number, alpha: number = 1): void {
        const style: string = VexFlowConverter.style(styleId);
        this.renderRectangleByStyle(rectangle, style, alpha);
    }
    private renderRectangleByStyle(rectangle: RectangleF2D, style: string, alpha: number = 1): void {
        this.ctx.save();
        this.ctx.attributes.fill = style;
        this.ctx.attributes["fill-opacity"] = alpha;
        // this.ctx.attributes["stroke-width"] = 0;
        this.ctx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        // (<any>this.ctx).rect(rectangle.x, rectangle.y, rectangle.width, rectangle.height, this.ctx.attributes);
        this.ctx.restore();
        this.ctx.attributes["fill-opacity"] = 1;
    }

    public renderLine(start: PointF2D, stop: PointF2D, color: string = "#FF0000FF"): void {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(stop.x, stop.y);
        this.ctx.attributes.stroke = color;
        this.ctx.lineWidth = 2;
        this.ctx.attributes["stroke-linecap"] = "round";
        this.ctx.stroke();
        this.ctx.restore();
    }

    private ctx: Vex.Flow.SVGContext;
}
