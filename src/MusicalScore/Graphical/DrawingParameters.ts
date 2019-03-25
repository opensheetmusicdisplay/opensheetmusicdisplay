import { EngravingRules } from "./EngravingRules";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";

export enum ColoringModes {
    XML = 0,
    AutoColoring = 1,
    CustomColorSet = 2
}

export enum DrawingParametersEnum {
    allon = "allon",
    compact = "compact",
    default = "default",
    leadsheet = "leadsheet",
    preview = "preview",
    thumbnail = "thumbnail",
}

/** Internal drawing/rendering parameters and broad modes like compact and thumbnail. Overlap with EngravingRules. */
export class DrawingParameters {
    /** will set other settings if changed with set method */
    private drawingParametersEnum: DrawingParametersEnum;
    public drawHighlights: boolean;
    public drawErrors: boolean;
    public drawSelectionStartSymbol: boolean;
    public drawSelectionEndSymbol: boolean;
    public drawCursors: boolean;
    public drawActivitySymbols: boolean;
    public drawScrollIndicator: boolean;
    public drawComments: boolean;
    public drawMarkedAreas: boolean;
    public drawTitle: boolean = true;
    public drawSubtitle: boolean = true;
    public drawLyricist: boolean = true;
    public drawComposer: boolean = true;
    public drawCredits: boolean = true;
    public drawPartNames: boolean = true;
    public coloringMode: ColoringModes;
    public fingeringPosition: PlacementEnum = PlacementEnum.Left;
    /** Draw notes set to be invisible (print-object="no" in XML). */
    public drawHiddenNotes: boolean = false;

    constructor(drawingParameters: DrawingParametersEnum = DrawingParametersEnum.default) {
        this.DrawingParametersEnum = drawingParameters;
    }

    /** Sets drawing parameters enum and changes settings flags accordingly. */
    public set DrawingParametersEnum(drawingParametersEnum: DrawingParametersEnum) {
        this.drawingParametersEnum = drawingParametersEnum;
        switch (drawingParametersEnum) {
            case DrawingParametersEnum.allon:
                this.setForAllOn();
                break;
            case DrawingParametersEnum.thumbnail:
                this.setForThumbnail();
                break;
            case DrawingParametersEnum.leadsheet:
                this.setForLeadsheet();
                break;
            case DrawingParametersEnum.compact:
                this.setForCompactMode();
                break;
            case DrawingParametersEnum.default:
            default:
                this.setForDefault();
        }
    }

    public get DrawingParametersEnum(): DrawingParametersEnum {
        return this.drawingParametersEnum;
    }

    public setForAllOn(): void {
        this.drawHighlights = true;
        this.drawErrors = true;
        this.drawSelectionStartSymbol = true;
        this.drawSelectionEndSymbol = true;
        this.drawCursors = true;
        this.drawActivitySymbols = true;
        this.drawScrollIndicator = true;
        this.drawComments = true;
        this.drawMarkedAreas = true;
        this.DrawTitle = true;
        this.DrawSubtitle = true;
        this.DrawComposer = true;
        this.DrawLyricist = true;
        this.drawCredits = true;
        this.DrawPartNames = true;
        this.drawHiddenNotes = true;
        EngravingRules.Rules.CompactMode = false;
    }

    public setForDefault(): void {
        this.setForAllOn();
        this.drawHiddenNotes = false;
    }

    public setForThumbnail(): void {
        this.drawHighlights = false;
        this.drawErrors = false;
        this.drawSelectionStartSymbol = false;
        this.drawSelectionStartSymbol = false;
        this.drawCursors = false;
        this.drawActivitySymbols = false;
        this.drawScrollIndicator = false;
        this.drawComments = true;
        this.drawMarkedAreas = true;
        this.drawHiddenNotes = false;
    }

    public setForCompactMode(): void {
        this.setForDefault();
        EngravingRules.Rules.CompactMode = true;
        this.DrawCredits = false; // sets DrawComposer, DrawTitle, DrawLyricist to false
        // this.DrawPartNames = true; // unnecessary
        this.drawHiddenNotes = false;
    }

    public setForLeadsheet(): void {
        this.drawHighlights = false;
        this.drawErrors = false;
        this.drawSelectionStartSymbol = true;
        this.drawSelectionEndSymbol = true;
        this.drawCursors = true;
        this.drawActivitySymbols = false;
        this.drawScrollIndicator = true;
        this.drawComments = true;
        this.drawMarkedAreas = true;
    }

    //#region GETTER / SETTER
    public get DrawCredits(): boolean {
        return this.drawCredits;
    }

    public set DrawCredits(value: boolean) {
        this.drawCredits = value;
        this.DrawComposer = value;
        this.DrawTitle = value;
        this.DrawSubtitle = value;
        this.DrawLyricist = value;
    }
    // TODO these drawCredits settings are duplicate in drawingParameters and EngravingRules. Maybe we only need them in EngravingRules.
    // this sets the parameter in DrawingParameters, which in turn sets the parameter in EngravingRules.
    // see settings below that don't call drawingParameters for the immediate approach.
    // on the other hand, DrawingParameters has the added option of setting broad modes (e.g. compact), though they aren't that useful

    public get DrawTitle(): boolean {
        return this.drawTitle;
    }

    /** Enable or disable drawing the Title of the piece. If disabled, will disable drawing Subtitle as well. */
    public set DrawTitle(value: boolean) {
        this.drawTitle = value;
        EngravingRules.Rules.RenderTitle = value;
        if (!value) { // don't draw subtitle if title isn't drawn
            this.DrawSubtitle = false;
        }
    }

    public get DrawSubtitle(): boolean {
        return this.drawSubtitle;
    }

    /** Enable or disable drawing the Subtitle of the piece. If enabled, will enable drawing Title as well. */
    public set DrawSubtitle(value: boolean) {
        this.drawSubtitle = value;
        EngravingRules.Rules.RenderSubtitle = value;
        if (value) {
            this.DrawTitle = true; // if subtitle is drawn, title needs to be drawn as well
        }
    }

    public get DrawComposer(): boolean {
        return this.drawComposer;
    }

    /** Enable or disable drawing a label for the Composer of the piece. */
    public set DrawComposer(value: boolean) {
        this.drawComposer = value;
        EngravingRules.Rules.RenderComposer = value;
    }

    public get DrawLyricist(): boolean {
        return this.drawLyricist;
    }

    public set DrawLyricist(value: boolean) {
        this.drawLyricist = value;
        EngravingRules.Rules.RenderLyricist = value;
    }

    public get DrawPartNames(): boolean {
        return this.drawPartNames;
    }

    public set DrawPartNames(value: boolean) {
        this.drawPartNames = value;
        EngravingRules.Rules.RenderPartNames = value;
    }

    public get FingeringPosition(): PlacementEnum {
        return this.fingeringPosition;
    }

    public set FingeringPosition(value: PlacementEnum) {
        this.fingeringPosition = value;
        EngravingRules.Rules.FingeringPosition = value;
    }
}
