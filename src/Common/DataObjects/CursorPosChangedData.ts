import { Fraction } from "./Fraction";
import { IRepetition } from "../Interfaces/IRepetition";

export class CursorPosChangedData {
    constructor(currentMeasureIndex: number = 0, currentRepetition: IRepetition = undefined, currentRepetitionIteration: number = 0,
                predictedPosition: Fraction = undefined, beatsPerMinute: number = 0) {
        this.CurrentMeasureIndex = currentMeasureIndex;
        this.CurrentRepetition = currentRepetition;
        this.CurrentRepetitionIteration = currentRepetitionIteration;
        this.PredictedPosition = predictedPosition;
        this.CurrentBpm = beatsPerMinute;
    }

    public ResetOccurred: boolean = false;
    public CurrentMeasureIndex: number;
    public CurrentRepetition: IRepetition;
    public CurrentRepetitionIteration: number;
    public PredictedPosition: Fraction;
    public CurrentBpm: number;
}
