export declare class MusicSheetAPI {
    constructor();
    private canvas;
    private sheet;
    private drawer;
    private graphic;
    private width;
    private zoom;
    private unit;
    load(sheet: Element): void;
    setCanvas(canvas: HTMLCanvasElement): void;
    setWidth(width: number): void;
    scale(k: number): void;
    display(): void;
    free(): void;
}
