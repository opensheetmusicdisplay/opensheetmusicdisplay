import { Note } from "./Note";
import * as log from "loglevel";

/**
 * A note head with shape and fill information belonging to a [[Note]].
 */
export class NoteHead {
    /**
     * @param sourceNote
     * @param shapeTypeXml The shape type given from XML.
     *                     See https://usermanuals.musicxml.com/MusicXML/Content/ST-MusicXML-notehead-value.htm
     * @param filledXml The XML flag to fill the note shape. Can be undefined if not included in XML.
     *                  If undefined, the filled parameter will be calculated by note duration (d < half note => filled)
     */
    constructor(sourceNote: Note, shapeTypeXml: string, filledXml: boolean = undefined) {
        this.sourceNote = sourceNote;
        this.setShapeFromXml(shapeTypeXml, filledXml);
    }

    /** shape of the note head (normal, square, triangle, etc.) */
    private shape: NoteHeadShape;
    private filled: boolean;
    /** the [[Note]] this NoteHead belongs to. */
    private sourceNote: Note;

    /** Sets the note head's shape from XML parameters.
     * @param shapeTypeXml The XML shape.
     * @param filledXmlAttribute the filled parameter as given in XML.
     *                           Can be undefined if not given in XML or if it should be calculated from note duration.
     *                           If undefined, this.sourceNote should not be undefined.
     */
    public setShapeFromXml(shapeTypeXml: string, filledXmlAttribute: boolean = undefined): void {
        this.shape = NoteHead.ShapeTypeXmlToShape(shapeTypeXml);

        let filled: boolean = filledXmlAttribute;
        if (filled === undefined) {
            if (this.sourceNote === undefined) {
                // this should not happen. Either filledXmlAttribute or sourceNote should be defined.
                log.warn("noteHead: sourceNote and filledXmlAttribute undefined.");
                filled = true;
            } else {
                filled = this.sourceNote.Length.Denominator > 2;
            }
        }
        this.filled = filled;
    }

    public get SourceNote(): Note {
        return this.sourceNote;
    }

    public get Shape(): NoteHeadShape {
        return this.shape;
    }
    public get Filled(): boolean {
        return this.filled;
    }

    /** Converts xml attribute to NoteHeadShape.
     * Necessary because "circle-x" is not a valid enum member name.
     */
    public static ShapeTypeXmlToShape(shapeTypeXml: string): NoteHeadShape {
        switch (shapeTypeXml.toLowerCase()) {
            case "normal":
                return NoteHeadShape.NORMAL;
            case "x":
                return NoteHeadShape.X;
            case "slash":
                return NoteHeadShape.SLASH;
            case "diamond":
                return NoteHeadShape.DIAMOND;
            case "square":
                return NoteHeadShape.SQUARE;
            case "la": // Musescore displays this as a square
                return NoteHeadShape.SQUARE;
            case "do":
            case "triangle":
                return NoteHeadShape.TRIANGLE;
            case "rectangle":
                return NoteHeadShape.RECTANGLE;
            case "circle-x":
                return NoteHeadShape.CIRCLEX;
            default:
                log.info("unsupported/unhandled xml notehead '" + shapeTypeXml + "'. Using normal notehead.");
                return NoteHeadShape.NORMAL;
        }
    }
}

/** shape of a note head, needs to be supported by MusicXML and Vexflow. */
export enum NoteHeadShape {
    CIRCLEX,
    DIAMOND,
    NORMAL,
    RECTANGLE,
    SLASH,
    SQUARE,
    TRIANGLE,
    X,
    // TODO: Add the rest from https://usermanuals.musicxml.com/MusicXML/Content/ST-MusicXML-notehead-value.htm
    // currently all Vexflow supported shapes present
}
