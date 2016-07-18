"use strict";
var VoiceGenerator_1 = require("./VoiceGenerator");
var SourceStaffEntry_1 = require("../VoiceData/SourceStaffEntry");
var ClefInstruction_1 = require("../VoiceData/Instructions/ClefInstruction");
var KeyInstruction_1 = require("../VoiceData/Instructions/KeyInstruction");
var RhythmInstruction_1 = require("../VoiceData/Instructions/RhythmInstruction");
var fraction_1 = require("../../Common/DataObjects/fraction");
var ITextTranslation_1 = require("../Interfaces/ITextTranslation");
var Exceptions_1 = require("../Exceptions");
var ClefInstruction_2 = require("../VoiceData/Instructions/ClefInstruction");
var RhythmInstruction_2 = require("../VoiceData/Instructions/RhythmInstruction");
var KeyInstruction_2 = require("../VoiceData/Instructions/KeyInstruction");
var Logging_1 = require("../../Common/Logging");
var ClefInstruction_3 = require("../VoiceData/Instructions/ClefInstruction");
var InstrumentReader = (function () {
    function InstrumentReader(repetitionInstructionReader, xmlMeasureList, instrument) {
        this.voiceGeneratorsDict = {};
        this.staffMainVoiceGeneratorDict = {};
        this.divisions = 0;
        this.currentXmlMeasureIndex = 0;
        this.activeKeyHasBeenInitialized = false;
        this.abstractInstructions = [];
        // (*) this.repetitionInstructionReader = repetitionInstructionReader;
        this.xmlMeasureList = xmlMeasureList;
        this.musicSheet = instrument.GetMusicSheet;
        this.instrument = instrument;
        this.activeClefs = new Array(instrument.Staves.length);
        this.activeClefsHaveBeenInitialized = new Array(instrument.Staves.length);
        for (var i = 0; i < instrument.Staves.length; i++) {
            this.activeClefsHaveBeenInitialized[i] = false;
        }
        // FIXME createExpressionGenerators(instrument.Staves.length);
        // (*) this.slurReader = MusicSymbolModuleFactory.createSlurReader(this.musicSheet);
    }
    Object.defineProperty(InstrumentReader.prototype, "ActiveKey", {
        get: function () {
            return this.activeKey;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstrumentReader.prototype, "MaxTieNoteFraction", {
        get: function () {
            return this.maxTieNoteFraction;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(InstrumentReader.prototype, "ActiveRhythm", {
        get: function () {
            return this.activeRhythm;
        },
        set: function (value) {
            this.activeRhythm = value;
        },
        enumerable: true,
        configurable: true
    });
    InstrumentReader.prototype.readNextXmlMeasure = function (currentMeasure, measureStartAbsoluteTimestamp, guitarPro) {
        if (this.currentXmlMeasureIndex >= this.xmlMeasureList.length) {
            return false;
        }
        this.currentMeasure = currentMeasure;
        this.inSourceMeasureInstrumentIndex = this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.instrument);
        // (*) if (this.repetitionInstructionReader !== undefined) {
        //  this.repetitionInstructionReader.prepareReadingMeasure(currentMeasure, this.currentXmlMeasureIndex);
        //}
        var currentFraction = new fraction_1.Fraction(0, 1);
        var previousFraction = new fraction_1.Fraction(0, 1);
        var divisionsException = false;
        this.maxTieNoteFraction = new fraction_1.Fraction(0, 1);
        var lastNoteWasGrace = false;
        try {
            var xmlMeasureListArr = this.xmlMeasureList[this.currentXmlMeasureIndex].elements();
            for (var _i = 0, xmlMeasureListArr_1 = xmlMeasureListArr; _i < xmlMeasureListArr_1.length; _i++) {
                var xmlNode = xmlMeasureListArr_1[_i];
                if (xmlNode.name === "note") {
                    if (xmlNode.hasAttributes && xmlNode.attribute("print-object") && xmlNode.attribute("print-spacing")) {
                        continue;
                    }
                    var noteStaff = 1;
                    if (this.instrument.Staves.length > 1) {
                        if (xmlNode.element("staff") !== undefined) {
                            noteStaff = parseInt(xmlNode.element("staff").value, 10);
                            if (isNaN(noteStaff)) {
                                Logging_1.Logging.debug("InstrumentReader.readNextXmlMeasure.get staff number");
                                noteStaff = 1;
                            }
                        }
                    }
                    this.currentStaff = this.instrument.Staves[noteStaff - 1];
                    var isChord = xmlNode.element("chord") !== undefined;
                    if (xmlNode.element("voice") !== undefined) {
                        var noteVoice = parseInt(xmlNode.element("voice").value, 10);
                        this.currentVoiceGenerator = this.getOrCreateVoiceGenerator(noteVoice, noteStaff - 1);
                    }
                    else {
                        if (!isChord || this.currentVoiceGenerator === undefined) {
                            this.currentVoiceGenerator = this.getOrCreateVoiceGenerator(1, noteStaff - 1);
                        }
                    }
                    var noteDivisions = 0;
                    var noteDuration = new fraction_1.Fraction(0, 1);
                    var isTuplet = false;
                    if (xmlNode.element("duration") !== undefined) {
                        noteDivisions = parseInt(xmlNode.element("duration").value, 10);
                        if (!isNaN(noteDivisions)) {
                            noteDuration = new fraction_1.Fraction(noteDivisions, 4 * this.divisions);
                            if (noteDivisions === 0) {
                                noteDuration = this.getNoteDurationFromTypeNode(xmlNode);
                            }
                            if (xmlNode.element("time-modification") !== undefined) {
                                noteDuration = this.getNoteDurationForTuplet(xmlNode);
                                isTuplet = true;
                            }
                        }
                        else {
                            var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError", "Invalid Note Duration.");
                            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                            Logging_1.Logging.debug("InstrumentReader.readNextXmlMeasure", errorMsg);
                            continue;
                        }
                    }
                    var restNote = xmlNode.element("rest") !== undefined;
                    //Logging.log("New note found!", noteDivisions, noteDuration.toString(), restNote);
                    var isGraceNote = xmlNode.element("grace") !== undefined || noteDivisions === 0 || isChord && lastNoteWasGrace;
                    var musicTimestamp = currentFraction.clone();
                    if (isChord) {
                        musicTimestamp = previousFraction.clone();
                    }
                    this.currentStaffEntry = this.currentMeasure.findOrCreateStaffEntry(musicTimestamp, this.inSourceMeasureInstrumentIndex + noteStaff - 1, this.currentStaff).staffEntry;
                    //Logging.log("currentStaffEntry", this.currentStaffEntry, this.currentMeasure.VerticalSourceStaffEntryContainers.length);
                    if (!this.currentVoiceGenerator.hasVoiceEntry() || (!isChord && !isGraceNote && !lastNoteWasGrace) || (!lastNoteWasGrace && isGraceNote)) {
                        this.currentVoiceGenerator.createVoiceEntry(musicTimestamp, this.currentStaffEntry, !restNote);
                    }
                    if (!isGraceNote && !isChord) {
                        previousFraction = currentFraction.clone();
                        currentFraction.Add(noteDuration);
                    }
                    if (isChord &&
                        this.currentStaffEntry !== undefined &&
                        this.currentStaffEntry.ParentStaff !== this.currentStaff) {
                        this.currentStaffEntry = this.currentVoiceGenerator.checkForStaffEntryLink(this.inSourceMeasureInstrumentIndex + noteStaff - 1, this.currentStaff, this.currentStaffEntry, this.currentMeasure);
                    }
                    var beginOfMeasure = (this.currentStaffEntry !== undefined &&
                        this.currentStaffEntry.Timestamp !== undefined &&
                        this.currentStaffEntry.Timestamp.Equals(new fraction_1.Fraction(0, 1)) && !this.currentStaffEntry.hasNotes());
                    this.saveAbstractInstructionList(this.instrument.Staves.length, beginOfMeasure);
                    if (this.openChordSymbolContainer !== undefined) {
                        this.currentStaffEntry.ChordContainer = this.openChordSymbolContainer;
                        this.openChordSymbolContainer = undefined;
                    }
                    if (this.activeRhythm !== undefined) {
                    }
                    if (isTuplet) {
                        this.currentVoiceGenerator.read(xmlNode, noteDuration.Numerator, noteDuration.Denominator, restNote, isGraceNote, this.currentStaffEntry, this.currentMeasure, measureStartAbsoluteTimestamp, this.maxTieNoteFraction, isChord, guitarPro);
                    }
                    else {
                        this.currentVoiceGenerator.read(xmlNode, noteDivisions, 4 * this.divisions, restNote, isGraceNote, this.currentStaffEntry, this.currentMeasure, measureStartAbsoluteTimestamp, this.maxTieNoteFraction, isChord, guitarPro);
                    }
                    var notationsNode = xmlNode.element("notations");
                    if (notationsNode !== undefined && notationsNode.element("dynamics") !== undefined) {
                    }
                    lastNoteWasGrace = isGraceNote;
                }
                else if (xmlNode.name === "attributes") {
                    var divisionsNode = xmlNode.element("divisions");
                    if (divisionsNode !== undefined) {
                        this.divisions = parseInt(divisionsNode.value, 10);
                        if (isNaN(this.divisions)) {
                            var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/DivisionError", "Invalid divisions value at Instrument: ");
                            Logging_1.Logging.debug("InstrumentReader.readNextXmlMeasure", errorMsg);
                            this.divisions = this.readDivisionsFromNotes();
                            if (this.divisions > 0) {
                                this.musicSheet.SheetErrors.push(errorMsg + this.instrument.Name);
                            }
                            else {
                                divisionsException = true;
                                throw new Exceptions_1.MusicSheetReadingException(errorMsg + this.instrument.Name);
                            }
                        }
                    }
                    if (xmlNode.element("divisions") === undefined &&
                        this.divisions === 0 &&
                        this.currentXmlMeasureIndex === 0) {
                        var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/DivisionError", "Invalid divisions value at Instrument: ");
                        this.divisions = this.readDivisionsFromNotes();
                        if (this.divisions > 0) {
                            this.musicSheet.SheetErrors.push(errorMsg + this.instrument.Name);
                        }
                        else {
                            divisionsException = true;
                            throw new Exceptions_1.MusicSheetReadingException(errorMsg + this.instrument.Name);
                        }
                    }
                    this.addAbstractInstruction(xmlNode, guitarPro);
                    if (currentFraction.Equals(new fraction_1.Fraction(0, 1)) &&
                        this.isAttributesNodeAtBeginOfMeasure(this.xmlMeasureList[this.currentXmlMeasureIndex], xmlNode)) {
                        this.saveAbstractInstructionList(this.instrument.Staves.length, true);
                    }
                    if (this.isAttributesNodeAtEndOfMeasure(this.xmlMeasureList[this.currentXmlMeasureIndex], xmlNode)) {
                        this.saveClefInstructionAtEndOfMeasure();
                    }
                }
                else if (xmlNode.name === "forward") {
                    var forFraction = parseInt(xmlNode.element("duration").value, 10);
                    currentFraction.Add(new fraction_1.Fraction(forFraction, 4 * this.divisions));
                }
                else if (xmlNode.name === "backup") {
                    var backFraction = parseInt(xmlNode.element("duration").value, 10);
                    currentFraction.Sub(new fraction_1.Fraction(backFraction, 4 * this.divisions));
                    if (currentFraction.Numerator < 0) {
                        currentFraction = new fraction_1.Fraction(0, 1);
                    }
                    previousFraction.Sub(new fraction_1.Fraction(backFraction, 4 * this.divisions));
                    if (previousFraction.Numerator < 0) {
                        previousFraction = new fraction_1.Fraction(0, 1);
                    }
                }
                else if (xmlNode.name === "direction") {
                    // unused let directionTypeNode: IXmlElement = xmlNode.element("direction-type");
                    // (*) MetronomeReader.readMetronomeInstructions(xmlNode, this.musicSheet, this.currentXmlMeasureIndex);
                    var relativePositionInMeasure = Math.min(1, currentFraction.RealValue);
                    if (this.activeRhythm !== undefined && this.activeRhythm.Rhythm !== undefined) {
                        relativePositionInMeasure /= this.activeRhythm.Rhythm.RealValue;
                    }
                }
                else if (xmlNode.name === "barline") {
                }
                else if (xmlNode.name === "sound") {
                }
                else if (xmlNode.name === "harmony") {
                }
            }
            for (var j in this.voiceGeneratorsDict) {
                if (this.voiceGeneratorsDict.hasOwnProperty(j)) {
                    var voiceGenerator = this.voiceGeneratorsDict[j];
                    voiceGenerator.checkForOpenBeam();
                    voiceGenerator.checkForOpenGraceNotes();
                }
            }
            if (this.currentXmlMeasureIndex === this.xmlMeasureList.length - 1) {
                for (var i = 0; i < this.instrument.Staves.length; i++) {
                    if (!this.activeClefsHaveBeenInitialized[i]) {
                        this.createDefaultClefInstruction(this.musicSheet.getGlobalStaffIndexOfFirstStaff(this.instrument) + i);
                    }
                }
                if (!this.activeKeyHasBeenInitialized) {
                    this.createDefaultKeyInstruction();
                }
            }
        }
        catch (e) {
            if (divisionsException) {
                throw new Exceptions_1.MusicSheetReadingException(e.Message);
            }
            var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/MeasureError", "Error while reading Measure.");
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
            Logging_1.Logging.debug("InstrumentReader.readNextXmlMeasure", errorMsg, e);
        }
        this.previousMeasure = this.currentMeasure;
        this.currentXmlMeasureIndex += 1;
        return true;
    };
    InstrumentReader.prototype.doCalculationsAfterDurationHasBeenSet = function () {
        for (var j in this.voiceGeneratorsDict) {
            if (this.voiceGeneratorsDict.hasOwnProperty(j)) {
                this.voiceGeneratorsDict[j].checkOpenTies();
            }
        }
    };
    InstrumentReader.prototype.getOrCreateVoiceGenerator = function (voiceId, staffId) {
        var staff = this.instrument.Staves[staffId];
        var voiceGenerator = this.voiceGeneratorsDict[voiceId];
        if (voiceGenerator !== undefined) {
            if (staff.Voices.indexOf(voiceGenerator.GetVoice) === -1) {
                staff.Voices.push(voiceGenerator.GetVoice);
            }
        }
        else {
            var mainVoiceGenerator = this.staffMainVoiceGeneratorDict[staffId];
            if (mainVoiceGenerator !== undefined) {
                voiceGenerator = new VoiceGenerator_1.VoiceGenerator(this.instrument, voiceId, this.slurReader, mainVoiceGenerator.GetVoice);
                staff.Voices.push(voiceGenerator.GetVoice);
                this.voiceGeneratorsDict[voiceId] = voiceGenerator;
            }
            else {
                voiceGenerator = new VoiceGenerator_1.VoiceGenerator(this.instrument, voiceId, this.slurReader);
                staff.Voices.push(voiceGenerator.GetVoice);
                this.voiceGeneratorsDict[voiceId] = voiceGenerator;
                this.staffMainVoiceGeneratorDict[staffId] = voiceGenerator;
            }
        }
        return voiceGenerator;
    };
    //private createExpressionGenerators(numberOfStaves: number): void {
    //  // (*)
    //  //this.expressionReaders = new Array(numberOfStaves);
    //  //for (let i: number = 0; i < numberOfStaves; i++) {
    //  //  this.expressionReaders[i] = MusicSymbolModuleFactory.createExpressionGenerator(this.musicSheet, this.instrument, i + 1);
    //  //}
    //}
    InstrumentReader.prototype.createDefaultClefInstruction = function (staffIndex) {
        var first;
        if (this.musicSheet.SourceMeasures.length > 0) {
            first = this.musicSheet.SourceMeasures[0];
        }
        else {
            first = this.currentMeasure;
        }
        var clefInstruction = new ClefInstruction_1.ClefInstruction(ClefInstruction_2.ClefEnum.G, 0, 2);
        var firstStaffEntry;
        if (first.FirstInstructionsStaffEntries[staffIndex] === undefined) {
            firstStaffEntry = new SourceStaffEntry_1.SourceStaffEntry(undefined, undefined);
            first.FirstInstructionsStaffEntries[staffIndex] = firstStaffEntry;
        }
        else {
            firstStaffEntry = first.FirstInstructionsStaffEntries[staffIndex];
            firstStaffEntry.removeFirstInstructionOfTypeClefInstruction();
        }
        clefInstruction.Parent = firstStaffEntry;
        firstStaffEntry.Instructions.splice(0, 0, clefInstruction);
    };
    InstrumentReader.prototype.createDefaultKeyInstruction = function () {
        var first;
        if (this.musicSheet.SourceMeasures.length > 0) {
            first = this.musicSheet.SourceMeasures[0];
        }
        else {
            first = this.currentMeasure;
        }
        var keyInstruction = new KeyInstruction_1.KeyInstruction(undefined, 0, KeyInstruction_2.KeyEnum.major);
        for (var j = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + this.instrument.Staves.length; j++) {
            if (first.FirstInstructionsStaffEntries[j] === undefined) {
                var firstStaffEntry = new SourceStaffEntry_1.SourceStaffEntry(undefined, undefined);
                first.FirstInstructionsStaffEntries[j] = firstStaffEntry;
                keyInstruction.Parent = firstStaffEntry;
                firstStaffEntry.Instructions.push(keyInstruction);
            }
            else {
                var firstStaffEntry = first.FirstInstructionsStaffEntries[j];
                keyInstruction.Parent = firstStaffEntry;
                firstStaffEntry.removeFirstInstructionOfTypeKeyInstruction();
                if (firstStaffEntry.Instructions[0] instanceof ClefInstruction_1.ClefInstruction) {
                    firstStaffEntry.Instructions.splice(1, 0, keyInstruction);
                }
                else {
                    firstStaffEntry.Instructions.splice(0, 0, keyInstruction);
                }
            }
        }
    };
    InstrumentReader.prototype.isAttributesNodeAtBeginOfMeasure = function (parentNode, attributesNode) {
        var children = parentNode.elements();
        var attributesNodeIndex = children.indexOf(attributesNode); // FIXME | 0
        if (attributesNodeIndex > 0 && children[attributesNodeIndex - 1].name === "backup") {
            return true;
        }
        var firstNoteNodeIndex = -1;
        for (var i = 0; i < children.length; i++) {
            if (children[i].name === "note") {
                firstNoteNodeIndex = i;
                break;
            }
        }
        return (attributesNodeIndex < firstNoteNodeIndex && firstNoteNodeIndex > 0) || (firstNoteNodeIndex < 0);
    };
    InstrumentReader.prototype.isAttributesNodeAtEndOfMeasure = function (parentNode, attributesNode) {
        var childs = parentNode.elements().slice();
        var attributesNodeIndex = 0;
        for (var i = 0; i < childs.length; i++) {
            if (childs[i] === attributesNode) {
                attributesNodeIndex = i;
                break;
            }
        }
        var nextNoteNodeIndex = 0;
        for (var i = attributesNodeIndex; i < childs.length; i++) {
            if (childs[i].name === "note") {
                nextNoteNodeIndex = i;
                break;
            }
        }
        return attributesNodeIndex > nextNoteNodeIndex;
    };
    InstrumentReader.prototype.getNoteDurationFromTypeNode = function (xmlNode) {
        if (xmlNode.element("type") !== undefined) {
            var typeNode = xmlNode.element("type");
            if (typeNode !== undefined) {
                var type = typeNode.value;
                return this.currentVoiceGenerator.getNoteDurationFromType(type);
            }
        }
        return new fraction_1.Fraction(0, 4 * this.divisions);
    };
    InstrumentReader.prototype.addAbstractInstruction = function (node, guitarPro) {
        if (node.element("divisions") !== undefined) {
            if (node.elements().length === 1) {
                return;
            }
        }
        var transposeNode = node.element("transpose");
        if (transposeNode !== undefined) {
            var chromaticNode = transposeNode.element("chromatic");
            if (chromaticNode !== undefined) {
                this.instrument.PlaybackTranspose = parseInt(chromaticNode.value, 10);
            }
        }
        var clefList = node.elements("clef");
        var errorMsg;
        if (clefList.length > 0) {
            for (var idx = 0, len = clefList.length; idx < len; ++idx) {
                var nodeList = clefList[idx];
                var clefEnum = ClefInstruction_2.ClefEnum.G;
                var line = 2;
                var staffNumber = 1;
                var clefOctaveOffset = 0;
                var lineNode = nodeList.element("line");
                if (lineNode !== undefined) {
                    try {
                        line = parseInt(lineNode.value, 10);
                    }
                    catch (ex) {
                        errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/ClefLineError", "Invalid clef line given -> using default clef line.");
                        this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                        line = 2;
                        Logging_1.Logging.debug("InstrumentReader.addAbstractInstruction", errorMsg, ex);
                    }
                }
                var signNode = nodeList.element("sign");
                if (signNode !== undefined) {
                    try {
                        clefEnum = ClefInstruction_2.ClefEnum[signNode.value];
                        if (!ClefInstruction_1.ClefInstruction.isSupportedClef(clefEnum)) {
                            if (clefEnum === ClefInstruction_2.ClefEnum.TAB && guitarPro) {
                                clefOctaveOffset = -1;
                            }
                            errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/ClefError", "Unsupported clef found -> using default clef.");
                            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                            clefEnum = ClefInstruction_2.ClefEnum.G;
                            line = 2;
                        }
                    }
                    catch (e) {
                        errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/ClefError", "Invalid clef found -> using default clef.");
                        this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                        clefEnum = ClefInstruction_2.ClefEnum.G;
                        line = 2;
                        Logging_1.Logging.debug("InstrumentReader.addAbstractInstruction", errorMsg, e);
                    }
                }
                var clefOctaveNode = nodeList.element("clef-octave-change");
                if (clefOctaveNode !== undefined) {
                    try {
                        clefOctaveOffset = parseInt(clefOctaveNode.value, 10);
                    }
                    catch (e) {
                        errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/ClefOctaveError", "Invalid clef octave found -> using default clef octave.");
                        this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                        clefOctaveOffset = 0;
                    }
                }
                if (nodeList.hasAttributes && nodeList.attributes()[0].name === "number") {
                    try {
                        staffNumber = parseInt(nodeList.attributes()[0].value, 10);
                    }
                    catch (err) {
                        errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/ClefError", "Invalid clef found -> using default clef.");
                        this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                        staffNumber = 1;
                    }
                }
                var clefInstruction = new ClefInstruction_1.ClefInstruction(clefEnum, clefOctaveOffset, line);
                this.abstractInstructions.push([staffNumber, clefInstruction]);
            }
        }
        if (node.element("key") !== undefined && this.instrument.MidiInstrumentId !== ClefInstruction_3.MidiInstrument.Percussion) {
            var key = 0;
            var keyNode = node.element("key").element("fifths");
            if (keyNode !== undefined) {
                try {
                    key = parseInt(keyNode.value, 10);
                }
                catch (ex) {
                    errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/KeyError", "Invalid key found -> set to default.");
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    key = 0;
                    Logging_1.Logging.debug("InstrumentReader.addAbstractInstruction", errorMsg, ex);
                }
            }
            var keyEnum = KeyInstruction_2.KeyEnum.none;
            var modeNode = node.element("key");
            if (modeNode !== undefined) {
                modeNode = modeNode.element("mode");
            }
            if (modeNode !== undefined) {
                try {
                    keyEnum = KeyInstruction_2.KeyEnum[modeNode.value];
                }
                catch (ex) {
                    errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/KeyError", "Invalid key found -> set to default.");
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    keyEnum = KeyInstruction_2.KeyEnum.major;
                    Logging_1.Logging.debug("InstrumentReader.addAbstractInstruction", errorMsg, ex);
                }
            }
            var keyInstruction = new KeyInstruction_1.KeyInstruction(undefined, key, keyEnum);
            this.abstractInstructions.push([1, keyInstruction]);
        }
        if (node.element("time") !== undefined) {
            var symbolEnum = RhythmInstruction_2.RhythmSymbolEnum.NONE;
            var timeNode = node.element("time");
            if (timeNode !== undefined && timeNode.hasAttributes) {
                var firstAttr = timeNode.firstAttribute;
                if (firstAttr.name === "symbol") {
                    if (firstAttr.value === "common") {
                        symbolEnum = RhythmInstruction_2.RhythmSymbolEnum.COMMON;
                    }
                    else if (firstAttr.value === "cut") {
                        symbolEnum = RhythmInstruction_2.RhythmSymbolEnum.CUT;
                    }
                }
            }
            var num = 0;
            var denom = 0;
            var senzaMisura = (timeNode !== undefined && timeNode.element("senza-misura") !== undefined);
            var timeList = node.elements("time");
            var beatsList = [];
            var typeList = [];
            for (var idx = 0, len = timeList.length; idx < len; ++idx) {
                var xmlNode = timeList[idx];
                beatsList.push.apply(beatsList, xmlNode.elements("beats"));
                typeList.push.apply(typeList, xmlNode.elements("beat-type"));
            }
            if (!senzaMisura) {
                try {
                    if (beatsList !== undefined && beatsList.length > 0 && typeList !== undefined && beatsList.length === typeList.length) {
                        var length_1 = beatsList.length;
                        var fractions = new Array(length_1);
                        var maxDenom = 0;
                        for (var i = 0; i < length_1; i++) {
                            var s = beatsList[i].value;
                            var n = 0;
                            var d = 0;
                            if (s.indexOf("+") !== -1) {
                                var numbers = s.split("+");
                                for (var idx = 0, len = numbers.length; idx < len; ++idx) {
                                    n += parseInt(numbers[idx], 10);
                                }
                            }
                            else {
                                n = parseInt(s, 10);
                            }
                            d = parseInt(typeList[i].value, 10);
                            maxDenom = Math.max(maxDenom, d);
                            fractions[i] = new fraction_1.Fraction(n, d, false);
                        }
                        for (var i = 0; i < length_1; i++) {
                            if (fractions[i].Denominator === maxDenom) {
                                num += fractions[i].Numerator;
                            }
                            else {
                                num += (maxDenom / fractions[i].Denominator) * fractions[i].Numerator;
                            }
                        }
                        denom = maxDenom;
                    }
                    else {
                        num = parseInt(node.element("time").element("beats").value, 10);
                        denom = parseInt(node.element("time").element("beat-type").value, 10);
                    }
                }
                catch (ex) {
                    errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/RhythmError", "Invalid rhythm found -> set to default.");
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    num = 4;
                    denom = 4;
                    Logging_1.Logging.debug("InstrumentReader.addAbstractInstruction", errorMsg, ex);
                }
                if ((num === 4 && denom === 4) || (num === 2 && denom === 2)) {
                    symbolEnum = RhythmInstruction_2.RhythmSymbolEnum.NONE;
                }
                this.abstractInstructions.push([1, new RhythmInstruction_1.RhythmInstruction(new fraction_1.Fraction(num, denom, false), num, denom, symbolEnum)]);
            }
            else {
                this.abstractInstructions.push([1, new RhythmInstruction_1.RhythmInstruction(new fraction_1.Fraction(4, 4, false), 4, 4, RhythmInstruction_2.RhythmSymbolEnum.NONE)]);
            }
        }
    };
    InstrumentReader.prototype.saveAbstractInstructionList = function (numberOfStaves, beginOfMeasure) {
        for (var i = this.abstractInstructions.length - 1; i >= 0; i--) {
            var pair = this.abstractInstructions[i];
            var key = pair[0];
            var value = pair[1];
            if (value instanceof ClefInstruction_1.ClefInstruction) {
                var clefInstruction = value;
                if (this.currentXmlMeasureIndex === 0 || (key <= this.activeClefs.length && clefInstruction !== this.activeClefs[key - 1])) {
                    if (!beginOfMeasure && this.currentStaffEntry !== undefined && !this.currentStaffEntry.hasNotes() && key - 1
                        === this.instrument.Staves.indexOf(this.currentStaffEntry.ParentStaff)) {
                        var newClefInstruction = clefInstruction;
                        newClefInstruction.Parent = this.currentStaffEntry;
                        this.currentStaffEntry.removeFirstInstructionOfTypeClefInstruction();
                        this.currentStaffEntry.Instructions.push(newClefInstruction);
                        this.activeClefs[key - 1] = clefInstruction;
                        this.abstractInstructions.splice(i, 1);
                    }
                    else if (beginOfMeasure) {
                        var firstStaffEntry = void 0;
                        if (this.currentMeasure !== undefined) {
                            var newClefInstruction = clefInstruction;
                            var sseIndex = this.inSourceMeasureInstrumentIndex + key - 1;
                            var firstSse = this.currentMeasure.FirstInstructionsStaffEntries[sseIndex];
                            if (this.currentXmlMeasureIndex === 0) {
                                if (firstSse === undefined) {
                                    firstStaffEntry = new SourceStaffEntry_1.SourceStaffEntry(undefined, undefined);
                                    this.currentMeasure.FirstInstructionsStaffEntries[sseIndex] = firstStaffEntry;
                                    newClefInstruction.Parent = firstStaffEntry;
                                    firstStaffEntry.Instructions.push(newClefInstruction);
                                    this.activeClefsHaveBeenInitialized[key - 1] = true;
                                }
                                else if (this.currentMeasure.FirstInstructionsStaffEntries[sseIndex]
                                    !==
                                        undefined && !(firstSse.Instructions[0] instanceof ClefInstruction_1.ClefInstruction)) {
                                    firstStaffEntry = firstSse;
                                    newClefInstruction.Parent = firstStaffEntry;
                                    firstStaffEntry.removeFirstInstructionOfTypeClefInstruction();
                                    firstStaffEntry.Instructions.splice(0, 0, newClefInstruction);
                                    this.activeClefsHaveBeenInitialized[key - 1] = true;
                                }
                                else {
                                    var lastStaffEntry = new SourceStaffEntry_1.SourceStaffEntry(undefined, undefined);
                                    this.currentMeasure.LastInstructionsStaffEntries[sseIndex] = lastStaffEntry;
                                    newClefInstruction.Parent = lastStaffEntry;
                                    lastStaffEntry.Instructions.push(newClefInstruction);
                                }
                            }
                            else if (!this.activeClefsHaveBeenInitialized[key - 1]) {
                                var first = this.musicSheet.SourceMeasures[0];
                                if (first.FirstInstructionsStaffEntries[sseIndex] === undefined) {
                                    firstStaffEntry = new SourceStaffEntry_1.SourceStaffEntry(undefined, undefined);
                                }
                                else {
                                    firstStaffEntry = first.FirstInstructionsStaffEntries[sseIndex];
                                    firstStaffEntry.removeFirstInstructionOfTypeClefInstruction();
                                }
                                newClefInstruction.Parent = firstStaffEntry;
                                firstStaffEntry.Instructions.splice(0, 0, newClefInstruction);
                                this.activeClefsHaveBeenInitialized[key - 1] = true;
                            }
                            else {
                                var lastStaffEntry = new SourceStaffEntry_1.SourceStaffEntry(undefined, undefined);
                                this.previousMeasure.LastInstructionsStaffEntries[sseIndex] = lastStaffEntry;
                                newClefInstruction.Parent = lastStaffEntry;
                                lastStaffEntry.Instructions.push(newClefInstruction);
                            }
                            this.activeClefs[key - 1] = clefInstruction;
                            this.abstractInstructions.splice(i, 1);
                        }
                    }
                }
                else if (key <= this.activeClefs.length && clefInstruction === this.activeClefs[key - 1]) {
                    this.abstractInstructions.splice(i, 1);
                }
            }
            if (value instanceof KeyInstruction_1.KeyInstruction) {
                var keyInstruction = value;
                if (this.activeKey === undefined || this.activeKey.Key !== keyInstruction.Key) {
                    this.activeKey = keyInstruction;
                    this.abstractInstructions.splice(i, 1);
                    var sourceMeasure = void 0;
                    if (!this.activeKeyHasBeenInitialized) {
                        this.activeKeyHasBeenInitialized = true;
                        if (this.currentXmlMeasureIndex > 0) {
                            sourceMeasure = this.musicSheet.SourceMeasures[0];
                        }
                        else {
                            sourceMeasure = this.currentMeasure;
                        }
                    }
                    else {
                        sourceMeasure = this.currentMeasure;
                    }
                    if (sourceMeasure !== undefined) {
                        for (var j = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + numberOfStaves; j++) {
                            var newKeyInstruction = keyInstruction;
                            if (sourceMeasure.FirstInstructionsStaffEntries[j] === undefined) {
                                var firstStaffEntry = new SourceStaffEntry_1.SourceStaffEntry(undefined, undefined);
                                sourceMeasure.FirstInstructionsStaffEntries[j] = firstStaffEntry;
                                newKeyInstruction.Parent = firstStaffEntry;
                                firstStaffEntry.Instructions.push(newKeyInstruction);
                            }
                            else {
                                var firstStaffEntry = sourceMeasure.FirstInstructionsStaffEntries[j];
                                newKeyInstruction.Parent = firstStaffEntry;
                                firstStaffEntry.removeFirstInstructionOfTypeKeyInstruction();
                                if (firstStaffEntry.Instructions.length === 0) {
                                    firstStaffEntry.Instructions.push(newKeyInstruction);
                                }
                                else {
                                    if (firstStaffEntry.Instructions[0] instanceof ClefInstruction_1.ClefInstruction) {
                                        firstStaffEntry.Instructions.splice(1, 0, newKeyInstruction);
                                    }
                                    else {
                                        firstStaffEntry.Instructions.splice(0, 0, newKeyInstruction);
                                    }
                                }
                            }
                        }
                    }
                }
                else {
                    this.abstractInstructions.splice(i, 1);
                }
            }
            if (value instanceof RhythmInstruction_1.RhythmInstruction) {
                var rhythmInstruction = value;
                if (this.activeRhythm === undefined || this.activeRhythm !== rhythmInstruction) {
                    this.activeRhythm = rhythmInstruction;
                    this.abstractInstructions.splice(i, 1);
                    if (this.currentMeasure !== undefined) {
                        for (var j = this.inSourceMeasureInstrumentIndex; j < this.inSourceMeasureInstrumentIndex + numberOfStaves; j++) {
                            var newRhythmInstruction = rhythmInstruction;
                            var firstStaffEntry = void 0;
                            if (this.currentMeasure.FirstInstructionsStaffEntries[j] === undefined) {
                                firstStaffEntry = new SourceStaffEntry_1.SourceStaffEntry(undefined, undefined);
                                this.currentMeasure.FirstInstructionsStaffEntries[j] = firstStaffEntry;
                            }
                            else {
                                firstStaffEntry = this.currentMeasure.FirstInstructionsStaffEntries[j];
                                firstStaffEntry.removeFirstInstructionOfTypeRhythmInstruction();
                            }
                            newRhythmInstruction.Parent = firstStaffEntry;
                            firstStaffEntry.Instructions.push(newRhythmInstruction);
                        }
                    }
                }
                else {
                    this.abstractInstructions.splice(i, 1);
                }
            }
        }
    };
    InstrumentReader.prototype.saveClefInstructionAtEndOfMeasure = function () {
        for (var i = this.abstractInstructions.length - 1; i >= 0; i--) {
            var key = this.abstractInstructions[i][0];
            var value = this.abstractInstructions[i][1];
            if (value instanceof ClefInstruction_1.ClefInstruction) {
                var clefInstruction = value;
                if ((this.activeClefs[key - 1] === undefined) ||
                    (clefInstruction.ClefType !== this.activeClefs[key - 1].ClefType || (clefInstruction.ClefType === this.activeClefs[key - 1].ClefType &&
                        clefInstruction.Line !== this.activeClefs[key - 1].Line))) {
                    var lastStaffEntry = new SourceStaffEntry_1.SourceStaffEntry(undefined, undefined);
                    this.currentMeasure.LastInstructionsStaffEntries[this.inSourceMeasureInstrumentIndex + key - 1] = lastStaffEntry;
                    var newClefInstruction = clefInstruction;
                    newClefInstruction.Parent = lastStaffEntry;
                    lastStaffEntry.Instructions.push(newClefInstruction);
                    this.activeClefs[key - 1] = clefInstruction;
                    this.abstractInstructions.splice(i, 1);
                }
            }
        }
    };
    InstrumentReader.prototype.getNoteDurationForTuplet = function (xmlNode) {
        var duration = new fraction_1.Fraction(0, 1);
        var typeDuration = this.getNoteDurationFromTypeNode(xmlNode);
        if (xmlNode.element("time-modification") !== undefined) {
            var time = xmlNode.element("time-modification");
            if (time !== undefined) {
                if (time.element("actual-notes") !== undefined && time.element("normal-notes") !== undefined) {
                    var actualNotes = time.element("actual-notes");
                    var normalNotes = time.element("normal-notes");
                    if (actualNotes !== undefined && normalNotes !== undefined) {
                        var actual = parseInt(actualNotes.value, 10);
                        var normal = parseInt(normalNotes.value, 10);
                        duration = new fraction_1.Fraction(normal * typeDuration.Numerator, actual * typeDuration.Denominator);
                    }
                }
            }
        }
        return duration;
    };
    //private readExpressionStaffNumber(xmlNode: IXmlElement): number {
    //  let directionStaffNumber: number = 1;
    //  if (xmlNode.element("staff") !== undefined) {
    //    let staffNode: IXmlElement = xmlNode.element("staff");
    //    if (staffNode !== undefined) {
    //      try {
    //        directionStaffNumber = parseInt(staffNode.value, 10);
    //      } catch (ex) {
    //        let errorMsg: string = ITextTranslation.translateText(
    //          "ReaderErrorMessages/ExpressionStaffError", "Invalid Expression staff number -> set to default."
    //        );
    //        this.musicSheet.SheetErrors.pushTemp(errorMsg);
    //        directionStaffNumber = 1;
    //        logging.debug("InstrumentReader.readExpressionStaffNumber", errorMsg, ex);
    //      }
    //
    //    }
    //  }
    //  return directionStaffNumber;
    //}
    InstrumentReader.prototype.readDivisionsFromNotes = function () {
        var divisionsFromNote = 0;
        var xmlMeasureIndex = this.currentXmlMeasureIndex;
        var read = false;
        while (!read) {
            var xmlMeasureListArr = this.xmlMeasureList[xmlMeasureIndex].elements();
            for (var idx = 0, len = xmlMeasureListArr.length; idx < len; ++idx) {
                var xmlNode = xmlMeasureListArr[idx];
                if (xmlNode.name === "note" && xmlNode.element("time-modification") === undefined) {
                    if (xmlNode.element("duration") !== undefined && xmlNode.element("type") !== undefined) {
                        var durationNode = xmlNode.element("duration");
                        var typeNode = xmlNode.element("type");
                        if (durationNode !== undefined && typeNode !== undefined) {
                            var type = typeNode.value;
                            var noteDuration = 0;
                            try {
                                noteDuration = parseInt(durationNode.value, 10);
                            }
                            catch (ex) {
                                Logging_1.Logging.debug("InstrumentReader.readDivisionsFromNotes", ex);
                                continue;
                            }
                            switch (type) {
                                case "1024th":
                                    divisionsFromNote = (noteDuration / 4) * 1024;
                                    break;
                                case "512th":
                                    divisionsFromNote = (noteDuration / 4) * 512;
                                    break;
                                case "256th":
                                    divisionsFromNote = (noteDuration / 4) * 256;
                                    break;
                                case "128th":
                                    divisionsFromNote = (noteDuration / 4) * 128;
                                    break;
                                case "64th":
                                    divisionsFromNote = (noteDuration / 4) * 64;
                                    break;
                                case "32nd":
                                    divisionsFromNote = (noteDuration / 4) * 32;
                                    break;
                                case "16th":
                                    divisionsFromNote = (noteDuration / 4) * 16;
                                    break;
                                case "eighth":
                                    divisionsFromNote = (noteDuration / 4) * 8;
                                    break;
                                case "quarter":
                                    divisionsFromNote = (noteDuration / 4) * 4;
                                    break;
                                case "half":
                                    divisionsFromNote = (noteDuration / 4) * 2;
                                    break;
                                case "whole":
                                    divisionsFromNote = (noteDuration / 4);
                                    break;
                                case "breve":
                                    divisionsFromNote = (noteDuration / 4) / 2;
                                    break;
                                case "long":
                                    divisionsFromNote = (noteDuration / 4) / 4;
                                    break;
                                case "maxima":
                                    divisionsFromNote = (noteDuration / 4) / 8;
                                    break;
                                default:
                                    break;
                            }
                        }
                    }
                }
                if (divisionsFromNote > 0) {
                    read = true;
                    break;
                }
            }
            if (divisionsFromNote === 0) {
                xmlMeasureIndex++;
                if (xmlMeasureIndex === this.xmlMeasureList.length) {
                    var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMEssages/DivisionsError", "Invalid divisions value at Instrument: ");
                    throw new Exceptions_1.MusicSheetReadingException(errorMsg + this.instrument.Name);
                }
            }
        }
        return divisionsFromNote;
    };
    return InstrumentReader;
}());
exports.InstrumentReader = InstrumentReader;
