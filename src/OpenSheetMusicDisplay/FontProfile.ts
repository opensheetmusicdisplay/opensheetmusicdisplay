import VexFlow from "../MusicalScore/Graphical/VexFlow/VexFlowAdapter";

export type OSMDWebFontStyle = "normal" | "italic";
export type OSMDWebFontDisplay = "auto" | "block" | "swap" | "fallback" | "optional";

/** One browser font face used while OSMD measures and draws a score. */
export interface IOSMDFontFace {
    family: string;
    /** A URL or data URL. Omit it when the host page supplies the face. */
    source?: string;
    format?: "woff2" | "woff" | "opentype" | "truetype";
    weight?: string;
    style?: OSMDWebFontStyle;
    display?: OSMDWebFontDisplay;
    /** Text used to make the FontFaceSet load this particular face. */
    validationText?: string;
    /** Whether score loading must fail when this face cannot be resolved. Default true. */
    required?: boolean;
}

/**
 * The complete, explicit font contract for one OSMD renderer configuration.
 * VexFlow's music and ordinary text fonts are selected from this profile after
 * every required browser face has loaded.
 */
export interface IOSMDFontProfile {
    name: string;
    notationFontFamily: string;
    textFontFamily: string;
    musicTextFontFamily: string;
    faces: readonly IOSMDFontFace[];
}

const loadedProfiles: WeakMap<IOSMDFontProfile, Promise<void>> = new WeakMap<IOSMDFontProfile, Promise<void>>();

/** Load, validate, and select a profile before any score geometry is measured. */
export async function loadAndApplyFontProfile(profile: IOSMDFontProfile): Promise<void> {
    let loadPromise: Promise<void> = loadedProfiles.get(profile);
    if (!loadPromise) {
        loadPromise = loadFontProfile(profile).catch((error: unknown): never => {
            loadedProfiles.delete(profile);
            throw error;
        });
        loadedProfiles.set(profile, loadPromise);
    }
    await loadPromise;
    VexFlow.setFonts(profile.notationFontFamily, profile.textFontFamily);
}

/** Return embeddable @font-face rules for portable SVG output. */
export function fontProfileToCss(profile: IOSMDFontProfile): string {
    return profile.faces
        .filter((face: IOSMDFontFace): boolean => Boolean(face.source))
        .map((face: IOSMDFontFace): string => fontFaceToCss(face))
        .join("\n");
}

function loadFontProfile(profile: IOSMDFontProfile): Promise<void> {
    const fontSet: FontFaceSet = typeof document !== "undefined" ? document.fonts : undefined;
    const FontFaceConstructor: typeof FontFace = typeof FontFace !== "undefined" ? FontFace : undefined;
    if (!fontSet || !FontFaceConstructor) {
        throw new Error(
            `OSMD font profile "${profile.name}" requires the browser Font Loading API before score measurement.`,
        );
    }

    return Promise.all(profile.faces.map(async (face: IOSMDFontFace): Promise<void> => {
        if (face.source) {
            const browserFace: FontFace = new FontFaceConstructor(
                face.family,
                `url("${escapeCssUrl(face.source)}") format("${face.format || "woff2"}")`,
                fontFaceDescriptors(face),
            );
            await browserFace.load();
            fontSet.add(browserFace);
        }

        const matches: FontFace[] = await fontSet.load(fontFaceShorthand(face), face.validationText || "BESb");
        if ((face.required ?? true) && matches.length === 0) {
            throw new Error(
                `OSMD font profile "${profile.name}" could not load ${fontFaceDescription(face)}. ` +
                "Supply the declared face or use the self-contained OSMD bundle.",
            );
        }
    })).then(async (): Promise<void> => {
        await fontSet.ready;
    });
}

function fontFaceDescriptors(face: IOSMDFontFace): FontFaceDescriptors {
    return {
        display: face.display || (face.family === "Bravura" ? "block" : "swap"),
        style: face.style || "normal",
        weight: face.weight || "normal",
    };
}

function fontFaceShorthand(face: IOSMDFontFace): string {
    return `${face.style || "normal"} ${face.weight || "normal"} 16px "${escapeCssString(face.family)}"`;
}

function fontFaceDescription(face: IOSMDFontFace): string {
    return `${face.family} (${face.style || "normal"}, ${face.weight || "normal"})`;
}

function fontFaceToCss(face: IOSMDFontFace): string {
    const descriptors: FontFaceDescriptors = fontFaceDescriptors(face);
    return [
        "@font-face {",
        `  font-family: "${escapeCssString(face.family)}";`,
        `  src: url("${escapeCssUrl(face.source)}") format("${face.format || "woff2"}");`,
        `  font-style: ${descriptors.style};`,
        `  font-weight: ${descriptors.weight};`,
        `  font-display: ${descriptors.display};`,
        "}",
    ].join("\n");
}

function escapeCssString(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function escapeCssUrl(value: string): string {
    return escapeCssString(value).replace(/\n/g, "");
}
