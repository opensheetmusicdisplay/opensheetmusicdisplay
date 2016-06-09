import {ArgumentOutOfRangeException} from "../Exceptions";
import {PointF_2D} from "../../Common/DataObjects/PointF_2D";
import {SizeF_2D} from "../../Common/DataObjects/SizeF_2D";
import {RectangleF_2D} from "../../Common/DataObjects/RectangleF_2D";
export class BoundingBox {
        protected isSymbol: boolean = false;
        protected relativePositionHasBeenSet: boolean;
        protected xBordersHaveBeenSet: boolean;
        protected yBordersHaveBeenSet: boolean;
        protected absolutePosition: PointF_2D = new PointF_2D();
        protected relativePosition: PointF_2D = new PointF_2D();
        protected size: SizeF_2D = new SizeF_2D();
        protected marginSize: SizeF_2D;
        protected upperLeftCorner: PointF_2D;
        protected upperLeftMarginCorner: PointF_2D;
        protected borderLeft: number;
        protected borderRight: number;
        protected borderTop: number;
        protected borderBottom: number;
        protected borderMarginLeft: number;
        protected borderMarginRight: number;
        protected borderMarginTop: number;
        protected borderMarginBottom: number;
        protected boundingRectangle: RectangleF_2D;
        protected boundingMarginRectangle: RectangleF_2D;
        protected childElements: List<BoundingBox> = new List<BoundingBox>();
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
        public get AbsolutePosition(): PointF_2D {
            return this.absolutePosition;
        }
        public set AbsolutePosition(value: PointF_2D) {
            this.absolutePosition = value;
        }
        public get RelativePosition(): PointF_2D {
            return this.relativePosition;
        }
        public set RelativePosition(value: PointF_2D) {
            this.relativePosition = value;
            this.relativePositionHasBeenSet = true;
        }
        public get Size(): SizeF_2D {
            return this.size;
        }
        public set Size(value: SizeF_2D) {
            this.size = value;
        }
        public get MarginSize(): SizeF_2D {
            return this.marginSize;
        }
        public get UpperLeftCorner(): PointF_2D {
            return this.upperLeftCorner;
        }
        public get UpperLeftMarginCorner(): PointF_2D {
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
        public get BoundingRectangle(): RectangleF_2D {
            return this.boundingRectangle;
        }
        public get BoundingMarginRectangle(): RectangleF_2D {
            return this.boundingMarginRectangle;
        }
        public get ChildElements(): List<BoundingBox> {
            return this.childElements;
        }
        public set ChildElements(value: List<BoundingBox>) {
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
            if (this.parent != null) {
                this.absolutePosition.X = this.parent.AbsolutePosition.X + this.relativePosition.X;
                this.absolutePosition.Y = this.parent.AbsolutePosition.Y + this.relativePosition.Y;
            }
            else {
                this.absolutePosition = this.relativePosition;
            }
        }
        public calculateAbsolutePositionsRecursiveWithoutTopelement(): void {
            this.absolutePosition.X = 0.0;
            this.absolutePosition.Y = 0.0;
            for (var idx: number = 0, len = this.ChildElements.Count; idx < len; ++idx) {
                var child: BoundingBox = this.ChildElements[idx];
                child.calculateAbsolutePositionsRecursive(this.absolutePosition.X, this.absolutePosition.Y);
            }
        }
        public calculateAbsolutePositionsRecursive(x: number, y: number): void {
            this.absolutePosition.X = this.relativePosition.X + x;
            this.absolutePosition.Y = this.relativePosition.Y + y;
            for (var idx: number = 0, len = this.ChildElements.Count; idx < len; ++idx) {
                var child: BoundingBox = this.ChildElements[idx];
                child.calculateAbsolutePositionsRecursive(this.absolutePosition.X, this.absolutePosition.Y);
            }
        }
        public calculateBoundingBox(): void {
            if (this.childElements.Count == 0)
                return
            for (var idx: number = 0, len = this.ChildElements.Count; idx < len; ++idx) {
                var childElement: BoundingBox = this.ChildElements[idx];
                childElement.calculateBoundingBox();
            }
            var minLeft: number = number.MaxValue;
            var maxRight: number = number.MinValue;
            var minTop: number = number.MaxValue;
            var maxBottom: number = number.MinValue;
            var minMarginLeft: number = number.MaxValue;
            var maxMarginRight: number = number.MinValue;
            var minMarginTop: number = number.MaxValue;
            var maxMarginBottom: number = number.MinValue;
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
            for (var idx: number = 0, len = this.ChildElements.Count; idx < len; ++idx) {
                var childElement: BoundingBox = this.ChildElements[idx];
                minLeft = Math.Min(minLeft, childElement.relativePosition.X + childElement.borderLeft);
                maxRight = Math.Max(maxRight, childElement.relativePosition.X + childElement.borderRight);
                minTop = Math.Min(minTop, childElement.relativePosition.Y + childElement.borderTop);
                maxBottom = Math.Max(maxBottom, childElement.relativePosition.Y + childElement.borderBottom);
                minMarginLeft = Math.Min(minMarginLeft, childElement.relativePosition.X + childElement.borderMarginLeft);
                maxMarginRight = Math.Max(maxMarginRight,
                    childElement.relativePosition.X + childElement.borderMarginRight);
                minMarginTop = Math.Min(minMarginTop, childElement.relativePosition.Y + childElement.borderMarginTop);
                maxMarginBottom = Math.Max(maxMarginBottom,
                    childElement.relativePosition.Y + childElement.borderMarginBottom);
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
            if (this.childElements.Count == 0)
                return
            for (var idx: number = 0, len = this.ChildElements.Count; idx < len; ++idx) {
                var childElement: BoundingBox = this.ChildElements[idx];
                childElement.calculateTopBottomBorders();
            }
            var minTop: number = number.MaxValue;
            var maxBottom: number = number.MinValue;
            var minMarginTop: number = number.MaxValue;
            var maxMarginBottom: number = number.MinValue;
            if (this.yBordersHaveBeenSet) {
                minTop = this.borderTop;
                maxBottom = this.borderBottom;
                minMarginTop = this.borderMarginTop;
                maxMarginBottom = this.borderMarginBottom;
            }
            for (var idx: number = 0, len = this.ChildElements.Count; idx < len; ++idx) {
                var childElement: BoundingBox = this.ChildElements[idx];
                minTop = Math.Min(minTop, childElement.relativePosition.Y + childElement.borderTop);
                maxBottom = Math.Max(maxBottom, childElement.relativePosition.Y + childElement.borderBottom);
                minMarginTop = Math.Min(minMarginTop, childElement.relativePosition.Y + childElement.borderMarginTop);
                maxMarginBottom = Math.Max(maxMarginBottom,
                    childElement.relativePosition.Y + childElement.borderMarginBottom);
            }
            this.borderTop = minTop;
            this.borderBottom = maxBottom;
            this.borderMarginTop = minMarginTop;
            this.borderMarginBottom = maxMarginBottom;
            this.calculateRectangle();
            this.calculateMarginRectangle();
        }
        public computeNonOverlappingPositionWithMargin(placementPsi: BoundingBox, direction: ColDirEnum): void {
            this.computeNonOverlappingPositionWithMargin(placementPsi, direction, new PointF_2D(0.0, 0.0));
        }
        public computeNonOverlappingPositionWithMargin(placementPsi: BoundingBox, direction: ColDirEnum, position: PointF_2D): void {
            this.RelativePosition = new PointF_2D(position.X, position.Y);
            this.setAbsolutePositionFromParent();
            var currentPosition: number = 0.0;
            var hasBeenMoved: boolean = false;
            do {
                switch (direction) {
                    case ColDirEnum.Left:
                    case ColDirEnum.Right:
                        currentPosition = this.relativePosition.X;
                        placementPsi.calculateMarginPositionAlongDirection(this, direction);
                        hasBeenMoved = Math.Abs(currentPosition - this.relativePosition.X) > 0.001;
                        break;
                    case ColDirEnum.Up:
                    case ColDirEnum.Down:
                        currentPosition = this.relativePosition.Y;
                        placementPsi.calculateMarginPositionAlongDirection(this, direction);
                        hasBeenMoved = Math.Abs(currentPosition - this.relativePosition.Y) > 0.001;
                        break;
                    default:
                        throw new ArgumentOutOfRangeException("direction");
                }
            }
            while (hasBeenMoved);
        }
        public collisionDetection(psi: BoundingBox): boolean {
            var overlapWidth: number = Math.Min(this.AbsolutePosition.X + this.borderRight, psi.absolutePosition.X + psi.borderRight) - Math.Max(this.AbsolutePosition.X + this.borderLeft, psi.absolutePosition.X + psi.borderLeft);
            var overlapHeight: number = Math.Min(this.AbsolutePosition.Y + this.borderBottom, psi.absolutePosition.Y + psi.borderBottom) - Math.Max(this.AbsolutePosition.Y + this.borderTop, psi.absolutePosition.Y + psi.borderTop);
            if (overlapWidth > 0 && overlapHeight > 0)
                return true;
            return false;
        }
        public liesInsideBorders(psi: BoundingBox): boolean {
            var leftBorderInside: boolean = (this.AbsolutePosition.X + this.borderLeft) <= (psi.absolutePosition.X + psi.borderLeft) && (psi.absolutePosition.X + psi.borderLeft) <= (this.AbsolutePosition.X + this.borderRight);
            var rightBorderInside: boolean = (this.AbsolutePosition.X + this.borderLeft) <= (psi.absolutePosition.X + psi.borderRight) && (psi.absolutePosition.X + psi.borderRight) <= (this.AbsolutePosition.X + this.borderRight);
            if (leftBorderInside && rightBorderInside) {
                var topBorderInside: boolean = (this.AbsolutePosition.Y + this.borderTop) <= (psi.absolutePosition.Y + psi.borderTop) && (psi.absolutePosition.Y + psi.borderTop) <= (this.AbsolutePosition.Y + this.borderBottom);
                var bottomBorderInside: boolean = (this.AbsolutePosition.Y + this.borderTop) <= (psi.absolutePosition.Y + psi.borderBottom) && (psi.absolutePosition.Y + psi.borderBottom) <= (this.AbsolutePosition.Y + this.borderBottom);
                if (topBorderInside && bottomBorderInside) {
                    return true;
                }
            }
            return false;
        }
        public liesInsideBorders(psi: BoundingBox, leftBorderInside: boolean, rightBorderInside: boolean,
            topBorderInside: boolean, bottomBorderInside: boolean): boolean {
            leftBorderInside = (this.AbsolutePosition.X + this.borderLeft) <= (psi.absolutePosition.X + psi.borderLeft) && (psi.absolutePosition.X + psi.borderLeft) <= (this.AbsolutePosition.X + this.borderRight);
            rightBorderInside = (this.AbsolutePosition.X + this.borderLeft) <= (psi.absolutePosition.X + psi.borderRight) && (psi.absolutePosition.X + psi.borderRight) <= (this.AbsolutePosition.X + this.borderRight);
            topBorderInside = (this.AbsolutePosition.Y + this.borderTop) <= (psi.absolutePosition.Y + psi.borderTop) && (psi.absolutePosition.Y + psi.borderTop) <= (this.AbsolutePosition.Y + this.borderBottom);
            bottomBorderInside = (this.AbsolutePosition.Y + this.borderTop) <= (psi.absolutePosition.Y + psi.borderBottom) && (psi.absolutePosition.Y + psi.borderBottom) <= (this.AbsolutePosition.Y + this.borderBottom);
            return topBorderInside && bottomBorderInside && leftBorderInside && rightBorderInside;
        }
        public liesInsideBorders(position: PointF_2D): boolean {
            var xInside: boolean = (this.AbsolutePosition.X + this.borderLeft) <= position.X && position.X <= (this.AbsolutePosition.X + this.borderRight);
            if (xInside) {
                var yInside: boolean = (this.AbsolutePosition.Y + this.borderTop) <= position.Y && position.Y <= (this.AbsolutePosition.Y + this.borderBottom);
                if (yInside) {
                    return true;
                }
            }
            return false;
        }
        public marginCollisionDetection(psi: BoundingBox): boolean {
            var overlapWidth: number = Math.Min(this.AbsolutePosition.X + this.borderMarginRight, psi.absolutePosition.X + psi.borderMarginRight) - Math.Max(this.AbsolutePosition.X + this.borderMarginLeft, psi.absolutePosition.X + psi.borderMarginLeft);
            var overlapHeight: number = Math.Min(this.AbsolutePosition.Y + this.borderMarginBottom, psi.absolutePosition.Y + psi.borderMarginBottom) - Math.Max(this.AbsolutePosition.Y + this.borderMarginTop, psi.absolutePosition.Y + psi.borderMarginTop);
            if (overlapWidth > 0 && overlapHeight > 0)
                return true;
            return false;
        }
        public liesInsideMargins(psi: BoundingBox): boolean {
            var leftMarginInside: boolean = (this.AbsolutePosition.X + this.borderMarginLeft) <= (psi.absolutePosition.X + psi.borderMarginLeft) && (psi.absolutePosition.X + psi.borderMarginLeft) <= (this.AbsolutePosition.X + this.borderMarginRight);
            var rightMarginInside: boolean = (this.AbsolutePosition.X + this.borderMarginLeft) <= (psi.absolutePosition.X + psi.borderMarginRight) && (psi.absolutePosition.X + psi.borderMarginRight) <= (this.AbsolutePosition.X + this.borderMarginRight);
            if (leftMarginInside && rightMarginInside) {
                var topMarginInside: boolean = (this.AbsolutePosition.Y + this.borderMarginTop) <= (psi.absolutePosition.Y + psi.borderMarginTop) && (psi.absolutePosition.Y + psi.borderMarginTop) <= (this.AbsolutePosition.Y + this.borderMarginBottom);
                var bottomMarginInside: boolean = (this.AbsolutePosition.Y + this.borderMarginTop) <= (psi.absolutePosition.Y + psi.borderMarginBottom) && (psi.absolutePosition.Y + psi.borderMarginBottom) <= (this.AbsolutePosition.Y + this.borderMarginBottom);
                if (topMarginInside && bottomMarginInside) {
                    return true;
                }
            }
            return false;
        }
        public liesInsideMargins(position: PointF_2D): boolean {
            var xInside: boolean = (this.AbsolutePosition.X + this.borderMarginLeft) <= position.X && position.X <= (this.AbsolutePosition.X + this.borderMarginRight);
            if (xInside) {
                var yInside: boolean = (this.AbsolutePosition.Y + this.borderMarginTop) <= position.Y && position.Y <= (this.AbsolutePosition.Y + this.borderMarginBottom);
                if (yInside) {
                    return true;
                }
            }
            return false;
        }
        public computeNonOverlappingPosition(placementPsi: BoundingBox, direction: ColDirEnum, margin: number): void {
            this.computeNonOverlappingPosition(placementPsi, direction, new PointF_2D(0.0, 0.0));
        }
        public computeNonOverlappingPosition(placementPsi: BoundingBox, direction: ColDirEnum, position: PointF_2D): void {
            this.RelativePosition = new PointF_2D(position.X, position.Y);
            this.setAbsolutePositionFromParent();
            var currentPosition: number = 0.0;
            var hasBeenMoved: boolean = false;
            do {
                switch (direction) {
                    case ColDirEnum.Left:
                    case ColDirEnum.Right:
                        currentPosition = this.relativePosition.X;
                        placementPsi.calculatePositionAlongDirection(this, direction);
                        hasBeenMoved = Math.Abs(currentPosition - this.relativePosition.X) > 0.0001;
                        break;
                    case ColDirEnum.Up:
                    case ColDirEnum.Down:
                        currentPosition = this.relativePosition.Y;
                        placementPsi.calculatePositionAlongDirection(this, direction);
                        hasBeenMoved = Math.Abs(currentPosition - this.relativePosition.Y) > 0.0001;
                        break;
                    default:
                        throw new ArgumentOutOfRangeException("direction");
                }
            }
            while (hasBeenMoved);
        }
        public getClickedObjectOfType<T>(clickPosition: PointF_2D): T {
            var obj: Object = this.dataObject;
            if (this.liesInsideBorders(clickPosition) && (obj instanceof T))
                return __as__<T>(obj, T);
            for (var idx: number = 0, len = this.childElements.Count; idx < len; ++idx) {
                var psi: BoundingBox = this.childElements[idx];
                var innerObject: Object = psi.getClickedObjectOfType<T>(clickPosition);
                if (innerObject != null)
                    return __as__<T>(innerObject, T);
            }
            return null;
        }
        public getObjectsInRegion<T>(region: BoundingBox): IEnumerable<T> {
            return this.getObjectsInRegion<T>(region, true);
        }
        public getObjectsInRegion<T>(region: BoundingBox, liesInside: boolean): IEnumerable<T> {
            if (this.dataObject instanceof T) {
                if (liesInside) {
                    if (region.liesInsideBorders(this))
                        return __init(new List<T>(), { __as__<T>(this.dataObject, T) });
            }
            else {
                if (region.collisionDetection(this))
                    return __init(new List<T>(), { __as__<T>(this.dataObject, T) });
        }
    }
    return this.childElements.SelectMany(psi => psi.getObjectsInRegion<T>(region, liesInside));
}
protected calculateRectangle(): void
    {
        this.upperLeftCorner = new PointF_2D(this.borderLeft, this.borderTop);
        this.size = new SizeF_2D(this.borderRight - this.borderLeft, this.borderBottom - this.borderTop);
        this.boundingRectangle = new RectangleF_2D(this.upperLeftCorner, this.size);
    }
protected calculateMarginRectangle(): void
    {
        this.upperLeftMarginCorner = new PointF_2D(this.borderMarginLeft, this.borderMarginTop);
        this.marginSize = new SizeF_2D(this.borderMarginRight - this.borderMarginLeft, this.borderMarginBottom - this.borderMarginTop);
        this.boundingMarginRectangle = new RectangleF_2D(this.upperLeftMarginCorner, this.marginSize);
    }
private calculateMarginPositionAlongDirection(toBePlaced:BoundingBox, direction:ColDirEnum): void
    {
        if(this == toBePlaced)
 {
    return
}
if (this.isSymbol && this.marginCollisionDetection(toBePlaced)) {
    var shiftDistance: number = 0;
    switch (direction) {
        case ColDirEnum.Left:
            shiftDistance = (this.absolutePosition.X + this.borderMarginLeft) - (toBePlaced.absolutePosition.X + toBePlaced.borderMarginRight);
            toBePlaced.relativePosition.X += shiftDistance;
            toBePlaced.absolutePosition.X += shiftDistance;
            return
        case ColDirEnum.Right:
            shiftDistance = (this.absolutePosition.X + this.borderMarginRight) - (toBePlaced.absolutePosition.X + toBePlaced.borderMarginLeft);
            toBePlaced.relativePosition.X += shiftDistance;
            toBePlaced.absolutePosition.X += shiftDistance;
            return
        case ColDirEnum.Up:
            shiftDistance = (this.absolutePosition.Y + this.borderMarginTop) - (toBePlaced.absolutePosition.Y + toBePlaced.borderMarginBottom);
            toBePlaced.relativePosition.Y += shiftDistance;
            toBePlaced.absolutePosition.Y += shiftDistance;
            return
        case ColDirEnum.Down:
            shiftDistance = (this.absolutePosition.Y + this.borderMarginBottom) - (toBePlaced.absolutePosition.Y + toBePlaced.borderMarginTop);
            toBePlaced.relativePosition.Y += shiftDistance;
            toBePlaced.absolutePosition.Y += shiftDistance;
            return
        default:
            throw new ArgumentOutOfRangeException("direction");
    }
}
for (var idx: number = 0, len = this.ChildElements.Count; idx < len; ++idx) {
    var childElement: BoundingBox = this.ChildElements[idx];
    childElement.calculateMarginPositionAlongDirection(toBePlaced, direction);
}
}
private calculatePositionAlongDirection(toBePlaced:BoundingBox, direction:ColDirEnum): void
    {
        if(this == toBePlaced)
 {
    return
}
if (this.isSymbol && this.collisionDetection(toBePlaced)) {
    var shiftDistance: number;
    switch (direction) {
        case ColDirEnum.Left:
            shiftDistance = (this.absolutePosition.X + this.borderLeft) - (toBePlaced.absolutePosition.X + toBePlaced.borderRight);
            toBePlaced.relativePosition.X += shiftDistance;
            toBePlaced.absolutePosition.X += shiftDistance;
            return
        case ColDirEnum.Right:
            shiftDistance = (this.absolutePosition.X + this.borderRight) - (toBePlaced.absolutePosition.X + toBePlaced.borderLeft);
            toBePlaced.relativePosition.X += shiftDistance;
            toBePlaced.absolutePosition.X += shiftDistance;
            return
        case ColDirEnum.Up:
            shiftDistance = (this.absolutePosition.Y + this.borderTop) - (toBePlaced.absolutePosition.Y + toBePlaced.borderBottom);
            toBePlaced.relativePosition.Y += shiftDistance;
            toBePlaced.absolutePosition.Y += shiftDistance;
            return
        case ColDirEnum.Down:
            shiftDistance = (this.absolutePosition.Y + this.borderBottom) - (toBePlaced.absolutePosition.Y + toBePlaced.borderTop);
            toBePlaced.relativePosition.Y += shiftDistance;
            toBePlaced.absolutePosition.Y += shiftDistance;
            return
        default:
            throw new ArgumentOutOfRangeException("direction");
    }
}
for (var idx: number = 0, len = this.ChildElements.Count; idx < len; ++idx) {
    var childElement: BoundingBox = this.ChildElements[idx];
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
