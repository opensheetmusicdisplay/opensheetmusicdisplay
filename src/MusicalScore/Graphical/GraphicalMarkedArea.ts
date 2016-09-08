import {GraphicalLabel} from "./GraphicalLabel";
import {GraphicalRectangle} from "./GraphicalRectangle";

export class GraphicalMarkedArea {
    constructor(systemRectangle: GraphicalRectangle, labelRectangle: GraphicalRectangle = undefined, label: GraphicalLabel = undefined,
                settingsLabel: GraphicalLabel = undefined) {
        this.systemRectangle = systemRectangle;
        this.labelRectangle = labelRectangle;
        this.label = label;
        this.settings = settingsLabel;
    }

    public systemRectangle: GraphicalRectangle;
    public labelRectangle: GraphicalRectangle;
    public label: GraphicalLabel;
    public settings: GraphicalLabel;
}
