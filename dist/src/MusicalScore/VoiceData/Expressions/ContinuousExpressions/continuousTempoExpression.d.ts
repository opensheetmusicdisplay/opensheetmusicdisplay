import { Fraction } from "../../../../Common/DataObjects/fraction";
import { PlacementEnum } from "../abstractExpression";
import { MultiTempoExpression } from "../multiTempoExpression";
import { AbstractTempoExpression } from "../abstractTempoExpression";
export declare class ContinuousTempoExpression extends AbstractTempoExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number, parentMultiTempoExpression: MultiTempoExpression);
    private static listContinuousTempoFaster;
    private static listContinuousTempoSlower;
    private absoluteEndTimestamp;
    private tempoType;
    private startTempo;
    private endTempo;
    static isInputStringContinuousTempo(inputString: string): boolean;
    static isIncreasingTempo(tempoType: ContinuousTempoType): boolean;
    static isDecreasingTempo(tempoType: ContinuousTempoType): boolean;
    TempoType: ContinuousTempoType;
    StartTempo: number;
    EndTempo: number;
    AbsoluteEndTimestamp: Fraction;
    AbsoluteTimestamp: Fraction;
    getAbsoluteFloatTimestamp(): number;
    getInterpolatedTempo(currentAbsoluteTimestamp: Fraction): number;
    private setTempoType();
}
export declare enum ContinuousTempoType {
    accelerando = 0,
    stretto = 1,
    stringendo = 2,
    mosso = 3,
    piuMosso = 4,
    allargando = 5,
    calando = 6,
    menoMosso = 7,
    rallentando = 8,
    ritardando = 9,
    ritard = 10,
    rit = 11,
    ritenuto = 12,
    rubato = 13,
    precipitando = 14,
}
