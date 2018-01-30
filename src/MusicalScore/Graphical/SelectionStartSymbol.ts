import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {StaffLine} from "./StaffLine";
import {OutlineAndFillStyleEnum} from "./DrawingEnums";
import {GraphicalLine} from "./GraphicalLine";
import {MusicSystem} from "./MusicSystem";
import {GraphicalObject} from "./GraphicalObject";
import {BoundingBox} from "./BoundingBox";
import {CollectionUtil} from "../../Util/CollectionUtil";

export class SelectionStartSymbol extends GraphicalObject {

    constructor(system: MusicSystem, xPosition: number) {
        super();
        const xCoordinate: number = xPosition;
        const yCoordinate: number = system.PositionAndShape.AbsolutePosition.y;
        const lineThickness: number = 0.4;
        const height: number = CollectionUtil.last(system.StaffLines).PositionAndShape.RelativePosition.y + 4;
        this.verticalLine = new GraphicalLine(
            new PointF2D(xCoordinate, yCoordinate),
            new PointF2D(xCoordinate, yCoordinate + height),
            lineThickness,
            OutlineAndFillStyleEnum.SelectionSymbol
        );
        for (let idx: number = 0, len: number = system.StaffLines.length; idx < len; ++idx) {
            const staffLine: StaffLine = system.StaffLines[idx];
            const anchor: PointF2D = new PointF2D(xCoordinate, yCoordinate + staffLine.PositionAndShape.RelativePosition.y);
            const arrowPoints: PointF2D[] = new Array(7);
            arrowPoints[0].x = anchor.x + 4;
            arrowPoints[0].y = anchor.y + 2;
            arrowPoints[1].x = anchor.x + 2.5;
            arrowPoints[1].y = anchor.y + 0.5;
            arrowPoints[2].x = anchor.x + 2.5;
            arrowPoints[2].y = anchor.y + 1.3;
            arrowPoints[3].x = anchor.x + 1;
            arrowPoints[3].y = anchor.y + 1.3;
            arrowPoints[4].x = anchor.x + 1;
            arrowPoints[4].y = anchor.y + 2.7;
            arrowPoints[5].x = anchor.x + 2.5;
            arrowPoints[5].y = anchor.y + 2.7;
            arrowPoints[6].x = anchor.x + 2.5;
            arrowPoints[6].y = anchor.y + 3.5;
            this.arrows.push(arrowPoints);
        }
        this.boundingBox = new BoundingBox(this);
        this.boundingBox.AbsolutePosition = new PointF2D(xCoordinate, yCoordinate);
        this.boundingBox.BorderLeft = -lineThickness;
        this.boundingBox.BorderRight = 4;
        this.boundingBox.BorderBottom = height;
    }

    public verticalLine: GraphicalLine;
    public arrows: PointF2D[][];
}
