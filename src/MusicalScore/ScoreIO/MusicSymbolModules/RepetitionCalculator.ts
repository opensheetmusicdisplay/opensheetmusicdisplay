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
        if (currentRepetitionInstruction.alignment === AlignmentType.Begin) {
          this.currentMeasure.FirstRepetitionInstructions.push(currentRepetitionInstruction);
        } else {
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
