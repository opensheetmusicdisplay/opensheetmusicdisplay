import {RepetitionInstructionReader} from "./MusicSymbolModules/RepetitionInstructionReader";
import {RepetitionCalculator} from "./MusicSymbolModules/RepetitionCalculator";

export class MusicSymbolModuleFactory {
  public static createRepetitionInstructionReader(): RepetitionInstructionReader {
    return new RepetitionInstructionReader();
  }

  public static createRepetitionCalculator(): RepetitionCalculator {
    return new RepetitionCalculator();
  }

  /*
   public static createExpressionGenerator(musicSheet: MusicSheet,
   instrument: Instrument, staffNumber: number): ExpressionReader {
   return new ExpressionReader(musicSheet, instrument, staffNumber);
   }

   public static createSlurReader(musicSheet: MusicSheet): SlurReader {
   return new SlurReader(musicSheet);
   }

   public static createLyricsReader(musicSheet: MusicSheet): LyricsReader {
   return new LyricsReader(musicSheet);
   }

   public static createArticulationReader(): ArticulationReader {
   return new ArticulationReader();
   }
   */
}
