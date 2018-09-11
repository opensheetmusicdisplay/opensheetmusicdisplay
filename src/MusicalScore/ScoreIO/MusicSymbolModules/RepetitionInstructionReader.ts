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

  public handleLineRepetitionInstructions(barlineNode: IXmlElement, pieceEndingDetected: boolean): void {
    pieceEndingDetected = false;
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
      if (styleNode !== undefined) {
        style = styleNode.value;
      }
      if (barlineNode.attributes().length > 0 && barlineNode.attribute("location") !== undefined) {
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
                    childNode.attribute("type") !== undefined && childNode.attribute("number") !== undefined) {
          type = childNode.attribute("type").value;
          const num: string = childNode.attribute("number").value;

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
          if (type === "stop" || type === "discontinue") {
            const newInstruction: RepetitionInstruction = new RepetitionInstruction(this.currentMeasureIndex, RepetitionInstructionEnum.Ending,
                                                                                    AlignmentType.End, undefined, endingIndices);
            this.addInstruction(this.repetitionInstructions, newInstruction);
          }
          if (direction === "backward") {
            const newInstruction: RepetitionInstruction = new RepetitionInstruction(this.currentMeasureIndex, RepetitionInstructionEnum.BackJumpLine);
            this.addInstruction(this.repetitionInstructions, newInstruction);
          }
        }
      }
    }
  }

  public handleRepetitionInstructionsFromWordsOrSymbols(directionTypeNode: IXmlElement, relativeMeasurePosition: number): boolean {
    const wordsNode: IXmlElement = directionTypeNode.element("words");
    if (wordsNode !== undefined) {
      const dsRegEx: string = "d\\s?\\.s\\."; // Input for new RegExp(). TS eliminates the first \
      // must Trim string and ToLower before compare
      const innerText: string = wordsNode.value.trim().toLowerCase();
      if (StringUtil.StringContainsSeparatedWord(innerText, dsRegEx + " al fine")) {
        let measureIndex: number = this.currentMeasureIndex;
        if (relativeMeasurePosition < 0.5 && this.currentMeasureIndex < this.xmlMeasureList[0].length - 1) { // not in last measure
          measureIndex--;
        }
        const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.DalSegnoAlFine);
        this.addInstruction(this.repetitionInstructions, newInstruction);
        return true;
      }
      const dcRegEx: string = "d\\.\\s?c\\.";
      if (StringUtil.StringContainsSeparatedWord(innerText, dcRegEx + " al coda")) {
        let measureIndex: number = this.currentMeasureIndex;
        if (relativeMeasurePosition < 0.5) {
          measureIndex--;
        }
        const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.DalSegnoAlCoda);
        this.addInstruction(this.repetitionInstructions, newInstruction);
        return true;
      }
      if (StringUtil.StringContainsSeparatedWord(innerText, dcRegEx + " al fine")) {
        let measureIndex: number = this.currentMeasureIndex;
        if (relativeMeasurePosition < 0.5 && this.currentMeasureIndex < this.xmlMeasureList[0].length - 1) { // not in last measure
          measureIndex--;
        }
        const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.DaCapoAlFine);
        this.addInstruction(this.repetitionInstructions, newInstruction);
        return true;
      }
      if (StringUtil.StringContainsSeparatedWord(innerText, dcRegEx + " al coda")) {
        let measureIndex: number = this.currentMeasureIndex;
        if (relativeMeasurePosition < 0.5) {
          measureIndex--;
        }
        const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.DaCapoAlCoda);
        this.addInstruction(this.repetitionInstructions, newInstruction);
        return true;
      }
      if (StringUtil.StringContainsSeparatedWord(innerText, dcRegEx) ||
        StringUtil.StringContainsSeparatedWord(innerText, "da\\s?capo")) {
        let measureIndex: number = this.currentMeasureIndex;
        if (relativeMeasurePosition < 0.5 && this.currentMeasureIndex < this.xmlMeasureList[0].length - 1) { // not in last measure
          measureIndex--;
        }
        const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.DaCapo);
        this.addInstruction(this.repetitionInstructions, newInstruction);
        return true;
      }
      if (StringUtil.StringContainsSeparatedWord(innerText, dsRegEx) ||
        StringUtil.StringContainsSeparatedWord(innerText, "dal\\s?segno")) {
        let measureIndex: number = this.currentMeasureIndex;
        if (relativeMeasurePosition < 0.5 && this.currentMeasureIndex < this.xmlMeasureList[0].length - 1) { // not in last measure
          measureIndex--;
        }
        const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.DalSegno);
        this.addInstruction(this.repetitionInstructions, newInstruction);
        return true;
      }
      if (StringUtil.StringContainsSeparatedWord(innerText, "to\\s?coda") ||
        StringUtil.StringContainsSeparatedWord(innerText, "a (la )?coda")) {
        let measureIndex: number = this.currentMeasureIndex;
        if (relativeMeasurePosition < 0.5) {
          measureIndex--;
        }
        const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.ToCoda);
        this.addInstruction(this.repetitionInstructions, newInstruction);
        return true;
      }
      if (StringUtil.StringContainsSeparatedWord(innerText, "fine")) {
        let measureIndex: number = this.currentMeasureIndex;
        if (relativeMeasurePosition < 0.5) {
          measureIndex--;
        }
        const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.Fine);
        this.addInstruction(this.repetitionInstructions, newInstruction);
        return true;
      }
      if (StringUtil.StringContainsSeparatedWord(innerText, "coda")) {
        let measureIndex: number = this.currentMeasureIndex;
        if (relativeMeasurePosition > 0.5) {
          measureIndex++;
        }
        const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.Coda);
        this.addInstruction(this.repetitionInstructions, newInstruction);
        return true;
      }
      if (StringUtil.StringContainsSeparatedWord(innerText, "segno")) {
        let measureIndex: number = this.currentMeasureIndex;
        if (relativeMeasurePosition > 0.5) {
          measureIndex++;
        }
        const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.Segno);
        this.addInstruction(this.repetitionInstructions, newInstruction);
        return true;
      }
    } else if (directionTypeNode.element("segno") !== undefined) {
      let measureIndex: number = this.currentMeasureIndex;
      if (relativeMeasurePosition > 0.5) {
        measureIndex++;
      }
      const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.Segno);
      this.addInstruction(this.repetitionInstructions, newInstruction);
      return true;
    } else if (directionTypeNode.element("coda") !== undefined) {
      let measureIndex: number = this.currentMeasureIndex;
      if (relativeMeasurePosition > 0.5) {
        measureIndex++;
      }
      const newInstruction: RepetitionInstruction = new RepetitionInstruction(measureIndex, RepetitionInstructionEnum.Coda);
      this.addInstruction(this.repetitionInstructions, newInstruction);
      return true;
    }
    return false;
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
          if (codaCount === 0 && toCodaCount === 0) {
            instruction.type = RepetitionInstructionEnum.ToCoda;
            instruction.alignment = AlignmentType.End;
            instruction.measureIndex--;
          }
          break;
        case RepetitionInstructionEnum.Segno:
          if (segnoCount - dalSegnaCount > 0) { // two segnos in a row
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
