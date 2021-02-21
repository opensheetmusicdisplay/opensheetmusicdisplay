import { BoundingBox } from "../../MusicalScore/Graphical/BoundingBox";
import { PointF2D, SizeF2D } from "../DataObjects";

export abstract class AbstractScreenViewingRegion{
    protected displaySizeInPixel: SizeF2D;
    public abstract get DisplaySizeInPixel(): SizeF2D;
    public abstract set DisplaySizeInPixel(value: SizeF2D);
    public abstract transformToUnitCoordinates(relativeScreenPosition: PointF2D): PointF2D;
    public abstract transformLengthXToUnitCoordinates(lengthXInPixels: number): number;
    public abstract transformLengthYToUnitCoordinates(lengthYInPixels: number): number;
    public static createWithRelativeDefaults(displaySizeInPixel: SizeF2D, regionWidthInUnits: number): AbstractScreenViewingRegion {
        throw new Error("CreateWithRelativeDefaults not implemented");
    }

    public static createWithDefaults(): AbstractScreenViewingRegion {
        throw new Error("createWithDefaults not implemented");
    }
    public RelativeDisplayPosition: PointF2D;
    public abstract get UpperLeftPositionInUnits(): PointF2D;
    public abstract set UpperLeftPositionInUnits(value: PointF2D);
    public abstract get RelativeDisplaySize(): SizeF2D;
    public abstract set RelativeDisplaySize(value: SizeF2D);
    public abstract get RegionSizeInPixel(): SizeF2D;
    public abstract get WidthInUnits(): number;
    public abstract set WidthInUnits(value: number);
    public abstract get ViewRegionInUnits(): SizeF2D;
    public abstract isVisible(psi: BoundingBox, isCompletelyInside: boolean): boolean;
    public abstract isInsideDisplayArea(relativeDisplayPosX: number, relativeDisplayPosY: number): boolean;
}
