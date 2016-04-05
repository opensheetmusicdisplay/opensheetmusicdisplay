declare namespace VexFlow {
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

      getWidth(): number;
      setWidth(width: number): Stave;
      getNoteStartX(): number;
      format(): void;
      getSpacingBetweenLines(): number;
      getNumLines(): number;
      getLineForY(y: number): number;

      constructor(x: number, y: number, width: number);
    }

  }
}

declare module "vexflow" {
    export = VexFlow;
}
