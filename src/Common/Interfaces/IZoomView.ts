export interface IZoomView {
    /**
     * @param offsetX x offset in unit coord space
     * @param rangeX x range in unit coord space
     */
    viewportXChanged(offsetX: number, rangeX: number): void;
    /**
     * @param offsetY y offset in unit coord space
     * @param rangeY y range in unit coord space
     */
    viewportYChanged(offsetY: number, rangeY: number): void;
}
