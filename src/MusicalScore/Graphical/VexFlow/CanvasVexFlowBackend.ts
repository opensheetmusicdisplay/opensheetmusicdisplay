import Vex from "vexflow";
import VF = Vex.Flow;

import {VexFlowBackend} from "./VexFlowBackend";
import {FontStyles} from "../../../Common/Enums/FontStyles";
import {Fonts} from "../../../Common/Enums/Fonts";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {PointF2D} from "../../../Common/DataObjects/PointF2D";
import {VexFlowConverter} from "./VexFlowConverter";
import {BackendType} from "../../../OpenSheetMusicDisplay/OSMDOptions";
import {EngravingRules} from "../EngravingRules";
import {GraphicalMusicPage} from "../GraphicalMusicPage";

export class CanvasVexFlowBackend extends VexFlowBackend {
    private zoom: number;

    constructor(rules: EngravingRules) {
        super();
        this.rules = rules;
    }

    public getVexflowBackendType(): VF.Renderer.Backends {
        return VF.Renderer.Backends.CANVAS;
    }

    public getOSMDBackendType(): BackendType {
        return BackendType.Canvas;
    }

    public getCanvasSize(): number {
        return document.getElementById("osmdCanvasPage" + this.graphicalMusicPage.PageNumber)?.offsetHeight;
        // smaller inner canvas:
        // return Number.parseInt(
        //     document.getElementById("osmdCanvasVexFlowBackendCanvas" + this.graphicalMusicPage.PageNumber)?.style.height, 10);
    }

    public initialize(container: HTMLElement, zoom: number): void {
        this.zoom = zoom;
        this.canvas = document.createElement("canvas");
        if (!this.graphicalMusicPage) {
            this.graphicalMusicPage = new GraphicalMusicPage(undefined);
            this.graphicalMusicPage.PageNumber = 1;
        }
        this.canvas.id = "osmdCanvasVexFlowBackendCanvas" + this.graphicalMusicPage.PageNumber; // needed to extract image buffer from js
        this.inner = document.createElement("div");
        this.inner.id = "osmdCanvasPage" + this.graphicalMusicPage.PageNumber;
        this.inner.style.position = "relative";
        this.canvas.style.zIndex = "0";
        this.inner.appendChild(this.canvas);
        container.appendChild(this.inner);
        this.renderer = new VF.Renderer(this.canvas, this.getVexflowBackendType());
        this.ctx = <VF.CanvasContext>this.renderer.getContext();
    }

    /**
     * Initialize a canvas without attaching it to a DOM node. Can be used to draw in background
     * @param width Width of the canvas
     * @param height Height of the canvas
     */
    public initializeHeadless(width: number = 300, height: number = 300): void {
        if (!this.graphicalMusicPage) {
            // not needed here yet, but just for future safety, make sure the page isn't undefined
            this.graphicalMusicPage = new GraphicalMusicPage(undefined);
            this.graphicalMusicPage.PageNumber = 1;
        }
        this.canvas = document.createElement("canvas");
        (this.canvas as any).width = width;
        (this.canvas as any).height = height;
        this.renderer = new VF.Renderer(this.canvas, this.getVexflowBackendType());
        this.ctx = <VF.CanvasContext>this.renderer.getContext();
    }

    public getContext(): VF.CanvasContext {
        return this.ctx;
    }

    public clear(): void {
        (<any>this.ctx).clearRect(0, 0, (<any>this.canvas).width, (<any>this.canvas).height);

        // set background color if not transparent
        if (this.rules.PageBackgroundColor) {
            this.ctx.save();
            // note that this will hide the cursor
            this.ctx.setFillStyle(this.rules.PageBackgroundColor);
            this.zoom = 1; // remove
            this.ctx.fillRect(0, 0, (this.canvas as any).width / this.zoom, (this.canvas as any).height / this.zoom);
            this.ctx.restore();
        }
    }

    public scale(k: number): void {
        this.ctx.scale(k, k);
    }

    public translate(x: number, y: number): void {
        this.CanvasRenderingCtx.translate(x, y);
    }
    public renderText(fontHeight: number, fontStyle: FontStyles, font: Fonts, text: string,
                      heightInPixel: number, screenPosition: PointF2D,
                      color: string = undefined, fontFamily: string = undefined): Node  {
        const old: string = this.CanvasRenderingCtx.font;
        this.CanvasRenderingCtx.save();
        this.CanvasRenderingCtx.font = VexFlowConverter.font(
            fontHeight,
            fontStyle,
            font,
            this.rules,
            fontFamily
        );
        this.CanvasRenderingCtx.fillStyle = color;
        this.CanvasRenderingCtx.strokeStyle = color;
        this.CanvasRenderingCtx.fillText(text, screenPosition.x, screenPosition.y + heightInPixel);
        this.CanvasRenderingCtx.restore();
        this.CanvasRenderingCtx.font = old;
        return undefined; // can't return svg dom node
    }
    public renderRectangle(rectangle: RectangleF2D, styleId: number, colorHex: string, alpha: number = 1): Node {
        const old: string | CanvasGradient | CanvasPattern = this.CanvasRenderingCtx.fillStyle;
        if (colorHex) {
            this.CanvasRenderingCtx.fillStyle = colorHex;
        } else {
            this.CanvasRenderingCtx.fillStyle = VexFlowConverter.style(styleId);
        }
        this.CanvasRenderingCtx.globalAlpha = alpha;
        this.ctx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        this.CanvasRenderingCtx.fillStyle = old;
        this.CanvasRenderingCtx.globalAlpha = 1;
        return undefined; // can't return dom node like with SVG
    }

    public renderLine(start: PointF2D, stop: PointF2D, color: string = "#FF0000FF", lineWidth: number= 2): Node {
        const oldStyle: string | CanvasGradient | CanvasPattern = this.CanvasRenderingCtx.strokeStyle;
        this.CanvasRenderingCtx.strokeStyle = color;
        this.CanvasRenderingCtx.beginPath();
        this.CanvasRenderingCtx.moveTo(start.x, start.y);
        this.CanvasRenderingCtx.lineTo(stop.x, stop.y);
        this.CanvasRenderingCtx.stroke();
        this.CanvasRenderingCtx.strokeStyle = oldStyle;
        return undefined; // can't return svg dom node
    }

    public renderCurve(points: PointF2D[]): Node {
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
        return undefined;
    }

    private ctx: VF.CanvasContext;

    public get CanvasRenderingCtx(): CanvasRenderingContext2D {
        // This clusterfuck is only there to counter act my favorite vexflow line:
        // ctx.vexFlowCanvasContext = ctx;
        // No idea why they are saving the context but we wrap the types here
        return <CanvasRenderingContext2D>(this.ctx as any).vexFlowCanvasContext;
    }
}
