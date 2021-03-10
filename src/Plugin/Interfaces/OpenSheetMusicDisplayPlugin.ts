import { GraphicalMusicSheet, IAfterSheetReadingModule } from "../../MusicalScore";
import { MusicSheet } from "../../MusicalScore/MusicSheet";
import { OpenSheetMusicDisplay } from "../../OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { IPluginEventResult } from "./IPluginEventResult";

export abstract class OpenSheetMusicDisplayPlugin {
    public abstract get Name(): string;
    public abstract get Dependencies(): Array<String>;
    public abstract get AfterSheetReadingModules(): Array<IAfterSheetReadingModule>;
    //TODO: more events, maybe more generic as well
    public abstract Initialize(osmd: OpenSheetMusicDisplay): IPluginEventResult;
    public abstract Dispose(osmd: OpenSheetMusicDisplay): IPluginEventResult;
    public abstract BeforeLoad(osmd: OpenSheetMusicDisplay): IPluginEventResult;
    public abstract AfterLoad(osmd: OpenSheetMusicDisplay): IPluginEventResult;
    public abstract BeforeRender(osmd: OpenSheetMusicDisplay): IPluginEventResult;
    public abstract AfterRender(osmd: OpenSheetMusicDisplay): IPluginEventResult;
    public abstract SetMusicSheet(sheet: MusicSheet): IPluginEventResult;
    public abstract SetGraphicalMusicSheet(graphicSheet: GraphicalMusicSheet): IPluginEventResult;
}
