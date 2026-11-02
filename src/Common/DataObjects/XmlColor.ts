const hex8: RegExp = /^#[0-9a-fA-F]{8}$/;

/**
 * MusicXML `color` attributes are `#RRGGBB` or `#AARRGGBB` (alpha first, see the MusicXML `color` data type).
 * OSMD's options, model and renderer use CSS colors, where 8-digit hex is `#RRGGBBAA` (alpha last),
 * because the strings are handed to SVG/canvas as they are.
 *
 * Converts `#AARRGGBB` to `#RRGGBBAA`. Any other string (`#RRGGBB`, named colors, undefined) is returned unchanged.
 * With `alphaLast` (see [[musicXmlColorsAreAlphaLast]]), 8-digit colors are already `#RRGGBBAA` and are returned unchanged too.
 */
export function musicXmlColorToCss(color: string, alphaLast: boolean = false): string {
    if (alphaLast || !color || !hex8.test(color)) {
        return color;
    }
    return "#" + color.substring(3) + color.substring(1, 3);
}

/**
 * Whether the file's 8-digit colors are `#RRGGBBAA` (alpha last) instead of MusicXML's `#AARRGGBB`.
 *
 * MuseScore exports a color with an alpha below 255 as `#RRGGBBAA`, against the MusicXML spec:
 * its `Color::toString()` (`rgb2hex()` in muse_framework's color.cpp) appends the alpha after RGB.
 * Reported as https://github.com/musescore/MuseScore/issues/35476 (2026-11), still the case on MuseScore's main (5.0.0).
 * Its own MusicXML import reads 8 digits as `#AARRGGBB`, so MuseScore doesn't read these colors back correctly either.
 * MuseScore 2 and 3 only write 6-digit colors (`QColor::name()`), so the alpha position doesn't matter for them.
 * Example: OSMD's test_note_notehead_color_transparent.musicxml (MuseScore 4.5.2), `color="#0102B300"` = transparent #0102B3.
 *
 * Every `<software>` starting with "MuseScore" is matched ("MuseScore 4.x", "MuseScore Studio 4.6+" and later versions).
 * Once MuseScore fixes its export (see the issue above), the versions from that one on should be excluded here.
 *
 * @param software the `<identification><encoding><software>` values of the file
 */
export function musicXmlColorsAreAlphaLast(software: string[]): boolean {
    return software.some(name => (name ?? "").trim().startsWith("MuseScore"));
}
