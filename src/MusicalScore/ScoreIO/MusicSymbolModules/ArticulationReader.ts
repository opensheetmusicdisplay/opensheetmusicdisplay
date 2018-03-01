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
      case "natural":
        return AccidentalEnum.NATURAL;
      case "sharp":
        return AccidentalEnum.SHARP;
      case "sharp-sharp":
      case "double-sharp":
        return AccidentalEnum.DOUBLESHARP;
      case "flat":
        return AccidentalEnum.FLAT;
      case "flat-flat":
        return AccidentalEnum.DOUBLEFLAT;
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
    let node: IXmlElement = xmlNode.element("up-bow");
    if (node !== undefined) {
      if (currentVoiceEntry.Articulations.indexOf(ArticulationEnum.upbow) === -1) {
        currentVoiceEntry.Articulations.push(ArticulationEnum.upbow);
      }
    }
    node = xmlNode.element("down-bow");
    if (node !== undefined) {
      if (currentVoiceEntry.Articulations.indexOf(ArticulationEnum.downbow) === -1) {
        currentVoiceEntry.Articulations.push(ArticulationEnum.downbow);
      }
    }
    node = xmlNode.element("open-string");
    if (node !== undefined) {
      if (currentVoiceEntry.Articulations.indexOf(ArticulationEnum.naturalharmonic) === -1) {
        currentVoiceEntry.Articulations.push(ArticulationEnum.naturalharmonic);
      }
    }
    node = xmlNode.element("stopped");
    if (node !== undefined) {
      if (currentVoiceEntry.Articulations.indexOf(ArticulationEnum.lefthandpizzicato) === -1) {
        currentVoiceEntry.Articulations.push(ArticulationEnum.lefthandpizzicato);
      }
    }
    node = xmlNode.element("snap-pizzicato");
    if (node !== undefined) {
      if (currentVoiceEntry.Articulations.indexOf(ArticulationEnum.snappizzicato) === -1) {
        currentVoiceEntry.Articulations.push(ArticulationEnum.snappizzicato);
      }
    }
    node = xmlNode.element("fingering");
    if (node !== undefined) {
      const currentTechnicalInstruction: TechnicalInstruction = new TechnicalInstruction();
      currentTechnicalInstruction.type = TechnicalInstructionType.Fingering;
      currentTechnicalInstruction.value = node.value;
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
      let node: IXmlElement = ornamentsNode.element("trill-mark");
      if (node !== undefined) {
        ornament = new OrnamentContainer(OrnamentEnum.Trill);
      }
      node = ornamentsNode.element("turn");
      if (node !== undefined) {
        ornament = new OrnamentContainer(OrnamentEnum.Turn);
      }
      node = ornamentsNode.element("inverted-turn");
      if (node !== undefined) {
        ornament = new OrnamentContainer(OrnamentEnum.InvertedTurn);
      }
      node = ornamentsNode.element("delayed-turn");
      if (node !== undefined) {
        ornament = new OrnamentContainer(OrnamentEnum.DelayedTurn);
      }
      node = ornamentsNode.element("delayed-inverted-turn");
      if (node !== undefined) {
        ornament = new OrnamentContainer(OrnamentEnum.DelayedInvertedTurn);
      }
      node = ornamentsNode.element("mordent");
      if (node !== undefined) {
        ornament = new OrnamentContainer(OrnamentEnum.Mordent);
      }
      node = ornamentsNode.element("inverted-mordent");
      if (node !== undefined) {
        ornament = new OrnamentContainer(OrnamentEnum.InvertedMordent);
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
