import {ArgumentOutOfRangeException} from "../Exceptions";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {SizeF2D} from "../../Common/DataObjects/SizeF2D";
import {RectangleF2D} from "../../Common/DataObjects/RectangleF2D";

export class BoundingBox {
    protected isSymbol: boolean = false;
    protected relativePositionHasBeenSet: boolean;
    protected xBordersHaveBeenSet: boolean;
    protected yBordersHaveBeenSet: boolean;
    protected absolutePosition: PointF2D = new PointF2D();
    protected relativePosition: PointF2D = new PointF2D();
    protected size: SizeF2D = new SizeF2D();
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
    protected childElements: BoundingBox[] = [];
    protected parent: BoundingBox;
    protected dataObject: Object;

    constructor(dataObject: Object) {
        this.dataObject = dataObject;
        this.xBordersHaveBeenSet = false;
        this.yBordersHaveBeenSet = false;
    }

    constructor(parent: BoundingBox, dataObject: Object) {
        this(dataObject);
        this.parent = parent;
    }

    public get RelativePositionHasBeenSet(): boolean {
        return this.relativePositionHasBeenSet;
    }

    public get XBordersHaveBeenSet(): boolean {
        return this.xBordersHaveBeenSet;
    }

    public set XBordersHaveBeenSet(value: boolean) {
        this.xBordersHaveBeenSet = value;
    }

    public get YBordersHaveBeenSet(): boolean {
        return this.yBordersHaveBeenSet;
    }

    public set YBordersHaveBeenSet(value: boolean) {
        this.yBordersHaveBeenSet = value;
    }

    public get AbsolutePosition(): PointF2D {
        return this.absolutePosition;
    }

    public set AbsolutePosition(value: PointF2D) {
        this.absolutePosition = value;
    }

    public get RelativePosition(): PointF2D {
        return this.relativePosition;
    }

    public set RelativePosition(value: PointF2D) {
        this.relativePosition = value;
        this.relativePositionHasBeenSet = true;
    }

    public get Size(): SizeF2D {
        return this.size;
    }

    public set Size(value: SizeF2D) {
        this.size = value;
    }

    public get MarginSize(): SizeF2D {
        return this.marginSize;
    }

    public get UpperLeftCorner(): PointF2D {
        return this.upperLeftCorner;
    }

    public get UpperLeftMarginCorner(): PointF2D {
        return this.upperLeftMarginCorner;
    }

    public get BorderLeft(): number {
        return this.borderLeft;
    }

    public set BorderLeft(value: number) {
        this.borderLeft = value;
        this.calculateRectangle();
    }

    public get BorderRight(): number {
        return this.borderRight;
    }

    public set BorderRight(value: number) {
        this.borderRight = value;
        this.calculateRectangle();
    }

    public get BorderTop(): number {
        return this.borderTop;
    }

    public set BorderTop(value: number) {
        this.borderTop = value;
        this.calculateRectangle();
    }

    public get BorderBottom(): number {
        return this.borderBottom;
    }

    public set BorderBottom(value: number) {
        this.borderBottom = value;
        this.calculateRectangle();
    }

    public get BorderMarginLeft(): number {
        return this.borderMarginLeft;
    }

    public set BorderMarginLeft(value: number) {
        this.borderMarginLeft = value;
        this.calculateMarginRectangle();
    }

    public get BorderMarginRight(): number {
        return this.borderMarginRight;
    }

    public set BorderMarginRight(value: number) {
        this.borderMarginRight = value;
        this.calculateMarginRectangle();
    }

    public get BorderMarginTop(): number {
        return this.borderMarginTop;
    }

    public set BorderMarginTop(value: number) {
        this.borderMarginTop = value;
        this.calculateMarginRectangle();
    }

    public get BorderMarginBottom(): number {
        return this.borderMarginBottom;
    }

    public set BorderMarginBottom(value: number) {
        this.borderMarginBottom = value;
        this.calculateMarginRectangle();
    }

    public get BoundingRectangle(): RectangleF2D {
        return this.boundingRectangle;
    }

    public get BoundingMarginRectangle(): RectangleF2D {
        return this.boundingMarginRectangle;
    }

    public get ChildElements(): BoundingBox[] {
        return this.childElements;
    }

    public set ChildElements(value: BoundingBox[]) {
        this.childElements = value;
    }

    public get Parent(): BoundingBox {
        return this.parent;
    }

    public set Parent(value: BoundingBox) {
        this.parent = value;
    }

    public get DataObject(): Object {
        return this.dataObject;
    }

    public setAbsolutePositionFromParent(): void {
        if (this.parent !== undefined) {
            this.absolutePosition.x = this.parent.AbsolutePosition.x + this.relativePosition.x;
            this.absolutePosition.y = this.parent.AbsolutePosition.y + this.relativePosition.y;
        } else {
            this.absolutePosition = this.relativePosition;
        }
    }

    public calculateAbsolutePositionsRecursiveWithoutTopelement(): void {
        this.absolutePosition.x = 0.0;
        this.absolutePosition.y = 0.0;
        for (let idx: number = 0, len: number = this.ChildElements.length; idx < len; ++idx) {
            let child: BoundingBox = this.ChildElements[idx];
            child.calculateAbsolutePositionsRecursive(this.absolutePosition.x, this.absolutePosition.y);
        }
    }

    public calculateAbsolutePositionsRecursive(x: number, y: number): void {
        this.absolutePosition.x = this.relativePosition.x + x;
        this.absolutePosition.y = this.relativePosition.y + y;
        for (let idx: number = 0, len: number = this.ChildElements.length; idx < len; ++idx) {
            let child: BoundingBox = this.ChildElements[idx];
            child.calculateAbsolutePositionsRecursive(this.absolutePosition.x, this.absolutePosition.y);
        }
    }

    public calculateBoundingBox(): void {
        if (this.childElements.length === 0) {
            return;
        }
        for (let idx: number = 0, len: number = this.ChildElements.length; idx < len; ++idx) {
            let childElement: BoundingBox = this.ChildElements[idx];
            childElement.calculateBoundingBox();
        }
        let minLeft: number = Number.MAX_VALUE;
        let maxRight: number = Number.MIN_VALUE;
        let minTop: number = Number.MAX_VALUE;
        let maxBottom: number = Number.MIN_VALUE;
        let minMarginLeft: number = Number.MAX_VALUE;
        let maxMarginRight: number = Number.MIN_VALUE;
        let minMarginTop: number = Number.MAX_VALUE;
        let maxMarginBottom: number = Number.MIN_VALUE;
        if (this.isSymbol) {
            minLeft = this.borderLeft;
            maxRight = this.borderRight;
            minTop = this.borderTop;
            maxBottom = this.borderBottom;
            minMarginLeft = this.borderMarginLeft;
            maxMarginRight = this.borderMarginRight;
            minMarginTop = this.borderMarginTop;
            maxMarginBottom = this.borderMarginBottom;
        }
        for (let idx: number = 0, len: number = this.ChildElements.length; idx < len; ++idx) {
            let childElement: BoundingBox = this.ChildElements[idx];
            minLeft = Math.min(minLeft, childElement.relativePosition.x + childElement.borderLeft);
            maxRight = Math.max(maxRight, childElement.relativePosition.x + childElement.borderRight);
            minTop = Math.min(minTop, childElement.relativePosition.y + childElement.borderTop);
            maxBottom = Math.max(maxBottom, childElement.relativePosition.y + childElement.borderBottom);
            minMarginLeft = Math.min(minMarginLeft, childElement.relativePosition.x + childElement.borderMarginLeft);
            maxMarginRight = Math.max(maxMarginRight, childElement.relativePosition.x + childElement.borderMarginRight);
            minMarginTop = Math.min(minMarginTop, childElement.relativePosition.y + childElement.borderMarginTop);
            maxMarginBottom = Math.max(maxMarginBottom, childElement.relativePosition.y + childElement.borderMarginBottom);
        }
        this.borderLeft = minLeft;
        this.borderRight = maxRight;
        this.borderTop = minTop;
        this.borderBottom = maxBottom;
        this.borderMarginLeft = minMarginLeft;
        this.borderMarginRight = maxMarginRight;
        this.borderMarginTop = minMarginTop;
        this.borderMarginBottom = maxMarginBottom;
        this.calculateRectangle();
        this.calculateMarginRectangle();
        this.xBordersHaveBeenSet = true;
        this.yBordersHaveBeenSet = true;
    }

    public calculateTopBottomBorders(): void {
        if (this.childElements.length === 0) {
            return;
        }
        for (let idx: number = 0, len: number = this.ChildElements.length; idx < len; ++idx) {
            let childElement: BoundingBox = this.ChildElements[idx];
            childElement.calculateTopBottomBorders();
        }
        let minTop: number = Number.MAX_VALUE;
        let maxBottom: number = Number.MIN_VALUE;
        let minMarginTop: number = Number.MAX_VALUE;
        let maxMarginBottom: number = Number.MIN_VALUE;
        if (this.yBordersHaveBeenSet) {
            minTop = this.borderTop;
            maxBottom = this.borderBottom;
            minMarginTop = this.borderMarginTop;
            maxMarginBottom = this.borderMarginBottom;
        }
        for (let idx: number = 0, len: number = this.ChildElements.length; idx < len; ++idx) {
            let childElement: BoundingBox = this.ChildElements[idx];
            minTop = Math.min(minTop, childElement.relativePosition.y + childElement.borderTop);
            maxBottom = Math.max(maxBottom, childElement.relativePosition.y + childElement.borderBottom);
            minMarginTop = Math.min(minMarginTop, childElement.relativePosition.y + childElement.borderMarginTop);
            maxMarginBottom = Math.max(maxMarginBottom, childElement.relativePosition.y + childElement.borderMarginBottom);
        }
        this.borderTop = minTop;
        this.borderBottom = maxBottom;
        this.borderMarginTop = minMarginTop;
        this.borderMarginBottom = maxMarginBottom;
        this.calculateRectangle();
        this.calculateMarginRectangle();
    }

    public computeNonOverlappingPositionWithMargin(placementPsi: BoundingBox, direction: ColDirEnum): void {
        this.computeNonOverlappingPositionWithMargin(placementPsi, direction, new PointF2D(0.0, 0.0));
    }

    public computeNonOverlappingPositionWithMargin(placementPsi: BoundingBox, direction: ColDirEnum, position: PointF2D): void {
        this.RelativePosition = new PointF2D(position.x, position.y);
        this.setAbsolutePositionFromParent();
        let currentPosition: number = 0.0;
        let hasBeenMoved: boolean = false;
        do {
            switch (direction) {
                case ColDirEnum.Left:
                case ColDirEnum.Right:
                    currentPosition = this.relativePosition.x;
                    placementPsi.calculateMarginPositionAlongDirection(this, direction);
                    hasBeenMoved = Math.abs(currentPosition - this.relativePosition.x) > 0.001;
                    break;
                case ColDirEnum.Up:
                case ColDirEnum.Down:
                    currentPosition = this.relativePosition.y;
                    placementPsi.calculateMarginPositionAlongDirection(this, direction);
                    hasBeenMoved = Math.abs(currentPosition - this.relativePosition.y) > 0.001;
                    break;
                default:
                    throw new ArgumentOutOfRangeException("direction");
            }
        }
        while (hasBeenMoved);
    }

    public collisionDetection(psi: BoundingBox): boolean {
        let overlapWidth: number = Math.min(this.AbsolutePosition.x + this.borderRight, psi.absolutePosition.x + psi.borderRight)
            - Math.max(this.AbsolutePosition.x + this.borderLeft, psi.absolutePosition.x + psi.borderLeft);
        let overlapHeight: number = Math.min(this.AbsolutePosition.y + this.borderBottom, psi.absolutePosition.y + psi.borderBottom)
            - Math.max(this.AbsolutePosition.y + this.borderTop, psi.absolutePosition.y + psi.borderTop);
        if (overlapWidth > 0 && overlapHeight > 0) {
            return true;
        }
        return false;
    }

    public liesInsideBorders(psi: BoundingBox): boolean {
        let leftBorderInside: boolean = (this.AbsolutePosition.x + this.borderLeft) <= (psi.absolutePosition.x + psi.borderLeft)
            && (psi.absolutePosition.x + psi.borderLeft) <= (this.AbsolutePosition.x + this.borderRight);
        let rightBorderInside: boolean = (this.AbsolutePosition.x + this.borderLeft) <= (psi.absolutePosition.x + psi.borderRight)
            && (psi.absolutePosition.x + psi.borderRight) <= (this.AbsolutePosition.x + this.borderRight);
        if (leftBorderInside && rightBorderInside) {
            let topBorderInside: boolean = (this.AbsolutePosition.y + this.borderTop) <= (psi.absolutePosition.y + psi.borderTop)
                && (psi.absolutePosition.y + psi.borderTop) <= (this.AbsolutePosition.y + this.borderBottom);
            let bottomBorderInside: boolean = (this.AbsolutePosition.y + this.borderTop) <= (psi.absolutePosition.y + psi.borderBottom)
                && (psi.absolutePosition.y + psi.borderBottom) <= (this.AbsolutePosition.y + this.borderBottom);
            if (topBorderInside && bottomBorderInside) {
                return true;
            }
        }
        return false;
    }

    public liesInsideBorders(psi: BoundingBox, leftBorderInside: boolean, rightBorderInside: boolean,
                             topBorderInside: boolean, bottomBorderInside: boolean): boolean {
        leftBorderInside = (this.AbsolutePosition.x + this.borderLeft) <= (psi.absolutePosition.x + psi.borderLeft)
            && (psi.absolutePosition.x + psi.borderLeft) <= (this.AbsolutePosition.x + this.borderRight);
        rightBorderInside = (this.AbsolutePosition.x + this.borderLeft) <= (psi.absolutePosition.x + psi.borderRight)
            && (psi.absolutePosition.x + psi.borderRight) <= (this.AbsolutePosition.x + this.borderRight);
        topBorderInside = (this.AbsolutePosition.y + this.borderTop) <= (psi.absolutePosition.y + psi.borderTop)
            && (psi.absolutePosition.y + psi.borderTop) <= (this.AbsolutePosition.y + this.borderBottom);
        bottomBorderInside = (this.AbsolutePosition.y + this.borderTop) <= (psi.absolutePosition.y + psi.borderBottom)
            && (psi.absolutePosition.y + psi.borderBottom) <= (this.AbsolutePosition.y + this.borderBottom);
        return topBorderInside && bottomBorderInside && leftBorderInside && rightBorderInside;
    }

    public liesInsideBorders(position: PointF2D): boolean {
        let xInside: boolean = (this.AbsolutePosition.x + this.borderLeft) <= position.x && position.x <= (this.AbsolutePosition.x + this.borderRight);
        if (xInside) {
            let yInside: boolean = (this.AbsolutePosition.y + this.borderTop) <= position.y && position.y <= (this.AbsolutePosition.y + this.borderBottom);
            if (yInside) {
                return true;
            }
        }
        return false;
    }

    public marginCollisionDetection(psi: BoundingBox): boolean {
        let overlapWidth: number = Math.min(this.AbsolutePosition.x + this.borderMarginRight, psi.absolutePosition.x + psi.borderMarginRight)
            - Math.max(this.AbsolutePosition.x + this.borderMarginLeft, psi.absolutePosition.x + psi.borderMarginLeft);
        let overlapHeight: number = Math.min(this.AbsolutePosition.y + this.borderMarginBottom, psi.absolutePosition.y + psi.borderMarginBottom)
            - Math.max(this.AbsolutePosition.y + this.borderMarginTop, psi.absolutePosition.y + psi.borderMarginTop);
        if (overlapWidth > 0 && overlapHeight > 0) {
            return true;
        }
        return false;
    }

    public liesInsideMargins(psi: BoundingBox): boolean {
        let leftMarginInside: boolean = (this.AbsolutePosition.x + this.borderMarginLeft) <= (psi.absolutePosition.x + psi.borderMarginLeft)
            && (psi.absolutePosition.x + psi.borderMarginLeft) <= (this.AbsolutePosition.x + this.borderMarginRight);
        let rightMarginInside: boolean = (this.AbsolutePosition.x + this.borderMarginLeft) <= (psi.absolutePosition.x + psi.borderMarginRight)
            && (psi.absolutePosition.x + psi.borderMarginRight) <= (this.AbsolutePosition.x + this.borderMarginRight);
        if (leftMarginInside && rightMarginInside) {
            let topMarginInside: boolean = (this.AbsolutePosition.y + this.borderMarginTop) <= (psi.absolutePosition.y + psi.borderMarginTop)
                && (psi.absolutePosition.y + psi.borderMarginTop) <= (this.AbsolutePosition.y + this.borderMarginBottom);
            let bottomMarginInside: boolean = (this.AbsolutePosition.y + this.borderMarginTop) <= (psi.absolutePosition.y + psi.borderMarginBottom)
                && (psi.absolutePosition.y + psi.borderMarginBottom) <= (this.AbsolutePosition.y + this.borderMarginBottom);
            if (topMarginInside && bottomMarginInside) {
                return true;
            }
        }
        return false;
    }

    public liesInsideMargins(position: PointF2D): boolean {
        let xInside: boolean = (this.AbsolutePosition.x + this.borderMarginLeft) <= position.x
            && position.x <= (this.AbsolutePosition.x + this.borderMarginRight);
        if (xInside) {
            let yInside: boolean = (this.AbsolutePosition.y + this.borderMarginTop) <= position.y
                && position.y <= (this.AbsolutePosition.y + this.borderMarginBottom);
            if (yInside) {
                return true;
            }
        }
        return false;
    }

    public computeNonOverlappingPosition(placementPsi: BoundingBox, direction: ColDirEnum, margin: number): void {
        this.computeNonOverlappingPosition(placementPsi, direction, new PointF2D(0.0, 0.0));
    }

    public computeNonOverlappingPosition(placementPsi: BoundingBox, direction: ColDirEnum, position: PointF2D): void {
        this.RelativePosition = new PointF2D(position.x, position.y);
        this.setAbsolutePositionFromParent();
        let currentPosition: number = 0.0;
        let hasBeenMoved: boolean = false;
        do {
            switch (direction) {
                case ColDirEnum.Left:
                case ColDirEnum.Right:
                    currentPosition = this.relativePosition.x;
                    placementPsi.calculatePositionAlongDirection(this, direction);
                    hasBeenMoved = Math.abs(currentPosition - this.relativePosition.x) > 0.0001;
                    break;
                case ColDirEnum.Up:
                case ColDirEnum.Down:
                    currentPosition = this.relativePosition.y;
                    placementPsi.calculatePositionAlongDirection(this, direction);
                    hasBeenMoved = Math.abs(currentPosition - this.relativePosition.y) > 0.0001;
                    break;
                default:
                    throw new ArgumentOutOfRangeException("direction");
            }
        }
        while (hasBeenMoved);
    }

    public getClickedObjectOfType<T>(clickPosition: PointF2D): T {
        let obj: Object = this.dataObject;
        if (this.liesInsideBorders(clickPosition) && (obj instanceof T)) {
            return (obj as T);
        }
        for (let idx: number = 0, len: number = this.childElements.length; idx < len; ++idx) {
            let psi: BoundingBox = this.childElements[idx];
            let innerObject: Object = psi.getClickedObjectOfType<T>(clickPosition);
            if (innerObject !== undefined) {
                return (innerObject as T);
            }
        }
        return undefined;
    }

    public getObjectsInRegion<T>(region: BoundingBox): T[] {
        return this.getObjectsInRegion<T>(region, true);
    }

    public getObjectsInRegion<T>(region: BoundingBox, liesInside: boolean): T[] {
        if (this.dataObject instanceof T) {
            if (liesInside) {
                if (region.liesInsideBorders(this)) {
                    return [this.dataObject as T];
                }
            } else {
                if (region.collisionDetection(this)) {
                    return [this.dataObject as T];
                }
            }
        }
        return this.childElements.SelectMany(psi => psi.getObjectsInRegion<T>(region, liesInside));
    }

    protected calculateRectangle(): void {
        this.upperLeftCorner = new PointF2D(this.borderLeft, this.borderTop);
        this.size = new SizeF2D(this.borderRight - this.borderLeft, this.borderBottom - this.borderTop);
        this.boundingRectangle = RectangleF2D.createFromLocationAndSize(this.upperLeftCorner, this.size);
    }

    protected calculateMarginRectangle(): void {
        this.upperLeftMarginCorner = new PointF2D(this.borderMarginLeft, this.borderMarginTop);
        this.marginSize = new SizeF2D(this.borderMarginRight - this.borderMarginLeft, this.borderMarginBottom - this.borderMarginTop);
        this.boundingMarginRectangle = RectangleF2D.createFromLocationAndSize(this.upperLeftMarginCorner, this.marginSize);
    }

    private calculateMarginPositionAlongDirection(toBePlaced: BoundingBox, direction: ColDirEnum): void {
        if (this === toBePlaced) {
            return;
        }
        if (this.isSymbol && this.marginCollisionDetection(toBePlaced)) {
            let shiftDistance: number = 0;
            switch (direction) {
                case ColDirEnum.Left:
                    shiftDistance = (this.absolutePosition.x + this.borderMarginLeft) - (toBePlaced.absolutePosition.x + toBePlaced.borderMarginRight);
                    toBePlaced.relativePosition.x += shiftDistance;
                    toBePlaced.absolutePosition.x += shiftDistance;
                    return;
                case ColDirEnum.Right:
                    shiftDistance = (this.absolutePosition.x + this.borderMarginRight) - (toBePlaced.absolutePosition.x + toBePlaced.borderMarginLeft);
                    toBePlaced.relativePosition.x += shiftDistance;
                    toBePlaced.absolutePosition.x += shiftDistance;
                    return;
                case ColDirEnum.Up:
                    shiftDistance = (this.absolutePosition.y + this.borderMarginTop) - (toBePlaced.absolutePosition.y + toBePlaced.borderMarginBottom);
                    toBePlaced.relativePosition.y += shiftDistance;
                    toBePlaced.absolutePosition.y += shiftDistance;
                    return;
                case ColDirEnum.Down:
                    shiftDistance = (this.absolutePosition.y + this.borderMarginBottom) - (toBePlaced.absolutePosition.y + toBePlaced.borderMarginTop);
                    toBePlaced.relativePosition.y += shiftDistance;
                    toBePlaced.absolutePosition.y += shiftDistance;
                    return;
                default:
                    throw new ArgumentOutOfRangeException("direction");
            }
        }
        for (let idx: number = 0, len: number = this.ChildElements.length; idx < len; ++idx) {
            let childElement: BoundingBox = this.ChildElements[idx];
            childElement.calculateMarginPositionAlongDirection(toBePlaced, direction);
        }
    }

    private calculatePositionAlongDirection(toBePlaced: BoundingBox, direction: ColDirEnum): void {
        if (this === toBePlaced) {
            return;
        }
        if (this.isSymbol && this.collisionDetection(toBePlaced)) {
            let shiftDistance: number;
            switch (direction) {
                case ColDirEnum.Left:
                    shiftDistance = (this.absolutePosition.x + this.borderLeft) - (toBePlaced.absolutePosition.x + toBePlaced.borderRight);
                    toBePlaced.relativePosition.x += shiftDistance;
                    toBePlaced.absolutePosition.x += shiftDistance;
                    return;
                case ColDirEnum.Right:
                    shiftDistance = (this.absolutePosition.x + this.borderRight) - (toBePlaced.absolutePosition.x + toBePlaced.borderLeft);
                    toBePlaced.relativePosition.x += shiftDistance;
                    toBePlaced.absolutePosition.x += shiftDistance;
                    return;
                case ColDirEnum.Up:
                    shiftDistance = (this.absolutePosition.y + this.borderTop) - (toBePlaced.absolutePosition.y + toBePlaced.borderBottom);
                    toBePlaced.relativePosition.y += shiftDistance;
                    toBePlaced.absolutePosition.y += shiftDistance;
                    return;
                case ColDirEnum.Down:
                    shiftDistance = (this.absolutePosition.y + this.borderBottom) - (toBePlaced.absolutePosition.y + toBePlaced.borderTop);
                    toBePlaced.relativePosition.y += shiftDistance;
                    toBePlaced.absolutePosition.y += shiftDistance;
                    return;
                default:
                    throw new ArgumentOutOfRangeException("direction");
            }
        }
        for (let idx: number = 0, len: number = this.ChildElements.length; idx < len; ++idx) {
            let childElement: BoundingBox = this.ChildElements[idx];
            childElement.calculatePositionAlongDirection(toBePlaced, direction);
        }
    }
}

export enum ColDirEnum {
    Left = 0,
    Right = 1,
    Up = 2,
    Down = 3
}
