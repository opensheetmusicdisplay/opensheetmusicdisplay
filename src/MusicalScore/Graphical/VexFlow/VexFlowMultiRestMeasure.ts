import * as VF from "vexflow";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {Staff} from "../../VoiceData/Staff";
import {StaffLine} from "../StaffLine";
import {Beam} from "../../VoiceData/Beam";
import {GraphicalNote} from "../GraphicalNote";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {Tuplet} from "../../VoiceData/Tuplet";
import {GraphicalVoiceEntry} from "../GraphicalVoiceEntry";
import {Voice} from "../../VoiceData/Voice";
import {VexFlowMeasure} from "./VexFlowMeasure";

// type StemmableNote = VF.StemmableNote;

/** A GraphicalMeasure drawing a multiple-rest measure in Vexflow.
 *  Mostly copied from VexFlowMeasure.
 *  Even though most of those functions aren't needed, apparently you can't remove the layoutStaffEntry function.
 */
export class VexFlowMultiRestMeasure extends VexFlowMeasure {
    private multiRestElement: any; // VexFlow: Element

    constructor(staff: Staff, sourceMeasure: SourceMeasure = undefined, staffLine: StaffLine = undefined) {
        super(staff, sourceMeasure, staffLine);
        this.minimumStaffEntriesWidth = -1;

        /*
         * There is no case in which `staffLine === undefined && sourceMeasure === undefined` holds.
         * Hence, it is not necessary to specify an `else` case.
         * One can verify this through a usage search for this constructor.
         */
        if (staffLine) {
            this.rules = staffLine.ParentMusicSystem.rules;
        } else if (sourceMeasure) {
            this.rules = sourceMeasure.Rules;
        }

        this.resetLayout();

        // @ts-ignore
        this.multiRestElement = new VF.MultiMeasureRest(sourceMeasure.multipleRestMeasures, {
            // number_line: 3
        });
    }

    /**
     * Draw this measure on a VexFlow CanvasContext
     * @param ctx
     */
    public draw(ctx: VF.RenderContext): void {
        // Draw stave lines
        this.stave.setContext(ctx).draw();

        this.multiRestElement.setStave(this.stave);
        this.multiRestElement.setContext(ctx);
        this.multiRestElement.draw();

        // Draw vertical lines
        for (const connector of this.connectors) {
            connector.setContext(ctx).draw();
        }
    }

    public format(): void {
        // like most of the following methods, not necessary / can be simplified for MultiRestMeasure.
    }

    /**
     * Returns all the voices that are present in this measure
     */
    public getVoicesWithinMeasure(): Voice[] {
        return []; // we should still return a list here, not undefined, i guess.
    }

    /**
     * Returns all the graphicalVoiceEntries of a given Voice.
     * @param voice the voice for which the graphicalVoiceEntries shall be returned.
     */
    public getGraphicalVoiceEntriesPerVoice(voice: Voice): GraphicalVoiceEntry[] {
        return [];
    }

    /**
     * Finds the gaps between the existing notes within a measure.
     * Problem here is, that the graphicalVoiceEntry does not exist yet and
     * that Tied notes are not present in the normal voiceEntries.
     * To handle this, calculation with absolute timestamps is needed.
     * And the graphical notes have to be analysed directly (and not the voiceEntries, as it actually should be -> needs refactoring)
     * @param voice the voice for which the ghost notes shall be searched.
     */
    protected getRestFilledVexFlowStaveNotesPerVoice(voice: Voice): GraphicalVoiceEntry[] {
        return [];
    }

    /**
     * Add a note to a beam
     * @param graphicalNote
     * @param beam
     */
    public handleBeam(graphicalNote: GraphicalNote, beam: Beam): void {
        return;
    }

    public handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet): void {
        return;
    }

    /**
     * Complete the creation of VexFlow Beams in this measure
     */
    public finalizeBeams(): void {
        return;
    }

    /**
     * Complete the creation of VexFlow Tuplets in this measure
     */
    public finalizeTuplets(): void {
        return;
    }

    // this needs to exist, for some reason, or it won't be found, even though i can't find the usage.
    public layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
        return;
    }

    public graphicalMeasureCreatedCalculations(): void {
        return;
    }


    /**
     * Create the articulations for all notes of the current staff entry
     */
    protected createArticulations(): void {
        return;
    }

    /**
     * Create the ornaments for all notes of the current staff entry
     */
    protected createOrnaments(): void {
        return;
    }

    protected createFingerings(voiceEntry: GraphicalVoiceEntry): void {
        return;
    }

    /**
     * Return the VexFlow Stave corresponding to this graphicalMeasure
     * @returns {VF.Stave}
     */
    public getVFStave(): VF.Stave {
        return this.stave;
    }
}
