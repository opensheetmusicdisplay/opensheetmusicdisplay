import { ChordSymbolEnum } from "./ChordSymbolContainer";

export class CustomChordKind {
  public alternateName: string;
  public chordKind: ChordSymbolEnum;
  public adds: string[];
  public alts: string[];
  public subs: string[];

  constructor(
    alternateName: string,
    chordKind: ChordSymbolEnum,
    adds: string[],
    alts: string[],
    subs: string[],
  ) {
    this.alternateName = alternateName;
    this.chordKind = chordKind;
    this.adds = adds;
    this.alts = alts;
    this.subs = subs;
  }

  public static createCustomChordKind(
    altName: string,
    chordKind: ChordSymbolEnum,
    adds: string[],
    alts: string[],
    subs: string[],
  ): CustomChordKind {
      return new CustomChordKind(altName, chordKind, adds, alts, subs);
  }

  public static renameCustomChordKind(
    altName: string,
    newAltName: string,
    customKinds: CustomChordKind[],
  ): void {
    for (const customKind of customKinds) {
      if (customKind.alternateName === altName) {
        customKind.alternateName = newAltName;
      }
    }
  }
}
