// Puts element names like <offset> in backticks in the release that conventional-changelog just added to the top of
// the changelog. The generator copies commit subjects unchanged, and GitHub's markdown drops such names as HTML tags,
// e.g. "switch <div> to <button>" showed as "switch  to ".
// Runs after conventional-changelog in npm run changelog. It only adds backticks (checked before writing), lists the
// names it put in backticks and the ones to put in backticks by hand (exit code 1), and changes nothing when run again.
//
// Usage: node bin/changelog_backtick_tags.mjs [CHANGELOG.md]

import fs from "node:fs";

const file = process.argv[2] ?? "CHANGELOG.md";
const text = fs.readFileSync(file, "utf8");

// the newest release ends where the next one starts, e.g. at "## [2.1.3](...)" ("###" starts a section like Bug Fixes)
const nextReleaseStart = text.search(/\n#{1,2} /) + 1;
const newestReleaseEnd = nextReleaseStart > 0 ? nextReleaseStart : text.length;

// a code span (from a run of backticks to the next run of the same length), which stays as it is, or HTML tags:
//   <name>, <name attributes>, </name> or <name/>, adjacent ones together, but not an autolink like <https://...>
const codeSpanOrTags = /(?<!`)(`+)(?!`).*?(?<!`)\1(?!`)|(?:<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\/?>)+/g;

const tagsPutInBackticks = [];
const tagsLeft = [];
const newestRelease = text.slice(0, newestReleaseEnd).split("\n").map((line, index) => {
    const tags = [];
    const intendedMatches = [];
    const fixedLine = line.replace(codeSpanOrTags, (match, codeSpanBackticks) => {
        const replacement = codeSpanBackticks ? match : "`" + match + "`";
        if (!codeSpanBackticks) {
            tags.push(`${file}:${index + 1}: ${match}`);
        }
        intendedMatches.push(replacement);
        return replacement;
    });
    // the added backticks must not pair with others, e.g. with a single backtick earlier in the line
    const matches = [...fixedLine.matchAll(codeSpanOrTags)].map(([match]) => match);
    if (JSON.stringify(matches) !== JSON.stringify(intendedMatches)) {
        tagsLeft.push(...tags);
        return line;
    }
    tagsPutInBackticks.push(...tags);
    return fixedLine;
}).join("\n");
const fixedText = newestRelease + text.slice(newestReleaseEnd);

if (fixedText.replaceAll("`", "") !== text.replaceAll("`", "")) {
    console.error(`${file} not changed: putting element names in backticks would have changed more than backticks.`);
    process.exitCode = 1;
} else if (fixedText !== text) {
    fs.writeFileSync(file, fixedText);
    console.log(`Put element names in backticks, which GitHub's markdown drops as HTML tags:\n${tagsPutInBackticks.join("\n")}`);
} else if (tagsLeft.length === 0) {
    console.log(`No element names to put in backticks in the newest release of ${file}.`);
}
if (tagsLeft.length > 0) {
    console.error(`Put these in backticks by hand, their lines have backticks that added ones would pair with:\n${tagsLeft.join("\n")}`);
    process.exitCode = 1;
}
