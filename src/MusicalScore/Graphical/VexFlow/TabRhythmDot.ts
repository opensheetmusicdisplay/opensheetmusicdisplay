import Vex from "vexflow";
import VF = Vex.Flow;

/** Keep TAB rhythm dots addressable without replacing each modifier's draw method. */
export class TabRhythmDot extends VF.Dot {
    public draw(): void {
        const context: Vex.IRenderContext = this.getContext();
        context.openGroup("tab-rhythm-dot");
        try {
            super.draw();
        } finally {
            context.closeGroup();
        }
    }
}
