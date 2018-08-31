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

  public getRenderer(): Vex.Flow.Renderer {
    return this.renderer;
  }

  public abstract getContext(): Vex.Flow.RenderContext;

  // public abstract setWidth(width: number): void;
  // public abstract setHeight(height: number): void;

  public abstract scale(k: number): void;

  public resize(x: number, y: number): void {
    this.renderer.resize(x, y);
  }

  public abstract clear(): void;

  public abstract translate(x: number, y: number): void;
  public abstract renderText(fontHeight: number, fontStyle: FontStyles, font: Fonts, text: string,
                             heightInPixel: number, screenPosition: PointF2D): void;
  /**
   * Renders a rectangle with the given style to the screen.
   * It is given in screen coordinates.
   * @param rectangle the rect in screen coordinates
   * @param layer is the current rendering layer. There are many layers on top of each other to which can be rendered. Not needed for now.
   * @param styleId the style id
   * @param alpha alpha value between 0 and 1
   */
  public abstract renderRectangle(rectangle: RectangleF2D, styleId: number, alpha: number): void;

  public abstract renderLine(start: PointF2D, stop: PointF2D, color: string, lineWidth: number): void;

  public abstract renderCurve(points: PointF2D[]): void;

  public abstract getBackendType(): number;

  protected renderer: Vex.Flow.Renderer;
  protected inner: HTMLElement;
  protected canvas: HTMLElement;
}
