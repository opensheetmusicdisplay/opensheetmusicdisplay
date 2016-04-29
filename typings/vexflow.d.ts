declare namespace Vex {
  export module Flow {

    export class Formatter {
      constructor();

      public hasMinTotalWidth: boolean;
      public minTotalWidth: number;

      public preCalculateMinTotalWidth(voices: Voice[]): number;
    }

    export class BoundingBox {
      constructor(x: number, y: number, w: number, h: number);

      public mergeWith(bb: BoundingBox): BoundingBox;
      public getX(): number;
      public getY(): number;
      public getW(): number;
      public getH(): number;
    }

    export class Voice {
      constructor(time: any);

      public getBoundingBox(): BoundingBox;
      public setStave(stave: Stave): Voice;
      public addTickables(notes: StaveNote[]): Voice;
    }

    export class StaveNote {
      constructor(note_struct: any);
    }

    export class Stave {
      constructor(x: number, y: number, width: number);

      public x: number;
      public start_x: number;
      public end_x: number;

      public getYForGlyphs(): number;
      public getWidth(): number;
      public setWidth(width: number): Stave;
      public getNoteStartX(): number;
      public format(): void;
      public getSpacingBetweenLines(): number;
      public getNumLines(): number;
      public getLineForY(y: number): number;
      public getModifiers(pos: any, cat: any): Vex.Flow.Clef[]; // FIXME
      public setContext(ctx: any): void;
      public addModifier(mod: any, pos: any): void;
      public draw(): void;
    }

    export class StaveModifier {
      public static Position: any;
    }

    export class Clef {
      constructor(type: any);

      public static category: string;
      public static types: { [type: string]: any; } ;
      public glyph: any;
      public x: number;
      public stave: Stave;

      public getBoundingBox(): Vex.Flow.BoundingBox;
      public setStave(stave: Vex.Flow.Stave): void;
    }

    export class Renderer {
      constructor(canvas: HTMLCanvasElement, backend: any);

      public static Backends: any;
      public resize(a: number, b: number): void;
      public getContext(): any;
    }

    //export class

  }
}

declare module "vexflow" {
    export = Vex;
}
