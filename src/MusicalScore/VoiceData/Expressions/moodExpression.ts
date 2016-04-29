import {PlacementEnum, AbstractExpression} from "./abstractExpression";

export class MoodExpression extends AbstractExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number) {
        super();
        this.label = label;
        this.placement = placement;
        this.staffNumber = staffNumber;
        this.setMoodType();
    }
    
    private moodType: MoodEnum;
    private label: string;
    private staffNumber: number;
    private placement: PlacementEnum;
    private static listMoodAffettuoso: string[] = ["affettuoso"];
    private static listMoodAgitato: string[] = ["agitato"];
    private static listMoodAppassionato: string[] = ["appassionato"];
    private static listMoodAnimato: string[] = ["animato","lively"];
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

    public static isInputStringMood(inputString: string): boolean {
        if (inputString == null)
            return false;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodAffettuoso, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodAgitato, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodAnimato, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodAppassionato, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodBrillante, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodCantabile, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodDolce, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodEnergico, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodEroico, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodEspressivo, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodFurioso, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodGiocoso, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodGioioso, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodGrandioso, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodGrazioso, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodLacrimoso, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodLeggiero, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodMaestoso, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodMalinconico, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodMarcato, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodMarziale, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodMesto, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodMorendo, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodNobilmente, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodPatetico, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodPesante, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodSaltando, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodSautille, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodScherzando, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodSostenuto, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodSpiccato, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodTenerezza, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodTranquillamente, inputString))
            return true;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodTrionfante, inputString))
            return true;
        return false;
    }
    private setMoodType(): void {
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodAffettuoso, this.label))
            this.moodType = MoodEnum.Affettuoso;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodAgitato, this.label))
            this.moodType = MoodEnum.Agitato;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodAnimato, this.label))
            this.moodType = MoodEnum.Animato;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodAppassionato, this.label))
            this.moodType = MoodEnum.Appassionato;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodBrillante, this.label))
            this.moodType = MoodEnum.Brillante;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodCantabile, this.label))
            this.moodType = MoodEnum.Cantabile;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodDolce, this.label))
            this.moodType = MoodEnum.Dolce;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodEnergico, this.label))
            this.moodType = MoodEnum.Energico;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodEroico, this.label))
            this.moodType = MoodEnum.Eroico;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodEspressivo, this.label))
            this.moodType = MoodEnum.Espressivo;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodFurioso, this.label))
            this.moodType = MoodEnum.Furioso;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodGiocoso, this.label))
            this.moodType = MoodEnum.Giocoso;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodGioioso, this.label))
            this.moodType = MoodEnum.Gioioso;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodGrandioso, this.label))
            this.moodType = MoodEnum.Grandioso;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodGrazioso, this.label))
            this.moodType = MoodEnum.Grazioso;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodLacrimoso, this.label))
            this.moodType = MoodEnum.Lacrimoso;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodLeggiero, this.label))
            this.moodType = MoodEnum.Leggiero;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodMaestoso, this.label))
            this.moodType = MoodEnum.Maestoso;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodMalinconico, this.label))
            this.moodType = MoodEnum.Malinconico;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodMarcato, this.label))
            this.moodType = MoodEnum.Marcato;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodMarziale, this.label))
            this.moodType = MoodEnum.Marziale;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodMesto, this.label))
            this.moodType = MoodEnum.Mesto;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodMorendo, this.label))
            this.moodType = MoodEnum.Morendo;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodNobilmente, this.label))
            this.moodType = MoodEnum.Nobilmente;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodPatetico, this.label))
            this.moodType = MoodEnum.Patetico;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodPesante, this.label))
            this.moodType = MoodEnum.Pesante;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodSaltando, this.label))
            this.moodType = MoodEnum.Saltando;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodSautille, this.label))
            this.moodType = MoodEnum.Sautille;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodScherzando, this.label))
            this.moodType = MoodEnum.Scherzando;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodSostenuto, this.label))
            this.moodType = MoodEnum.Sostenuto;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodSpiccato, this.label))
            this.moodType = MoodEnum.Spiccato;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodTenerezza, this.label))
            this.moodType = MoodEnum.Tenerezza;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodTranquillamente, this.label))
            this.moodType = MoodEnum.Tranquillamente;
        if (MoodExpression.isStringInStringList(MoodExpression.listMoodTrionfante, this.label))
            this.moodType = MoodEnum.Trionfante;
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
