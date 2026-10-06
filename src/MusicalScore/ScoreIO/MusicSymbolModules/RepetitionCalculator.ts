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
  /** The Fine, To Coda and coda signs that no repetition takes: they are added to their measures after the sorting. */
  private drawnOnlyInstructions: RepetitionInstruction[] = [];
  /** Where a repetition without a start line (forward repeat or segno) starts:
   *  after the last backward jump or ending, or at the start of the movement. */
  private lastRepetitionCommonPartStartIndex: number = 0;
  /** The first measure of the current movement, where a D.C. jumps to. */
  private movementStartIndex: number = 0;
  /** The first measures of the movements after the first one (where the measure numbers restart). */
  private movementStartIndices: number[] = [];
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
    this.drawnOnlyInstructions = [];
    this.lastRepetitionCommonPartStartIndex = 0;
    this.movementStartIndex = 0;

    const sourceMeasures: SourceMeasure[] = this.musicSheet.SourceMeasures;
    // Detect movement boundaries where measure numbers reset (e.g. multi-movement pieces without explicit <movement> tags).
    // Repetitions should not cross these boundaries.
    this.movementStartIndices = [];
    for (let i: number = 1; i < sourceMeasures.length; i++) {
      const curNum: number = sourceMeasures[i].MeasureNumberXML ?? sourceMeasures[i].MeasureNumber;
      const prevNum: number = sourceMeasures[i - 1].MeasureNumberXML ?? sourceMeasures[i - 1].MeasureNumber;
      if (curNum <= 1 && prevNum > 1) {
        this.movementStartIndices.push(i);
      }
    }

    let lastInstructionMeasureIndex: number = 0;
    // after a backward jump or an ending, for the instructions in the following measures
    let commonPartStartAfterJump: number = undefined;
    for (const instruction of this.repetitionInstructions) {
      this.currentMeasureIndex = instruction.measureIndex;
      if (commonPartStartAfterJump !== undefined && this.currentMeasureIndex >= commonPartStartAfterJump) {
        this.lastRepetitionCommonPartStartIndex = Math.max(this.lastRepetitionCommonPartStartIndex, commonPartStartAfterJump);
        commonPartStartAfterJump = undefined;
      }
      // If we crossed a movement boundary, finalize all open repetitions so they don't span across movements
      //   (the last one crossed, if a movement has no repetition instructions)
      if (this.currentMeasureIndex > lastInstructionMeasureIndex) {
        let crossedMovementStart: number = undefined;
        for (const movementStart of this.movementStartIndices) {
          if (movementStart > lastInstructionMeasureIndex && movementStart <= this.currentMeasureIndex) {
            crossedMovementStart = Math.max(movementStart, crossedMovementStart ?? movementStart);
          }
        }
        if (crossedMovementStart !== undefined) {
          while (this.openRepetitions.length > 0) {
            this.finalizeRepetition(this.openRepetitions.last());
          }
          this.lastRepetitionCommonPartStartIndex = crossedMovementStart;
          this.movementStartIndex = crossedMovementStart;
        }
      }
      lastInstructionMeasureIndex = this.currentMeasureIndex;
      try {
        this.currentMeasure = sourceMeasures[this.currentMeasureIndex];
        this.handleRepetitionInstructions(instruction);
        // a repetition without a start line starts after a backward jump or an ending (in a following measure)
        if (instruction.type === RepetitionInstructionEnum.Ending ? instruction.alignment !== AlignmentType.Begin :
            RepetitionCalculator.isBackwardJump(instruction.type)) {
          commonPartStartAfterJump = this.currentMeasureIndex + 1;
        }
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
              // A forward repeat without a backward repeat is repeated until the end of the piece.
              //   A repetition without a forward repeat and without a backward jump repeats nothing, e.g. one from an ending
              //   without any repeat sign (played once) or one left open by a D.C. al Coda: finalizeRepetition() drops it.
              if (last.RepetitonUnderConstruction.BackwardJumpInstructions.length === 0 &&
                  last.RepetitonUnderConstruction.startMarker?.type !== RepetitionInstructionEnum.None) {
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
    // (after the sorting, which they would change: the comparer doesn't order instructions without a repetition),
    //   unless a repetition added one of the same kind there, e.g. the Fine that a D.C. al Fine found backwards
    for (const instruction of this.drawnOnlyInstructions) {
      const lastInstructions: RepetitionInstruction[] = this.musicSheet.SourceMeasures[instruction.measureIndex].LastRepetitionInstructions;
      if (!lastInstructions.some(other => other.type === instruction.type)) {
        lastInstructions.push(instruction);
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

  /**
   * How an instruction is played: as written, except for a D.C. or D.S. with a Fine or a To Coda before it in its movement
   * (for a D.S., after its segno), which goes back and ends at that Fine or jumps at that To Coda, as the D.C. / D.S. al Fine
   * or al Coda it is (<sound dacapo="yes"/> can't say which). The instruction keeps its type, so its label reads as written.
   */
  private typePlayedAs(instruction: RepetitionInstruction): RepetitionInstructionEnum {
    const before: (type: RepetitionInstructionEnum, minMeasureIndex?: number) => boolean =
      (type: RepetitionInstructionEnum, minMeasureIndex?: number): boolean =>
        this.findInstructionInMainListBackwards(type, instruction.measureIndex, minMeasureIndex) >= 0;
    switch (instruction.type) {
      case RepetitionInstructionEnum.DaCapo:
        return before(RepetitionInstructionEnum.Fine) ? RepetitionInstructionEnum.DaCapoAlFine :
          before(RepetitionInstructionEnum.ToCoda) ? RepetitionInstructionEnum.DaCapoAlCoda : instruction.type;
      case RepetitionInstructionEnum.DalSegno: {
        // A Fine or To Coda before the segno isn't reached after the jump.
        //   Without a segno, the D.S. goes back like a backward repeat without a forward repeat, and plays on to the end.
        const segnoMeasureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.Segno, instruction.measureIndex);
        if (segnoMeasureIndex < 0) {
          return instruction.type;
        }
        return before(RepetitionInstructionEnum.Fine, segnoMeasureIndex) ? RepetitionInstructionEnum.DalSegnoAlFine :
          before(RepetitionInstructionEnum.ToCoda, segnoMeasureIndex) ? RepetitionInstructionEnum.DalSegnoAlCoda : instruction.type;
      }
      default:
        return instruction.type;
    }
  }

  private handleRepetitionInstructions(currentRepetitionInstruction: RepetitionInstruction): boolean {
    let currentRepetition: RepetitionBuildingContainer;
    switch (this.typePlayedAs(currentRepetitionInstruction)) {
        case RepetitionInstructionEnum.StartLine:
            currentRepetition = this.createNewRepetition(this.currentMeasureIndex);
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            currentRepetition.RepetitonUnderConstruction.FromWords = false;
            currentRepetition.RepetitonUnderConstruction.startMarker = currentRepetitionInstruction;
            this.currentMeasure.FirstRepetitionInstructions.push(currentRepetitionInstruction);
            break;
        case RepetitionInstructionEnum.BackJumpLine: {
            currentRepetition = this.getOrCreateCurrentRepetition2(false);
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.push(currentRepetitionInstruction);
            // A repeat sign at the barline of a D.C. or D.S. is played first, then the D.C. or D.S. (see isJumpAfterRepeat()):
            //   it goes before the D.C. or D.S., which is read first (the words come before the barline in the measure).
            const lastInstructions: RepetitionInstruction[] = this.currentMeasure.LastRepetitionInstructions;
            const jumpIndex: number = lastInstructions.findIndex(instruction => instruction.parentRepetition?.FromWords &&
                instruction.parentRepetition.BackwardJumpInstructions.indexOf(instruction) >= 0);
            lastInstructions.splice(jumpIndex >= 0 ? jumpIndex : lastInstructions.length, 0, currentRepetitionInstruction);
            if (currentRepetition.RepetitonUnderConstruction.EndingParts.length === 0) {
                this.finalizeRepetition(currentRepetition);
            }
            break;
        }
        case RepetitionInstructionEnum.Ending:
            // without a forward repeat, the repetition starts after the previous one (or at the start of the movement)
            currentRepetition = this.getOrCreateCurrentRepetition(this.lastRepetitionCommonPartStartIndex);
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
                        currentRepetition = this.createNewRepetition(this.lastRepetitionCommonPartStartIndex);
                        currentRepetition.RepetitonUnderConstruction.startMarker =
                          new RepetitionInstruction(this.lastRepetitionCommonPartStartIndex, RepetitionInstructionEnum.None);
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
            {
                // A repeat starting in the segno's measure (its forward repeat was read first) lies within the D.S. repetition:
                //   the D.S. repetition goes below it, so that the repeat's endings and backward jump go to the repeat,
                //   and the backward jump doesn't close the D.S. repetition before its D.S. is read.
                const count: number = this.openRepetitions.length;
                const repeat: RepetitionBuildingContainer = this.openRepetitions[count - 2];
                if (repeat && !repeat.RepetitonUnderConstruction.FromWords &&
                    repeat.RepetitonUnderConstruction.BackwardJumpInstructions.length === 0 &&
                    repeat.RepetitonUnderConstruction.StartIndex === this.currentMeasureIndex) {
                    this.openRepetitions[count - 2] = currentRepetition;
                    this.openRepetitions[count - 1] = repeat;
                }
            }
            break;
        case RepetitionInstructionEnum.Fine:
            currentRepetition = this.openRepetitions.length > 0 ? this.getCurrentRepetition(true) : undefined;
            if (currentRepetition === undefined || currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction !== undefined) {
                // no open repetition takes it (yet), e.g. before the D.C. al Fine that finds it backwards
                this.addDrawnOnlyInstruction(currentRepetitionInstruction);
                break;
            }
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            currentRepetition.RepetitonUnderConstruction.FromWords = true;
            currentRepetition.FineFound = true;
            currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction = currentRepetitionInstruction;
            currentRepetition.RepetitonUnderConstruction.setEndingStartIndex(2, this.getFineTarget());
            this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
            break;
        case RepetitionInstructionEnum.ToCoda:
            currentRepetition = this.openRepetitions.length > 0 ? this.getCurrentRepetition(true) : undefined;
            if (currentRepetition === undefined || currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction !== undefined) {
                // no open repetition takes it (yet), e.g. before the D.C. al Coda that finds it backwards
                this.addDrawnOnlyInstruction(currentRepetitionInstruction);
                break;
            }
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            currentRepetition.RepetitonUnderConstruction.FromWords = true;
            currentRepetition.ToCodaFound = true;
            currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction = currentRepetitionInstruction;
            this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
            break;
        case RepetitionInstructionEnum.Coda:
            if (this.openRepetitions.length === 0) {
                // (a D.C. or D.S. al Coda after it may take it as its To Coda, see removeDrawnOnlyCoda())
                this.addDrawnOnlyInstruction(currentRepetitionInstruction);
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
                    this.addDrawnOnlyInstruction(currentRepetitionInstruction);
                }
            } else {
                this.addDrawnOnlyInstruction(currentRepetitionInstruction);
            }
            break;
        case RepetitionInstructionEnum.DaCapo:
            currentRepetition = this.getOrCreateCurrentRepetition(this.movementStartIndex);
            if (currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.length > 0) {
                // the D.C. gets its own repetition, also after one that starts where the D.C. jumps to (with endings, so still open)
                this.finalizeRepetition(currentRepetition);
                currentRepetition = this.createNewRepetition(this.movementStartIndex);
            } else if (currentRepetition.RepetitonUnderConstruction.StartIndex !== this.movementStartIndex) {
                currentRepetition = this.createNewRepetition(this.movementStartIndex);
            }
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            currentRepetition.RepetitonUnderConstruction.FromWords = true;
            currentRepetition.RepetitonUnderConstruction.startMarker =
              new RepetitionInstruction(this.movementStartIndex, RepetitionInstructionEnum.None, AlignmentType.Begin,
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
                currentRepetition = this.createNewRepetition(this.movementStartIndex);
                currentRepetition.RepetitonUnderConstruction.FromWords = true;
                currentRepetition.RepetitonUnderConstruction.startMarker =
                  new RepetitionInstruction(this.movementStartIndex, RepetitionInstructionEnum.None, AlignmentType.Begin,
                                            currentRepetition.RepetitonUnderConstruction);
            }
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            this.startAtSegnoBackwards(currentRepetition);
            if (currentRepetition.RepetitonUnderConstruction.EndingIndexDict.hasOwnProperty(1)) {
                currentRepetition.RepetitonUnderConstruction.setEndingEndIndex(1, this.currentMeasureIndex);
            }
            currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.push(currentRepetitionInstruction);
            this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
            break;
        case RepetitionInstructionEnum.DalSegnoAlFine:
            // (the segno's repetition may have been closed already, e.g. by a repeat sign after the segno: see startAtSegnoBackwards())
            if (this.openRepetitions.length === 0 &&
                this.findInstructionInMainListBackwards(RepetitionInstructionEnum.Segno, this.currentMeasureIndex) < 0) {
                break;
            }
            currentRepetition = this.getOrCreateCurrentRepetition2(true);
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            this.startAtSegnoBackwards(currentRepetition);
            if (!currentRepetition.FineFound) {
                // (a Fine before the segno isn't reached after the jump)
                const fineMeasureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.Fine,
                                                                                         currentRepetitionInstruction.measureIndex,
                                                                                         currentRepetition.RepetitonUnderConstruction.StartIndex);
                if (fineMeasureIndex >= 0) {
                    currentRepetition.FineFound = true;
                    currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction =
                      this.createFoundInstruction(RepetitionInstructionEnum.Fine, fineMeasureIndex, currentRepetition.RepetitonUnderConstruction);
                    currentRepetition.RepetitonUnderConstruction.setEndingStartIndex(2, this.getFineTarget());
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
            currentRepetition = this.getOrCreateCurrentRepetition(this.movementStartIndex);
            if (currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.length > 0) {
                this.finalizeRepetition(currentRepetition);
                currentRepetition = this.createNewRepetition(this.movementStartIndex);
            }
            if (currentRepetition.RepetitonUnderConstruction.startMarker !== undefined &&
                currentRepetition.RepetitonUnderConstruction.StartIndex !== this.movementStartIndex) {
                currentRepetition = this.createNewRepetition(this.movementStartIndex);
            }
            currentRepetition.RepetitonUnderConstruction.startMarker =
              new RepetitionInstruction(this.movementStartIndex, RepetitionInstructionEnum.None, AlignmentType.Begin,
                                        currentRepetition.RepetitonUnderConstruction);
            currentRepetition.RepetitonUnderConstruction.FromWords = true;
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            if (!currentRepetition.FineFound) {
                const fineMeasureIndex: number = this.findInstructionInMainListBackwards( RepetitionInstructionEnum.Fine,
                                                                                          currentRepetitionInstruction.measureIndex);
                if (fineMeasureIndex >= 0) {
                    currentRepetition.FineFound = true;
                    currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction =
                      this.createFoundInstruction(RepetitionInstructionEnum.Fine, fineMeasureIndex, currentRepetition.RepetitonUnderConstruction);
                    currentRepetition.RepetitonUnderConstruction.setEndingStartIndex(2, this.getFineTarget());
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
            // (the segno's repetition may have been closed already, e.g. by a repeat sign after the segno: see startAtSegnoBackwards())
            if (this.openRepetitions.length === 0 &&
                this.findInstructionInMainListBackwards(RepetitionInstructionEnum.Segno, this.currentMeasureIndex) < 0) {
                break;
            }
            currentRepetition = this.getOrCreateCurrentRepetition2(true);
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            this.startAtSegnoBackwards(currentRepetition);
            if (!currentRepetition.ToCodaFound) {
                // (a To Coda before the segno isn't reached after the jump)
                const segnoMeasureIndex: number = currentRepetition.RepetitonUnderConstruction.StartIndex;
                const toCodaMeasureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.ToCoda,
                                                                                           currentRepetitionInstruction.measureIndex,
                                                                                           segnoMeasureIndex);
                if (toCodaMeasureIndex >= 0) {
                    currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction =
                      this.createFoundInstruction(RepetitionInstructionEnum.ToCoda, toCodaMeasureIndex, currentRepetition.RepetitonUnderConstruction);
                    this.musicSheet.SourceMeasures[toCodaMeasureIndex].LastRepetitionInstructions.
                      splice(0, 0, currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction);
                    currentRepetition.ToCodaFound = true;
                } else {
                    const measureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.Coda,
                                                                                         currentRepetitionInstruction.measureIndex,
                                                                                         segnoMeasureIndex);
                    if (measureIndex >= 0) {
                        currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction =
                          new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.ToCoda,
                                                    AlignmentType.Begin, currentRepetition.RepetitonUnderConstruction);
                        this.removeDrawnOnlyCoda(measureIndex); // the coda sign is drawn as the To Coda
                        this.musicSheet.SourceMeasures[measureIndex].LastRepetitionInstructions.
                          splice(0, 0, currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction);
                        currentRepetition.ToCodaFound = true;
                    }
                }
            }
            if (currentRepetition.ToCodaFound) {
                currentRepetition.WaitingForCoda = true;
                this.moveBelowOpenRepeats(currentRepetition);
            }
            if (!currentRepetition.RepetitonUnderConstruction.EndingIndexDict.hasOwnProperty(1)) {
                currentRepetition.RepetitonUnderConstruction.setEndingEndIndex(1, this.currentMeasureIndex);
            }
            currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.push(currentRepetitionInstruction);
            this.currentMeasure.LastRepetitionInstructions.push(currentRepetitionInstruction);
            break;
        case RepetitionInstructionEnum.DaCapoAlCoda:
            currentRepetition = this.getOrCreateCurrentRepetition(this.movementStartIndex);
            if (currentRepetition.RepetitonUnderConstruction.BackwardJumpInstructions.length > 0) {
                this.finalizeRepetition(currentRepetition);
                currentRepetition = this.createNewRepetition(this.movementStartIndex);
            } else if (currentRepetition.RepetitonUnderConstruction.EndingParts.length === 0) {
                currentRepetition = this.createNewRepetition(this.movementStartIndex);
            }
            if (currentRepetition.RepetitonUnderConstruction.startMarker !== undefined &&
                currentRepetition.RepetitonUnderConstruction.StartIndex !== this.movementStartIndex) {
                currentRepetition = this.createNewRepetition(this.movementStartIndex);
            }
            currentRepetition.RepetitonUnderConstruction.startMarker =
              new RepetitionInstruction(this.movementStartIndex, RepetitionInstructionEnum.None, AlignmentType.Begin,
                                        currentRepetition.RepetitonUnderConstruction);
            currentRepetition.RepetitonUnderConstruction.FromWords = true;
            currentRepetitionInstruction.parentRepetition = currentRepetition.RepetitonUnderConstruction;
            if (!currentRepetition.ToCodaFound) {
                const toCodaMeasureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.ToCoda,
                                                                                           currentRepetitionInstruction.measureIndex);
                if (toCodaMeasureIndex >= 0) {
                    currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction =
                      this.createFoundInstruction(RepetitionInstructionEnum.ToCoda, toCodaMeasureIndex, currentRepetition.RepetitonUnderConstruction);
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
                        this.removeDrawnOnlyCoda(measureIndex); // the coda sign is drawn as the To Coda
                        this.musicSheet.SourceMeasures[measureIndex].LastRepetitionInstructions.
                          splice(0, 0, currentRepetition.RepetitonUnderConstruction.forwardJumpInstruction);
                        currentRepetition.ToCodaFound = true;
                    }
                }
            }
            if (currentRepetition.ToCodaFound) {
                currentRepetition.WaitingForCoda = true;
                this.moveBelowOpenRepeats(currentRepetition);
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

  /**
   * Returns the measure index of the last instruction of the given type at or before startMeasureIndex, or -1.
   * @param minMeasureIndex the first measure to search, by default the start of the current movement
   */
  private findInstructionInMainListBackwards(instruction: RepetitionInstructionEnum, startMeasureIndex: number,
                                             minMeasureIndex: number = this.movementStartIndex): number {
      for (let i: number = this.repetitionInstructions.length - 1; i >= 0; i--) {
          const repetitionInstruction: RepetitionInstruction = this.repetitionInstructions[i];
          if (repetitionInstruction.measureIndex <= startMeasureIndex && repetitionInstruction.measureIndex >= minMeasureIndex &&
              repetitionInstruction.type === instruction) {
              return repetitionInstruction.measureIndex;
          }
      }
      return -1;
  }

  /**
   * Adds a Fine, To Coda or coda sign that no repetition takes to the current measure, e.g. a Fine without a D.C. al Fine,
   * so that it is drawn as written. It has no parent repetition: the iterator doesn't jump there.
   * @param readInstruction the instruction as read, whose words are drawn for it (see RepetitionInstruction.Words)
   */
  private addDrawnOnlyInstruction(readInstruction: RepetitionInstruction): void {
      const type: RepetitionInstructionEnum = readInstruction.type;
      const instruction: RepetitionInstruction = new RepetitionInstruction(this.currentMeasureIndex, type,
          type === RepetitionInstructionEnum.Coda ? AlignmentType.Begin : AlignmentType.End, undefined);
      instruction.Words = readInstruction.Words;
      this.drawnOnlyInstructions.push(instruction);
  }

  /**
   * Creates the instruction for a Fine or To Coda that a D.C. or D.S. found backwards, where the iterator ends or jumps,
   * with the words drawn for the one read there (see RepetitionInstruction.Words).
   */
  private createFoundInstruction(type: RepetitionInstructionEnum, measureIndex: number, repetition: Repetition): RepetitionInstruction {
      const instruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, type, AlignmentType.Begin, repetition);
      instruction.Words = this.repetitionInstructions.find(read => read.measureIndex === measureIndex && read.type === type)?.Words;
      return instruction;
  }

  /**
   * Puts a D.C. or D.S. al Coda repetition, which waits for its coda sign, below the open repeats that start within it,
   * e.g. one whose backward repeat is at the D.C.'s barline: they lie within it, and their backward repeat doesn't close it
   * before its coda sign is read (see getOrCreateCurrentRepetition2()).
   */
  private moveBelowOpenRepeats(repContainer: RepetitionBuildingContainer): void {
      let index: number = this.openRepetitions.indexOf(repContainer);
      while (index > 0) {
          const below: RepetitionBuildingContainer = this.openRepetitions[index - 1];
          const belowRep: Repetition = below.RepetitonUnderConstruction;
          if (belowRep.FromWords || belowRep.BackwardJumpInstructions.length > 0 || belowRep.startMarker === undefined ||
              belowRep.StartIndex < repContainer.RepetitonUnderConstruction.StartIndex) {
              return;
          }
          this.openRepetitions[index - 1] = repContainer;
          this.openRepetitions[index] = below;
          index--;
      }
  }

  /** Removes the drawn-only coda sign of a measure, whose coda sign a D.C. or D.S. al Coda takes as its To Coda. */
  private removeDrawnOnlyCoda(measureIndex: number): void {
      this.drawnOnlyInstructions = this.drawnOnlyInstructions.filter(instruction =>
          instruction.type !== RepetitionInstructionEnum.Coda || instruction.measureIndex !== measureIndex);
  }

  /**
   * Starts a D.S. repetition at the last segno before the D.S. in the movement, if the segno's own repetition wasn't found
   * (e.g. a repeat sign after the segno closed it, see getOrCreateCurrentRepetition2()).
   * The segno's instruction is reused, so that the segno isn't drawn twice.
   */
  private startAtSegnoBackwards(repContainer: RepetitionBuildingContainer): void {
      if (repContainer.SegnoFound) {
          return;
      }
      const segnoMeasureIndex: number = this.findInstructionInMainListBackwards(RepetitionInstructionEnum.Segno, this.currentMeasureIndex);
      if (segnoMeasureIndex < 0) {
          return;
      }
      repContainer.SegnoFound = true;
      const firstInstructions: RepetitionInstruction[] = this.musicSheet.SourceMeasures[segnoMeasureIndex].FirstRepetitionInstructions;
      let segno: RepetitionInstruction = firstInstructions.find(instruction => instruction.type === RepetitionInstructionEnum.Segno);
      if (!segno) {
          segno = new RepetitionInstruction(segnoMeasureIndex, RepetitionInstructionEnum.Segno, AlignmentType.Begin);
          firstInstructions.splice(0, 0, segno);
      }
      segno.parentRepetition = repContainer.RepetitonUnderConstruction;
      repContainer.RepetitonUnderConstruction.startMarker = segno;
  }

  /**
   * Returns where a D.C. or D.S. al Fine goes on at its Fine: the start of the next movement, or -2 (the end of the piece)
   * in the last movement.
   */
  private getFineTarget(): number {
      return this.movementStartIndices.find(movementStart => movementStart > this.currentMeasureIndex) ?? -2;
  }

  /** Whether the instruction type jumps back: a backward repeat, D.C. or D.S. */
  private static isBackwardJump(type: RepetitionInstructionEnum): boolean {
      switch (type) {
          case RepetitionInstructionEnum.BackJumpLine:
          case RepetitionInstructionEnum.DaCapo:
          case RepetitionInstructionEnum.DaCapoAlFine:
          case RepetitionInstructionEnum.DaCapoAlCoda:
          case RepetitionInstructionEnum.DalSegno:
          case RepetitionInstructionEnum.DalSegnoAlFine:
          case RepetitionInstructionEnum.DalSegnoAlCoda:
              return true;
          default:
              return false;
      }
  }
  /**
   * Whether two repetitions that cover the same measures are two jumps: a D.C. or D.S. from the same barline as a repeat sign,
   * or from a later measure (e.g. in its last ending). The repeat is played first (see RepetitionInstructionEnum.BackJumpLine
   * above), then the D.C. or D.S., after which the iterator doesn't take the repeat again, so neither restarts the other.
   * (The backward repeat that is added at the end of the piece for a forward repeat without one isn't written: it is merged
   * with a D.C. or D.S. there, as before.)
   */
  private isJumpAfterRepeat(currentRep: Repetition, lastRep: Repetition): boolean {
      const currentJumpIndex: number = currentRep.BackwardJumpInstructions.last().measureIndex;
      const lastJumpIndex: number = lastRep.BackwardJumpInstructions.last().measureIndex;
      if (currentRep.FromWords && currentJumpIndex > lastJumpIndex) {
          return true;
      }
      if (currentRep.FromWords === lastRep.FromWords) {
          return false;
      }
      const repeat: Repetition = currentRep.FromWords ? lastRep : currentRep;
      const jump: Repetition = currentRep.FromWords ? currentRep : lastRep;
      return this.repetitionInstructions.indexOf(repeat.BackwardJumpInstructions.last()) >= 0 &&
          jump.BackwardJumpInstructions.last().measureIndex >= repeat.BackwardJumpInstructions.last().measureIndex;
  }

  private finalizeRepetition(repContainer: RepetitionBuildingContainer): void {
      const currentRep: Repetition = repContainer.RepetitonUnderConstruction;
      if (currentRep.BackwardJumpInstructions.length > 0) {
          // A first ending with no second ending written after it (the "2." bracket is often left out) is played on
          //   every pass but the last, which goes on right after it. That measure is its second ending,
          //   as the end of the piece is for a Fine (see RepetitionInstructionEnum.Fine above).
          if (currentRep.NumberOfEndings === 1 && currentRep.EndingIndexDict[1]) {
              const afterFirstEnding: number = currentRep.EndingIndexDict[1].part.EndIndex + 1;
              currentRep.setEndingStartIndex(2, afterFirstEnding < this.musicSheet.SourceMeasures.length ? afterFirstEnding : -2);
          }
          let addRepetition: boolean = true;
          const lastRep: Repetition = this.getLastFinalizedRepetition();
          // The same repetition read twice is kept once, the one with more endings, e.g. with the Fine of a D.C. al Fine.
          //   A D.C. or D.S. and a repeat sign that jump back to the same measure are two jumps, see isJumpAfterRepeat().
          if (lastRep !== undefined && currentRep.coversIdenticalMeasures(lastRep) &&
              !this.isJumpAfterRepeat(currentRep, lastRep)) {
              if (currentRep.NumberOfEndings > lastRep.NumberOfEndings) {
                  const index: number = this.musicSheet.Repetitions.indexOf(lastRep, 0);
                  if (index > -1) {
                    this.musicSheet.Repetitions.splice(index, 1);
                  }
                  lastRep.removeFromRepetitionInstructions();
                  this.musicSheet.Repetitions.push(currentRep);
              } else {
                  addRepetition = false;
                  currentRep.removeFromRepetitionInstructions();
              }
          } else {
              this.musicSheet.Repetitions.push(currentRep);
          }
          if (addRepetition) {
              if (currentRep.startMarker.type === RepetitionInstructionEnum.None) {
                  this.musicSheet.SourceMeasures[currentRep.StartIndex].FirstRepetitionInstructions.push(currentRep.startMarker);
              }
              let repetitions: number = currentRep.DefaultNumberOfRepetitions;
              if (currentRep.BackwardJumpInstructions.length === 1 && currentRep.BackwardJumpInstructions[0].Times > 0) {
                repetitions = currentRep.BackwardJumpInstructions[0].Times;
              }
              currentRep.UserNumberOfRepetitions = repetitions;
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
  //     if (rep.BackwardJumpInstructions.length > 0 && rep.EndingParts.length > 0 && rep.EndingParts.last().part.EndIndex + 1 < this.currentMeasureIndex) {
  //         this.finalizeRepetition(openRep);
  //     }
  // }
  /**
   * Returns the innermost open repetition from words (or from repeat signs), after finalizing the finished repetitions within it.
   * A repeat within it that has no backward jump yet stays open, e.g. one with a To Coda or Fine before its backward repeat.
   */
  private getCurrentRepetition(fromWords: boolean): RepetitionBuildingContainer {
      let currentRepetition: RepetitionBuildingContainer = undefined;
      for (let i: number = this.openRepetitions.length - 1; i >= 0; i--) {
          if (this.openRepetitions[i].RepetitonUnderConstruction.FromWords === fromWords) {
              currentRepetition = this.openRepetitions[i];
              while (i < this.openRepetitions.length - 1 &&
                     this.openRepetitions.last().RepetitonUnderConstruction.BackwardJumpInstructions.length > 0) {
                  this.finalizeRepetition(this.openRepetitions.last());
              }
              return currentRepetition;
          }
      }
      return currentRepetition;
  }
  /**
   * Returns the innermost open repetition, or a new one starting at startIndex (without a start line) if none is open.
   */
  private getOrCreateCurrentRepetition(startIndex: number): RepetitionBuildingContainer {
    if (this.openRepetitions.length > 0) {
        return this.openRepetitions.last();
    }
    const newRep: RepetitionBuildingContainer = this.createNewRepetition(startIndex);
    newRep.RepetitonUnderConstruction.startMarker = new RepetitionInstruction(startIndex, RepetitionInstructionEnum.None,
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
      const startIndex: number = Math.min(this.lastRepetitionCommonPartStartIndex, this.currentMeasureIndex);
      currentRepetition = this.createNewRepetition(startIndex);
      currentRepetition.RepetitonUnderConstruction.startMarker = new RepetitionInstruction(startIndex,
                                                                                           RepetitionInstructionEnum.None,
                                                                                           AlignmentType.Begin,
                                                                                           currentRepetition.RepetitonUnderConstruction);

      // protection against missing repeat begin lines: start next repetitions from after the end of this one if no beginning given
      //   see osmd-extended 117
      this.lastRepetitionCommonPartStartIndex = this.currentMeasureIndex + 1;

      currentRepetition.RepetitonUnderConstruction.FromWords = fromWords;
      return currentRepetition;
  }
  private createNewRepetition(commonPartStartIndex: number): RepetitionBuildingContainer {
      if (this.openRepetitions.length > 0) {
          const last: RepetitionBuildingContainer = this.openRepetitions.last();
          const lastRep: Repetition = last.RepetitonUnderConstruction;
          // (a D.C. or D.S. al Coda stays open until its coda sign, e.g. under a repeat sign at the same barline)
          if (lastRep.BackwardJumpInstructions.length > 0 && !last.WaitingForCoda) {
            const keys: string[] = Object.keys(lastRep.EndingIndexDict);
            if (keys.length === 0 ||
                lastRep.EndingIndexDict[keys[keys.length - 1]].part.EndIndex >= 0) {
                this.finalizeRepetition(last);
            }
          }
      }
      const currentRepetition: RepetitionBuildingContainer = new RepetitionBuildingContainer(this.musicSheet);
      // not back, e.g. for a D.C. from the start of the movement
      this.lastRepetitionCommonPartStartIndex = Math.max(this.lastRepetitionCommonPartStartIndex, commonPartStartIndex);
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
