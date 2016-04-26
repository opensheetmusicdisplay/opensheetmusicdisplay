import {Instrument} from "../Instrument";
import {LinkedVoice} from "../VoiceData/LinkedVoice";
import {Voice} from "../VoiceData/Voice";
import {MusicSheet} from "../MusicSheet";
import {VoiceEntry} from "../VoiceData/VoiceEntry";
import {Note} from "../VoiceData/Note";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {Beam} from "../VoiceData/Beam";
import {Tie} from "../VoiceData/Tie";
import {Tuplet} from "../VoiceData/Tuplet";
import {Fraction} from "../../Common/DataObjects/fraction";
//import {MusicSymbolModuleFactory} from "./InstrumentReader";
import {IXmlElement} from "../../Common/FileIO/Xml";
import {ITextTranslation} from "../Interfaces/ITextTranslation";
import {ArticulationEnum} from "../VoiceData/VoiceEntry";
import {Slur} from "../VoiceData/Expressions/ContinuousExpressions/Slur";
import {LyricsEntry} from "../VoiceData/Lyrics/LyricsEntry";
import {MusicSheetReadingException} from "../Exceptions";

type SlurReader = any;

export class VoiceGenerator {
    constructor(instrument: Instrument, voiceId: number, slurReader: SlurReader, mainVoice: Voice = null) {
        this.musicSheet = instrument.GetMusicSheet;
        this.slurReader = slurReader;
        if (mainVoice != null)
            this.voice = new LinkedVoice(instrument, voiceId, mainVoice);
        else {
            this.voice = new Voice(instrument, voiceId);
        }
        instrument.Voices.push(this.voice);
        //this.lyricsReader = MusicSymbolModuleFactory.createLyricsReader(this.musicSheet);
        //this.articulationReader = MusicSymbolModuleFactory.createArticulationReader();
    }
    private slurReader: SlurReader;
    //private lyricsReader: LyricsReader;
    //private articulationReader: ArticulationReader;
    private musicSheet: MusicSheet;
    private voice: Voice;
    private currentVoiceEntry: VoiceEntry;
    private currentNote: Note;
    private currentMeasure: SourceMeasure;
    private currentStaffEntry: SourceStaffEntry;
    private lastBeamTag: string = "";
    private openBeam: Beam;
    private openGraceBeam: Beam;
    private openTieDict: { [_: number]: Tie; } = {};
    private currentOctaveShift: number = 0;
    private tupletDict: { [_: number]: Tuplet; } = {};
    private openTupletNumber: number = 0;

    public get GetVoice(): Voice {
        return this.voice;
    }
    public get OctaveShift(): number {
        return this.currentOctaveShift;
    }
    public set OctaveShift(value: number) {
        this.currentOctaveShift = value;
    }
    public createVoiceEntry(musicTimestamp: Fraction, parentStaffEntry: SourceStaffEntry, addToVoice: boolean): void {
        this.currentVoiceEntry = new VoiceEntry(musicTimestamp.clone(), this.voice, parentStaffEntry);
        if (addToVoice)
            this.voice.VoiceEntries.push(this.currentVoiceEntry);
        if (parentStaffEntry.VoiceEntries.indexOf(this.currentVoiceEntry) === -1)
            parentStaffEntry.VoiceEntries.push(this.currentVoiceEntry);
    }
    public read(noteNode: IXmlElement, noteDuration: number, divisions: number, restNote: boolean, graceNote: boolean,
        parentStaffEntry: SourceStaffEntry, parentMeasure: SourceMeasure,
        measureStartAbsoluteTimestamp: Fraction, maxTieNoteFraction: Fraction, chord: boolean, guitarPro: boolean): Note {
        this.currentStaffEntry = parentStaffEntry;
        this.currentMeasure = parentMeasure;
        try {
            this.currentNote = restNote ? this.addRestNote(noteDuration, divisions) : this.addSingleNote(noteNode, noteDuration, divisions, graceNote, chord, guitarPro);
            if (this.lyricsReader != null && noteNode.Element("lyric") != null) {
                this.lyricsReader.addLyricEntry(noteNode, this.currentVoiceEntry);
                this.voice.Parent.HasLyrics = true;
            }
            var notationNode: IXmlElement = noteNode.Element("notations");
            if (notationNode != null) {
                var articNode: IXmlElement = null;
                if (this.articulationReader != null) {
                    this.readArticulations(notationNode, this.currentVoiceEntry);
                }
                var slurNodes: IXmlElement[] = null;
                if (this.slurReader != null && (slurNodes = notationNode.Elements("slur")).Any())
                    this.slurReader.addSlur(slurNodes, this.currentNote);
                var tupletNodeList: IXmlElement[] = null;
                if ((tupletNodeList = notationNode.Elements("tuplet")))
                    this.openTupletNumber = this.addTuplet(noteNode, tupletNodeList);
                if (notationNode.Element("arpeggiate") != null && !graceNote)
                    this.currentVoiceEntry.ArpeggiosNotesIndices.push(this.currentVoiceEntry.Notes.indexOf(this.currentNote));
                var tiedNodeList: IXmlElement[] = null;
                if ((tiedNodeList = notationNode.Elements("tied")))
                    this.addTie(tiedNodeList, measureStartAbsoluteTimestamp, maxTieNoteFraction);
                var toRemove: number[] = new number[]();
                var openTieDictArr: KeyValuePair<number, Tie>[] = this.openTieDict.ToArray();
                for (var idx: number = 0, len = openTieDictArr.length; idx < len; ++idx) {
                    var openTie: KeyValuePair<number, Tie> = openTieDictArr[idx];
                    var tie: Tie = openTie.Value;
                    if (tie.Start.ParentStaffEntry.Timestamp + tie.Start.Length < this.currentStaffEntry.Timestamp)
                        toRemove.push(openTie.Key);
                }
                for (var idx: number = 0, len = toRemove.length; idx < len; ++idx) {
                    var i: number = toRemove[idx];
                    this.openTieDict.Remove(i);
                }
            }
            if (noteNode.Element("time-modification") != null && notationNode == null) {
                this.handleTimeModificationNode(noteNode);
            }
        }
        catch (err) {
            var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteError",
                "Ignored erroneous Note.");
            this.musicSheet.SheetErrors.pushTemp(errorMsg);
        }

        return this.currentNote;
    }
    public checkForOpenGraceNotes(): void {
        if (this.currentStaffEntry != null && this.currentStaffEntry.VoiceEntries.length == 0 && this.currentVoiceEntry.GraceVoiceEntriesBefore != null && this.currentVoiceEntry.GraceVoiceEntriesBefore.length > 0) {
            var voice: Voice = this.currentVoiceEntry.ParentVoice;
            var horizontalIndex: number = this.currentMeasure.VerticalSourceStaffEntryContainers.indexOf(this.currentStaffEntry.VerticalContainerParent);
            var verticalIndex: number = this.currentStaffEntry.VerticalContainerParent.StaffEntries.indexOf(this.currentStaffEntry);
            var previousStaffEntry: SourceStaffEntry = this.currentMeasure.getPreviousSourceStaffEntryFromIndex(verticalIndex, horizontalIndex);
            if (previousStaffEntry != null) {
                var previousVoiceEntry: VoiceEntry = null;
                for (var idx: number = 0, len = previousStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                    var voiceEntry: VoiceEntry = previousStaffEntry.VoiceEntries[idx];
                    if (voiceEntry.ParentVoice == voice) {
                        previousVoiceEntry = voiceEntry;
                        previousVoiceEntry.GraceVoiceEntriesAfter = VoiceEntry[];
                        for (var idx2: number = 0, len2 = this.currentVoiceEntry.GraceVoiceEntriesBefore.length; idx2 < len2; ++idx2) {
                            var graceVoiceEntry: VoiceEntry = this.currentVoiceEntry.GraceVoiceEntriesBefore[idx2];
                            previousVoiceEntry.GraceVoiceEntriesAfter.push(graceVoiceEntry);
                        }
                        this.currentVoiceEntry.GraceVoiceEntriesBefore.Clear();
                        this.currentStaffEntry = null;
                        break;
                    }
                }
            }
        }
    }
    public checkForStaffEntryLink(index: number, currentStaff: Staff, currentStaffEntry: SourceStaffEntry,
        currentMeasure: SourceMeasure): SourceStaffEntry {
        var staffEntryLink: StaffEntryLink = new StaffEntryLink(this.currentVoiceEntry);
        staffEntryLink.LinkStaffEntries.push(currentStaffEntry);
        currentStaffEntry.Link = staffEntryLink;
        var linkMusicTimestamp: Fraction = new Fraction(this.currentVoiceEntry.Timestamp);
        var verticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = currentMeasure.getVerticalContainerByTimestamp(linkMusicTimestamp);
        currentStaffEntry = verticalSourceStaffEntryContainer[index];
        if (currentStaffEntry == null) {
            currentStaffEntry = new SourceStaffEntry(verticalSourceStaffEntryContainer, currentStaff);
            verticalSourceStaffEntryContainer[index] = currentStaffEntry;
        }
        currentStaffEntry.VoiceEntries.push(this.currentVoiceEntry);
        staffEntryLink.LinkStaffEntries.push(currentStaffEntry);
        currentStaffEntry.Link = staffEntryLink;
        return currentStaffEntry;
    }
    public checkForOpenBeam(): void {
        if (this.openBeam != null && this.currentNote != null)
            this.handleOpenBeam();
    }
    public checkOpenTies(): void {
        var toRemove: number[] = new number[]();
        var openTieDictArr: KeyValuePair<number, Tie>[] = this.openTieDict.ToArray();
        for (var idx: number = 0, len = openTieDictArr.length; idx < len; ++idx) {
            var openTie: KeyValuePair<number, Tie> = openTieDictArr[idx];
            var tie: Tie = openTie.Value;
            if (tie.Start.ParentStaffEntry.Timestamp + tie.Start.Length < tie.Start.ParentStaffEntry.VerticalContainerParent.ParentMeasure.Duration)
                toRemove.push(openTie.Key);
        }
        for (var idx: number = 0, len = toRemove.length; idx < len; ++idx) {
            var i: number = toRemove[idx];
            this.openTieDict.Remove(i);
        }
    }
    public hasVoiceEntry(): boolean {
        return this.currentVoiceEntry != null;
    }
    public getNoteDurationFromType(type: string): Fraction {
        switch (type) {
            case "1024th":
                return new Fraction(1, 1024);
            case "512th":
                return new Fraction(1, 512);
            case "256th":
                return new Fraction(1, 256);
            case "128th":
                return new Fraction(1, 128);
            case "64th":
                return new Fraction(1, 64);
            case "32th":
            case "32nd":
                return new Fraction(1, 32);
            case "16th":
                return new Fraction(1, 16);
            case "eighth":
                return new Fraction(1, 8);
            case "quarter":
                return new Fraction(1, 4);
            case "half":
                return new Fraction(1, 2);
            case "whole":
                return new Fraction(1, 1);
            case "breve":
                return new Fraction(2, 1);
            case "long":
                return new Fraction(4, 1);
            case "maxima":
                return new Fraction(8, 1);
            default:
                {
                    var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError",
                        "Invalid note duration.");
                    throw new MusicSheetReadingException(errorMsg, 0);
                }
        }
    }
    private readArticulations(notationNode: IXmlElement, currentVoiceEntry: VoiceEntry): void {
        var articNode: IXmlElement;
        if ((articNode = notationNode.Element("articulations")) != null)
            this.articulationReader.addArticulationExpression(articNode, currentVoiceEntry);
        var fermaNode: IXmlElement = null;
        if ((fermaNode = notationNode.Element("fermata")) != null)
            this.articulationReader.addFermata(fermaNode, currentVoiceEntry);
        var tecNode: IXmlElement = null;
        if ((tecNode = notationNode.Element("technical")) != null)
            this.articulationReader.addTechnicalArticulations(tecNode, currentVoiceEntry);
        var ornaNode: IXmlElement = null;
        if ((ornaNode = notationNode.Element("ornaments")) != null)
            this.articulationReader.addOrnament(ornaNode, currentVoiceEntry);
    }
    private addSingleNote(node: IXmlElement, noteDuration: number, divisions: number, graceNote: boolean, chord: boolean,
        guitarPro: boolean): Note {
        var noteAlter: AccidentalEnum = AccidentalEnum.NONE;
        var noteStep: NoteEnum = NoteEnum.C;
        var noteOctave: number = 0;
        var playbackInstrumentId: string = null;
        var xmlnodeElementsArr: IXmlElement[] = node.Elements().ToArray();
        for (var idx: number = 0, len = xmlnodeElementsArr.length; idx < len; ++idx) {
            var noteElement: IXmlElement = xmlnodeElementsArr[idx];
            try {
                if (noteElement.Name == "pitch") {
                    var noteElementsArr: IXmlElement[] = noteElement.Elements().ToArray();
                    for (var idx2: number = 0, len2 = noteElementsArr.length; idx2 < len2; ++idx2) {
                        var pitchElement: IXmlElement = noteElementsArr[idx2];
                        try {
                            if (pitchElement.Name == "step") {
                                try {
                                    switch (pitchElement.Value) {
                                        case "C":
                                            {
                                                noteStep = NoteEnum.C;
                                                break;
                                            }
                                        case "D":
                                            {
                                                noteStep = NoteEnum.D;
                                                break;
                                            }
                                        case "E":
                                            {
                                                noteStep = NoteEnum.E;
                                                break;
                                            }
                                        case "F":
                                            {
                                                noteStep = NoteEnum.F;
                                                break;
                                            }
                                        case "G":
                                            {
                                                noteStep = NoteEnum.G;
                                                break;
                                            }
                                        case "A":
                                            {
                                                noteStep = NoteEnum.A;
                                                break;
                                            }
                                        case "B":
                                            {
                                                noteStep = NoteEnum.B;
                                                break;
                                            }
                                    }
                                }
                                catch (e) {
                                    var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NotePitchError",
                                        "Invalid pitch while reading note.");
                                    this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                                    throw new MusicSheetReadingException("", e, 0);
                                }

                            }
                            else if (pitchElement.Name == "alter") {
                                try {
                                    noteAlter = <AccidentalEnum>StringToNumberConverter.ToInteger(pitchElement.Value);
                                }
                                catch (e) {
                                    var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteAlterationError",
                                        "Invalid alteration while reading note.");
                                    this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                                    throw new MusicSheetReadingException("", e, 0);
                                }

                            }
                            else if (pitchElement.Name == "octave") {
                                try {
                                    noteOctave = <number>StringToNumberConverter.ToInteger(pitchElement.Value);
                                }
                                catch (e) {
                                    var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteOctaveError",
                                        "Invalid octave value while reading note.");
                                    this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                                    throw new MusicSheetReadingException("", e, 0);
                                }

                            }
                        }
                        catch (ex) {
                            Logger.DefaultLogger.LogError(LogLevel.NORMAL,
                                "VoiceGenerator.addSingleNote read Step: ", ex);
                        }

                    }
                }
                else if (noteElement.Name == "unpitched") {
                    var displayStep: IXmlElement = null;
                    if ((displayStep = noteElement.Element("display-step")) != null) {
                        noteStep = <NoteEnum>Enum.Parse(/*typeof*/NoteEnum, displayStep.Value);
                    }
                    var octave: IXmlElement = null;
                    if ((octave = noteElement.Element("display-octave")) != null) {
                        noteOctave = <number>(StringToNumberConverter.ToInteger(octave.Value));
                        if (guitarPro)
                            noteOctave += 1;
                    }
                }
                else if (noteElement.Name == "instrument") {
                    if (noteElement.FirstAttribute != null)
                        playbackInstrumentId = noteElement.FirstAttribute.Value;
                }
            }
            catch (ex) {
                Logger.DefaultLogger.LogError(LogLevel.NORMAL, "VoiceGenerator.addSingleNote: ", ex);
            }

        }
        noteOctave -= Pitch.XmlOctaveDifference;
        var pitch: Pitch = new Pitch(noteStep, noteOctave, noteAlter);
        var noteLength: Fraction = new Fraction(noteDuration, divisions);
        var note: Note = new Note(this.currentVoiceEntry, this.currentStaffEntry, noteLength, pitch);
        note.PlaybackInstrumentId = playbackInstrumentId;
        if (!graceNote)
            this.currentVoiceEntry.Notes.push(note);
        else this.handleGraceNote(node, note);
        if (node.Elements("beam").Any() && !chord) {
            this.createBeam(node, note, graceNote);
        }
        return note;
    }
    private addRestNote(noteDuration: number, divisions: number): Note {
        var restFraction: Fraction = new Fraction(noteDuration, divisions);
        var restNote: Note = new Note(this.currentVoiceEntry, this.currentStaffEntry, restFraction, null);
        this.currentVoiceEntry.Notes.push(restNote);
        if (this.openBeam != null)
            this.openBeam.ExtendedNoteList.push(restNote);
        return restNote;
    }
    private createBeam(node: IXmlElement, note: Note, grace: boolean): void {
        try {
            var beamNode: IXmlElement = node.Element("beam");
            var beamAttr: IXmlAttribute = null;
            if (beamNode != null && beamNode.HasAttributes)
                beamAttr = beamNode.Attribute("number");
            if (beamAttr != null) {
                var beamNumber: number = StringToNumberConverter.ToInteger(beamAttr.Value);
                var mainBeamNode: IXmlElement[] = node.Elements("beam");
                var currentBeamTag: string = mainBeamNode.First().Value;
                if (beamNumber == 1 && mainBeamNode != null) {
                    if (currentBeamTag == "begin" && this.lastBeamTag != currentBeamTag) {
                        if (grace) {
                            if (this.openGraceBeam != null)
                                this.handleOpenBeam();
                            this.openGraceBeam = new Beam();
                        }
                        else {
                            if (this.openBeam != null)
                                this.handleOpenBeam();
                            this.openBeam = new Beam();
                        }
                    }
                    this.lastBeamTag = currentBeamTag;
                }
                var sameVoiceEntry: boolean = false;
                if (grace) {
                    if (this.openGraceBeam == null)
                        return
                    for (var idx: number = 0, len = this.openGraceBeam.Notes.length; idx < len; ++idx) {
                        var beamNote: Note = this.openGraceBeam.Notes[idx];
                        if (this.currentVoiceEntry == beamNote.ParentVoiceEntry)
                            sameVoiceEntry = true;
                    }
                    if (!sameVoiceEntry) {
                        this.openGraceBeam.addNoteToBeam(note);
                        if (currentBeamTag == "end" && beamNumber == 1)
                            this.openGraceBeam = null;
                    }
                }
                else {
                    if (this.openBeam == null)
                        return
                    for (var idx: number = 0, len = this.openBeam.Notes.length; idx < len; ++idx) {
                        var beamNote: Note = this.openBeam.Notes[idx];
                        if (this.currentVoiceEntry == beamNote.ParentVoiceEntry)
                            sameVoiceEntry = true;
                    }
                    if (!sameVoiceEntry) {
                        this.openBeam.addNoteToBeam(note);
                        if (currentBeamTag == "end" && beamNumber == 1)
                            this.openBeam = null;
                    }
                }
            }
        }
        catch (e) {
            var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/BeamError",
                "Error while reading beam.");
            this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
            throw new MusicSheetReadingException("", e, 0);
        }

    }
    private handleOpenBeam(): void {
        if (this.openBeam.Notes.length == 1) {
            var beamNote: Note = this.openBeam.Notes[0];
            beamNote.NoteBeam = null;
            this.openBeam = null;
            return
        }
        if (this.currentNote == this.openBeam.Notes.Last())
            this.openBeam = null;
        else {
            var beamLastNote: Note = this.openBeam.Notes.Last();
            var beamLastNoteStaffEntry: SourceStaffEntry = beamLastNote.ParentStaffEntry;
            var horizontalIndex: number = this.currentMeasure.getVerticalContainerIndexByTimestamp(beamLastNoteStaffEntry.Timestamp);
            var verticalIndex: number = beamLastNoteStaffEntry.VerticalContainerParent.StaffEntries.indexOf(beamLastNoteStaffEntry);
            if (horizontalIndex < this.currentMeasure.VerticalSourceStaffEntryContainers.length - 1) {
                var nextStaffEntry: SourceStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[horizontalIndex + 1][verticalIndex];
                if (nextStaffEntry != null) {
                    for (var idx: number = 0, len = nextStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                        var voiceEntry: VoiceEntry = nextStaffEntry.VoiceEntries[idx];
                        if (voiceEntry.ParentVoice == this.voice) {
                            var candidateNote: Note = voiceEntry.Notes[0];
                            if (candidateNote.Length <= new Fraction(1, 8)) {
                                this.openBeam.addNoteToBeam(candidateNote);
                                this.openBeam = null;
                            }
                            else {
                                this.openBeam = null;
                            }
                        }
                    }
                }
            }
            else {
                this.openBeam = null;
            }
        }
    }
    private handleGraceNote(node: IXmlElement, note: Note): void {
        var graceChord: boolean = false;
        var type: string = "";
        if (node.Elements("type").Any()) {
            var typeNode: IXmlElement[] = node.Elements("type");
            if (typeNode.Any()) {
                type = typeNode.First().Value;
                try {
                    note.Length = this.getNoteDurationFromType(type);
                    note.Length.Numerator = 1;
                }
                catch (e) {
                    var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError",
                        "Invalid note duration.");
                    this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                    throw new MusicSheetReadingException("", e, 0);
                }

            }
        }
        var graceNode: IXmlElement = node.Element("grace");
        if (graceNode != null && graceNode.Attributes().Any()) {
            if (graceNode.Attribute("slash") != null) {
                var slash: string = graceNode.Attribute("slash").Value;
                if (slash == "yes")
                    note.GraceNoteSlash = true;
            }
        }
        if (node.Element("chord") != null)
            graceChord = true;
        var graceVoiceEntry: VoiceEntry = null;
        if (!graceChord) {
            graceVoiceEntry = new VoiceEntry(new Fraction(new Fraction(0, 1)), this.currentVoiceEntry.ParentVoice,
                this.currentStaffEntry);
            if (this.currentVoiceEntry.GraceVoiceEntriesBefore == null)
                this.currentVoiceEntry.GraceVoiceEntriesBefore = new List<VoiceEntry>();
            this.currentVoiceEntry.GraceVoiceEntriesBefore.push(graceVoiceEntry);
        }
        else {
            if (this.currentVoiceEntry.GraceVoiceEntriesBefore != null && this.currentVoiceEntry.GraceVoiceEntriesBefore.length > 0)
                graceVoiceEntry = this.currentVoiceEntry.GraceVoiceEntriesBefore.Last();
        }
        if (graceVoiceEntry != null) {
            graceVoiceEntry.Notes.push(note);
            note.ParentVoiceEntry = graceVoiceEntry;
        }
    }
    private addTuplet(node: IXmlElement, tupletNodeList: IXmlElement[]): number {
        if (tupletNodeList != null && tupletNodeList.length() > 1) {
            var timeModNode: IXmlElement = node.Element("time-modification");
            if (timeModNode != null)
                timeModNode = timeModNode.Element("actual-notes");
            var tupletNodeListArr: IXmlElement[] = tupletNodeList.ToArray();
            for (var idx: number = 0, len = tupletNodeListArr.length; idx < len; ++idx) {
                var tupletNode: IXmlElement = tupletNodeListArr[idx];
                if (tupletNode != null && tupletNode.Attributes().Any()) {
                    var type: string = tupletNode.Attribute("type").Value;
                    if (type == "start") {
                        var tupletNumber: number = 1;
                        if (tupletNode.Attribute("nummber") != null)
                            tupletNumber = StringToNumberConverter.ToInteger(tupletNode.Attribute("number").Value);
                        var tupletLabelNumber: number = 0;
                        if (timeModNode != null) {
                            try {
                                tupletLabelNumber = StringToNumberConverter.ToInteger(timeModNode.Value);
                            }
                            catch (e) {
                                var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/TupletNoteDurationError",
                                    "Invalid tuplet note duration.");
                                this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                                throw new MusicSheetReadingException("", e, 0);
                            }

                        }
                        var tuplet: Tuplet = new Tuplet(tupletLabelNumber);
                        if (this.tupletDict.ContainsKey(tupletNumber)) {
                            this.tupletDict.Remove(tupletNumber);
                            if (this.tupletDict.length == 0)
                                this.openTupletNumber = 0;
                            else if (this.tupletDict.length > 1)
                                this.openTupletNumber--;
                        }
                        this.tupletDict.push(tupletNumber, tuplet);
                        var subnotelist: List<Note> = new List<Note>();
                        subnotelist.push(this.currentNote);
                        tuplet.Notes.push(subnotelist);
                        tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                        this.currentNote.NoteTuplet = tuplet;
                        this.openTupletNumber = tupletNumber;
                    }
                    else if (type == "stop") {
                        var tupletNumber: number = 1;
                        if (tupletNode.Attribute("nummber") != null)
                            tupletNumber = StringToNumberConverter.ToInteger(tupletNode.Attribute("number").Value);
                        if (this.tupletDict.ContainsKey(tupletNumber)) {
                            var tuplet: Tuplet = this.tupletDict[tupletNumber];
                            var subnotelist: List<Note> = new List<Note>();
                            subnotelist.push(this.currentNote);
                            tuplet.Notes.push(subnotelist);
                            tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                            this.currentNote.NoteTuplet = tuplet;
                            this.tupletDict.Remove(tupletNumber);
                            if (this.tupletDict.length == 0)
                                this.openTupletNumber = 0;
                            else if (this.tupletDict.length > 1)
                                this.openTupletNumber--;
                        }
                    }
                }
            }
        }
        else if (tupletNodeList.First() != null) {
            var n: IXmlElement = tupletNodeList.First();
            if (n.HasAttributes) {
                var type: string = n.Attribute("type").Value;
                var tupletnumber: number = 1;
                var noTupletNumbering: boolean = false;
                try {
                    if (n.Attribute("number") != null)
                        tupletnumber = StringToNumberConverter.ToInteger(n.Attribute("number").Value);
                }
                catch (err) {
                    noTupletNumbering = true;
                }

                if (type == "start") {
                    var tupletLabelNumber: number = 0;
                    var timeModNode: IXmlElement = node.Element("time-modification");
                    if (timeModNode != null)
                        timeModNode = timeModNode.Element("actual-notes");
                    if (timeModNode != null) {
                        try {
                            tupletLabelNumber = StringToNumberConverter.ToInteger(timeModNode.Value);
                        }
                        catch (e) {
                            var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/TupletNoteDurationError",
                                "Invalid tuplet note duration.");
                            this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                            throw new MusicSheetReadingException("", e, 0);
                        }

                    }
                    if (noTupletNumbering) {
                        this.openTupletNumber++;
                        tupletnumber = this.openTupletNumber;
                    }
                    var tuplet: Tuplet;
                    if (this.tupletDict.ContainsKey(tupletnumber)) {
                        tuplet = this.tupletDict[tupletnumber];
                    }
                    else {
                        tuplet = new Tuplet(tupletLabelNumber);
                        this.tupletDict.push(tupletnumber, tuplet);
                    }
                    var subnotelist: List<Note> = new List<Note>();
                    subnotelist.push(this.currentNote);
                    tuplet.Notes.push(subnotelist);
                    tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                    this.currentNote.NoteTuplet = tuplet;
                    this.openTupletNumber = tupletnumber;
                }
                else if (type == "stop") {
                    if (noTupletNumbering)
                        tupletnumber = this.openTupletNumber;
                    if (this.tupletDict.ContainsKey(tupletnumber)) {
                        var tuplet: Tuplet = this.tupletDict[this.openTupletNumber];
                        var subnotelist: List<Note> = new List<Note>();
                        subnotelist.push(this.currentNote);
                        tuplet.Notes.push(subnotelist);
                        tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                        this.currentNote.NoteTuplet = tuplet;
                        if (this.tupletDict.length == 0)
                            this.openTupletNumber = 0;
                        else if (this.tupletDict.length > 1)
                            this.openTupletNumber--;
                        this.tupletDict.Remove(tupletnumber);
                    }
                }
            }
        }
        return this.openTupletNumber;
    }
    private handleTimeModificationNode(noteNode: IXmlElement): void {
        if (this.tupletDict.length != 0) {
            try {
                var tuplet: Tuplet = this.tupletDict[this.openTupletNumber];
                var notes: List<Note> = tuplet.Notes.Last();
                var lastTupletVoiceEntry: VoiceEntry = notes[0].ParentVoiceEntry;
                var noteList: List<Note>;
                if (lastTupletVoiceEntry.Timestamp == this.currentVoiceEntry.Timestamp)
                    noteList = notes;
                else {
                    noteList = new List<Note>();
                    tuplet.Notes.push(noteList);
                    tuplet.Fractions.push(this.getTupletNoteDurationFromType(noteNode));
                }
                noteList.push(this.currentNote);
                this.currentNote.NoteTuplet = tuplet;
            }
            catch (ex) {
                var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/TupletNumberError",
                    "Invalid tuplet number.");
                this.musicSheet.SheetErrors.AddErrorMessageInTempList(errorMsg);
                throw ex;
            }

        }
        else if (this.currentVoiceEntry.Notes.length > 0) {
            var firstNote: Note = this.currentVoiceEntry.Notes[0];
            if (firstNote.NoteTuplet != null) {
                var tuplet: Tuplet = firstNote.NoteTuplet;
                var notes: List<Note> = tuplet.Notes.Last();
                notes.push(this.currentNote);
                this.currentNote.NoteTuplet = tuplet;
            }
        }
    }
    private addTie(tieNodeList: IXmlElement[], measureStartAbsoluteTimestamp: Fraction, maxTieNoteFraction: Fraction): void {
        if (tieNodeList != null) {
            if (tieNodeList.length() == 1) {
                var tieNode: IXmlElement = tieNodeList.First();
                if (tieNode != null && tieNode.Attributes().Any()) {
                    var type: string = tieNode.Attribute("type").Value;
                    try {
                        if (type == "start") {
                            var number: number = this.findCurrentNoteInTieDict(this.currentNote);
                            if (number < 0)
                                this.openTieDict.Remove(number);
                            var newTieNumber: number = this.getNextAvailableNumberForTie();
                            var tie: Tie = new Tie(this.currentNote);
                            this.openTieDict.push(newTieNumber, tie);
                            if (this.currentNote.NoteBeam != null)
                                if (this.currentNote.NoteBeam.Notes[0] == this.currentNote) {
                                    tie.BeamStartTimestamp = measureStartAbsoluteTimestamp + this.currentVoiceEntry.Timestamp;
                                }
                                else {
                                    for (var idx: number = 0, len = this.currentNote.NoteBeam.Notes.length; idx < len; ++idx) {
                                        var note: Note = this.currentNote.NoteBeam.Notes[idx];
                                        if (note.NoteTie != null && note.NoteTie != tie && note.NoteTie.BeamStartTimestamp != null) {
                                            tie.BeamStartTimestamp = note.NoteTie.BeamStartTimestamp;
                                            break;
                                        }
                                    }
                                    if (this.currentNote == this.currentNote.NoteBeam.Notes.Last())
                                        tie.BeamStartTimestamp = measureStartAbsoluteTimestamp + this.currentVoiceEntry.Timestamp;
                                }
                        }
                        else if (type == "stop") {
                            var tieNumber: number = this.findCurrentNoteInTieDict(this.currentNote);
                            var tie: Tie = this.openTieDict[tieNumber];
                            if (tie !== undefined) {
                                var tieStartNote: Note = tie.Start;
                                tieStartNote.NoteTie = tie;
                                tieStartNote.Length.Add(this.currentNote.Length);
                                tie.Fractions.push(this.currentNote.Length);
                                if (maxTieNoteFraction < this.currentStaffEntry.Timestamp + this.currentNote.Length)
                                    maxTieNoteFraction = this.currentStaffEntry.Timestamp + this.currentNote.Length;
                                this.currentVoiceEntry.Notes.Remove(this.currentNote);
                                if (this.currentVoiceEntry.Articulations.length == 1 && this.currentVoiceEntry.Articulations[0] == ArticulationEnum.fermata && !tieStartNote.ParentVoiceEntry.Articulations.Contains(ArticulationEnum.fermata))
                                    tieStartNote.ParentVoiceEntry.Articulations.push(ArticulationEnum.fermata);
                                if (this.currentNote.NoteBeam != null) {
                                    var noteBeamIndex: number = this.currentNote.NoteBeam.Notes.indexOf(this.currentNote);
                                    if (noteBeamIndex == 0 && tie.BeamStartTimestamp == null)
                                        tie.BeamStartTimestamp = measureStartAbsoluteTimestamp + this.currentVoiceEntry.Timestamp;
                                    var noteBeam: Beam = this.currentNote.NoteBeam;
                                    noteBeam.Notes[noteBeamIndex] = tieStartNote;
                                    tie.TieBeam = noteBeam;
                                }
                                if (this.currentNote.NoteTuplet != null) {
                                    var noteTupletIndex: number = this.currentNote.NoteTuplet.getNoteIndex(this.currentNote);
                                    var index: number = this.currentNote.NoteTuplet.Notes[noteTupletIndex].indexOf(this.currentNote);
                                    var noteTuplet: Tuplet = this.currentNote.NoteTuplet;
                                    noteTuplet.Notes[noteTupletIndex][index] = tieStartNote;
                                    tie.TieTuplet = noteTuplet;
                                }
                                for (var idx: number = 0, len = this.currentNote.NoteSlurs.length; idx < len; ++idx) {
                                    var slur: Slur = this.currentNote.NoteSlurs[idx];
                                    if (slur.StartNote == this.currentNote) {
                                        slur.StartNote = tie.Start;
                                        slur.StartNote.NoteSlurs.push(slur);
                                    }
                                    if (slur.EndNote == this.currentNote) {
                                        slur.EndNote = tie.Start;
                                        slur.EndNote.NoteSlurs.push(slur);
                                    }
                                }
                                //var lyricsEntriesArr: KeyValuePair<number, LyricsEntry>[] = this.currentVoiceEntry.LyricsEntries.ToArray();
                                for (let lyricsEntry in this.currentVoiceEntry.LyricsEntries) {
                                    let val: LyricsEntry = this.currentVoiceEntry.LyricsEntries[lyricsEntry];
                                    if (!tieStartNote.ParentVoiceEntry.LyricsEntries[lyricsEntry] === undefined) {
                                        tieStartNote.ParentVoiceEntry.LyricsEntries[lyricsEntry] = val;
                                        val.Parent = tieStartNote.ParentVoiceEntry;
                                    }
                                }
                                this.openTieDict.Remove(tieNumber);
                            }
                        }
                    }
                    catch (err) {
                        var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/TieError", "Error while reading tie.");
                        this.musicSheet.SheetErrors.pushTemp(errorMsg);
                    }

                }
            }
            else if (tieNodeList.length() == 2) {
                var tieNumber: number = this.findCurrentNoteInTieDict(this.currentNote);
                if (tieNumber >= 0) {
                    var tie: Tie = this.openTieDict[tieNumber];
                    var tieStartNote: Note = tie.Start;
                    tieStartNote.Length.Add(this.currentNote.Length);
                    tie.Fractions.push(this.currentNote.Length);
                    if (this.currentNote.NoteBeam != null) {
                        var noteBeamIndex: number = this.currentNote.NoteBeam.Notes.indexOf(this.currentNote);
                        if (noteBeamIndex == 0 && tie.BeamStartTimestamp == null)
                            tie.BeamStartTimestamp = measureStartAbsoluteTimestamp + this.currentVoiceEntry.Timestamp;
                        var noteBeam: Beam = this.currentNote.NoteBeam;
                        noteBeam.Notes[noteBeamIndex] = tieStartNote;
                        tie.TieBeam = noteBeam;
                    }
                    for (var idx: number = 0, len = this.currentNote.NoteSlurs.length; idx < len; ++idx) {
                        var slur: Slur = this.currentNote.NoteSlurs[idx];
                        if (slur.StartNote == this.currentNote) {
                            slur.StartNote = tie.Start;
                            slur.StartNote.NoteSlurs.push(slur);
                        }
                        if (slur.EndNote == this.currentNote) {
                            slur.EndNote = tie.Start;
                            slur.EndNote.NoteSlurs.push(slur);
                        }
                    }
                    var lyricsEntries: KeyValuePair<number, LyricsEntry>[] = this.currentVoiceEntry.LyricsEntries.ToArray();
                    for (var idx: number = 0, len = lyricsEntries.length; idx < len; ++idx) {
                        var lyricsEntry: KeyValuePair<number, LyricsEntry> = lyricsEntries[idx];
                        if (!tieStartNote.ParentVoiceEntry.LyricsEntries.ContainsKey(lyricsEntry.Key)) {
                            tieStartNote.ParentVoiceEntry.LyricsEntries.push(lyricsEntry.Key, lyricsEntry.Value);
                            lyricsEntry.Value.Parent = tieStartNote.ParentVoiceEntry;
                        }
                    }
                    if (maxTieNoteFraction < this.currentStaffEntry.Timestamp + this.currentNote.Length)
                        maxTieNoteFraction = this.currentStaffEntry.Timestamp + this.currentNote.Length;
                    this.currentVoiceEntry.Notes.Remove(this.currentNote);
                }
            }
        }
    }
    private getNextAvailableNumberForTie(): number {
        var keys: number[] = this.openTieDict.keys();
        if (keys.length == 0)
            return 1;
        keys.Sort();
        for (var i: number = 0; i < keys.length; i++) {
            if (i + 1 != keys[i])
                return i + 1;
        }
        return keys[keys.length - 1] + 1;
    }
    private findCurrentNoteInTieDict(candidateNote: Note): number {
        var openTieDictArr: KeyValuePair<number, Tie>[] = this.openTieDict.ToArray();
        for (var idx: number = 0, len = openTieDictArr.length; idx < len; ++idx) {
            var keyValuePair: KeyValuePair<number, Tie> = openTieDictArr[idx];
            if (keyValuePair.Value.Start.Pitch.FundamentalNote == candidateNote.Pitch.FundamentalNote && keyValuePair.Value.Start.Pitch.Octave == candidateNote.Pitch.Octave) {
                return keyValuePair.Key;
            }
        }
        return -1;
    }
    private getTupletNoteDurationFromType(xmlNode: IXmlElement): Fraction {
        if (xmlNode.Element("type") != null) {
            var typeNode: IXmlElement = xmlNode.Element("type");
            if (typeNode != null) {
                var type: string = typeNode.Value;
                try {
                    return this.getNoteDurationFromType(type);
                }
                catch (e) {
                    var errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError", "Invalid note duration.");
                    this.musicSheet.SheetErrors.pushTemp(errorMsg);
                    throw new MusicSheetReadingException("", e);
                }

            }
        }
        return null;
    }
}