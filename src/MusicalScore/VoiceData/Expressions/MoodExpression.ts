import {PlacementEnum, AbstractExpression} from "./AbstractExpression";

export class MoodExpression extends AbstractExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number) {
        super(placement);
        this.label = label;
        this.staffNumber = staffNumber;
        this.setMoodType();
    }

    private static listMoodAffettuoso: string[] = ["affettuoso"];
    private static listMoodAgitato: string[] = ["agitato"];
    private static listMoodAppassionato: string[] = ["appassionato"];
    private static listMoodAnimato: string[] = ["animato", "lively"];
    private static listMoodBrillante: string[] = ["brillante"];
    private static listMoodCantabile: string[] = ["cantabile"];
    private static listMoodDolce: string[] = ["dolce"];
    private static listMoodEnergico: string[] = ["energico"];
    private static listMoodEroico: string[] = ["eroico"];
    private static listMoodEspressivo: string[] = ["espressivo"];
    private static listMoodFurioso: string[] = ["furioso"];
    private static listMoodGiocoso: string[] = ["giocoso"];
    private static listMoodGioioso: string[] = ["gioioso"];
    private static listMoodLacrimoso: string[] = ["lacrimoso"];
    private static listMoodGrandioso: string[] = ["grandioso"];
    private static listMoodGrazioso: string[] = ["grazioso"];
    private static listMoodLeggiero: string[] = ["leggiero"];
    private static listMoodMaestoso: string[] = ["maestoso"];
    private static listMoodMalinconico: string[] = ["malinconico"];
    private static listMoodMarcato: string[] = ["marcato"];
    private static listMoodMarziale: string[] = ["marziale"];
    private static listMoodMesto: string[] = ["mesto"];
    private static listMoodMorendo: string[] = ["morendo"];
    private static listMoodNobilmente: string[] = ["nobilmente"];
    private static listMoodPatetico: string[] = ["patetico"];
    private static listMoodPesante: string[] = ["pesante"];
    private static listMoodSautille: string[] = ["sautille"];
    private static listMoodSaltando: string[] = ["saltando"];
    private static listMoodScherzando: string[] = ["scherzando"];
    private static listMoodSostenuto: string[] = ["sostenuto"];
    private static listMoodSpiccato: string[] = ["spiccato"];
    private static listMoodTenerezza: string[] = ["tenerezza"];
    private static listMoodTranquillamente: string[] = ["tranquillamente"];
    private static listMoodTrionfante: string[] = ["trionfante"];

    private moodType: MoodEnum;
    private label: string;
    private staffNumber: number;

    public static isInputStringMood(inputString: string): boolean {
        if (inputString === undefined) {
            return false;
        }
        return (
            MoodExpression.isStringInStringList(MoodExpression.listMoodAffettuoso, inputString)
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
            || MoodExpression.isStringInStringList(MoodExpression.listMoodTrionfante, inputString)
        );
    }

    public get Label(): string {
        return this.label;
    }
    public set Label(value: string) {
        this.label = value;
    }
    public get Mood(): MoodEnum {
        return this.moodType;
    }
    public set Mood(value: MoodEnum) {
        this.moodType = value;
    }
    public get StaffNumber(): number {
        return this.staffNumber;
    }
    public set StaffNumber(value: number) {
        this.staffNumber = value;
    }
    public get Placement(): PlacementEnum {
        return this.placement;
    }
    public set Placement(value: PlacementEnum) {
        this.placement = value;
    }

    private setMoodType(): void {
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodAffettuoso, this.label)) {
            this.moodType = MoodEnum.Affettuoso;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodAgitato, this.label)) {
            this.moodType = MoodEnum.Agitato;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodAnimato, this.label)) {
            this.moodType = MoodEnum.Animato;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodAppassionato, this.label)) {
            this.moodType = MoodEnum.Appassionato;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodBrillante, this.label)) {
            this.moodType = MoodEnum.Brillante;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodCantabile, this.label)) {
            this.moodType = MoodEnum.Cantabile;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodDolce, this.label)) {
            this.moodType = MoodEnum.Dolce;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodEnergico, this.label)) {
            this.moodType = MoodEnum.Energico;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodEroico, this.label)) {
            this.moodType = MoodEnum.Eroico;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodEspressivo, this.label)) {
            this.moodType = MoodEnum.Espressivo;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodFurioso, this.label)) {
            this.moodType = MoodEnum.Furioso;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodGiocoso, this.label)) {
            this.moodType = MoodEnum.Giocoso;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodGioioso, this.label)) {
            this.moodType = MoodEnum.Gioioso;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodGrandioso, this.label)) {
            this.moodType = MoodEnum.Grandioso;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodGrazioso, this.label)) {
            this.moodType = MoodEnum.Grazioso;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodLacrimoso, this.label)) {
            this.moodType = MoodEnum.Lacrimoso;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodLeggiero, this.label)) {
            this.moodType = MoodEnum.Leggiero;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodMaestoso, this.label)) {
            this.moodType = MoodEnum.Maestoso;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodMalinconico, this.label)) {
            this.moodType = MoodEnum.Malinconico;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodMarcato, this.label)) {
            this.moodType = MoodEnum.Marcato;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodMarziale, this.label)) {
            this.moodType = MoodEnum.Marziale;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodMesto, this.label)) {
            this.moodType = MoodEnum.Mesto;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodMorendo, this.label)) {
            this.moodType = MoodEnum.Morendo;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodNobilmente, this.label)) {
            this.moodType = MoodEnum.Nobilmente;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodPatetico, this.label)) {
            this.moodType = MoodEnum.Patetico;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodPesante, this.label)) {
            this.moodType = MoodEnum.Pesante;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodSaltando, this.label)) {
            this.moodType = MoodEnum.Saltando;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodSautille, this.label)) {
            this.moodType = MoodEnum.Sautille;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodScherzando, this.label)) {
            this.moodType = MoodEnum.Scherzando;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodSostenuto, this.label)) {
            this.moodType = MoodEnum.Sostenuto;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodSpiccato, this.label)) {
            this.moodType = MoodEnum.Spiccato;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodTenerezza, this.label)) {
            this.moodType = MoodEnum.Tenerezza;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodTranquillamente, this.label)) {
            this.moodType = MoodEnum.Tranquillamente;
        } else if (MoodExpression.isStringInStringList(MoodExpression.listMoodTrionfante, this.label)) {
            this.moodType = MoodEnum.Trionfante;
        }
    }
}

export enum MoodEnum {
    Affettuoso = 0,
    Agitato = 1,
    Appassionato = 2,
    Animato = 3,
    Brillante = 4,
    Cantabile = 5,
    Dolce = 6,
    Energico = 7,
    Eroico = 8,
    Espressivo = 9,
    Furioso = 10,
    Giocoso = 11,
    Gioioso = 12,
    Lacrimoso = 13,
    Grandioso = 14,
    Grazioso = 15,
    Leggiero = 16,
    Maestoso = 17,
    Malinconico = 18,
    Marcato = 19,
    Marziale = 20,
    Mesto = 21,
    Morendo = 22,
    Nobilmente = 23,
    Patetico = 24,
    Pesante = 25,
    Sautille = 26,
    Saltando = 27,
    Scherzando = 28,
    Sostenuto = 29,
    Spiccato = 30,
    Tenerezza = 31,
    Tranquillamente = 32,
    Trionfante = 33,
    Vivace = 34
}
