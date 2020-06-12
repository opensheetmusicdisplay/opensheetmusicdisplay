import {MusicPartManagerIterator} from "../MusicalScore/MusicParts/MusicPartManagerIterator";
import {MusicPartManager} from "../MusicalScore/MusicParts/MusicPartManager";
import {VoiceEntry} from "../MusicalScore/VoiceData/VoiceEntry";
import {VexFlowStaffEntry} from "../MusicalScore/Graphical/VexFlow/VexFlowStaffEntry";
import {MusicSystem} from "../MusicalScore/Graphical/MusicSystem";
import {OpenSheetMusicDisplay} from "./OpenSheetMusicDisplay";
import {GraphicalMusicSheet} from "../MusicalScore/Graphical/GraphicalMusicSheet";
import {Instrument} from "../MusicalScore/Instrument";
import {Note} from "../MusicalScore/VoiceData/Note";
import {EngravingRules, Fraction} from "..";
import {SourceMeasure, StaffLine} from "../MusicalScore";

/**
 * A cursor which can iterate through the music sheet.
 */
export class Cursor {
  constructor(container: HTMLElement, openSheetMusicDisplay: OpenSheetMusicDisplay) {
    this.container = container;
    this.openSheetMusicDisplay = openSheetMusicDisplay;
    this.rules = this.openSheetMusicDisplay.EngravingRules;

    // set cursor id
    // TODO add this for the OSMD object as well and refactor this into a util method?
    let id: number = 0;
    this.cursorElementId = "cursorImg-0";
    // find unique cursor id in document
    while (document.getElementById(this.cursorElementId)) {
      id++;
      this.cursorElementId = `cursorImg-${id}`;
    }

    const curs: HTMLElement = document.createElement("img");
    curs.id = this.cursorElementId;
    curs.style.position = "absolute";
    curs.style.zIndex = "-1";
    this.cursorElement = <HTMLImageElement>curs;
    this.container.appendChild(curs);
  }

  private container: HTMLElement;
  public cursorElement: HTMLImageElement;
  /** a unique id of the cursor's HTMLElement in the document.
   * Should be constant between re-renders and backend changes,
   * but different between different OSMD objects on the same page.
   */
  public cursorElementId: string;
  private openSheetMusicDisplay: OpenSheetMusicDisplay;
  private rules: EngravingRules;
  private manager: MusicPartManager;
  public iterator: MusicPartManagerIterator;
  private graphic: GraphicalMusicSheet;
  public hidden: boolean = true;

  /** Initialize the cursor. Necessary before using functions like show() and next(). */
  public init(manager: MusicPartManager, graphic: GraphicalMusicSheet): void {
    this.manager = manager;
    this.graphic = graphic;
    this.reset();
    this.hidden = true;
    this.hide();
  }

  /**
   * Make the cursor visible
   */
  public show(): void {
    this.hidden = false;
    this.resetIterator(); // TODO maybe not here? though setting measure range to draw, rerendering, then handling cursor show is difficult
    this.update();
  }

  public resetIterator(): void {
    if (!this.openSheetMusicDisplay.Sheet || !this.openSheetMusicDisplay.Sheet.SourceMeasures) { // just a safety measure
      console.log("OSMD.Cursor.resetIterator(): sheet or measures were null/undefined.");
      return;
    }

    // set selection start, so that when there's MinMeasureToDraw set, the cursor starts there right away instead of at measure 1
    const lastSheetMeasureIndex: number = this.openSheetMusicDisplay.Sheet.SourceMeasures.length - 1; // last measure in data model
    let startMeasureIndex: number = this.rules.MinMeasureToDrawIndex;
    startMeasureIndex = Math.min(startMeasureIndex, lastSheetMeasureIndex);
    let endMeasureIndex: number = this.rules.MaxMeasureToDrawIndex;
    endMeasureIndex = Math.min(endMeasureIndex, lastSheetMeasureIndex);

    if (this.openSheetMusicDisplay.Sheet && this.openSheetMusicDisplay.Sheet.SourceMeasures.length > startMeasureIndex) {
      this.openSheetMusicDisplay.Sheet.SelectionStart = this.openSheetMusicDisplay.Sheet.SourceMeasures[startMeasureIndex].AbsoluteTimestamp;
    }
    if (this.openSheetMusicDisplay.Sheet && this.openSheetMusicDisplay.Sheet.SourceMeasures.length > endMeasureIndex) {
      const lastMeasure: SourceMeasure = this.openSheetMusicDisplay.Sheet.SourceMeasures[endMeasureIndex];
      this.openSheetMusicDisplay.Sheet.SelectionEnd = Fraction.plus(lastMeasure.AbsoluteTimestamp, lastMeasure.Duration);
    }

    this.iterator = this.manager.getIterator();
  }

  private getStaffEntryFromVoiceEntry(voiceEntry: VoiceEntry): VexFlowStaffEntry {
    const measureIndex: number = voiceEntry.ParentSourceStaffEntry.VerticalContainerParent.ParentMeasure.measureListIndex;
    const staffIndex: number = voiceEntry.ParentSourceStaffEntry.ParentStaff.idInMusicSheet;
    return <VexFlowStaffEntry>this.graphic.findGraphicalStaffEntryFromMeasureList(staffIndex, measureIndex, voiceEntry.ParentSourceStaffEntry);
  }

  public update(): void {
    // Warning! This should NEVER call this.openSheetMusicDisplay.render()
    if (this.hidden || this.hidden === undefined || this.hidden === null) {
      return;
    }
    // this.graphic?.Cursors?.length = 0;
    const iterator: MusicPartManagerIterator = this.iterator;
    // TODO when measure draw range (drawUpToMeasureNumber) was changed, next/update can fail to move cursor. but of course it can be reset before.

    const voiceEntries: VoiceEntry[] = iterator.CurrentVisibleVoiceEntries();
    if (iterator.EndReached || !iterator.CurrentVoiceEntries || voiceEntries.length === 0) {
      return;
    }
    let x: number = 0, y: number = 0, height: number = 0;

    // get all staff entries inside the current voice entry
    const gseArr: VexFlowStaffEntry[] = voiceEntries.map(ve => this.getStaffEntryFromVoiceEntry(ve));
    // sort them by x position and take the leftmost entry
    const gse: VexFlowStaffEntry =
          gseArr.sort((a, b) => a?.PositionAndShape?.AbsolutePosition?.x <= b?.PositionAndShape?.AbsolutePosition?.x ? -1 : 1 )[0];
    x = gse.PositionAndShape.AbsolutePosition.x;
    const musicSystem: MusicSystem = gse.parentMeasure.ParentMusicSystem;
    if (!musicSystem) {
      return;
    }
    y = musicSystem.PositionAndShape.AbsolutePosition.y + musicSystem.StaffLines[0].PositionAndShape.RelativePosition.y;
    const bottomStaffline: StaffLine = musicSystem.StaffLines[musicSystem.StaffLines.length - 1];
    const endY: number = musicSystem.PositionAndShape.AbsolutePosition.y +
    bottomStaffline.PositionAndShape.RelativePosition.y + bottomStaffline.StaffHeight;
    height = endY - y;

    // The following code is not necessary (for now, but it could come useful later):
    // it highlights the notes under the cursor.
    //let vfNotes: { [voiceID: number]: Vex.Flow.StaveNote; } = gse.vfNotes;
    //for (let voiceId in vfNotes) {
    //    if (vfNotes.hasOwnProperty(voiceId)) {
    //        vfNotes[voiceId].setStyle({
    //            fillStyle: "red",
    //            strokeStyle: "red",
    //        });
    //    }
    //}

    // Update the graphical cursor
    // The following is the legacy cursor rendered on the canvas:
    // // let cursor: GraphicalLine = new GraphicalLine(new PointF2D(x, y), new PointF2D(x, y + height), 3, OutlineAndFillStyleEnum.PlaybackCursor);

    // This the current HTML Cursor:
    const cursorElement: HTMLImageElement = this.cursorElement;
    cursorElement.style.top = (y * 10.0 * this.openSheetMusicDisplay.zoom) + "px";
    cursorElement.style.left = ((x - 1.5) * 10.0 * this.openSheetMusicDisplay.zoom) + "px";
    cursorElement.height = (height * 10.0 * this.openSheetMusicDisplay.zoom);
    const newWidth: number = 3 * 10.0 * this.openSheetMusicDisplay.zoom;
    if (newWidth !== cursorElement.width) {
      cursorElement.width = newWidth;
      this.updateStyle(newWidth);
    }
    if (this.openSheetMusicDisplay.FollowCursor) {
      const diff: number = this.cursorElement.getBoundingClientRect().top;
      this.cursorElement.scrollIntoView({behavior: diff < 1000 ? "smooth" : "auto", block: "center"});
    }
    // Show cursor
    // // Old cursor: this.graphic.Cursors.push(cursor);
    this.cursorElement.style.display = "";
  }

  /**
   * Hide the cursor
   */
  public hide(): void {
    // Hide the actual cursor element
    this.cursorElement.style.display = "none";
    //this.graphic.Cursors.length = 0;
    // Forcing the sheet to re-render is not necessary anymore
    //if (!this.hidden) {
    //    this.openSheetMusicDisplay.render();
    //}
    this.hidden = true;
  }

  /**
   * Go to next entry
   */
  public next(): void {
    this.iterator.moveToNext();
    this.update();
  }

  /**
   * reset cursor to start
   */
  public reset(): void {
    this.resetIterator();
    //this.iterator.moveToNext();
    this.update();
  }

  private updateStyle(width: number, color: string = "#33e02f"): void {
    // Create a dummy canvas to generate the gradient for the cursor
    // FIXME This approach needs to be improved
    const c: HTMLCanvasElement = document.createElement("canvas");
    c.width = this.cursorElement.width;
    c.height = 1;
    const ctx: CanvasRenderingContext2D = c.getContext("2d");
    ctx.globalAlpha = 0.5;
    // Generate the gradient
    const gradient: CanvasGradient = ctx.createLinearGradient(0, 0, this.cursorElement.width, 0);
    gradient.addColorStop(0, "white"); // it was: "transparent"
    gradient.addColorStop(0.2, color);
    gradient.addColorStop(0.8, color);
    gradient.addColorStop(1, "white"); // it was: "transparent"
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, 1);
    // Set the actual image
    this.cursorElement.src = c.toDataURL("image/png");
  }

  public get Iterator(): MusicPartManagerIterator {
    return this.iterator;
  }

  public get Hidden(): boolean {
    return this.hidden;
  }

  /** returns voices under the current Cursor position. Without instrument argument, all voices are returned. */
  public VoicesUnderCursor(instrument?: Instrument): VoiceEntry[] {
    return this.iterator.CurrentVisibleVoiceEntries(instrument);
  }

  public NotesUnderCursor(instrument?: Instrument): Note[] {
    const voiceEntries: VoiceEntry[]  = this.VoicesUnderCursor(instrument);
    const notes: Note[] = [];
    voiceEntries.forEach(voiceEntry => {
      notes.push.apply(notes, voiceEntry.Notes);
    });
    return notes;
  }
}
