import { Fraction } from "../DataObjects";
import { CursorPosChangedData } from "../DataObjects/CursorPosChangedData";

export interface IPlaybackListener {
    cursorPositionChanged(timestamp: Fraction, data: CursorPosChangedData): void;
    pauseOccurred(o: object): void;
    selectionEndReached(o: object): void;
    resetOccurred(o: object): void;
    notesPlaybackEventOccurred(o: object): void;
}
