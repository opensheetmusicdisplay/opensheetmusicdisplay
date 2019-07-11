import {MusicSheet} from "../MusicSheet";
import {Cursor} from "../../OpenSheetMusicDisplay";

export class MusicSheetPlayer {
    get IsPlay(): boolean {
        return this.isPlay;
    }
    constructor(bpm: number, musicSheet: MusicSheet, cursor: Cursor, playCallback: (arr: Array<any>) => void) {
        this.bpm = bpm;
        this.musicSheet = musicSheet;
        this.cursor = cursor;
        this.playCallback = playCallback;
    }

    private playCallback: (arr: Array<any>) => void;
    public musicSheet: MusicSheet;
    public bpm: number = 80;
    public cursor: Cursor;
    private isPlay: boolean = false;
    public pauseTime: number = 0;
    public pauseWaitTime: number = 0;
    public startTime: number = 0;
    public currentTimestamp: number = 0;
    public currentMeasureTimestamp: number = 0;

    public startPlay(): void {
        this.isPlay = true;
        if (this.pauseTime !== 0) {
            this.pauseWaitTime += (new Date().getTime() - this.pauseTime);
        } else {
            this.startTime = new Date().getTime();
        }

        this.loop(0, this);
    }

    public stopPlay(): void {
        this.pauseTime = new Date().getTime();
        this.isPlay = false;
    }


    public loop(delay: number, instance: MusicSheetPlayer): void {
        const thisPtr: MusicSheetPlayer = instance;
        //每个cursor为一个循环
        setTimeout(function (): void {
            if (thisPtr.isPlay) {
                thisPtr.cursor.next();
                thisPtr.playCallback(thisPtr.cursor.CurrentVoiceKey);
                const nextRealValue: number = thisPtr.cursor.Iterator.nextVoiceEntryTimeStemp(thisPtr.musicSheet.SheetPlaybackSetting.rhythm);
                thisPtr.currentTimestamp = nextRealValue;
                if (thisPtr.cursor.Iterator.getCurrentMeasureBpm() !== 0) {
                    thisPtr.bpm = thisPtr.cursor.Iterator.getCurrentMeasureBpm();
                }
                delay = ( thisPtr.currentTimestamp) * thisPtr.musicSheet.SheetPlaybackSetting.rhythm.Numerator * (60000 / thisPtr.bpm );
                const offset: number = new Date().getTime() - thisPtr.startTime - thisPtr.pauseWaitTime;
                thisPtr.loop(delay - offset, instance);
            }
        },         delay);

        //等待音符的CurrentSourceTimestamp的时间到下一个指针
    }
}
