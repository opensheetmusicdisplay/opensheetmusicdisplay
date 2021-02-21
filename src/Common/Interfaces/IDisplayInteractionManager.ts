import { IDisplayInteractionListener } from "./IDisplayInteractionListener";

export interface IDisplayInteractionManager {
    Initialize(): void;
    Dispose(): void;
    displaySizeChanged(displayWidthInPixel: number, displayHeightInPixel: number): void;
    addListener(listener: IDisplayInteractionListener);
}
