import { MusicSheet } from "./MusicSheet";

/** The symbol drawn left of a part group's staves: MusicXML's group-symbol (none if not given). */
export enum GroupSymbol {
    None,
    Brace,
    Line,
    Bracket,
    Square
}

export class InstrumentalGroup {

    constructor(name: string, musicSheet: MusicSheet, parent: InstrumentalGroup) {
        this.name = name;
        this.musicSheet = musicSheet;
        this.parent = parent;
    }

    private name: string;
    private abbreviation: string;
    private printName: boolean = true;
    private printAbbreviation: boolean = true;
    private groupSymbol: GroupSymbol = GroupSymbol.None;
    private musicSheet: MusicSheet;
    private parent: InstrumentalGroup;
    private instrumentalGroups: InstrumentalGroup[] = [];

    public get InstrumentalGroups(): InstrumentalGroup[] {
        return this.instrumentalGroups;
    }
    public get Parent(): InstrumentalGroup {
        return this.parent;
    }
    public get Name(): string {
        return this.name;
    }
    public set Name(value: string) {
        this.name = value;
    }
    public get Abbreviation(): string {
        return this.abbreviation;
    }
    public set Abbreviation(value: string) {
        this.abbreviation = value;
    }
    public get PrintName(): boolean {
        return this.printName;
    }
    public set PrintName(value: boolean) {
        this.printName = value;
    }
    public get PrintAbbreviation(): boolean {
        return this.printAbbreviation;
    }
    public set PrintAbbreviation(value: boolean) {
        this.printAbbreviation = value;
    }
    /** The symbol drawn left of the group's staves (MusicXML group-symbol). None, the default, draws nothing. */
    public get GroupSymbol(): GroupSymbol {
        return this.groupSymbol;
    }
    public set GroupSymbol(value: GroupSymbol) {
        this.groupSymbol = value;
    }
    public get GetMusicSheet(): MusicSheet {
        return this.musicSheet;
    }

}
