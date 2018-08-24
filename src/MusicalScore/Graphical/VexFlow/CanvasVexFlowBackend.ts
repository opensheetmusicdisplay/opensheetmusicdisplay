import Vex = require("vexflow");

import {VexFlowBackend} from "./VexFlowBackend";
import {FontStyles} from "../../../Common/Enums/FontStyles";
import {Fonts} from "../../../Common/Enums/Fonts";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {PointF2D} from "../../../Common/DataObjects/PointF2D";
import {VexFlowConverter} from "./VexFlowConverter";

export class CanvasVexFlowBackend extends VexFlowBackend {

    public getBackendType(): number {
        return Vex.Flow.Renderer.Backends.CANVAS;
    }

    public initialize(container: HTMLElement): void {
        this.canvas = document.createElement("canvas");
        this.inner = document.createElement("div");
        this.inner.style.position = "relative";
        this.canvas.style.zIndex = "0";
        this.inner.appendChild(this.canvas);
        container.appendChild(this.inner);
        this.renderer = new Vex.Flow.Renderer(this.canvas, this.getBackendType());
        this.ctx = <Vex.Flow.CanvasContext>this.renderer.getContext();
        this.canvasRenderingCtx = this.ctx.vexFlowCanvasContext;
    }

    /**
     * Initialize a canvas without attaching it to a DOM node. Can be used to draw in background
     * @param width Width of the canvas
     * @param height Height of the canvas
     */
    public initializeHeadless(width: number = 300, height: number = 300): void {
        this.canvas = document.createElement("canvas");
        (this.canvas as any).width = width;
        (this.canvas as any).height = height;
        this.renderer = new Vex.Flow.Renderer(this.canvas, this.getBackendType());
        this.ctx = <Vex.Flow.CanvasContext>this.renderer.getContext();
        this.canvasRenderingCtx = this.ctx.vexFlowCanvasContext;
    }

    public getContext(): Vex.Flow.CanvasContext {
        return this.ctx;
    }

    public clear(): void {
        (<any>this.ctx).clearRect(0, 0, (<any>this.canvas).width, (<any>this.canvas).height);
    }

    public scale(k: number): void {
        this.ctx.scale(k, k);
    }

    public translate(x: number, y: number): void {
        this.canvasRenderingCtx.translate(x, y);
    }
    public renderText(fontHeight: number, fontStyle: FontStyles, font: Fonts, text: string,
                      heightInPixel: number, screenPosition: PointF2D): void  {
        const old: string = this.canvasRenderingCtx.font;
        this.canvasRenderingCtx.font = VexFlowConverter.font(
            fontHeight,
            fontStyle,
            font
        );
        this.canvasRenderingCtx.fillText(text, screenPosition.x, screenPosition.y + heightInPixel);
        this.canvasRenderingCtx.font = old;
    }
    public renderRectangle(rectangle: RectangleF2D, styleId: number, alpha: number = 1): void {
        const old: string | CanvasGradient | CanvasPattern = this.canvasRenderingCtx.fillStyle;
        this.canvasRenderingCtx.fillStyle = VexFlowConverter.style(styleId);
        this.canvasRenderingCtx.globalAlpha = alpha;
        this.ctx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        this.canvasRenderingCtx.fillStyle = old;
        this.canvasRenderingCtx.globalAlpha = 1;
    }

    public renderLine(start: PointF2D, stop: PointF2D, color: string = "#FF0000FF", lineWidth: number= 2): void {
        const oldStyle: string | CanvasGradient | CanvasPattern = this.canvasRenderingCtx.strokeStyle;
        this.canvasRenderingCtx.strokeStyle = color;
        this.canvasRenderingCtx.beginPath();
        this.canvasRenderingCtx.moveTo(start.x, start.y);
        this.canvasRenderingCtx.lineTo(stop.x, stop.y);
        this.canvasRenderingCtx.stroke();
        this.canvasRenderingCtx.strokeStyle = oldStyle;
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

    private ctx: Vex.Flow.CanvasContext;
    private canvasRenderingCtx: CanvasRenderingContext2D;
}
