import { IEvent } from "./";
import { MusicSheet } from "../MusicalScore/MusicSheet";
import { SizeF2D } from "../Common/DataObjects/SizeF2D";

export interface IEventSource {

	/**
	 * Will trigger anytime a new music sheet has been loaded. The event contains the newly loaded `MusicSheet`.
	 */
    OnSheetLoaded: IEvent<MusicSheet>;

    /**
     * Will trigger anytime OSMD has resized and will report the new size as a `SizeF2D`.
     */
    OnSizeChanged: IEvent<SizeF2D>;
}
