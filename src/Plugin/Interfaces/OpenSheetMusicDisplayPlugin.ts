import { GraphicalMusicSheet, IAfterSheetReadingModule } from "../../MusicalScore";
import { MusicSheet } from "../../MusicalScore/MusicSheet";
import { IOSMDOptions } from "../../OpenSheetMusicDisplay";
import { OpenSheetMusicDisplay } from "../../OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { IPluginEventResult } from "./IPluginEventResult";

export abstract class OpenSheetMusicDisplayPlugin {
    public abstract get Name(): string;
    public abstract get Dependencies(): Array<String>;
    public abstract get AfterSheetReadingModules(): Array<IAfterSheetReadingModule>;
    //TODO: more events, maybe more generic as well
    public abstract Initialize(osmd: OpenSheetMusicDisplay, options?: IOSMDOptions): IPluginEventResult;
    public abstract Dispose(osmd: OpenSheetMusicDisplay, options?: IOSMDOptions): IPluginEventResult;
    public abstract BeforeLoad(osmd: OpenSheetMusicDisplay, options?: IOSMDOptions): IPluginEventResult;
    public abstract AfterLoad(osmd: OpenSheetMusicDisplay, options?: IOSMDOptions): IPluginEventResult;
    public abstract BeforeRender(osmd: OpenSheetMusicDisplay, options?: IOSMDOptions): IPluginEventResult;
    public abstract AfterRender(osmd: OpenSheetMusicDisplay, options?: IOSMDOptions): IPluginEventResult;
    public abstract SetMusicSheet(sheet: MusicSheet, options?: IOSMDOptions): IPluginEventResult;
    public abstract SetGraphicalMusicSheet(graphicSheet: GraphicalMusicSheet, options?: IOSMDOptions): IPluginEventResult;
}
