import { GraphicalLabel } from "./GraphicalLabel";
import { GraphicalRectangle } from "./GraphicalRectangle";
export declare class GraphicalMarkedArea {
    constructor(systemRectangle: GraphicalRectangle, labelRectangle?: GraphicalRectangle, label?: GraphicalLabel, settingsLabel?: GraphicalLabel);
    systemRectangle: GraphicalRectangle;
    labelRectangle: GraphicalRectangle;
    label: GraphicalLabel;
    settings: GraphicalLabel;
}
