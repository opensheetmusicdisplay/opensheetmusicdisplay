import { AbstractDisplayInteractionManager } from "./AbstractDisplayInteractionManager";
import { PointF2D } from "../Common/DataObjects/PointF2D";

export class WebDisplayInteractionManager extends AbstractDisplayInteractionManager {
    protected isTouchDevice: boolean = false;
    protected osmdSheetMusicContainer: HTMLElement;
    protected fullOffsetLeft: number = 0;
    protected fullOffsetTop: number = 0;

    constructor(osmdContainer: HTMLElement) {
        super();
        this.isTouchDevice = this.isTouch();
        this.osmdSheetMusicContainer = osmdContainer;
        this.listenForInteractions();
    }

    protected initialize(): void {
        this.fullOffsetLeft = 0;
        this.fullOffsetTop = 0;
        let nextParent: HTMLElement = this.osmdSheetMusicContainer;
        while (nextParent) {
            this.fullOffsetLeft += nextParent.offsetLeft;
            this.fullOffsetTop += nextParent.offsetTop;
            nextParent = nextParent.offsetParent as HTMLElement;
        }
    }

    protected dispose(): void {
        this.osmdSheetMusicContainer.removeEventListener(this.downEventName, this.downEventListener);
        this.osmdSheetMusicContainer.removeEventListener("touchend", this.touchEndEventListener.bind(this));
        this.osmdSheetMusicContainer.removeEventListener(this.moveEventName, this.moveEventListener);
        window.removeEventListener("resize", this.resizeEventListener.bind(this));
    }

    //TODO: Much of this pulled from annotations code. Once we get the two branches together, combine common code
    private isTouch(): boolean {
        if (("ontouchstart" in window) || (window as any).DocumentTouch) {
            return true;
        }
        // include the 'heartz' as a way to have a non matching MQ to help terminate the join
        // https://git.io/vznFH
        const prefixes: string[] = ["-webkit-", "-moz-", "-o-", "-ms-"];
        const query: string = ["(", prefixes.join("touch-enabled),("), "heartz", ")"].join("");
        return window.matchMedia(query).matches;
    }

    protected get downEventName(): string {
        return this.isTouchDevice ? "touchstart" : "mousedown";
    }

    protected get moveEventName(): string {
        return this.isTouchDevice ? "touchmove" : "mousemove";
    }

    private listenForInteractions(): void {
        const self: WebDisplayInteractionManager = this;
        //this.osmdSheetMusicContainer[this.downEventName] = this.downEventListener.bind(this);
        this.osmdSheetMusicContainer.addEventListener(this.downEventName, this.downEventListener.bind(this));

        this.osmdSheetMusicContainer.addEventListener("touchend", this.touchEndEventListener.bind(this));

        document.addEventListener(self.moveEventName, this.moveEventListener.bind(this));

        window.addEventListener("resize", this.resizeEventListener.bind(this));
    }

    //Millis of how long is valid for the next click of a double click
    private readonly DOUBLE_CLICK_WINDOW: number = 200;
    private clickTimeout: NodeJS.Timeout;
    private lastClick: number = 0;
    private downEventListener(clickEvent: MouseEvent | TouchEvent): void {
        //clickEvent.preventDefault();
        const currentTime: number = new Date().getTime();
        const clickLength: number = currentTime - this.lastClick;
        clearTimeout(this.clickTimeout);
        let x: number = 0;
        let y: number = 0;
        if (this.isTouchDevice && clickEvent instanceof TouchEvent) {
            x = clickEvent.touches[0].pageX;
            y = clickEvent.touches[0].pageY;
        } else if (clickEvent instanceof MouseEvent) {
            x = clickEvent.pageX;
            y = clickEvent.pageY;
        }
        const clickMinusOffset: PointF2D = this.getOffsetCoordinates(x, y);

        if (clickLength < this.DOUBLE_CLICK_WINDOW && clickLength > 0) {
            //double click
            this.doubleClick(clickMinusOffset.x, clickMinusOffset.y);
        } else {
            const self: WebDisplayInteractionManager = this;
            this.clickTimeout = setTimeout(function(): void {
                clearTimeout(this.clickTimeout);
                if (self.isTouchDevice) {
                    self.touchDown(clickMinusOffset.x, clickMinusOffset.y, undefined);
                } else {
                    self.click(clickMinusOffset.x, clickMinusOffset.y);
                }
            },                             this.DOUBLE_CLICK_WINDOW);
        }
        this.lastClick = currentTime;
    }

    private moveEventListener(mouseMoveEvent: MouseEvent | TouchEvent): void {
        //mouseMoveEvent.preventDefault();
        let x: number = 0;
        let y: number = 0;
        if (this.isTouchDevice && mouseMoveEvent instanceof TouchEvent) {
            x = mouseMoveEvent.touches[0].clientX;
            y = mouseMoveEvent.touches[0].clientY;
        } else if (mouseMoveEvent instanceof MouseEvent) {
            x = mouseMoveEvent.clientX;
            y = mouseMoveEvent.clientY;
        }
        const clickMinusOffset: PointF2D = this.getOffsetCoordinates(x, y);
        this.move(clickMinusOffset.x, clickMinusOffset.y);
    }

    private touchEndEventListener(clickEvent: TouchEvent): void {
        const touchMinusOffset: PointF2D = this.getOffsetCoordinates(clickEvent.touches[0].pageX, clickEvent.touches[0].pageY);
        this.touchUp(touchMinusOffset.x, touchMinusOffset.y);
    }


    private resizeEventListener(): void {
        this.displaySizeChanged(this.osmdSheetMusicContainer.clientWidth, this.osmdSheetMusicContainer.clientHeight);
    }

    private getOffsetCoordinates(clickX: number, clickY: number): PointF2D {
        const sheetX: number = clickX - this.fullOffsetLeft;
        const sheetY: number = clickY - this.fullOffsetTop;
        return new PointF2D(sheetX, sheetY);
    }
}
