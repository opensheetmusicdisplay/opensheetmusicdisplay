import {Fraction} from "../../../../Common/DataObjects/Fraction";
import {PlacementEnum} from "../AbstractExpression";
import {MultiTempoExpression} from "../MultiTempoExpression";
import {AbstractTempoExpression} from "../AbstractTempoExpression";

export class ContinuousTempoExpression extends AbstractTempoExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number, parentMultiTempoExpression: MultiTempoExpression) {
        super(label, placement, staffNumber, parentMultiTempoExpression);
        //super.label = label;
        //super.placement = placement;
        //super.staffNumber = staffNumber;
        //super.parentMultiTempoExpression = parentMultiTempoExpression;
        this.setTempoType();
    }

    private static listContinuousTempoFaster: string[] = ["accelerando", "piu mosso", "poco piu", "stretto"];
    private static listContinuousTempoSlower: string[] = [
        "poco meno", "meno mosso", "piu lento", "calando", "allargando", "rallentando", "ritardando",
        "ritenuto", "ritard.", "ritard", "rit.", "rit", "riten.", "riten",
    ];
    private absoluteEndTimestamp: Fraction;
    private tempoType: ContinuousTempoType;
    private startTempo: number;
    private endTempo: number;

    public static isInputStringContinuousTempo(inputString: string): boolean {
        if (!inputString) { return false; }
        return (
            ContinuousTempoExpression.isStringInStringList(ContinuousTempoExpression.listContinuousTempoFaster, inputString)
            || ContinuousTempoExpression.isStringInStringList(ContinuousTempoExpression.listContinuousTempoSlower, inputString)
        );
    }
    public static isIncreasingTempo(tempoType: ContinuousTempoType): boolean {
        return tempoType <= ContinuousTempoType.piuMosso;
    }
    public static isDecreasingTempo(tempoType: ContinuousTempoType): boolean {
        return (tempoType >= ContinuousTempoType.allargando) && (tempoType <= ContinuousTempoType.ritenuto);
    }

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
    public get AbsoluteTimestamp(): Fraction {
        return this.ParentMultiTempoExpression.AbsoluteTimestamp;
    }
    public getAbsoluteFloatTimestamp(): number {
        return this.ParentMultiTempoExpression.AbsoluteTimestamp.RealValue;
    }
    public getInterpolatedTempo(currentAbsoluteTimestamp: Fraction): number {
        const continuousAbsoluteStartTimestamp: Fraction = Fraction.plus(
            this.parentMultiTempoExpression.SourceMeasureParent.AbsoluteTimestamp, this.parentMultiTempoExpression.Timestamp
        );
        if (currentAbsoluteTimestamp.lt(continuousAbsoluteStartTimestamp)) { return -1; }
        if (this.absoluteEndTimestamp.lt(currentAbsoluteTimestamp)) { return -2; }
        const interpolationRatio: number =
            Fraction.minus(currentAbsoluteTimestamp, continuousAbsoluteStartTimestamp).RealValue
            / Fraction.minus(this.absoluteEndTimestamp, continuousAbsoluteStartTimestamp).RealValue;
        const interpolatedTempo: number = Math.max(0.0, Math.min(250.0, this.startTempo + (this.endTempo - this.startTempo) * interpolationRatio));
        return interpolatedTempo;
    }

    private setTempoType(): void {
        if (ContinuousTempoExpression.isStringInStringList(ContinuousTempoExpression.listContinuousTempoFaster, this.label)) {
            this.tempoType = ContinuousTempoType.accelerando;
        } else if (ContinuousTempoExpression.isStringInStringList(ContinuousTempoExpression.listContinuousTempoSlower, this.label)) {
            this.tempoType = ContinuousTempoType.ritardando;
        }
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
