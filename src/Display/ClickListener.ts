import { Dictionary } from "typescript-collections";
import { PointF2D } from "../Common/DataObjects/PointF2D";
import { EngravingRules } from "../MusicalScore/Graphical/EngravingRules";
import { GraphicalMeasure } from "../MusicalScore/Graphical/GraphicalMeasure";
import { OpenSheetMusicDisplay } from "../OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalStaffEntry } from "../MusicalScore/Graphical/GraphicalStaffEntry";
import { MusicPartManagerIterator } from "../MusicalScore/MusicParts/MusicPartManagerIterator";
import { CursorType } from "../OpenSheetMusicDisplay/OSMDOptions";

/** Listens for clicks and selects current measure etc.
 * This is similar to classes like SheetRenderingManager and WebSheetRenderingManager in the audio player,
 * but for now we port only the necessary elements and simplify them for the measure width editor use case.
 */
export class ClickListener {
    public rules: EngravingRules;
    private osmdContainer: HTMLElement;
    private osmd: OpenSheetMusicDisplay;
    private currentMeasure: GraphicalMeasure;
    private lastMeasureClicked: GraphicalMeasure;

    protected EventCallbackMap: Dictionary<string, [HTMLElement|Document, EventListener]> =
                new Dictionary<string, [HTMLElement|Document, EventListener]>();

    constructor(osmd: OpenSheetMusicDisplay) {
        this.osmd = osmd;
        this.rules = osmd.EngravingRules;
        this.osmdContainer = this.rules.Container;
        this.init();
    }

    public init(): void {
        this.listenForInteractions();
    }

    private listenForInteractions(): void {
        const downEvent: (clickEvent: MouseEvent | TouchEvent) => void = this.downEventListener.bind(this);
        // const endTouchEvent: (clickEvent: TouchEvent) => void = this.touchEndEventListener.bind(this);
        // const moveEvent: (clickEvent: MouseEvent | TouchEvent) => void = this.moveEventListener.bind(this);
        this.osmdContainer.addEventListener("mousedown", downEvent);
        // this.osmdContainer.addEventListener("touchend", endTouchEvent);
        // document.addEventListener(this.moveEventName, moveEvent);
        this.EventCallbackMap.setValue("mousedown", [this.osmdContainer, downEvent]);
        // this.EventCallbackMap.setValue("touchend", [this.osmdContainer, endTouchEvent]);
        // this.EventCallbackMap.setValue(this.moveEventName, [document, moveEvent]);

        const measureMinusBtn: HTMLElement = document.getElementById("measure-width-minus-btn");
        const measurePlusBtn: HTMLElement = document.getElementById("measure-width-plus-btn");
        const toggleCursorBtn: HTMLElement = document.getElementById("toggle-cursor-btn");
        const measureMinusEvent: (clickEvent: MouseEvent | TouchEvent) => void = this.measureMinusListener.bind(this);
        measureMinusBtn.addEventListener("click", measureMinusEvent);
        const measurePlusEvent: (clickEvent: MouseEvent | TouchEvent) => void = this.measurePlusListener.bind(this);
        measurePlusBtn.addEventListener("click", measurePlusEvent);
        const toggleCursorEvent: (clickEvent: MouseEvent | TouchEvent) => void = this.toggleCursorListener.bind(this);
        toggleCursorBtn.addEventListener("click", toggleCursorEvent);
    }

    public getPositionInUnits(relativePositionX: number, relativePositionY: number): PointF2D {
        const position: PointF2D = new PointF2D(relativePositionX, relativePositionY);
        if (this.rules.RenderSingleHorizontalStaffline) {
            position.x += this.rules.Container.scrollLeft / this.rules.DisplayWidth;
            // TODO move this to mouseMoved() mouseUp() positionTouched() or sth.
            //   Also, don't we have offset values for things like this somewhere?
        }
        return this.transformToUnitCoordinates(position);
    }

    /**
     * @param relativeScreenPosition The relative position on the whole screen,
     * not on the ScreenViewingRegion (only if the region stretches over the whole screen).
     */
    public transformToUnitCoordinates(relativeScreenPosition: PointF2D): PointF2D {
        // const position: PointF2D = new PointF2D(this.UpperLeftPositionInUnits.x + this.ViewRegionInUnits.width *
        //                                         ((relativeScreenPosition.x - this.RelativeDisplayPosition.x) / this.RelativeDisplaySize.width),
        //                                         this.UpperLeftPositionInUnits.y + this.ViewRegionInUnits.height *
        //                                         ((relativeScreenPosition.y - this.RelativeDisplayPosition.y) / this.RelativeDisplaySize.height));
        let viewWidth: number = this.osmd.Sheet.pageWidth;
        if (this.rules.RenderSingleHorizontalStaffline) {
            // without this, clicking doesn't work for RenderSingleHorizontalStaffline, gets extremely high coordinates
            viewWidth = this.rules.Container.offsetWidth / this.osmd.zoom / 10.0;
        }
        const viewHeight: number = this.rules.DisplayHeight / this.osmd.zoom / 10.0;
        const position: PointF2D = new PointF2D(relativeScreenPosition.x * viewWidth, relativeScreenPosition.y * viewHeight);
        return position;
    }

    private downEventListener(clickEvent: MouseEvent | TouchEvent): void {
        //clickEvent.preventDefault();
        let x: number = 0;
        let y: number = 0;
        if (this.isTouch() && clickEvent instanceof TouchEvent) {
            x = clickEvent.touches[0].pageX;
            y = clickEvent.touches[0].pageY;
        } else if (clickEvent instanceof MouseEvent) {
            x = clickEvent.pageX;
            y = clickEvent.pageY;
        }
        const clickMinusOffset: PointF2D = this.getOffsetCoordinates(x, y);
        if (clickMinusOffset.y > this.osmdContainer.clientHeight) {
            // e.g. scrollbar click: ignore
            return;
        }

        // if (clickLength < this.DOUBLE_CLICK_WINDOW && clickLength > 0) { // double click
        this.click(clickMinusOffset.x, clickMinusOffset.y);
    }

    protected click(positionInPixelX: number, positionInPixelY: number): void {
        // don't click, if it was a move:
        // changed to still fire click even for small movements (needed for ios, as no touches began fires at view border.)
        // if (!this.mouseDidMove(this.lastPixelX, positionInPixelX, this.lastPixelY, positionInPixelY) && !this.ZoomGestureActive) {
        const relativePositionX: number = positionInPixelX / this.rules.DisplayWidth;
        const relativePositionY: number = positionInPixelY / this.rules.DisplayHeight;
        // for (const listener of this.listeners) {
        //     listener.positionTouched(relativePositionX, relativePositionY);
        // }
        const clickPosition: PointF2D = this.getPositionInUnits(relativePositionX, relativePositionY);
        // this.unitPosTouched(clickPosition, relativePositionX, relativePositionY);
        const nearestStaffEntry: GraphicalStaffEntry = this.osmd.GraphicSheet.GetNearestStaffEntry(clickPosition);
        // const nearestMeasure: GraphicalMeasure = this.osmd.GraphicSheet.GetNearestObject<GraphicalMeasure>(clickPosition, "GraphicalMeasure");
        // const nearestMeasure: GraphicalMeasure = this.osmd.GraphicSheet.getClickedObjectOfType<GraphicalMeasure>(clickPosition);
        if (nearestStaffEntry) {
            this.osmd.cursor.iterator = new MusicPartManagerIterator(this.osmd.Sheet, nearestStaffEntry.getAbsoluteTimestamp());
            this.currentMeasure = this.osmd.cursor.GNotesUnderCursor()[0]?.parentVoiceEntry.parentStaffEntry.parentMeasure;
            if (this.lastMeasureClicked === this.currentMeasure) {
                this.toggleCursorListener(); // toggle cursor (highlight / de-highlight)
                this.lastMeasureClicked = this.currentMeasure;
                return; // could also use an else block instead, but increases indentation
            }
            this.osmd.cursor.CursorOptions.type = CursorType.CurrentArea;
            this.osmd.cursor.CursorOptions.alpha = 0.1; // make this more transparent so that it's easier to judge the measure visually
            this.osmd.cursor.show();
            this.osmd.cursor.update();
            const currentMeasureField: HTMLElement = document.getElementById("selected-measure-field");
            currentMeasureField.innerHTML = `Selected Measure: ${this.currentMeasure?.MeasureNumber}`;
            this.updateMeasureWidthDisplay();
            this.lastMeasureClicked = this.currentMeasure;
        }
    }

    private getOffsetCoordinates(clickX: number, clickY: number): PointF2D {
        let fullOffsetTop: number = 0;
        let nextOffsetParent: HTMLElement = this.osmdContainer;
        while (nextOffsetParent) {
            fullOffsetTop += nextOffsetParent.offsetTop;
            nextOffsetParent = nextOffsetParent.offsetParent as HTMLElement;
        }

        const sheetX: number = clickX; // - this.fullOffsetLeft + this.fullScrollLeft;
        const sheetY: number = clickY - fullOffsetTop; // + this.fullScrollTop;
        return new PointF2D(sheetX, sheetY);
    }

    //TODO: Much of this pulled from annotations code. Once we get the two branches together, combine common code
    private isTouch(): boolean {
        if (("ontouchstart" in window) || (window as any).DocumentTouch) {
            return true;
        }
        if (!window.matchMedia) {
            return false; // if running browserless / in nodejs (generateImages / visual regression tests)
        }
        // include the 'heartz' as a way to have a non matching MQ to help terminate the join
        // https://git.io/vznFH
        const prefixes: string[] = ["-webkit-", "-moz-", "-o-", "-ms-"];
        const query: string = ["(", prefixes.join("touch-enabled),("), "heartz", ")"].join("");
        return window.matchMedia(query).matches;
    }

    public Dispose(): void {
        for(const eventName of this.EventCallbackMap.keys()){
            const result: [HTMLElement|Document, EventListener] = this.EventCallbackMap.getValue(eventName);
            result[0].removeEventListener(eventName, result[1]);
        }
        this.EventCallbackMap.clear();
    }

    private measureMinusListener(clickEvent: MouseEvent | TouchEvent): void {
        if (!this.currentMeasure) {
            console.log("no current measure selected. ignoring minus button");
            return;
        }
        this.currentMeasure.parentSourceMeasure.widthFactor -= 0.1;
        this.updateMeasureWidthDisplay();
        this.renderAndScrollBack();
    }

    private measurePlusListener(clickEvent: MouseEvent | TouchEvent): void {
        if (!this.currentMeasure) {
            console.log("no current measure selected. ignoring plus button");
            return;
        }
        this.currentMeasure.parentSourceMeasure.widthFactor += 0.1;
        this.updateMeasureWidthDisplay();
        this.renderAndScrollBack();
    }

    private toggleCursorListener(): void {
        if (this.osmd.cursor.hidden) {
            this.osmd.cursor.show();
        } else {
            this.osmd.cursor.hide();
        }
    }

    private renderAndScrollBack(): void {
        // scroll back to the previous scrollX if we scrolled horizontally then re-rendered
        //   (without this, after rendering, it "scrolled back" to the initial 0 horizontal scroll / reset scroll)
        const currentScrollX: number = this.osmdContainer.scrollLeft;
        this.osmd.render();
        this.osmdContainer.scrollLeft = currentScrollX;
    }

    private updateMeasureWidthDisplay(): void {
        const widthDisplay: HTMLElement = document.getElementById("measure-width-display");
        const percent: number = this.currentMeasure.parentSourceMeasure.widthFactor * 100;
        const percentString: string = percent.toFixed(0);
        widthDisplay.innerHTML = `${percentString}%`;
    }
}
