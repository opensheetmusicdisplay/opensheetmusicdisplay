import {GraphicalObject} from "./GraphicalObject";
import {OctaveShift, OctaveEnum} from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import {BoundingBox} from "./BoundingBox";
import {MusicSymbol} from "./MusicSymbol";
import {ArgumentOutOfRangeException} from "../Exceptions";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import { GraphicalMeasure } from "./GraphicalMeasure";

/**
 * The graphical counterpart of an [[OctaveShift]]
 */
export class GraphicalOctaveShift extends GraphicalObject {

    constructor(octaveShift: OctaveShift, parent: BoundingBox) {
        super();
        this.getOctaveShift = octaveShift;
        this.setSymbol();
        // ToDo: set the size again due to the given symbol...
        //this.PositionAndShape = new BoundingBox(parent, this.octaveSymbol, this);
        this.PositionAndShape = new BoundingBox(this, parent);
    }

    public getOctaveShift: OctaveShift;
    public octaveSymbol: MusicSymbol;
    public dashesStart: PointF2D;
    public dashesEnd: PointF2D;
    public endsOnDifferentStaffLine: boolean;
    /** Whether the octave shift should be drawn until the end of the measure, instead of the current note. */
    public graphicalEndAtMeasureEnd: boolean;
    /** The measure in which this OctaveShift (which can be a part/bracket of a multi-line shift) ends graphically. */
    public endMeasure: GraphicalMeasure;
    public isFirstPart: boolean;
    public isSecondPart: boolean;

    private setSymbol(): void {
        switch (this.getOctaveShift.Type) {
            case OctaveEnum.VA8:
                this.octaveSymbol = MusicSymbol.VA8;
                break;
            case OctaveEnum.VB8:
                this.octaveSymbol = MusicSymbol.VB8;
                break;
            case OctaveEnum.MA15:
                this.octaveSymbol = MusicSymbol.MA15;
                break;
            case OctaveEnum.MB15:
                this.octaveSymbol = MusicSymbol.MB15;
                break;
            default:
                throw new ArgumentOutOfRangeException("");
        }
    }

}
