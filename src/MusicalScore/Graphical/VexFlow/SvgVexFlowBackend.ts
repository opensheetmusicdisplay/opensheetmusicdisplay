import Vex = require("vexflow");

import {VexFlowBackend} from "./VexFlowBackend";
import {VexFlowConverter} from "./VexFlowConverter";
import {FontStyles} from "../../../Common/Enums/FontStyles";
import {Fonts} from "../../../Common/Enums/Fonts";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {PointF2D} from "../../../Common/DataObjects/PointF2D";

export class SvgVexFlowBackend extends VexFlowBackend {

    private ctx: Vex.Flow.SVGContext;

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

    }

    public getContext(): Vex.Flow.SVGContext {
        return this.ctx;
    }

    public clear(): void {
        if (!this.ctx) {
            return;
        }
        const { svg } = this.ctx;
        // removes all children from the SVG element,
        // effectively clearing the SVG viewport
        while (svg.lastChild) {
            svg.removeChild(svg.lastChild);
        }
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
        this.ctx.save();
        this.ctx.attributes.fill = VexFlowConverter.style(styleId);
        this.ctx.attributes["fill-opacity"] = alpha;
        this.ctx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        this.ctx.restore();
        this.ctx.attributes["fill-opacity"] = 1;
    }

    public renderLine(start: PointF2D, stop: PointF2D, color: string = "#FF0000FF", lineWidth: number = 2): void {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(stop.x, stop.y);

        this.ctx.attributes.stroke = color;
        //this.ctx.attributes.strokeStyle = color;
        //this.ctx.attributes["font-weight"] = "bold";
        //this.ctx.attributes["stroke-linecap"] = "round";

        this.ctx.lineWidth = lineWidth;

        this.ctx.stroke();
        this.ctx.restore();
    }

    public renderCurve(points: PointF2D[]): void {
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        this.ctx.bezierCurveTo(
            points[1].x,
            points[1].y,
            points[2].x,
            points[2].y,
            points[3].x,
            points[3].y
            );
        this.ctx.lineTo(points[7].x, points[7].y);
        this.ctx.bezierCurveTo(
            points[6].x,
            points[6].y,
            points[5].x,
            points[5].y,
            points[4].x,
            points[4].y
            );
        this.ctx.lineTo(points[0].x, points[0].y);
        //this.ctx.stroke();
        this.ctx.closePath();
        this.ctx.fill();
    }
}
