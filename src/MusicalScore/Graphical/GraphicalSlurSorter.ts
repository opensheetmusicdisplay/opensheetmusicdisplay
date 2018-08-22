import { Fraction } from "../../Common/DataObjects/Fraction";
import { Graphicalslur } from "./GraphicalSlur";

export interface GraphicalSlurSorterKeyValuePair {
    key: Fraction;
    value: Graphicalslur;
}

export class GraphicalSlurSorter {
    public Compare (x: GraphicalSlurSorterKeyValuePair, y: GraphicalSlurSorterKeyValuePair ): number {
        if (x.key > y.key) {
            return 1;
        }

        if (y.key > x.key) {
            return -1;
        }

        return 0;
    }
}
