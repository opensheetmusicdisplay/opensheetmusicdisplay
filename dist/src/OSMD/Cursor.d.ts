import { MusicPartManager } from "../MusicalScore/MusicParts/MusicPartManager";
import { OSMD } from "./OSMD";
import { GraphicalMusicSheet } from "../MusicalScore/Graphical/GraphicalMusicSheet";
export declare class Cursor {
    constructor(container: HTMLElement, osmd: OSMD);
    private container;
    private osmd;
    private iterator;
    private graphic;
    private hidden;
    private cursorElement;
    init(manager: MusicPartManager, graphic: GraphicalMusicSheet): void;
    show(): void;
    update(): void;
    /**
     * Hide the cursor
     */
    hide(): void;
    /**
     * Go to next entry
     */
    next(): void;
    /**
     * Go to previous entry. Not implemented.
     */
    prev(): void;
    private updateStyle(width, color?);
}
