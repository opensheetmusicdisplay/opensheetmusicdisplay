import {MusicSheet} from "../../MusicalScore/MusicSheet";
/**
 * Created by Matthias on 22.02.2017.
 */

export interface IAfterSheetReadingModule {
  calculate(musicSheet: MusicSheet): void;
}
