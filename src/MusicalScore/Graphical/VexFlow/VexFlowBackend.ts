import * as Vex from "vexflow";
import {FontStyles} from "../../../Common/Enums/FontStyles";
import {Fonts} from "../../../Common/Enums/Fonts";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {PointF2D} from "../../../Common/DataObjects/PointF2D";

export class VexFlowBackends {
  public static CANVAS: 0;
  public static RAPHAEL: 1;
  public static SVG: 2;
  public static VML: 3;

}

export abstract class VexFlowBackend {

  public abstract initialize(container: HTMLElement): void;

  public getInnerElement(): HTMLElement {
    return this.inner;
  }

  public getCanvas(): HTMLElement {
    return this.canvas;
  }

  public getContext(): Vex.Flow.CanvasContext {
    return this.ctx;
  }

  public getRenderer(): Vex.Flow.Renderer {
    return this.renderer;
  }

  // public abstract setWidth(width: number): void;
  // public abstract setHeight(height: number): void;

  public scale(k: number): void {
    this.ctx.scale(k, k);
  }

  public resize(x: number, y: number): void {
    this.renderer.resize(x, y);
  }

  public abstract translate(x: number, y: number): void;
  public abstract renderText(fontHeight: number, fontStyle: FontStyles, font: Fonts, text: string,
                             heightInPixel: number, screenPosition: PointF2D): void;
  public abstract renderRectangle(rectangle: RectangleF2D, styleId: number): void;

  public abstract getBackendType(): number;

  protected renderer: Vex.Flow.Renderer;
  protected inner: HTMLElement;
  protected canvas: HTMLElement;
  protected ctx: Vex.Flow.CanvasContext;
}
