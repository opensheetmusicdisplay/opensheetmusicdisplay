"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var abstractExpression_1 = require("./abstractExpression");
var MoodExpression = (function (_super) {
    __extends(MoodExpression, _super);
    function MoodExpression(label, placement, staffNumber) {
        _super.call(this);
        this.label = label;
        this.placement = placement;
        this.staffNumber = staffNumber;
        this.setMoodType();
    }
    MoodExpression.isInputStringMood = function (inputString) {
        if (inputString === undefined) {
            return false;
        }
        return (MoodExpression.isStringInStringList(MoodExpression.listMoodAffettuoso, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodAgitato, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodAnimato, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodAppassionato, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodBrillante, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodCantabile, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodDolce, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodEnergico, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodEroico, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodEspressivo, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodFurioso, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodGiocoso, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodGioioso, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodGrandioso, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodGrazioso, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodLacrimoso, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodLeggiero, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodMaestoso, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodMalinconico, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodMarcato, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodMarziale, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodMesto, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodMorendo, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodNobilmente, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodPatetico, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodPesante, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodSaltando, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodSautille, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodScherzando, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodSostenuto, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodSpiccato, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodTenerezza, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodTranquillamente, inputString)
            || MoodExpression.isStringInStringList(MoodExpression.listMoodTrionfante, inputString));
    };
    Object.defineProperty(MoodExpression.prototype, "Label", {
        get: function () {
            return this.label;
        },
        set: function (value) {
            this.label = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MoodExpression.prototype, "Mood", {
        get: function () {
            return this.moodType;
        },
        set: function (value) {
            this.moodType = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MoodExpression.prototype, "StaffNumber", {
        get: function () {
            return this.staffNumber;
        },
        set: function (value) {
            this.staffNumber = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MoodExpression.prototype, "Placement", {
        get: function () {
            return this.placement;
        },
        set: function (value) {
            this.placement = value;
        },
        enumerable: true,
        configurable: true
    });
    MoodExpression.prototype.setMoodType = function () {
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodAffettuoso, this.label)) {
            this.moodType = MoodEnum.Affettuoso;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodAgitato, this.label)) {
            this.moodType = MoodEnum.Agitato;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodAnimato, this.label)) {
            this.moodType = MoodEnum.Animato;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodAppassionato, this.label)) {
            this.moodType = MoodEnum.Appassionato;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodBrillante, this.label)) {
            this.moodType = MoodEnum.Brillante;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodCantabile, this.label)) {
            this.moodType = MoodEnum.Cantabile;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodDolce, this.label)) {
            this.moodType = MoodEnum.Dolce;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodEnergico, this.label)) {
            this.moodType = MoodEnum.Energico;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodEroico, this.label)) {
            this.moodType = MoodEnum.Eroico;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodEspressivo, this.label)) {
            this.moodType = MoodEnum.Espressivo;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodFurioso, this.label)) {
            this.moodType = MoodEnum.Furioso;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodGiocoso, this.label)) {
            this.moodType = MoodEnum.Giocoso;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodGioioso, this.label)) {
            this.moodType = MoodEnum.Gioioso;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodGrandioso, this.label)) {
            this.moodType = MoodEnum.Grandioso;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodGrazioso, this.label)) {
            this.moodType = MoodEnum.Grazioso;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodLacrimoso, this.label)) {
            this.moodType = MoodEnum.Lacrimoso;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodLeggiero, this.label)) {
            this.moodType = MoodEnum.Leggiero;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodMaestoso, this.label)) {
            this.moodType = MoodEnum.Maestoso;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodMalinconico, this.label)) {
            this.moodType = MoodEnum.Malinconico;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodMarcato, this.label)) {
            this.moodType = MoodEnum.Marcato;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodMarziale, this.label)) {
            this.moodType = MoodEnum.Marziale;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodMesto, this.label)) {
            this.moodType = MoodEnum.Mesto;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodMorendo, this.label)) {
            this.moodType = MoodEnum.Morendo;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodNobilmente, this.label)) {
            this.moodType = MoodEnum.Nobilmente;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodPatetico, this.label)) {
            this.moodType = MoodEnum.Patetico;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodPesante, this.label)) {
            this.moodType = MoodEnum.Pesante;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodSaltando, this.label)) {
            this.moodType = MoodEnum.Saltando;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodSautille, this.label)) {
            this.moodType = MoodEnum.Sautille;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodScherzando, this.label)) {
            this.moodType = MoodEnum.Scherzando;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodSostenuto, this.label)) {
            this.moodType = MoodEnum.Sostenuto;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodSpiccato, this.label)) {
            this.moodType = MoodEnum.Spiccato;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodTenerezza, this.label)) {
            this.moodType = MoodEnum.Tenerezza;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodTranquillamente, this.label)) {
            this.moodType = MoodEnum.Tranquillamente;
        }
        else if (MoodExpression.isStringInStringList(MoodExpression.listMoodTrionfante, this.label)) {
            this.moodType = MoodEnum.Trionfante;
        }
    };
    MoodExpression.listMoodAffettuoso = ["affettuoso"];
    MoodExpression.listMoodAgitato = ["agitato"];
    MoodExpression.listMoodAppassionato = ["appassionato"];
    MoodExpression.listMoodAnimato = ["animato", "lively"];
    MoodExpression.listMoodBrillante = ["brillante"];
    MoodExpression.listMoodCantabile = ["cantabile"];
    MoodExpression.listMoodDolce = ["dolce"];
    MoodExpression.listMoodEnergico = ["energico"];
    MoodExpression.listMoodEroico = ["eroico"];
    MoodExpression.listMoodEspressivo = ["espressivo"];
    MoodExpression.listMoodFurioso = ["furioso"];
    MoodExpression.listMoodGiocoso = ["giocoso"];
    MoodExpression.listMoodGioioso = ["gioioso"];
    MoodExpression.listMoodLacrimoso = ["lacrimoso"];
    MoodExpression.listMoodGrandioso = ["grandioso"];
    MoodExpression.listMoodGrazioso = ["grazioso"];
    MoodExpression.listMoodLeggiero = ["leggiero"];
    MoodExpression.listMoodMaestoso = ["maestoso"];
    MoodExpression.listMoodMalinconico = ["malinconico"];
    MoodExpression.listMoodMarcato = ["marcato"];
    MoodExpression.listMoodMarziale = ["marziale"];
    MoodExpression.listMoodMesto = ["mesto"];
    MoodExpression.listMoodMorendo = ["morendo"];
    MoodExpression.listMoodNobilmente = ["nobilmente"];
    MoodExpression.listMoodPatetico = ["patetico"];
    MoodExpression.listMoodPesante = ["pesante"];
    MoodExpression.listMoodSautille = ["sautille"];
    MoodExpression.listMoodSaltando = ["saltando"];
    MoodExpression.listMoodScherzando = ["scherzando"];
    MoodExpression.listMoodSostenuto = ["sostenuto"];
    MoodExpression.listMoodSpiccato = ["spiccato"];
    MoodExpression.listMoodTenerezza = ["tenerezza"];
    MoodExpression.listMoodTranquillamente = ["tranquillamente"];
    MoodExpression.listMoodTrionfante = ["trionfante"];
    return MoodExpression;
}(abstractExpression_1.AbstractExpression));
exports.MoodExpression = MoodExpression;
(function (MoodEnum) {
    MoodEnum[MoodEnum["Affettuoso"] = 0] = "Affettuoso";
    MoodEnum[MoodEnum["Agitato"] = 1] = "Agitato";
    MoodEnum[MoodEnum["Appassionato"] = 2] = "Appassionato";
    MoodEnum[MoodEnum["Animato"] = 3] = "Animato";
    MoodEnum[MoodEnum["Brillante"] = 4] = "Brillante";
    MoodEnum[MoodEnum["Cantabile"] = 5] = "Cantabile";
    MoodEnum[MoodEnum["Dolce"] = 6] = "Dolce";
    MoodEnum[MoodEnum["Energico"] = 7] = "Energico";
    MoodEnum[MoodEnum["Eroico"] = 8] = "Eroico";
    MoodEnum[MoodEnum["Espressivo"] = 9] = "Espressivo";
    MoodEnum[MoodEnum["Furioso"] = 10] = "Furioso";
    MoodEnum[MoodEnum["Giocoso"] = 11] = "Giocoso";
    MoodEnum[MoodEnum["Gioioso"] = 12] = "Gioioso";
    MoodEnum[MoodEnum["Lacrimoso"] = 13] = "Lacrimoso";
    MoodEnum[MoodEnum["Grandioso"] = 14] = "Grandioso";
    MoodEnum[MoodEnum["Grazioso"] = 15] = "Grazioso";
    MoodEnum[MoodEnum["Leggiero"] = 16] = "Leggiero";
    MoodEnum[MoodEnum["Maestoso"] = 17] = "Maestoso";
    MoodEnum[MoodEnum["Malinconico"] = 18] = "Malinconico";
    MoodEnum[MoodEnum["Marcato"] = 19] = "Marcato";
    MoodEnum[MoodEnum["Marziale"] = 20] = "Marziale";
    MoodEnum[MoodEnum["Mesto"] = 21] = "Mesto";
    MoodEnum[MoodEnum["Morendo"] = 22] = "Morendo";
    MoodEnum[MoodEnum["Nobilmente"] = 23] = "Nobilmente";
    MoodEnum[MoodEnum["Patetico"] = 24] = "Patetico";
    MoodEnum[MoodEnum["Pesante"] = 25] = "Pesante";
    MoodEnum[MoodEnum["Sautille"] = 26] = "Sautille";
    MoodEnum[MoodEnum["Saltando"] = 27] = "Saltando";
    MoodEnum[MoodEnum["Scherzando"] = 28] = "Scherzando";
    MoodEnum[MoodEnum["Sostenuto"] = 29] = "Sostenuto";
    MoodEnum[MoodEnum["Spiccato"] = 30] = "Spiccato";
    MoodEnum[MoodEnum["Tenerezza"] = 31] = "Tenerezza";
    MoodEnum[MoodEnum["Tranquillamente"] = 32] = "Tranquillamente";
    MoodEnum[MoodEnum["Trionfante"] = 33] = "Trionfante";
    MoodEnum[MoodEnum["Vivace"] = 34] = "Vivace";
})(exports.MoodEnum || (exports.MoodEnum = {}));
var MoodEnum = exports.MoodEnum;
