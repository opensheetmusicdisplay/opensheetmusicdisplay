import { Fraction } from "../Common/DataObjects/Fraction";

export type RangeSelectionPhase = "hover" | "dragging" | "committed" | "cleared";
export type RangeSelectionDirection = "forward" | "backward";

export interface RangeSelectionAnchor {
    timestamp: Fraction;
    timestampReal: number;
    measureIndex: number;
    systemIndex: number;
    pageNumber: number;
    staffIndex: number;
    x: number;
    xPx: number;
    /** Semantic x-position used to determine which notes are included in the range.
     * Can differ from visual handle x/xPx (e.g. when applying snap display offsets). */
    selectionX?: number;
    /** Semantic x-position in pixels used for note inclusion checks. */
    selectionXPx?: number;
    yPx: number;
    heightPx: number;
}

export interface RangeSelectionPayload {
    phase: RangeSelectionPhase;
    direction: RangeSelectionDirection;
    start: RangeSelectionAnchor;
    end: RangeSelectionAnchor;
    normalizedStart: RangeSelectionAnchor;
    normalizedEnd: RangeSelectionAnchor;
    isDragging: boolean;
}

export interface InteractiveRangeSelectionOptions {
    enabled?: boolean;
    lineColor?: string;
    showHoverLine?: boolean;
    fillColor?: string;
    outsideMaskColor?: string;
    lineWidthPx?: number;
    applyPaddingPx?: number;
    snapToNotes?: boolean;
    loopButtonLabel?: string;
    clearButtonLabel?: string;
    grayOutNonSelectedNotes?: boolean;
    /** When set to `mask`, outside areas are dimmed via overlay rectangles instead of per-note opacity
     *  mutation. Much cheaper on long scores and scroll requires no gray-out refresh. */
    grayOutStrategy?: "opacity" | "mask";
    /** Keep stave connectors visible at system boundaries (first/last measure) during range gray-out. */
    keepBoundaryConnectorsVisible?: boolean;
    nonSelectedNotesOpacity?: number;
    grayOutUpdateIntervalMs?: number;
    showCommittedRangeFill?: boolean;
    hideSelectionRange?: boolean;
    overlayZIndex?: number;
}

export interface RangeSelectionCallbacks {
    onChange?: (payload: RangeSelectionPayload) => void;
    onLoopRequest?: (payload: RangeSelectionPayload) => void;
    onClearRequest?: (payload: RangeSelectionPayload) => void;
    onControlsRender?: (container: HTMLDivElement, payload: RangeSelectionPayload) => void;
    onHandleDraggingChange?: (isHandleDragging: boolean) => void;
}

export interface RangeSelectionConfig {
    enabled?: boolean;
    options?: InteractiveRangeSelectionOptions;
    callbacks?: RangeSelectionCallbacks;
}

export interface ResolvedRangeSelectionConfig {
    enabled: boolean;
    options: InteractiveRangeSelectionOptions;
    callbacks: RangeSelectionCallbacks;
}

export function createResolvedRangeSelectionConfig(): ResolvedRangeSelectionConfig {
    return {
        enabled: false,
        options: {},
        callbacks: {}
    };
}

