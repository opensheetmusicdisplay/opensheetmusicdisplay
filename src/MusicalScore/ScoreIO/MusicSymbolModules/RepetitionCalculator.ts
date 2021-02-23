import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {RepetitionInstruction, RepetitionInstructionEnum, AlignmentType} from "../../VoiceData/Instructions/RepetitionInstruction";
import {RepetitionInstructionComparer} from "../../VoiceData/Instructions/RepetitionInstruction";
import {ArgumentOutOfRangeException} from "../../Exceptions";
import {MusicSheet} from "../../MusicSheet";
import { Repetition } from "../../MusicSource";
import log from "loglevel";

export class RepetitionCalculator {
  private musicSheet: MusicSheet;
  private repetitionInstructions: RepetitionInstruction[] = [];
  private openRepetitions: RepetitionBuildingContainer[] = [];
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
    this.musicSheet = musicSheet;
    this.repetitionInstructions = repetitionInstructions;

    this.openRepetitions.length = 0;
    this.lastRepetitionCommonPartStartIndex = 0;

    const sourceMeasures: SourceMeasure[] = this.musicSheet.SourceMeasures;
    for (const instruction of this.repetitionInstructions) {
      this.currentMeasureIndex = instruction.measureIndex;
      try {
        this.currentMeasure = sourceMeasures[this.currentMeasureIndex];
        this.handleRepetitionInstructions(instruction);
      } catch (error) {
        log.error("RepetitionCalculator: calculateRepetitions", error);
      }
    }

    while (this.openRepetitions.length > 0) {
      try {
          const last: RepetitionBuildingContainer = this.openRepetitions.last();
          if (last.RepetitonUnderConstruction.FromWords) {
              if (last.WaitingForCoda) {
                  let endIndex: number = last.RepetitonUnderConstruction.BackwardJumpInstructions.last().measureIndex + 1;
                  if (endIndex >= this.musicSheet.SourceMeasures.length) {
                      endIndex = -1;
                  }
                  last.RepetitonUnderConstruction.setEndingStartIndex(2, endIndex);
              } else {
                  if (last.RepetitonUnderConstruction.BackwardJumpInstructions.length === 0) {
                      this.openRepetitions.splice(this.openRepetitions.length - 1, 1);
                      continue;
                  }
              }
          } else {
              if (last.RepetitonUnderConstruction.BackwardJumpInstructions.length === 0) {
                  const lastMeasureIndex: number = sourceMeasures.length - 1;
                  const backJumpInstruction: RepetitionInstruction = new RepetitionInstruction( lastMeasureIndex,
                                                                                                RepetitionInstructionEnum.BackJumpLine,
                                                                                                AlignmentType.End,
                                                                                                last.RepetitonUnderConstruction);
                  last.RepetitonUnderConstruction.BackwardJumpInstructions.push(backJumpInstruction);
                  sourceMeasures[lastMeasureIndex].LastRepetitionInstructions.push(backJumpInstruction);
              }
          }
          this.finalizeRepetition(this.openRepetitions.last());
      } catch (err) {
          try {
              const faultyRep: Repetition = this.openRepetitions.last().RepetitonUnderConstruction;
              for (const instruction of this.repetitionInstructions) {
                  if (instruction.parentRepetition === faultyRep) {
                      instruction.parentRepetition = undefined;
                  }
              }
              this.openRepetitions.splice(this.openRepetitions.length - 1, 1);
          } catch (error) {
            log.error("RepetitionCalculator: calculateRepetitions2", error);
          }
      }
    }
    let overallRepetition: boolean = false;
    const startMeasureIndex: number = 0;
    const endMeasureIndex: number = this.musicSheet.SourceMeasures.length - 1;
    for (const repetition of this.musicSheet.Repetitions) {
        if (repetition.StartIndex === startMeasureIndex && repetition.EndIndex === endMeasureIndex) {
            overallRepetition = true;
            break;
        }
    }
    if (!overallRepetition) {
        const repetition: Repetition = new Repetition(this.musicSheet, true);
        repetition.FromWords = true;
        repetition.startMarker = new RepetitionInstruction(startMeasureIndex, RepetitionInstructionEnum.StartLine);
        repetition.startMarker.parentRepetition = repetition;
        this.musicSheet.SourceMeasures[startMeasureIndex].FirstRepetitionInstructions.push(repetition.startMarker);
        repetition.endMarker = new RepetitionInstruction(endMeasureIndex, RepetitionInstructionEnum.BackJumpLine);
        repetition.endMarker.parentRepetition = repetition;
        repetition.BackwardJumpInstructions.push(repetition.endMarker);
        repetition.UserNumberOfRepetitions = repetition.DefaultNumberOfRepetitions;
        this.musicSheet.Repetitions.push(repetition);
    }

    // if there are more than one instruction at measure begin or end,
    // sort them according to the nesting of the repetitions:
    for (let idx: number = 0, len: number = this.musicSheet.SourceMeasures.length; idx < len; ++idx) {
      const measure: SourceMeasure = this.musicSheet.SourceMeasures[idx];
      if (measure.FirstRepetitionInstructions.length > 1) {
        measure.FirstRepetitionInstructions.sort(RepetitionInstructionComparer.Compare);
      }
      if (measure.LastRepetitionInstructions.length > 1) {
        measure.LastRepetitionInstructions.sort(RepetitionInstructionComparer.Compare);
      }
    }
  }

  // private handleRepetitionInstructions(currentRepetitionInstruction: RepetitionInstruction): boolean {
  //   if (!this.currentMeasure) {
  //     return false;
  //   }
  //   switch (currentRepetitionInstruction.type) {
  //     case RepetitionInstructionEnum.StartLine:
  //       this.currentMeasure.FirstRepetitionInstructions.push(currentRepetitionInstruction);
  //       break;
  //     case RepetitionInstructionEnum.BackJumpLine:
  //       this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
  //       break;
  //     case RepetitionInstructionEnum.Ending:
  //       // set ending start or end
  //       if (currentRepetitionInstruction.alignment ==== AlignmentType.Begin) {  // ending start
  //         this.currentMeasure.FirstRepetitionInstructions.push(currentRepetitionInstruction);
  //       } else { // ending end
  //         for (let idx: number = 0, len: number = currentRepetitionInstruction.endingIndices.length; idx < len; ++idx) {
  //           this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
  //         }
  //       }
  //       break;
  //     case RepetitionInstructionEnum.Segno:
  //       this.currentMeasure.FirstRepetitionInstructions.push(currentRepetitionInstruction);
  //       break;
  //     case RepetitionInstructionEnum.Fine:
  //       this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
  //       break;
  //     case RepetitionInstructionEnum.ToCoda:
  //       this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
  //       break;
  //     case RepetitionInstructionEnum.Coda:
  //       this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
  //       break;
  //     case RepetitionInstructionEnum.DaCapo:
  //       this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
  //       break;
  //     case RepetitionInstructionEnum.DalSegno:
  //       this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
  //       break;
  //     case RepetitionInstructionEnum.DalSegnoAlFine:
  //       this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
  //       break;
  //     case RepetitionInstructionEnum.DaCapoAlFine:
  //       this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
  //       break;
  //     case RepetitionInstructionEnum.DalSegnoAlCoda:
  //       this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
  //       break;
  //     case RepetitionInstructionEnum.DaCapoAlCoda:
  //       this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
  //       break;
  //     case RepetitionInstructionEnum.None:
  //       break;
  //     default:
  //       throw new ArgumentOutOfRangeException("currentRepetitionInstruction");
  //   }
  //   return true;
  // }

  private handleRepetitionInstructions(currentRepetitionInstruction: RepetitionInstruction): boolean {
    let currentRepetition: RepetitionBuildingContainer;
    switch (currentRepetitionInstruction.type) {
        case RepetitionInstructionEnum.StartLine:
            currentRepetition = this.createNewRepetition(this.currentMeasureIndex);
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            currentRepetition.RepetitonUnderConstruction.FromWords = false;
            currentRepetition.RepetitonUnderConstruction.startMarker = currentRepetitionInstruction;
            this.currentMeasure.FirstRepetitionInstructions.push(currentRepetitionInstruction);
            break;
        case RepetitionInstructionEnum.BackJumpLine:
            currentRepetition = this.getOrCreateCurrentRepetition2(false);
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.push(currentRepetitionInstruction);
            this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
            if (currentRepetition.RepetitonUnderConstruction.EndingParts.length === 0) {
                this.finalizeRepetition(currentRepetition);
            }
            break;
        case RepetitionInstructionEnum.Ending:
            currentRepetition = this.getOrCreateCurrentRepetition();
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            const isFirstEndingStart: boolean = currentRepetitionInstruction.endingIndices.contains(1) &&
                                                currentRepetitionInstruction.alignment === AlignmentType.Begin;
            if (isFirstEndingStart) {
                if (currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.length > 0 ||
                    currentRepetition.RepetitonUnderConstruction.EndingIndexDict.hasOwnProperty(1)) {
                    currentRepetition = undefined;
                    for (let i: number = this.openRepetitions.length - 1; i >= 0; i--) {
                        const openRep: RepetitionBuildingContainer = this.openRepetitions[i];
                        if (openRep.RepetitonUnderConstruction.BackwardJumpInstructions.length === 0) {
                            currentRepetition = openRep;
                            while (this.openRepetitions.length - 1 > i) {
                                const repToFinalize: RepetitionBuildingContainer = this.openRepetitions.last();
                                this.finalizeRepetition(repToFinalize);
                            }
                        }
                    }
                    if (currentRepetition === undefined) {
                        currentRepetition = this.createNewRepetition(0);
                        currentRepetition.RepetitonUnderConstruction.startMarker = new RepetitionInstruction(0, RepetitionInstructionEnum.None);
                    }
                }
                if (currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction === undefined) {
                    currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction =
                      new RepetitionInstruction(this.currentMeasureIndex - 1, RepetitionInstructionEnum.ForwardJump,
                                                AlignmentType.End,
                                                currentRepetition.RepetitonUnderConstruction);
                    this.musicSheet.SourceMeasures[this.currentMeasureIndex - 1].LastRepetitionInstructions.push(
                      currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction);
                }
            }
            if (currentRepetitionInstruction.alignment === AlignmentType.Begin) {
                currentRepetition.RepetitonUnderConstruction.setEndingsStartIndex(currentRepetitionInstruction.endingIndices, this.currentMeasureIndex);
                this.currentMeasure.FirstRepetitionInstructions.push(currentRepetitionInstruction);
            } else {
                for (let idx: number = 0, len: number = currentRepetitionInstruction.endingIndices.length; idx < len; ++idx) {
                    const endingIndex: number = currentRepetitionInstruction.endingIndices[idx];
                    currentRepetition.RepetitonUnderConstruction.setEndingEndIndex(endingIndex, this.currentMeasureIndex);
                    this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
                }
            }
            break;
        case RepetitionInstructionEnum.Segno:
            currentRepetition = this.getCurrentRepetition(true);
            if (currentRepetition !== undefined &&
                currentRepetition.SegnoFound &&
                currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.length > 0 &&
                Math.abs((currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.last().measureIndex - this.currentMeasureIndex)) <= 1) {
                break;
            }
            currentRepetition = this.createNewRepetition(this.currentMeasureIndex);
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            currentRepetition.RepetitonUnderConstruction.FromWords = true;
            currentRepetition.SegnoFound = true;
            currentRepetition.RepetitonUnderConstruction.startMarker = currentRepetitionInstruction;
            this.currentMeasure.FirstRepetitionInstructions.push(currentRepetitionInstruction);
            break;
        case RepetitionInstructionEnum.Fine:
            if (this.openRepetitions.length === 0) {
                break;
            }
            currentRepetition = this.getCurrentRepetition(true);
            if (currentRepetition === undefined) {
                break;
            }
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            currentRepetition.RepetitonUnderConstruction.FromWords = true;
            if (currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction === undefined) {
                currentRepetition.FineFound = true;
                currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction = currentRepetitionInstruction;
                currentRepetition.RepetitonUnderConstruction.setEndingStartIndex(2, -2);
                this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
            } else {
                this.currentMeasure.LastRepetitionInstructions.push(new RepetitionInstruction(this.currentMeasureIndex,
                                                                                              RepetitionInstructionEnum.Fine, AlignmentType.End, undefined));
            }
            break;
        case RepetitionInstructionEnum.ToCoda:
            if (this.openRepetitions.length === 0) {
                break;
            }
            currentRepetition = this.getCurrentRepetition(true);
            if (currentRepetition === undefined) {
                break;
            }
            if (currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction === undefined) {
                currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
                currentRepetition.RepetitonUnderConstruction.FromWords = true;
                currentRepetition.ToCodaFound = true;
                currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction = currentRepetitionInstruction;
                this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
            }
            break;
        case RepetitionInstructionEnum.Coda:
            if (this.openRepetitions.length === 0) {
                break;
            }
            currentRepetition = this.getOrCreateCurrentRepetition2(true);
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            if (currentRepetition.WaitingForCoda) {
                currentRepetition.CodaFound = true;
                currentRepetition.RepetitonUnderConstruction.setEndingStartIndex(2, this.currentMeasureIndex);
                this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
                this.finalizeRepetition(currentRepetition);
                if (this.currentMeasureIndex > 0) {
                    this.musicSheet.SourceMeasures[this.currentMeasureIndex - 1].printNewSystemXml = true;
                }
            } else if (!currentRepetition.ToCodaFound) {
                if (currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.length === 0) {
                    currentRepetition.ToCodaFound = true;
                    currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction =
                      new RepetitionInstruction(this.currentMeasureIndex,
                                                RepetitionInstructionEnum.ToCoda,
                                                AlignmentType.End,
                                                currentRepetition.RepetitonUnderConstruction);
                    this.currentMeasure.LastRepetitionInstructions.push(currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction);
                } else {
                    this.currentMeasure.LastRepetitionInstructions.push(new RepetitionInstruction(this.currentMeasureIndex,
                                                                                                  RepetitionInstructionEnum.Coda,
                                                                                                  AlignmentType.Begin, undefined));
                }
            }
            break;
        case RepetitionInstructionEnum.DaCapo:
            currentRepetition = this.getOrCreateCurrentRepetition();
            if (currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.length > 0) {
                this.finalizeRepetition(currentRepetition);
            }
            if (currentRepetition.RepetitonUnderConstruction.StartIndex !== 0) {
                currentRepetition = this.createNewRepetition(0);
            }
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            currentRepetition.RepetitonUnderConstruction.FromWords = true;
            currentRepetition.RepetitonUnderConstruction.startMarker = new RepetitionInstruction(0, RepetitionInstructionEnum.None,
                                                                                                 AlignmentType.Begin,
                                                                                                 currentRepetition.RepetitonUnderConstruction);
            currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.push(currentRepetitionInstruction);
            this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
            if (currentRepetition.RepetitonUnderConstruction.EndingParts.length === 0) {
                this.finalizeRepetition(currentRepetition);
            }
            break;
        case RepetitionInstructionEnum.DalSegno:
            currentRepetition = this.getOrCreateCurrentRepetition2(true);
            if (currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.length > 0) {
                this.finalizeRepetition(currentRepetition);
                currentRepetition = this.createNewRepetition(0);
                currentRepetition.RepetitonUnderConstruction.FromWords = true;
                currentRepetition.RepetitonUnderConstruction.startMarker = new RepetitionInstruction(0, RepetitionInstructionEnum.None,
                                                                                                     AlignmentType.Begin,
                                                                                                     currentRepetition.RepetitonUnderConstruction);
            }
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            if (!currentRepetition.SegnoFound) {
                const segnoMeasureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.Segno,
                                                                                          currentRepetitionInstruction.measureIndex);
                if (segnoMeasureIndex >= 0) {
                    currentRepetition.SegnoFound = true;
                    currentRepetition.RepetitonUnderConstruction.startMarker = new RepetitionInstruction( segnoMeasureIndex,
                                                                                                          RepetitionInstructionEnum.Segno,
                                                                                                          AlignmentType.Begin,
                                                                                                          currentRepetition.RepetitonUnderConstruction);
                    this.musicSheet.SourceMeasures[segnoMeasureIndex].FirstRepetitionInstructions.splice(
                      0, 0, currentRepetition.RepetitonUnderConstruction.startMarker);
                }
            }
            if (currentRepetition.RepetitonUnderConstruction.EndingIndexDict.hasOwnProperty(1)) {
                currentRepetition.RepetitonUnderConstruction.setEndingEndIndex(1, this.currentMeasureIndex);
            }
            currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.push(currentRepetitionInstruction);
            this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
            break;
        case RepetitionInstructionEnum.DalSegnoAlFine:
            if (this.openRepetitions.length === 0) {
                break;
            }
            currentRepetition = this.getOrCreateCurrentRepetition2(true);
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            if (!currentRepetition.SegnoFound) {
                const segnoMeasureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.Segno,
                                                                                          currentRepetitionInstruction.measureIndex);
                if (segnoMeasureIndex >= 0) {
                    currentRepetition.SegnoFound = true;
                    currentRepetition.RepetitonUnderConstruction.startMarker =
                      new RepetitionInstruction(segnoMeasureIndex, RepetitionInstructionEnum.Segno,
                                                AlignmentType.Begin, currentRepetition.RepetitonUnderConstruction);
                    this.musicSheet.SourceMeasures[segnoMeasureIndex].FirstRepetitionInstructions.
                      splice(0, 0, currentRepetition.RepetitonUnderConstruction.startMarker);
                }
            }
            if (!currentRepetition.FineFound) {
                const fineMeasureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.Fine,
                                                                                         currentRepetitionInstruction.measureIndex);
                if (fineMeasureIndex >= 0) {
                    currentRepetition.FineFound = true;
                    currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction =
                      new RepetitionInstruction(fineMeasureIndex, RepetitionInstructionEnum.Fine,
                                                AlignmentType.Begin, currentRepetition.RepetitonUnderConstruction);
                    currentRepetition.RepetitonUnderConstruction.setEndingStartIndex(2, -2);
                    this.musicSheet.SourceMeasures[fineMeasureIndex].LastRepetitionInstructions.
                      splice(0, 0, currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction);
                }
            }
            if (!currentRepetition.RepetitonUnderConstruction.EndingIndexDict.hasOwnProperty(1)) {
                currentRepetition.RepetitonUnderConstruction.setEndingEndIndex(1, this.currentMeasureIndex);
            }
            currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.push(currentRepetitionInstruction);
            this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
            break;
        case RepetitionInstructionEnum.DaCapoAlFine:
            currentRepetition = this.getOrCreateCurrentRepetition();
            if (currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.length > 0) {
                this.finalizeRepetition(currentRepetition);
                currentRepetition = this.createNewRepetition(0);
            }
            if (currentRepetition.RepetitonUnderConstruction.startMarker !== undefined && currentRepetition.RepetitonUnderConstruction.StartIndex !== 0) {
                currentRepetition = this.createNewRepetition(0);
            }
            currentRepetition.RepetitonUnderConstruction.startMarker = new RepetitionInstruction(0, RepetitionInstructionEnum.None,
                                                                                                 AlignmentType.Begin,
                                                                                                 currentRepetition.RepetitonUnderConstruction);
            currentRepetition.RepetitonUnderConstruction.FromWords = true;
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            if (!currentRepetition.FineFound) {
                const fineMeasureIndex: number = this.findInstructionInMainListBackwards( RepetitionInstructionEnum.Fine,
                                                                                          currentRepetitionInstruction.measureIndex);
                if (fineMeasureIndex >= 0) {
                    currentRepetition.FineFound = true;
                    currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction =
                      new RepetitionInstruction(fineMeasureIndex, RepetitionInstructionEnum.Fine,
                                                AlignmentType.Begin, currentRepetition.RepetitonUnderConstruction);
                    currentRepetition.RepetitonUnderConstruction.setEndingStartIndex(2, -2);
                    this.musicSheet.SourceMeasures[fineMeasureIndex].LastRepetitionInstructions.
                      splice(0, 0, currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction);
                }
            }
            if (!currentRepetition.RepetitonUnderConstruction.EndingIndexDict.hasOwnProperty(1)) {
                currentRepetition.RepetitonUnderConstruction.setEndingEndIndex(1, this.currentMeasureIndex);
            }
            currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.push(currentRepetitionInstruction);
            this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
            break;
        case RepetitionInstructionEnum.DalSegnoAlCoda:
            if (this.openRepetitions.length === 0) {
                break;
            }
            currentRepetition = this.getOrCreateCurrentRepetition2(true);
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            if (!currentRepetition.SegnoFound) {
                const segnoMeasureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.Segno,
                                                                                          currentRepetitionInstruction.measureIndex);
                if (segnoMeasureIndex >= 0) {
                    currentRepetition.SegnoFound = true;
                    currentRepetition.RepetitonUnderConstruction.startMarker =
                      new RepetitionInstruction(segnoMeasureIndex, RepetitionInstructionEnum.Segno,
                                                AlignmentType.Begin, currentRepetition.RepetitonUnderConstruction);
                    this.musicSheet.SourceMeasures[segnoMeasureIndex].FirstRepetitionInstructions.
                      splice(0, 0, currentRepetition.RepetitonUnderConstruction.startMarker);
                }
            }
            if (!currentRepetition.ToCodaFound) {
                const toCodaMeasureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.ToCoda,
                                                                                           currentRepetitionInstruction.measureIndex);
                if (toCodaMeasureIndex >= 0) {
                    currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction =
                      new RepetitionInstruction(toCodaMeasureIndex, RepetitionInstructionEnum.ToCoda,
                                                AlignmentType.Begin, currentRepetition.RepetitonUnderConstruction);
                    this.musicSheet.SourceMeasures[toCodaMeasureIndex].LastRepetitionInstructions.
                      splice(0, 0, currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction);
                    currentRepetition.ToCodaFound = true;
                } else {
                    const measureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.Coda,
                                                                                         currentRepetitionInstruction.measureIndex);
                    if (measureIndex >= 0) {
                        currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction =
                          new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.ToCoda,
                                                    AlignmentType.Begin, currentRepetition.RepetitonUnderConstruction);
                        this.musicSheet.SourceMeasures[measureIndex].LastRepetitionInstructions.
                          splice(0, 0, currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction);
                        currentRepetition.ToCodaFound = true;
                    }
                }
            }
            if (currentRepetition.ToCodaFound) {
                currentRepetition.WaitingForCoda = true;
            }
            if (!currentRepetition.RepetitonUnderConstruction.EndingIndexDict.hasOwnProperty(1)) {
                currentRepetition.RepetitonUnderConstruction.setEndingEndIndex(1, this.currentMeasureIndex);
            }
            currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.push(currentRepetitionInstruction);
            this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
            break;
        case RepetitionInstructionEnum.DaCapoAlCoda:
            currentRepetition = this.getOrCreateCurrentRepetition();
            if (currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.length > 0) {
                this.finalizeRepetition(currentRepetition);
                currentRepetition = this.createNewRepetition(0);
            } else if (currentRepetition.RepetitonUnderConstruction.EndingParts.length === 0) {
                currentRepetition = this.createNewRepetition(0);
            }
            if (currentRepetition.RepetitonUnderConstruction.startMarker !== undefined && currentRepetition.RepetitonUnderConstruction.StartIndex !== 0) {
                currentRepetition = this.createNewRepetition(0);
            }
            currentRepetition.RepetitonUnderConstruction.startMarker = new RepetitionInstruction(0, RepetitionInstructionEnum.None,
                                                                                                 AlignmentType.Begin,
                                                                                                 currentRepetition.RepetitonUnderConstruction);
            currentRepetition.RepetitonUnderConstruction.FromWords = true;
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            if (!currentRepetition.ToCodaFound) {
                const toCodaMeasureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.ToCoda,
                                                                                           currentRepetitionInstruction.measureIndex);
                if (toCodaMeasureIndex >= 0) {
                    currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction =
                      new RepetitionInstruction(toCodaMeasureIndex, RepetitionInstructionEnum.ToCoda,
                                                AlignmentType.Begin, currentRepetition.RepetitonUnderConstruction);
                    this.musicSheet.SourceMeasures[toCodaMeasureIndex].LastRepetitionInstructions.
                      splice(0, 0, currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction);
                    currentRepetition.ToCodaFound = true;
                } else {
                    const measureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.Coda,
                                                                                         currentRepetitionInstruction.measureIndex);
                    if (measureIndex >= 0) {
                        currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction =
                          new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.ToCoda,
                                                    AlignmentType.Begin, currentRepetition.RepetitonUnderConstruction);
                        this.musicSheet.SourceMeasures[measureIndex].LastRepetitionInstructions.
                          splice(0, 0, currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction);
                        currentRepetition.ToCodaFound = true;
                    }
                }
            }
            if (currentRepetition.ToCodaFound) {
                currentRepetition.WaitingForCoda = true;
            }
            if (!currentRepetition.RepetitonUnderConstruction.EndingIndexDict.hasOwnProperty(1)) {
                currentRepetition.RepetitonUnderConstruction.setEndingEndIndex(1, this.currentMeasureIndex);
            }
            currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.push(currentRepetitionInstruction);
            this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
            break;
        case RepetitionInstructionEnum.None:
            break;
        default:
            throw new ArgumentOutOfRangeException("currentRepetitionInstruction");
    }
    return true;
  }

  private findInstructionInMainListBackwards(instruction: RepetitionInstructionEnum, startMeasureIndex: number): number {
      for (let i: number = this.repetitionInstructions.length - 1; i >= 0; i--) {
          const repetitionInstruction: RepetitionInstruction = this.repetitionInstructions[i];
          {
              if (repetitionInstruction.measureIndex <= startMeasureIndex && repetitionInstruction.type === instruction) {
                  return repetitionInstruction.measureIndex;
              }
          }
      }
      return -1;
  }
  private finalizeRepetition(repContainer: RepetitionBuildingContainer): void {
      const currentRep: Repetition = repContainer.RepetitonUnderConstruction;
      if (currentRep.BackwardJumpInstructions.length > 0) {
          let addRepetition: boolean = true;
          const lastRep: Repetition = this.getLastFinalizedRepetition();
          if (lastRep !== undefined && currentRep.coversIdenticalMeasures(lastRep)) {
              if (currentRep.NumberOfEndings > lastRep.NumberOfEndings) {
                  const index: number = this.musicSheet.Repetitions.indexOf(lastRep, 0);
                  if (index > -1) {
                    this.musicSheet.Repetitions.splice(index, 1);
                  }
                  lastRep.removeFromRepetitionInstructions();
                  this.musicSheet.Repetitions.push(currentRep);
              }
              addRepetition = false;
              currentRep.removeFromRepetitionInstructions();
          } else {
              this.musicSheet.Repetitions.push(currentRep);
          }
          if (addRepetition) {
              if (currentRep.startMarker.type === RepetitionInstructionEnum.None) {
                  this.musicSheet.SourceMeasures[currentRep.StartIndex].FirstRepetitionInstructions.push(currentRep.startMarker);
              }
              currentRep.UserNumberOfRepetitions = currentRep.DefaultNumberOfRepetitions;
          }
      }
      this.openRepetitions.splice(this.openRepetitions.length - 1, 1);
  }
  // private tryFinalizingLatestOpenRepetition(): void {
  //     if (this.openRepetitions.length === 0) {
  //         return;
  //     }
  //     const openRep: RepetitionBuildingContainer = this.openRepetitions.last();
  //     const rep: Repetition = openRep.RepetitonUnderConstruction;
  //     if (rep.BackwardJumpInstructions.length > 0 && rep.EndingParts.length > 0 && rep.EndingParts.last().Part.EndIndex + 1 < this.currentMeasureIndex) {
  //         this.finalizeRepetition(openRep);
  //     }
  // }
  private getCurrentRepetition(fromWords: boolean): RepetitionBuildingContainer {
      let currentRepetition: RepetitionBuildingContainer = undefined;
      for (let i: number = this.openRepetitions.length - 1; i >= 0; i--) {
          if (this.openRepetitions[i].RepetitonUnderConstruction.FromWords === fromWords) {
              currentRepetition = this.openRepetitions[i];
              while (i < this.openRepetitions.length - 1) {
                  this.finalizeRepetition(this.openRepetitions.last());
              }
              return currentRepetition;
          }
      }
      return currentRepetition;
  }
  private getOrCreateCurrentRepetition(): RepetitionBuildingContainer {
    if (this.openRepetitions.length > 0) {
        return this.openRepetitions.last();
    }
    const newRep: RepetitionBuildingContainer = this.createNewRepetition(0);
    newRep.RepetitonUnderConstruction.startMarker = new RepetitionInstruction(0, RepetitionInstructionEnum.None,
                                                                              AlignmentType.Begin,
                                                                              newRep.RepetitonUnderConstruction);
    return newRep;
  }
  private getOrCreateCurrentRepetition2(fromWords: boolean): RepetitionBuildingContainer {
      let currentRepetition: RepetitionBuildingContainer = undefined;
      for (let i: number = this.openRepetitions.length - 1; i >= 0; i--) {
          currentRepetition = this.openRepetitions[i];
          if (currentRepetition.RepetitonUnderConstruction.FromWords === fromWords) {
              while (i < this.openRepetitions.length - 1) {
                  this.finalizeRepetition(this.openRepetitions.last());
              }
              return currentRepetition;
          }
      }
      currentRepetition = this.createNewRepetition(this.lastRepetitionCommonPartStartIndex);
      currentRepetition.RepetitonUnderConstruction.startMarker = new RepetitionInstruction(this.lastRepetitionCommonPartStartIndex,
                                                                                           RepetitionInstructionEnum.None,
                                                                                           AlignmentType.Begin,
                                                                                           currentRepetition.RepetitonUnderConstruction);
      currentRepetition.RepetitonUnderConstruction.FromWords = fromWords;
      return currentRepetition;
  }
  private createNewRepetition(commonPartStartIndex: number): RepetitionBuildingContainer {
      if (this.openRepetitions.length > 0) {
          const last: RepetitionBuildingContainer = this.openRepetitions.last();
          const lastRep: Repetition = last.RepetitonUnderConstruction;
          if (lastRep.BackwardJumpInstructions.length > 0) {
            const keys: string[] = Object.keys(lastRep.EndingIndexDict);
            if (keys.length === 0 ||
                lastRep.EndingIndexDict[keys[keys.length - 1]].Value.Part.EndIndex >= 0) {
                this.finalizeRepetition(last);
            }
          }
      }
      const currentRepetition: RepetitionBuildingContainer = new RepetitionBuildingContainer(this.musicSheet);
      this.lastRepetitionCommonPartStartIndex = commonPartStartIndex;
      this.openRepetitions.push(currentRepetition);
      return currentRepetition;
  }
  private getLastFinalizedRepetition(): Repetition {
      if (this.musicSheet.Repetitions.length > 0) {
          return this.musicSheet.Repetitions.last();
      }
      return undefined;
  }
}

export class RepetitionBuildingContainer {
  public RepetitonUnderConstruction: Repetition;
  public WaitingForCoda: boolean;
  public SegnoFound: boolean;
  public FineFound: boolean;
  public ToCodaFound: boolean;
  public CodaFound: boolean;
  constructor(musicSheet: MusicSheet) {
      this.RepetitonUnderConstruction = new Repetition(musicSheet);
  }
}
