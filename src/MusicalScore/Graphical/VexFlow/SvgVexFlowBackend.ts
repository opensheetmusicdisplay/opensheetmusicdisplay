import * as VF from "vexflow";


import {VexFlowBackend} from "./VexFlowBackend";
import {VexFlowConverter} from "./VexFlowConverter";
import {FontStyles} from "../../../Common/Enums/FontStyles";
import {Fonts} from "../../../Common/Enums/Fonts";
import {RectangleF2D} from "../../../Common/DataObjects/RectangleF2D";
import {PointF2D} from "../../../Common/DataObjects/PointF2D";
import {BackendType} from "../../../OpenSheetMusicDisplay/OSMDOptions";
import {EngravingRules} from "../EngravingRules";
import log from "loglevel";
import { VexFlowGraphicalNote } from "./VexFlowGraphicalNote";

export class SvgVexFlowBackend extends VexFlowBackend {

    private ctx: VF.SVGContext;
    public zoom: number; // currently unused

    constructor(rules: EngravingRules) {
        super();
        this.rules = rules;
    }

    public getVexflowBackendType(): VF.RendererBackends {
        return VF.RendererBackends.SVG;
    }

    public getOSMDBackendType(): BackendType {
        return BackendType.SVG;
    }

    public getCanvasSize(): number {
        return document.getElementById("osmdCanvasPage" + this.graphicalMusicPage.PageNumber)?.offsetHeight;
    }

    public initialize(container: HTMLElement, zoom: number): void {
        this.zoom = zoom;
        this.canvas = document.createElement("div");
        this.canvas.id = "osmdCanvasPage" + this.graphicalMusicPage.PageNumber;
        // this.canvas.id = uniqueID // TODO create unique tagName like with cursor now?
        this.inner = this.canvas;
        this.inner.style.position = "relative";
        this.canvas.style.zIndex = "0";
        container.appendChild(this.inner);
        this.renderer = new VF.Renderer(this.canvas as HTMLDivElement, this.getVexflowBackendType());
        this.ctx = <VF.SVGContext>this.renderer.getContext();
        this.ctx.svg.id = "osmdSvgPage" + this.graphicalMusicPage.PageNumber;
    }

    public getContext(): VF.SVGContext {
        return this.ctx;
    }

    public getSvgElement(): SVGElement {
        return this.ctx.svg;
    }

    removeNode(node: Node): boolean {
        const svg: SVGElement = this.ctx?.svg;
        if (!svg) {
            return false;
        }
        // unfortunately there's no method svg.hasChild(node). traversing all nodes seems inefficient.
        try {
            svg.removeChild(node);
        } catch (ex) {
            // log.error("SvgVexFlowBackend.removeNode: error:"); // unnecessary, stacktrace is in exception
            log.error(ex);
            return false;
        }
        return true;
    }

    public free(): void {
        //const { svg } = this.ctx; // seems to make svg static between osmd instances.
        const svg: SVGElement = this.ctx.svg;
        // removes all children from the SVG element,
        // effectively clearing the SVG viewport
        while (svg.lastChild) {
            svg.removeChild(svg.lastChild);
        }
    }

    public clear(): void {
        if (!this.ctx) {
            return;
        }
        this.free();

        // set background color if not transparent
        if (this.rules.PageBackgroundColor) {
        //     this.ctx.save();
        //     // note that this will hide the cursor if its zIndex is negative.
        //     this.ctx.setFillStyle(this.rules.PageBackgroundColor);
        //     this.ctx.setStrokeStyle("#12345600"); // transparent

        //     this.ctx.fillRect(0, 0, this.canvas.offsetWidth / this.zoom, this.canvas.offsetHeight / this.zoom);
        //     this.ctx.restore();
            this.ctx.svg.style["background-color"] = this.rules.PageBackgroundColor;
            // note that the cursor would be invisible if its zIndex remained negative here,
            //   so we have to push it to a higher layer and make it more transparent.
            // effectively, setting a background color will make the cursor more transparent.
        }
    }

    public scale(k: number): void {
        this.ctx.scale(k, k);
    }

    public translate(x: number, y: number): void {
        // TODO: implement this
    }
    public renderText(fontHeight: number, fontStyle: FontStyles, font: Fonts, text: string,
                      heightInPixel: number, screenPosition: PointF2D,
                      color: string = undefined, fontFamily: string = undefined): Node {
        this.ctx.save();
        const node: Node = this.ctx.openGroup("text");

        if (color) {
            this.ctx.attributes.fill = color;
            this.ctx.attributes.stroke = color;
        }
        let fontFamilyVexFlow: string = fontFamily;
        if (!fontFamily || fontFamily === "default") {
            fontFamilyVexFlow = this.rules.DefaultFontFamily;
        }
        this.ctx.setFont(fontFamilyVexFlow, fontHeight, VexFlowConverter.fontStyle(fontStyle));
        // font size is set by VexFlow in `pt`. This overwrites the font so it's set to px instead
        this.ctx.attributes["font-size"] = `${fontHeight}px`;
        this.ctx.state["font-size"] = `${fontHeight}px`;
        let fontWeightVexflow: string = "normal";
        let fontStyleVexflow: string = "normal";
        switch (fontStyle) {
            case FontStyles.Bold:
                fontWeightVexflow = "bold";
                break;
            case FontStyles.Italic:
                fontStyleVexflow = "italic";
                break;
            case FontStyles.BoldItalic:
                fontWeightVexflow = "bold";
                fontStyleVexflow = "italic";
                break;
            default:
                fontWeightVexflow = "normal";
        }
        this.ctx.attributes["font-weight"] = fontWeightVexflow;
        this.ctx.state["font-weight"] = fontWeightVexflow;
        this.ctx.attributes["font-style"] = fontStyleVexflow;
        this.ctx.state["font-style"] = fontStyleVexflow;
        this.ctx.fillText(text, screenPosition.x, screenPosition.y + heightInPixel);
        this.ctx.closeGroup();
        this.ctx.restore();
        return node;
    }
    public renderRectangle(rectangle: RectangleF2D, styleId: number, colorHex: string, alpha: number = 1): Node {
        this.ctx.save();
        const node: Node = this.ctx.openGroup("rect");
        if (colorHex) {
            this.ctx.attributes.fill = colorHex;
        } else {
            this.ctx.attributes.fill = VexFlowConverter.style(styleId);
        }
        this.ctx.attributes["fill-opacity"] = alpha;
        this.ctx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        this.ctx.restore();
        this.ctx.attributes["fill-opacity"] = 1;
        this.ctx.closeGroup();
        return node;
    }

    public renderLine(start: PointF2D, stop: PointF2D, color: string = "#FF0000FF", lineWidth: number = 2, id?: string): Node {
        this.ctx.save();
        const node: Node = this.ctx.openGroup("line", id);
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(stop.x, stop.y);

        this.ctx.attributes.stroke = color;
        //this.ctx.attributes.strokeStyle = color;
        //this.ctx.attributes["font-weight"] = "bold";
        //this.ctx.attributes["stroke-linecap"] = "round";

        (this.ctx as any).lineWidth = lineWidth;

        this.ctx.stroke();
        this.ctx.closeGroup();
        this.ctx.restore();
        return node;
    }

    public renderCurve(points: PointF2D[], isSlur?: boolean, startNote?: VexFlowGraphicalNote): Node {
        let slurId: string = undefined;
        if (isSlur && startNote) {
            slurId = `${startNote.getSVGId()}-slur`;
        }
        const node: Node = this.ctx.openGroup("curve", slurId);
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
        this.ctx.closeGroup();
        return node;
    }

    public renderPath(points: PointF2D[], fill: boolean = true, id?: string, color?: string): Node {
        this.ctx.save();
        const node: Node = this.ctx.openGroup("path", id);
        if (color) {
            this.ctx.attributes.fill = color;
            this.ctx.attributes.stroke = color;
        }
        this.ctx.beginPath();
        let currentPoint: PointF2D;
        for (const point of points) {
            if (!currentPoint) {
                this.ctx.moveTo(point.x, point.y);
                currentPoint = point;
                continue;
            }
            this.ctx.lineTo(point.x, point.y);
            // this.ctx.stroke();
        }
        this.ctx.closePath();
        if (fill) {
            this.ctx.fill();
        } else {
            this.ctx.stroke(); // just trace outline, don't fill inner area
        }
        this.ctx.stroke();
        this.ctx.closeGroup();
        this.ctx.restore();
        return node;
    }

    /** Generate the exported SVG string with font CSS injected. */
    public getExportedSVGString(): string {
        const clone: SVGElement = (this.ctx.svg.cloneNode(true) as SVGElement);
        this.injectFontCSS(clone);

        const svgDocType: DocumentType = document.implementation.createDocumentType(
            "svg",
            "-//W3C//DTD SVG 1.1//EN",
            "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"
        );
        const svgDoc: Document = document.implementation.createDocument("http://www.w3.org/2000/svg", "svg", svgDocType);
        svgDoc.replaceChild(clone, svgDoc.documentElement);
        return (new XMLSerializer()).serializeToString(svgDoc);
    }

    public export(): void {
        const svgData: string = this.getExportedSVGString();

        const a: HTMLAnchorElement = document.createElement("a");
        a.href = "data:image/svg+xml; charset=utf8, " + encodeURIComponent(svgData.replace(/></g, ">\n\r<"));
        a.download = "opensheetmusicdisplay_download.svg";
        a.innerHTML = window.location.href + "/download";
        document.body.appendChild(a);
    }

      /** Inject @font-face rules for music fonts so exported SVGs render correctly. */
      private injectFontCSS(svg: SVGElement): void {
          const embedding: string = this.rules.SVGFontEmbedding ?? "import";
          if (embedding === "none") { return; }

          const musicFonts: string[] = ["Bravura", "Gonville", "Petaluma", "Petaluma Script", "Academico"];
          const fontsInUse: Set<string> = new Set();
          const elements: Element[] = [svg as Element];
          const fontFamilyElements: NodeListOf<Element> = (svg as any).querySelectorAll?.("[font-family]") ?? [];
          for (let i: number = 0; i < fontFamilyElements.length; i++) {
              elements.push(fontFamilyElements[i]);
          }
          for (const el of elements) {
              const families: string | null = el.getAttribute("font-family");
              if (!families) { continue; }
              for (const name of musicFonts) {
                  if (families.includes(name)) { fontsInUse.add(name); }
              }
          }

          if (fontsInUse.size === 0) { return; }

          let css: string = "";
          for (const fontName of fontsInUse) {
              if (embedding === "inline") {
                  const dataUri: string | undefined = VF.Font.getFontData(fontName);
                  if (dataUri) {
                      css += `@font-face { font-family: "${fontName}"; src: url(${dataUri}); font-display: block; }\n`;
                  }
              } else {
                  const cdnUrl: string | undefined = VF.Font.getURLForFont(fontName);
                  if (cdnUrl) {
                      css += `@font-face { font-family: "${fontName}"; src: url("${cdnUrl}"); font-display: block; }\n`;
                  }
              }
          }

          if (!css) { return; }

          const style: SVGElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
          style.textContent = css;
          svg.insertBefore(style, svg.firstChild);
      }
}
