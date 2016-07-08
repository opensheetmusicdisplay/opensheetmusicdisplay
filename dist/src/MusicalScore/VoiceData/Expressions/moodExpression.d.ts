import { PlacementEnum, AbstractExpression } from "./abstractExpression";
export declare class MoodExpression extends AbstractExpression {
    constructor(label: string, placement: PlacementEnum, staffNumber: number);
    private static listMoodAffettuoso;
    private static listMoodAgitato;
    private static listMoodAppassionato;
    private static listMoodAnimato;
    private static listMoodBrillante;
    private static listMoodCantabile;
    private static listMoodDolce;
    private static listMoodEnergico;
    private static listMoodEroico;
    private static listMoodEspressivo;
    private static listMoodFurioso;
    private static listMoodGiocoso;
    private static listMoodGioioso;
    private static listMoodLacrimoso;
    private static listMoodGrandioso;
    private static listMoodGrazioso;
    private static listMoodLeggiero;
    private static listMoodMaestoso;
    private static listMoodMalinconico;
    private static listMoodMarcato;
    private static listMoodMarziale;
    private static listMoodMesto;
    private static listMoodMorendo;
    private static listMoodNobilmente;
    private static listMoodPatetico;
    private static listMoodPesante;
    private static listMoodSautille;
    private static listMoodSaltando;
    private static listMoodScherzando;
    private static listMoodSostenuto;
    private static listMoodSpiccato;
    private static listMoodTenerezza;
    private static listMoodTranquillamente;
    private static listMoodTrionfante;
    private moodType;
    private label;
    private staffNumber;
    private placement;
    static isInputStringMood(inputString: string): boolean;
    Label: string;
    Mood: MoodEnum;
    StaffNumber: number;
    Placement: PlacementEnum;
    private setMoodType();
}
export declare enum MoodEnum {
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
    Vivace = 34,
}
