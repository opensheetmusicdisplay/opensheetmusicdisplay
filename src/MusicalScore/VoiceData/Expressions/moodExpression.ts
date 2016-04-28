import {PlacementEnum, AbstractExpression} from "./abstractExpression";
export class MoodExpression extends AbstractExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number) {
        this.label = label;
        this.placement = placement;
        this.staffNumber = staffNumber;
        this.setMoodType();
    }
    private moodType: MoodEnum;
    private label: string;
    private staffNumber: number;
    private placement: PlacementEnum;
    static private listMoodAffettuoso: Array<string> = __init(new Array<string>(), { "affettuoso" });
    static private listMoodAgitato: Array<string> = __init(new Array<string>(), { "agitato" });
    static private listMoodAppassionato: Array<string> = __init(new Array<string>(), { "appassionato" });
    static private listMoodAnimato: Array<string> = __init(new Array<string>(), { "animato","lively" });
    static private listMoodBrillante: Array<string> = __init(new Array<string>(), { "brillante" });
    static private listMoodCantabile: Array<string> = __init(new Array<string>(), { "cantabile" });
    static private listMoodDolce: Array<string> = __init(new Array<string>(), { "dolce" });
    static private listMoodEnergico: Array<string> = __init(new Array<string>(), { "energico" });
    static private listMoodEroico: Array<string> = __init(new Array<string>(), { "eroico" });
    static private listMoodEspressivo: Array<string> = __init(new Array<string>(), { "espressivo" });
    static private listMoodFurioso: Array<string> = __init(new Array<string>(), { "furioso" });
    static private listMoodGiocoso: Array<string> = __init(new Array<string>(), { "giocoso" });
    static private listMoodGioioso: Array<string> = __init(new Array<string>(), { "gioioso" });
    static private listMoodLacrimoso: Array<string> = __init(new Array<string>(), { "lacrimoso" });
    static private listMoodGrandioso: Array<string> = __init(new Array<string>(), { "grandioso" });
    static private listMoodGrazioso: Array<string> = __init(new Array<string>(), { "grazioso" });
    static private listMoodLeggiero: Array<string> = __init(new Array<string>(), { "leggiero" });
    static private listMoodMaestoso: Array<string> = __init(new Array<string>(), { "maestoso" });
    static private listMoodMalinconico: Array<string> = __init(new Array<string>(), { "malinconico" });
    static private listMoodMarcato: Array<string> = __init(new Array<string>(), { "marcato" });
    static private listMoodMarziale: Array<string> = __init(new Array<string>(), { "marziale" });
    static private listMoodMesto: Array<string> = __init(new Array<string>(), { "mesto" });
    static private listMoodMorendo: Array<string> = __init(new Array<string>(), { "morendo" });
    static private listMoodNobilmente: Array<string> = __init(new Array<string>(), { "nobilmente" });
    static private listMoodPatetico: Array<string> = __init(new Array<string>(), { "patetico" });
    static private listMoodPesante: Array<string> = __init(new Array<string>(), { "pesante" });
    static private listMoodSautille: Array<string> = __init(new Array<string>(), { "sautille" });
    static private listMoodSaltando: Array<string> = __init(new Array<string>(), { "saltando" });
    static private listMoodScherzando: Array<string> = __init(new Array<string>(), { "scherzando" });
    static private listMoodSostenuto: Array<string> = __init(new Array<string>(), { "sostenuto" });
    static private listMoodSpiccato: Array<string> = __init(new Array<string>(), { "spiccato" });
    static private listMoodTenerezza: Array<string> = __init(new Array<string>(), { "tenerezza" });
    static private listMoodTranquillamente: Array<string> = __init(new Array<string>(), { "tranquillamente" });
    static private listMoodTrionfante: Array<string> = __init(new Array<string>(), { "trionfante" });
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
        if (isStringInStringList(MoodExpression.listMoodAffettuoso, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodAgitato, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodAnimato, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodAppassionato, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodBrillante, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodCantabile, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodDolce, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodEnergico, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodEroico, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodEspressivo, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodFurioso, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodGiocoso, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodGioioso, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodGrandioso, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodGrazioso, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodLacrimoso, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodLeggiero, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodMaestoso, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodMalinconico, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodMarcato, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodMarziale, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodMesto, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodMorendo, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodNobilmente, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodPatetico, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodPesante, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodSaltando, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodSautille, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodScherzando, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodSostenuto, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodSpiccato, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodTenerezza, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodTranquillamente, inputString))
            return true;
        if (isStringInStringList(MoodExpression.listMoodTrionfante, inputString))
            return true;
        return false;
    }
    private setMoodType(): void {
        if (isStringInStringList(MoodExpression.listMoodAffettuoso, this.label))
            this.moodType = MoodEnum.Affettuoso;
        if (isStringInStringList(MoodExpression.listMoodAgitato, this.label))
            this.moodType = MoodEnum.Agitato;
        if (isStringInStringList(MoodExpression.listMoodAnimato, this.label))
            this.moodType = MoodEnum.Animato;
        if (isStringInStringList(MoodExpression.listMoodAppassionato, this.label))
            this.moodType = MoodEnum.Appassionato;
        if (isStringInStringList(MoodExpression.listMoodBrillante, this.label))
            this.moodType = MoodEnum.Brillante;
        if (isStringInStringList(MoodExpression.listMoodCantabile, this.label))
            this.moodType = MoodEnum.Cantabile;
        if (isStringInStringList(MoodExpression.listMoodDolce, this.label))
            this.moodType = MoodEnum.Dolce;
        if (isStringInStringList(MoodExpression.listMoodEnergico, this.label))
            this.moodType = MoodEnum.Energico;
        if (isStringInStringList(MoodExpression.listMoodEroico, this.label))
            this.moodType = MoodEnum.Eroico;
        if (isStringInStringList(MoodExpression.listMoodEspressivo, this.label))
            this.moodType = MoodEnum.Espressivo;
        if (isStringInStringList(MoodExpression.listMoodFurioso, this.label))
            this.moodType = MoodEnum.Furioso;
        if (isStringInStringList(MoodExpression.listMoodGiocoso, this.label))
            this.moodType = MoodEnum.Giocoso;
        if (isStringInStringList(MoodExpression.listMoodGioioso, this.label))
            this.moodType = MoodEnum.Gioioso;
        if (isStringInStringList(MoodExpression.listMoodGrandioso, this.label))
            this.moodType = MoodEnum.Grandioso;
        if (isStringInStringList(MoodExpression.listMoodGrazioso, this.label))
            this.moodType = MoodEnum.Grazioso;
        if (isStringInStringList(MoodExpression.listMoodLacrimoso, this.label))
            this.moodType = MoodEnum.Lacrimoso;
        if (isStringInStringList(MoodExpression.listMoodLeggiero, this.label))
            this.moodType = MoodEnum.Leggiero;
        if (isStringInStringList(MoodExpression.listMoodMaestoso, this.label))
            this.moodType = MoodEnum.Maestoso;
        if (isStringInStringList(MoodExpression.listMoodMalinconico, this.label))
            this.moodType = MoodEnum.Malinconico;
        if (isStringInStringList(MoodExpression.listMoodMarcato, this.label))
            this.moodType = MoodEnum.Marcato;
        if (isStringInStringList(MoodExpression.listMoodMarziale, this.label))
            this.moodType = MoodEnum.Marziale;
        if (isStringInStringList(MoodExpression.listMoodMesto, this.label))
            this.moodType = MoodEnum.Mesto;
        if (isStringInStringList(MoodExpression.listMoodMorendo, this.label))
            this.moodType = MoodEnum.Morendo;
        if (isStringInStringList(MoodExpression.listMoodNobilmente, this.label))
            this.moodType = MoodEnum.Nobilmente;
        if (isStringInStringList(MoodExpression.listMoodPatetico, this.label))
            this.moodType = MoodEnum.Patetico;
        if (isStringInStringList(MoodExpression.listMoodPesante, this.label))
            this.moodType = MoodEnum.Pesante;
        if (isStringInStringList(MoodExpression.listMoodSaltando, this.label))
            this.moodType = MoodEnum.Saltando;
        if (isStringInStringList(MoodExpression.listMoodSautille, this.label))
            this.moodType = MoodEnum.Sautille;
        if (isStringInStringList(MoodExpression.listMoodScherzando, this.label))
            this.moodType = MoodEnum.Scherzando;
        if (isStringInStringList(MoodExpression.listMoodSostenuto, this.label))
            this.moodType = MoodEnum.Sostenuto;
        if (isStringInStringList(MoodExpression.listMoodSpiccato, this.label))
            this.moodType = MoodEnum.Spiccato;
        if (isStringInStringList(MoodExpression.listMoodTenerezza, this.label))
            this.moodType = MoodEnum.Tenerezza;
        if (isStringInStringList(MoodExpression.listMoodTranquillamente, this.label))
            this.moodType = MoodEnum.Tranquillamente;
        if (isStringInStringList(MoodExpression.listMoodTrionfante, this.label))
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