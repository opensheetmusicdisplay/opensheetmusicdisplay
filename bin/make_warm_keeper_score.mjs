// Writes src/OpenSheetMusicDisplay/WarmKeeperScore.ts from test/data/OSMD_function_test_warm_keeper.musicxml: the score the
// warm keeper renders (see OpenSheetMusicDisplay.KeepWarm), without the whitespace between elements, as an MXL file (zip) in
// base64. Run after changing the score: node bin/make_warm_keeper_score.mjs (test/Common/OSMD/OSMD_KeepWarm_Test.ts checks
// that both match).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const scorePath = "test/data/OSMD_function_test_warm_keeper.musicxml";
const outPath = "src/OpenSheetMusicDisplay/WarmKeeperScore.ts";

const xml = fs.readFileSync(path.join(root, scorePath), "utf8").replace(/>\s+</g, "><").trim();
const zip = new JSZip();
zip.file("META-INF/container.xml",
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?><container><rootfiles><rootfile full-path=\"score.xml\"/></rootfiles></container>");
zip.file("score.xml", xml);
// a fixed date, so that the same score gives the same file
for (const file of Object.values(zip.files)) {
    file.date = new Date(Date.UTC(2026, 10, 7));
}
const base64 = await zip.generateAsync({ type: "base64", compression: "DEFLATE", compressionOptions: { level: 9 } });
const lines = base64.match(/.{1,116}/g);
const ts = `/**
 * The score the warm keeper renders (see OpenSheetMusicDisplay.KeepWarm): ${scorePath}
 * without the whitespace between elements, as an MXL file (zip) in base64 (${(base64.length / 1000).toFixed(1)} KB).
 * Written by bin/make_warm_keeper_score.mjs: don't edit this file, change the score and run that.
 */
export const WarmKeeperScoreMxlBase64: string =
${lines.map((line, i) => `    "${line}"${i < lines.length - 1 ? " +" : ";"}`).join("\n")}
`;
fs.writeFileSync(path.join(root, outPath), ts);
console.log(`${outPath}: ${base64.length} characters of base64 (score ${xml.length} characters)`);
