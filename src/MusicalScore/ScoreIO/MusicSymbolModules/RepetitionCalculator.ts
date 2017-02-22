import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {RepetitionInstruction, RepetitionInstructionEnum, AlignmentType} from "../../VoiceData/Instructions/RepetitionInstruction";
import {ArgumentOutOfRangeException} from "../../Exceptions";
import {MusicSheet} from "../../MusicSheet";

export class RepetitionCalculator {
  private musicSheet: MusicSheet;
  private repetitionInstructions: RepetitionInstruction[] = [];
  private lastRepetitionCommonPartStartIndex: number = 0;
  private currentMeasure: SourceMeasure;
  private currentMeasureIndex: number;

  /**
   * Is called when all repetition symbols have been read from xml.
   * Creates the repetition instructions and adds them to the corresponding measure.
   * Creates the logical repetition objects for iteration and playback.
   * @param musicSheet
   * @param repetitionInstructions
   */
  public calculateRepetitions(musicSheet: MusicSheet, repetitionInstructions: RepetitionInstruction[]): void {
    this.musicSheet = <MusicSheet>musicSheet;
    this.repetitionInstructions = repetitionInstructions;
    this.lastRepetitionCommonPartStartIndex = 0;
    let sourceMeasures: SourceMeasure[] = this.musicSheet.SourceMeasures;
    for (let idx: number = 0, len: number = this.repetitionInstructions.length; idx < len; ++idx) {
      let instruction: RepetitionInstruction = this.repetitionInstructions[idx];
      this.currentMeasureIndex = instruction.measureIndex;
      this.currentMeasure = sourceMeasures[this.currentMeasureIndex];
      this.handleRepetitionInstructions(instruction);
    }

    // if there are more than one instruction at measure begin or end,
    // sort them according to the nesting of the repetitions:
    for (let idx: number = 0, len: number = this.musicSheet.SourceMeasures.length; idx < len; ++idx) {
      let measure: SourceMeasure = this.musicSheet.SourceMeasures[idx];
      if (measure.FirstRepetitionInstructions.length > 1) {
        measure.FirstRepetitionInstructions.sort(RepetitionInstruction.compare);
      }
      if (measure.LastRepetitionInstructions.length > 1) {
        measure.LastRepetitionInstructions.sort(RepetitionInstruction.compare);
      }
    }
  }

  private handleRepetitionInstructions(currentRepetitionInstruction: RepetitionInstruction): boolean {
    switch (currentRepetitionInstruction.type) {
      case RepetitionInstructionEnum.StartLine:
        this.currentMeasure.FirstRepetitionInstructions.push(currentRepetitionInstruction);
        break;
      case RepetitionInstructionEnum.BackJumpLine:
        this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
        break;
      case RepetitionInstructionEnum.Ending:
        // set ending start or end
        if (currentRepetitionInstruction.alignment === AlignmentType.Begin) {  // ending start
          this.currentMeasure.FirstRepetitionInstructions.push(currentRepetitionInstruction);
        } else { // ending end
          for (let idx: number = 0, len: number = currentRepetitionInstruction.endingIndices.length; idx < len; ++idx) {
            this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
          }
        }
        break;
      case RepetitionInstructionEnum.Segno:
        this.currentMeasure.FirstRepetitionInstructions.push(currentRepetitionInstruction);
        break;
      case RepetitionInstructionEnum.Fine:
        this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
        break;
      case RepetitionInstructionEnum.ToCoda:
        this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
        break;
      case RepetitionInstructionEnum.Coda:
        this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
        break;
      case RepetitionInstructionEnum.DaCapo:
        this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
        break;
      case RepetitionInstructionEnum.DalSegno:
        this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
        break;
      case RepetitionInstructionEnum.DalSegnoAlFine:
        this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
        break;
      case RepetitionInstructionEnum.DaCapoAlFine:
        this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
        break;
      case RepetitionInstructionEnum.DalSegnoAlCoda:
        this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
        break;
      case RepetitionInstructionEnum.DaCapoAlCoda:
        this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
        break;
      case RepetitionInstructionEnum.None:
        break;
      default:
        throw new ArgumentOutOfRangeException("currentRepetitionInstruction");
    }
    return true;
  }
}
