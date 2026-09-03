import { IOSMDFontFace, IOSMDFontProfile } from "./FontProfile";

/** Default profile for opensheetmusicdisplay-core: the host supplies every face. */
export const DEFAULT_OSMD_FONT_PROFILE: IOSMDFontProfile = Object.freeze({
    name: "Bravura with Academico (external)",
    notationFontFamily: "Bravura",
    textFontFamily: "Academico",
    musicTextFontFamily: "Bravura Text",
    faces: Object.freeze<IOSMDFontFace[]>([
        { family: "Bravura", validationText: "\uE050" },
        { family: "Bravura Text", validationText: "\uE870" },
        { family: "Academico", validationText: "BESb" },
        { family: "Academico", style: "italic", validationText: "cresc." },
        { family: "Academico", weight: "bold", validationText: "Allegro" },
    ]),
});
