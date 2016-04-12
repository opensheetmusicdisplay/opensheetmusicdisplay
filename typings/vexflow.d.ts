declare namespace Vex {
  export module Flow {

    export class Formatter {
      public hasMinTotalWidth: boolean;
      public minTotalWidth: number;

      preCalculateMinTotalWidth(voices: Voice[]);
      constructor();
    }

    export class BoundingBox {
      mergeWith(bb: BoundingBox): BoundingBox;
      getX(): number;
      getY(): number;
      getW(): number;
      getH(): number;

      constructor(x: number, y: number, w: number, h: number);
    }

    export class Voice {
      getBoundingBox(): BoundingBox;
      setStave(stave: Stave): Voice;
      addTickables(notes: StaveNote[]): Voice;
      constructor(time: any);
    }

    export class StaveNote {
      constructor(note_struct: any);
    }

    export class Stave {
      x: number;
      start_x: number;
      end_x: number;

      getYForGlyphs(): number;
      getWidth(): number;
      setWidth(width: number): Stave;
      getNoteStartX(): number;
      format(): void;
      getSpacingBetweenLines(): number;
      getNumLines(): number;
      getLineForY(y: number): number;
      getModifiers(pos: any, cat: any): Vex.Flow.Clef[]; // FIXME

      constructor(x: number, y: number, width: number);
    }

    export class StaveModifier {
      public static Position: any;
    }

    export class Clef {
      public static category: string;
      public glyph: any;
      public x: number;
      public stave: Stave;

      public getBoundingBox(): Vex.Flow.BoundingBox;

    }

  }
}

declare module "vexflow" {
    export = Vex;
}
