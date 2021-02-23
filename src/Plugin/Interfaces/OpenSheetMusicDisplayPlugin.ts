import { GraphicalMusicSheet, IAfterSheetReadingModule } from "../../MusicalScore";
import { MusicSheet } from "../../MusicalScore/MusicSheet";
import { IPluginEventResult } from "./IPluginEventResult";

export abstract class OpenSheetMusicDisplayPlugin {
    public abstract get Name(): string;
    public abstract get Dependencies(): Array<String>;
    public abstract get AfterSheetReadingModules(): Array<IAfterSheetReadingModule>;
    //TODO: more events, maybe more generic as well
    public abstract Initialize(): IPluginEventResult;
    public abstract BeforeLoad(): IPluginEventResult;
    public abstract AfterLoad(): IPluginEventResult;
    public abstract BeforeRender(): IPluginEventResult;
    public abstract AfterRender(): IPluginEventResult;
    public abstract SetMusicSheet(sheet: MusicSheet): IPluginEventResult;
    public abstract SetGraphicalMusicSheet(graphicSheet: GraphicalMusicSheet): IPluginEventResult;
}
