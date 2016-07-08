"use strict";
var MusicSheet_1 = require("../MusicSheet");
var SourceMeasure_1 = require("../VoiceData/SourceMeasure");
var fraction_1 = require("../../Common/DataObjects/fraction");
var InstrumentReader_1 = require("./InstrumentReader");
var Instrument_1 = require("../Instrument");
var ITextTranslation_1 = require("../Interfaces/ITextTranslation");
var Exceptions_1 = require("../Exceptions");
var logging_1 = require("../../Common/logging");
var RhythmInstruction_1 = require("../VoiceData/Instructions/RhythmInstruction");
var RhythmInstruction_2 = require("../VoiceData/Instructions/RhythmInstruction");
var SourceStaffEntry_1 = require("../VoiceData/SourceStaffEntry");
var InstrumentalGroup_1 = require("../InstrumentalGroup");
var SubInstrument_1 = require("../SubInstrument");
var ClefInstruction_1 = require("../VoiceData/Instructions/ClefInstruction");
var Label_1 = require("../Label");
var MusicSheetReader /*implements IMusicSheetReader*/ = (function () {
    function MusicSheetReader /*implements IMusicSheetReader*/() {
        this.completeNumberOfStaves = 0;
    }
    Object.defineProperty(MusicSheetReader /*implements IMusicSheetReader*/.prototype, "CompleteNumberOfStaves", {
        get: function () {
            return this.completeNumberOfStaves;
        },
        enumerable: true,
        configurable: true
    });
    MusicSheetReader /*implements IMusicSheetReader*/.doCalculationsAfterDurationHasBeenSet = function (instrumentReaders) {
        for (var _i = 0, instrumentReaders_1 = instrumentReaders; _i < instrumentReaders_1.length; _i++) {
            var instrumentReader = instrumentReaders_1[_i];
            instrumentReader.doCalculationsAfterDurationHasBeenSet();
        }
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.createMusicSheet = function (root, path) {
        try {
            return this._createMusicSheet(root, path);
        }
        catch (e) {
            logging_1.Logging.log("MusicSheetReader.CreateMusicSheet", e);
        }
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype._removeFromArray = function (list, elem) {
        var i = list.indexOf(elem);
        if (i !== -1) {
            list.splice(i, 1);
        }
    };
    // Trim from a string also newlines
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.trimString = function (str) {
        return str.replace(/^\s+|\s+$/g, "");
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype._lastElement = function (list) {
        return list[list.length - 1];
    };
    //public SetPhonicScoreInterface(phonicScoreInterface: IPhonicScoreInterface): void {
    //  this.phonicScoreInterface = phonicScoreInterface;
    //}
    //public ReadMusicSheetParameters(sheetObject: MusicSheetParameterObject, root: IXmlElement, path: string): MusicSheetParameterObject {
    //  this.musicSheet = new MusicSheet();
    //  if (root !== undefined) {
    //    this.pushSheetLabels(root, path);
    //    if (this.musicSheet.Title !== undefined) {
    //      sheetObject.Title = this.musicSheet.Title.text;
    //    }
    //    if (this.musicSheet.Composer !== undefined) {
    //      sheetObject.Composer = this.musicSheet.Composer.text;
    //    }
    //    if (this.musicSheet.Lyricist !== undefined) {
    //      sheetObject.Lyricist = this.musicSheet.Lyricist.text;
    //    }
    //    let partlistNode: IXmlElement = root.element("part-list");
    //    let partList: IXmlElement[] = partlistNode.elements();
    //    this.createInstrumentGroups(partList);
    //    for (let idx: number = 0, len: number = this.musicSheet.Instruments.length; idx < len; ++idx) {
    //      let instr: Instrument = this.musicSheet.Instruments[idx];
    //      sheetObject.InstrumentList.push(__init(new MusicSheetParameterObject.LibrarySheetInstrument(), { name: instr.name }));
    //    }
    //  }
    //  return sheetObject;
    //}
    MusicSheetReader /*implements IMusicSheetReader*/.prototype._createMusicSheet = function (root, path) {
        var instrumentReaders = [];
        var sourceMeasureCounter = 0;
        this.musicSheet = new MusicSheet_1.MusicSheet();
        this.musicSheet.Path = path;
        if (root === undefined) {
            throw new Exceptions_1.MusicSheetReadingException("Undefined root element");
        }
        this.pushSheetLabels(root, path);
        var partlistNode = root.element("part-list");
        if (partlistNode === undefined) {
            throw new Exceptions_1.MusicSheetReadingException("Undefined partListNode");
        }
        var partInst = root.elements("part");
        console.log(partInst.length + " parts");
        var partList = partlistNode.elements();
        //Logging.debug("Starting initializeReading");
        this.initializeReading(partList, partInst, instrumentReaders);
        //Logging.debug("Done initializeReading");
        var couldReadMeasure = true;
        this.currentFraction = new fraction_1.Fraction(0, 1);
        var guitarPro = false;
        var encoding = root.element("identification");
        if (encoding !== undefined) {
            encoding = encoding.element("encoding");
        }
        if (encoding !== undefined) {
            encoding = encoding.element("software");
        }
        if (encoding !== undefined && encoding.value === "Guitar Pro 5") {
            guitarPro = true;
        }
        while (couldReadMeasure) {
            if (this.currentMeasure !== undefined && this.currentMeasure.endsPiece) {
                sourceMeasureCounter = 0;
            }
            this.currentMeasure = new SourceMeasure_1.SourceMeasure(this.completeNumberOfStaves);
            for (var _i = 0, instrumentReaders_2 = instrumentReaders; _i < instrumentReaders_2.length; _i++) {
                var instrumentReader = instrumentReaders_2[_i];
                try {
                    couldReadMeasure = couldReadMeasure && instrumentReader.readNextXmlMeasure(this.currentMeasure, this.currentFraction, guitarPro);
                }
                catch (e) {
                    var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/InstrumentError", "Error while reading instruments.");
                    throw new Exceptions_1.MusicSheetReadingException(errorMsg, e);
                }
            }
            if (couldReadMeasure) {
                //Logging.debug("couldReadMeasure: 1");
                this.musicSheet.addMeasure(this.currentMeasure);
                //Logging.debug("couldReadMeasure: 2");
                this.checkIfRhythmInstructionsAreSetAndEqual(instrumentReaders);
                //Logging.debug("couldReadMeasure: 3");
                this.checkSourceMeasureForundefinedEntries();
                //Logging.debug("couldReadMeasure: 4");
                this.setSourceMeasureDuration(instrumentReaders, sourceMeasureCounter);
                //Logging.debug("couldReadMeasure: 5");
                MusicSheetReader.doCalculationsAfterDurationHasBeenSet(instrumentReaders);
                //Logging.debug("couldReadMeasure: 6");
                this.currentMeasure.AbsoluteTimestamp = this.currentFraction.clone();
                this.musicSheet.SheetErrors.finalizeMeasure(this.currentMeasure.MeasureNumber);
                this.currentFraction.Add(this.currentMeasure.Duration);
                this.previousMeasure = this.currentMeasure;
            }
        }
        if (this.repetitionInstructionReader !== undefined) {
            this.repetitionInstructionReader.removeRedundantInstructions();
            if (this.repetitionCalculator !== undefined) {
                this.repetitionCalculator.calculateRepetitions(this.musicSheet, this.repetitionInstructionReader.RepetitionInstructions);
            }
        }
        this.musicSheet.checkForInstrumentWithNoVoice();
        this.musicSheet.fillStaffList();
        //this.musicSheet.DefaultStartTempoInBpm = this.musicSheet.SheetPlaybackSetting.BeatsPerMinute;
        //for (let idx: number = 0, len: number = this.afterSheetReadingModules.length; idx < len; ++idx) {
        //  let afterSheetReadingModule: IAfterSheetReadingModule = this.afterSheetReadingModules[idx];
        //  afterSheetReadingModule.calculate(this.musicSheet);
        //}
        return this.musicSheet;
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.initializeReading = function (partList, partInst, instrumentReaders) {
        var instrumentDict = this.createInstrumentGroups(partList);
        this.completeNumberOfStaves = this.getCompleteNumberOfStavesFromXml(partInst);
        if (partInst.length !== 0) {
            // (*) this.repetitionInstructionReader.MusicSheet = this.musicSheet;
            this.currentFraction = new fraction_1.Fraction(0, 1);
            this.currentMeasure = undefined;
            this.previousMeasure = undefined;
        }
        var counter = 0;
        for (var _i = 0, partInst_1 = partInst; _i < partInst_1.length; _i++) {
            var node = partInst_1[_i];
            var idNode = node.attribute("id");
            if (idNode) {
                var currentInstrument = instrumentDict[idNode.value];
                var xmlMeasureList = node.elements("measure");
                var instrumentNumberOfStaves = 1;
                try {
                    instrumentNumberOfStaves = this.getInstrumentNumberOfStavesFromXml(node);
                }
                catch (err) {
                    var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/InstrumentStavesNumberError", "Invalid number of staves at instrument: ");
                    this.musicSheet.SheetErrors.push(errorMsg + currentInstrument.Name);
                    continue;
                }
                currentInstrument.createStaves(instrumentNumberOfStaves);
                instrumentReaders.push(new InstrumentReader_1.InstrumentReader(this.repetitionInstructionReader, xmlMeasureList, currentInstrument));
                if (this.repetitionInstructionReader !== undefined) {
                    this.repetitionInstructionReader.XmlMeasureList[counter] = xmlMeasureList;
                }
                counter++;
            }
        }
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.checkIfRhythmInstructionsAreSetAndEqual = function (instrumentReaders) {
        var rhythmInstructions = [];
        for (var i = 0; i < this.completeNumberOfStaves; i++) {
            if (this.currentMeasure.FirstInstructionsStaffEntries[i] !== undefined) {
                var last = this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions[this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.length - 1];
                if (last instanceof RhythmInstruction_1.RhythmInstruction) {
                    rhythmInstructions.push(last);
                }
            }
        }
        var maxRhythmValue = 0.0;
        var index = -1;
        for (var idx = 0, len = rhythmInstructions.length; idx < len; ++idx) {
            var rhythmInstruction = rhythmInstructions[idx];
            if (rhythmInstruction.Rhythm.RealValue > maxRhythmValue) {
                if (this.areRhythmInstructionsMixed(rhythmInstructions) && rhythmInstruction.SymbolEnum !== RhythmInstruction_2.RhythmSymbolEnum.NONE) {
                    continue;
                }
                maxRhythmValue = rhythmInstruction.Rhythm.RealValue;
                index = rhythmInstructions.indexOf(rhythmInstruction);
            }
        }
        if (rhythmInstructions.length > 0 && rhythmInstructions.length < this.completeNumberOfStaves) {
            var rhythmInstruction = rhythmInstructions[index].clone();
            for (var i = 0; i < this.completeNumberOfStaves; i++) {
                if (this.currentMeasure.FirstInstructionsStaffEntries[i] !== undefined &&
                    !(this._lastElement(this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions) instanceof RhythmInstruction_1.RhythmInstruction)) {
                    this.currentMeasure.FirstInstructionsStaffEntries[i].removeAllInstructionsOfTypeRhythmInstruction();
                    this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.push(rhythmInstruction.clone());
                }
                if (this.currentMeasure.FirstInstructionsStaffEntries[i] === undefined) {
                    this.currentMeasure.FirstInstructionsStaffEntries[i] = new SourceStaffEntry_1.SourceStaffEntry(undefined, undefined);
                    this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.push(rhythmInstruction.clone());
                }
            }
            for (var idx = 0, len = instrumentReaders.length; idx < len; ++idx) {
                var instrumentReader = instrumentReaders[idx];
                instrumentReader.ActiveRhythm = rhythmInstruction;
            }
        }
        if (rhythmInstructions.length === 0 && this.currentMeasure === this.musicSheet.SourceMeasures[0]) {
            var rhythmInstruction = new RhythmInstruction_1.RhythmInstruction(new fraction_1.Fraction(4, 4, false), 4, 4, RhythmInstruction_2.RhythmSymbolEnum.NONE);
            for (var i = 0; i < this.completeNumberOfStaves; i++) {
                if (this.currentMeasure.FirstInstructionsStaffEntries[i] === undefined) {
                    this.currentMeasure.FirstInstructionsStaffEntries[i] = new SourceStaffEntry_1.SourceStaffEntry(undefined, undefined);
                }
                else {
                    this.currentMeasure.FirstInstructionsStaffEntries[i].removeAllInstructionsOfTypeRhythmInstruction();
                }
                this.currentMeasure.FirstInstructionsStaffEntries[i].Instructions.push(rhythmInstruction);
            }
            for (var idx = 0, len = instrumentReaders.length; idx < len; ++idx) {
                var instrumentReader = instrumentReaders[idx];
                instrumentReader.ActiveRhythm = rhythmInstruction;
            }
        }
        for (var idx = 0, len = rhythmInstructions.length; idx < len; ++idx) {
            var rhythmInstruction = rhythmInstructions[idx];
            if (rhythmInstruction.Rhythm.RealValue < maxRhythmValue) {
                if (this._lastElement(this.currentMeasure.FirstInstructionsStaffEntries[rhythmInstructions.indexOf(rhythmInstruction)].Instructions) instanceof RhythmInstruction_1.RhythmInstruction) {
                    // TODO Test correctness
                    var instrs = this.currentMeasure.FirstInstructionsStaffEntries[rhythmInstructions.indexOf(rhythmInstruction)].Instructions;
                    instrs[instrs.length - 1] = rhythmInstructions[index].clone();
                }
            }
            if (Math.abs(rhythmInstruction.Rhythm.RealValue - maxRhythmValue) < 0.000001 &&
                rhythmInstruction.SymbolEnum !== RhythmInstruction_2.RhythmSymbolEnum.NONE &&
                this.areRhythmInstructionsMixed(rhythmInstructions)) {
                rhythmInstruction.SymbolEnum = RhythmInstruction_2.RhythmSymbolEnum.NONE;
            }
        }
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.areRhythmInstructionsMixed = function (rhythmInstructions) {
        for (var i = 1; i < rhythmInstructions.length; i++) {
            if (Math.abs(rhythmInstructions[i].Rhythm.RealValue - rhythmInstructions[0].Rhythm.RealValue) < 0.000001 &&
                rhythmInstructions[i].SymbolEnum !== rhythmInstructions[0].SymbolEnum) {
                return true;
            }
        }
        return false;
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.setSourceMeasureDuration = function (instrumentReaders, sourceMeasureCounter) {
        var activeRhythm = new fraction_1.Fraction(0, 1);
        var instrumentsMaxTieNoteFractions = [];
        for (var idx = 0, len = instrumentReaders.length; idx < len; ++idx) {
            var instrumentReader = instrumentReaders[idx];
            instrumentsMaxTieNoteFractions.push(instrumentReader.MaxTieNoteFraction);
            var activeRythmMeasure = instrumentReader.ActiveRhythm.Rhythm;
            if (activeRhythm < activeRythmMeasure) {
                activeRhythm = new fraction_1.Fraction(activeRythmMeasure.Numerator, activeRythmMeasure.Denominator, false);
            }
        }
        var instrumentsDurations = this.currentMeasure.calculateInstrumentsDuration(this.musicSheet, instrumentsMaxTieNoteFractions);
        var maxInstrumentDuration = new fraction_1.Fraction(0, 1);
        for (var idx = 0, len = instrumentsDurations.length; idx < len; ++idx) {
            var instrumentsDuration = instrumentsDurations[idx];
            if (maxInstrumentDuration < instrumentsDuration) {
                maxInstrumentDuration = instrumentsDuration;
            }
        }
        if (fraction_1.Fraction.Equal(maxInstrumentDuration, activeRhythm)) {
            this.checkFractionsForEquivalence(maxInstrumentDuration, activeRhythm);
        }
        else {
            if (maxInstrumentDuration < activeRhythm) {
                maxInstrumentDuration = this.currentMeasure.reverseCheck(this.musicSheet, maxInstrumentDuration);
                this.checkFractionsForEquivalence(maxInstrumentDuration, activeRhythm);
            }
        }
        this.currentMeasure.ImplicitMeasure = this.checkIfMeasureIsImplicit(maxInstrumentDuration, activeRhythm);
        if (!this.currentMeasure.ImplicitMeasure) {
            sourceMeasureCounter++;
        }
        this.currentMeasure.Duration = maxInstrumentDuration;
        this.currentMeasure.MeasureNumber = sourceMeasureCounter;
        for (var i = 0; i < instrumentsDurations.length; i++) {
            var instrumentsDuration = instrumentsDurations[i];
            if ((this.currentMeasure.ImplicitMeasure && instrumentsDuration !== maxInstrumentDuration) ||
                instrumentsDuration !== activeRhythm &&
                    !this.allInstrumentsHaveSameDuration(instrumentsDurations, maxInstrumentDuration)) {
                var firstStaffIndexOfInstrument = this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.musicSheet.Instruments[i]);
                for (var staffIndex = 0; staffIndex < this.musicSheet.Instruments[i].Staves.length; staffIndex++) {
                    if (!this.staffMeasureIsEmpty(firstStaffIndexOfInstrument + staffIndex)) {
                        this.currentMeasure.setErrorInStaffMeasure(firstStaffIndexOfInstrument + staffIndex, true);
                        var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/MissingNotesError", "Given Notes don't correspond to measure duration.");
                        this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    }
                }
            }
        }
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.checkFractionsForEquivalence = function (maxInstrumentDuration, activeRhythm) {
        if (activeRhythm.Denominator > maxInstrumentDuration.Denominator) {
            var factor = activeRhythm.Denominator / maxInstrumentDuration.Denominator;
            maxInstrumentDuration.multiplyWithFactor(factor);
        }
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.checkIfMeasureIsImplicit = function (maxInstrumentDuration, activeRhythm) {
        if (this.previousMeasure === undefined && maxInstrumentDuration < activeRhythm) {
            return true;
        }
        if (this.previousMeasure !== undefined) {
            return fraction_1.Fraction.plus(this.previousMeasure.Duration, maxInstrumentDuration).CompareTo(activeRhythm) === 0;
        }
        return false;
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.allInstrumentsHaveSameDuration = function (instrumentsDurations, maxInstrumentDuration) {
        var counter = 0;
        for (var idx = 0, len = instrumentsDurations.length; idx < len; ++idx) {
            var instrumentsDuration = instrumentsDurations[idx];
            if (instrumentsDuration === maxInstrumentDuration) {
                counter++;
            }
        }
        return (counter === instrumentsDurations.length && maxInstrumentDuration !== new fraction_1.Fraction(0, 1));
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.staffMeasureIsEmpty = function (index) {
        var counter = 0;
        for (var i = 0; i < this.currentMeasure.VerticalSourceStaffEntryContainers.length; i++) {
            if (this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[index] === undefined) {
                counter++;
            }
        }
        return (counter === this.currentMeasure.VerticalSourceStaffEntryContainers.length);
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.checkSourceMeasureForundefinedEntries = function () {
        for (var i = this.currentMeasure.VerticalSourceStaffEntryContainers.length - 1; i >= 0; i--) {
            for (var j = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.length - 1; j >= 0; j--) {
                var sourceStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[j];
                if (sourceStaffEntry !== undefined) {
                    for (var k = sourceStaffEntry.VoiceEntries.length - 1; k >= 0; k--) {
                        var voiceEntry = sourceStaffEntry.VoiceEntries[k];
                        if (voiceEntry.Notes.length === 0) {
                            this._removeFromArray(voiceEntry.ParentVoice.VoiceEntries, voiceEntry);
                            this._removeFromArray(sourceStaffEntry.VoiceEntries, voiceEntry);
                        }
                    }
                }
                if (sourceStaffEntry !== undefined && sourceStaffEntry.VoiceEntries.length === 0) {
                    this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[j] = undefined;
                }
            }
        }
        for (var i = this.currentMeasure.VerticalSourceStaffEntryContainers.length - 1; i >= 0; i--) {
            var counter = 0;
            for (var idx = 0, len = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.length; idx < len; ++idx) {
                var sourceStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries[idx];
                if (sourceStaffEntry === undefined) {
                    counter++;
                }
            }
            if (counter === this.currentMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries.length) {
                this._removeFromArray(this.currentMeasure.VerticalSourceStaffEntryContainers, this.currentMeasure.VerticalSourceStaffEntryContainers[i]);
            }
        }
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.pushSheetLabels = function (root, filePath) {
        this.readComposer(root);
        this.readTitle(root);
        if (this.musicSheet.Title === undefined || this.musicSheet.Composer === undefined) {
            this.readTitleAndComposerFromCredits(root);
        }
        if (this.musicSheet.Title === undefined) {
            try {
                var barI = Math.max(0, filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
                var filename = filePath.substr(barI);
                var filenameSplits = filename.split(".", 1);
                this.musicSheet.Title = new Label_1.Label(filenameSplits[0]);
            }
            catch (ex) {
                logging_1.Logging.log("MusicSheetReader.pushSheetLabels: ", ex);
            }
        }
    };
    // Checks whether _elem_ has an attribute with value _val_.
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.presentAttrsWithValue = function (elem, val) {
        for (var _i = 0, _a = elem.attributes(); _i < _a.length; _i++) {
            var attr = _a[_i];
            if (attr.value === val) {
                return true;
            }
        }
        return false;
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.readComposer = function (root) {
        var identificationNode = root.element("identification");
        if (identificationNode !== undefined) {
            var creators = identificationNode.elements("creator");
            for (var idx = 0, len = creators.length; idx < len; ++idx) {
                var creator = creators[idx];
                if (creator.hasAttributes) {
                    if (this.presentAttrsWithValue(creator, "composer")) {
                        this.musicSheet.Composer = new Label_1.Label(this.trimString(creator.value));
                        continue;
                    }
                    if (this.presentAttrsWithValue(creator, "lyricist") || this.presentAttrsWithValue(creator, "poet")) {
                        this.musicSheet.Lyricist = new Label_1.Label(this.trimString(creator.value));
                    }
                }
            }
        }
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.readTitleAndComposerFromCredits = function (root) {
        var systemYCoordinates = this.computeSystemYCoordinates(root);
        if (systemYCoordinates === 0) {
            return;
        }
        var largestTitleCreditSize = 1;
        var finalTitle = undefined;
        var largestCreditYInfo = 0;
        var finalSubtitle = undefined;
        var possibleTitle = undefined;
        var creditElements = root.elements("credit");
        for (var idx = 0, len = creditElements.length; idx < len; ++idx) {
            var credit = creditElements[idx];
            if (!credit.attribute("page")) {
                return;
            }
            if (credit.attribute("page").value === "1") {
                var creditChild = undefined;
                if (credit !== undefined) {
                    creditChild = credit.element("credit-words");
                    if (!creditChild.attribute("justify")) {
                        break;
                    }
                    var creditJustify = creditChild.attribute("justify").value;
                    var creditY = creditChild.attribute("default-y").value;
                    var creditYInfo = parseFloat(creditY);
                    if (creditYInfo > systemYCoordinates) {
                        if (this.musicSheet.Title === undefined) {
                            var creditSize = creditChild.attribute("font-size").value;
                            var titleCreditSizeInt = parseFloat(creditSize);
                            if (largestTitleCreditSize < titleCreditSizeInt) {
                                largestTitleCreditSize = titleCreditSizeInt;
                                finalTitle = creditChild.value;
                            }
                        }
                        if (this.musicSheet.Subtitle === undefined) {
                            if (creditJustify !== "right" && creditJustify !== "left") {
                                if (largestCreditYInfo < creditYInfo) {
                                    largestCreditYInfo = creditYInfo;
                                    if (possibleTitle) {
                                        finalSubtitle = possibleTitle;
                                        possibleTitle = creditChild.value;
                                    }
                                    else {
                                        possibleTitle = creditChild.value;
                                    }
                                }
                            }
                        }
                        if (!(this.musicSheet.Composer !== undefined && this.musicSheet.Lyricist !== undefined)) {
                            switch (creditJustify) {
                                case "right":
                                    this.musicSheet.Composer = new Label_1.Label(this.trimString(creditChild.value));
                                    break;
                                case "left":
                                    this.musicSheet.Lyricist = new Label_1.Label(this.trimString(creditChild.value));
                                    break;
                                default:
                                    break;
                            }
                        }
                    }
                }
            }
        }
        if (this.musicSheet.Title === undefined && finalTitle) {
            this.musicSheet.Title = new Label_1.Label(this.trimString(finalTitle));
        }
        if (this.musicSheet.Subtitle === undefined && finalSubtitle) {
            this.musicSheet.Subtitle = new Label_1.Label(this.trimString(finalSubtitle));
        }
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.computeSystemYCoordinates = function (root) {
        if (root.element("defaults") === undefined) {
            return 0;
        }
        var paperHeight = 0;
        var topSystemDistance = 0;
        var defi = root.element("defaults").element("page-layout").element("page-height").value;
        paperHeight = parseFloat(defi);
        var found = false;
        var parts = root.elements("part");
        for (var idx = 0, len = parts.length; idx < len; ++idx) {
            var measures = parts[idx].elements("measure");
            for (var idx2 = 0, len2 = measures.length; idx2 < len2; ++idx2) {
                var measure = measures[idx2];
                if (measure.element("print") !== undefined) {
                    var systemLayouts = measure.element("print").elements("system-layout");
                    for (var idx3 = 0, len3 = systemLayouts.length; idx3 < len3; ++idx3) {
                        var syslab = systemLayouts[idx3];
                        if (syslab.element("top-system-distance") !== undefined) {
                            var topSystemDistanceString = syslab.element("top-system-distance").value;
                            topSystemDistance = parseFloat(topSystemDistanceString);
                            found = true;
                            break;
                        }
                    }
                    break;
                }
            }
            if (found) {
                break;
            }
        }
        if (root.element("defaults").element("system-layout") !== undefined) {
            var syslay = root.element("defaults").element("system-layout");
            if (syslay.element("top-system-distance") !== undefined) {
                var topSystemDistanceString = root.element("defaults").element("system-layout").element("top-system-distance").value;
                topSystemDistance = parseFloat(topSystemDistanceString);
            }
        }
        if (topSystemDistance === 0) {
            return 0;
        }
        return paperHeight - topSystemDistance;
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.readTitle = function (root) {
        var titleNode = root.element("work");
        var titleNodeChild = undefined;
        if (titleNode !== undefined) {
            titleNodeChild = titleNode.element("work-title");
            if (titleNodeChild !== undefined && titleNodeChild.value) {
                this.musicSheet.Title = new Label_1.Label(this.trimString(titleNodeChild.value));
            }
        }
        var movementNode = root.element("movement-title");
        var finalSubTitle = "";
        if (movementNode !== undefined) {
            if (this.musicSheet.Title === undefined) {
                this.musicSheet.Title = new Label_1.Label(this.trimString(movementNode.value));
            }
            else {
                finalSubTitle = this.trimString(movementNode.value);
            }
        }
        if (titleNode !== undefined) {
            var subtitleNodeChild = titleNode.element("work-number");
            if (subtitleNodeChild !== undefined) {
                var workNumber = subtitleNodeChild.value;
                if (workNumber) {
                    if (finalSubTitle) {
                        finalSubTitle = workNumber;
                    }
                    else {
                        finalSubTitle = finalSubTitle + ", " + workNumber;
                    }
                }
            }
        }
        if (finalSubTitle) {
            this.musicSheet.Subtitle = new Label_1.Label(finalSubTitle);
        }
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.createInstrumentGroups = function (entryList) {
        var instrumentId = 0;
        var instrumentDict = {};
        var currentGroup;
        try {
            var entryArray = entryList;
            for (var idx = 0, len = entryArray.length; idx < len; ++idx) {
                var node = entryArray[idx];
                if (node.name === "score-part") {
                    var instrIdString = node.attribute("id").value;
                    var instrument = new Instrument_1.Instrument(instrumentId, instrIdString, this.musicSheet, currentGroup);
                    instrumentId++;
                    var partElements = node.elements();
                    for (var idx2 = 0, len2 = partElements.length; idx2 < len2; ++idx2) {
                        var partElement = partElements[idx2];
                        try {
                            if (partElement.name === "part-name") {
                                instrument.Name = partElement.value;
                            }
                            else if (partElement.name === "score-instrument") {
                                var subInstrument = new SubInstrument_1.SubInstrument(instrument);
                                subInstrument.idString = partElement.firstAttribute.value;
                                instrument.SubInstruments.push(subInstrument);
                                var subElement = partElement.element("instrument-name");
                                if (subElement !== undefined) {
                                    subInstrument.name = subElement.value;
                                    subInstrument.setMidiInstrument(subElement.value);
                                }
                            }
                            else if (partElement.name === "midi-instrument") {
                                var subInstrument = instrument.getSubInstrument(partElement.firstAttribute.value);
                                for (var idx3 = 0, len3 = instrument.SubInstruments.length; idx3 < len3; ++idx3) {
                                    var subInstr = instrument.SubInstruments[idx3];
                                    if (subInstr.idString === partElement.value) {
                                        subInstrument = subInstr;
                                        break;
                                    }
                                }
                                var instrumentElements = partElement.elements();
                                for (var idx3 = 0, len3 = instrumentElements.length; idx3 < len3; ++idx3) {
                                    var instrumentElement = instrumentElements[idx3];
                                    try {
                                        if (instrumentElement.name === "midi-channel") {
                                            if (parseInt(instrumentElement.value, 10) === 10) {
                                                instrument.MidiInstrumentId = ClefInstruction_1.MidiInstrument.Percussion;
                                            }
                                        }
                                        else if (instrumentElement.name === "midi-program") {
                                            if (instrument.SubInstruments.length > 0 && instrument.MidiInstrumentId !== ClefInstruction_1.MidiInstrument.Percussion) {
                                                subInstrument.midiInstrumentID = Math.max(0, parseInt(instrumentElement.value, 10) - 1);
                                            }
                                        }
                                        else if (instrumentElement.name === "midi-unpitched") {
                                            subInstrument.fixedKey = Math.max(0, parseInt(instrumentElement.value, 10));
                                        }
                                        else if (instrumentElement.name === "volume") {
                                            try {
                                                var result = parseFloat(instrumentElement.value);
                                                subInstrument.volume = result / 127.0;
                                            }
                                            catch (ex) {
                                                logging_1.Logging.debug("ExpressionReader.readExpressionParameters", "read volume", ex);
                                            }
                                        }
                                        else if (instrumentElement.name === "pan") {
                                            try {
                                                var result = parseFloat(instrumentElement.value);
                                                subInstrument.pan = result / 64.0;
                                            }
                                            catch (ex) {
                                                logging_1.Logging.debug("ExpressionReader.readExpressionParameters", "read pan", ex);
                                            }
                                        }
                                    }
                                    catch (ex) {
                                        logging_1.Logging.log("MusicSheetReader.createInstrumentGroups midi settings: ", ex);
                                    }
                                }
                            }
                        }
                        catch (ex) {
                            logging_1.Logging.log("MusicSheetReader.createInstrumentGroups: ", ex);
                        }
                    }
                    if (instrument.SubInstruments.length === 0) {
                        var subInstrument = new SubInstrument_1.SubInstrument(instrument);
                        instrument.SubInstruments.push(subInstrument);
                    }
                    instrumentDict[instrIdString] = instrument;
                    if (currentGroup !== undefined) {
                        currentGroup.InstrumentalGroups.push(instrument);
                        this.musicSheet.Instruments.push(instrument);
                    }
                    else {
                        this.musicSheet.InstrumentalGroups.push(instrument);
                        this.musicSheet.Instruments.push(instrument);
                    }
                }
                else {
                    if ((node.name === "part-group") && (node.attribute("type").value === "start")) {
                        var iG = new InstrumentalGroup_1.InstrumentalGroup("group", this.musicSheet, currentGroup);
                        if (currentGroup !== undefined) {
                            currentGroup.InstrumentalGroups.push(iG);
                        }
                        else {
                            this.musicSheet.InstrumentalGroups.push(iG);
                        }
                        currentGroup = iG;
                    }
                    else {
                        if ((node.name === "part-group") && (node.attribute("type").value === "stop")) {
                            if (currentGroup !== undefined) {
                                if (currentGroup.InstrumentalGroups.length === 1) {
                                    var instr = currentGroup.InstrumentalGroups[0];
                                    if (currentGroup.Parent !== undefined) {
                                        currentGroup.Parent.InstrumentalGroups.push(instr);
                                        this._removeFromArray(currentGroup.Parent.InstrumentalGroups, currentGroup);
                                    }
                                    else {
                                        this.musicSheet.InstrumentalGroups.push(instr);
                                        this._removeFromArray(this.musicSheet.InstrumentalGroups, currentGroup);
                                    }
                                }
                                currentGroup = currentGroup.Parent;
                            }
                        }
                    }
                }
            }
        }
        catch (e) {
            var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/InstrumentError", "Error while reading Instruments");
            throw new Exceptions_1.MusicSheetReadingException(errorMsg, e);
        }
        for (var idx = 0, len = this.musicSheet.Instruments.length; idx < len; ++idx) {
            var instrument = this.musicSheet.Instruments[idx];
            if (!instrument.Name) {
                instrument.Name = "Instr. " + instrument.IdString;
            }
        }
        return instrumentDict;
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.getCompleteNumberOfStavesFromXml = function (partInst) {
        var num = 0;
        for (var _i = 0, partInst_2 = partInst; _i < partInst_2.length; _i++) {
            var partNode = partInst_2[_i];
            var xmlMeasureList = partNode.elements("measure");
            if (xmlMeasureList.length > 0) {
                var xmlMeasure = xmlMeasureList[0];
                if (xmlMeasure !== undefined) {
                    var stavesNode = xmlMeasure.element("attributes");
                    if (stavesNode !== undefined) {
                        stavesNode = stavesNode.element("staves");
                    }
                    if (stavesNode === undefined) {
                        num++;
                    }
                    else {
                        num += parseInt(stavesNode.value, 10);
                    }
                }
            }
        }
        if (isNaN(num) || num <= 0) {
            var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/StaffError", "Invalid number of staves.");
            throw new Exceptions_1.MusicSheetReadingException(errorMsg);
        }
        return num;
    };
    MusicSheetReader /*implements IMusicSheetReader*/.prototype.getInstrumentNumberOfStavesFromXml = function (partNode) {
        var num = 0;
        var xmlMeasure = partNode.element("measure");
        if (xmlMeasure !== undefined) {
            var attributes = xmlMeasure.element("attributes");
            var staves = undefined;
            if (attributes !== undefined) {
                staves = attributes.element("staves");
            }
            if (attributes === undefined || staves === undefined) {
                num = 1;
            }
            else {
                num = parseInt(staves.value, 10);
            }
        }
        if (isNaN(num) || num <= 0) {
            var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/StaffError", "Invalid number of Staves.");
            throw new Exceptions_1.MusicSheetReadingException(errorMsg);
        }
        return num;
    };
    return MusicSheetReader /*implements IMusicSheetReader*/;
}());
exports.MusicSheetReader /*implements IMusicSheetReader*/ = MusicSheetReader /*implements IMusicSheetReader*/;
