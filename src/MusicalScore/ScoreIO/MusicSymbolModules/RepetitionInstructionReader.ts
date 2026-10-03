import {MusicSheet} from "../../MusicSheet";
import {IXmlElement} from "../../../Common/FileIO/Xml";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {RepetitionInstruction, RepetitionInstructionEnum, AlignmentType} from "../../VoiceData/Instructions/RepetitionInstruction";
import {RepetitionInstructionComparer} from "../../VoiceData/Instructions/RepetitionInstruction";
import {StringUtil} from "../../../Common/Strings/StringUtil";
export class RepetitionInstructionReader {
  /**
   * A global list of all repetition instructions in the musicsheet.
   */
  public repetitionInstructions: RepetitionInstruction[];
  public xmlMeasureList: IXmlElement[][];
  private musicSheet: MusicSheet;
  private currentMeasureIndex: number;

  public set MusicSheet(value: MusicSheet) {
    this.musicSheet = value;
    this.xmlMeasureList = new Array(this.musicSheet.Instruments.length);
    this.repetitionInstructions = [];
  }

  /**
   * is called when starting reading an xml measure
   * @param measure
   * @param currentMeasureIndex
   */
  public prepareReadingMeasure(measure: SourceMeasure, currentMeasureIndex: number): void {
    this.currentMeasureIndex = currentMeasureIndex;
  }

  public handleLineRepetitionInstructions(barlineNode: IXmlElement): boolean {
    let pieceEndingDetected: boolean = false;
    if (barlineNode.elements().length > 0) {
      let location: string = "";
      let hasRepeat: boolean = false;
      let direction: string = "";
      let type: string = "";
      let style: string = "";
      const endingIndices: number[] = [];

      // read barline style
      const styleNode: IXmlElement = barlineNode.element("bar-style");

      // if location is ommited in Xml, right is implied (from documentation)
      if (styleNode) {
        style = styleNode.value;
      }
      if (barlineNode.attributes().length > 0 && barlineNode.attribute("location")) {
        location = barlineNode.attribute("location").value;
      } else {
        location = "right";
      }
      const barlineNodeElements: IXmlElement[] = barlineNode.elements();

      // read repeat- or ending line information
      for (let idx: number = 0, len: number = barlineNodeElements.length; idx < len; ++idx) {
        const childNode: IXmlElement = barlineNodeElements[idx];
        if ("repeat" === childNode.name && childNode.hasAttributes) {
          hasRepeat = true;
          direction = childNode.attribute("direction").value;
        } else if ( "ending" === childNode.name && childNode.hasAttributes &&
                    childNode.attribute("type") !== undefined && childNode.attribute("number")) {
          if (childNode.attribute("print-object")?.value === "no") {
            continue;
            // Finale only puts print-object="no" at the (duplicated) <ending> node at thestart of measure barline,
            //   making this uneffective. Unclear whether the intention is to render the volta or not. (See #1367)
          }
          type = childNode.attribute("type").value;
          let num: string = childNode.attribute("number").value;
          if (childNode.value) {
            num = childNode.value;
            // MusicXML spec: "The element text is used when the text displayed in the ending is different than what appears in the number attribute."
            //   Finale v27.3 accordingly seems to put the desired printed number here instead of in "number" (#1367)
          }

          // Parse the given ending indices:
          // handle cases like: "1, 2" or "1 + 2" or even "1 - 3, 6"
          const separatedEndingIndices: string[] = num.split("[,+]");
          for (let idx2: number = 0, len2: number = separatedEndingIndices.length; idx2 < len2; ++idx2) {
            const separatedEndingIndex: string = separatedEndingIndices[idx2];
            const indices: string[] = separatedEndingIndex.match("[0-9]");

            // check if possibly something like "1-3" is given..
            if (separatedEndingIndex.search("-") !== -1 && indices.length === 2) {
              const startIndex: number = parseInt(indices[0], 10);
              const endIndex: number = parseInt(indices[1], 10);
              for (let index: number = startIndex; index <= endIndex; index++) {
                endingIndices.push(index);
              }
            } else {
              for (let idx3: number = 0, len3: number = indices.length; idx3 < len3; ++idx3) {
                const index: string = indices[idx3];
                endingIndices.push(parseInt(index, 10));
              }
            }
          }
        }
      }

      // reset measure counter if not lastMeasure
      if (style === "light-heavy" && endingIndices.length === 0 && !hasRepeat) {
        pieceEndingDetected = true;
      }
      if (hasRepeat || endingIndices.length > 0) {
        if (location === "left") {
          if (type === "start") {
            const newInstruction: RepetitionInstruction = new RepetitionInstruction(this.currentMeasureIndex, RepetitionInstructionEnum.Ending,
                                                                                    AlignmentType.Begin, undefined, endingIndices);
            this.addInstruction(this.repetitionInstructions, newInstruction);
          }
          if (direction === "forward") {
            // start new Repetition
            const newInstruction: RepetitionInstruction = new RepetitionInstruction(this.currentMeasureIndex, RepetitionInstructionEnum.StartLine);
            this.addInstruction(this.repetitionInstructions, newInstruction);
          }
        } else { // location right
          if (type === "stop") {
            const newInstruction: RepetitionInstruction = new RepetitionInstruction(this.currentMeasureIndex, RepetitionInstructionEnum.Ending,
                                                                                    AlignmentType.End, undefined, endingIndices);
            this.addInstruction(this.repetitionInstructions, newInstruction);
          } else if (type === "discontinue") {
            const newInstruction: RepetitionInstruction = new RepetitionInstruction(
              this.currentMeasureIndex, RepetitionInstructionEnum.Ending,
              AlignmentType.Discontinue, undefined, endingIndices);
            this.addInstruction(this.repetitionInstructions, newInstruction);
          }
          if (direction === "backward") {
            const newInstruction: RepetitionInstruction = new RepetitionInstruction(this.currentMeasureIndex, RepetitionInstructionEnum.BackJumpLine);
            this.addInstruction(this.repetitionInstructions, newInstruction);
          }
        }
      }
    }
    return pieceEndingDetected;
  }

  /**
   * Reads a repetition instruction (e.g. D.S., Fine, a segno sign) from a direction.
   * @param directionTypeNode the direction-type element (words, segno or coda)
   * @param relativeMeasurePosition the position of the direction in the measure (not used)
   * @param soundNode the direction's sound element, if any: <sound segno="..."> marks a segno as the target of a D.S.
   *   Its dacapo, dalsegno, fine, tocoda, segno and coda attributes say which instruction the direction is when its words
   *   don't name one themselves, e.g. "Fin", "Da Capo bis Ende" or "D.C. senza replica".
   * @returns true if the direction is a repetition instruction, false if it is drawn as text
   */
  public handleRepetitionInstructionsFromWordsOrSymbols(directionTypeNode: IXmlElement, relativeMeasurePosition: number,
                                                        soundNode?: IXmlElement): boolean {
    const wordsNode: IXmlElement = directionTypeNode.element("words");
    const measureIndex: number = this.currentMeasureIndex;
    if (wordsNode) {
      // An exporter may split the words where their formatting changes.
      const words: string = directionTypeNode.elements("words").map((node: IXmlElement): string => node.value).join("").trim();
      // Measure positions aren't adjusted by the relative position in the measure (relativeMeasurePosition):
      //   the instruction belongs to the measure it's written in (see test_staverepetitions_coda_etc_positioning.musicxml).
      let type: RepetitionInstructionEnum = RepetitionInstructionReader.repetitionInstructionFromWords(words.toLowerCase());
      // the words drawn instead of the instruction's label, if they say more than it or say it in another language
      let drawnWords: string = undefined;
      if (type === undefined) {
        // A D.C. or D.S. after a capitalized word, usually the section to play again, e.g. "Menuetto D.C." after a trio
        const named: RegExpMatchArray = words.match(/^[A-Z][a-zA-Z]*\s+(.+)$/);
        type = named ? RepetitionInstructionReader.repetitionInstructionFromWords(named[1].toLowerCase()) : undefined;
        if (!RepetitionInstructionReader.isJumpFromWords(type)) {
          // Words that don't name an instruction, e.g. in a language other than Italian or English, or with more words, e.g.
          //   "D.C. senza replica": the sound says which instruction they are, if any.
          //   Otherwise they are a general text -> render as text (e.g. UnknownExpression)
          type = RepetitionInstructionReader.repetitionInstructionFromSound(soundNode);
          if (type === undefined) {
            return false;
          }
        }
        // (a segno or coda sign is drawn as the sign)
        if (words.length > 0 && type !== RepetitionInstructionEnum.Segno && type !== RepetitionInstructionEnum.Coda) {
          drawnWords = words.replace(/\s+/g, " "); // drawn in one line
        }
      }
      const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, type);
      newInstruction.Words = drawnWords;
      newInstruction.MarkedAsTarget = type === RepetitionInstructionEnum.Segno && !!soundNode?.attribute("segno");
      this.addInstruction(this.repetitionInstructions, newInstruction);
      return true;
    } else if (directionTypeNode.element("segno")) {
      // if (relativeMeasurePosition > 0.5) {
      //   measureIndex++;
      // }
      const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.Segno);
      newInstruction.MarkedAsTarget = !!soundNode?.attribute("segno");
      this.addInstruction(this.repetitionInstructions, newInstruction);
      return true;
    } else if (directionTypeNode.element("coda")) {
      // if (relativeMeasurePosition > 0.5) {
      //   measureIndex++;
      // }
      const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.Coda);
      this.addInstruction(this.repetitionInstructions, newInstruction);
      return true;
    }
    return false;
  }

  /**
   * Returns the repetition instruction that the words are, or undefined if they are a general text,
   * which may mention an instruction, e.g. "voice tacet on D.S." (see #1687).
   * @param text the words, trimmed and in lower case
   */
  private static repetitionInstructionFromWords(text: string): RepetitionInstructionEnum {
    // regex strings: inputs for new RegExp(). The string escaping eliminates the first backslash of each \\.
    const dalSegno: string = "(d\\s?\\.\\s?s\\.|dal\\s?segno)"; // "d.s.", also with spaces, e.g. "d. s."
    const daCapo: string = "(d\\s?\\.\\s?c\\.|da\\s?capo)"; // "d.c.", also with spaces
    const al: string = "\\s?al\\s?"; // also without a space, e.g. "D.C.al Fine"
    const instructions: [string, RepetitionInstructionEnum][] = [
      [dalSegno + al + "fine", RepetitionInstructionEnum.DalSegnoAlFine],
      [dalSegno + al + "coda", RepetitionInstructionEnum.DalSegnoAlCoda],
      [dalSegno, RepetitionInstructionEnum.DalSegno],
      [daCapo + al + "fine", RepetitionInstructionEnum.DaCapoAlFine],
      [daCapo + al + "coda", RepetitionInstructionEnum.DaCapoAlCoda],
      [daCapo, RepetitionInstructionEnum.DaCapo],
      ["to\\s?coda|a (la )?coda", RepetitionInstructionEnum.ToCoda],
      ["fine", RepetitionInstructionEnum.Fine],
      ["coda", RepetitionInstructionEnum.Coda],
      ["segno", RepetitionInstructionEnum.Segno],
    ];
    for (const [regEx, type] of instructions) {
      if (StringUtil.StringIsWord(text, regEx, true)) {
        return type;
      }
    }
    return undefined;
  }

  /**
   * Returns the repetition instruction that the sound element's attributes mark, whatever the language of the words,
   * or undefined if they mark none.
   * @param soundNode the direction's sound element, if any
   */
  private static repetitionInstructionFromSound(soundNode: IXmlElement): RepetitionInstructionEnum {
    const instructions: [string, RepetitionInstructionEnum][] = [
      ["dacapo", RepetitionInstructionEnum.DaCapo],
      ["dalsegno", RepetitionInstructionEnum.DalSegno],
      ["tocoda", RepetitionInstructionEnum.ToCoda],
      ["fine", RepetitionInstructionEnum.Fine],
      ["segno", RepetitionInstructionEnum.Segno],
      ["coda", RepetitionInstructionEnum.Coda],
    ];
    for (const [attributeName, type] of instructions) {
      const value: string = soundNode?.attribute(attributeName)?.value;
      if (attributeName === "dacapo" ? value === "yes" : !!value) {
        return type;
      }
    }
    return undefined;
  }

  /** Whether the instruction type is a D.C. or D.S. (with or without al Fine / al Coda). */
  private static isJumpFromWords(type: RepetitionInstructionEnum): boolean {
    switch (type) {
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

  public removeRedundantInstructions(): void {
    let segnoCount: number = 0;
    let codaCount: number = 0;
    //const fineCount: number = 0;
    let toCodaCount: number = 0;
    let dalSegnaCount: number = 0;
    for (let index: number = 0; index < this.repetitionInstructions.length; index++) {
      const instruction: RepetitionInstruction = this.repetitionInstructions[index];
      switch (instruction.type) {
        case RepetitionInstructionEnum.Coda:
          if (toCodaCount > 0) {
            if (this.findInstructionInPreviousMeasure(index, instruction.measureIndex, RepetitionInstructionEnum.ToCoda)) {
              instruction.type = RepetitionInstructionEnum.None;
            }
          }
          // TODO this prevents a piece consisting of a single coda sign showing coda (will show To Coda)
          // if (codaCount === 0 && toCodaCount === 0) {
          //   instruction.type = RepetitionInstructionEnum.ToCoda;
          //   instruction.alignment = AlignmentType.End;
          //   instruction.measureIndex--;
          // }
          break;
        case RepetitionInstructionEnum.Segno:
          // Two segnos in a row: the second one is taken for a D.S. back to the first (e.g. a renvoi sign),
          //   unless the MusicXML marks it as a D.S. target itself (a segno that a later D.S. jumps to).
          if (segnoCount - dalSegnaCount > 0 && !instruction.MarkedAsTarget) {
            let foundInstruction: boolean = false;
            for (let idx: number = 0, len: number = this.repetitionInstructions.length; idx < len; ++idx) {
              const instr: RepetitionInstruction = this.repetitionInstructions[idx];
              if (instruction.measureIndex - instr.measureIndex === 1) {
                switch (instr.type) {
                  case RepetitionInstructionEnum.BackJumpLine:
                    if (toCodaCount - codaCount > 0) { // open toCoda existing
                      instr.type = RepetitionInstructionEnum.DalSegnoAlCoda;
                    } else {
                      instr.type = RepetitionInstructionEnum.DalSegno;
                    }
                    instruction.type = RepetitionInstructionEnum.None;
                    foundInstruction = true;
                    break;
                  case RepetitionInstructionEnum.DalSegno:
                  case RepetitionInstructionEnum.DalSegnoAlFine:
                  case RepetitionInstructionEnum.DalSegnoAlCoda:
                    instruction.type = RepetitionInstructionEnum.None;
                    foundInstruction = true;
                    break;
                  default:
                    break;
                }
              }
              if (foundInstruction) {
                break;
              }
            }
            if (foundInstruction) {
              break;
            }
            // convert to dal segno instruction:
            if (toCodaCount - codaCount > 0) { // open toCoda existing
              instruction.type = RepetitionInstructionEnum.DalSegnoAlCoda;
            } else {
              instruction.type = RepetitionInstructionEnum.DalSegno;
            }
            instruction.alignment = AlignmentType.End;
            instruction.measureIndex--;
          }
          break;
        default:
          break;
      }

      // check if this  instruction already exists or is otherwise redundant:
      if (this.backwardSearchForPreviousIdenticalInstruction(index, instruction) || instruction.type === RepetitionInstructionEnum.None) {
        this.repetitionInstructions.splice(index, 1);
        index--;
      } else {
        switch (instruction.type) {
          case RepetitionInstructionEnum.Fine:
            //fineCount++;
            break;
          case RepetitionInstructionEnum.ToCoda:
            toCodaCount++;
            break;
          case RepetitionInstructionEnum.Coda:
            codaCount++;
            break;
          case RepetitionInstructionEnum.Segno:
            segnoCount++;
            break;
          case RepetitionInstructionEnum.DalSegno: // it uses the segno before it, so a segno after it is a new one
          case RepetitionInstructionEnum.DalSegnoAlFine:
          case RepetitionInstructionEnum.DalSegnoAlCoda:
            dalSegnaCount++;
            break;
          default:
            break;
        }
      }
    }
    this.repetitionInstructions.sort(RepetitionInstructionComparer.Compare);
  }

  private findInstructionInPreviousMeasure(currentInstructionIndex: number, currentMeasureIndex: number, searchedType: RepetitionInstructionEnum): boolean {
    for (let index: number = currentInstructionIndex - 1; index >= 0; index--) {
      const instruction: RepetitionInstruction = this.repetitionInstructions[index];
      if (currentMeasureIndex - instruction.measureIndex === 1 && instruction.type === searchedType) {
        return true;
      }
    }
    return false;
  }

  private backwardSearchForPreviousIdenticalInstruction(currentInstructionIndex: number, currentInstruction: RepetitionInstruction): boolean {
    for (let index: number = currentInstructionIndex - 1; index >= 0; index--) {
      const instruction: RepetitionInstruction = this.repetitionInstructions[index];
      if (instruction.equals(currentInstruction)) {
        return true;
      }
    }
    return false;
  }

  private addInstruction(currentRepetitionInstructions: RepetitionInstruction[], newInstruction: RepetitionInstruction): void {
    let addInstruction: boolean = true;
    for (let idx: number = 0, len: number = currentRepetitionInstructions.length; idx < len; ++idx) {
      const repetitionInstruction: RepetitionInstruction = currentRepetitionInstructions[idx];
      if (newInstruction.equals(repetitionInstruction)) {
        addInstruction = false;
        break;
      }
    }
    if (addInstruction) {
      currentRepetitionInstructions.push(newInstruction);
    }
  }
}
