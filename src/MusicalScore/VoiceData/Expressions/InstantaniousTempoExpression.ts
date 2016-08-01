import {AbstractTempoExpression} from "./AbstractTempoExpression";
import {PlacementEnum} from "./AbstractExpression";
import {ArgumentOutOfRangeException} from "../../Exceptions";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {MultiTempoExpression} from "./MultiTempoExpression";

export class InstantaniousTempoExpression extends AbstractTempoExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number, soundTempo: number, parentMultiTempoExpression: MultiTempoExpression) {
        super(label, placement, staffNumber, parentMultiTempoExpression);
        this.setTempoAndTempoType(soundTempo);
    }
    private static listInstantaniousTempoLarghissimo: string[] = ["Larghissimo", "Sehr breit", "very, very slow"]; // }), TempoEnum.larghissimo);
    private static listInstantaniousTempoGrave: string[] = ["Grave", "Schwer", "slow and solemn"]; //  }), TempoEnum.grave);
    private static listInstantaniousTempoLento: string[] = ["Lento", "Lent", "Langsam", "slowly"]; //  }), TempoEnum.lento);
    private static listInstantaniousTempoLargo: string[] = ["Largo", "Breit", "broadly"]; //  }), TempoEnum.largo);
    private static listInstantaniousTempoLarghetto: string[] = ["Larghetto", "Etwas breit", "rather broadly"]; //  }), TempoEnum.larghetto);
    private static listInstantaniousTempoAdagio: string[] = ["Adagio", "Langsam", "Ruhig", "slow and stately"]; // }), TempoEnum.adagio);
    private static listInstantaniousTempoAdagietto: string[] = ["Adagietto", "Ziemlich ruhig", "Ziemlich langsam", "rather slow"]; //  }), TempoEnum.adagietto);
    private static listInstantaniousTempoAndanteModerato: string[] = ["Andante moderato"]; //  }), TempoEnum.andanteModerato);
    private static listInstantaniousTempoAndante: string[] = ["Andante", "Gehend", "Schreitend", "at a walking pace"]; //  }), TempoEnum.andante);
    private static listInstantaniousTempoAndantino: string[] = ["Andantino"]; //  }), TempoEnum.andantino);
    private static listInstantaniousTempoModerato: string[] = ["Moderato", "M��ig", "Mod�r�", "moderately"]; //  }), TempoEnum.moderato);
    private static listInstantaniousTempoAllegretto: string[] = ["Allegretto", "fast"]; //  }), TempoEnum.allegretto);
    private static listInstantaniousTempoAllegroModerato: string[] = ["Allegro moderato"]; //  }), TempoEnum.allegroModerato);
    private static listInstantaniousTempoAllegro: string[] = ["Allegro", "Rapide", "Vite", "Rasch", "Schnell", "Fr�hlich"]; //  }), TempoEnum.allegro);
    private static listInstantaniousTempoVivace: string[] = ["Vivace", "Lebhaft", "Lebendig", "lively and fast"]; //  }), TempoEnum.vivace);
    private static listInstantaniousTempoVivacissimo: string[] = ["Vivacissimo", "Sehr lebhaft", "Sehr lebendig"]; //  }), TempoEnum.vivacissimo);
    private static listInstantaniousTempoAllegrissimo: string[] = ["Allegrissimo", "very fast"]; //  }), TempoEnum.allegrissimo);
    private static listInstantaniousTempoPresto: string[] = ["Presto", "Sehr schnell", "Geschwind"]; //  }), TempoEnum.presto);
    private static listInstantaniousTempoPrestissimo: string[] = ["Prestissimo", "�u�erst schnell"]; //  }), TempoEnum.prestissimo);
    private static listInstantaniousTempoChangesGeneral: string[] = [
        "tempo primo",
        "a tempo",
        "tempo i",
        "rubato",
        "doppio movimento",
    ];
    private static listInstantaniousTempoAddons: string[] = [
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
        "alla breve",
    ];

    private tempoEnum: TempoEnum;
    private tempoInBpm: number;

    // Must refactor: In c# use 'out' arguments
    //private findTempoEnum(inputString: string, pre: string, post: string): TempoEnum {
    //    let result: TempoEnum = this.splitStringAfterInstructionWord(inputString,
    // InstantaniousTempoExpression.listInstantaniousTempoLarghissimo, TempoEnum.larghissimo, pre,
    //        post);
    //    if (result !== TempoEnum.none)
    //        return result;
    //    result = this.splitStringAfterInstructionWord(inputString, InstantaniousTempoExpression.listInstantaniousTempoGrave, TempoEnum.grave, pre,
    //        post);
    //    if (result !== TempoEnum.none)
    //        return result;
    //    return TempoEnum.none;
    //}
    //private splitStringAfterInstructionWord(inputString: string, instruction: string[], value: TempoEnum, pre: string, post: string): TempoEnum {
    //    pre = undefined;
    //    post = undefined;
    //    for (let idx: number = 0, len: number = instruction.length; idx < len; ++idx) {
    //        let instructionWord: string = instruction[idx];
    //        let separators: string[] = [" " + instructionWord, instructionWord + " ", "," + instructionWord, instructionWord + ","];
    //        for (let j: number = 0; j < 4; j++) {
    //            let splits:string[] = inputString.split(separators[j], 2);
    //            if (splits.length > 1) {
    //                pre = splits[0];
    //                post = splits[1];
    //                return value;
    //            }
    //        }
    //    }
    //    return TempoEnum.none;
    //}
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
        if (inputString === undefined) { return false; }
        return (
            (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLarghissimo, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoGrave, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLento, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLargo, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLarghetto, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAdagio, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAdagietto, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAndanteModerato, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAndante, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAndantino, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoModerato, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegretto, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegroModerato, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegro, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoVivace, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoVivacissimo, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegrissimo, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoPresto, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoPrestissimo, inputString))
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoChangesGeneral, inputString))
        );
    }

    public get Label(): string {
        return this.label;
    }
    public set Label(value: string) {
        this.label = value;
    }
    public get Placement(): PlacementEnum {
        return this.placement;
    }
    public set Placement(value: PlacementEnum) {
        this.placement = value;
    }
    public get StaffNumber(): number {
        return this.staffNumber;
    }
    public set StaffNumber(value: number) {
        this.staffNumber = value;
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
        return this.parentMultiTempoExpression;
    }
    public getAbsoluteTimestamp(): Fraction {
        return Fraction.plus(this.ParentMultiTempoExpression.SourceMeasureParent.AbsoluteTimestamp, this.ParentMultiTempoExpression.Timestamp);
    }
    public getAbsoluteFloatTimestamp(): number {
        return Fraction.plus(this.ParentMultiTempoExpression.SourceMeasureParent.AbsoluteTimestamp, this.ParentMultiTempoExpression.Timestamp).RealValue;
    }
    private setTempoAndTempoType(soundTempo: number): void {
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLarghissimo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.larghissimo);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.larghissimo;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoGrave, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.grave);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.grave;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLento, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.lento);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.lento;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLargo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.largo);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.largo;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLarghetto, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.larghetto);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.larghetto;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAdagio, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.adagio);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.adagio;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAdagietto, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.adagietto);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.adagietto;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAndanteModerato, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.andanteModerato);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.andanteModerato;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAndante, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.andante);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.andante;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAndantino, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.andantino);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.andantino;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoModerato, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.moderato);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.moderato;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegretto, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.allegretto);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.allegretto;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegroModerato, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.allegroModerato);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.allegroModerato;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegro, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.allegro);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.allegro;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoVivace, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.vivace);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.vivace;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoVivacissimo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.vivacissimo);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.vivacissimo;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAllegrissimo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.allegrissimo);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.allegrissimo;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoPresto, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.presto);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.presto;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoPrestissimo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaniousTempoExpression.getDefaultValueForTempoType(TempoEnum.prestissimo);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.prestissimo;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoAddons, this.label)) {
            this.tempoInBpm = 0;
            this.tempoEnum = TempoEnum.addon;
            return;
        }
        if (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoChangesGeneral, this.label)) {
            this.tempoInBpm = 0;
            this.tempoEnum = TempoEnum.changes;
            return;
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
