import { Cursor } from "./Cursor";
import { Promise } from "es6-promise";
export declare class OSMD {
    /**
     * The easy way of displaying a MusicXML sheet music file
     * @param container is either the ID, or the actual "div" element which will host the music sheet
     * @autoResize automatically resize the sheet to full page width on window resize
     */
    constructor(container: string | HTMLElement, autoResize?: boolean);
    cursor: Cursor;
    zoom: number;
    private container;
    private heading;
    private canvas;
    private sheet;
    private drawer;
    private graphic;
    /**
     * Load a MusicXML file
     * @param content is either the url of a file, or the root node of a MusicXML document, or the string content of a .xml/.mxl file
     */
    load(content: string | Document): Promise<{}>;
    /**
     * Render the music sheet in the container
     */
    render(): void;
    /**
     *
     * @param url
     */
    private openURL(url);
    /**
     * Clear all the titles from the headings element
     */
    private resetHeadings();
    /**
     * Initialize this object to default values
     * FIXME: Probably unnecessary
     */
    private reset();
    /**
     * Attach the appropriate handler to the window.onResize event
     */
    private autoResize();
}
