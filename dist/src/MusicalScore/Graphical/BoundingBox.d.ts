import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { SizeF2D } from "../../Common/DataObjects/SizeF2D";
import { RectangleF2D } from "../../Common/DataObjects/RectangleF2D";
export declare class BoundingBox {
    protected isSymbol: boolean;
    protected relativePositionHasBeenSet: boolean;
    protected xBordersHaveBeenSet: boolean;
    protected yBordersHaveBeenSet: boolean;
    protected absolutePosition: PointF2D;
    protected relativePosition: PointF2D;
    protected size: SizeF2D;
    protected marginSize: SizeF2D;
    protected upperLeftCorner: PointF2D;
    protected upperLeftMarginCorner: PointF2D;
    protected borderLeft: number;
    protected borderRight: number;
    protected borderTop: number;
    protected borderBottom: number;
    protected borderMarginLeft: number;
    protected borderMarginRight: number;
    protected borderMarginTop: number;
    protected borderMarginBottom: number;
    protected boundingRectangle: RectangleF2D;
    protected boundingMarginRectangle: RectangleF2D;
    protected childElements: BoundingBox[];
    protected parent: BoundingBox;
    protected dataObject: Object;
    constructor(dataObject?: Object, parent?: BoundingBox);
    RelativePositionHasBeenSet: boolean;
    XBordersHaveBeenSet: boolean;
    YBordersHaveBeenSet: boolean;
    AbsolutePosition: PointF2D;
    RelativePosition: PointF2D;
    Size: SizeF2D;
    MarginSize: SizeF2D;
    UpperLeftCorner: PointF2D;
    UpperLeftMarginCorner: PointF2D;
    BorderLeft: number;
    BorderRight: number;
    BorderTop: number;
    BorderBottom: number;
    BorderMarginLeft: number;
    BorderMarginRight: number;
    BorderMarginTop: number;
    BorderMarginBottom: number;
    BoundingRectangle: RectangleF2D;
    BoundingMarginRectangle: RectangleF2D;
    ChildElements: BoundingBox[];
    Parent: BoundingBox;
    DataObject: Object;
    setAbsolutePositionFromParent(): void;
    calculateAbsolutePositionsRecursiveWithoutTopelement(): void;
    calculateAbsolutePositionsRecursive(x: number, y: number): void;
    calculateBoundingBox(): void;
    calculateTopBottomBorders(): void;
    computeNonOverlappingPositionWithMargin(placementPsi: BoundingBox, direction: ColDirEnum, position: PointF2D): void;
    collisionDetection(psi: BoundingBox): boolean;
    liesInsideBorders(psi: BoundingBox): boolean;
    pointLiesInsideBorders(position: PointF2D): boolean;
    marginCollisionDetection(psi: BoundingBox): boolean;
    liesInsideMargins(psi: BoundingBox): boolean;
    pointLiesInsideMargins(position: PointF2D): boolean;
    computeNonOverlappingPosition(placementPsi: BoundingBox, direction: ColDirEnum, position: PointF2D): void;
    getClickedObjectOfType<T>(clickPosition: PointF2D): T;
    getObjectsInRegion<T>(region: BoundingBox, liesInside?: boolean): T[];
    protected calculateRectangle(): void;
    protected calculateMarginRectangle(): void;
    private calculateMarginPositionAlongDirection(toBePlaced, direction);
    private calculatePositionAlongDirection(toBePlaced, direction);
}
export declare enum ColDirEnum {
    Left = 0,
    Right = 1,
    Up = 2,
    Down = 3,
}
