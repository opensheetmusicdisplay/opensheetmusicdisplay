import Vex = require("vexflow");

import {VexFlowBackend} from "./VexFlowBackend";
import {FontStyles} from "../../../Common/Enums/FontStyles";
import {Fonts} from "../../../Common/Enums/Fonts";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {PointF2D} from "../../../Common/DataObjects/PointF2D";

export class SvgVexFlowBackend extends VexFlowBackend {

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
    this.ctx = this.renderer.getContext();

  }

  public translate(x: number, y: number): void {
    // TODO
  }
  public renderText(fontHeight: number, fontStyle: FontStyles, font: Fonts, text: string,
                    heightInPixel: number, screenPosition: PointF2D): void {
    // TODO
  }
  public renderRectangle(rectangle: RectangleF2D, styleId: number): void {
    this.ctx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
  }
}
