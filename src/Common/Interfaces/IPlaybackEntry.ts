import { VoiceEntry } from "../../MusicalScore";
import { Fraction } from "../DataObjects";
import { IPlaybackNote } from "./IPlaybackNote";

export interface IPlaybackEntry{
    ParentVoiceEntry: VoiceEntry;
    TimestampShift: Fraction;
    Notes: IPlaybackNote[];
    Length: Fraction;
    HasNotes: boolean;
}
