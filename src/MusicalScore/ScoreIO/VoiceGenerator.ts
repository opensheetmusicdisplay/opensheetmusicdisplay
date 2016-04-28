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
import {AccidentalEnum} from "../../Common/DataObjects/pitch";
import {NoteEnum} from "../../Common/DataObjects/pitch";
import {Staff} from "../VoiceData/Staff";
import {StaffEntryLink} from "../VoiceData/StaffEntryLink";
import {VerticalSourceStaffEntryContainer} from "../VoiceData/VerticalSourceStaffEntryContainer";
import {logging} from "../../Common/logging";
import {Pitch} from "../../Common/DataObjects/pitch";
import {IXmlAttribute} from "../../Common/FileIO/Xml";
import {CollectionUtil} from "../../Util/collectionUtil";

type SlurReader = any;

export class VoiceGenerator {
    constructor(instrument: Instrument, voiceId: number, slurReader: SlurReader, mainVoice: Voice = undefined) {
        this.musicSheet = instrument.GetMusicSheet;
        this.slurReader = slurReader;
        if (mainVoice !== undefined)
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
            // (*)
            //if (this.lyricsReader !== undefined && noteNode.Element("lyric") !== undefined) {
            //    this.lyricsReader.addLyricEntry(noteNode, this.currentVoiceEntry);
            //    this.voice.Parent.HasLyrics = true;
            //}
            let notationNode: IXmlElement = noteNode.Element("notations");
            if (notationNode !== undefined) {
                let articNode: IXmlElement = undefined;
                // (*)
                //if (this.articulationReader !== undefined) {
                //    this.readArticulations(notationNode, this.currentVoiceEntry);
                //}
                //let slurNodes: IXmlElement[] = undefined;
                // (*)
                //if (this.slurReader !== undefined && (slurNodes = notationNode.Elements("slur")))
                //    this.slurReader.addSlur(slurNodes, this.currentNote);
                let tupletNodeList: IXmlElement[] = undefined;
                if ((tupletNodeList = notationNode.Elements("tuplet")))
                    this.openTupletNumber = this.addTuplet(noteNode, tupletNodeList);
                if (notationNode.Element("arpeggiate") !== undefined && !graceNote)
                    this.currentVoiceEntry.ArpeggiosNotesIndices.push(this.currentVoiceEntry.Notes.indexOf(this.currentNote));
                let tiedNodeList: IXmlElement[] = undefined;
                if ((tiedNodeList = notationNode.Elements("tied")))
                    this.addTie(tiedNodeList, measureStartAbsoluteTimestamp, maxTieNoteFraction);

                let openTieDict: { [_: number]: Tie; } = this.openTieDict;
                for (let key in openTieDict) {
                    let tie: Tie = openTieDict[key];
                    if (Fraction.plus(tie.Start.ParentStaffEntry.Timestamp, tie.Start.Length).lt(this.currentStaffEntry.Timestamp))
                        delete openTieDict[key];
                }
            }
            if (noteNode.Element("time-modification") !== undefined && notationNode === undefined) {
                this.handleTimeModificationNode(noteNode);
            }
        }
        catch (err) {
            let errorMsg: string = ITextTranslation.translateText(
                "ReaderErrorMessages/NoteError", "Ignored erroneous Note."
            );
            this.musicSheet.SheetErrors.pushTemp(errorMsg);
        }

        return this.currentNote;
    }
    public checkForOpenGraceNotes(): void {
        if (this.currentStaffEntry !== undefined && this.currentStaffEntry.VoiceEntries.length === 0 && this.currentVoiceEntry.GraceVoiceEntriesBefore !== undefined && this.currentVoiceEntry.GraceVoiceEntriesBefore.length > 0) {
            let voice: Voice = this.currentVoiceEntry.ParentVoice;
            let horizontalIndex: number = this.currentMeasure.VerticalSourceStaffEntryContainers.indexOf(this.currentStaffEntry.VerticalContainerParent);
            let verticalIndex: number = this.currentStaffEntry.VerticalContainerParent.StaffEntries.indexOf(this.currentStaffEntry);
            let previousStaffEntry: SourceStaffEntry = this.currentMeasure.getPreviousSourceStaffEntryFromIndex(verticalIndex, horizontalIndex);
            if (previousStaffEntry !== undefined) {
                let previousVoiceEntry: VoiceEntry = undefined;
                for (let idx: number = 0, len = previousStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                    let voiceEntry: VoiceEntry = previousStaffEntry.VoiceEntries[idx];
                    if (voiceEntry.ParentVoice === voice) {
                        previousVoiceEntry = voiceEntry;
                        previousVoiceEntry.GraceVoiceEntriesAfter = [];
                        for (let idx2: number = 0, len2 = this.currentVoiceEntry.GraceVoiceEntriesBefore.length; idx2 < len2; ++idx2) {
                            let graceVoiceEntry: VoiceEntry = this.currentVoiceEntry.GraceVoiceEntriesBefore[idx2];
                            previousVoiceEntry.GraceVoiceEntriesAfter.push(graceVoiceEntry);
                        }
                        this.currentVoiceEntry.GraceVoiceEntriesBefore = [];
                        this.currentStaffEntry = undefined;
                        break;
                    }
                }
            }
        }
    }
    public checkForStaffEntryLink(index: number, currentStaff: Staff, currentStaffEntry: SourceStaffEntry,
        currentMeasure: SourceMeasure): SourceStaffEntry {
        let staffEntryLink: StaffEntryLink = new StaffEntryLink(this.currentVoiceEntry);
        staffEntryLink.LinkStaffEntries.push(currentStaffEntry);
        currentStaffEntry.Link = staffEntryLink;
        let linkMusicTimestamp: Fraction = this.currentVoiceEntry.Timestamp.clone();
        let verticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = currentMeasure.getVerticalContainerByTimestamp(linkMusicTimestamp);
        currentStaffEntry = verticalSourceStaffEntryContainer[index];
        if (currentStaffEntry === undefined) {
            currentStaffEntry = new SourceStaffEntry(verticalSourceStaffEntryContainer, currentStaff);
            verticalSourceStaffEntryContainer[index] = currentStaffEntry;
        }
        currentStaffEntry.VoiceEntries.push(this.currentVoiceEntry);
        staffEntryLink.LinkStaffEntries.push(currentStaffEntry);
        currentStaffEntry.Link = staffEntryLink;
        return currentStaffEntry;
    }
    public checkForOpenBeam(): void {
        if (this.openBeam !== undefined && this.currentNote !== undefined)
            this.handleOpenBeam();
    }
    public checkOpenTies(): void {
        let openTieDict: {[key: number]: Tie} = this.openTieDict;
        for (let key in openTieDict) {
            let tie: Tie = openTieDict[key];
            if (Fraction.plus(tie.Start.ParentStaffEntry.Timestamp, tie.Start.Length).lt(tie.Start.ParentStaffEntry.VerticalContainerParent.ParentMeasure.Duration))
                delete openTieDict[key];
        }
    }
    public hasVoiceEntry(): boolean {
        return this.currentVoiceEntry !== undefined;
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
            default: {
                let errorMsg: string = ITextTranslation.translateText(
                    "ReaderErrorMessages/NoteDurationError", "Invalid note duration."
                );
                throw new MusicSheetReadingException(errorMsg);
            }
        }
    }
    // (*)
    //private readArticulations(notationNode: IXmlElement, currentVoiceEntry: VoiceEntry): void {
    //    let articNode: IXmlElement;
    //    if ((articNode = notationNode.Element("articulations")) !== undefined)
    //        this.articulationReader.addArticulationExpression(articNode, currentVoiceEntry);
    //    let fermaNode: IXmlElement = undefined;
    //    if ((fermaNode = notationNode.Element("fermata")) !== undefined)
    //        this.articulationReader.addFermata(fermaNode, currentVoiceEntry);
    //    let tecNode: IXmlElement = undefined;
    //    if ((tecNode = notationNode.Element("technical")) !== undefined)
    //        this.articulationReader.addTechnicalArticulations(tecNode, currentVoiceEntry);
    //    let ornaNode: IXmlElement = undefined;
    //    if ((ornaNode = notationNode.Element("ornaments")) !== undefined)
    //        this.articulationReader.addOrnament(ornaNode, currentVoiceEntry);
    //}
    private addSingleNote(node: IXmlElement, noteDuration: number, divisions: number, graceNote: boolean, chord: boolean,
        guitarPro: boolean): Note {
        let noteAlter: AccidentalEnum = AccidentalEnum.NONE;
        let noteStep: NoteEnum = NoteEnum.C;
        let noteOctave: number = 0;
        let playbackInstrumentId: string = undefined;
        let xmlnodeElementsArr: IXmlElement[] = node.Elements();
        for (let idx: number = 0, len = xmlnodeElementsArr.length; idx < len; ++idx) {
            let noteElement: IXmlElement = xmlnodeElementsArr[idx];
            try {
                if (noteElement.Name === "pitch") {
                    let noteElementsArr: IXmlElement[] = noteElement.Elements();
                    for (let idx2: number = 0, len2 = noteElementsArr.length; idx2 < len2; ++idx2) {
                        let pitchElement: IXmlElement = noteElementsArr[idx2];
                        try {
                            if (pitchElement.Name === "step") {
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
                                    let errorMsg: string = ITextTranslation.translateText(
                                        "ReaderErrorMessages/NotePitchError",
                                        "Invalid pitch while reading note."
                                    );
                                    this.musicSheet.SheetErrors.pushTemp(errorMsg);
                                    throw new MusicSheetReadingException("", e);
                                }

                            }
                            else if (pitchElement.Name === "alter") {
                                try {
                                    noteAlter = parseInt(pitchElement.Value);
                                }
                                catch (e) {
                                    let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteAlterationError",
                                        "Invalid alteration while reading note.");
                                    this.musicSheet.SheetErrors.pushTemp(errorMsg);
                                    throw new MusicSheetReadingException("", e);
                                }

                            }
                            else if (pitchElement.Name === "octave") {
                                try {
                                    noteOctave = parseInt(pitchElement.Value);
                                }
                                catch (e) {
                                    let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteOctaveError",
                                        "Invalid octave value while reading note.");
                                    this.musicSheet.SheetErrors.pushTemp(errorMsg);
                                    throw new MusicSheetReadingException("", e);
                                }

                            }
                        }
                        catch (ex) {
                            logging.log("VoiceGenerator.addSingleNote read Step: ", ex);
                        }

                    }
                }
                else if (noteElement.Name === "unpitched") {
                    let displayStep: IXmlElement = undefined;
                    if ((displayStep = noteElement.Element("display-step")) !== undefined) {
                        noteStep = NoteEnum[displayStep.Value.toUpperCase()];
                    }
                    let octave: IXmlElement = undefined;
                    if ((octave = noteElement.Element("display-octave")) !== undefined) {
                        noteOctave = parseInt(octave.Value);
                        if (guitarPro)
                            noteOctave += 1;
                    }
                }
                else if (noteElement.Name === "instrument") {
                    if (noteElement.FirstAttribute !== undefined)
                        playbackInstrumentId = noteElement.FirstAttribute.Value;
                }
            }
            catch (ex) {
                logging.log("VoiceGenerator.addSingleNote: ", ex);
            }

        }
        noteOctave -= Pitch.OctaveXmlDifference;
        let pitch: Pitch = new Pitch(noteStep, noteOctave, noteAlter);
        let noteLength: Fraction = new Fraction(noteDuration, divisions);
        let note: Note = new Note(this.currentVoiceEntry, this.currentStaffEntry, noteLength, pitch);
        note.PlaybackInstrumentId = playbackInstrumentId;
        if (!graceNote)
            this.currentVoiceEntry.Notes.push(note);
        else this.handleGraceNote(node, note);
        if (node.Elements("beam") && !chord) {
            this.createBeam(node, note, graceNote);
        }
        return note;
    }
    private addRestNote(noteDuration: number, divisions: number): Note {
        let restFraction: Fraction = new Fraction(noteDuration, divisions);
        let restNote: Note = new Note(this.currentVoiceEntry, this.currentStaffEntry, restFraction, undefined);
        this.currentVoiceEntry.Notes.push(restNote);
        if (this.openBeam !== undefined)
            this.openBeam.ExtendedNoteList.push(restNote);
        return restNote;
    }
    private createBeam(node: IXmlElement, note: Note, grace: boolean): void {
        try {
            let beamNode: IXmlElement = node.Element("beam");
            let beamAttr: IXmlAttribute = undefined;
            if (beamNode !== undefined && beamNode.HasAttributes)
                beamAttr = beamNode.Attribute("number");
            if (beamAttr !== undefined) {
                let beamNumber: number = parseInt(beamAttr.Value);
                let mainBeamNode: IXmlElement[] = node.Elements("beam");
                let currentBeamTag: string = mainBeamNode[0].Value;
                if (beamNumber === 1 && mainBeamNode !== undefined) {
                    if (currentBeamTag === "begin" && this.lastBeamTag !== currentBeamTag) {
                        if (grace) {
                            if (this.openGraceBeam !== undefined)
                                this.handleOpenBeam();
                            this.openGraceBeam = new Beam();
                        }
                        else {
                            if (this.openBeam !== undefined)
                                this.handleOpenBeam();
                            this.openBeam = new Beam();
                        }
                    }
                    this.lastBeamTag = currentBeamTag;
                }
                let sameVoiceEntry: boolean = false;
                if (grace) {
                    if (this.openGraceBeam === undefined)
                        return;
                    for (let idx: number = 0, len = this.openGraceBeam.Notes.length; idx < len; ++idx) {
                        let beamNote: Note = this.openGraceBeam.Notes[idx];
                        if (this.currentVoiceEntry === beamNote.ParentVoiceEntry)
                            sameVoiceEntry = true;
                    }
                    if (!sameVoiceEntry) {
                        this.openGraceBeam.addNoteToBeam(note);
                        if (currentBeamTag === "end" && beamNumber === 1)
                            this.openGraceBeam = undefined;
                    }
                }
                else {
                    if (this.openBeam === undefined)
                        return;
                    for (let idx: number = 0, len = this.openBeam.Notes.length; idx < len; ++idx) {
                        let beamNote: Note = this.openBeam.Notes[idx];
                        if (this.currentVoiceEntry === beamNote.ParentVoiceEntry)
                            sameVoiceEntry = true;
                    }
                    if (!sameVoiceEntry) {
                        this.openBeam.addNoteToBeam(note);
                        if (currentBeamTag === "end" && beamNumber === 1)
                            this.openBeam = undefined;
                    }
                }
            }
        }
        catch (e) {
            let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/BeamError",
                "Error while reading beam.");
            this.musicSheet.SheetErrors.pushTemp(errorMsg);
            throw new MusicSheetReadingException("", e);
        }

    }
    private handleOpenBeam(): void {
        if (this.openBeam.Notes.length === 1) {
            let beamNote: Note = this.openBeam.Notes[0];
            beamNote.NoteBeam = undefined;
            this.openBeam = undefined;
            return
        }
        if (this.currentNote === CollectionUtil.last(this.openBeam.Notes))
            this.openBeam = undefined;
        else {
            let beamLastNote: Note = CollectionUtil.last(this.openBeam.Notes);
            let beamLastNoteStaffEntry: SourceStaffEntry = beamLastNote.ParentStaffEntry;
            let horizontalIndex: number = this.currentMeasure.getVerticalContainerIndexByTimestamp(beamLastNoteStaffEntry.Timestamp);
            let verticalIndex: number = beamLastNoteStaffEntry.VerticalContainerParent.StaffEntries.indexOf(beamLastNoteStaffEntry);
            if (horizontalIndex < this.currentMeasure.VerticalSourceStaffEntryContainers.length - 1) {
                let nextStaffEntry: SourceStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[horizontalIndex + 1][verticalIndex];
                if (nextStaffEntry !== undefined) {
                    for (let idx: number = 0, len = nextStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                        let voiceEntry: VoiceEntry = nextStaffEntry.VoiceEntries[idx];
                        if (voiceEntry.ParentVoice === this.voice) {
                            let candidateNote: Note = voiceEntry.Notes[0];
                            if (candidateNote.Length <= new Fraction(1, 8)) {
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
    }
    private handleGraceNote(node: IXmlElement, note: Note): void {
        let graceChord: boolean = false;
        let type: string = "";
        if (node.Elements("type")) {
            let typeNode: IXmlElement[] = node.Elements("type");
            if (typeNode) {
                type = typeNode[0].Value;
                try {
                    note.Length = this.getNoteDurationFromType(type);
                    note.Length.Numerator = 1;
                }
                catch (e) {
                    let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError",
                        "Invalid note duration.");
                    this.musicSheet.SheetErrors.pushTemp(errorMsg);
                    throw new MusicSheetReadingException("", e);
                }

            }
        }
        let graceNode: IXmlElement = node.Element("grace");
        if (graceNode !== undefined && graceNode.Attributes()) {
            if (graceNode.Attribute("slash") !== undefined) {
                let slash: string = graceNode.Attribute("slash").Value;
                if (slash === "yes")
                    note.GraceNoteSlash = true;
            }
        }
        if (node.Element("chord") !== undefined)
            graceChord = true;
        let graceVoiceEntry: VoiceEntry = undefined;
        if (!graceChord) {
            graceVoiceEntry = new VoiceEntry(
                new Fraction(0, 1), this.currentVoiceEntry.ParentVoice, this.currentStaffEntry
            );
            if (this.currentVoiceEntry.GraceVoiceEntriesBefore === undefined)
                this.currentVoiceEntry.GraceVoiceEntriesBefore = [];
            this.currentVoiceEntry.GraceVoiceEntriesBefore.push(graceVoiceEntry);
        }
        else {
            if (this.currentVoiceEntry.GraceVoiceEntriesBefore !== undefined && this.currentVoiceEntry.GraceVoiceEntriesBefore.length > 0)
                graceVoiceEntry = CollectionUtil.last(this.currentVoiceEntry.GraceVoiceEntriesBefore);
        }
        if (graceVoiceEntry !== undefined) {
            graceVoiceEntry.Notes.push(note);
            note.ParentVoiceEntry = graceVoiceEntry;
        }
    }
    private addTuplet(node: IXmlElement, tupletNodeList: IXmlElement[]): number {
        if (tupletNodeList !== undefined && tupletNodeList.length > 1) {
            let timeModNode: IXmlElement = node.Element("time-modification");
            if (timeModNode !== undefined)
                timeModNode = timeModNode.Element("actual-notes");
            let tupletNodeListArr: IXmlElement[] = tupletNodeList;
            for (let idx: number = 0, len = tupletNodeListArr.length; idx < len; ++idx) {
                let tupletNode: IXmlElement = tupletNodeListArr[idx];
                if (tupletNode !== undefined && tupletNode.Attributes()) {
                    let type: string = tupletNode.Attribute("type").Value;
                    if (type === "start") {
                        let tupletNumber: number = 1;
                        if (tupletNode.Attribute("nummber") !== undefined)
                            tupletNumber = parseInt(tupletNode.Attribute("number").Value);
                        let tupletLabelNumber: number = 0;
                        if (timeModNode !== undefined) {
                            try {
                                tupletLabelNumber = parseInt(timeModNode.Value);
                            }
                            catch (e) {
                                let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/TupletNoteDurationError",
                                    "Invalid tuplet note duration.");
                                this.musicSheet.SheetErrors.pushTemp(errorMsg);
                                throw new MusicSheetReadingException("", e);
                            }

                        }
                        let tuplet: Tuplet = new Tuplet(tupletLabelNumber);
                        if (this.tupletDict[tupletNumber] !== undefined) {
                            delete this.tupletDict[tupletNumber];
                            if (Object.keys(this.tupletDict).length === 0)
                                this.openTupletNumber = 0;
                            else if (Object.keys(this.tupletDict).length > 1)
                                this.openTupletNumber--;
                        }
                        this.tupletDict[tupletNumber] = tuplet;
                        let subnotelist: Note[] = [];
                        subnotelist.push(this.currentNote);
                        tuplet.Notes.push(subnotelist);
                        tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                        this.currentNote.NoteTuplet = tuplet;
                        this.openTupletNumber = tupletNumber;
                    }
                    else if (type === "stop") {
                        let tupletNumber: number = 1;
                        if (tupletNode.Attribute("number") !== undefined)
                            tupletNumber = parseInt(tupletNode.Attribute("number").Value);
                        let tuplet: Tuplet = this.tupletDict[tupletNumber];
                        if (tuplet !== undefined) {
                            let subnotelist: Note[] = [];
                            subnotelist.push(this.currentNote);
                            tuplet.Notes.push(subnotelist);
                            tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                            this.currentNote.NoteTuplet = tuplet;
                            delete this.tupletDict[tupletNumber];
                            if (Object.keys(this.tupletDict).length === 0)
                                this.openTupletNumber = 0;
                            else if (Object.keys(this.tupletDict).length > 1)
                                this.openTupletNumber--;
                        }
                    }
                }
            }
        }
        else if (tupletNodeList[0] !== undefined) {
            let n: IXmlElement = tupletNodeList[0];
            if (n.HasAttributes) {
                let type: string = n.Attribute("type").Value;
                let tupletnumber: number = 1;
                let noTupletNumbering: boolean = false;
                try {
                    if (n.Attribute("number") !== undefined)
                        tupletnumber = parseInt(n.Attribute("number").Value);
                }
                catch (err) {
                    noTupletNumbering = true;
                }

                if (type === "start") {
                    let tupletLabelNumber: number = 0;
                    let timeModNode: IXmlElement = node.Element("time-modification");
                    if (timeModNode !== undefined)
                        timeModNode = timeModNode.Element("actual-notes");
                    if (timeModNode !== undefined) {
                        try {
                            tupletLabelNumber = parseInt(timeModNode.Value);
                        }
                        catch (e) {
                            let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/TupletNoteDurationError",
                                "Invalid tuplet note duration.");
                            this.musicSheet.SheetErrors.pushTemp(errorMsg);
                            throw new MusicSheetReadingException("", e);
                        }

                    }
                    if (noTupletNumbering) {
                        this.openTupletNumber++;
                        tupletnumber = this.openTupletNumber;
                    }
                    let tuplet: Tuplet = this.tupletDict[tupletnumber];
                    if (tuplet === undefined) {
                        tuplet = this.tupletDict[tupletnumber] = new Tuplet(tupletLabelNumber);
                    }
                    let subnotelist: Note[] = [];
                    subnotelist.push(this.currentNote);
                    tuplet.Notes.push(subnotelist);
                    tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                    this.currentNote.NoteTuplet = tuplet;
                    this.openTupletNumber = tupletnumber;
                }
                else if (type === "stop") {
                    if (noTupletNumbering)
                        tupletnumber = this.openTupletNumber;
                    let tuplet: Tuplet = this.tupletDict[this.openTupletNumber];
                    if (tuplet !== undefined) {
                        let subnotelist: Note[] = [];
                        subnotelist.push(this.currentNote);
                        tuplet.Notes.push(subnotelist);
                        tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                        this.currentNote.NoteTuplet = tuplet;
                        if (Object.keys(this.tupletDict).length === 0)
                            this.openTupletNumber = 0;
                        else if (Object.keys(this.tupletDict).length > 1)
                            this.openTupletNumber--;
                        delete this.tupletDict[tupletnumber];
                    }
                }
            }
        }
        return this.openTupletNumber;
    }
    private handleTimeModificationNode(noteNode: IXmlElement): void {
        if (Object.keys(this.tupletDict).length !== 0) {
            try {
                let tuplet: Tuplet = this.tupletDict[this.openTupletNumber];
                let notes: Note[] = CollectionUtil.last(tuplet.Notes);
                let lastTupletVoiceEntry: VoiceEntry = notes[0].ParentVoiceEntry;
                let noteList: Note[];
                if (lastTupletVoiceEntry.Timestamp === this.currentVoiceEntry.Timestamp)
                    noteList = notes;
                else {
                    noteList = [];
                    tuplet.Notes.push(noteList);
                    tuplet.Fractions.push(this.getTupletNoteDurationFromType(noteNode));
                }
                noteList.push(this.currentNote);
                this.currentNote.NoteTuplet = tuplet;
            }
            catch (ex) {
                let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/TupletNumberError",
                    "Invalid tuplet number.");
                this.musicSheet.SheetErrors.pushTemp(errorMsg);
                throw ex;
            }

        }
        else if (this.currentVoiceEntry.Notes.length > 0) {
            let firstNote: Note = this.currentVoiceEntry.Notes[0];
            if (firstNote.NoteTuplet !== undefined) {
                let tuplet: Tuplet = firstNote.NoteTuplet;
                let notes: Note[] = CollectionUtil.last(tuplet.Notes);
                notes.push(this.currentNote);
                this.currentNote.NoteTuplet = tuplet;
            }
        }
    }
    private addTie(tieNodeList: IXmlElement[], measureStartAbsoluteTimestamp: Fraction, maxTieNoteFraction: Fraction): void {
        if (tieNodeList !== undefined) {
            if (tieNodeList.length === 1) {
                let tieNode: IXmlElement = tieNodeList[0];
                if (tieNode !== undefined && tieNode.Attributes()) {
                    let type: string = tieNode.Attribute("type").Value;
                    try {
                        if (type === "start") {
                            let number: number = this.findCurrentNoteInTieDict(this.currentNote);
                            if (number < 0)
                                delete this.openTieDict[number];
                            let newTieNumber: number = this.getNextAvailableNumberForTie();
                            let tie: Tie = new Tie(this.currentNote);
                            this.openTieDict[newTieNumber] = tie;
                            if (this.currentNote.NoteBeam !== undefined)
                                if (this.currentNote.NoteBeam.Notes[0] === this.currentNote) {
                                    tie.BeamStartTimestamp = Fraction.plus(measureStartAbsoluteTimestamp, this.currentVoiceEntry.Timestamp);
                                }
                                else {
                                    for (let idx: number = 0, len = this.currentNote.NoteBeam.Notes.length; idx < len; ++idx) {
                                        let note: Note = this.currentNote.NoteBeam.Notes[idx];
                                        if (note.NoteTie !== undefined && note.NoteTie !== tie && note.NoteTie.BeamStartTimestamp !== undefined) {
                                            tie.BeamStartTimestamp = note.NoteTie.BeamStartTimestamp;
                                            break;
                                        }
                                    }
                                    if (this.currentNote === CollectionUtil.last(this.currentNote.NoteBeam.Notes))
                                        tie.BeamStartTimestamp = Fraction.plus(measureStartAbsoluteTimestamp, this.currentVoiceEntry.Timestamp);
                                }
                        }
                        else if (type === "stop") {
                            let tieNumber: number = this.findCurrentNoteInTieDict(this.currentNote);
                            let tie: Tie = this.openTieDict[tieNumber];
                            if (tie !== undefined) {
                                let tieStartNote: Note = tie.Start;
                                tieStartNote.NoteTie = tie;
                                tieStartNote.Length.Add(this.currentNote.Length);
                                tie.Fractions.push(this.currentNote.Length);
                                if (maxTieNoteFraction.lt(Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length)))
                                    maxTieNoteFraction = Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length);
                                let i: number = this.currentVoiceEntry.Notes.indexOf(this.currentNote);
                                if (i !== -1) delete this.currentVoiceEntry.Notes[i];
                                if (this.currentVoiceEntry.Articulations.length === 1 && this.currentVoiceEntry.Articulations[0] === ArticulationEnum.fermata && tieStartNote.ParentVoiceEntry.Articulations[ArticulationEnum.fermata] === undefined)
                                    tieStartNote.ParentVoiceEntry.Articulations.push(ArticulationEnum.fermata);
                                if (this.currentNote.NoteBeam !== undefined) {
                                    let noteBeamIndex: number = this.currentNote.NoteBeam.Notes.indexOf(this.currentNote);
                                    if (noteBeamIndex === 0 && tie.BeamStartTimestamp === undefined)
                                        tie.BeamStartTimestamp = Fraction.plus(measureStartAbsoluteTimestamp, this.currentVoiceEntry.Timestamp);
                                    let noteBeam: Beam = this.currentNote.NoteBeam;
                                    noteBeam.Notes[noteBeamIndex] = tieStartNote;
                                    tie.TieBeam = noteBeam;
                                }
                                if (this.currentNote.NoteTuplet !== undefined) {
                                    let noteTupletIndex: number = this.currentNote.NoteTuplet.getNoteIndex(this.currentNote);
                                    let index: number = this.currentNote.NoteTuplet.Notes[noteTupletIndex].indexOf(this.currentNote);
                                    let noteTuplet: Tuplet = this.currentNote.NoteTuplet;
                                    noteTuplet.Notes[noteTupletIndex][index] = tieStartNote;
                                    tie.TieTuplet = noteTuplet;
                                }
                                for (let idx: number = 0, len = this.currentNote.NoteSlurs.length; idx < len; ++idx) {
                                    let slur: Slur = this.currentNote.NoteSlurs[idx];
                                    if (slur.StartNote === this.currentNote) {
                                        slur.StartNote = tie.Start;
                                        slur.StartNote.NoteSlurs.push(slur);
                                    }
                                    if (slur.EndNote === this.currentNote) {
                                        slur.EndNote = tie.Start;
                                        slur.EndNote.NoteSlurs.push(slur);
                                    }
                                }
                                //let lyricsEntriesArr: KeyValuePair<number, LyricsEntry>[] = this.currentVoiceEntry.LyricsEntries.ToArray();
                                for (let lyricsEntry in this.currentVoiceEntry.LyricsEntries) {
                                    let val: LyricsEntry = this.currentVoiceEntry.LyricsEntries[lyricsEntry];
                                    if (!tieStartNote.ParentVoiceEntry.LyricsEntries[lyricsEntry] === undefined) {
                                        tieStartNote.ParentVoiceEntry.LyricsEntries[lyricsEntry] = val;
                                        val.Parent = tieStartNote.ParentVoiceEntry;
                                    }
                                }
                                delete this.openTieDict[tieNumber];
                            }
                        }
                    }
                    catch (err) {
                        let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/TieError", "Error while reading tie.");
                        this.musicSheet.SheetErrors.pushTemp(errorMsg);
                    }

                }
            }
            else if (tieNodeList.length === 2) {
                let tieNumber: number = this.findCurrentNoteInTieDict(this.currentNote);
                if (tieNumber >= 0) {
                    let tie: Tie = this.openTieDict[tieNumber];
                    let tieStartNote: Note = tie.Start;
                    tieStartNote.Length.Add(this.currentNote.Length);
                    tie.Fractions.push(this.currentNote.Length);
                    if (this.currentNote.NoteBeam !== undefined) {
                        let noteBeamIndex: number = this.currentNote.NoteBeam.Notes.indexOf(this.currentNote);
                        if (noteBeamIndex === 0 && tie.BeamStartTimestamp === undefined)
                            tie.BeamStartTimestamp = Fraction.plus(measureStartAbsoluteTimestamp, this.currentVoiceEntry.Timestamp);
                        let noteBeam: Beam = this.currentNote.NoteBeam;
                        noteBeam.Notes[noteBeamIndex] = tieStartNote;
                        tie.TieBeam = noteBeam;
                    }
                    for (let idx: number = 0, len = this.currentNote.NoteSlurs.length; idx < len; ++idx) {
                        let slur: Slur = this.currentNote.NoteSlurs[idx];
                        if (slur.StartNote === this.currentNote) {
                            slur.StartNote = tie.Start;
                            slur.StartNote.NoteSlurs.push(slur);
                        }
                        if (slur.EndNote === this.currentNote) {
                            slur.EndNote = tie.Start;
                            slur.EndNote.NoteSlurs.push(slur);
                        }
                    }
                    let lyricsEntries: { [_: number]: LyricsEntry; } = this.currentVoiceEntry.LyricsEntries;
                    for (let key in lyricsEntries) {
                        let lyricsEntry: LyricsEntry = lyricsEntries[key];
                        if (tieStartNote.ParentVoiceEntry.LyricsEntries[key] === undefined) {
                            tieStartNote.ParentVoiceEntry.LyricsEntries[key] = lyricsEntry;
                            lyricsEntry.Parent = tieStartNote.ParentVoiceEntry;
                        }
                    }
                    if (maxTieNoteFraction.lt(Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length)))
                        maxTieNoteFraction = Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length);
                    // delete currentNote from Notes:
                    let i: number = this.currentVoiceEntry.Notes.indexOf(this.currentNote);
                    if (i !== -1) delete this.currentVoiceEntry.Notes[i];
                }
            }
        }
    }
    private getNextAvailableNumberForTie(): number {
        let keys: string[] = Object.keys(this.openTieDict);
        if (keys.length === 0)
            return 1;
        keys.sort((a, b) => (+a - +b)); // FIXME Andrea: test
        for (let i: number = 0; i < keys.length; i++) {
            if ("" + (i + 1) !== keys[i])
                return i + 1;
        }
        return +(keys[keys.length - 1]) + 1;
    }
    private findCurrentNoteInTieDict(candidateNote: Note): number {
        let openTieDict: { [_: number]: Tie; } = this.openTieDict;
        for (let key in openTieDict) {
            let tie: Tie = openTieDict[key];
            if (tie.Start.Pitch.FundamentalNote === candidateNote.Pitch.FundamentalNote && tie.Start.Pitch.Octave === candidateNote.Pitch.Octave) {
                return +key;
            }
        }
        return -1;
    }
    private getTupletNoteDurationFromType(xmlNode: IXmlElement): Fraction {
        if (xmlNode.Element("type") !== undefined) {
            let typeNode: IXmlElement = xmlNode.Element("type");
            if (typeNode !== undefined) {
                let type: string = typeNode.Value;
                try {
                    return this.getNoteDurationFromType(type);
                }
                catch (e) {
                    let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError", "Invalid note duration.");
                    this.musicSheet.SheetErrors.pushTemp(errorMsg);
                    throw new MusicSheetReadingException("", e);
                }

            }
        }
        return undefined;
    }
}