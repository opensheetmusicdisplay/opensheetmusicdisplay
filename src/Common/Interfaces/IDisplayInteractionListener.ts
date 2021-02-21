export interface IDisplayInteractionListener {
    displaySizeChanged(width: number, height: number): void;
    positionTouched(relativePositionX: number, relativePositionY: number): void;
    positionDoubleTouched(relativePositionX: number, relativePositionY: number): void;
    mouseDown(relativePositionX: number, relativePositionY: number, activateZoomOnRightMouseButton: boolean): void;
    mouseUp(relativePositionX: number, relativePositionY: number): void;
    mouseMove(relativePositionX: number, relativePositionY: number, deltaX: number, deltaY: number): void;
    zoom(scale: number): void;
}
