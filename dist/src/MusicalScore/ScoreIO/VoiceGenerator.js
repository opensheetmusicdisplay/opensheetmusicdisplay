"use strict";
var LinkedVoice_1 = require("../VoiceData/LinkedVoice");
var Voice_1 = require("../VoiceData/Voice");
var VoiceEntry_1 = require("../VoiceData/VoiceEntry");
var Note_1 = require("../VoiceData/Note");
var SourceStaffEntry_1 = require("../VoiceData/SourceStaffEntry");
var Beam_1 = require("../VoiceData/Beam");
var Tie_1 = require("../VoiceData/Tie");
var Tuplet_1 = require("../VoiceData/Tuplet");
var fraction_1 = require("../../Common/DataObjects/fraction");
var ITextTranslation_1 = require("../Interfaces/ITextTranslation");
var VoiceEntry_2 = require("../VoiceData/VoiceEntry");
var Exceptions_1 = require("../Exceptions");
var pitch_1 = require("../../Common/DataObjects/pitch");
var pitch_2 = require("../../Common/DataObjects/pitch");
var StaffEntryLink_1 = require("../VoiceData/StaffEntryLink");
var logging_1 = require("../../Common/logging");
var pitch_3 = require("../../Common/DataObjects/pitch");
var collectionUtil_1 = require("../../Util/collectionUtil");
var VoiceGenerator = (function () {
    function VoiceGenerator(instrument, voiceId, slurReader, mainVoice) {
        if (mainVoice === void 0) { mainVoice = undefined; }
        this.lastBeamTag = "";
        this.openTieDict = {};
        this.currentOctaveShift = 0;
        this.tupletDict = {};
        this.openTupletNumber = 0;
        this.musicSheet = instrument.GetMusicSheet;
        this.slurReader = slurReader;
        if (mainVoice !== undefined) {
            this.voice = new LinkedVoice_1.LinkedVoice(instrument, voiceId, mainVoice);
        }
        else {
            this.voice = new Voice_1.Voice(instrument, voiceId);
        }
        instrument.Voices.push(this.voice);
        //this.lyricsReader = MusicSymbolModuleFactory.createLyricsReader(this.musicSheet);
        //this.articulationReader = MusicSymbolModuleFactory.createArticulationReader();
    }
    Object.defineProperty(VoiceGenerator.prototype, "GetVoice", {
        get: function () {
            return this.voice;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(VoiceGenerator.prototype, "OctaveShift", {
        get: function () {
            return this.currentOctaveShift;
        },
        set: function (value) {
            this.currentOctaveShift = value;
        },
        enumerable: true,
        configurable: true
    });
    VoiceGenerator.prototype.createVoiceEntry = function (musicTimestamp, parentStaffEntry, addToVoice) {
        this.currentVoiceEntry = new VoiceEntry_1.VoiceEntry(musicTimestamp.clone(), this.voice, parentStaffEntry);
        if (addToVoice) {
            this.voice.VoiceEntries.push(this.currentVoiceEntry);
        }
        if (parentStaffEntry.VoiceEntries.indexOf(this.currentVoiceEntry) === -1) {
            parentStaffEntry.VoiceEntries.push(this.currentVoiceEntry);
        }
    };
    VoiceGenerator.prototype.read = function (noteNode, noteDuration, divisions, restNote, graceNote, parentStaffEntry, parentMeasure, measureStartAbsoluteTimestamp, maxTieNoteFraction, chord, guitarPro) {
        this.currentStaffEntry = parentStaffEntry;
        this.currentMeasure = parentMeasure;
        //Logging.debug("read called:", restNote);
        try {
            this.currentNote = restNote
                ? this.addRestNote(noteDuration, divisions)
                : this.addSingleNote(noteNode, noteDuration, divisions, graceNote, chord, guitarPro);
            // (*)
            //if (this.lyricsReader !== undefined && noteNode.element("lyric") !== undefined) {
            //    this.lyricsReader.addLyricEntry(noteNode, this.currentVoiceEntry);
            //    this.voice.Parent.HasLyrics = true;
            //}
            var notationNode = noteNode.element("notations");
            if (notationNode !== undefined) {
                // let articNode: IXmlElement = undefined;
                // (*)
                //if (this.articulationReader !== undefined) {
                //    this.readArticulations(notationNode, this.currentVoiceEntry);
                //}
                //let slurNodes: IXmlElement[] = undefined;
                // (*)
                //if (this.slurReader !== undefined && (slurNodes = notationNode.elements("slur")))
                //    this.slurReader.addSlur(slurNodes, this.currentNote);
                var tupletNodeList = notationNode.elements("tuplet");
                if (tupletNodeList) {
                    this.openTupletNumber = this.addTuplet(noteNode, tupletNodeList);
                }
                if (notationNode.element("arpeggiate") !== undefined && !graceNote) {
                    this.currentVoiceEntry.ArpeggiosNotesIndices.push(this.currentVoiceEntry.Notes.indexOf(this.currentNote));
                }
                var tiedNodeList = notationNode.elements("tied");
                if (tiedNodeList) {
                    this.addTie(tiedNodeList, measureStartAbsoluteTimestamp, maxTieNoteFraction);
                }
                var openTieDict = this.openTieDict;
                for (var key in openTieDict) {
                    if (openTieDict.hasOwnProperty(key)) {
                        var tie = openTieDict[key];
                        if (fraction_1.Fraction.plus(tie.Start.ParentStaffEntry.Timestamp, tie.Start.Length).lt(this.currentStaffEntry.Timestamp)) {
                            delete openTieDict[key];
                        }
                    }
                }
            }
            if (noteNode.element("time-modification") !== undefined && notationNode === undefined) {
                this.handleTimeModificationNode(noteNode);
            }
        }
        catch (err) {
            var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/NoteError", "Ignored erroneous Note.");
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
        }
        return this.currentNote;
    };
    VoiceGenerator.prototype.checkForOpenGraceNotes = function () {
        if (this.currentStaffEntry !== undefined
            && this.currentStaffEntry.VoiceEntries.length === 0
            && this.currentVoiceEntry.graceVoiceEntriesBefore !== undefined
            && this.currentVoiceEntry.graceVoiceEntriesBefore.length > 0) {
            var voice = this.currentVoiceEntry.ParentVoice;
            var horizontalIndex = this.currentMeasure.VerticalSourceStaffEntryContainers.indexOf(this.currentStaffEntry.VerticalContainerParent);
            var verticalIndex = this.currentStaffEntry.VerticalContainerParent.StaffEntries.indexOf(this.currentStaffEntry);
            var previousStaffEntry = this.currentMeasure.getPreviousSourceStaffEntryFromIndex(verticalIndex, horizontalIndex);
            if (previousStaffEntry !== undefined) {
                var previousVoiceEntry = undefined;
                for (var idx = 0, len = previousStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                    var voiceEntry = previousStaffEntry.VoiceEntries[idx];
                    if (voiceEntry.ParentVoice === voice) {
                        previousVoiceEntry = voiceEntry;
                        previousVoiceEntry.graceVoiceEntriesAfter = [];
                        for (var idx2 = 0, len2 = this.currentVoiceEntry.graceVoiceEntriesBefore.length; idx2 < len2; ++idx2) {
                            var graceVoiceEntry = this.currentVoiceEntry.graceVoiceEntriesBefore[idx2];
                            previousVoiceEntry.graceVoiceEntriesAfter.push(graceVoiceEntry);
                        }
                        this.currentVoiceEntry.graceVoiceEntriesBefore = [];
                        this.currentStaffEntry = undefined;
                        break;
                    }
                }
            }
        }
    };
    VoiceGenerator.prototype.checkForStaffEntryLink = function (index, currentStaff, currentStaffEntry, currentMeasure) {
        var staffEntryLink = new StaffEntryLink_1.StaffEntryLink(this.currentVoiceEntry);
        staffEntryLink.LinkStaffEntries.push(currentStaffEntry);
        currentStaffEntry.Link = staffEntryLink;
        var linkMusicTimestamp = this.currentVoiceEntry.Timestamp.clone();
        var verticalSourceStaffEntryContainer = currentMeasure.getVerticalContainerByTimestamp(linkMusicTimestamp);
        currentStaffEntry = verticalSourceStaffEntryContainer.StaffEntries[index];
        if (currentStaffEntry === undefined) {
            currentStaffEntry = new SourceStaffEntry_1.SourceStaffEntry(verticalSourceStaffEntryContainer, currentStaff);
            verticalSourceStaffEntryContainer.StaffEntries[index] = currentStaffEntry;
        }
        currentStaffEntry.VoiceEntries.push(this.currentVoiceEntry);
        staffEntryLink.LinkStaffEntries.push(currentStaffEntry);
        currentStaffEntry.Link = staffEntryLink;
        return currentStaffEntry;
    };
    VoiceGenerator.prototype.checkForOpenBeam = function () {
        if (this.openBeam !== undefined && this.currentNote !== undefined) {
            this.handleOpenBeam();
        }
    };
    VoiceGenerator.prototype.checkOpenTies = function () {
        var openTieDict = this.openTieDict;
        for (var key in openTieDict) {
            if (openTieDict.hasOwnProperty(key)) {
                var tie = openTieDict[key];
                if (fraction_1.Fraction.plus(tie.Start.ParentStaffEntry.Timestamp, tie.Start.Length)
                    .lt(tie.Start.ParentStaffEntry.VerticalContainerParent.ParentMeasure.Duration)) {
                    delete openTieDict[key];
                }
            }
        }
    };
    VoiceGenerator.prototype.hasVoiceEntry = function () {
        return this.currentVoiceEntry !== undefined;
    };
    VoiceGenerator.prototype.getNoteDurationFromType = function (type) {
        switch (type) {
            case "1024th":
                return new fraction_1.Fraction(1, 1024);
            case "512th":
                return new fraction_1.Fraction(1, 512);
            case "256th":
                return new fraction_1.Fraction(1, 256);
            case "128th":
                return new fraction_1.Fraction(1, 128);
            case "64th":
                return new fraction_1.Fraction(1, 64);
            case "32th":
            case "32nd":
                return new fraction_1.Fraction(1, 32);
            case "16th":
                return new fraction_1.Fraction(1, 16);
            case "eighth":
                return new fraction_1.Fraction(1, 8);
            case "quarter":
                return new fraction_1.Fraction(1, 4);
            case "half":
                return new fraction_1.Fraction(1, 2);
            case "whole":
                return new fraction_1.Fraction(1, 1);
            case "breve":
                return new fraction_1.Fraction(2, 1);
            case "long":
                return new fraction_1.Fraction(4, 1);
            case "maxima":
                return new fraction_1.Fraction(8, 1);
            default: {
                var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError", "Invalid note duration.");
                throw new Exceptions_1.MusicSheetReadingException(errorMsg);
            }
        }
    };
    // (*)
    //private readArticulations(notationNode: IXmlElement, currentVoiceEntry: VoiceEntry): void {
    //    let articNode: IXmlElement;
    //    if ((articNode = notationNode.element("articulations")) !== undefined)
    //        this.articulationReader.addArticulationExpression(articNode, currentVoiceEntry);
    //    let fermaNode: IXmlElement = undefined;
    //    if ((fermaNode = notationNode.element("fermata")) !== undefined)
    //        this.articulationReader.addFermata(fermaNode, currentVoiceEntry);
    //    let tecNode: IXmlElement = undefined;
    //    if ((tecNode = notationNode.element("technical")) !== undefined)
    //        this.articulationReader.addTechnicalArticulations(tecNode, currentVoiceEntry);
    //    let ornaNode: IXmlElement = undefined;
    //    if ((ornaNode = notationNode.element("ornaments")) !== undefined)
    //        this.articulationReader.addOrnament(ornaNode, currentVoiceEntry);
    //}
    VoiceGenerator.prototype.addSingleNote = function (node, noteDuration, divisions, graceNote, chord, guitarPro) {
        //Logging.debug("addSingleNote called");
        var noteAlter = pitch_1.AccidentalEnum.NONE;
        var noteStep = pitch_2.NoteEnum.C;
        var noteOctave = 0;
        var playbackInstrumentId = undefined;
        var xmlnodeElementsArr = node.elements();
        for (var idx = 0, len = xmlnodeElementsArr.length; idx < len; ++idx) {
            var noteElement = xmlnodeElementsArr[idx];
            try {
                if (noteElement.name === "pitch") {
                    var noteElementsArr = noteElement.elements();
                    for (var idx2 = 0, len2 = noteElementsArr.length; idx2 < len2; ++idx2) {
                        var pitchElement = noteElementsArr[idx2];
                        try {
                            if (pitchElement.name === "step") {
                                noteStep = pitch_2.NoteEnum[pitchElement.value];
                                if (noteStep === undefined) {
                                    var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/NotePitchError", "Invalid pitch while reading note.");
                                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                                    throw new Exceptions_1.MusicSheetReadingException(errorMsg, undefined);
                                }
                            }
                            else if (pitchElement.name === "alter") {
                                noteAlter = parseInt(pitchElement.value, 10);
                                if (isNaN(noteAlter)) {
                                    var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/NoteAlterationError", "Invalid alteration while reading note.");
                                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                                    throw new Exceptions_1.MusicSheetReadingException(errorMsg, undefined);
                                }
                            }
                            else if (pitchElement.name === "octave") {
                                noteOctave = parseInt(pitchElement.value, 10);
                                if (isNaN(noteOctave)) {
                                    var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/NoteOctaveError", "Invalid octave value while reading note.");
                                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                                    throw new Exceptions_1.MusicSheetReadingException(errorMsg, undefined);
                                }
                            }
                        }
                        catch (ex) {
                            logging_1.Logging.log("VoiceGenerator.addSingleNote read Step: ", ex.message);
                        }
                    }
                }
                else if (noteElement.name === "unpitched") {
                    var displayStep = noteElement.element("display-step");
                    if (displayStep !== undefined) {
                        noteStep = pitch_2.NoteEnum[displayStep.value.toUpperCase()];
                    }
                    var octave = noteElement.element("display-octave");
                    if (octave !== undefined) {
                        noteOctave = parseInt(octave.value, 10);
                        if (guitarPro) {
                            noteOctave += 1;
                        }
                    }
                }
                else if (noteElement.name === "instrument") {
                    if (noteElement.firstAttribute !== undefined) {
                        playbackInstrumentId = noteElement.firstAttribute.value;
                    }
                }
            }
            catch (ex) {
                logging_1.Logging.log("VoiceGenerator.addSingleNote: ", ex);
            }
        }
        noteOctave -= pitch_3.Pitch.OctaveXmlDifference;
        var pitch = new pitch_3.Pitch(noteStep, noteOctave, noteAlter);
        var noteLength = new fraction_1.Fraction(noteDuration, divisions);
        var note = new Note_1.Note(this.currentVoiceEntry, this.currentStaffEntry, noteLength, pitch);
        note.PlaybackInstrumentId = playbackInstrumentId;
        if (!graceNote) {
            this.currentVoiceEntry.Notes.push(note);
        }
        else {
            this.handleGraceNote(node, note);
        }
        if (node.elements("beam") && !chord) {
            this.createBeam(node, note, graceNote);
        }
        return note;
    };
    VoiceGenerator.prototype.addRestNote = function (noteDuration, divisions) {
        var restFraction = new fraction_1.Fraction(noteDuration, divisions);
        var restNote = new Note_1.Note(this.currentVoiceEntry, this.currentStaffEntry, restFraction, undefined);
        this.currentVoiceEntry.Notes.push(restNote);
        if (this.openBeam !== undefined) {
            this.openBeam.ExtendedNoteList.push(restNote);
        }
        return restNote;
    };
    VoiceGenerator.prototype.createBeam = function (node, note, grace) {
        try {
            var beamNode = node.element("beam");
            var beamAttr = undefined;
            if (beamNode !== undefined && beamNode.hasAttributes) {
                beamAttr = beamNode.attribute("number");
            }
            if (beamAttr !== undefined) {
                var beamNumber = parseInt(beamAttr.value, 10);
                var mainBeamNode = node.elements("beam");
                var currentBeamTag = mainBeamNode[0].value;
                if (beamNumber === 1 && mainBeamNode !== undefined) {
                    if (currentBeamTag === "begin" && this.lastBeamTag !== currentBeamTag) {
                        if (grace) {
                            if (this.openGraceBeam !== undefined) {
                                this.handleOpenBeam();
                            }
                            this.openGraceBeam = new Beam_1.Beam();
                        }
                        else {
                            if (this.openBeam !== undefined) {
                                this.handleOpenBeam();
                            }
                            this.openBeam = new Beam_1.Beam();
                        }
                    }
                    this.lastBeamTag = currentBeamTag;
                }
                var sameVoiceEntry = false;
                if (grace) {
                    if (this.openGraceBeam === undefined) {
                        return;
                    }
                    for (var idx = 0, len = this.openGraceBeam.Notes.length; idx < len; ++idx) {
                        var beamNote = this.openGraceBeam.Notes[idx];
                        if (this.currentVoiceEntry === beamNote.ParentVoiceEntry) {
                            sameVoiceEntry = true;
                        }
                    }
                    if (!sameVoiceEntry) {
                        this.openGraceBeam.addNoteToBeam(note);
                        if (currentBeamTag === "end" && beamNumber === 1) {
                            this.openGraceBeam = undefined;
                        }
                    }
                }
                else {
                    if (this.openBeam === undefined) {
                        return;
                    }
                    for (var idx = 0, len = this.openBeam.Notes.length; idx < len; ++idx) {
                        var beamNote = this.openBeam.Notes[idx];
                        if (this.currentVoiceEntry === beamNote.ParentVoiceEntry) {
                            sameVoiceEntry = true;
                        }
                    }
                    if (!sameVoiceEntry) {
                        this.openBeam.addNoteToBeam(note);
                        if (currentBeamTag === "end" && beamNumber === 1) {
                            this.openBeam = undefined;
                        }
                    }
                }
            }
        }
        catch (e) {
            var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/BeamError", "Error while reading beam.");
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
            throw new Exceptions_1.MusicSheetReadingException("", e);
        }
    };
    VoiceGenerator.prototype.handleOpenBeam = function () {
        if (this.openBeam.Notes.length === 1) {
            var beamNote = this.openBeam.Notes[0];
            beamNote.NoteBeam = undefined;
            this.openBeam = undefined;
            return;
        }
        if (this.currentNote === collectionUtil_1.CollectionUtil.last(this.openBeam.Notes)) {
            this.openBeam = undefined;
        }
        else {
            var beamLastNote = collectionUtil_1.CollectionUtil.last(this.openBeam.Notes);
            var beamLastNoteStaffEntry = beamLastNote.ParentStaffEntry;
            var horizontalIndex = this.currentMeasure.getVerticalContainerIndexByTimestamp(beamLastNoteStaffEntry.Timestamp);
            var verticalIndex = beamLastNoteStaffEntry.VerticalContainerParent.StaffEntries.indexOf(beamLastNoteStaffEntry);
            if (horizontalIndex < this.currentMeasure.VerticalSourceStaffEntryContainers.length - 1) {
                var nextStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[horizontalIndex + 1].StaffEntries[verticalIndex];
                if (nextStaffEntry !== undefined) {
                    for (var idx = 0, len = nextStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                        var voiceEntry = nextStaffEntry.VoiceEntries[idx];
                        if (voiceEntry.ParentVoice === this.voice) {
                            var candidateNote = voiceEntry.Notes[0];
                            if (candidateNote.Length <= new fraction_1.Fraction(1, 8)) {
                                this.openBeam.addNoteToBeam(candidateNote);
                                this.openBeam = undefined;
                            }
                            else {
                                this.openBeam = undefined;
                            }
                        }
                    }
                }
            }
            else {
                this.openBeam = undefined;
            }
        }
    };
    VoiceGenerator.prototype.handleGraceNote = function (node, note) {
        var graceChord = false;
        var type = "";
        if (node.elements("type")) {
            var typeNode = node.elements("type");
            if (typeNode) {
                type = typeNode[0].value;
                try {
                    note.Length = this.getNoteDurationFromType(type);
                    note.Length.Numerator = 1;
                }
                catch (e) {
                    var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError", "Invalid note duration.");
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    throw new Exceptions_1.MusicSheetReadingException(errorMsg, e);
                }
            }
        }
        var graceNode = node.element("grace");
        if (graceNode !== undefined && graceNode.attributes()) {
            if (graceNode.attribute("slash")) {
                var slash = graceNode.attribute("slash").value;
                if (slash === "yes") {
                    note.GraceNoteSlash = true;
                }
            }
        }
        if (node.element("chord") !== undefined) {
            graceChord = true;
        }
        var graceVoiceEntry = undefined;
        if (!graceChord) {
            graceVoiceEntry = new VoiceEntry_1.VoiceEntry(new fraction_1.Fraction(0, 1), this.currentVoiceEntry.ParentVoice, this.currentStaffEntry);
            if (this.currentVoiceEntry.graceVoiceEntriesBefore === undefined) {
                this.currentVoiceEntry.graceVoiceEntriesBefore = [];
            }
            this.currentVoiceEntry.graceVoiceEntriesBefore.push(graceVoiceEntry);
        }
        else {
            if (this.currentVoiceEntry.graceVoiceEntriesBefore !== undefined
                && this.currentVoiceEntry.graceVoiceEntriesBefore.length > 0) {
                graceVoiceEntry = collectionUtil_1.CollectionUtil.last(this.currentVoiceEntry.graceVoiceEntriesBefore);
            }
        }
        if (graceVoiceEntry !== undefined) {
            graceVoiceEntry.Notes.push(note);
            note.ParentVoiceEntry = graceVoiceEntry;
        }
    };
    VoiceGenerator.prototype.addTuplet = function (node, tupletNodeList) {
        if (tupletNodeList !== undefined && tupletNodeList.length > 1) {
            var timeModNode = node.element("time-modification");
            if (timeModNode !== undefined) {
                timeModNode = timeModNode.element("actual-notes");
            }
            var tupletNodeListArr = tupletNodeList;
            for (var idx = 0, len = tupletNodeListArr.length; idx < len; ++idx) {
                var tupletNode = tupletNodeListArr[idx];
                if (tupletNode !== undefined && tupletNode.attributes()) {
                    var type = tupletNode.attribute("type").value;
                    if (type === "start") {
                        var tupletNumber = 1;
                        if (tupletNode.attribute("number")) {
                            tupletNumber = parseInt(tupletNode.attribute("number").value, 10);
                        }
                        var tupletLabelNumber = 0;
                        if (timeModNode !== undefined) {
                            tupletLabelNumber = parseInt(timeModNode.value, 10);
                            if (isNaN(tupletLabelNumber)) {
                                var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/TupletNoteDurationError", "Invalid tuplet note duration.");
                                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                                throw new Exceptions_1.MusicSheetReadingException(errorMsg, undefined);
                            }
                        }
                        var tuplet = new Tuplet_1.Tuplet(tupletLabelNumber);
                        if (this.tupletDict[tupletNumber] !== undefined) {
                            delete this.tupletDict[tupletNumber];
                            if (Object.keys(this.tupletDict).length === 0) {
                                this.openTupletNumber = 0;
                            }
                            else if (Object.keys(this.tupletDict).length > 1) {
                                this.openTupletNumber--;
                            }
                        }
                        this.tupletDict[tupletNumber] = tuplet;
                        var subnotelist = [];
                        subnotelist.push(this.currentNote);
                        tuplet.Notes.push(subnotelist);
                        tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                        this.currentNote.NoteTuplet = tuplet;
                        this.openTupletNumber = tupletNumber;
                    }
                    else if (type === "stop") {
                        var tupletNumber = 1;
                        if (tupletNode.attribute("number")) {
                            tupletNumber = parseInt(tupletNode.attribute("number").value, 10);
                        }
                        var tuplet = this.tupletDict[tupletNumber];
                        if (tuplet !== undefined) {
                            var subnotelist = [];
                            subnotelist.push(this.currentNote);
                            tuplet.Notes.push(subnotelist);
                            tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                            this.currentNote.NoteTuplet = tuplet;
                            delete this.tupletDict[tupletNumber];
                            if (Object.keys(this.tupletDict).length === 0) {
                                this.openTupletNumber = 0;
                            }
                            else if (Object.keys(this.tupletDict).length > 1) {
                                this.openTupletNumber--;
                            }
                        }
                    }
                }
            }
        }
        else if (tupletNodeList[0] !== undefined) {
            var n = tupletNodeList[0];
            if (n.hasAttributes) {
                var type = n.attribute("type").value;
                var tupletnumber = 1;
                if (n.attribute("number")) {
                    tupletnumber = parseInt(n.attribute("number").value, 10);
                }
                var noTupletNumbering = isNaN(tupletnumber);
                if (type === "start") {
                    var tupletLabelNumber = 0;
                    var timeModNode = node.element("time-modification");
                    if (timeModNode !== undefined) {
                        timeModNode = timeModNode.element("actual-notes");
                    }
                    if (timeModNode !== undefined) {
                        tupletLabelNumber = parseInt(timeModNode.value, 10);
                        if (isNaN(tupletLabelNumber)) {
                            var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/TupletNoteDurationError", "Invalid tuplet note duration.");
                            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                            throw new Exceptions_1.MusicSheetReadingException(errorMsg);
                        }
                    }
                    if (noTupletNumbering) {
                        this.openTupletNumber++;
                        tupletnumber = this.openTupletNumber;
                    }
                    var tuplet = this.tupletDict[tupletnumber];
                    if (tuplet === undefined) {
                        tuplet = this.tupletDict[tupletnumber] = new Tuplet_1.Tuplet(tupletLabelNumber);
                    }
                    var subnotelist = [];
                    subnotelist.push(this.currentNote);
                    tuplet.Notes.push(subnotelist);
                    tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                    this.currentNote.NoteTuplet = tuplet;
                    this.openTupletNumber = tupletnumber;
                }
                else if (type === "stop") {
                    if (noTupletNumbering) {
                        tupletnumber = this.openTupletNumber;
                    }
                    var tuplet = this.tupletDict[this.openTupletNumber];
                    if (tuplet !== undefined) {
                        var subnotelist = [];
                        subnotelist.push(this.currentNote);
                        tuplet.Notes.push(subnotelist);
                        tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                        this.currentNote.NoteTuplet = tuplet;
                        if (Object.keys(this.tupletDict).length === 0) {
                            this.openTupletNumber = 0;
                        }
                        else if (Object.keys(this.tupletDict).length > 1) {
                            this.openTupletNumber--;
                        }
                        delete this.tupletDict[tupletnumber];
                    }
                }
            }
        }
        return this.openTupletNumber;
    };
    VoiceGenerator.prototype.handleTimeModificationNode = function (noteNode) {
        if (this.openTupletNumber in this.tupletDict) {
            try {
                var tuplet = this.tupletDict[this.openTupletNumber];
                var notes = collectionUtil_1.CollectionUtil.last(tuplet.Notes);
                var lastTupletVoiceEntry = notes[0].ParentVoiceEntry;
                var noteList = void 0;
                if (lastTupletVoiceEntry.Timestamp === this.currentVoiceEntry.Timestamp) {
                    noteList = notes;
                }
                else {
                    noteList = [];
                    tuplet.Notes.push(noteList);
                    tuplet.Fractions.push(this.getTupletNoteDurationFromType(noteNode));
                }
                noteList.push(this.currentNote);
                this.currentNote.NoteTuplet = tuplet;
            }
            catch (ex) {
                var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/TupletNumberError", "Invalid tuplet number.");
                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                throw ex;
            }
        }
        else if (this.currentVoiceEntry.Notes.length > 0) {
            var firstNote = this.currentVoiceEntry.Notes[0];
            if (firstNote.NoteTuplet !== undefined) {
                var tuplet = firstNote.NoteTuplet;
                var notes = collectionUtil_1.CollectionUtil.last(tuplet.Notes);
                notes.push(this.currentNote);
                this.currentNote.NoteTuplet = tuplet;
            }
        }
    };
    VoiceGenerator.prototype.addTie = function (tieNodeList, measureStartAbsoluteTimestamp, maxTieNoteFraction) {
        if (tieNodeList !== undefined) {
            if (tieNodeList.length === 1) {
                var tieNode = tieNodeList[0];
                if (tieNode !== undefined && tieNode.attributes()) {
                    var type = tieNode.attribute("type").value;
                    try {
                        if (type === "start") {
                            var num = this.findCurrentNoteInTieDict(this.currentNote);
                            if (num < 0) {
                                delete this.openTieDict[num];
                            }
                            var newTieNumber = this.getNextAvailableNumberForTie();
                            var tie = new Tie_1.Tie(this.currentNote);
                            this.openTieDict[newTieNumber] = tie;
                            if (this.currentNote.NoteBeam !== undefined) {
                                if (this.currentNote.NoteBeam.Notes[0] === this.currentNote) {
                                    tie.BeamStartTimestamp = fraction_1.Fraction.plus(measureStartAbsoluteTimestamp, this.currentVoiceEntry.Timestamp);
                                }
                                else {
                                    for (var idx = 0, len = this.currentNote.NoteBeam.Notes.length; idx < len; ++idx) {
                                        var note = this.currentNote.NoteBeam.Notes[idx];
                                        if (note.NoteTie !== undefined && note.NoteTie !== tie && note.NoteTie.BeamStartTimestamp !== undefined) {
                                            tie.BeamStartTimestamp = note.NoteTie.BeamStartTimestamp;
                                            break;
                                        }
                                    }
                                    if (this.currentNote === collectionUtil_1.CollectionUtil.last(this.currentNote.NoteBeam.Notes)) {
                                        tie.BeamStartTimestamp = fraction_1.Fraction.plus(measureStartAbsoluteTimestamp, this.currentVoiceEntry.Timestamp);
                                    }
                                }
                            }
                        }
                        else if (type === "stop") {
                            var tieNumber = this.findCurrentNoteInTieDict(this.currentNote);
                            var tie = this.openTieDict[tieNumber];
                            if (tie !== undefined) {
                                var tieStartNote = tie.Start;
                                tieStartNote.NoteTie = tie;
                                tieStartNote.Length.Add(this.currentNote.Length);
                                tie.Fractions.push(this.currentNote.Length);
                                if (maxTieNoteFraction.lt(fraction_1.Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length))) {
                                    maxTieNoteFraction = fraction_1.Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length);
                                }
                                var i = this.currentVoiceEntry.Notes.indexOf(this.currentNote);
                                if (i !== -1) {
                                    this.currentVoiceEntry.Notes.splice(i, 1);
                                }
                                if (this.currentVoiceEntry.Articulations.length === 1
                                    && this.currentVoiceEntry.Articulations[0] === VoiceEntry_2.ArticulationEnum.fermata
                                    && tieStartNote.ParentVoiceEntry.Articulations[VoiceEntry_2.ArticulationEnum.fermata] === undefined) {
                                    tieStartNote.ParentVoiceEntry.Articulations.push(VoiceEntry_2.ArticulationEnum.fermata);
                                }
                                if (this.currentNote.NoteBeam !== undefined) {
                                    var noteBeamIndex = this.currentNote.NoteBeam.Notes.indexOf(this.currentNote);
                                    if (noteBeamIndex === 0 && tie.BeamStartTimestamp === undefined) {
                                        tie.BeamStartTimestamp = fraction_1.Fraction.plus(measureStartAbsoluteTimestamp, this.currentVoiceEntry.Timestamp);
                                    }
                                    var noteBeam = this.currentNote.NoteBeam;
                                    noteBeam.Notes[noteBeamIndex] = tieStartNote;
                                    tie.TieBeam = noteBeam;
                                }
                                if (this.currentNote.NoteTuplet !== undefined) {
                                    var noteTupletIndex = this.currentNote.NoteTuplet.getNoteIndex(this.currentNote);
                                    var index = this.currentNote.NoteTuplet.Notes[noteTupletIndex].indexOf(this.currentNote);
                                    var noteTuplet = this.currentNote.NoteTuplet;
                                    noteTuplet.Notes[noteTupletIndex][index] = tieStartNote;
                                    tie.TieTuplet = noteTuplet;
                                }
                                for (var idx = 0, len = this.currentNote.NoteSlurs.length; idx < len; ++idx) {
                                    var slur = this.currentNote.NoteSlurs[idx];
                                    if (slur.StartNote === this.currentNote) {
                                        slur.StartNote = tie.Start;
                                        slur.StartNote.NoteSlurs.push(slur);
                                    }
                                    if (slur.EndNote === this.currentNote) {
                                        slur.EndNote = tie.Start;
                                        slur.EndNote.NoteSlurs.push(slur);
                                    }
                                }
                                var lyricsEntries = this.currentVoiceEntry.LyricsEntries;
                                for (var lyricsEntry in lyricsEntries) {
                                    if (lyricsEntries.hasOwnProperty(lyricsEntry)) {
                                        var val = this.currentVoiceEntry.LyricsEntries[lyricsEntry];
                                        if (!tieStartNote.ParentVoiceEntry.LyricsEntries.hasOwnProperty(lyricsEntry)) {
                                            tieStartNote.ParentVoiceEntry.LyricsEntries[lyricsEntry] = val;
                                            val.Parent = tieStartNote.ParentVoiceEntry;
                                        }
                                    }
                                }
                                delete this.openTieDict[tieNumber];
                            }
                        }
                    }
                    catch (err) {
                        var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/TieError", "Error while reading tie.");
                        this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    }
                }
            }
            else if (tieNodeList.length === 2) {
                var tieNumber = this.findCurrentNoteInTieDict(this.currentNote);
                if (tieNumber >= 0) {
                    var tie = this.openTieDict[tieNumber];
                    var tieStartNote_1 = tie.Start;
                    tieStartNote_1.Length.Add(this.currentNote.Length);
                    tie.Fractions.push(this.currentNote.Length);
                    if (this.currentNote.NoteBeam !== undefined) {
                        var noteBeamIndex = this.currentNote.NoteBeam.Notes.indexOf(this.currentNote);
                        if (noteBeamIndex === 0 && tie.BeamStartTimestamp === undefined) {
                            tie.BeamStartTimestamp = fraction_1.Fraction.plus(measureStartAbsoluteTimestamp, this.currentVoiceEntry.Timestamp);
                        }
                        var noteBeam = this.currentNote.NoteBeam;
                        noteBeam.Notes[noteBeamIndex] = tieStartNote_1;
                        tie.TieBeam = noteBeam;
                    }
                    for (var idx = 0, len = this.currentNote.NoteSlurs.length; idx < len; ++idx) {
                        var slur = this.currentNote.NoteSlurs[idx];
                        if (slur.StartNote === this.currentNote) {
                            slur.StartNote = tie.Start;
                            slur.StartNote.NoteSlurs.push(slur);
                        }
                        if (slur.EndNote === this.currentNote) {
                            slur.EndNote = tie.Start;
                            slur.EndNote.NoteSlurs.push(slur);
                        }
                    }
                    this.currentVoiceEntry.LyricsEntries.forEach(function (key, value) {
                        if (!tieStartNote_1.ParentVoiceEntry.LyricsEntries.containsKey(key)) {
                            tieStartNote_1.ParentVoiceEntry.LyricsEntries.setValue(key, value);
                            value.Parent = tieStartNote_1.ParentVoiceEntry;
                        }
                    });
                    if (maxTieNoteFraction.lt(fraction_1.Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length))) {
                        maxTieNoteFraction = fraction_1.Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length);
                    }
                    // delete currentNote from Notes:
                    var i = this.currentVoiceEntry.Notes.indexOf(this.currentNote);
                    if (i !== -1) {
                        this.currentVoiceEntry.Notes.splice(i, 1);
                    }
                }
            }
        }
    };
    VoiceGenerator.prototype.getNextAvailableNumberForTie = function () {
        var keys = Object.keys(this.openTieDict);
        if (keys.length === 0) {
            return 1;
        }
        keys.sort(function (a, b) { return (+a - +b); }); // FIXME Andrea: test
        for (var i = 0; i < keys.length; i++) {
            if ("" + (i + 1) !== keys[i]) {
                return i + 1;
            }
        }
        return +(keys[keys.length - 1]) + 1;
    };
    VoiceGenerator.prototype.findCurrentNoteInTieDict = function (candidateNote) {
        var openTieDict = this.openTieDict;
        for (var key in openTieDict) {
            if (openTieDict.hasOwnProperty(key)) {
                var tie = openTieDict[key];
                if (tie.Start.Pitch.FundamentalNote === candidateNote.Pitch.FundamentalNote && tie.Start.Pitch.Octave === candidateNote.Pitch.Octave) {
                    return +key;
                }
            }
        }
        return -1;
    };
    VoiceGenerator.prototype.getTupletNoteDurationFromType = function (xmlNode) {
        if (xmlNode.element("type") !== undefined) {
            var typeNode = xmlNode.element("type");
            if (typeNode !== undefined) {
                var type = typeNode.value;
                try {
                    return this.getNoteDurationFromType(type);
                }
                catch (e) {
                    var errorMsg = ITextTranslation_1.ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError", "Invalid note duration.");
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    throw new Exceptions_1.MusicSheetReadingException("", e);
                }
            }
        }
        return undefined;
    };
    return VoiceGenerator;
}());
exports.VoiceGenerator = VoiceGenerator;
