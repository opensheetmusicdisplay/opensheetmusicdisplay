import {GraphicalLabel} from "./GraphicalLabel";

export class GraphicalComment {
    constructor(label: GraphicalLabel, settingsLabel: GraphicalLabel) {
        this.label = label;
        this.settings = settingsLabel;
    }
    public label: GraphicalLabel;
    public settings: GraphicalLabel;
}
