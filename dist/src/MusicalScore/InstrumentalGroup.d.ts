import { MusicSheet } from "./MusicSheet";
export declare class InstrumentalGroup {
    constructor(name: string, musicSheet: MusicSheet, parent: InstrumentalGroup);
    private name;
    private musicSheet;
    private parent;
    private instrumentalGroups;
    InstrumentalGroups: InstrumentalGroup[];
    Parent: InstrumentalGroup;
    Name: string;
    GetMusicSheet: MusicSheet;
}
