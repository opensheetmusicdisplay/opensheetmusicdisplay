import { AbstractZoomView } from "../../Display/AbstractZoomView";
import { AbstractScreenViewingRegion } from "./AbstractScreenViewingRegion";
import { IZoomView } from "./IZoomView";

export abstract class AbstractSheetRenderingManager extends AbstractZoomView implements IZoomView{
    protected mainViewingRegion: AbstractScreenViewingRegion;
    public get MainViewingRegion(): AbstractScreenViewingRegion {
        return this.mainViewingRegion;
    }
    abstract viewportXChanged(offsetX: number, rangeX: number): void;
    abstract viewportYChanged(offsetY: number, rangeY: number): void;
    abstract setMusicSheet(GraphicalMusicSheet): void;
}
