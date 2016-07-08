"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var abstractTempoExpression_1 = require("./abstractTempoExpression");
var Exceptions_1 = require("../../Exceptions");
var fraction_1 = require("../../../Common/DataObjects/fraction");
var InstantaniousTempoExpression = (function (_super) {
    __extends(InstantaniousTempoExpression, _super);
    function InstantaniousTempoExpression(label, placement, staffNumber, soundTempo, parentMultiTempoExpression) {
        _super.call(this, label, placement, staffNumber, parentMultiTempoExpression);
        this.setTempoAndTempoType(soundTempo);
    }
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
    InstantaniousTempoExpression.getDefaultValueForTempoType = function (tempoEnum) {
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
                throw new Exceptions_1.ArgumentOutOfRangeException("tempoEnum");
        }
    };
    InstantaniousTempoExpression.isInputStringInstantaniousTempo = function (inputString) {
        if (inputString === undefined) {
            return false;
        }
        return ((InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoLarghissimo, inputString))
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
            || (InstantaniousTempoExpression.isStringInStringList(InstantaniousTempoExpression.listInstantaniousTempoChangesGeneral, inputString)));
    };
    Object.defineProperty(InstantaniousTempoExpression.prototype, "Label", {
        get: function () {
            return this.label;
        },
        set: function (value) {
            this.label = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstantaniousTempoExpression.prototype, "Placement", {
        get: function () {
            return this.placement;
        },
        set: function (value) {
            this.placement = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstantaniousTempoExpression.prototype, "StaffNumber", {
        get: function () {
            return this.staffNumber;
        },
        set: function (value) {
            this.staffNumber = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstantaniousTempoExpression.prototype, "Enum", {
        get: function () {
            return this.tempoEnum;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstantaniousTempoExpression.prototype, "TempoInBpm", {
        get: function () {
            return this.tempoInBpm;
        },
        set: function (value) {
            this.tempoInBpm = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstantaniousTempoExpression.prototype, "ParentMultiTempoExpression", {
        get: function () {
            return this.parentMultiTempoExpression;
        },
        enumerable: true,
        configurable: true
    });
    InstantaniousTempoExpression.prototype.getAbsoluteTimestamp = function () {
        return fraction_1.Fraction.plus(this.ParentMultiTempoExpression.SourceMeasureParent.AbsoluteTimestamp, this.ParentMultiTempoExpression.Timestamp);
    };
    InstantaniousTempoExpression.prototype.getAbsoluteFloatTimestamp = function () {
        return fraction_1.Fraction.plus(this.ParentMultiTempoExpression.SourceMeasureParent.AbsoluteTimestamp, this.ParentMultiTempoExpression.Timestamp).RealValue;
    };
    InstantaniousTempoExpression.prototype.setTempoAndTempoType = function (soundTempo) {
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
    };
    InstantaniousTempoExpression.listInstantaniousTempoLarghissimo = ["Larghissimo", "Sehr breit", "very, very slow"]; // }), TempoEnum.larghissimo);
    InstantaniousTempoExpression.listInstantaniousTempoGrave = ["Grave", "Schwer", "slow and solemn"]; //  }), TempoEnum.grave);
    InstantaniousTempoExpression.listInstantaniousTempoLento = ["Lento", "Lent", "Langsam", "slowly"]; //  }), TempoEnum.lento);
    InstantaniousTempoExpression.listInstantaniousTempoLargo = ["Largo", "Breit", "broadly"]; //  }), TempoEnum.largo);
    InstantaniousTempoExpression.listInstantaniousTempoLarghetto = ["Larghetto", "Etwas breit", "rather broadly"]; //  }), TempoEnum.larghetto);
    InstantaniousTempoExpression.listInstantaniousTempoAdagio = ["Adagio", "Langsam", "Ruhig", "slow and stately"]; // }), TempoEnum.adagio);
    InstantaniousTempoExpression.listInstantaniousTempoAdagietto = ["Adagietto", "Ziemlich ruhig", "Ziemlich langsam", "rather slow"]; //  }), TempoEnum.adagietto);
    InstantaniousTempoExpression.listInstantaniousTempoAndanteModerato = ["Andante moderato"]; //  }), TempoEnum.andanteModerato);
    InstantaniousTempoExpression.listInstantaniousTempoAndante = ["Andante", "Gehend", "Schreitend", "at a walking pace"]; //  }), TempoEnum.andante);
    InstantaniousTempoExpression.listInstantaniousTempoAndantino = ["Andantino"]; //  }), TempoEnum.andantino);
    InstantaniousTempoExpression.listInstantaniousTempoModerato = ["Moderato", "M��ig", "Mod�r�", "moderately"]; //  }), TempoEnum.moderato);
    InstantaniousTempoExpression.listInstantaniousTempoAllegretto = ["Allegretto", "fast"]; //  }), TempoEnum.allegretto);
    InstantaniousTempoExpression.listInstantaniousTempoAllegroModerato = ["Allegro moderato"]; //  }), TempoEnum.allegroModerato);
    InstantaniousTempoExpression.listInstantaniousTempoAllegro = ["Allegro", "Rapide", "Vite", "Rasch", "Schnell", "Fr�hlich"]; //  }), TempoEnum.allegro);
    InstantaniousTempoExpression.listInstantaniousTempoVivace = ["Vivace", "Lebhaft", "Lebendig", "lively and fast"]; //  }), TempoEnum.vivace);
    InstantaniousTempoExpression.listInstantaniousTempoVivacissimo = ["Vivacissimo", "Sehr lebhaft", "Sehr lebendig"]; //  }), TempoEnum.vivacissimo);
    InstantaniousTempoExpression.listInstantaniousTempoAllegrissimo = ["Allegrissimo", "very fast"]; //  }), TempoEnum.allegrissimo);
    InstantaniousTempoExpression.listInstantaniousTempoPresto = ["Presto", "Sehr schnell", "Geschwind"]; //  }), TempoEnum.presto);
    InstantaniousTempoExpression.listInstantaniousTempoPrestissimo = ["Prestissimo", "�u�erst schnell"]; //  }), TempoEnum.prestissimo);
    InstantaniousTempoExpression.listInstantaniousTempoChangesGeneral = [
        "tempo primo",
        "a tempo",
        "tempo i",
        "rubato",
        "doppio movimento",
    ];
    InstantaniousTempoExpression.listInstantaniousTempoAddons = [
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
    return InstantaniousTempoExpression;
}(abstractTempoExpression_1.AbstractTempoExpression));
exports.InstantaniousTempoExpression = InstantaniousTempoExpression;
(function (TempoEnum) {
    TempoEnum[TempoEnum["none"] = 0] = "none";
    TempoEnum[TempoEnum["larghissimo"] = 1] = "larghissimo";
    TempoEnum[TempoEnum["grave"] = 2] = "grave";
    TempoEnum[TempoEnum["lento"] = 3] = "lento";
    TempoEnum[TempoEnum["largo"] = 4] = "largo";
    TempoEnum[TempoEnum["larghetto"] = 5] = "larghetto";
    TempoEnum[TempoEnum["adagio"] = 6] = "adagio";
    TempoEnum[TempoEnum["adagietto"] = 7] = "adagietto";
    TempoEnum[TempoEnum["andanteModerato"] = 8] = "andanteModerato";
    TempoEnum[TempoEnum["andante"] = 9] = "andante";
    TempoEnum[TempoEnum["andantino"] = 10] = "andantino";
    TempoEnum[TempoEnum["moderato"] = 11] = "moderato";
    TempoEnum[TempoEnum["allegretto"] = 12] = "allegretto";
    TempoEnum[TempoEnum["allegroModerato"] = 13] = "allegroModerato";
    TempoEnum[TempoEnum["allegro"] = 14] = "allegro";
    TempoEnum[TempoEnum["vivace"] = 15] = "vivace";
    TempoEnum[TempoEnum["vivacissimo"] = 16] = "vivacissimo";
    TempoEnum[TempoEnum["allegrissimo"] = 17] = "allegrissimo";
    TempoEnum[TempoEnum["presto"] = 18] = "presto";
    TempoEnum[TempoEnum["prestissimo"] = 19] = "prestissimo";
    TempoEnum[TempoEnum["lastRealTempo"] = 20] = "lastRealTempo";
    TempoEnum[TempoEnum["addon"] = 21] = "addon";
    TempoEnum[TempoEnum["changes"] = 22] = "changes";
})(exports.TempoEnum || (exports.TempoEnum = {}));
var TempoEnum = exports.TempoEnum;
