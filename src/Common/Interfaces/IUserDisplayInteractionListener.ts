import { PointF2D } from "../DataObjects";
import { InteractionType } from "../Enums/InteractionType";

export interface IUserDisplayInteractionListener {
    userDisplayInteraction(relativePosition: PointF2D, positionInSheetUnits: PointF2D, type: InteractionType): void;
}
