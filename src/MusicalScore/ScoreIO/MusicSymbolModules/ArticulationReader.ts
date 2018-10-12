import {ArticulationEnum, VoiceEntry} from "../../VoiceData/VoiceEntry";
import {IXmlAttribute, IXmlElement} from "../../../Common/FileIO/Xml";
import * as log from "loglevel";
import {TechnicalInstruction, TechnicalInstructionType} from "../../VoiceData/Instructions/TechnicalInstruction";
import {OrnamentContainer, OrnamentEnum} from "../../VoiceData/OrnamentContainer";
import {PlacementEnum} from "../../VoiceData/Expressions/AbstractExpression";
import {AccidentalEnum} from "../../../Common/DataObjects/Pitch";
export class ArticulationReader {

  private getAccEnumFromString(input: string): AccidentalEnum {
    switch (input) {
      case "sharp":
        return AccidentalEnum.SHARP;
      case "flat":
          return AccidentalEnum.FLAT;
      case "natural":
        return AccidentalEnum.NATURAL;
      case "double-sharp":
      case "sharp-sharp":
        return AccidentalEnum.DOUBLESHARP;
      case "double-flat":
      case "flat-flat":
        return AccidentalEnum.DOUBLEFLAT;
      case "quarter-sharp":
        return AccidentalEnum.QUARTERTONESHARP;
      case "quarter-flat":
        return AccidentalEnum.QUARTERTONEFLAT;
      case "triple-sharp":
          return AccidentalEnum.TRIPLESHARP;
      case "triple-flat":
        return AccidentalEnum.TRIPLEFLAT;
      default:
        return AccidentalEnum.NONE;
    }
  }

  /**
   * This method adds an Articulation Expression to the currentVoiceEntry.
   * @param node
   * @param currentVoiceEntry
   */
  public addArticulationExpression(node: IXmlElement, currentVoiceEntry: VoiceEntry): void {
    if (node !== undefined && node.elements().length > 0) {
      const childNotes: IXmlElement[] = node.elements();
      for (let idx: number = 0, len: number = childNotes.length; idx < len; ++idx) {
        const childNote: IXmlElement = childNotes[idx];
        const name: string = childNote.name;
        try {
          // some Articulations appear in Xml separated with a "-" (eg strong-accent), we remove it for enum parsing
          name.replace("-", "");
          const articulationEnum: ArticulationEnum = ArticulationEnum[name];
          if (VoiceEntry.isSupportedArticulation(articulationEnum)) {
            // staccato should be first
            if (name === "staccato") {
              if (currentVoiceEntry.Articulations.length > 0 &&
                currentVoiceEntry.Articulations[0] !== ArticulationEnum.staccato) {
                currentVoiceEntry.Articulations.splice(0, 0, articulationEnum);
              }
            }

            // don't add the same articulation twice
            if (currentVoiceEntry.Articulations.indexOf(articulationEnum) === -1) {
              currentVoiceEntry.Articulations.push(articulationEnum);
            }
          }
        } catch (ex) {
          const errorMsg: string = "Invalid note articulation.";
          log.debug("addArticulationExpression", errorMsg, ex);
          return;
        }
      }
    }
  }

  /**
   * This method add a Fermata to the currentVoiceEntry.
   * @param xmlNode
   * @param currentVoiceEntry
   */
  public addFermata(xmlNode: IXmlElement, currentVoiceEntry: VoiceEntry): void {
    // fermata appears as separate tag in XML
    let articulationEnum: ArticulationEnum = ArticulationEnum.fermata;
    if (xmlNode.attributes().length > 0 && xmlNode.attribute("type") !== undefined) {
      if (xmlNode.attribute("type").value === "inverted") {
        articulationEnum = ArticulationEnum.invertedfermata;
      }
    }
    // add to VoiceEntry
    currentVoiceEntry.Articulations.push(articulationEnum);
  }

  /**
   * This method add a technical Articulation to the currentVoiceEntry.
   * @param xmlNode
   * @param currentVoiceEntry
   */
  public addTechnicalArticulations(xmlNode: IXmlElement, currentVoiceEntry: VoiceEntry): void {
    interface XMLElementToArticulationEnum {
      [xmlElement: string]: ArticulationEnum;
    }
    const xmlElementToArticulationEnum: XMLElementToArticulationEnum = {
      "down-bow": ArticulationEnum.downbow,
      "open-string": ArticulationEnum.naturalharmonic,
      "snap-pizzicato": ArticulationEnum.snappizzicato,
      "stopped": ArticulationEnum.lefthandpizzicato,
      "up-bow": ArticulationEnum.upbow,
      // fingering is special case
    };

    for (const xmlArticulation in xmlElementToArticulationEnum) {
      if (!xmlElementToArticulationEnum.hasOwnProperty(xmlArticulation)) {
        continue;
      }
      const articulationEnum: ArticulationEnum = xmlElementToArticulationEnum[xmlArticulation];
      const node: IXmlElement = xmlNode.element(xmlArticulation);
      if (node !== undefined) {
        if (currentVoiceEntry.Articulations.indexOf(articulationEnum) === -1) {
          currentVoiceEntry.Articulations.push(articulationEnum);
        }
      }
    }

    const nodeFingering: IXmlElement = xmlNode.element("fingering");
    if (nodeFingering !== undefined) {
      const currentTechnicalInstruction: TechnicalInstruction = new TechnicalInstruction();
      currentTechnicalInstruction.type = TechnicalInstructionType.Fingering;
      currentTechnicalInstruction.value = nodeFingering.value;
      currentTechnicalInstruction.placement = PlacementEnum.NotYetDefined;
      const placement: Attr = nodeFingering.attribute("placement");
      if (placement !== undefined && placement !== null) {
        switch (placement.value) {
          case "above":
            currentTechnicalInstruction.placement = PlacementEnum.Above;
            break;
          case "below":
            currentTechnicalInstruction.placement = PlacementEnum.Below;
            break;
          case "left": // not valid in MusicXML 3.1
            currentTechnicalInstruction.placement = PlacementEnum.Left;
            break;
          case "right": // not valid in MusicXML 3.1
            currentTechnicalInstruction.placement = PlacementEnum.Right;
            break;
          default:
            currentTechnicalInstruction.placement = PlacementEnum.NotYetDefined;
        }
      }
      currentVoiceEntry.TechnicalInstructions.push(currentTechnicalInstruction);
    }
  }

  /**
   * This method adds an Ornament to the currentVoiceEntry.
   * @param ornamentsNode
   * @param currentVoiceEntry
   */
  public addOrnament(ornamentsNode: IXmlElement, currentVoiceEntry: VoiceEntry): void {
    if (ornamentsNode !== undefined) {
      let ornament: OrnamentContainer = undefined;

      interface XMLElementToOrnamentEnum {
        [xmlElement: string]: OrnamentEnum;
      }
      const elementToOrnamentEnum: XMLElementToOrnamentEnum = {
        "delayed-inverted-turn": OrnamentEnum.DelayedInvertedTurn,
        "delayed-turn": OrnamentEnum.DelayedTurn,
        "inverted-mordent": OrnamentEnum.InvertedMordent,
        "inverted-turn": OrnamentEnum.InvertedTurn,
        "mordent": OrnamentEnum.Mordent,
        "trill-mark": OrnamentEnum.Trill,
        "turn": OrnamentEnum.Turn,
        // further ornaments are not yet supported by MusicXML (3.1).
      };

      for (const ornamentElement in elementToOrnamentEnum) {
        if (!elementToOrnamentEnum.hasOwnProperty(ornamentElement)) {
          continue;
        }
        const node: IXmlElement = ornamentsNode.element(ornamentElement);
        if (node !== undefined) {
          ornament = new OrnamentContainer(elementToOrnamentEnum[ornamentElement]);
        }
      }
      if (ornament !== undefined) {
        const accidentalsList: IXmlElement[] = ornamentsNode.elements("accidental-mark");
        if (accidentalsList !== undefined) {
          let placement: PlacementEnum = PlacementEnum.Below;
          let accidental: AccidentalEnum = AccidentalEnum.NONE;
          const accidentalsListArr: IXmlElement[] = accidentalsList;
          for (let idx: number = 0, len: number = accidentalsListArr.length; idx < len; ++idx) {
            const accidentalNode: IXmlElement = accidentalsListArr[idx];
            let text: string = accidentalNode.value;
            accidental = this.getAccEnumFromString(text);
            const placementAttr: IXmlAttribute = accidentalNode.attribute("placement");
            if (accidentalNode.hasAttributes && placementAttr !== undefined) {
              text = placementAttr.value;
              if (text === "above") {
                placement = PlacementEnum.Above;
              } else if (text === "below") {
                placement = PlacementEnum.Below;
              }
            }
            if (placement === PlacementEnum.Above) {
              ornament.AccidentalAbove = accidental;
            } else if (placement === PlacementEnum.Below) {
              ornament.AccidentalBelow = accidental;
            }
          }
        }
        // add this to currentVoiceEntry
        currentVoiceEntry.OrnamentContainer = ornament;
      }
    }
  }
}
