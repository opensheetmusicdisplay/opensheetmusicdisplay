import {ArticulationEnum, VoiceEntry} from "../../VoiceData/VoiceEntry";
import {IXmlAttribute, IXmlElement} from "../../../Common/FileIO/Xml";
import log from "loglevel";
import {TechnicalInstruction, TechnicalInstructionType} from "../../VoiceData/Instructions/TechnicalInstruction";
import {OrnamentContainer, OrnamentEnum} from "../../VoiceData/OrnamentContainer";
import {PlacementEnum} from "../../VoiceData/Expressions/AbstractExpression";
import {AccidentalEnum} from "../../../Common/DataObjects/Pitch";
import { Articulation } from "../../VoiceData/Articulation";
import { Note } from "../../VoiceData/Note";
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
      const childNodes: IXmlElement[] = node.elements();
      for (let idx: number = 0, len: number = childNodes.length; idx < len; ++idx) {
        const childNode: IXmlElement = childNodes[idx];
        let name: string = childNode.name;
        try {
          // some Articulations appear in Xml separated with a "-" (eg strong-accent), we remove it for enum parsing
          name = name.replace("-", "");
          const articulationEnum: ArticulationEnum = ArticulationEnum[name];
          if (VoiceEntry.isSupportedArticulation(articulationEnum)) {
            let placement: PlacementEnum = PlacementEnum.NotYetDefined;
            const placementValue: string = childNode.attribute("placement")?.value;
            if (placementValue === "above") {
              placement = PlacementEnum.Above;
            } else if (placementValue === "below") {
              placement = PlacementEnum.Below;
            }
            const newArticulation: Articulation = new Articulation(articulationEnum, placement);
            // staccato should be first // necessary?
            if (name === "staccato") {
              if (currentVoiceEntry.Articulations.length > 0 &&
                currentVoiceEntry.Articulations[0].articulationEnum !== ArticulationEnum.staccato) {
                currentVoiceEntry.Articulations.splice(0, 0, newArticulation); // TODO can't this overwrite another articulation?
              }
            }
            if (name === "strongaccent") { // see name.replace("-", "") above
              const marcatoType: string = childNode?.attribute("type")?.value;
              if (marcatoType === "up") {
                newArticulation.articulationEnum = ArticulationEnum.marcatoup;
              } else if (marcatoType === "down") {
                newArticulation.articulationEnum = ArticulationEnum.marcatodown;
              }
            }

            // don't add the same articulation twice
            if (!currentVoiceEntry.hasArticulation(newArticulation)) {
              currentVoiceEntry.Articulations.push(newArticulation);
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
    if (xmlNode.attributes().length > 0 && xmlNode.attribute("type")) {
      if (xmlNode.attribute("type").value === "inverted") {
        articulationEnum = ArticulationEnum.invertedfermata;
      }
    }
    let placement: PlacementEnum = PlacementEnum.Above;
    if (xmlNode.attribute("placement")?.value === "below") {
      placement = PlacementEnum.Below;
    }
    // add to VoiceEntry
    currentVoiceEntry.Articulations.push(new Articulation(articulationEnum, placement));
  }

  /**
   * This method add a technical Articulation to the currentVoiceEntry.
   * @param technicalNode
   * @param currentVoiceEntry
   */
  public addTechnicalArticulations(technicalNode: IXmlElement, currentVoiceEntry: VoiceEntry, currentNote: Note): void {
    interface XMLElementToArticulationEnum {
      [xmlElement: string]: ArticulationEnum;
    }
    const xmlElementToArticulationEnum: XMLElementToArticulationEnum = {
      "bend": ArticulationEnum.bend,
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
      const node: IXmlElement = technicalNode.element(xmlArticulation);
      if (node) {
        let placement: PlacementEnum; // set undefined by default, to not restrict placement
        if (node.attribute("placement")?.value === "above") {
          placement = PlacementEnum.Above;
        }
        if (node.attribute("placement")?.value === "below") {
          placement = PlacementEnum.Below;
        }
        const newArticulation: Articulation = new Articulation(articulationEnum, placement);
        if (!currentVoiceEntry.hasArticulation(newArticulation)) {
          currentVoiceEntry.Articulations.push(newArticulation);
        }
      }
    }

    const nodeFingering: IXmlElement = technicalNode.element("fingering");
    if (nodeFingering) {
      const currentTechnicalInstruction: TechnicalInstruction = this.createTechnicalInstruction(nodeFingering, currentNote);
      currentTechnicalInstruction.type = TechnicalInstructionType.Fingering;
      currentNote.Fingering = currentTechnicalInstruction;
      currentVoiceEntry.TechnicalInstructions.push(currentTechnicalInstruction);
    }
    const nodeString: IXmlElement = technicalNode.element("string");
    if (nodeString) {
      const currentTechnicalInstruction: TechnicalInstruction = this.createTechnicalInstruction(nodeString, currentNote);
      currentTechnicalInstruction.type = TechnicalInstructionType.String;
      currentNote.StringInstruction = currentTechnicalInstruction;
      currentVoiceEntry.TechnicalInstructions.push(currentTechnicalInstruction);
    }
  }

  private createTechnicalInstruction(stringOrFingeringNode: IXmlElement, note: Note): TechnicalInstruction {
    const technicalInstruction: TechnicalInstruction = new TechnicalInstruction();
    technicalInstruction.sourceNote = note;
    technicalInstruction.value = stringOrFingeringNode.value;
    const placement: Attr = stringOrFingeringNode.attribute("placement");
    technicalInstruction.placement = this.getPlacement(placement);
    return technicalInstruction;
  }

  private getPlacement(placementAttr: Attr, defaultPlacement: PlacementEnum = PlacementEnum.NotYetDefined): PlacementEnum {
    if (defaultPlacement !== PlacementEnum.NotYetDefined) { // usually from EngravingRules
      return defaultPlacement;
    }
    if (placementAttr) {
      switch (placementAttr.value) {
        case "above":
          return PlacementEnum.Above;
        case "below":
          return PlacementEnum.Below;
        case "left": // not valid in MusicXML 3.1
          return PlacementEnum.Left;
        case "right": // not valid in MusicXML 3.1
          return PlacementEnum.Right;
        default:
          return PlacementEnum.NotYetDefined;
      }
    } else {
      return PlacementEnum.NotYetDefined;
    }
  }

  /**
   * This method adds an Ornament to the currentVoiceEntry.
   * @param ornamentsNode
   * @param currentVoiceEntry
   */
  public addOrnament(ornamentsNode: IXmlElement, currentVoiceEntry: VoiceEntry): void {
    if (ornamentsNode) {
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
        if (node) {
          ornament = new OrnamentContainer(elementToOrnamentEnum[ornamentElement]);
          const placementAttr: Attr = node.attribute("placement");
          if (placementAttr) {
            const placementString: string = placementAttr.value;
            if (placementString === "below") {
              ornament.placement = PlacementEnum.Below;
            }
          }
        }
      }
      if (ornament) {
        const accidentalsList: IXmlElement[] = ornamentsNode.elements("accidental-mark");
        if (accidentalsList) {
          let placement: PlacementEnum = PlacementEnum.Below;
          let accidental: AccidentalEnum = AccidentalEnum.NONE;
          const accidentalsListArr: IXmlElement[] = accidentalsList;
          for (let idx: number = 0, len: number = accidentalsListArr.length; idx < len; ++idx) {
            const accidentalNode: IXmlElement = accidentalsListArr[idx];
            let text: string = accidentalNode.value;
            accidental = this.getAccEnumFromString(text);
            const placementAttr: IXmlAttribute = accidentalNode.attribute("placement");
            if (accidentalNode.hasAttributes && placementAttr) {
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
  } // /addOrnament

}
