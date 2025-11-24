import {AbstractTempoExpression} from "./AbstractTempoExpression";
import {PlacementEnum} from "./AbstractExpression";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {MultiTempoExpression} from "./MultiTempoExpression";

/** Tempo expressions that usually have an instantaneous and non-gradual effect on playback speed (e.g. Allegro),
 * or at least cover large sections, compared to the usually gradual effects or shorter sections of ContinuousExpressions.
 */
export class InstantaneousTempoExpression extends AbstractTempoExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number,
                soundTempo: number, parentMultiTempoExpression: MultiTempoExpression, isMetronomeMark: boolean = false) {
        /*if (isMetronomeMark) {
            label = " = " + soundTempo;
        }*/
        super(label, placement, staffNumber, parentMultiTempoExpression);
        this.parentMeasure = parentMultiTempoExpression.SourceMeasureParent;
        this.isMetronomeMark = isMetronomeMark;
        this.setTempoAndTempoType(soundTempo);
    }

    public dotted: boolean;
    public beatUnit: string;
    public isMetronomeMark: boolean;
    private static listInstantaneousTempoLarghissimo: string[] = ["Larghissimo", "Sehr breit", "very, very slow"]; // }), TempoEnum.larghissimo);
    private static listInstantaneousTempoGrave: string[] = ["Grave", "Schwer", "slow and solemn"]; //  }), TempoEnum.grave);
    private static listInstantaneousTempoLento: string[] = ["Lento", "Lent", "Langsam", "slowly"]; //  }), TempoEnum.lento);
    private static listInstantaneousTempoLargo: string[] = ["Largo", "Breit", "broadly"]; //  }), TempoEnum.largo);
    private static listInstantaneousTempoLarghetto: string[] = ["Larghetto", "Etwas breit", "rather broadly"]; //  }), TempoEnum.larghetto);
    private static listInstantaneousTempoAdagio: string[] = ["Adagio", "Langsam", "Ruhig", "slow and stately"]; // }), TempoEnum.adagio);
    private static listInstantaneousTempoAdagietto: string[] = ["Adagietto", "Ziemlich ruhig", "Ziemlich langsam", "rather slow"]; //  }), TempoEnum.adagietto);
    private static listInstantaneousTempoAndanteModerato: string[] = ["Andante moderato"]; //  }), TempoEnum.andanteModerato);
    private static listInstantaneousTempoAndante: string[] = ["Andante", "Gehend", "Schreitend", "at a walking pace"]; //  }), TempoEnum.andante);
    private static listInstantaneousTempoAndantino: string[] = ["Andantino", "Maestoso"]; //  }), TempoEnum.andantino);
    private static listInstantaneousTempoModerato: string[] = ["Moderato", "Mäßig", "Modéré", "moderately"]; //  }), TempoEnum.moderato);
    private static listInstantaneousTempoAllegretto: string[] = ["Allegretto", "Animato", "fast"]; //  }), TempoEnum.allegretto);
    private static listInstantaneousTempoAllegroModerato: string[] = ["Allegro moderato"]; //  }), TempoEnum.allegroModerato);
    private static listInstantaneousTempoAllegro: string[] = ["Allegro", "Rapide", "Vite", "Rasch", "Schnell", "Fröhlich"]; //  }), TempoEnum.allegro);
    private static listInstantaneousTempoVivace: string[] = ["Vivace", "Allegro Assai", "Lebhaft", "Lebendig", "lively and fast"]; //  }), TempoEnum.vivace);
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
        "rallentando",
        "ritardando",
        "ritard.",
        "rit.",
        "ritard",
        "rall...",
        "accelerando",
        "accel",
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

    public TempoType: TempoType;
    public InstTempo: InstTempo;
    /** This is `none` unless `TempoType` is `change`. */
    public ChangeSubType: ChangeSubType;
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
    public static getDefaultValueForInstTempo(instTempo: InstTempo): number {
        switch (instTempo) {
            case InstTempo.larghissimo:
                return 20;
            case InstTempo.grave:
                return 30;
            case InstTempo.lento:
                return 48;
            case InstTempo.largo:
                return 52;
            case InstTempo.larghetto:
                return 63;
            case InstTempo.adagio:
                return 70;
            case InstTempo.adagietto:
                return 75;
            case InstTempo.andanteModerato:
                return 88;
            case InstTempo.andante:
                return 92;
            case InstTempo.andantino:
                return 96;
            case InstTempo.moderato:
                return 106;
            case InstTempo.allegretto:
                return 112;
            case InstTempo.allegroModerato:
                return 118;
            case InstTempo.allegro:
                return 130;
            case InstTempo.vivace:
                return 140;
            case InstTempo.vivacissimo:
                return 155;
            case InstTempo.allegrissimo:
                return 170;
            case InstTempo.presto:
                return 184;
            case InstTempo.prestissimo:
                return 200;
            default:
                return 60;
                //throw new ArgumentOutOfRangeException("instTempo");
        }
    }
    public static isInputStringInstantaneousTempo(inputString: string): boolean {
        if (!inputString) { return false; }
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
        if (!this.label) {
            this.tempoInBpm = soundTempo;
            this.TempoType = TempoType.metronomeMark;
            return;
        }
        if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoLarghissimo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.larghissimo);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.larghissimo;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoGrave, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.grave);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.grave;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoLento, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.lento);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.lento;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoLargo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.largo);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.largo;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoLarghetto, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.larghetto);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.larghetto;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAdagio, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.adagio);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.adagio;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAdagietto, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.adagietto);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.adagietto;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAndanteModerato, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.andanteModerato);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.andanteModerato;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAndante, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.andante);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.andante;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAndantino, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.andantino);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.andantino;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoModerato, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.moderato);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.moderato;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAllegretto, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.allegretto);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.allegretto;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAllegroModerato, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.allegroModerato);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.allegroModerato;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAllegro, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.allegro);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.allegro;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoVivace, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.vivace);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.vivace;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoVivacissimo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.vivacissimo);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.vivacissimo;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAllegrissimo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.allegrissimo);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.allegrissimo;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoPresto, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.presto);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.presto;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoPrestissimo, this.label)) {
            if (soundTempo === 0) {
                soundTempo = InstantaneousTempoExpression.getDefaultValueForInstTempo(InstTempo.prestissimo);
            }
            this.tempoInBpm = soundTempo;
            this.InstTempo = InstTempo.prestissimo;
            this.TempoType = TempoType.inst;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoAddons, this.label)) {
            this.tempoInBpm = 0;
            this.TempoType = TempoType.addon;
        } else if (InstantaneousTempoExpression.isStringInStringList(InstantaneousTempoExpression.listInstantaneousTempoChangesGeneral, this.label)) {
            this.tempoInBpm = 0;
            this.TempoType = TempoType.change;
        }
    }
}

export enum TempoType {
    none = 0,
    metronomeMark,
    inst,
    change,
    addon,
}

export enum InstTempo {
    // none, // TODO @nocheckin reactivate
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
}

export enum ChangeSubType {
    none = 0,
    atempo,
    doppioMovimento,
    tempoprimo,
}
