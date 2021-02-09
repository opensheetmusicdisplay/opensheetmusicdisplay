import log from "loglevel";
import { IVoiceMeasureReadPlugin } from "../Interfaces/IVoiceMeasureReadPlugin";
import { VoiceEntry, RhythmInstruction, KeyInstruction } from "../VoiceData";

export class ReaderPluginManager {
    private voiceMeasureReadPlugins: IVoiceMeasureReadPlugin[] = [];
    public addVoiceMeasureReadPlugin(plugin: IVoiceMeasureReadPlugin): void {
        this.voiceMeasureReadPlugins.push(plugin);
    }
    public processVoiceMeasureReadPlugins(measureVoiceEntries: VoiceEntry[], activeKey: KeyInstruction, currentRhythm: RhythmInstruction): void {
        for (const plugin of this.voiceMeasureReadPlugins) {
            try {
                plugin.measureReadCalculations(measureVoiceEntries, activeKey, currentRhythm);
            } catch (ex) {
                log.info("VoiceGenerator.addSingleNote: ", ex);
            }

        }
    }
}
