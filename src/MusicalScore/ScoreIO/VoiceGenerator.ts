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
import {Fraction} from "../../Common/DataObjects/Fraction";
//import {MusicSymbolModuleFactory} from "./InstrumentReader";
import {IXmlElement} from "../../Common/FileIO/Xml";
import {ITextTranslation} from "../Interfaces/ITextTranslation";
import {ArticulationEnum} from "../VoiceData/VoiceEntry";
import {Slur} from "../VoiceData/Expressions/ContinuousExpressions/Slur";
import {LyricsEntry} from "../VoiceData/Lyrics/LyricsEntry";
import {MusicSheetReadingException} from "../Exceptions";
import {AccidentalEnum} from "../../Common/DataObjects/Pitch";
import {NoteEnum} from "../../Common/DataObjects/Pitch";
import {Staff} from "../VoiceData/Staff";
import {StaffEntryLink} from "../VoiceData/StaffEntryLink";
import {VerticalSourceStaffEntryContainer} from "../VoiceData/VerticalSourceStaffEntryContainer";
import {Logging} from "../../Common/Logging";
import {Pitch} from "../../Common/DataObjects/Pitch";
import {IXmlAttribute} from "../../Common/FileIO/Xml";
import {CollectionUtil} from "../../Util/CollectionUtil";
import Dictionary from "typescript-collections/dist/lib/Dictionary";

/**
 * To be implemented
 */
export type SlurReader = any;

export class VoiceGenerator {
    constructor(instrument: Instrument, voiceId: number, slurReader: SlurReader, mainVoice: Voice = undefined) {
        this.musicSheet = instrument.GetMusicSheet;
        this.slurReader = slurReader;
        if (mainVoice !== undefined) {
            this.voice = new LinkedVoice(instrument, voiceId, mainVoice);
        } else {
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

    /**
     * Create new [[VoiceEntry]], add it to given [[SourceStaffEntry]] and if given so, to [[Voice]].
     * @param musicTimestamp
     * @param parentStaffEntry
     * @param addToVoice
     */
    public createVoiceEntry(musicTimestamp: Fraction, parentStaffEntry: SourceStaffEntry, addToVoice: boolean): void {
        this.currentVoiceEntry = new VoiceEntry(musicTimestamp.clone(), this.voice, parentStaffEntry);
        if (addToVoice) {
            this.voice.VoiceEntries.push(this.currentVoiceEntry);
        }
        if (parentStaffEntry.VoiceEntries.indexOf(this.currentVoiceEntry) === -1) {
            parentStaffEntry.VoiceEntries.push(this.currentVoiceEntry);
        }
    }

    /**
     * Create [[Note]]s and handle Lyrics, Articulations, Beams, Ties, Slurs, Tuplets.
     * @param noteNode
     * @param noteDuration
     * @param divisions
     * @param restNote
     * @param graceNote
     * @param parentStaffEntry
     * @param parentMeasure
     * @param measureStartAbsoluteTimestamp
     * @param maxTieNoteFraction
     * @param chord
     * @param guitarPro
     * @returns {Note}
     */
    public read(
        noteNode: IXmlElement, noteDuration: number, divisions: number, restNote: boolean, graceNote: boolean,
        parentStaffEntry: SourceStaffEntry, parentMeasure: SourceMeasure,
        measureStartAbsoluteTimestamp: Fraction, maxTieNoteFraction: Fraction, chord: boolean, guitarPro: boolean
    ): Note {
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
            let notationNode: IXmlElement = noteNode.element("notations");
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
                let tupletNodeList: IXmlElement[] = notationNode.elements("tuplet");
                if (tupletNodeList) {
                    this.openTupletNumber = this.addTuplet(noteNode, tupletNodeList);
                }
                if (notationNode.element("arpeggiate") !== undefined && !graceNote) {
                    this.currentVoiceEntry.ArpeggiosNotesIndices.push(this.currentVoiceEntry.Notes.indexOf(this.currentNote));
                }
                let tiedNodeList: IXmlElement[] = notationNode.elements("tied");
                if (tiedNodeList) {
                    this.addTie(tiedNodeList, measureStartAbsoluteTimestamp, maxTieNoteFraction);
                }

                let openTieDict: { [_: number]: Tie; } = this.openTieDict;
                for (let key in openTieDict) {
                    if (openTieDict.hasOwnProperty(key)) {
                        let tie: Tie = openTieDict[key];
                        if (Fraction.plus(tie.Start.ParentStaffEntry.Timestamp, tie.Start.Length).lt(this.currentStaffEntry.Timestamp)) {
                            delete openTieDict[key];
                        }
                    }
                }
            }
            if (noteNode.element("time-modification") !== undefined && notationNode === undefined) {
                this.handleTimeModificationNode(noteNode);
            }
        } catch (err) {
            let errorMsg: string = ITextTranslation.translateText(
                "ReaderErrorMessages/NoteError", "Ignored erroneous Note."
            );
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
        }

        return this.currentNote;
    }

    /**
     * Handle the GraceNotes that appear before the Measure's End
     * and aren't assigned to any normal (with [[VoiceEntries]]) [[SourceStaffEntry]]s yet.
     */
    public checkForOpenGraceNotes(): void {
        if (
            this.currentStaffEntry !== undefined
            && this.currentStaffEntry.VoiceEntries.length === 0
            && this.currentVoiceEntry.graceVoiceEntriesBefore !== undefined
            && this.currentVoiceEntry.graceVoiceEntriesBefore.length > 0
        ) {
            let voice: Voice = this.currentVoiceEntry.ParentVoice;
            let horizontalIndex: number = this.currentMeasure.VerticalSourceStaffEntryContainers.indexOf(this.currentStaffEntry.VerticalContainerParent);
            let verticalIndex: number = this.currentStaffEntry.VerticalContainerParent.StaffEntries.indexOf(this.currentStaffEntry);
            let previousStaffEntry: SourceStaffEntry = this.currentMeasure.getPreviousSourceStaffEntryFromIndex(verticalIndex, horizontalIndex);
            if (previousStaffEntry !== undefined) {
                let previousVoiceEntry: VoiceEntry = undefined;
                for (let idx: number = 0, len: number = previousStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                    let voiceEntry: VoiceEntry = previousStaffEntry.VoiceEntries[idx];
                    if (voiceEntry.ParentVoice === voice) {
                        previousVoiceEntry = voiceEntry;
                        previousVoiceEntry.graceVoiceEntriesAfter = [];
                        for (let idx2: number = 0, len2: number = this.currentVoiceEntry.graceVoiceEntriesBefore.length; idx2 < len2; ++idx2) {
                            let graceVoiceEntry: VoiceEntry = this.currentVoiceEntry.graceVoiceEntriesBefore[idx2];
                            previousVoiceEntry.graceVoiceEntriesAfter.push(graceVoiceEntry);
                        }
                        this.currentVoiceEntry.graceVoiceEntriesBefore = [];
                        this.currentStaffEntry = undefined;
                        break;
                    }
                }
            }
        }
    }

    /**
     * Create a new [[StaffEntryLink]] and sets the currenstStaffEntry accordingly.
     * @param index
     * @param currentStaff
     * @param currentStaffEntry
     * @param currentMeasure
     * @returns {SourceStaffEntry}
     */
    public checkForStaffEntryLink(
        index: number, currentStaff: Staff, currentStaffEntry: SourceStaffEntry, currentMeasure: SourceMeasure
    ): SourceStaffEntry {
        let staffEntryLink: StaffEntryLink = new StaffEntryLink(this.currentVoiceEntry);
        staffEntryLink.LinkStaffEntries.push(currentStaffEntry);
        currentStaffEntry.Link = staffEntryLink;
        let linkMusicTimestamp: Fraction = this.currentVoiceEntry.Timestamp.clone();
        let verticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = currentMeasure.getVerticalContainerByTimestamp(linkMusicTimestamp);
        currentStaffEntry = verticalSourceStaffEntryContainer.StaffEntries[index];
        if (currentStaffEntry === undefined) {
            currentStaffEntry = new SourceStaffEntry(verticalSourceStaffEntryContainer, currentStaff);
            verticalSourceStaffEntryContainer.StaffEntries[index] = currentStaffEntry;
        }
        currentStaffEntry.VoiceEntries.push(this.currentVoiceEntry);
        staffEntryLink.LinkStaffEntries.push(currentStaffEntry);
        currentStaffEntry.Link = staffEntryLink;
        return currentStaffEntry;
    }
    public checkForOpenBeam(): void {
        if (this.openBeam !== undefined && this.currentNote !== undefined) {
            this.handleOpenBeam();
        }
    }
    public checkOpenTies(): void {
        let openTieDict: {[key: number]: Tie} = this.openTieDict;
        for (let key in openTieDict) {
            if (openTieDict.hasOwnProperty(key)) {
                let tie: Tie = openTieDict[key];
                if (Fraction.plus(tie.Start.ParentStaffEntry.Timestamp, tie.Start.Length)
                        .lt(tie.Start.ParentStaffEntry.VerticalContainerParent.ParentMeasure.Duration)) {
                    delete openTieDict[key];
                }
            }
        }
    }
    public hasVoiceEntry(): boolean {
        return this.currentVoiceEntry !== undefined;
    }

    /**
     *
     * @param type
     * @returns {Fraction} - a Note's Duration from a given type (type must be valid).
     */
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

    /**
     * Create a new [[Note]] and adds it to the currentVoiceEntry
     * @param node
     * @param noteDuration
     * @param divisions
     * @param graceNote
     * @param chord
     * @param guitarPro
     * @returns {Note}
     */
    private addSingleNote(
        node: IXmlElement, noteDuration: number, divisions: number, graceNote: boolean, chord: boolean, guitarPro: boolean
    ): Note {
        //Logging.debug("addSingleNote called");
        let noteAlter: AccidentalEnum = AccidentalEnum.NONE;
        let noteStep: NoteEnum = NoteEnum.C;
        let noteOctave: number = 0;
        let playbackInstrumentId: string = undefined;
        let xmlnodeElementsArr: IXmlElement[] = node.elements();
        for (let idx: number = 0, len: number = xmlnodeElementsArr.length; idx < len; ++idx) {
            let noteElement: IXmlElement = xmlnodeElementsArr[idx];
            try {
                if (noteElement.name === "pitch") {
                    let noteElementsArr: IXmlElement[] = noteElement.elements();
                    for (let idx2: number = 0, len2: number = noteElementsArr.length; idx2 < len2; ++idx2) {
                        let pitchElement: IXmlElement = noteElementsArr[idx2];
                        try {
                            if (pitchElement.name === "step") {
                                noteStep = NoteEnum[pitchElement.value];
                                if (noteStep === undefined) {
                                    let errorMsg: string = ITextTranslation.translateText(
                                        "ReaderErrorMessages/NotePitchError",
                                        "Invalid pitch while reading note."
                                    );
                                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                                    throw new MusicSheetReadingException(errorMsg, undefined);
                                }
                            } else if (pitchElement.name === "alter") {
                                noteAlter = parseInt(pitchElement.value, 10);
                                if (isNaN(noteAlter)) {
                                    let errorMsg: string = ITextTranslation.translateText(
                                        "ReaderErrorMessages/NoteAlterationError", "Invalid alteration while reading note."
                                    );
                                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                                    throw new MusicSheetReadingException(errorMsg, undefined);
                                }

                            } else if (pitchElement.name === "octave") {
                                noteOctave = parseInt(pitchElement.value, 10);
                                if (isNaN(noteOctave)) {
                                    let errorMsg: string = ITextTranslation.translateText(
                                        "ReaderErrorMessages/NoteOctaveError", "Invalid octave value while reading note."
                                    );
                                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                                    throw new MusicSheetReadingException(errorMsg, undefined);
                                }
                            }
                        } catch (ex) {
                            Logging.log("VoiceGenerator.addSingleNote read Step: ", ex.message);
                        }

                    }
                } else if (noteElement.name === "unpitched") {
                    let displayStep: IXmlElement = noteElement.element("display-step");
                    if (displayStep !== undefined) {
                        noteStep = NoteEnum[displayStep.value.toUpperCase()];
                    }
                    let octave: IXmlElement = noteElement.element("display-octave");
                    if (octave !== undefined) {
                        noteOctave = parseInt(octave.value, 10);
                        if (guitarPro) {
                            noteOctave += 1;
                        }
                    }
                } else if (noteElement.name === "instrument") {
                    if (noteElement.firstAttribute !== undefined) {
                        playbackInstrumentId = noteElement.firstAttribute.value;
                    }
                }
            } catch (ex) {
                Logging.log("VoiceGenerator.addSingleNote: ", ex);
            }
        }

        noteOctave -= Pitch.OctaveXmlDifference;
        let pitch: Pitch = new Pitch(noteStep, noteOctave, noteAlter);
        let noteLength: Fraction = new Fraction(noteDuration, divisions);
        let note: Note = new Note(this.currentVoiceEntry, this.currentStaffEntry, noteLength, pitch);
        note.PlaybackInstrumentId = playbackInstrumentId;
        if (!graceNote) {
            this.currentVoiceEntry.Notes.push(note);
        } else {
            this.handleGraceNote(node, note);
        }
        if (node.elements("beam") && !chord) {
            this.createBeam(node, note, graceNote);
        }
        return note;
    }

    /**
     * Create a new rest note and add it to the currentVoiceEntry.
     * @param noteDuration
     * @param divisions
     * @returns {Note}
     */
    private addRestNote(noteDuration: number, divisions: number): Note {
        let restFraction: Fraction = new Fraction(noteDuration, divisions);
        let restNote: Note = new Note(this.currentVoiceEntry, this.currentStaffEntry, restFraction, undefined);
        this.currentVoiceEntry.Notes.push(restNote);
        if (this.openBeam !== undefined) {
            this.openBeam.ExtendedNoteList.push(restNote);
        }
        return restNote;
    }

    /**
     * Handle the currentVoiceBeam.
     * @param node
     * @param note
     * @param grace
     */
    private createBeam(node: IXmlElement, note: Note, grace: boolean): void {
        try {
            let beamNode: IXmlElement = node.element("beam");
            let beamAttr: IXmlAttribute = undefined;
            if (beamNode !== undefined && beamNode.hasAttributes) {
                beamAttr = beamNode.attribute("number");
            }
            if (beamAttr !== undefined) {
                let beamNumber: number = parseInt(beamAttr.value, 10);
                let mainBeamNode: IXmlElement[] = node.elements("beam");
                let currentBeamTag: string = mainBeamNode[0].value;
                if (beamNumber === 1 && mainBeamNode !== undefined) {
                    if (currentBeamTag === "begin" && this.lastBeamTag !== currentBeamTag) {
                        if (grace) {
                            if (this.openGraceBeam !== undefined) {
                                this.handleOpenBeam();
                            }
                            this.openGraceBeam = new Beam();
                        } else {
                            if (this.openBeam !== undefined) {
                                this.handleOpenBeam();
                            }
                            this.openBeam = new Beam();
                        }
                    }
                    this.lastBeamTag = currentBeamTag;
                }
                let sameVoiceEntry: boolean = false;
                if (grace) {
                    if (this.openGraceBeam === undefined) { return; }
                    for (let idx: number = 0, len: number = this.openGraceBeam.Notes.length; idx < len; ++idx) {
                        let beamNote: Note = this.openGraceBeam.Notes[idx];
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
                } else {
                    if (this.openBeam === undefined) { return; }
                    for (let idx: number = 0, len: number = this.openBeam.Notes.length; idx < len; ++idx) {
                        let beamNote: Note = this.openBeam.Notes[idx];
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
        } catch (e) {
            let errorMsg: string = ITextTranslation.translateText(
                "ReaderErrorMessages/BeamError", "Error while reading beam."
            );
            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
            throw new MusicSheetReadingException("", e);
        }

    }

    /**
     * Check for open [[Beam]]s at end of [[SourceMeasure]] and closes them explicity.
     */
    private handleOpenBeam(): void {
        if (this.openBeam.Notes.length === 1) {
            let beamNote: Note = this.openBeam.Notes[0];
            beamNote.NoteBeam = undefined;
            this.openBeam = undefined;
            return;
        }
        if (this.currentNote === CollectionUtil.last(this.openBeam.Notes)) {
            this.openBeam = undefined;
        } else {
            let beamLastNote: Note = CollectionUtil.last(this.openBeam.Notes);
            let beamLastNoteStaffEntry: SourceStaffEntry = beamLastNote.ParentStaffEntry;
            let horizontalIndex: number = this.currentMeasure.getVerticalContainerIndexByTimestamp(beamLastNoteStaffEntry.Timestamp);
            let verticalIndex: number = beamLastNoteStaffEntry.VerticalContainerParent.StaffEntries.indexOf(beamLastNoteStaffEntry);
            if (horizontalIndex < this.currentMeasure.VerticalSourceStaffEntryContainers.length - 1) {
                let nextStaffEntry: SourceStaffEntry = this.currentMeasure.VerticalSourceStaffEntryContainers[horizontalIndex + 1].StaffEntries[verticalIndex];
                if (nextStaffEntry !== undefined) {
                    for (let idx: number = 0, len: number = nextStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                        let voiceEntry: VoiceEntry = nextStaffEntry.VoiceEntries[idx];
                        if (voiceEntry.ParentVoice === this.voice) {
                            let candidateNote: Note = voiceEntry.Notes[0];
                            if (candidateNote.Length.lte(new Fraction(1, 8))) {
                                this.openBeam.addNoteToBeam(candidateNote);
                                this.openBeam = undefined;
                            } else {
                                this.openBeam = undefined;
                            }
                        }
                    }
                }
            } else {
                this.openBeam = undefined;
            }
        }
    }
    private handleGraceNote(node: IXmlElement, note: Note): void {
        let graceChord: boolean = false;
        let type: string = "";
        if (node.elements("type")) {
            let typeNode: IXmlElement[] = node.elements("type");
            if (typeNode) {
                type = typeNode[0].value;
                try {
                    note.Length = this.getNoteDurationFromType(type);
                    note.Length.Numerator = 1;
                } catch (e) {
                    let errorMsg: string = ITextTranslation.translateText(
                        "ReaderErrorMessages/NoteDurationError", "Invalid note duration."
                    );
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    throw new MusicSheetReadingException(errorMsg, e);
                }

            }
        }
        let graceNode: IXmlElement = node.element("grace");
        if (graceNode !== undefined && graceNode.attributes()) {
            if (graceNode.attribute("slash")) {
                let slash: string = graceNode.attribute("slash").value;
                if (slash === "yes") {
                    note.GraceNoteSlash = true;
                }
            }
        }
        if (node.element("chord") !== undefined) {
            graceChord = true;
        }
        let graceVoiceEntry: VoiceEntry = undefined;
        if (!graceChord) {
            graceVoiceEntry = new VoiceEntry(
                new Fraction(0, 1), this.currentVoiceEntry.ParentVoice, this.currentStaffEntry
            );
            if (this.currentVoiceEntry.graceVoiceEntriesBefore === undefined) {
                this.currentVoiceEntry.graceVoiceEntriesBefore = [];
            }
            this.currentVoiceEntry.graceVoiceEntriesBefore.push(graceVoiceEntry);
        } else {
            if (
                this.currentVoiceEntry.graceVoiceEntriesBefore !== undefined
                && this.currentVoiceEntry.graceVoiceEntriesBefore.length > 0
            ) {
                graceVoiceEntry = CollectionUtil.last(this.currentVoiceEntry.graceVoiceEntriesBefore);
            }
        }
        if (graceVoiceEntry !== undefined) {
            graceVoiceEntry.Notes.push(note);
            note.ParentVoiceEntry = graceVoiceEntry;
        }
    }

    /**
     * Create a [[Tuplet]].
     * @param node
     * @param tupletNodeList
     * @returns {number}
     */
    private addTuplet(node: IXmlElement, tupletNodeList: IXmlElement[]): number {
        if (tupletNodeList !== undefined && tupletNodeList.length > 1) {
            let timeModNode: IXmlElement = node.element("time-modification");
            if (timeModNode !== undefined) {
                timeModNode = timeModNode.element("actual-notes");
            }
            let tupletNodeListArr: IXmlElement[] = tupletNodeList;
            for (let idx: number = 0, len: number = tupletNodeListArr.length; idx < len; ++idx) {
                let tupletNode: IXmlElement = tupletNodeListArr[idx];
                if (tupletNode !== undefined && tupletNode.attributes()) {
                    let type: string = tupletNode.attribute("type").value;
                    if (type === "start") {
                        let tupletNumber: number = 1;
                        if (tupletNode.attribute("number")) {
                            tupletNumber = parseInt(tupletNode.attribute("number").value, 10);
                        }
                        let tupletLabelNumber: number = 0;
                        if (timeModNode !== undefined) {
                            tupletLabelNumber = parseInt(timeModNode.value, 10);
                            if (isNaN(tupletLabelNumber)) {
                                let errorMsg: string = ITextTranslation.translateText(
                                    "ReaderErrorMessages/TupletNoteDurationError", "Invalid tuplet note duration."
                                );
                                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                                throw new MusicSheetReadingException(errorMsg, undefined);
                            }

                        }
                        let tuplet: Tuplet = new Tuplet(tupletLabelNumber);
                        if (this.tupletDict[tupletNumber] !== undefined) {
                            delete this.tupletDict[tupletNumber];
                            if (Object.keys(this.tupletDict).length === 0) {
                                this.openTupletNumber = 0;
                            } else if (Object.keys(this.tupletDict).length > 1) {
                                this.openTupletNumber--;
                            }
                        }
                        this.tupletDict[tupletNumber] = tuplet;
                        let subnotelist: Note[] = [];
                        subnotelist.push(this.currentNote);
                        tuplet.Notes.push(subnotelist);
                        tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                        this.currentNote.NoteTuplet = tuplet;
                        this.openTupletNumber = tupletNumber;
                    } else if (type === "stop") {
                        let tupletNumber: number = 1;
                        if (tupletNode.attribute("number")) {
                            tupletNumber = parseInt(tupletNode.attribute("number").value, 10);
                        }
                        let tuplet: Tuplet = this.tupletDict[tupletNumber];
                        if (tuplet !== undefined) {
                            let subnotelist: Note[] = [];
                            subnotelist.push(this.currentNote);
                            tuplet.Notes.push(subnotelist);
                            tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                            this.currentNote.NoteTuplet = tuplet;
                            delete this.tupletDict[tupletNumber];
                            if (Object.keys(this.tupletDict).length === 0) {
                                this.openTupletNumber = 0;
                            } else if (Object.keys(this.tupletDict).length > 1) {
                                this.openTupletNumber--;
                            }
                        }
                    }
                }
            }
        } else if (tupletNodeList[0] !== undefined) {
            let n: IXmlElement = tupletNodeList[0];
            if (n.hasAttributes) {
                let type: string = n.attribute("type").value;
                let tupletnumber: number = 1;
                if (n.attribute("number")) {
                    tupletnumber = parseInt(n.attribute("number").value, 10);
                }
                let noTupletNumbering: boolean = isNaN(tupletnumber);

                if (type === "start") {
                    let tupletLabelNumber: number = 0;
                    let timeModNode: IXmlElement = node.element("time-modification");
                    if (timeModNode !== undefined) {
                        timeModNode = timeModNode.element("actual-notes");
                    }
                    if (timeModNode !== undefined) {
                        tupletLabelNumber = parseInt(timeModNode.value, 10);
                        if (isNaN(tupletLabelNumber)) {
                            let errorMsg: string = ITextTranslation.translateText(
                                "ReaderErrorMessages/TupletNoteDurationError", "Invalid tuplet note duration."
                            );
                            this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                            throw new MusicSheetReadingException(errorMsg);
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
                } else if (type === "stop") {
                    if (noTupletNumbering) {
                        tupletnumber = this.openTupletNumber;
                    }
                    let tuplet: Tuplet = this.tupletDict[this.openTupletNumber];
                    if (tuplet !== undefined) {
                        let subnotelist: Note[] = [];
                        subnotelist.push(this.currentNote);
                        tuplet.Notes.push(subnotelist);
                        tuplet.Fractions.push(this.getTupletNoteDurationFromType(node));
                        this.currentNote.NoteTuplet = tuplet;
                        if (Object.keys(this.tupletDict).length === 0) {
                            this.openTupletNumber = 0;
                        } else if (Object.keys(this.tupletDict).length > 1) {
                            this.openTupletNumber--;
                        }
                        delete this.tupletDict[tupletnumber];
                    }
                }
            }
        }
        return this.openTupletNumber;
    }

    /**
     * Handle the time-modification [[IXmlElement]] for the [[Tuplet]] case (tupletNotes not at begin/end of [[Tuplet]]).
     * @param noteNode
     */
    private handleTimeModificationNode(noteNode: IXmlElement): void {
        if (this.openTupletNumber in this.tupletDict) {
            try {
                let tuplet: Tuplet = this.tupletDict[this.openTupletNumber];
                let notes: Note[] = CollectionUtil.last(tuplet.Notes);
                let lastTupletVoiceEntry: VoiceEntry = notes[0].ParentVoiceEntry;
                let noteList: Note[];
                if (lastTupletVoiceEntry.Timestamp.Equals(this.currentVoiceEntry.Timestamp)) {
                    noteList = notes;
                } else {
                    noteList = [];
                    tuplet.Notes.push(noteList);
                    tuplet.Fractions.push(this.getTupletNoteDurationFromType(noteNode));
                }
                noteList.push(this.currentNote);
                this.currentNote.NoteTuplet = tuplet;
            } catch (ex) {
                let errorMsg: string = ITextTranslation.translateText(
                    "ReaderErrorMessages/TupletNumberError", "Invalid tuplet number."
                );
                this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                throw ex;
            }

        } else if (this.currentVoiceEntry.Notes.length > 0) {
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
                if (tieNode !== undefined && tieNode.attributes()) {
                    let type: string = tieNode.attribute("type").value;
                    try {
                        if (type === "start") {
                            let num: number = this.findCurrentNoteInTieDict(this.currentNote);
                            if (num < 0) {
                                delete this.openTieDict[num];
                            }
                            let newTieNumber: number = this.getNextAvailableNumberForTie();
                            let tie: Tie = new Tie(this.currentNote);
                            this.openTieDict[newTieNumber] = tie;
                            if (this.currentNote.NoteBeam !== undefined) {
                                if (this.currentNote.NoteBeam.Notes[0] === this.currentNote) {
                                    tie.BeamStartTimestamp = Fraction.plus(measureStartAbsoluteTimestamp, this.currentVoiceEntry.Timestamp);
                                } else {
                                    for (let idx: number = 0, len: number = this.currentNote.NoteBeam.Notes.length; idx < len; ++idx) {
                                        let note: Note = this.currentNote.NoteBeam.Notes[idx];
                                        if (note.NoteTie !== undefined && note.NoteTie !== tie && note.NoteTie.BeamStartTimestamp !== undefined) {
                                            tie.BeamStartTimestamp = note.NoteTie.BeamStartTimestamp;
                                            break;
                                        }
                                    }
                                    if (this.currentNote === CollectionUtil.last(this.currentNote.NoteBeam.Notes)) {
                                        tie.BeamStartTimestamp = Fraction.plus(measureStartAbsoluteTimestamp, this.currentVoiceEntry.Timestamp);
                                    }
                                }
                            }
                        } else if (type === "stop") {
                            let tieNumber: number = this.findCurrentNoteInTieDict(this.currentNote);
                            let tie: Tie = this.openTieDict[tieNumber];
                            if (tie !== undefined) {
                                let tieStartNote: Note = tie.Start;
                                tieStartNote.NoteTie = tie;
                                tieStartNote.Length.Add(this.currentNote.Length);
                                tie.Fractions.push(this.currentNote.Length);
                                if (maxTieNoteFraction.lt(Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length))) {
                                    maxTieNoteFraction = Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length);
                                }
                                let i: number = this.currentVoiceEntry.Notes.indexOf(this.currentNote);
                                if (i !== -1) { this.currentVoiceEntry.Notes.splice(i, 1); }
                                if (
                                    this.currentVoiceEntry.Articulations.length === 1
                                    && this.currentVoiceEntry.Articulations[0] === ArticulationEnum.fermata
                                    && tieStartNote.ParentVoiceEntry.Articulations[ArticulationEnum.fermata] === undefined
                                ) {
                                    tieStartNote.ParentVoiceEntry.Articulations.push(ArticulationEnum.fermata);
                                }
                                if (this.currentNote.NoteBeam !== undefined) {
                                    let noteBeamIndex: number = this.currentNote.NoteBeam.Notes.indexOf(this.currentNote);
                                    if (noteBeamIndex === 0 && tie.BeamStartTimestamp === undefined) {
                                        tie.BeamStartTimestamp = Fraction.plus(measureStartAbsoluteTimestamp, this.currentVoiceEntry.Timestamp);
                                    }
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
                                for (let idx: number = 0, len: number = this.currentNote.NoteSlurs.length; idx < len; ++idx) {
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
                                let lyricsEntries: Dictionary<number, LyricsEntry> = this.currentVoiceEntry.LyricsEntries;
                                for (let lyricsEntry in lyricsEntries) {
                                    if (lyricsEntries.hasOwnProperty(lyricsEntry)) {
                                        let val: LyricsEntry = this.currentVoiceEntry.LyricsEntries[lyricsEntry];
                                        if (!tieStartNote.ParentVoiceEntry.LyricsEntries.hasOwnProperty(lyricsEntry)) {
                                            tieStartNote.ParentVoiceEntry.LyricsEntries[lyricsEntry] = val;
                                            val.Parent = tieStartNote.ParentVoiceEntry;
                                        }
                                    }
                                }
                                delete this.openTieDict[tieNumber];
                            }
                        }
                    } catch (err) {
                        let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/TieError", "Error while reading tie.");
                        this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    }

                }
            } else if (tieNodeList.length === 2) {
                let tieNumber: number = this.findCurrentNoteInTieDict(this.currentNote);
                if (tieNumber >= 0) {
                    let tie: Tie = this.openTieDict[tieNumber];
                    let tieStartNote: Note = tie.Start;
                    tieStartNote.Length.Add(this.currentNote.Length);
                    tie.Fractions.push(this.currentNote.Length);
                    if (this.currentNote.NoteBeam !== undefined) {
                        let noteBeamIndex: number = this.currentNote.NoteBeam.Notes.indexOf(this.currentNote);
                        if (noteBeamIndex === 0 && tie.BeamStartTimestamp === undefined) {
                            tie.BeamStartTimestamp = Fraction.plus(measureStartAbsoluteTimestamp, this.currentVoiceEntry.Timestamp);
                        }
                        let noteBeam: Beam = this.currentNote.NoteBeam;
                        noteBeam.Notes[noteBeamIndex] = tieStartNote;
                        tie.TieBeam = noteBeam;
                    }
                    for (let idx: number = 0, len: number = this.currentNote.NoteSlurs.length; idx < len; ++idx) {
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

                    this.currentVoiceEntry.LyricsEntries.forEach((key: number, value: LyricsEntry): void => {
                        if (!tieStartNote.ParentVoiceEntry.LyricsEntries.containsKey(key)) {
                            tieStartNote.ParentVoiceEntry.LyricsEntries.setValue(key, value);
                            value.Parent = tieStartNote.ParentVoiceEntry;
                        }
                    });
                    if (maxTieNoteFraction.lt(Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length))) {
                        maxTieNoteFraction = Fraction.plus(this.currentStaffEntry.Timestamp, this.currentNote.Length);
                    }
                    // delete currentNote from Notes:
                    let i: number = this.currentVoiceEntry.Notes.indexOf(this.currentNote);
                    if (i !== -1) { this.currentVoiceEntry.Notes.splice(i, 1); }
                }
            }
        }
    }

    /**
     * Find the next free int (starting from 0) to use as key in TieDict.
     * @returns {number}
     */
    private getNextAvailableNumberForTie(): number {
        let keys: string[] = Object.keys(this.openTieDict);
        if (keys.length === 0) { return 1; }
        keys.sort((a, b) => (+a - +b)); // FIXME Andrea: test
        for (let i: number = 0; i < keys.length; i++) {
            if ("" + (i + 1) !== keys[i]) {
                return i + 1;
            }
        }
        return +(keys[keys.length - 1]) + 1;
    }

    /**
     * Search the tieDictionary for the corresponding candidateNote to the currentNote (same FundamentalNote && Octave).
     * @param candidateNote
     * @returns {number}
     */
    private findCurrentNoteInTieDict(candidateNote: Note): number {
        let openTieDict: { [_: number]: Tie; } = this.openTieDict;
        for (let key in openTieDict) {
            if (openTieDict.hasOwnProperty(key)) {
                let tie: Tie = openTieDict[key];
                if (tie.Start.Pitch.FundamentalNote === candidateNote.Pitch.FundamentalNote && tie.Start.Pitch.Octave === candidateNote.Pitch.Octave) {
                    return +key;
                }
            }
        }
        return -1;
    }

    /**
     * Calculate the normal duration of a [[Tuplet]] note.
     * @param xmlNode
     * @returns {any}
     */
    private getTupletNoteDurationFromType(xmlNode: IXmlElement): Fraction {
        if (xmlNode.element("type") !== undefined) {
            let typeNode: IXmlElement = xmlNode.element("type");
            if (typeNode !== undefined) {
                let type: string = typeNode.value;
                try {
                    return this.getNoteDurationFromType(type);
                } catch (e) {
                    let errorMsg: string = ITextTranslation.translateText("ReaderErrorMessages/NoteDurationError", "Invalid note duration.");
                    this.musicSheet.SheetErrors.pushMeasureError(errorMsg);
                    throw new MusicSheetReadingException("", e);
                }

            }
        }
        return undefined;
    }
}
