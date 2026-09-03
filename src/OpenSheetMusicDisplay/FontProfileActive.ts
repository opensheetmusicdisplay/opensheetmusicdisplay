import academicoBold from "../../fonts/Academico-Bold.woff2";
import academicoItalic from "../../fonts/Academico-Italic.woff2";
import academicoRegular from "../../fonts/Academico-Regular.woff2";
import bravura from "../../fonts/Bravura.woff2";
import bravuraText from "../../fonts/BravuraText-subset.woff2";
import { IOSMDFontFace, IOSMDFontProfile } from "./FontProfile";

/** Default profile for the self-contained OSMD bundle. */
export const DEFAULT_OSMD_FONT_PROFILE: IOSMDFontProfile = Object.freeze({
    name: "Bravura with Academico (embedded)",
    notationFontFamily: "Bravura",
    textFontFamily: "Academico",
    musicTextFontFamily: "Bravura Text",
    faces: Object.freeze<IOSMDFontFace[]>([
        { family: "Bravura", source: bravura, validationText: "\uE050", display: "block" },
        { family: "Bravura Text", source: bravuraText, validationText: "\uE870", display: "block" },
        { family: "Academico", source: academicoRegular, validationText: "BESb", display: "swap" },
        { family: "Academico", source: academicoItalic, style: "italic", validationText: "cresc.", display: "swap" },
        { family: "Academico", source: academicoBold, weight: "bold", validationText: "Allegro", display: "swap" },
    ]),
});
