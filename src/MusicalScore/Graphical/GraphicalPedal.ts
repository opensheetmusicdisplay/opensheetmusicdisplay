import {GraphicalObject} from "./GraphicalObject";
import {BoundingBox} from "./BoundingBox";
import {MusicSymbol} from "./MusicSymbol";
import { Pedal } from "../VoiceData/Expressions/ContinuousExpressions/Pedal";

/**
 * The graphical counterpart of an [[Pedal]]
 */
export class GraphicalPedal extends GraphicalObject {

    constructor(pedal: Pedal, parent: BoundingBox) {
        super();
        this.getPedal = pedal;
        this.setSymbol();
        this.PositionAndShape = new BoundingBox(this, parent);
    }

    public getPedal: Pedal;
    public pedalSymbol: MusicSymbol;

    private setSymbol(): void {
        if (!this.getPedal.IsLine && this.getPedal.IsSign) {
            this.pedalSymbol = MusicSymbol.PEDAL_SYMBOL;
        } else if (this.getPedal.IsLine && this.getPedal.IsSign){
            this.pedalSymbol = MusicSymbol.PEDAL_MIXED;
        } else {//Bracket is default
            this.pedalSymbol = MusicSymbol.PEDAL_BRACKET;
        }
    }
}
