"use strict";
var MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/ = (function () {
    function MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/(sourceMusicPart, startTimestamp, parentPartListEntry, repetitionRun, isEnding) {
        if (repetitionRun === void 0) { repetitionRun = -1; }
        if (isEnding === void 0) { isEnding = false; }
        this.repetitionRun = -1;
        this.sourceMusicPart = sourceMusicPart;
        this.parentPartListEntry = parentPartListEntry;
        this.startTimestamp = startTimestamp.clone();
        this.repetitionRun = repetitionRun;
        this.parentRepetition = parentPartListEntry;
        this.isEnding = isEnding;
    }
    Object.defineProperty(MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/.prototype, "IsRepetition", {
        get: function () {
            return this.parentRepetition !== undefined;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/.prototype, "IsEnding", {
        get: function () {
            return this.isEnding;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/.prototype, "IsLastRepetitionRun", {
        get: function () {
            return this.IsRepetition && (this.repetitionRun + 1 === this.parentRepetition.UserNumberOfRepetitions);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/.prototype, "RepetitionRun", {
        get: function () {
            return this.repetitionRun;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/.prototype, "ParentPartListEntry", {
        get: function () {
            return this.parentPartListEntry;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/.prototype, "SourceMusicPart", {
        get: function () {
            return this.sourceMusicPart;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/.prototype, "StartTimestamp", {
        get: function () {
            return this.startTimestamp;
        },
        enumerable: true,
        configurable: true
    });
    MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/.prototype.CompareTo = function (comp) {
        //let comp: MappingSourceMusicPart = <MappingSourceMusicPart>(obj, MappingSourceMusicPart);
        if (comp !== undefined) {
            return this.startTimestamp.CompareTo(comp.startTimestamp);
        }
        else {
            return 1;
        }
    };
    return MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/;
}());
exports.MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/ = MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/;
