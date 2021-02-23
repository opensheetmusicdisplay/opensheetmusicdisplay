import { Note } from "../../MusicalScore";
import { Fraction } from "../DataObjects";
import { IPlaybackEntry } from "./IPlaybackEntry";

export interface IPlaybackNote{
    setLength(): void;
    ParentEntry: IPlaybackEntry;
    ParentNote: Note;
    MidiKey: number;
    Length: Fraction;
}
