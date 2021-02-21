import { IUserDisplayInteractionListener } from "./IUserDisplayInteractionListener";

export interface ISheetRenderingManager{
    WidthInUnits: number;
    addListener(listener: IUserDisplayInteractionListener): void;
    setMusicSheet(GraphicalMusicSheet): void;
}
