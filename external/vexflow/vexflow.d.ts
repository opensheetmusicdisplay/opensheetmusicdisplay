

declare namespace Vex {

    export module Flow {
        const RESOLUTION: any;
        const DEFAULT_NOTATION_FONT_SCALE: number;

        export class Formatter {
            constructor();

            public hasMinTotalWidth: boolean;
            public minTotalWidth: number;

            public joinVoices(voices: Voice[]): void;

            public format(voices: Voice[], width: number, options?: any): void;

            public preCalculateMinTotalWidth(voices: Voice[]): number;
        }

        export class BoundingBox {
            constructor(x: number, y: number, w: number, h: number);

            public mergeWith(bb: BoundingBox): BoundingBox;

            public x: number;

            public y: number;

            public w: number;

            public h: number;

            public draw(ctx: Vex.Flow.RenderContext): void;
        }

        export class Tickable {
            public reset(): void;

            public setStave(stave: Stave);

            public getBoundingBox(): BoundingBox;

            public getAttribute(arg: string): string;
        }

        export class Voice {
            constructor(time: any);

            public static Mode: any;

            public context: RenderContext;

            public tickables: Tickable[];

            public getBoundingBox(): BoundingBox;

            public setStave(stave: Stave): Voice;

            public addTickables(tickables: Tickable[]): Voice;

            public addTickable(tickable: Tickable): Voice;

            public setMode(mode: any): Voice;

            public draw(ctx: any, stave: Stave): void;
        }

        export class Note extends Tickable {
            public addStroke(index: number, stroke: Stroke): void;
        }

        export class TextBracket {
            constructor(note_struct: any);
            
            public setContext(ctx: RenderContext): TextBracket;

            public draw(): void;

        }

        export class TextNote extends Note {
            constructor(note_struct: any);
            
            public setContext(ctx: RenderContext): TextBracket;

            public draw(): void;
        }

        export class Stem {
            public static UP: number;
            public static DOWN: number;
        }
        export class StemmableNote extends Note {
            public getStemDirection(): number;
            public setStemDirection(direction: number): StemmableNote;
            public x_shift: number;
            public getAbsoluteX(): number;
            public addModifier(index: number, modifier: Modifier): StemmableNote;
            public preFormatted: boolean;
        }

        export class GhostNote extends StemmableNote {
            constructor(note_struct: any);
            public setStave(stave): void;
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

        export class GraceNote extends StaveNote {
            static SCALE: number;
            static LEDGER_LINE_OFFSET: number;
            constructor(note_struct: any);
        }

        export class GraceNoteGroup extends Modifier {
            constructor(grace_notes: GraceNote[], show_slur: boolean);
            public beamNotes(): GraceNoteGroup;
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

            public setVoltaType(type: number, number_t: number, y: number): void;
        }

        export class Volta extends StaveModifier {
            public static type: any;
        }

        export class Modifier {
            public static Position: any;

            public getCategory(): string;

            public getWidth(): number;

            public getPadding(index: number): number;

            public getPosition(): number;

            public setPosition(position: number): Modifier;

            public setIndex(index: number): void;
        }

        export class FretHandFinger extends Modifier {
            constructor(finger: string);
        }

        export class StringNumber extends Modifier {
            constructor(string: string);
            setOffsetY(value: number);
        }
        
        export class Stroke extends Modifier {
            constructor(type: number);
            public static Type: any; // unreliable values, use Arpeggio.ArpeggioType instead
        }

        export class NoteSubGroup extends Modifier {
            constructor(notes: Object);
        }

        export class StaveModifier extends Modifier {
            public getPosition(): number;

        }

        export class Repetition extends StaveModifier {
            constructor(type: any, x: number, y_shift: number);
        }

        export class Clef extends StaveModifier {
            constructor(type: string, size: string, annotation: string);

            public static category: string;
            public static types: { [type: string]: any; };
            public glyph: any;
            public x: number;
            public stave: Stave;

            public getBoundingBox(): BoundingBox;

            public setStave(stave: Stave): void;
        }
        
        export class ClefNote  extends Note {
            constructor(type: string, size: string, annotation: string);

            public type: string;
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

        export class Ornament extends Modifier {
            constructor(type: string);
            setDelayed(delayed: boolean): void;
            setUpperAccidental(acc: string): void;
            setLowerAccidental(acc: string): void;
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

        // interface for class Curve to draw slurs. The options are set to undefined
        export class Curve {
            constructor(from: StemmableNote, to: StemmableNote, options: any);
            
            public setContext(ctx: RenderContext): Curve;

            public draw(): void;
        }

        export class RenderContext {
            public scale(x: number, y: number): RenderContext;
            public fillRect(x: number, y: number, width: number, height: number): RenderContext
            public fillText(text: string, x: number, y: number): RenderContext;
            public setFont(family: string, size: number, weight: string): RenderContext;
            public beginPath(): RenderContext;
            public moveTo(x, y): RenderContext;
            public lineTo(x, y): RenderContext;
            public bezierCurveTo(cp1_x: number, cp1_y: number, cp2_x: number, cp2_y: number, end_x: number, end_y: number): RenderContext;
            public closePath(): RenderContext;
            public stroke(): RenderContext;
            public fill(): RenderContext;
            public save(): RenderContext;
            public restore(): RenderContext;
            public lineWidth: number;
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
