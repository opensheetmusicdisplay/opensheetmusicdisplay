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
        if (inputString === MoodExpression.listMoodAffettuoso[0])
            return true;
        if (inputString === MoodExpression.listMoodAgitato[0])
            return true;
        if (inputString === MoodExpression.listMoodAnimato[0] || inputString === MoodExpression.listMoodAnimato[1])
            return true;
        if (inputString === MoodExpression.listMoodAppassionato[0])
            return true;
        if (inputString === MoodExpression.listMoodBrillante[0])
            return true;
        if (inputString === MoodExpression.listMoodCantabile[0])
            return true;
        if (inputString === MoodExpression.listMoodDolce[0])
            return true;
        if (inputString === MoodExpression.listMoodEnergico[0])
            return true;
        if (inputString === MoodExpression.listMoodEroico[0])
            return true;
        if (inputString === MoodExpression.listMoodEspressivo[0])
            return true;
        if (inputString === MoodExpression.listMoodFurioso[0])
            return true;
        if (inputString === MoodExpression.listMoodGiocoso[0])
            return true;
        if (inputString === MoodExpression.listMoodGioioso[0])
            return true;
        if (inputString === MoodExpression.listMoodGrandioso[0])
            return true;
        if (inputString === MoodExpression.listMoodGrazioso[0])
            return true;
        if (inputString === MoodExpression.listMoodLacrimoso[0])
            return true;
        if (inputString === MoodExpression.listMoodLeggiero[0])
            return true;
        if (inputString === MoodExpression.listMoodMaestoso[0])
            return true;
        if (inputString === MoodExpression.listMoodMalinconico[0])
            return true;
        if (inputString === MoodExpression.listMoodMarcato[0])
            return true;
        if (inputString === MoodExpression.listMoodMarziale[0])
            return true;
        if (inputString === MoodExpression.listMoodMesto[0])
            return true;
        if (inputString === MoodExpression.listMoodMorendo[0])
            return true;
        if (inputString === MoodExpression.listMoodNobilmente[0])
            return true;
        if (inputString === MoodExpression.listMoodPatetico[0])
            return true;
        if (inputString === MoodExpression.listMoodPesante[0])
            return true;
        if (inputString === MoodExpression.listMoodSaltando[0])
            return true;
        if (inputString === MoodExpression.listMoodSautille[0])
            return true;
        if (inputString === MoodExpression.listMoodScherzando[0])
            return true;
        if (inputString === MoodExpression.listMoodSostenuto[0])
            return true;
        if (inputString === MoodExpression.listMoodSpiccato[0])
            return true;
        if (inputString === MoodExpression.listMoodTenerezza[0])
            return true;
        if (inputString === MoodExpression.listMoodTranquillamente[0])
            return true;
        if (inputString === MoodExpression.listMoodTrionfante[0])
            return true;
        return false;
    }
    private setMoodType(): void {
        if (this.label === MoodExpression.listMoodAffettuoso[0])
            this.moodType = MoodEnum.Affettuoso;
        if (this.label === MoodExpression.listMoodAgitato[0])
            this.moodType = MoodEnum.Agitato;
        if (this.label === MoodExpression.listMoodAnimato[0] || this.label === MoodExpression.listMoodAnimato[1])
            this.moodType = MoodEnum.Animato;
        if (this.label === MoodExpression.listMoodAppassionato[0])
            this.moodType = MoodEnum.Appassionato;
        if (this.label === MoodExpression.listMoodBrillante[0])
            this.moodType = MoodEnum.Brillante;
        if (this.label === MoodExpression.listMoodCantabile[0])
            this.moodType = MoodEnum.Cantabile;
        if (this.label === MoodExpression.listMoodDolce[0])
            this.moodType = MoodEnum.Dolce;
        if (this.label === MoodExpression.listMoodEnergico[0])
            this.moodType = MoodEnum.Energico;
        if (this.label === MoodExpression.listMoodEroico[0])
            this.moodType = MoodEnum.Eroico;
        if (this.label === MoodExpression.listMoodEspressivo[0])
            this.moodType = MoodEnum.Espressivo;
        if (this.label === MoodExpression.listMoodFurioso[0])
            this.moodType = MoodEnum.Furioso;
        if (this.label === MoodExpression.listMoodGiocoso[0])
            this.moodType = MoodEnum.Giocoso;
        if (this.label === MoodExpression.listMoodGioioso[0])
            this.moodType = MoodEnum.Gioioso;
        if (this.label === MoodExpression.listMoodGrandioso[0])
            this.moodType = MoodEnum.Grandioso;
        if (this.label === MoodExpression.listMoodGrazioso[0])
            this.moodType = MoodEnum.Grazioso;
        if (this.label === MoodExpression.listMoodLacrimoso[0])
            this.moodType = MoodEnum.Lacrimoso;
        if (this.label === MoodExpression.listMoodLeggiero[0])
            this.moodType = MoodEnum.Leggiero;
        if (this.label === MoodExpression.listMoodMaestoso[0])
            this.moodType = MoodEnum.Maestoso;
        if (this.label === MoodExpression.listMoodMalinconico[0])
            this.moodType = MoodEnum.Malinconico;
        if (this.label === MoodExpression.listMoodMarcato[0])
            this.moodType = MoodEnum.Marcato;
        if (this.label === MoodExpression.listMoodMarziale[0])
            this.moodType = MoodEnum.Marziale;
        if (this.label === MoodExpression.listMoodMesto[0])
            this.moodType = MoodEnum.Mesto;
        if (this.label === MoodExpression.listMoodMorendo[0])
            this.moodType = MoodEnum.Morendo;
        if (this.label === MoodExpression.listMoodNobilmente[0])
            this.moodType = MoodEnum.Nobilmente;
        if (this.label === MoodExpression.listMoodPatetico[0])
            this.moodType = MoodEnum.Patetico;
        if (this.label === MoodExpression.listMoodPesante[0])
            this.moodType = MoodEnum.Pesante;
        if (this.label === MoodExpression.listMoodSaltando[0])
            this.moodType = MoodEnum.Saltando;
        if (this.label === MoodExpression.listMoodSautille[0])
            this.moodType = MoodEnum.Sautille;
        if (this.label === MoodExpression.listMoodScherzando[0])
            this.moodType = MoodEnum.Scherzando;
        if (this.label === MoodExpression.listMoodSostenuto[0])
            this.moodType = MoodEnum.Sostenuto;
        if (this.label === MoodExpression.listMoodSpiccato[0])
            this.moodType = MoodEnum.Spiccato;
        if (this.label === MoodExpression.listMoodTenerezza[0])
            this.moodType = MoodEnum.Tenerezza;
        if (this.label === MoodExpression.listMoodTranquillamente[0])
            this.moodType = MoodEnum.Tranquillamente;
        if (this.label === MoodExpression.listMoodTrionfante[0])
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
