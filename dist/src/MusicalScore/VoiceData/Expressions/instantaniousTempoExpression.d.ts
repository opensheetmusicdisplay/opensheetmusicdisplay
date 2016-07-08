import { AbstractTempoExpression } from "./abstractTempoExpression";
import { PlacementEnum } from "./abstractExpression";
import { Fraction } from "../../../Common/DataObjects/fraction";
import { MultiTempoExpression } from "./multiTempoExpression";
export declare class InstantaniousTempoExpression extends AbstractTempoExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number, soundTempo: number, parentMultiTempoExpression: MultiTempoExpression);
    private static listInstantaniousTempoLarghissimo;
    private static listInstantaniousTempoGrave;
    private static listInstantaniousTempoLento;
    private static listInstantaniousTempoLargo;
    private static listInstantaniousTempoLarghetto;
    private static listInstantaniousTempoAdagio;
    private static listInstantaniousTempoAdagietto;
    private static listInstantaniousTempoAndanteModerato;
    private static listInstantaniousTempoAndante;
    private static listInstantaniousTempoAndantino;
    private static listInstantaniousTempoModerato;
    private static listInstantaniousTempoAllegretto;
    private static listInstantaniousTempoAllegroModerato;
    private static listInstantaniousTempoAllegro;
    private static listInstantaniousTempoVivace;
    private static listInstantaniousTempoVivacissimo;
    private static listInstantaniousTempoAllegrissimo;
    private static listInstantaniousTempoPresto;
    private static listInstantaniousTempoPrestissimo;
    private static listInstantaniousTempoChangesGeneral;
    private static listInstantaniousTempoAddons;
    private tempoEnum;
    private tempoInBpm;
    static getDefaultValueForTempoType(tempoEnum: TempoEnum): number;
    static isInputStringInstantaniousTempo(inputString: string): boolean;
    Label: string;
    Placement: PlacementEnum;
    StaffNumber: number;
    Enum: TempoEnum;
    TempoInBpm: number;
    ParentMultiTempoExpression: MultiTempoExpression;
    getAbsoluteTimestamp(): Fraction;
    getAbsoluteFloatTimestamp(): number;
    private setTempoAndTempoType(soundTempo);
}
export declare enum TempoEnum {
    none = 0,
    larghissimo = 1,
    grave = 2,
    lento = 3,
    largo = 4,
    larghetto = 5,
    adagio = 6,
    adagietto = 7,
    andanteModerato = 8,
    andante = 9,
    andantino = 10,
    moderato = 11,
    allegretto = 12,
    allegroModerato = 13,
    allegro = 14,
    vivace = 15,
    vivacissimo = 16,
    allegrissimo = 17,
    presto = 18,
    prestissimo = 19,
    lastRealTempo = 20,
    addon = 21,
    changes = 22,
}
