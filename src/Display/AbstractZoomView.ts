import { IControllerOutputListener } from "../Common/Interfaces/IControllerOutputListener";
import { IDisplayInteractionListener } from "../Common/Interfaces/IDisplayInteractionListener";
import { IZoomView } from "../Common/Interfaces/IZoomView";
import { AbstractDisplayInteractionManager } from "./AbstractDisplayInteractionManager";
// @ts-ignore
import log from "loglevel";
import { PointF2D } from "../Common/DataObjects";

export abstract class AbstractZoomView implements IControllerOutputListener, IDisplayInteractionListener {
    constructor(displayInteractionManager: AbstractDisplayInteractionManager) {
        this.displayInteractionManager = displayInteractionManager;
        this.displayInteractionManager.addListener(this);
        this.offsetXMin = Number.MIN_VALUE;
        this.offsetYMin = Number.MIN_VALUE;
        this.rangeXMin = 1;
        this.rangeYMin = 1;
        this.offsetXMax = Number.MAX_VALUE;
        this.offsetYMax = Number.MAX_VALUE;
        this.rangeXMax = 1000000000;
        this.rangeYMax = 1000000000;
        this.XScrollingEnabled = false;
        this.YScrollingEnabled = true;
    }
    protected displayInteractionManager: AbstractDisplayInteractionManager;
    private rangeX: number;
    private offsetX: number;
    private rangeY: number;
    private offsetY: number;
    private lastRangeX: number;
    private lastOffsetX: number;
    private lastRangeY: number;
    private lastOffsetY: number;
    private aspectRatio: number = 1;
    protected zoomViews: IZoomView[] = [];
    protected mouseZoomMode: boolean = false;
    protected usesManuallyControlledZoomMode: boolean;
    private autoScrollY: boolean = true;
    protected convertToUnitsReady(): boolean { throw new Error("not implemented"); }
    protected getPositionInUnits(relativePositionX: number, relativePositionY: number): PointF2D { throw new Error("not implemented"); }
    public positionTouched(relativePositionX: number, relativePositionY: number): void {
        if (!this.convertToUnitsReady()) {
            return;
        }
        const clickPosition: PointF2D = this.getPositionInUnits(relativePositionX, relativePositionY);
        this.unitPosTouched(clickPosition, relativePositionX, relativePositionY);
    }
    protected unitPosTouched(PosInUnits: PointF2D, relPosX: number, relPosY: number): void { throw new Error("not implemented"); }
    public get TouchActive(): boolean {
        return this.displayInteractionManager.TouchActive;
    }
    public get TouchMoving(): boolean {
        return this.displayInteractionManager.TouchMoving;
    }
    public positionDoubleTouched(relativePositionX: number, relativePositionY: number): void {
        if (!this.convertToUnitsReady()) {
            return;
        }
        const clickPosition: PointF2D = this.getPositionInUnits(relativePositionX, relativePositionY);
        this.unitPosDoubleTouched(clickPosition, relativePositionX, relativePositionY);
    }
    protected unitPosDoubleTouched(PosInUnits: PointF2D, relPosX: number, relPosY: number): void { throw new Error("not implemented"); }
    public get UsesManuallyControlledZoomMode(): boolean {
        return this.usesManuallyControlledZoomMode;
    }
    public set UsesManuallyControlledZoomMode(value: boolean) {
        this.usesManuallyControlledZoomMode = value;
    }
    public mouseDown(relativePositionX: number, relativePositionY: number, activateZoomOnRightMouseButton: boolean = false): void {
        if (!this.convertToUnitsReady()) {
            return;
        }
        this.selectScrollControllerY(false);
        this.lastRangeX = Math.max(1, this.RangeX);
        this.lastRangeY = Math.max(1, this.RangeY);
        this.lastOffsetX = this.OffsetX;
        this.lastOffsetY = this.OffsetY;
        const clickPosition: PointF2D = this.getPositionInUnits(relativePositionX, relativePositionY);
        this.unitPosTouchDown(clickPosition, relativePositionX, relativePositionY);
        if (!this.usesManuallyControlledZoomMode) {
            if (activateZoomOnRightMouseButton) { // zooming
                this.mouseZoomMode = true;
            } else { // panning
                this.mouseZoomMode = false;
            }
        }
    }
    protected unitPosTouchDown(PosInUnits: PointF2D, relPosX: number, relPosY: number): void { throw new Error("not implemented"); }
    public mouseUp(relativePositionX: number, relativePositionY: number): void {
        const clickPosition: PointF2D = this.getPositionInUnits(relativePositionX, relativePositionY);
        this.unitPosTouchUp(clickPosition, relativePositionX, relativePositionY);
    }
    protected unitPosTouchUp(PosInUnits: PointF2D, relPosX: number, relPosY: number): void { throw new Error("not implemented"); }
    public mouseMove(relativeDisplayPositionX: number, relativeDisplayPositionY: number, deltaX: number, deltaY: number): void {
        if (this.mouseZoomMode) { // zoom
            // zoom horizontally
            if (Math.abs(deltaX - 0) > 0.00000001) {
                this.RangeX = Math.abs(this.lastRangeX / (1 + deltaX));
            }

            // zoom vertically
            if (!this.lockRanges && Math.abs(deltaY - 0) > 0.00000001) {
                this.RangeY = Math.abs(this.lastRangeY / (1 - deltaY));
            }
        } else { // shift horizontally and/or vertically
            if (Math.abs(deltaX - 0) > 0.00000001) {
                this.OffsetX = this.lastOffsetX - deltaX * this.RangeX;
            }
            if (Math.abs(deltaY - 0) > 0.00000001) {
                this.OffsetY = this.lastOffsetY - deltaY * this.RangeY;
            }
        }
        const clickPosition: PointF2D = this.getPositionInUnits(relativeDisplayPositionX, relativeDisplayPositionY);
        this.unitPosMove(clickPosition, relativeDisplayPositionX, relativeDisplayPositionY);
    }
    protected unitPosMove(PosInUnits: PointF2D, relativeDisplayPositionX: number, relativeDisplayPositionY: number): void {
        throw new Error("not implemented");
    }
    public zoom(scale: number): void {
        // zoom horizontally
        this.RangeX = Math.abs(this.lastRangeX / scale);
    }
    public addZoomView(zoomable: IZoomView): void {
        this.zoomViews.push(zoomable);
    }
    public XScrollingEnabled: boolean;
    public YScrollingEnabled: boolean;
    public offsetXMin: number;
    public offsetYMin: number;
    public rangeXMin: number;
    public rangeYMin: number;
    public offsetXMax: number;
    public offsetYMax: number;
    public rangeXMax: number;
    public rangeYMax: number;
    public lockRanges: boolean;
    public get OffsetX(): number {
        return this.offsetX;
    }
    public set OffsetX(value: number) {
        this.offsetX = Math.min(this.offsetXMax, Math.max(this.offsetXMin, value));
        for (const zoomable of this.zoomViews) {
            zoomable.viewportXChanged(this.offsetX, this.RangeX);
        }
    }
    public get OffsetY(): number {
        return this.offsetY;
    }
    public set OffsetY(value: number) {
        this.offsetY = value;
        if (this.offsetY > this.offsetYMax) {
            this.offsetY = this.offsetYMax;
        } else if (this.offsetY < this.offsetYMin) {
            this.offsetY = this.offsetYMin;
        }
        for (const zoomable of this.zoomViews) {
            zoomable.viewportYChanged(this.offsetY, this.RangeY);
        }
    }
    public get RangeX(): number {
        return this.rangeX;
    }
    public set RangeX(value: number) {
        this.rangeX = Math.min(this.rangeXMax, Math.max(this.rangeXMin, value));
        if (this.lockRanges) {
            this.RangeY = this.RangeX / this.aspectRatio;
            for (const zoomable of this.zoomViews) {
                zoomable.viewportXChanged(this.OffsetX, this.RangeX);
                zoomable.viewportYChanged(this.OffsetY, this.RangeY);
            }
        } else {
            for (const zoomable of this.zoomViews) {
                zoomable.viewportXChanged(this.OffsetX, this.RangeX);
            }
        }
    }
    public get RangeY(): number {
        return this.rangeY;
    }
    public set RangeY(value: number) {
        this.rangeY = Math.min(this.rangeYMax, Math.max(this.rangeYMin, value));
        for (const zoomable of this.zoomViews) {
            zoomable.viewportYChanged(this.OffsetY, this.RangeY);
        }
    }
    protected set AspectRatio(value: number) {
        this.aspectRatio = value;
    }
    public initialize(offsetX: number, rangeX: number, offsetY: number, rangeY: number): void {
        this.setVerticalViewport(offsetY, rangeY);
        this.setHorizontalViewport(offsetX, rangeX);
    }
    public setHorizontalViewport(offsetX: number, rangeX: number): void {
        this.RangeX = rangeX;
        this.OffsetX = offsetX;
        this.lastRangeX = this.RangeX;
        this.lastOffsetX = this.OffsetX;
    }
    public setVerticalViewport(offsetY: number, rangeY: number): void {
        this.RangeY = rangeY;
        this.OffsetY = offsetY;
        this.lastRangeY = this.RangeY;
        this.lastOffsetY = this.OffsetY;
    }
    public viewSizeChanged(displayWidthInPixel: number, displayHeightInPixel: number): void {
        if (this.lockRanges) {
            this.aspectRatio = displayWidthInPixel / displayHeightInPixel;
            this.RangeY = this.RangeX / this.aspectRatio;
            this.lastRangeY = this.RangeY;
        }
    }
    public outputChanged(directlySet: boolean, currentValue: number, expectedValue: number): void {
        this.OffsetY = <number>currentValue;
    }
    public setOffsetXValueOnly(offsetX: number): void {
        this.offsetX = Math.min(this.offsetXMax, Math.max(this.offsetXMin, offsetX));
    }
    public setXOffset(offsetX: number, animated: boolean): void {
        if (this.displayInteractionManager.TouchActive || !this.XScrollingEnabled) {
            return;
        }
    }
    public setOffsetYValueOnly(offsetY: number): void {
        this.offsetY = Math.min(this.offsetYMax, Math.max(this.offsetYMin, offsetY));
    }
    public setYOffset(offsetY: number, animated: boolean): void {
        if (this.displayInteractionManager.TouchActive || !this.YScrollingEnabled) {
            return;
        }
        if (animated) {
            this.selectScrollControllerY(true);
        }
    }
    private selectScrollControllerY(autoScroll: boolean): void {
        if (this.autoScrollY !== autoScroll) {
            this.autoScrollY = autoScroll;
        }
    }

    public displaySizeChanged(width: number, height: number): void {
        throw new Error("Method not implemented.");
    }
}
