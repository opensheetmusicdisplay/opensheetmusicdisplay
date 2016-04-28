import {Fraction} from "../../../../Common/DataObjects/fraction";
import {PlacementEnum} from "../abstractExpression";
import {MultiTempoExpression} from "../multiTempoExpression";
import {AbstractTempoExpression} from "../abstractTempoExpression";

export class ContinuousTempoExpression extends AbstractTempoExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number, parentMultiTempoExpression: MultiTempoExpression) {
        super.label = label;
        super.placement = placement;
        super.staffNumber = staffNumber;
        super.parentMultiTempoExpression = parentMultiTempoExpression;
        this.setTempoType();
    }
    private absoluteEndTimestamp: Fraction;
    private tempoType: ContinuousTempoType;
    private startTempo: number;
    private endTempo: number;
    private static listContinuousTempoFaster: string[] = ["accelerando","piu mosso","poco piu","stretto"];
    private static listContinuousTempoSlower: string[] = ["poco meno","meno mosso","piu lento","calando","allargando","rallentando","ritardando","ritenuto","ritard.","ritard","rit.","rit","riten.","riten"];

    public get TempoType(): ContinuousTempoType {
        return this.tempoType;
    }
    public set TempoType(value: ContinuousTempoType) {
        this.tempoType = value;
    }
    public get StartTempo(): number {
        return this.startTempo;
    }
    public set StartTempo(value: number) {
        this.startTempo = value;
    }
    public get EndTempo(): number {
        return this.endTempo;
    }
    public set EndTempo(value: number) {
        this.endTempo = value;
    }
    public get AbsoluteEndTimestamp(): Fraction {
        return this.absoluteEndTimestamp;
    }
    public set AbsoluteEndTimestamp(value: Fraction) {
        this.absoluteEndTimestamp = value;
    }
    public static isInputStringContinuousTempo(inputString: string): boolean {
        if (inputString == null)
            return false;
        if (ContinuousTempoExpression.listContinuousTempoFaster.indexOf(inputString) !== -1)
            return true;
        if (ContinuousTempoExpression.listContinuousTempoSlower.indexOf(inputString) !== -1)
            return true;
        return false;
    }
    private setTempoType(): void {
        if (ContinuousTempoExpression.listContinuousTempoFaster.indexOf(this.label) !== -1)
            this.tempoType = ContinuousTempoType.accelerando;
        else if (ContinuousTempoExpression.listContinuousTempoSlower.indexOf(this.label) !== -1)
            this.tempoType = ContinuousTempoType.ritardando;
    }
    public get AbsoluteTimestamp(): Fraction {
        return this.ParentMultiTempoExpression.AbsoluteTimestamp;
    }
    public getAbsoluteFloatTimestamp(): number {
        return this.ParentMultiTempoExpression.AbsoluteTimestamp.RealValue;
    }
    public getInterpolatedTempo(currentAbsoluteTimestamp: Fraction): number {
        var continuousAbsoluteStartTimestamp: Fraction = Fraction.plus(this.parentMultiTempoExpression.SourceMeasureParent.AbsoluteTimestamp, this.parentMultiTempoExpression.Timestamp);
        if (currentAbsoluteTimestamp.lt(continuousAbsoluteStartTimestamp))
            return -1;
        if (currentAbsoluteTimestamp.lt(this.absoluteEndTimestamp))
            return -2;
        var interpolationRatio: number = Fraction.minus(currentAbsoluteTimestamp, continuousAbsoluteStartTimestamp).RealValue / Fraction.minus(this.absoluteEndTimestamp, continuousAbsoluteStartTimestamp).RealValue;
        var interpolatedTempo: number = Math.max(0.0, Math.min(250.0, this.startTempo + (this.endTempo - this.startTempo) * interpolationRatio));
        return <number>interpolatedTempo;
    }
    public static isIncreasingTempo(tempoType: ContinuousTempoType): boolean {
        if (tempoType <= ContinuousTempoType.piuMosso)
            return true;
        else return false;
    }
    public static isDecreasingTempo(tempoType: ContinuousTempoType): boolean {
        if ((tempoType >= ContinuousTempoType.allargando) && (tempoType <= ContinuousTempoType.ritenuto))
            return true;
        else return false;
    }
}
export enum ContinuousTempoType {
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
    precipitando = 14
}