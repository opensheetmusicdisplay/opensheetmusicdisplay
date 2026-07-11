// Browser-mode setup: fetch test data files from vitest dev server.
// Files listed here are the ones referenced by SVG layout + skyline tests.
// When adding new SVG test files, add their data files here.

const XML_FILES: string[] = [
  "OSMD_function_test_all.xml",
  "OSMD_function_test_GraceNotes.xml",
  "Debussy_Mandoline.xml",
  "Dichterliebe01.xml",
  "JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml",
];

const MUSICXML_FILES: string[] = [
  "OSMD_function_test_chord_symbols.musicxml",
  "OSMD_function_test_drumset.musicxml",
  "OSMD_Function_Test_Tablature_Alleffects.musicxml",
  "OSMD_function_test_invisible_notes.musicxml",
  "test_cross_stave_16ths_ghost_notes_simple.musicxml",
  "test_grace_note_fingerings_Ysaye_excerpt.musicxml",
  "test_grace_slash.musicxml",
  "test_octaveshift_extragraphicalmeasure.musicxml",
  "test_rest_in_measure_keys_bass_rest.musicxml",
  "test_slur_across_staves_right_to_left_hand.musicxml",
  "test_tuplet_crossstaff_alignment.musicxml",
  "Land_der_Berge.musicxml",
  "Mozart_String_Quartet_in_G_K._387_1st_Mvmnt_excerpt.musicxml",
  "test_slurs_highNotes.musicxml",
];

async function loadFiles(files: string[], _ext: string): Promise<void> {
  await Promise.all(files.map(async (name: string) => {
    const url: string = `/test/data/${name}`;
    const resp: Response = await fetch(url);
    if (!resp.ok) {throw new Error(`Failed to load test data: ${url} (${resp.status})`);}
    const text: string = await resp.text();
    const key: string = `test/data/${name}`;
    (globalThis as any).__xml__[key] = new DOMParser().parseFromString(text, "text/xml");
  }));
}

(globalThis as any).__xml__ = {};
(globalThis as any).__raw__ = {};

await loadFiles(XML_FILES, ".xml");
await loadFiles(MUSICXML_FILES, ".musicxml");
