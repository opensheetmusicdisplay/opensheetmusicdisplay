import Dictionary from "typescript-collections/dist/lib/Dictionary";
import { GraphicalMusicSheet, IAfterSheetReadingModule, MusicSheet } from "../MusicalScore";
import { IPluginEventResult, MessageSeverity } from "./Interfaces/IPluginEventResult";
import { OpenSheetMusicDisplayPlugin } from "./Interfaces/OpenSheetMusicDisplayPlugin";
import log from "loglevel";
import { OpenSheetMusicDisplay } from "../OpenSheetMusicDisplay";

//TODO: This is a very basic starter framework.
//Ideally we will have generic events and a lot more interfaces available to create plugins
//SEE: Sebastians pluginInfrastructure branch
export class OpenSheetMusicDisplayPluginManager {
    protected osmd: OpenSheetMusicDisplay;

    constructor(osmd: OpenSheetMusicDisplay){
        this.osmd = osmd;
    }

    protected pluginMap: Dictionary<string, OpenSheetMusicDisplayPlugin> = new Dictionary<string, OpenSheetMusicDisplayPlugin>();
    //private loadQueue: Array<OpenSheetMusicDisplayPlugin> = new Array<OpenSheetMusicDisplayPlugin>();
    public RegisterPlugin(plugin: OpenSheetMusicDisplayPlugin): void {
        //TODO: Use Kahns Algorithm for dependency load sorting.
        //for(let i: number = 0; i < plugin.Dependencies.length; i++){
        //    console.log(plugin.Dependencies[i]);
        //}
        this.pluginMap.setValue(plugin.Name, plugin);
        plugin.Initialize(this.osmd);
        if(plugin.AfterSheetReadingModules && plugin.AfterSheetReadingModules.length > 0){
            this.AfterSheetReadingModules = this.AfterSheetReadingModules.concat(plugin.AfterSheetReadingModules);
        }
    }

    protected static handlePluginEventResult(result: IPluginEventResult): void{
        if (!result) {
            return;
        }
        switch(result.Severity){
            case MessageSeverity.INFO:
                log.info(result.Message);
            break;
            case MessageSeverity.LOG:
                log.log(result.Message);
            break;
            case MessageSeverity.WARN:
                log.warn(result.Message);
            break;
            default:
                log.log(result.Message);
            break;
            case MessageSeverity.ERROR:
                throw result.Message;
        }
    }

    public AfterSheetReadingModules: IAfterSheetReadingModule[] = [];

    public BeforeLoad(): void {
        for(const plugin of this.pluginMap.values()){
            const result: IPluginEventResult = plugin.BeforeLoad(this.osmd);
            OpenSheetMusicDisplayPluginManager.handlePluginEventResult(result);
        }
    }
    public AfterLoad(): void {
        for(const plugin of this.pluginMap.values()){
            const result: IPluginEventResult = plugin.AfterLoad(this.osmd);
            OpenSheetMusicDisplayPluginManager.handlePluginEventResult(result);
        }
    }
    public BeforeRender(): void {
        for(const plugin of this.pluginMap.values()){
            const result: IPluginEventResult = plugin.BeforeRender(this.osmd);
            OpenSheetMusicDisplayPluginManager.handlePluginEventResult(result);
        }
    }
    public AfterRender(): void {
        for(const plugin of this.pluginMap.values()){
            const result: IPluginEventResult = plugin.AfterRender(this.osmd);
            OpenSheetMusicDisplayPluginManager.handlePluginEventResult(result);
        }
    }
    public SetMusicSheet(sheet: MusicSheet): void {
        for(const plugin of this.pluginMap.values()){
            const result: IPluginEventResult = plugin.SetMusicSheet(sheet);
            OpenSheetMusicDisplayPluginManager.handlePluginEventResult(result);
        }
    }
    public SetGraphicalMusicSheet(graphicalMusicSheet: GraphicalMusicSheet): void {
        for(const plugin of this.pluginMap.values()){
            const result: IPluginEventResult = plugin.SetGraphicalMusicSheet(graphicalMusicSheet);
            OpenSheetMusicDisplayPluginManager.handlePluginEventResult(result);
        }
    }
}
