import {AbstractTempoExpression} from "./AbstractTempoExpression";
import {PlacementEnum} from "./AbstractExpression";
import {ArgumentOutOfRangeException} from "../../Exceptions";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {MultiTempoExpression} from "./MultiTempoExpression";

export class InstantaneousTempoExpression extends AbstractTempoExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number,
                soundTempo: number, parentMultiTempoExpression: MultiTempoExpression, isMetronomeMark: boolean = false) {
        super(label, placement, staffNumber, parentMultiTempoExpression);
        this.setTempoAndTempoType(soundTempo);
    }
    private static listInstantaneousTempoLarghissimo: string[] = ["Larghissimo", "Sehr breit", "very, very slow"]; // }), TempoEnum.larghissimo);
    private static listInstantaneousTempoGrave: string[] = ["Grave", "Schwer", "slow and solemn"]; //  }), TempoEnum.grave);
    private static listInstantaneousTempoLento: string[] = ["Lento", "Lent", "Langsam", "slowly"]; //  }), TempoEnum.lento);
    private static listInstantaneousTempoLargo: string[] = ["Largo", "Breit", "broadly"]; //  }), TempoEnum.largo);
    private static listInstantaneousTempoLarghetto: string[] = ["Larghetto", "Etwas breit", "rather broadly"]; //  }), TempoEnum.larghetto);
    private static listInstantaneousTempoAdagio: string[] = ["Adagio", "Langsam", "Ruhig", "slow and stately"]; // }), TempoEnum.adagio);
    private static listInstantaneousTempoAdagietto: string[] = ["Adagietto", "Ziemlich ruhig", "Ziemlich langsam", "rather slow"]; //  }), TempoEnum.adagietto);
    private static listInstantaneousTempoAndanteModerato: string[] = ["Andante moderato"]; //  }), TempoEnum.andanteModerato);
    private static listInstantaneousTempoAndante: string[] = ["Andante", "Gehend", "Schreitend", "at a walking pace"]; //  }), TempoEnum.andante);
    private static listInstantaneousTempoAndantino: string[] = ["Andantino"]; //  }), TempoEnum.andantino);
    private static listInstantaneousTempoModerato: string[] = ["Moderato", "Mäßig", "Mod�r�", "moderately"]; //  }), TempoEnum.moderato);
    private static listInstantaneousTempoAllegretto: string[] = ["Allegretto", "fast"]; //  }), TempoEnum.allegretto);
    private static listInstantaneousTempoAllegroModerato: string[] = ["Allegro moderato"]; //  }), TempoEnum.allegroModerato);
    private static listInstantaneousTempoAllegro: string[] = ["Allegro", "Rapide", "Vite", "Rasch", "Schnell", "Fr�hlich"]; //  }), TempoEnum.allegro);
    private static listInstantaneousTempoVivace: string[] = ["Vivace", "Lebhaft", "Lebendig", "lively and fast"]; //  }), TempoEnum.vivace);
    private static listInstantaneousTempoVivacissimo: string[] = ["Vivacissimo", "Sehr lebhaft", "Sehr lebendig"]; //  }), TempoEnum.vivacissimo);
    private static listInstantaneousTempoAllegrissimo: string[] = ["Allegrissimo", "very fast"]; //  }), TempoEnum.allegrissimo);
    private static listInstantaneousTempoPresto: string[] = ["Presto", "Sehr schnell", "Geschwind"]; //  }), TempoEnum.presto);
    private static listInstantaneousTempoPrestissimo: string[] = ["Prestissimo", "äußerst schnell"]; //  }), TempoEnum.prestissimo);
    private static listInstantaneousTempoChangesGeneral: string[] = [
        "tempo primo",
        "a tempo",
        "tempo i",
        "rubato",
        "doppio movimento",
    ];
    private static listInstantaneousTempoAddons: string[] = [
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
        "amourös",
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
        "graziös",
        "mit Grazie",
        "flink",
        "behände",
        "traurig",
        "klagend",
        "majestätisch",
        "aber nicht zu sehr",
        "markant",
        "gemäßigt",
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
        "nachdrücklich",
        "getragen",
        "gewichtig",
        "zart",
        "zärtlich",
        "im angemessenen Zeitmaß",
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
    // InstantaneousTempoExpression.listInstantaneousTempoLarghissimo, TempoEnum.larghissimo, pre,
    //        post);
    //    if (result !== TempoEnum.none)
    //        return result;
    //    result = this.splitStringAfterInstructionWord(inputString, InstantaneousTempoExpression.listInstantaneousTempoGrave, TempoEnum.grave, pre,
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
    public static isInputStringInstantaneousTempo(inputString: string): boolean {
        if (inputString === undefined) { return false; }
        return (
            (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoLarghissimo, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoGrave, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoLento, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoLargo, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoLarghetto, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAdagio, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAdagietto, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAndanteModerato, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAndante, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAndantino, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoModerato, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAllegretto, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAllegroModerato, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAllegro, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoVivace, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoVivacissimo, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAllegrissimo, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoPresto, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoPrestissimo, inputString))
            || (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoChangesGeneral, inputString))
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
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoLarghissimo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.larghissimo);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.larghissimo;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoGrave, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.grave);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.grave;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoLento, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.lento);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.lento;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoLargo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.largo);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.largo;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoLarghetto, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.larghetto);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.larghetto;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAdagio, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.adagio);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.adagio;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAdagietto, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.adagietto);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.adagietto;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAndanteModerato, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.andanteModerato);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.andanteModerato;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAndante, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.andante);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.andante;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAndantino, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.andantino);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.andantino;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoModerato, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.moderato);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.moderato;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAllegretto, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.allegretto);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.allegretto;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAllegroModerato, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.allegroModerato);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.allegroModerato;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAllegro, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.allegro);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.allegro;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoVivace, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.vivace);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.vivace;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoVivacissimo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.vivacissimo);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.vivacissimo;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAllegrissimo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.allegrissimo);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.allegrissimo;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoPresto, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.presto);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.presto;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoPrestissimo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForTempoType(TempoEnum.prestissimo);
            }
            this.tempoInBpm = soundTempo;
            this.tempoEnum = TempoEnum.prestissimo;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAddons, this.label)) {
            this.tempoInBpm = 0;
            this.tempoEnum = TempoEnum.addon;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoChangesGeneral, this.label)) {
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
    changes,
    metronomeMark
}
