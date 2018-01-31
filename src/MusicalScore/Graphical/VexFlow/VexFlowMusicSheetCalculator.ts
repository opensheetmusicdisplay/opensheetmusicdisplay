import {MusicSheetCalculator} from "../MusicSheetCalculator";
import {VexFlowGraphicalSymbolFactory} from "./VexFlowGraphicalSymbolFactory";
import {StaffMeasure} from "../StaffMeasure";
import {StaffLine} from "../StaffLine";
import {VoiceEntry} from "../../VoiceData/VoiceEntry";
import {MusicSystem} from "../MusicSystem";
import {GraphicalNote} from "../GraphicalNote";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {GraphicalMusicPage} from "../GraphicalMusicPage";
import {GraphicalTie} from "../GraphicalTie";
import {Tie} from "../../VoiceData/Tie";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {MultiExpression} from "../../VoiceData/Expressions/MultiExpression";
import {RepetitionInstruction} from "../../VoiceData/Instructions/RepetitionInstruction";
import {Beam} from "../../VoiceData/Beam";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {OctaveEnum} from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {LyricWord} from "../../VoiceData/Lyrics/LyricsWord";
import {OrnamentContainer} from "../../VoiceData/OrnamentContainer";
import {ArticulationEnum} from "../../VoiceData/VoiceEntry";
import {Tuplet} from "../../VoiceData/Tuplet";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {VexFlowTextMeasurer} from "./VexFlowTextMeasurer";

import Vex = require("vexflow");
import {Logging} from "../../../Common/Logging";
import {unitInPixels} from "./VexFlowMusicSheetDrawer";
import {VexFlowGraphicalNote} from "./VexFlowGraphicalNote";
import { VexFlowStaffEntry } from "./VexFlowStaffEntry";
import { GraphicalLyricEntry } from "../GraphicalLyricEntry";
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { GraphicalLabel } from "../GraphicalLabel";
import { GraphicalLyricWord } from "../GraphicalLyricWord";
import { BoundingBox } from "../BoundingBox";
import { GraphicalLine } from "../GraphicalLine";
// import { GraphicalLabel } from "../GraphicalLabel";

export class VexFlowMusicSheetCalculator extends MusicSheetCalculator {
    constructor() {
        super(new VexFlowGraphicalSymbolFactory());
        // let a: LyricsEntry = new LyricsEntry(undefined, undefined, undefined);
        // a = a;
        MusicSheetCalculator.TextMeasurer = new VexFlowTextMeasurer();
    }

    protected clearRecreatedObjects(): void {
        super.clearRecreatedObjects();
        for (const staffMeasures of this.graphicalMusicSheet.MeasureList) {
            for (const staffMeasure of staffMeasures) {
                (<VexFlowMeasure>staffMeasure).clean();
            }
        }
    }

    //protected clearSystemsAndMeasures(): void {
    //    for (let measure of measures) {
    //
    //    }
    //}

    /**
     * Calculates the x layout of the staff entries within the staff measures belonging to one source measure.
     * All staff entries are x-aligned throughout all vertically aligned staff measures.
     * This method is called within calculateXLayout.
     * The staff entries are aligned with minimum needed x distances.
     * The MinimumStaffEntriesWidth of every measure will be set - needed for system building.
     * @param measures
     * @returns the minimum required x width of the source measure (=list of staff measures)
     */
    protected calculateMeasureXLayout(measures: StaffMeasure[]): number {
        // Finalize beams
        /*for (let measure of measures) {
            (measure as VexFlowMeasure).finalizeBeams();
            (measure as VexFlowMeasure).finalizeTuplets();
        }*/
        // Format the voices
        const allVoices: Vex.Flow.Voice[] = [];
        const formatter: Vex.Flow.Formatter = new Vex.Flow.Formatter({
            align_rests: true,
        });

        for (const measure of measures) {
            const mvoices:  { [voiceID: number]: Vex.Flow.Voice; } = (measure as VexFlowMeasure).vfVoices;
            const voices: Vex.Flow.Voice[] = [];
            for (const voiceID in mvoices) {
                if (mvoices.hasOwnProperty(voiceID)) {
                    voices.push(mvoices[voiceID]);
                    allVoices.push(mvoices[voiceID]);

                }
            }
            if (voices.length === 0) {
                Logging.warn("Found a measure with no voices... Continuing anyway.", mvoices);
                continue;
            }
            formatter.joinVoices(voices);
        }

        let width: number = 200;
        if (allVoices.length > 0) {
            const firstMeasure: VexFlowMeasure = measures[0] as VexFlowMeasure;
            // FIXME: The following ``+ 5.0'' is temporary: it was added as a workaround for
            // FIXME: a more relaxed formatting of voices
            width = formatter.preCalculateMinTotalWidth(allVoices) / unitInPixels + 5.0;
            for (const measure of measures) {
                measure.minimumStaffEntriesWidth = width;
                (measure as VexFlowMeasure).formatVoices = undefined;
            }
            firstMeasure.formatVoices = (w: number) => {
                formatter.format(allVoices, w);
            };
        }

        return width;
    }

    protected createGraphicalTie(tie: Tie, startGse: GraphicalStaffEntry, endGse: GraphicalStaffEntry,
                                 startNote: GraphicalNote, endNote: GraphicalNote): GraphicalTie {
        return new GraphicalTie(tie, startNote, endNote);
    }


    protected updateStaffLineBorders(staffLine: StaffLine): void {
        return;
    }

    protected calculateMeasureNumberPlacement(musicSystem: MusicSystem): void {
        return;
    }

    protected staffMeasureCreatedCalculations(measure: StaffMeasure): void {
        (measure as VexFlowMeasure).staffMeasureCreatedCalculations();
    }

    /**
     * Can be used to calculate articulations, stem directions, helper(ledger) lines, and overlapping note x-displacement.
     * Is Excecuted per voice entry of a staff entry.
     * After that layoutStaffEntry is called.
     * @param voiceEntry
     * @param graphicalNotes
     * @param graphicalStaffEntry
     * @param hasPitchedNote
     * @param isGraceStaffEntry
     */
    protected layoutVoiceEntry(voiceEntry: VoiceEntry, graphicalNotes: GraphicalNote[], graphicalStaffEntry: GraphicalStaffEntry,
                               hasPitchedNote: boolean, isGraceStaffEntry: boolean): void {
        return;
    }

    /**
     * Do all layout calculations that have to be done per staff entry, like dots, ornaments, arpeggios....
     * This method is called after the voice entries are handled by layoutVoiceEntry().
     * @param graphicalStaffEntry
     */
    protected layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
        (graphicalStaffEntry.parentMeasure as VexFlowMeasure).layoutStaffEntry(graphicalStaffEntry);
    }

    /**
     * calculates the y positions of the staff lines within a system and
     * furthermore the y positions of the systems themselves.
     */
    protected calculateSystemYLayout(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            if (!this.leadSheet) {
                let globalY: number = this.rules.PageTopMargin + this.rules.TitleTopDistance + this.rules.SheetTitleHeight +
                    this.rules.TitleBottomDistance;
                for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                    const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                    // calculate y positions of stafflines within system
                    let y: number = 0;
                    for (const line of musicSystem.StaffLines) {
                        line.PositionAndShape.RelativePosition.y = y;
                        y += 10;
                    }
                    // set y positions of systems using the previous system and a fixed distance.
                    musicSystem.PositionAndShape.BorderBottom = y + 0;
                    musicSystem.PositionAndShape.RelativePosition.x = this.rules.PageLeftMargin + this.rules.SystemLeftMargin;
                    musicSystem.PositionAndShape.RelativePosition.y = globalY;
                    globalY += y + 5;
                }
            }
        }
    }

    /**
     * Is called at the begin of the method for creating the vertically aligned staff measures belonging to one source measure.
     */
    protected initStaffMeasuresCreation(): void {
        return;
    }

    protected layoutGraphicalTie(tie: GraphicalTie, tieIsAtSystemBreak: boolean): void {
        const startNote: VexFlowGraphicalNote = (tie.StartNote as VexFlowGraphicalNote);
        let vfStartNote: Vex.Flow.StaveNote = undefined;
        if (startNote !== undefined) {
            vfStartNote = startNote.vfnote[0];
        }

        const endNote: VexFlowGraphicalNote = (tie.EndNote as VexFlowGraphicalNote);
        let vfEndNote: Vex.Flow.StaveNote = undefined;
        if (endNote !== undefined) {
            vfEndNote = endNote.vfnote[0];
        }


        if (tieIsAtSystemBreak) {
            // split tie into two ties:
            const vfTie1: Vex.Flow.StaveTie = new Vex.Flow.StaveTie({
                first_note: vfStartNote,
            });
            const measure1: VexFlowMeasure = (startNote.parentStaffEntry.parentMeasure as VexFlowMeasure);
            measure1.vfTies.push(vfTie1);

            const vfTie2: Vex.Flow.StaveTie = new Vex.Flow.StaveTie({
                last_note : vfEndNote,
            });
            const measure2: VexFlowMeasure = (endNote.parentStaffEntry.parentMeasure as VexFlowMeasure);
            measure2.vfTies.push(vfTie2);
        } else {
            const vfTie: Vex.Flow.StaveTie = new Vex.Flow.StaveTie({
                first_note: vfStartNote,
                last_note : vfEndNote,
            });
            const measure: VexFlowMeasure = (endNote.parentStaffEntry.parentMeasure as VexFlowMeasure);
            measure.vfTies.push(vfTie);
        }
    }

    // FIXME: B.G. Adapt this function so that it uses the skyline calculation
    protected calculateSingleStaffLineLyricsPosition(staffLine: StaffLine, lyricVersesNumber: number[]): GraphicalStaffEntry[] {
        let numberOfVerses: number = 0;
        // FIXME: There is no class SkyBottomLineCalculator -> Fix value
        let lyricsStartYPosition: number = 8; //this.rules.StaffHeight;
        const lyricsStaffEntriesList: GraphicalStaffEntry[] = new Array<GraphicalStaffEntry>();
        // const skyBottomLineCalculator: number = 0;

        // first find maximum Ycoordinate for the whole StaffLine
        let len: number = staffLine.Measures.length;
        for (let idx: number = 0; idx < len; ++idx) {
            const measure: StaffMeasure = staffLine.Measures[idx];
            const measureRelativePosition: PointF2D = measure.PositionAndShape.RelativePosition;
            const len2: number = measure.staffEntries.length;
            for (let idx2: number = 0; idx2 < len2; ++idx2) {
                const staffEntry: GraphicalStaffEntry = measure.staffEntries[idx2];
                if (staffEntry.LyricsEntries.length > 0) {
                    lyricsStaffEntriesList.push(staffEntry);
                    numberOfVerses = Math.max(numberOfVerses, staffEntry.LyricsEntries.length);

                    // Position of Staffentry relative to StaffLine
                    const staffEntryPositionX: number = staffEntry.PositionAndShape.RelativePosition.x +
                                                measureRelativePosition.x;

                    let minMarginLeft: number = Number.MAX_VALUE;
                    let maxMarginRight: number = Number.MAX_VALUE;

                    // if more than one LyricEntry in StaffEntry, find minMarginLeft, maxMarginRight of all corresponding Labels
                    for (let i: number = 0; i < staffEntry.LyricsEntries.length; i++) {
                        const lyricsEntryLabel: GraphicalLabel = staffEntry.LyricsEntries[i].GraphicalLabel;
                        minMarginLeft = Math.min(minMarginLeft, staffEntryPositionX + lyricsEntryLabel.PositionAndShape.BorderMarginLeft);
                        maxMarginRight = Math.max(maxMarginRight, staffEntryPositionX + lyricsEntryLabel.PositionAndShape.BorderMarginRight);
                    }


                    // check BottomLine in this range and take the maximum between the two values
                    // FIXME: There is no class SkyBottomLineCalculator -> Fix value
                    // float bottomLineMax = skyBottomLineCalculator.getBottomLineMaxInRange(staffLine, minMarginLeft, maxMarginRight);
                    const bottomLineMax: number = 0.0;
                    lyricsStartYPosition = Math.max(lyricsStartYPosition, bottomLineMax);
                }
            }
        }

        let maxPosition: number = 4.0;
        // iterate again through the Staffentries with LyricEntries
        len = lyricsStaffEntriesList.length;
        for (let idx: number = 0; idx < len; ++idx) {
            const staffEntry: GraphicalStaffEntry = lyricsStaffEntriesList[idx];
            // set LyricEntryLabel RelativePosition
            for (let i: number = 0; i < staffEntry.LyricsEntries.length; i++) {
                const lyricEntry: GraphicalLyricEntry = staffEntry.LyricsEntries[i];
                const lyricsEntryLabel: GraphicalLabel = lyricEntry.GraphicalLabel;

                // read the verseNumber and get index of this number in the sorted LyricVerseNumbersList of Instrument
                // eg verseNumbers: 2,3,4,6 => 1,2,3,4
                const verseNumber: number = lyricEntry.GetLyricsEntry.VerseNumber;
                const sortedLyricVerseNumberIndex: number = lyricVersesNumber.indexOf(verseNumber);
                const firstPosition: number = lyricsStartYPosition + this.rules.LyricsHeight;

                // Y-position calculated according to aforementioned mapping
                let position: number = firstPosition + (this.rules.VerticalBetweenLyricsDistance + this.rules.LyricsHeight) * (sortedLyricVerseNumberIndex);
                if (this.leadSheet) {
                    position = 3.4 + (this.rules.VerticalBetweenLyricsDistance + this.rules.LyricsHeight) * (sortedLyricVerseNumberIndex);
                }
                lyricsEntryLabel.PositionAndShape.RelativePosition = new PointF2D(0, position);
                maxPosition = Math.max(maxPosition, position);
            }
        }

        // update BottomLine (on the whole StaffLine's length)
        if (lyricsStaffEntriesList.length > 0) {
            // const endX: number = staffLine.PositionAndShape.Size.width;
            // const startX: number = lyricsStaffEntriesList[0].PositionAndShape.RelativePosition.x +
            // lyricsStaffEntriesList[0].PositionAndShape.BorderMarginLeft +
            // lyricsStaffEntriesList[0].parentMeasure.PositionAndShape.RelativePosition.x;
            // FIXME: There is no class SkyBottomLineCalculator. This call should update the positions according to the last run
            // skyBottomLineCalculator.updateBottomLineInRange(staffLine, startX, endX, maxPosition);
        }
        return lyricsStaffEntriesList;
    }

    /**
     * calculates the dashes of lyric words and the extending underscore lines of syllables sung on more than one note.
     * @param lyricsStaffEntries
     */
    protected calculateLyricsExtendsAndDashes(lyricsStaffEntries: GraphicalStaffEntry[]): void {
        // FIXME: methods calculateSingleLyricWord + calculateLyricExtend need to be ported. -> SkylineCalculator needed.
        for (let idx: number = 0, len: number = lyricsStaffEntries.length; idx < len; ++idx) {
            const staffEntry: GraphicalStaffEntry = lyricsStaffEntries[idx];
            for (let i: number = 0; i < staffEntry.LyricsEntries.length; i++) {
                const lyricEntry: GraphicalLyricEntry = staffEntry.LyricsEntries[i];
                // let lyricsEntryLabel: GraphicalLabel = lyricEntry.GraphicalLabel;
                if (lyricEntry.ParentLyricWord !== undefined && lyricEntry.ParentLyricWord.GraphicalLyricsEntries.pop() !== lyricEntry) {
                    this.calculateSingleLyricWord(lyricEntry);
                }
                if (lyricEntry.GetLyricsEntry.extend) {
                    this.calculateLyricExtend(lyricEntry);
                }
            }
        }
    }

    /**
     * This method calculates the dashes within the syllables of a LyricWord
     * @param lyricEntry
     */
    private calculateSingleLyricWord(lyricEntry: GraphicalLyricEntry): void {
        // const skyBottomLineCalculator: SkyBottomLineCalculator = new SkyBottomLineCalculator (this.rules);
        const graphicalLyricWord: GraphicalLyricWord = lyricEntry.ParentLyricWord;
        const index: number = graphicalLyricWord.GraphicalLyricsEntries.indexOf(lyricEntry);
        let nextLyricEntry: GraphicalLyricEntry = undefined;
        if (index >= 0) {
            nextLyricEntry = graphicalLyricWord.GraphicalLyricsEntries[index + 1];
        }
        if (nextLyricEntry === undefined) {
            return;
        }
        console.log("Word", lyricEntry, lyricEntry.ParentLyricWord.GetLyricWord.Syllables.map(s => s.Text));
        const startStaffLine: StaffLine = <StaffLine>lyricEntry.StaffEntryParent.parentMeasure.ParentStaffLine;
        const nextStaffLine: StaffLine = <StaffLine>nextLyricEntry.StaffEntryParent.parentMeasure.ParentStaffLine;
        const startStaffEntry: GraphicalStaffEntry = lyricEntry.StaffEntryParent;
        const endStaffentry: GraphicalStaffEntry = nextLyricEntry.StaffEntryParent;

        // if on the same StaffLine
        if (lyricEntry.StaffEntryParent.parentMeasure.ParentStaffLine === nextLyricEntry.StaffEntryParent.parentMeasure.ParentStaffLine) {
            const startX: number = startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
                                   startStaffEntry.PositionAndShape.RelativePosition.x +
                                   lyricEntry.GraphicalLabel.PositionAndShape.BorderMarginRight;
            const endX: number = endStaffentry.parentMeasure.PositionAndShape.RelativePosition.x +
                                 endStaffentry.PositionAndShape.RelativePosition.x +
                                 nextLyricEntry.GraphicalLabel.PositionAndShape.BorderMarginLeft;
            const y: number = lyricEntry.GraphicalLabel.PositionAndShape.RelativePosition.y;
            let numberOfDashes: number = 1;
            if ((endX - startX) > this.rules.BetweenSyllabelMaximumDistance) {
                numberOfDashes = <number>Math.ceil((endX - startX) / this.rules.BetweenSyllabelMaximumDistance);
            }
            if (numberOfDashes === 1) {
                // this.calculateSingleDashForLyricWord(startStaffLine,startX,endX,y);
            } else {
                this.calculateDashes(startStaffLine, startX, endX, y);
            }
        } else {
            const startX: number = startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
                                startStaffEntry.PositionAndShape.RelativePosition.x +
                                lyricEntry.GraphicalLabel.PositionAndShape.BorderMarginRight;
            const lastStaffMeasure: StaffMeasure = startStaffLine.Measures[startStaffLine.Measures.length - 1];
            const endX: number = lastStaffMeasure.PositionAndShape.RelativePosition.x + lastStaffMeasure.PositionAndShape.Size.width;
            let y: number = lyricEntry.GraphicalLabel.PositionAndShape.RelativePosition.y;
            this.calculateDashes(startStaffLine, startX, endX, y);
            if (!(endStaffentry === endStaffentry.parentMeasure.staffEntries[0] &&
                  endStaffentry.parentMeasure === endStaffentry.parentMeasure.ParentStaffLine.Measures[0])) {
                const secondStartX: number = nextStaffLine.Measures[0].staffEntries[0].PositionAndShape.RelativePosition.x;
                const secondEndX: number = endStaffentry.parentMeasure.PositionAndShape.RelativePosition.x +
                                           endStaffentry.PositionAndShape.RelativePosition.x +
                                           nextLyricEntry.GraphicalLabel.PositionAndShape.BorderMarginLeft;
                y = nextLyricEntry.GraphicalLabel.PositionAndShape.RelativePosition.y;
                this.calculateDashes(nextStaffLine, secondStartX, secondEndX, y);
            }
        }
    }

        /**
         * This method calculates Dashes for a LyricWord.
         * @param staffLine
         * @param startX
         * @param endX
         * @param y
         */
        private calculateDashes(staffLine: StaffLine, startX: number, endX: number, y: number): void {
            const distance: number = endX - startX;
            if (distance < this.rules.MinimumDistanceBetweenDashes) {
                //this.calculateSingleDashForLyricWord(staffLine, startX, endX, y);
            } else {
                // enough distance for more Dashes
                const numberOfDashes: number = Math.floor(distance / this.rules.MinimumDistanceBetweenDashes);
                const distanceBetweenDashes: number = distance / this.rules.MinimumDistanceBetweenDashes;
                let counter: number = 0;

                startX += distanceBetweenDashes / 2;
                endX -= distanceBetweenDashes / 2;
                while (counter <= Math.floor(numberOfDashes / 2.0) && endX > startX) {
                    // distance = this.calculateRightAndLeftDashesForLyricWord(staffLine, startX, endX, y);
                    startX += distanceBetweenDashes;
                    endX -= distanceBetweenDashes;
                    counter++;
                }

                // if the remaining distance isn't big enough for two Dashes (another check would be if numberOfDashes is uneven),
                // then put the last Dash in the middle of the remaining distance
                if (distance > distanceBetweenDashes) {
                    //this.calculateSingleDashForLyricWord(staffLine, startX, endX, y);
                }
            }
        }

    /**
     * Layouts the underscore line when a lyric entry is marked as extend
     * @param {GraphicalLyricEntry} lyricEntry
     */
    private calculateLyricExtend(lyricEntry: GraphicalLyricEntry): void {
        console.log("Extend", lyricEntry);
        // let skyBottomLineCalculator: SkyBottomLineCalculator = new SkyBottomLineCalculator(this.rules);
        let startY: number = lyricEntry.GraphicalLabel.PositionAndShape.RelativePosition.y;
        // let endY: number = startY;
        const startStaffEntry: GraphicalStaffEntry = lyricEntry.StaffEntryParent;
        const startStaffLine: StaffLine = <StaffLine>lyricEntry.StaffEntryParent.parentMeasure.ParentStaffLine;

        // find endstaffEntry and staffLine
        let endStaffEntry: GraphicalStaffEntry = undefined;
        let endStaffLine: StaffLine = undefined;
        const staffIndex: number = startStaffEntry.parentMeasure.ParentStaff.idInMusicSheet;
        for (let index: number = startStaffEntry.parentVerticalContainer.Index + 1;
             index < this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length;
             ++index) {
            const gse: GraphicalStaffEntry = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[index].StaffEntries[staffIndex];
            if (gse === undefined) {
                continue;
            }
            if (gse.hasOnlyRests()) {
                if (endStaffEntry !== undefined && startStaffLine !== endStaffLine) {
                    endY = Math.max(6, endStaffEntry.PositionAndShape.BorderBottom + 2);
                }
                break;
            }
            if (gse.LyricsEntries.length > 0) {
                break;
            }
            endStaffEntry = gse;
            endStaffLine = <StaffLine>endStaffEntry.parentMeasure.ParentStaffLine;
        }
        if (endStaffEntry === undefined) {
            return;
        }
        // if on the same StaffLine
        if (startStaffLine === endStaffLine) {
            // start- and End margins from the text Labels
            const startX: number = startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
                                   startStaffEntry.PositionAndShape.RelativePosition.x +
                                   lyricEntry.GraphicalLabel.PositionAndShape.BorderMarginRight;
            const endX: number = endStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
                                 endStaffEntry.PositionAndShape.RelativePosition.x +
                                 endStaffEntry.PositionAndShape.BorderMarginRight;
            // needed in order to line up with the Label's text bottom line (is the y psoition of the underscore)
            startY -= lyricEntry.GraphicalLabel.PositionAndShape.Size.height / 4;
            // create a Line (as underscope after the LyricLabel's End)
            this.calculateSingleLyricWordWithUnderscore(startStaffLine, startX, endX, startY);
        } else { // start and end on different StaffLines
            // start margin from the text Label until the End of StaffLine
            const lastMeasureBb: BoundingBox = startStaffLine.Measures[startStaffLine.Measures.length - 1].PositionAndShape;
            const startX: number = startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
            startStaffEntry.PositionAndShape.RelativePosition.x +
            lyricEntry.GraphicalLabel.PositionAndShape.BorderMarginRight;
            const endX: number = lastMeasureBb.RelativePosition.x +
                                 lastMeasureBb.Size.width;
            // needed in order to line up with the Label's text bottom line
            startY -= lyricEntry.GraphicalLabel.PositionAndShape.Size.height / 4;
            // first Underscore until the StaffLine's End
            this.calculateSingleLyricWordWithUnderscore(startStaffLine, startX, endX, startY);
            if (endStaffEntry === undefined) {
                return;
            }
            // second Underscore in the endStaffLine until endStaffEntry (if endStaffEntry isn't the first StaffEntry of the StaffLine))
            if (!(endStaffEntry === endStaffEntry.parentMeasure.staffEntries[0] &&
                endStaffEntry.parentMeasure === endStaffEntry.parentMeasure.ParentStaffLine.Measures[0])) {
                const secondStartX: number = endStaffLine.Measures[0].staffEntries[0].PositionAndShape.RelativePosition.x;
                const secondEndX: number = endStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
                                           endStaffEntry.PositionAndShape.RelativePosition.x +
                                           endStaffEntry.PositionAndShape.BorderMarginRight;
                this.calculateSingleLyricWordWithUnderscore(endStaffLine, secondStartX, secondEndX, startY);
            }
        }
    }

    /**
     * This method calculates a single underscoreLine.
     * @param staffLine
     * @param startX
     * @param end
     * @param y
     */
    private calculateSingleLyricWordWithUnderscore(staffLine: StaffLine, startX: number, endX: number, y: number): void {
        const lineStart: PointF2D = new PointF2D(startX, y);
        const lineEnd: PointF2D = new PointF2D(endX, y);
        const graphicalLine: GraphicalLine = new GraphicalLine(lineStart, lineEnd, this.rules.LyricUnderscoreLineWidth);
        console.log("here");
        staffLine.LyricLines.push(graphicalLine);
        if (this.staffLinesWithLyricWords.indexOf(staffLine) === -1) {
            this.staffLinesWithLyricWords.push(staffLine);
        }
    }

    protected calculateSingleOctaveShift(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
        return;
    }

    protected calculateWordRepetitionInstruction(repetitionInstruction: RepetitionInstruction, measureIndex: number): void {
        return;
    }

    protected calculateMoodAndUnknownExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
        return;
    }

    protected handleTiedGraphicalNote(  tiedGraphicalNote: GraphicalNote, beams: Beam[], activeClef: ClefInstruction,
                                        octaveShiftValue: OctaveEnum, graphicalStaffEntry: GraphicalStaffEntry, duration: Fraction,
                                        openTie: Tie, isLastTieNote: boolean): void {
        return;
    }

    /**
     * Is called if a note is part of a beam.
     * @param graphicalNote
     * @param beam
     * @param openBeams a list of all currently open beams
     */
    protected handleBeam(graphicalNote: GraphicalNote, beam: Beam, openBeams: Beam[]): void {
        (graphicalNote.parentStaffEntry.parentMeasure as VexFlowMeasure).handleBeam(graphicalNote, beam);
    }

    protected handleVoiceEntryLyrics(voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry, openLyricWords: LyricWord[]): void {
        (graphicalStaffEntry as VexFlowStaffEntry).handleVoiceEntryLyrics(voiceEntry, graphicalStaffEntry, openLyricWords);
        return;
    }

    protected handleVoiceEntryOrnaments(ornamentContainer: OrnamentContainer, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
        return;
    }

    protected handleVoiceEntryArticulations(articulations: ArticulationEnum[], voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
        return;
    }

    /**
     * Is called if a note is part of a tuplet.
     * @param graphicalNote
     * @param tuplet
     * @param openTuplets a list of all currently open tuplets
     */
    protected handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet, openTuplets: Tuplet[]): void {
        (graphicalNote.parentStaffEntry.parentMeasure as VexFlowMeasure).handleTuplet(graphicalNote, tuplet);
    }
}
