

declare namespace Vex {

    export module Flow {
        const RESOLUTION: any;

        export class Formatter {
            constructor(opts?: any);

            public hasMinTotalWidth: boolean;
            public minTotalWidth: number;

            public joinVoices(voices: Voice[]): void;

            public format(voices: Voice[], width: number): void;

            public preCalculateMinTotalWidth(voices: Voice[]): number;
        }

        export class BoundingBox {
            constructor(x: number, y: number, w: number, h: number);

            public mergeWith(bb: BoundingBox): BoundingBox;

            public getX(): number;

            public getY(): number;

            public getW(): number;

            public getH(): number;

            public draw(ctx: Vex.Flow.RenderContext): void;
        }

        export class Tickable {
            public reset(): void;

            public setStave(stave: Stave);

            public getBoundingBox(): BoundingBox;
        }

        export class Voice {
            constructor(time: any);

            public static Mode: any;

            public context: RenderContext;

            public tickables: Tickable[];

            public getBoundingBox(): BoundingBox;

            public setStave(stave: Stave): Voice;

            public addTickables(notes: StaveNote[]): Voice;

            public addTickable(note: StaveNote): Voice;

            public setMode(mode: any): Voice;

            public draw(ctx: any, stave: Stave): void;
        }

        export class Note extends Tickable {
        }

        export class Stem {
            public static UP: number;
            public static DOWN: number;
        }
        export class StemmableNote extends Note {
            public getStemDirection(): number;
            public setStemDirection(direction: number): StemmableNote;
        }

        export class StaveNote extends StemmableNote {
            constructor(note_struct: any);

            public getNoteHeadBounds(): any;

            public getNoteHeadBeginX(): number;

            public getNoteHeadEndX(): number;

            public getGlyphWidth(): number;

            public addAccidental(index: number, accidental: Accidental): StaveNote;

            public addAnnotation(index: number, annotation: Annotation): StaveNote;

            public addModifier(index: number, modifier: Modifier): StaveNote;

            public setStyle(style: any): void;

            public addDotToAll(): void;
        }

        export class StaveTie {
            constructor(notes_struct: any);

            public setContext(ctx: RenderContext): StaveTie;

            public draw(): void;
        }

        export class Stave {
            constructor(x: number, y: number, width: number, options: any);

            public setX(x: number): Stave;

            public setY(y: number): Stave;

            public getX(): number;

            public setBegBarType(type: any): Stave;

            public setEndBarType(type: any): Stave;

            public addClef(clefSpec: string, size: any, annotation: any, position: any): void;

            public setEndClef(clefSpec: string, size: any, annotation: any): void;

            public getModifiers(): StaveModifier[];

            public getYForGlyphs(): number;

            public getWidth(): number;

            public setWidth(width: number): Stave;

            public getNoteStartX(): number;

            public getModifierXShift(): number;

            public getNoteEndX(): number;

            public setNoteStartX(x: number): Stave;

            public setKeySignature(keySpec: any, cancelKeySpec: any, position: any): Stave;

            public setText(text: string, position: number, options: any): void;

            public format(): void;

            public getSpacingBetweenLines(): number;

            public getNumLines(): number;

            public getLineForY(y: number): number;

            public getYForLine(y: number): number;

            public getModifiers(pos: any, cat: any): Clef[]; // FIXME

            public setContext(ctx: RenderContext): Stave;

            public addModifier(mod: any, pos: any): void;

            public draw(): void;

            public addTimeSignature(sig: string): void;
        }

        export class Modifier {
            public static Position: any;

            public getCategory(): string;

            public getWidth(): number;

            public getPadding(index: number): number;

            public getPosition(): number;

            public setPosition(position: number): Modifier;
        }


        export class StaveModifier extends Modifier {
            public static get Position() {
                return {
                    LEFT: 1,
                    RIGHT: 2,
                    ABOVE: 3,
                    BELOW: 4,
                    BEGIN: 5,
                    END: 6,
                };
            }

            public getPosition(): number;

        }

        export class Repetition extends StaveModifier {
            constructor(type: any, x: number, y_shift: number);
        }

        export class Clef extends StaveModifier {
            constructor(type: string, size: number, annotation: string);

            public static category: string;
            public static types: { [type: string]: any; };
            public glyph: any;
            public x: number;
            public stave: Stave;

            public getBoundingBox(): BoundingBox;

            public setStave(stave: Stave): void;
        }

        export class Renderer {
            constructor(canvas: HTMLElement, backend: number);

            public static Backends: {
                CANVAS: number,
                RAPHAEL: number,
                SVG: number,
                VML: number
            };

            public resize(a: number, b: number): void;

            public getContext(): CanvasContext | SVGContext;
        }

        export class TimeSignature extends StaveModifier {
            constructor(timeSpec: string, customPadding?: any);
        }
        export class KeySignature extends StaveModifier {
            constructor(keySpec: string, cancelKeySpec: string, alterKeySpec?: string);
        }

        export class Accidental {
            constructor(type: string);
        }

        export class Annotation {
            constructor(type: string);
        }

        export class Articulation extends Modifier {
            constructor(type: string);
        }

        export class Beam {
            constructor(notes: StaveNote[], auto_stem: boolean);

            public setContext(ctx: RenderContext): Beam;

            public draw(): void;
        }

        export class Tuplet {
            constructor(notes: StaveNote[], options: any);

            public setContext(ctx: RenderContext): Tuplet;

            public draw(): void;
        }

        export class RenderContext {
            public scale(x: number, y: number): RenderContext;
            public fillRect(x: number, y: number, width: number, height: number): RenderContext
            public fillText(text: string, x: number, y: number): RenderContext;
            public setFont(family: string, size: number, weight: string): RenderContext;
            public save(): RenderContext;
            public restore(): RenderContext;
        }

        export class CanvasContext extends RenderContext {
            public vexFlowCanvasContext: CanvasRenderingContext2D;
        }

        export class SVGContext extends RenderContext {
            public svg: SVGElement;
            public attributes: any;
            public state: any;
        }

        export class StaveConnector {
            constructor(top: Stave, bottom: Stave);

            public static type: any;

            public setType(type: any): StaveConnector;

            public setContext(ctx: RenderContext): StaveConnector;

            public setXShift(shift: number): StaveConnector;

            public top_stave: Stave;

            public bottom_stave: Stave;

            public thickness: number;

            public width: number;

            public x_shift: number;

            public draw(): void;
        }
    }
}

declare module "vexflow" {
    export = Vex;
}
