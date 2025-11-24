import { Fraction } from "../../../Common/DataObjects/Fraction";
import { SystemLinesEnum } from "../../Graphical";
import { IAfterSheetReadingModule } from "../../Interfaces";
import { MusicSheet } from "../../MusicSheet";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";
import { ContinuousTempoExpression } from "../../VoiceData/Expressions/ContinuousExpressions/ContinuousTempoExpression";
import { ChangeSubType, InstantaneousTempoExpression, InstTempo, TempoType } from "../../VoiceData/Expressions/InstantaneousTempoExpression";
import { MultiTempoExpression } from "../../VoiceData/Expressions/MultiTempoExpression";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";

/** Process the TempoExpressions of a MusicSheet
 *
 * \details This class exposes one method: #calculate
 * to implement #IAfterSheetReadingModule
 */
export class TemposCalculator implements IAfterSheetReadingModule {
/** This is the method exposed for #IAfterSheetReadingModule */
    public calculate(musicSheet: MusicSheet): void {
        TemposCalculator.processTempoExpressions(musicSheet);
    }

    /** This is where the work is done.
     *
     * - [1] all MultiTempoExpressions are read from the MusicSheet
     * - they are sorted in priority order (#myTempoSorter.Compare)
     * - [2] all Inst Tempos are given a BPM if needed
     * - all Inst and Cont tempos for a single TimeStamp are consolidated
     * - [3] ContinuousTempo values are calculated
     */
    private static processTempoExpressions(musicSheet: MusicSheet | null): void {
        const AllExp: MultiTempoExpression[] = [];
        for (
            let sourceMeasureIndex: number = 0, sourceMeasures: SourceMeasure[] = musicSheet.SourceMeasures;
            sourceMeasureIndex < sourceMeasures.length; sourceMeasureIndex++
        ) {
            const sourceMeasure: SourceMeasure = sourceMeasures[sourceMeasureIndex];
            // most importantly we need to sort the lists within the measures!!
            sourceMeasure.TempoExpressions.sort(TempoSorter.Compare);
            for (
                let mte1Index: number = 0, mte1Source: MultiTempoExpression[] = sourceMeasure.TempoExpressions;
                mte1Index < mte1Source.length; mte1Index++)
            {
                const mte1: MultiTempoExpression = mte1Source[mte1Index];
                if ( mte1.InstantaneousTempo != null && mte1.InstantaneousTempo.TempoType === TempoType.none ) {
                    /** This is to handle bad input data.
                     * If a Inst tempo gets into the system without a TempoType being assigned
                     *  we here give it the assumed value of inst.
                     */
                    mte1.InstantaneousTempo.TempoType = TempoType.inst;
                }
                AllExp.push(mte1);
            }
        }
        AllExp.sort(TempoSorter.Compare);
        const primoTempo: number = TemposCalculator.cleanExpListStartingEntry(musicSheet, AllExp);
        const ExpressionsList: MultiTempoExpression[] = [];
        let previousMte: MultiTempoExpression = null;
        let previousTempo: number = primoTempo;
        for (let mteIndex: number = 0, mteSource: MultiTempoExpression[] = AllExp; mteIndex < mteSource.length; mteIndex++) {
            const mte: MultiTempoExpression = mteSource[mteIndex];
            if (previousMte === null || mte.AbsoluteTimestamp !== previousMte.AbsoluteTimestamp) {
                // Here we make sure that all Inst tempos have a non-zero BPM.
                if (mte.InstantaneousTempo != null && mte.InstantaneousTempo.TempoInBpm === 0.0) {
                    const ite: InstantaneousTempoExpression = mte.InstantaneousTempo;
                    /** This is to handle bad input data.
                     * If a metronomeMark tempo gets into the system without a BPM,
                     *  we here give it the assumed value of 'a tempo'.
                     */
                    if (ite.isMetronomeMark) {
                        ite.TempoInBpm = previousTempo;
                    }
                    // An inst tempo should normally have a non-zero BPM.
                    if (ite instanceof InstantaneousTempoExpression && ite.TempoType !== TempoType.change) {
                        ite.TempoInBpm = InstantaneousTempoExpression.getDefaultValueForInstTempo(ite.InstTempo);
                    }
                    // A change tempo will have a 0 BPM unless it was set by #calculatePrimoTempo, because it was on the first measure.
                    if (ite.TempoType === TempoType.change) {
                        switch (ite.ChangeSubType) {
                            case ChangeSubType.atempo:
                                {
                                    ite.TempoInBpm = previousTempo;
                                    break;
                                }
                            case ChangeSubType.doppioMovimento:
                                {
                                    ite.TempoInBpm = previousTempo * 2;
                                    break;
                                }
                            case ChangeSubType.tempoprimo:
                                {
                                    ite.TempoInBpm = primoTempo;
                                    break;
                                }
                            default:
                                {
                                    break;
                                }
                        }
                    }
                    previousTempo = ite.TempoInBpm;
                }
            }
            /** Here we process two mte entries with the same TimeStamp.
             *
             * They have been sorted by #myTempoSorter.Compare so that the 'prev' one
             *  has higher priority than 'this' one.
             * - If 'prev' and 'this' both have Inst, then 'this' Inst is lower priority. Delete 'this' Inst.
             * - If 'prev' and 'this' both have Cont, then delete 'this' Cont.
             * - If 'prev' does not have Cont and 'this' has Cont, then move 'this' Cont to 'prev'.
             *
             * \todo This should be looked at. Are there priorities between Cont labels?
             */
            else {
                if (previousMte != null || mte.AbsoluteTimestamp === previousMte.AbsoluteTimestamp) {
                    if (previousMte.InstantaneousTempo != null && mte.InstantaneousTempo != null) {
                        mte.clearInstantaneousTempo();
                    }
                    if (mte.ContinuousTempo != null) {
                        if (previousMte.ContinuousTempo === null) {
                            previousMte.addExpression(mte.ContinuousTempo, "");
                        }
                        mte.clearContinuousTempo();
                    }
                }
            }
            // If, after the above processing, 'this' mte doesn't have either Inst or Cont, discard it.
            if (mte.InstantaneousTempo === null && mte.ContinuousTempo === null) {
                // discard this mte and move on
                const indexInList: number = mte.SourceMeasureParent.TempoExpressions.indexOf(mte);
                if (indexInList >= 0) {
                    mte.SourceMeasureParent.TempoExpressions.splice(indexInList, 1);
                }
            } else {
                ExpressionsList.push(mte);
                previousMte = mte;
            }
        }
        previousTempo = primoTempo;
        for (let exp_index: number = 0; exp_index < ExpressionsList.length; exp_index++) {
            const mte: MultiTempoExpression = ExpressionsList[exp_index];
            if (mte.InstantaneousTempo != null) {
                previousTempo = mte.InstantaneousTempo.TempoInBpm;
            }
            if (mte.ContinuousTempo != null) {
                const cte: ContinuousTempoExpression = mte.ContinuousTempo;
                cte.StartTempo = previousTempo;
                const startMeasureIdx: number = mte.SourceMeasureParent.measureListIndex;
                let endMeasureIdx: number = startMeasureIdx;
                const maxEndMeasureIdx: number = Math.min(startMeasureIdx + musicSheet.Rules.TempoChangeMeasureValidity, musicSheet.SourceMeasures.length - 1);
                while (endMeasureIdx <= maxEndMeasureIdx) {
                    const currentMeasure: SourceMeasure = musicSheet.SourceMeasures[endMeasureIdx];
                    // check if this measure ends a repetition
                    // or ends a movement (end line given)
                    // or simply is the last measure:
                    const endsMovement: boolean = currentMeasure.endingBarStyleEnum === SystemLinesEnum.ThinBold;
                    if (currentMeasure.endsWithLineRepetition() || endsMovement || endMeasureIdx === musicSheet.SourceMeasures.length - 1) {
                        break;
                    }
                    // check if the measure starts with a repetition
                    // or with a key change:
                    // then take the previous measure as end measure:
                    else
                    // if (endMeasureIdx > startMeasureIdx && (beginsRepetition || currentMeasure.beginsWithKeyChange(mte.ContinuousTempo.StaffNumber))) {
                    // TODO what does a key change have to do with tempo?
                    if (endMeasureIdx > startMeasureIdx && currentMeasure.beginsWithRepetition()) {
                        endMeasureIdx--;
                        break;
                    } else {
                        endMeasureIdx++;
                    }
                }
                const endMeasure: SourceMeasure = musicSheet.SourceMeasures[endMeasureIdx];
                // set the end timestamp to slightly before the end of the found end measure:
                // (slightly before is needed to not include the first note of the next measure)
                let endTimestamp: Fraction = Fraction.plus(endMeasure.AbsoluteTimestamp, Fraction.minus(endMeasure.Duration, new Fraction(1, 64)));
                let nextTimestamp: Fraction;
                if (exp_index < ExpressionsList.length - 1) {
                    nextTimestamp = ExpressionsList[exp_index + 1].AbsoluteTimestamp;
                    if (nextTimestamp.RealValue < endTimestamp.RealValue) {
                        endTimestamp = nextTimestamp;
                    }
                }
                cte.AbsoluteEndTimestamp = endTimestamp;
                let Adjustment: number = cte.StartTempo * (1.0 - musicSheet.Rules.TempoContinousFactor) * cte.getTempoFactor();
                // to have some length influence but not too much:
                // switched to 4th-root, make adjustment=1.0 after 2 measures, set minimum to 0.6:
                Adjustment *= (Math.pow(Math.max(0.6, Math.min(cte.AbsoluteTimeSpan, 2.0) / 2.0), 1.0 / 4.0));
                cte.EndTempo = cte.StartTempo + Adjustment;
            }
        }
        musicSheet.TimestampSortedTempoExpressionsList = ExpressionsList;
        if (ExpressionsList[0]) {
            musicSheet.DefaultStartTempoInBpm = ExpressionsList[0].InstantaneousTempo.TempoInBpm;
        }
    }
    /** Clean the start of the  expressions list and return the TempoPrimo BPM.
     *
     * Make sure that there is an Inst tempo at [0 0/1] with a non-zero BPM.
     * Return that BPM for TempoPrimo.
     */
    private static cleanExpListStartingEntry(ms: MusicSheet, ExpList: MultiTempoExpression[]): number {
        // if there is no mte given at the start of the piece:
        if (ExpList.length === 0 || !ExpList[0].AbsoluteTimestamp.Equals(new Fraction(0, 1))) {
            const mte: MultiTempoExpression = new MultiTempoExpression(ms.SourceMeasures[0], new Fraction(0, 1));
            // insert at start
            ExpList = [mte].concat(ExpList);
        }
        if (!ExpList[0].InstantaneousTempo) {
            const I: InstantaneousTempoExpression = new InstantaneousTempoExpression("*generated", PlacementEnum.Above, 1, 0, ExpList[0], true);
            ExpList[0].addExpression(I, "");
        }
        const Inst0: InstantaneousTempoExpression = ExpList[0].InstantaneousTempo;
        if (Inst0.TempoInBpm !== 0.0) {
            // we have what we need
            return Inst0.TempoInBpm;
        }
        if (Inst0.TempoInBpm === 0.0 && ms.DefaultStartTempoInBpm > 0) {
            Inst0.TempoInBpm = ms.DefaultStartTempoInBpm;
        }
        if (Inst0.TempoInBpm === 0.0) {
            Inst0.TempoInBpm = InstantaneousTempoExpression.getDefaultValueForInstTempo[InstTempo.moderato];
        }
        return Inst0.TempoInBpm;
    }
}
export class TempoSorter {
    // constructor() {
        // super();
        // TypeInfo.SetPrototypeOf(this, TempoSorter.prototype);
    // }
    /** Sort for processing
     *
     * \details Sort by AbsoluteTimeStamp, followed by metronomeMark, Inst, atempo, tempoprimo, Cont
     */
    public static Compare(x: MultiTempoExpression, y: MultiTempoExpression): number {
        let ret: number = 0;
        ret = TempoSorter.CompareNumber(x.AbsoluteTimestamp.RealValue, y.AbsoluteTimestamp.RealValue);
        if (ret !== 0) {
            return ret;
        }
        const sortPriorityX: number = TempoSorter.calcSortPriority(x);
        const sortPriorityY: number = TempoSorter.calcSortPriority(y);
        ret = TempoSorter.CompareNumber(sortPriorityX, sortPriorityY);
        return ret;
    }
    public static calcSortPriority(z: MultiTempoExpression): number {
        if (z.InstantaneousTempo != null) {
            switch (z.InstantaneousTempo.TempoType) {
                case TempoType.metronomeMark:
                    {
                        return 1;
                    }
                case TempoType.inst:
                    {
                        return 2;
                    }
                case TempoType.change:
                    {
                        switch (z.InstantaneousTempo.ChangeSubType) {
                            case ChangeSubType.atempo:
                            case ChangeSubType.doppioMovimento:
                                {
                                    return 3;
                                }
                            case ChangeSubType.tempoprimo:
                                {
                                    return 4;
                                }
                            default:
                                break;
                        }
                        break;
                    }
                default: {
                    break;
                }
            }
            return 5;
        } else {
            return 9;
        }
    }
    public static CompareNumber(a: number, b: number): number {
        if (a < b) {
            return -1;
        } else if (a === b) {
            return 0;
        } else {
            return 1;
        }
    }
}
