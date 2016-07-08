"use strict";
var fraction_1 = require("../Common/DataObjects/fraction");
var MusicPartManager_1 = require("./MusicParts/MusicPartManager");
var Repetition_1 = require("./MusicSource/Repetition");
var Voice_1 = require("./VoiceData/Voice");
var MusicSheetErrors_1 = require("../Common/DataObjects/MusicSheetErrors");
var EngravingRules_1 = require("./Graphical/EngravingRules");
var DrawingEnums_1 = require("./Graphical/DrawingEnums");
// FIXME
//type MusicSheetParameters = any;
//type MultiTempoExpression = any;
//type PlaybackSettings = any;
//type MusicSheetParameterObject = any;
//type EngravingRules = any;
//type MusicSheetErrors = any;
//type IPhonicScoreInterface = any;
//type MusicSheetParameterChangedDelegate = any;
//type IInstrument = any;
//type ISettableInstrument = any;
//type IRepetition = any;
// FIXME Andrea: Commented out some things, have a look at (*)
var PlaybackSettings = (function () {
    function PlaybackSettings() {
    }
    return PlaybackSettings;
}());
exports.PlaybackSettings = PlaybackSettings;
var MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/ = (function () {
    function MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/() {
        this.idString = "kjgdfuilhsdaöoihfsvjh";
        this.sourceMeasures = [];
        this.repetitions = [];
        this.dynListStaves = [];
        this.timestampSortedDynamicExpressionsList = [];
        this.timestampSortedTempoExpressionsList = [];
        this.instrumentalGroups = [];
        this.instruments = [];
        // private languages: Language[] = [];
        // private activeLanguage: Language;
        this.musicPartManager = undefined;
        this.musicSheetErrors = new MusicSheetErrors_1.MusicSheetErrors();
        this.staves = [];
        this.transpose = 0;
        this.defaultStartTempoInBpm = 0;
        this.drawErroneousMeasures = false;
        this.hasBeenOpenedForTheFirstTime = false;
        this.currentEnrolledPosition = new fraction_1.Fraction(0, 1);
        this.rules = EngravingRules_1.EngravingRules.Rules;
        // (*) this.playbackSettings = new PlaybackSettings(new Fraction(4, 4, false), 100);
        this.userStartTempoInBPM = 100;
        this.pageWidth = 120;
        this.MusicPartManager = new MusicPartManager_1.MusicPartManager(this);
    }
    // (*) private musicSheetParameterChangedDelegate: MusicSheetParameterChangedDelegate;
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.getIndexFromStaff = function (staff) {
        return staff.idInMusicSheet;
    };
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "SourceMeasures", {
        get: function () {
            return this.sourceMeasures;
        },
        set: function (value) {
            this.sourceMeasures = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "Repetitions", {
        get: function () {
            return this.repetitions;
        },
        set: function (value) {
            this.repetitions = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "DynListStaves", {
        get: function () {
            return this.dynListStaves;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "TimestampSortedTempoExpressionsList", {
        get: function () {
            return this.timestampSortedTempoExpressionsList;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "TimestampSortedDynamicExpressionsList", {
        get: function () {
            return this.timestampSortedDynamicExpressionsList;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "InstrumentalGroups", {
        get: function () {
            return this.instrumentalGroups;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "Instruments", {
        get: function () {
            return this.instruments;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "SheetPlaybackSetting", {
        get: function () {
            return this.playbackSettings;
        },
        set: function (value) {
            this.playbackSettings = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "DrawErroneousMeasures", {
        get: function () {
            return this.drawErroneousMeasures;
        },
        set: function (value) {
            this.drawErroneousMeasures = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "HasBeenOpenedForTheFirstTime", {
        get: function () {
            return this.hasBeenOpenedForTheFirstTime;
        },
        set: function (value) {
            this.hasBeenOpenedForTheFirstTime = value;
        },
        enumerable: true,
        configurable: true
    });
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.InitializeStartTempoInBPM = function (startTempo) {
        // (*) this.playbackSettings.BeatsPerMinute = startTempo;
        this.userStartTempoInBPM = startTempo;
    };
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "DefaultStartTempoInBpm", {
        get: function () {
            return this.defaultStartTempoInBpm;
        },
        set: function (value) {
            this.defaultStartTempoInBpm = value;
            this.InitializeStartTempoInBPM(value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "Path", {
        get: function () {
            return this.path;
        },
        set: function (value) {
            this.path = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "Staves", {
        get: function () {
            return this.staves;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "TitleString", {
        get: function () {
            if (this.title !== undefined) {
                return this.title.text;
            }
            else {
                return "";
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "SubtitleString", {
        get: function () {
            if (this.subtitle !== undefined) {
                return this.subtitle.text;
            }
            else {
                return "";
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "ComposerString", {
        get: function () {
            if (this.composer !== undefined) {
                return this.composer.text;
            }
            else {
                return "";
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "LyricistString", {
        get: function () {
            if (this.lyricist !== undefined) {
                return this.lyricist.text;
            }
            else {
                return "";
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "Title", {
        get: function () {
            return this.title;
        },
        set: function (value) {
            this.title = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "Subtitle", {
        get: function () {
            return this.subtitle;
        },
        set: function (value) {
            this.subtitle = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "Composer", {
        get: function () {
            return this.composer;
        },
        set: function (value) {
            this.composer = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "Lyricist", {
        get: function () {
            return this.lyricist;
        },
        set: function (value) {
            this.lyricist = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "Rules", {
        get: function () {
            return this.engravingRules;
        },
        set: function (value) {
            this.engravingRules = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "SheetErrors", {
        get: function () {
            return this.musicSheetErrors;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "SelectionStart", {
        get: function () {
            return this.selectionStart;
        },
        set: function (value) {
            this.selectionStart = value.clone();
            this.currentEnrolledPosition = value.clone();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "SelectionEnd", {
        get: function () {
            return this.selectionEnd;
        },
        set: function (value) {
            this.selectionEnd = value;
        },
        enumerable: true,
        configurable: true
    });
    // (*) public get MusicSheetParameterObject(): MusicSheetParameterObject {
    //    return this.musicSheetParameterObject;
    //}
    // (*) public set MusicSheetParameterObject(value: MusicSheetParameterObject) {
    //    this.musicSheetParameterObject = value;
    //    this.Title = new Label(this.musicSheetParameterObject.Title);
    //    this.Composer = new Label(this.musicSheetParameterObject.Composer);
    //}
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.addMeasure = function (measure) {
        this.sourceMeasures.push(measure);
        measure.measureListIndex = this.sourceMeasures.length - 1;
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.checkForInstrumentWithNoVoice = function () {
        for (var idx = 0, len = this.instruments.length; idx < len; ++idx) {
            var instrument = this.instruments[idx];
            if (instrument.Voices.length === 0) {
                var voice = new Voice_1.Voice(instrument, 1);
                instrument.Voices.push(voice);
            }
        }
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.getStaffFromIndex = function (staffIndexInMusicSheet) {
        return this.staves[staffIndexInMusicSheet];
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.fillStaffList = function () {
        var i = 0;
        for (var idx = 0, len = this.instruments.length; idx < len; ++idx) {
            var instrument = this.instruments[idx];
            for (var idx2 = 0, len2 = instrument.Staves.length; idx2 < len2; ++idx2) {
                var staff = instrument.Staves[idx2];
                staff.idInMusicSheet = i;
                this.staves.push(staff);
                i++;
            }
        }
    };
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "MusicPartManager", {
        get: function () {
            return this.musicPartManager;
        },
        set: function (value) {
            this.musicPartManager = value;
        },
        enumerable: true,
        configurable: true
    });
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.getCompleteNumberOfStaves = function () {
        var num = 0;
        for (var idx = 0, len = this.instruments.length; idx < len; ++idx) {
            var instrument = this.instruments[idx];
            num += instrument.Staves.length;
        }
        return num;
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.getListOfMeasuresFromIndeces = function (start, end) {
        var measures = [];
        for (var i = start; i <= end; i++) {
            measures.push(this.sourceMeasures[i]);
        }
        return measures;
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.getNextSourceMeasure = function (measure) {
        var index = this.sourceMeasures.indexOf(measure);
        if (index === this.sourceMeasures.length - 1) {
            return measure;
        }
        return this.sourceMeasures[index + 1];
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.getFirstSourceMeasure = function () {
        return this.sourceMeasures[0];
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.getLastSourceMeasure = function () {
        return this.sourceMeasures[this.sourceMeasures.length - 1];
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.resetAllNoteStates = function () {
        var iterator = this.MusicPartManager.getIterator();
        while (!iterator.EndReached && iterator.CurrentVoiceEntries !== undefined) {
            for (var idx = 0, len = iterator.CurrentVoiceEntries.length; idx < len; ++idx) {
                var voiceEntry = iterator.CurrentVoiceEntries[idx];
                for (var idx2 = 0, len2 = voiceEntry.Notes.length; idx2 < len2; ++idx2) {
                    var note = voiceEntry.Notes[idx2];
                    note.state = DrawingEnums_1.NoteState.Normal;
                }
            }
            iterator.moveToNext();
        }
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.getMusicSheetInstrumentIndex = function (instrument) {
        return this.Instruments.indexOf(instrument);
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.getGlobalStaffIndexOfFirstStaff = function (instrument) {
        var instrumentIndex = this.getMusicSheetInstrumentIndex(instrument);
        var staffLineIndex = 0;
        for (var i = 0; i < instrumentIndex; i++) {
            staffLineIndex += this.Instruments[i].Staves.length;
        }
        return staffLineIndex;
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.setRepetitionNewUserNumberOfRepetitions = function (index, value) {
        var repIndex = 0;
        for (var i = 0; i < this.repetitions.length; i++) {
            if (this.repetitions[i] instanceof Repetition_1.Repetition) {
                if (index === repIndex) {
                    this.repetitions[i].UserNumberOfRepetitions = value;
                    break;
                }
                else {
                    repIndex++;
                }
            }
        }
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.getRepetitionByIndex = function (index) {
        var repIndex = 0;
        for (var i = 0; i < this.repetitions.length; i++) {
            if (this.repetitions[i] instanceof Repetition_1.Repetition) {
                if (index === repIndex) {
                    return this.repetitions[i];
                }
                repIndex++;
            }
        }
        return undefined;
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.CompareTo = function (other) {
        return this.Title.text.localeCompare(other.Title.text);
    };
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "Errors", {
        // (*)
        //public get IInstruments(): IInstrument[] {
        //    return this.instruments.slice()
        //}
        //public get IInitializableInstruments(): ISettableInstrument[] {
        //    return this.instruments.slice();
        //}
        //public get IRepetitions(): IRepetition[] {
        //    try {
        //        let repetitions: IRepetition[] = [];
        //        for (let idx: number = 0, len: number = this.repetitions.length; idx < len; ++idx) {
        //            let partListEntry: PartListEntry = this.repetitions[idx];
        //            if (partListEntry instanceof Repetition) {
        //                repetitions.push(<Repetition>partListEntry);
        //            }
        //        }
        //        return repetitions;
        //    } catch (ex) {
        //        console.log(/*Logger.DefaultLogger.LogError(LogLevel.NORMAL, FIXME */ "MusicSheet.IRepetitions get: ", ex);
        //        return undefined;
        //    }
        //
        //}
        //public GetExpressionsStartTempoInBPM(): number {
        //    if (this.TimestampSortedTempoExpressionsList.length > 0) {
        //        let me: MultiTempoExpression = this.TimestampSortedTempoExpressionsList[0];
        //        if (me.InstantaniousTempo !== undefined) {
        //            return me.InstantaniousTempo.TempoInBpm;
        //        } else if (me.ContinuousTempo !== undefined) {
        //            return me.ContinuousTempo.StartTempo;
        //        }
        //    }
        //    return this.UserStartTempoInBPM;
        //}
        get: function () {
            return this.musicSheetErrors.measureErrors;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "FirstMeasureNumber", {
        get: function () {
            try {
                return this.getFirstSourceMeasure().MeasureNumber;
            }
            catch (ex) {
                console.log(/* FIXME LogLevel.NORMAL, */ "MusicSheet.FirstMeasureNumber: ", ex);
                return 0;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "LastMeasureNumber", {
        get: function () {
            try {
                return this.getLastSourceMeasure().MeasureNumber;
            }
            catch (ex) {
                console.log(/* FIXME LogLevel.NORMAL, */ "MusicSheet.LastMeasureNumber: ", ex);
                return 0;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "CurrentEnrolledPosition", {
        get: function () {
            return this.currentEnrolledPosition.clone();
        },
        set: function (value) {
            this.currentEnrolledPosition = value.clone();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "Transpose", {
        get: function () {
            return this.transpose;
        },
        set: function (value) {
            this.transpose = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "FullNameString", {
        // (*)
        //public SetMusicSheetParameter(parameter: MusicSheetParameters, value: Object): void {
        //    if (this.PhonicScoreInterface !== undefined) {
        //        this.PhonicScoreInterface.RequestMusicSheetParameter(parameter, value);
        //    } else {
        //        let oldValue: Object = 0;
        //        if (parameter === undefined) { // FIXME MusicSheetParameters.MusicSheetTranspose) {
        //            oldValue = this.Transpose;
        //            this.Transpose = <number>value;
        //        }
        //        if (parameter === undefined) { // FIXME MusicSheetParameters.StartTempoInBPM) {
        //            oldValue = this.UserStartTempoInBPM;
        //            this.UserStartTempoInBPM = <number>value;
        //        }
        //        if (parameter === undefined) { // FIXME MusicSheetParameters.HighlightErrors) {
        //            oldValue = value;
        //        }
        //        if (this.MusicSheetParameterChanged !== undefined) {
        //            this.musicSheetParameterChangedDelegate(undefined, parameter, value, oldValue);
        //        }
        //    }
        //}
        //public get MusicSheetParameterChanged(): MusicSheetParameterChangedDelegate {
        //    return this.musicSheetParameterChangedDelegate;
        //}
        //public set MusicSheetParameterChanged(value: MusicSheetParameterChangedDelegate) {
        //    this.musicSheetParameterChangedDelegate = value;
        //}
        get: function () {
            return this.ComposerString + " " + this.TitleString;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "IdString", {
        get: function () {
            return this.idString;
        },
        set: function (value) {
            this.idString = value;
        },
        enumerable: true,
        configurable: true
    });
    // public Dispose(): void {
    //    this.MusicSheetParameterChanged = undefined;
    //    for (let idx: number = 0, len: number = this.instruments.length; idx < len; ++idx) {
    //        let instrument: Instrument = this.instruments[idx];
    //        instrument.dispose(); // FIXME
    //    }
    // }
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.getEnrolledSelectionStartTimeStampWorkaround = function () {
        var iter = this.MusicPartManager.getIterator(this.SelectionStart);
        return fraction_1.Fraction.createFromFraction(iter.CurrentEnrolledTimestamp);
    };
    Object.defineProperty(MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype, "SheetEndTimestamp", {
        get: function () {
            var lastMeasure = this.getLastSourceMeasure();
            return fraction_1.Fraction.plus(lastMeasure.AbsoluteTimestamp, lastMeasure.Duration);
        },
        enumerable: true,
        configurable: true
    });
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.getSourceMeasureFromTimeStamp = function (timeStamp) {
        for (var idx = 0, len = this.sourceMeasures.length; idx < len; ++idx) {
            var sm = this.sourceMeasures[idx];
            for (var idx2 = 0, len2 = sm.VerticalSourceStaffEntryContainers.length; idx2 < len2; ++idx2) {
                var vssec = sm.VerticalSourceStaffEntryContainers[idx2];
                if (fraction_1.Fraction.Equal(timeStamp, vssec.getAbsoluteTimestamp())) {
                    return sm;
                }
            }
        }
        return this.findSourceMeasureFromTimeStamp(timeStamp);
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.findSourceMeasureFromTimeStamp = function (timestamp) {
        for (var _i = 0, _a = this.sourceMeasures; _i < _a.length; _i++) {
            var sm = _a[_i];
            if (sm.AbsoluteTimestamp.lte(timestamp) && timestamp.lt(fraction_1.Fraction.plus(sm.AbsoluteTimestamp, sm.Duration))) {
                return sm;
            }
        }
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.prototype.getVisibleInstruments = function () {
        var visInstruments = [];
        for (var idx = 0, len = this.Instruments.length; idx < len; ++idx) {
            var instrument = this.Instruments[idx];
            if (instrument.Voices.length > 0 && instrument.Voices[0].Visible) {
                visInstruments.push(instrument);
            }
        }
        return visInstruments;
    };
    MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/.defaultTitle = "[kein Titel]";
    return MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/;
}());
exports.MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/ = MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/;
