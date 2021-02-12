import { IDisplayInteractionListener } from "../Common/Interfaces/IDisplayInteractionListener";

export abstract class AbstractDisplayInteractionManager {
    protected listeners: IDisplayInteractionListener[] = [];
    private zoomGestureActive: boolean = false;
    protected touchCount: number = 0;
    protected touchActive: boolean = false;
    protected touchMoving: boolean = false;
    private lastRelPosX: number;
    private lastRelPosY: number;
    protected lastPixelX: number;
    protected lastPixelY: number;
    protected displayWidth: number = 1;
    protected displayHeight: number = 1;
    protected displayDpi: number = 96;
    protected maxNumerOfFingers: number = 2;
    protected movementThreshInch: number = 0.075;
    protected interactionWasZoomGesture: boolean = false;
    constructor() {
        // TODO MB: Linter doesn't like empty constructors. Can we just remove this?
    }
    public addListener(listener: IDisplayInteractionListener): void {
        this.listeners.push(listener);
    }
    public get ZoomGestureActive(): boolean {
        return this.zoomGestureActive;
    }
    public get WasZoomGestureActive(): boolean {
        return this.interactionWasZoomGesture;
    }
    public displaySizeChanged(displayWidthInPixel: number, displayHeightInPixel: number): void {
        this.displayWidth = displayWidthInPixel;
        this.displayHeight = displayHeightInPixel;
        for (const listener of this.listeners) {
            listener.displaySizeChanged(this.displayWidth, this.displayHeight);
        }
    }
    public Dispose(): void {
        this.dispose();
    }
    public Initialize(): void {
        this.initialize();
    }
    public get DisplayDpi(): number {
        return this.displayDpi;
    }
    public get TouchActive(): boolean {
        return this.touchActive;
    }
    public get TouchMoving(): boolean {
        return this.touchMoving;
    }
    protected abstract dispose(): void;
    protected abstract initialize(): void;
    protected touchDown(positionInPixelX: number, positionInPixelY: number, leftMouseButton: boolean): void {
        this.interactionWasZoomGesture = false;
        const relativePositionX: number = positionInPixelX / this.displayWidth;
        const relativePositionY: number = positionInPixelY / this.displayHeight;
        this.lastRelPosX = relativePositionX;
        this.lastRelPosY = relativePositionY;
        this.lastPixelX = positionInPixelX;
        this.lastPixelY = positionInPixelY;
        this.touchActive = true;
        this.touchMoving = false;
        this.touchCount = Math.min(this.touchCount + 1, this.maxNumerOfFingers);
        for (const listener of this.listeners) {
            //JL: Why is this negating the leftmousebutton? i guess it expects it to be undefined since it is a touch?
            listener.mouseDown(relativePositionX, relativePositionY, !leftMouseButton);
        }
    }
    protected move(positionInPixelX: number, positionInPixelY: number): void {
        if (this.touchActive && !this.zoomGestureActive) {
            const relativePositionX: number = positionInPixelX / this.displayWidth;
            const relativePositionY: number = positionInPixelY / this.displayHeight;
            const deltaX: number = (relativePositionX - this.lastRelPosX);
            const deltaY: number = (relativePositionY - this.lastRelPosY);
            this.touchMoving = true;
            for (const listener of this.listeners) {
                listener.mouseMove(relativePositionX, relativePositionY, deltaX, deltaY);
            }
        }
    }
    protected zoomGestureStarted(): void {
        this.zoomGestureActive = true;
    }
    protected zoomGestureCompleted(): void {
        this.zoomGestureActive = false;
        this.interactionWasZoomGesture = true;
    }
    protected zoomGestureMove(scale: number): void {
        if (this.zoomGestureActive) {
            this.listeners.forEach(function (dil: IDisplayInteractionListener): void {
                dil.zoomScore(scale);
            });
        }
    }
    protected touchUp(positionInPixelX: number, positionInPixelY: number): void {
        this.touchActive = false;
        this.touchMoving = false;
        this.touchCount = Math.max(0, this.touchCount - 1);
        const relativePositionX: number = positionInPixelX / this.displayWidth;
        const relativePositionY: number = positionInPixelY / this.displayHeight;
        for (const listener of this.listeners) {
            listener.mouseUp(relativePositionX, relativePositionY);
        }
    }
    protected click(positionInPixelX: number, positionInPixelY: number): void {
        // don't click, if it was a move:
        // changed to still fire click even for small movements (needed for ios, as no touches began fires at view border.)
        if (!this.mouseDidMove(this.lastPixelX, positionInPixelX, this.lastPixelY, positionInPixelY) && !this.ZoomGestureActive) {
            const relativePositionX: number = positionInPixelX / this.displayWidth;
            const relativePositionY: number = positionInPixelY / this.displayHeight;
            for (const listener of this.listeners) {
                listener.positionTouched(relativePositionX, relativePositionY);
            }
        }
    }
    protected doubleClick(positionInPixelX: number, positionInPixelY: number): void {
        // don't click, if it was a move:
        // changed to still fire click even for small movements (needed for ios, as no touches began fired at view border.)
        if (!this.mouseDidMove(this.lastPixelX, positionInPixelX, this.lastPixelY, positionInPixelY) && !this.ZoomGestureActive) {
            const relativePositionX: number = positionInPixelX / this.displayWidth;
            const relativePositionY: number = positionInPixelY / this.displayHeight;
            for (const listener of this.listeners) {
                listener.positionDoubleTouched(relativePositionX, relativePositionY);
            }
        }
    }
    protected mouseDidMove(oldPosX: number, newPosX: number, oldPosY: number, newPosY: number): boolean {
        const movementDpiX: number = Math.abs(oldPosX - newPosX) / this.displayDpi;
        const movementDpiY: number = Math.abs(oldPosY - newPosY) / this.displayDpi;
        return movementDpiX > this.movementThreshInch || movementDpiY > this.movementThreshInch;
    }
}
