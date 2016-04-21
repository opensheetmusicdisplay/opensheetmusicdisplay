import { MusicSheet } from "./MusicSheet";

export class InstrumentalGroup {
    constructor(name: string, musicSheet: MusicSheet, parent: InstrumentalGroup) {
        this.name = name;
        this.musicSheet = musicSheet;
        this.parent = parent;
    }
    private name: string;
    private musicSheet: MusicSheet;
    private parent: InstrumentalGroup;
    private instrumentalGroups: InstrumentalGroup[] = [];
    //private instruments: List<Instrument> = new List<Instrument>();
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
    public get GetMusicSheet(): MusicSheet {
        return this.musicSheet;
    }
}
