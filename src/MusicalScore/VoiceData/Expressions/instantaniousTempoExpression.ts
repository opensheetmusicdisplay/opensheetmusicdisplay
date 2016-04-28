import {AbstractTempoExpression} from "./abstractTempoExpression";
import {PlacementEnum} from "./abstractExpression";
import {ArgumentOutOfRangeException} from "../../Exceptions";
import {Fraction} from "../../../Common/DataObjects/fraction";
import {MultiTempoExpression} from "./multiTempoExpression";

export class InstantaniousTempoExpression extends AbstractTempoExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number, soundTempo: number, parentMultiTempoExpression: MultiTempoExpression) {
        super.label = label;
        super.placement = placement;
        super.staffNumber = staffNumber;
        super.parentMultiTempoExpression = parentMultiTempoExpression;
        this.setTempoAndTempoType(soundTempo);
    }
    private tempoEnum: TempoEnum;
    private tempoInBpm: number;
    private findTempoEnum(inputString: string, pre: string, post: string): TempoEnum {
        var result: TempoEnum = this.splitStringAfterInstructionWord(inputString, InstantaniousTempoExpression.listInstantaniousTempoLarghissimo, pre,
            post);
        if (result != TempoEnum.none)
            return result;
        result = this.splitStringAfterInstructionWord(inputString, InstantaniousTempoExpression.listInstantaniousTempoGrave, pre,
            post);
        if (result != TempoEnum.none)
            return result;
        return TempoEnum.none;
    }
    private splitStringAfterInstructionWord(inputString: string, instruction: KeyValuePair<Array<string>, TempoEnum>, pre: string, post: string): TempoEnum {
        pre = null;
        post = null;
        for (var idx: number = 0, len = instruction.Key.Count; idx < len; ++idx) {
            var instructionWord: string = instruction.Key[idx];
            var separators: string[] = " " + instructionWord, instructionWord + " ","," + instructionWord, instructionWord + ",";
            var splits: string[] = inputString.Split(separators, 2, StringSplitOptions.None);
            if (splits.length > 1) {
                pre = splits[0];
                post = splits[1];
                return instruction.Value;
            }
        }
        return TempoEnum.none;
    }
    static private listInstantaniousTempoLarghissimo: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Larghissimo","Sehr breit","very, very slow" }), TempoEnum.larghissimo);
    static private listInstantaniousTempoGrave: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Grave","Schwer","slow and solemn" }), TempoEnum.grave);
    static private listInstantaniousTempoLento: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Lento","Lent","Langsam","slowly" }), TempoEnum.lento);
    static private listInstantaniousTempoLargo: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Largo","Breit","broadly" }), TempoEnum.largo);
    static private listInstantaniousTempoLarghetto: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Larghetto","Etwas breit","rather broadly" }), TempoEnum.larghetto);
    static private listInstantaniousTempoAdagio: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Adagio","Langsam","Ruhig","slow and stately" }), TempoEnum.adagio);
    static private listInstantaniousTempoAdagietto: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Adagietto","Ziemlich ruhig","Ziemlich langsam","rather slow" }), TempoEnum.adagietto);
    static private listInstantaniousTempoAndanteModerato: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Andante moderato" }), TempoEnum.andanteModerato);
    static private listInstantaniousTempoAndante: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Andante","Gehend","Schreitend","at a walking pace" }), TempoEnum.andante);
    static private listInstantaniousTempoAndantino: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Andantino" }), TempoEnum.andantino);
    static private listInstantaniousTempoModerato: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Moderato","M��ig","Mod�r�","moderately" }), TempoEnum.moderato);
    static private listInstantaniousTempoAllegretto: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Allegretto","fast" }), TempoEnum.allegretto);
    static private listInstantaniousTempoAllegroModerato: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Allegro moderato" }), TempoEnum.allegroModerato);
    static private listInstantaniousTempoAllegro: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Allegro","Rapide","Vite","Rasch","Schnell","Fr�hlich" }), TempoEnum.allegro);
    static private listInstantaniousTempoVivace: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Vivace","Lebhaft","Lebendig","lively and fast" }), TempoEnum.vivace);
    static private listInstantaniousTempoVivacissimo: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Vivacissimo","Sehr lebhaft","Sehr lebendig" }), TempoEnum.vivacissimo);
    static private listInstantaniousTempoAllegrissimo: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Allegrissimo","very fast" }), TempoEnum.allegrissimo);
    static private listInstantaniousTempoPresto: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Presto","Sehr schnell","Geschwind" }), TempoEnum.presto);
    static private listInstantaniousTempoPrestissimo: KeyValuePair<Array<string>, TempoEnum> = new KeyValuePair<Array<string>, TempoEnum>(__init(new Array<string>(), { "Prestissimo","�u�erst schnell" }), TempoEnum.prestissimo);
    static private listInstantaniousTempoChangesGeneral: Array<string> = __init(new Array<string>(), {
        "tempo primo",
        "a tempo",
        "tempo i",
        "rubato",
        "doppio movimento" });
    static private listInstantaniousTempoAddons: Array<string> = __init(new Array<string>(), {
        "assai",
        "amoroso",
        "cantabile",
        "con brio",
        "con dolore",
        "con espressione",
        "con fuoco",
        "con moto",
        "con spirito",
        "spiritoso",
        "espressivo",
        "giocoso",
        "giusto",
        "grazioso",
        "lesto",
        "lugubre",
        "maestoso",
        "ma non troppo",
        "marcato",
        "molto",
        "morendo",
        "mosso",
        "non tanto",
        "piu",
        "un poco",
        "poco",
        "quasi",
        "risoluto",
        "scherzando",
        "sostenuto",
        "teneramente",
        "tempo giusto",
        "tranquillo",
        "sehr",
        "lieblich",
        "liebevoll",
        "mit Leidenschaft",
        "mit Liebe",
        "amour�s",
        "gesanglich",
        "mit Schwung",
        "mit Feuer",
        "mit Schmerz",
        "mit Ausdruck",
        "mit Bewegung",
        "geistvoll",
        "ausdrucksvoll",
        "freudig",
        "verspielt",
        "angemessen",
        "grazi�s",
        "mit Grazie",
        "flink",
        "beh�nde",
        "traurig",
        "klagend",
        "majest�tisch",
        "aber nicht zu sehr",
        "markant",
        "gem��igt",
        "viel",
        "sehr",
        "ersterbend",
        "bewegt",
        "nicht zu sehr",
        "mehr",
        "ein wenig",
        "gleichsam",
        "entschlossen",
        "zupackend",
        "heiter",
        "nachdr�cklich",
        "getragen",
        "gewichtig",
        "zart",
        "z�rtlich",
        "im angemessenen Zeitma�",
        "ruhig",
        "ein wenig",
        "alla marcia",
        "ad libitum",
        "alla breve" });
    public get Label(): string {
        return label;
    }
    public set Label(value: string) {
        label = value;
    }
    public get Placement(): PlacementEnum {
        return placement;
    }
    public set Placement(value: PlacementEnum) {
        placement = value;
    }
    public get StaffNumber(): number {
        return staffNumber;
    }
    public set StaffNumber(value: number) {
        staffNumber = value;
    }
    public get Enum(): TempoEnum {
        return this.tempoEnum;
    }
    public get TempoInBpm(): number {
        return this.tempoInBpm;
    }
    public set TempoInBpm(value: number) {
        this.tempoInBpm = value;
    }
    public get ParentMultiTempoExpression(): MultiTempoExpression {
        return parentMultiTempoExpression;
    }
    public getAbsoluteTimestamp(): Fraction {
        return (this.ParentMultiTempoExpression.SourceMeasureParent.AbsoluteTimestamp + this.ParentMultiTempoExpression.Timestamp);
    }
    public getAbsoluteFloatTimestamp(): number {
        return (this.ParentMultiTempoExpression.SourceMeasureParent.AbsoluteTimestamp + this.ParentMultiTempoExpression.Timestamp).RealValue;
    }
    public static getDefaultValueForTempoType(tempoEnum: TempoEnum): number {
        switch (tempoEnum) {
            case TempoEnum.larghissimo:
                return 20;
            case TempoEnum.grave:
                return 30;
            case TempoEnum.lento:
                return 48;
            case TempoEnum.largo:
                return 52;
            case TempoEnum.larghetto:
                return 63;
            case TempoEnum.adagio:
                return 70;
            case TempoEnum.adagietto:
                return 75;
            case TempoEnum.andanteModerato:
                return 88;
            case TempoEnum.andante:
                return 92;
            case TempoEnum.andantino:
                return 96;
            case TempoEnum.moderato:
                return 106;
            case TempoEnum.allegretto:
                return 112;
            case TempoEnum.allegroModerato:
                return 118;
            case TempoEnum.allegro:
                return 130;
            case TempoEnum.vivace:
                return 140;
            case TempoEnum.vivacissimo:
                return 155;
            case TempoEnum.allegrissimo:
                return 170;
            case TempoEnum.presto:
                return 184;
            case TempoEnum.prestissimo:
                return 200;
            default:
                throw new ArgumentOutOfRangeException("tempoEnum");
        }
    }
    public static isInputStringInstantaniousTempo(inputString: string): boolean {
        if (inputString == null)
            return false;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLarghissimo.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoGrave.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLento.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLargo.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLarghetto.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAdagio.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAdagietto.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAndanteModerato.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAndante.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAndantino.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoModerato.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegretto.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegroModerato.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegro.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoVivace.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoVivacissimo.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegrissimo.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoPresto.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoPrestissimo.Key, inputString))
            return true;
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoChangesGeneral, inputString))
            return true;
        return false;
    }
    private setTempoAndTempoType(soundTempo: number): void {
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLarghissimo.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.larghissimo);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.larghissimo;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoGrave.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.grave);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.grave;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLento.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.lento);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.lento;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLargo.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.largo);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.largo;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLarghetto.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.larghetto);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.larghetto;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAdagio.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.adagio);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.adagio;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAdagietto.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.adagietto);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.adagietto;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAndanteModerato.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.andanteModerato);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.andanteModerato;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAndante.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.andante);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.andante;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAndantino.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.andantino);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.andantino;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoModerato.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.moderato);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.moderato;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegretto.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.allegretto);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.allegretto;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegroModerato.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.allegroModerato);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.allegroModerato;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegro.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.allegro);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.allegro;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoVivace.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.vivace);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.vivace;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoVivacissimo.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.vivacissimo);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.vivacissimo;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegrissimo.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.allegrissimo);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.allegrissimo;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoPresto.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.presto);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.presto;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoPrestissimo.Key, label)) {
            if (soundTempo == 0)
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.prestissimo);
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.prestissimo;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAddons, label)) {
            this.tempoInBpm = 0;
            this.tempoEnum = TempoEnum.addon;
        }
        if (isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoChangesGeneral, label)) {
            this.tempoInBpm = 0;
            this.tempoEnum = TempoEnum.changes;
        }
    }
}
export enum TempoEnum {
    none,
    larghissimo,
    grave,
    lento,
    largo,
    larghetto,
    adagio,
    adagietto,
    andanteModerato,
    andante,
    andantino,
    moderato,
    allegretto,
    allegroModerato,
    allegro,
    vivace,
    vivacissimo,
    allegrissimo,
    presto,
    prestissimo,
    lastRealTempo,
    addon,
    changes
}