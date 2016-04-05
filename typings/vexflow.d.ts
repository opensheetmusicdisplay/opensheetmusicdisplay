declare namespace VexFlow {
  export module Flow {

    export class Formatter {
      hasMinTotalWidth: boolean;
      minTotalWidth: number;

      //preCalculateMinTotalWidth(voices: Voices[]);
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
      constructor(note_struct: any);
    }

    export class Stave {
      x: number;
      start_x: number;
      end_x: number;

      getWidth(): number;
      setWidth(width: number): Stave;
      format(): void;
      getSpacingBetweenLines(): number;
      getNumLines(): number;
      getLineForY(y: number): number;

      constructor();
    }

  }
}

declare module "vexflow" {
    export = VexFlow;
}
