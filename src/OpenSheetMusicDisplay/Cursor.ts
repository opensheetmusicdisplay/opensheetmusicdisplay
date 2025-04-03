import {MusicPartManagerIterator} from "../MusicalScore/MusicParts/MusicPartManagerIterator";
import {MusicPartManager} from "../MusicalScore/MusicParts/MusicPartManager";
import {VoiceEntry} from "../MusicalScore/VoiceData/VoiceEntry";
import {VexFlowStaffEntry} from "../MusicalScore/Graphical/VexFlow/VexFlowStaffEntry";
import {MusicSystem} from "../MusicalScore/Graphical/MusicSystem";
import {OpenSheetMusicDisplay} from "./OpenSheetMusicDisplay";
import {GraphicalMusicSheet} from "../MusicalScore/Graphical/GraphicalMusicSheet";
import {Instrument} from "../MusicalScore/Instrument";
import {Note} from "../MusicalScore/VoiceData/Note";
import {Fraction} from "../Common/DataObjects/Fraction";
import { EngravingRules } from "../MusicalScore/Graphical/EngravingRules";
import { SourceMeasure } from "../MusicalScore/VoiceData/SourceMeasure";
import { StaffLine } from "../MusicalScore/Graphical/StaffLine";
import { GraphicalMeasure } from "../MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowMeasure } from "../MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { CursorOptions, CursorType } from "./OSMDOptions";
import { BoundingBox } from "../MusicalScore/Graphical/BoundingBox";
import { GraphicalNote } from "../MusicalScore/Graphical/GraphicalNote";

/** A cursor which can iterate through the music sheet. */
export class Cursor {
  constructor(container: HTMLElement, openSheetMusicDisplay: OpenSheetMusicDisplay, cursorOptions: CursorOptions) {
    this.container = container;
    this.openSheetMusicDisplay = openSheetMusicDisplay;
    this.rules = this.openSheetMusicDisplay.EngravingRules;
    this.cursorOptions = cursorOptions;

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
    if (this.cursorOptions.follow === true) {
      this.wantedZIndex = "-1";
      curs.style.zIndex = this.wantedZIndex;
    } else {
      this.wantedZIndex = "-2";
      curs.style.zIndex = this.wantedZIndex;
    }
    this.cursorElement = <HTMLImageElement>curs;
    this.container.appendChild(curs);
  }

  public adjustToBackgroundColor(): void {
    let zIndex: string;
    if (!this.rules.PageBackgroundColor) {
          zIndex = this.wantedZIndex;
    } else {
      zIndex = "1";
    }
    this.cursorElement.style.zIndex = zIndex;
  }

  private container: HTMLElement;
  public cursorElement: HTMLImageElement;
  /** a unique id of the cursor's HTMLElement in the document.
   * Should be constant between re-renders and backend changes,
   * but different between different OSMD objects on the same page.
   */
  public cursorElementId: string;
  /** The desired zIndex (layer) of the cursor when no background color is set.
   *  When a background color is set, using a negative zIndex would make the cursor invisible.
   */
  public wantedZIndex: string;
  private openSheetMusicDisplay: OpenSheetMusicDisplay;
  private rules: EngravingRules;
  private manager: MusicPartManager;
  public iterator: MusicPartManagerIterator;
  private graphic: GraphicalMusicSheet;
  public hidden: boolean = true;
  public currentPageNumber: number = 1;
  private cursorOptions: CursorOptions;
  private cursorOptionsRendered: CursorOptions;
  private skipInvisibleNotes: boolean = true;

  /** Initialize the cursor. Necessary before using functions like show() and next(). */
  public init(manager: MusicPartManager, graphic: GraphicalMusicSheet): void {
    this.manager = manager;
    this.graphic = graphic;
    this.reset();
    this.hidden = true;
    this.hide();
  }

  /** Make the cursor visible. */
  public show(): void {
    this.hidden = false;
    //this.resetIterator(); // TODO maybe not here? though setting measure range to draw, rerendering, then handling cursor show is difficult
    this.update();
    this.adjustToBackgroundColor();
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
    // remember SkipInvisibleNotes setting, which otherwise gets reset to default value
    this.iterator.SkipInvisibleNotes = this.skipInvisibleNotes;
  }

  private getStaffEntryFromVoiceEntry(voiceEntry: VoiceEntry): VexFlowStaffEntry {
    const measureIndex: number = voiceEntry.ParentSourceStaffEntry.VerticalContainerParent.ParentMeasure.measureListIndex;
    const staffIndex: number = voiceEntry.ParentSourceStaffEntry.ParentStaff.idInMusicSheet;
    return <VexFlowStaffEntry>this.graphic.findGraphicalStaffEntryFromMeasureList(staffIndex, measureIndex, voiceEntry.ParentSourceStaffEntry);
  }

  /** Moves the cursor to the current position of the iterator (visually), e.g. after next(). */
  public update(): void {
    if (this.hidden || this.hidden === undefined || this.hidden === null) {
      return;
    }
    this.updateCurrentPage(); // attach cursor to new page DOM if necessary

    // this.graphic?.Cursors?.length = 0;
    const iterator: MusicPartManagerIterator = this.iterator;
    // TODO when measure draw range (drawUpToMeasureNumber) was changed, next/update can fail to move cursor. but of course it can be reset before.

    let voiceEntries: VoiceEntry[] = iterator.CurrentVisibleVoiceEntries();
    let currentMeasureIndex: number = iterator.CurrentMeasureIndex;
    let x: number = 0, y: number = 0, height: number = 0;
    let musicSystem: MusicSystem;
    if (voiceEntries.length === 0 && !iterator.FrontReached && !iterator.EndReached) {
      // e.g. when the note at the current position is in an instrument that's now invisible, and there's no other note at this position, vertically
      iterator.moveToPrevious();
      voiceEntries = iterator.CurrentVisibleVoiceEntries();
      iterator.moveToNext();
      // after this, the else condition below should trigger, positioning the cursor at the left-most note. See #1312
    }
    if (iterator.FrontReached && voiceEntries.length === 0) {
      // show beginning of first measure (of stafflines, to create a visual difference to the first note position)
      //   this position is technically before the sheet/first note - e.g. cursor.Iterator.CurrentTimestamp.RealValue = -1
      iterator.moveToNext();
      voiceEntries = iterator.CurrentVisibleVoiceEntries();
      const firstVisibleMeasure: GraphicalMeasure = this.findVisibleGraphicalMeasure(iterator.CurrentMeasureIndex);
      x = firstVisibleMeasure.PositionAndShape.AbsolutePosition.x;
      musicSystem = firstVisibleMeasure.ParentMusicSystem;
      iterator.moveToPrevious();
    } else if (iterator.EndReached || !iterator.CurrentVoiceEntries || voiceEntries.length === 0) {
      // show end of last measure (of stafflines, to create a visual difference to the first note position)
      //   this position is technically after the sheet/last note - e.g. cursor.Iterator.CurrentTimestamp.RealValue = 99999
      iterator.moveToPrevious();
    voiceEntries = iterator.CurrentVisibleVoiceEntries();
      currentMeasureIndex = iterator.CurrentMeasureIndex;
      const lastVisibleMeasure: GraphicalMeasure = this.findVisibleGraphicalMeasure(iterator.CurrentMeasureIndex);
      x = lastVisibleMeasure.PositionAndShape.AbsolutePosition.x + lastVisibleMeasure.PositionAndShape.Size.width;
      musicSystem = lastVisibleMeasure.ParentMusicSystem;
      iterator.moveToNext();
    } else if (iterator.CurrentMeasure.isReducedToMultiRest) {
      // multiple measure rests aren't used when one
      const multiRestGMeasure: GraphicalMeasure = this.findVisibleGraphicalMeasure(iterator.CurrentMeasureIndex);
      const totalRestMeasures: number = multiRestGMeasure.parentSourceMeasure.multipleRestMeasures;
      const currentRestMeasureNumber: number = iterator.CurrentMeasure.multipleRestMeasureNumber;
      const progressRatio: number = currentRestMeasureNumber / (totalRestMeasures + 1);
      const effectiveWidth: number = multiRestGMeasure.PositionAndShape.Size.width - (multiRestGMeasure as VexFlowMeasure).beginInstructionsWidth;
      x = multiRestGMeasure.PositionAndShape.AbsolutePosition.x + (multiRestGMeasure as VexFlowMeasure).beginInstructionsWidth + progressRatio * effectiveWidth;

      musicSystem = multiRestGMeasure.ParentMusicSystem;
    } else {
      // get all staff entries inside the current voice entry
      const gseArr: VexFlowStaffEntry[] = voiceEntries.map(ve => this.getStaffEntryFromVoiceEntry(ve));
      // sort them by x position and take the leftmost entry
      const gse: VexFlowStaffEntry =
            gseArr.sort((a, b) => a?.PositionAndShape?.AbsolutePosition?.x <= b?.PositionAndShape?.AbsolutePosition?.x ? -1 : 1 )[0];
      if (gse) {
        x = gse.PositionAndShape.AbsolutePosition.x;
        musicSystem = gse.parentMeasure.ParentMusicSystem;
      }

      // debug: change color of notes under cursor (needs re-render)
      // for (const gve of gse.graphicalVoiceEntries) {
      //   for (const note of gve.notes) {
      //     note.sourceNote.NoteheadColor = "#0000FF";
      //   }
      // }
    }
    if (!musicSystem?.StaffLines[0]) {
      return;
    }

    // y is common for both multirest and non-multirest, given the MusicSystem
    //   note: StaffLines[0] is guaranteed to exist in this.findVisibleGraphicalMeasure
    y = musicSystem.PositionAndShape.AbsolutePosition.y + musicSystem.StaffLines[0].PositionAndShape.RelativePosition.y;
    let endY: number = musicSystem.PositionAndShape.AbsolutePosition.y;
    const bottomStaffline: StaffLine = musicSystem.StaffLines[musicSystem.StaffLines.length - 1];
    if (bottomStaffline) { // can be undefined if drawFromMeasureNumber changed after cursor was shown
      endY += bottomStaffline.PositionAndShape.RelativePosition.y + bottomStaffline.StaffHeight;
    }
    height = endY - y;

    // Update the graphical cursor
    const visibleMeasure: GraphicalMeasure = this.findVisibleGraphicalMeasure(currentMeasureIndex);
    if (!visibleMeasure) {
      return;
    }
    const measurePositionAndShape: BoundingBox = visibleMeasure.PositionAndShape;
    this.updateWidthAndStyle(measurePositionAndShape, x, y, height);

    if (this.openSheetMusicDisplay.FollowCursor && this.cursorOptions.follow) {
      if (!this.openSheetMusicDisplay.EngravingRules.RenderSingleHorizontalStaffline) {
        const diff: number = this.cursorElement.getBoundingClientRect().top;
        this.cursorElement.scrollIntoView({behavior: diff < 1000 ? "smooth" : "auto", block: "center"});
      } else {
        this.cursorElement.scrollIntoView({behavior: "smooth", inline: "center"});
      }
    }
    // Show cursor
    // // Old cursor: this.graphic.Cursors.push(cursor);
    this.cursorElement.style.display = "";
  }

  private findVisibleGraphicalMeasure(measureIndex: number): GraphicalMeasure {
    for (let i: number = 0; i < this.graphic.NumberOfStaves; i++) {
      const measure: GraphicalMeasure = this.graphic.findGraphicalMeasure(this.iterator.CurrentMeasureIndex, i);
      if (measure?.ParentStaff.isVisible()) {
        return measure;
      }
    }
  }

  public updateWidthAndStyle(measurePositionAndShape: BoundingBox, x: number, y: number, height: number): void {
    const cursorElement: HTMLImageElement = this.cursorElement;
    let newWidth: number = 0;
    switch (this.cursorOptions.type) {
      case CursorType.ThinLeft:
        cursorElement.style.top = (y * 10.0 * this.openSheetMusicDisplay.zoom) + "px";
        cursorElement.style.left = ((x - 1.5) * 10.0 * this.openSheetMusicDisplay.zoom) + "px";
        cursorElement.height = (height * 10.0 * this.openSheetMusicDisplay.zoom);
        newWidth = 5 * this.openSheetMusicDisplay.zoom;
        break;
      case CursorType.ShortThinTopLeft:
        cursorElement.style.top = ((y-2.5) * 10.0 * this.openSheetMusicDisplay.zoom) + "px";
        cursorElement.style.left = (x * 10.0 * this.openSheetMusicDisplay.zoom) + "px";
        cursorElement.height = (1.5 * 10.0 * this.openSheetMusicDisplay.zoom);
        newWidth = 5 * this.openSheetMusicDisplay.zoom;
        break;
      case CursorType.CurrentArea:
        cursorElement.style.top = measurePositionAndShape.AbsolutePosition.y * 10.0 * this.openSheetMusicDisplay.zoom +"px";
        cursorElement.style.left = measurePositionAndShape.AbsolutePosition.x * 10.0 * this.openSheetMusicDisplay.zoom +"px";
        cursorElement.height = (height * 10.0 * this.openSheetMusicDisplay.zoom);
        newWidth = measurePositionAndShape.Size.width * 10 * this.openSheetMusicDisplay.zoom;
        break;
      case CursorType.CurrentAreaLeft:
        cursorElement.style.top = measurePositionAndShape.AbsolutePosition.y * 10.0 * this.openSheetMusicDisplay.zoom +"px";
        cursorElement.style.left = measurePositionAndShape.AbsolutePosition.x * 10.0 * this.openSheetMusicDisplay.zoom +"px";
        cursorElement.height = (height * 10.0 * this.openSheetMusicDisplay.zoom);
        newWidth = (x-measurePositionAndShape.AbsolutePosition.x) * 10 * this.openSheetMusicDisplay.zoom;
        break;
        default:
        cursorElement.style.top = (y * 10.0 * this.openSheetMusicDisplay.zoom) + "px";
        cursorElement.style.left = ((x - 1.5) * 10.0 * this.openSheetMusicDisplay.zoom) + "px";
        cursorElement.height = (height * 10.0 * this.openSheetMusicDisplay.zoom);
        newWidth = 3 * 10.0 * this.openSheetMusicDisplay.zoom;
        break;
    }

    // if (newWidth !== cursorElement.width) { // this `if` is unnecessary and prevents updating color
    cursorElement.width = newWidth;
    if (this.cursorOptionsRendered !== this.cursorOptions) {
      this.updateStyle(newWidth, this.cursorOptions);
      // only update style (creating new cursor element) if options changed.
      //   For width, it seems to be enough to update cursorElement.width, see osmd#1519
    }
  }

  /** Hide the cursor. */
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

  /** Go to previous entry / note / vertical position. */
   public previous(): void {
    this.iterator.moveToPreviousVisibleVoiceEntry(false);
    this.update();
  }

  /** Go to next entry / note / vertical position. */
  public next(): void {
    this.iterator.moveToNextVisibleVoiceEntry(false); // moveToNext() would not skip notes in hidden (visible = false) parts
    this.update();
  }

  /** reset cursor to start position (start of sheet or osmd.Sheet.SelectionStart if set). */
  public reset(): void {
    this.resetIterator();
    //this.iterator.moveToNext();
    this.update();
  }

  /** updates cursor style (visually), e.g. cursor.cursorOptions.type or .color. */
  private updateStyle(width: number, cursorOptions: CursorOptions = undefined): void {
    if (cursorOptions !== undefined) {
      this.cursorOptions = cursorOptions;
    }
    // Create a dummy canvas to generate the gradient for the cursor
    // FIXME This approach needs to be improved
    const c: HTMLCanvasElement = document.createElement("canvas");
    c.width = this.cursorElement.width;
    c.height = 1;
    const ctx: CanvasRenderingContext2D = c.getContext("2d");
    ctx.globalAlpha = this.cursorOptions.alpha;
    // Generate the gradient
    const gradient: CanvasGradient = ctx.createLinearGradient(0, 0, this.cursorElement.width, 0);
    switch (this.cursorOptions.type) {
      case CursorType.ThinLeft:
      case CursorType.ShortThinTopLeft:
      case CursorType.CurrentArea:
      case CursorType.CurrentAreaLeft:
        gradient.addColorStop(1, this.cursorOptions.color);
        break;
      default:
        gradient.addColorStop(0, "white"); // it was: "transparent"
        gradient.addColorStop(0.2, this.cursorOptions.color);
        gradient.addColorStop(0.8, this.cursorOptions.color);
        gradient.addColorStop(1, "white"); // it was: "transparent"
      break;
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, 1);
    this.cursorOptionsRendered = {...this.cursorOptions}; // clone, otherwise !== doesn't work
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

  public GNotesUnderCursor(instrument?: Instrument): GraphicalNote[] {
    const voiceEntries: VoiceEntry[]  = this.VoicesUnderCursor(instrument);
    const notes: GraphicalNote[] = [];
    voiceEntries.forEach(voiceEntry => {
      notes.push(...voiceEntry.Notes.map(note => this.rules.GNote(note)));
    });
    return notes;
  }

  /** Check if there was a change in current page, and attach cursor element to the corresponding HTMLElement (div).
   *  This is only necessary if using PageFormat (multiple pages).
   */
  public updateCurrentPage(): number {
    let timestamp: Fraction = this.iterator.currentTimeStamp;
    if (timestamp.RealValue < 0) {
      timestamp = new Fraction(0, 0);
    }
    for (const page of this.graphic.MusicPages) {
      const lastSystemTimestamp: Fraction = page.MusicSystems.last().GetSystemsLastTimeStamp();
      if (lastSystemTimestamp.gt(timestamp)) {
        // gt: the last timestamp of the last system is equal to the first of the next page,
        //   so we do need to use gt, not gte here.
        const newPageNumber: number = page.PageNumber;
        if (newPageNumber !== this.currentPageNumber) {
          this.container.removeChild(this.cursorElement);
          this.container = document.getElementById("osmdCanvasPage" + newPageNumber);
          this.container.appendChild(this.cursorElement);
          // TODO maybe store this.pageCurrentlyAttachedTo, though right now it isn't necessary
          // alternative to remove/append:
          // this.openSheetMusicDisplay.enableOrDisableCursor(true);
        }
        return this.currentPageNumber = newPageNumber;
      }
    }
    return 1;
  }

  public get SkipInvisibleNotes(): boolean {
    return this.skipInvisibleNotes;
  }

  public set SkipInvisibleNotes(value: boolean) {
    this.skipInvisibleNotes = value;
    this.iterator.SkipInvisibleNotes = value;
  }

  public get CursorOptions(): CursorOptions {
    return this.cursorOptions;
  }

  public set CursorOptions(value: CursorOptions) {
    this.cursorOptions = value;
  }

  /** Hides and removes the cursor element, deletes object variables. */
  public Dispose(): void {
    this.hide();
    this.container.removeChild(this.cursorElement);
    this.rules = undefined;
    this.openSheetMusicDisplay = undefined;
    this.cursorOptions = undefined;
  }
}
