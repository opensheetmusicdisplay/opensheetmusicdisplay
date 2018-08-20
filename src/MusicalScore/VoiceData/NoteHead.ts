/**
 * A note head for displaying different styles of note heads
 */
export class NoteHead {

    constructor(noteHead: string, filled: boolean) {
        this.noteHead = NoteHeadEnum[noteHead.toUpperCase()];
        this.filled = filled;
    }

    private noteHead: NoteHeadEnum;
    private filled: boolean;

    public get NoteHeadShape(): NoteHeadEnum {
        return this.noteHead;
    }
    public get Filled(): boolean {
        return this.filled;
    }
}

// TODO: Add the rest from https://usermanuals.musicxml.com/MusicXML/Content/ST-MusicXML-notehead-value.htm
export enum NoteHeadEnum {
    NORMAL = "",
    DIAMOND = "D",
    TRIANGLE = "T",
    X = "X"
}
