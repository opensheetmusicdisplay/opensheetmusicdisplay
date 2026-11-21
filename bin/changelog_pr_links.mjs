// Links the PRs in the changelog to /pull/N instead of /issues/N.
// conventional-changelog links every #N of a commit subject to the issue N, also a "(PR #N)". GitHub redirects such a
// link to the PR, but it should point there directly. This rewrites the link after "PR", each link of the list after
// "PRs" (e.g. "PRs [#1](...), [#2](...) and [#3](...)") and "[PR #N](...)", in the whole file. A link whose text and
// URL have different numbers stays as it is.
// Runs after conventional-changelog in npm run changelog, before changelog_backtick_tags.mjs (which can exit with 1
// when tags are left to fix by hand). It only changes "/issues/" to "/pull/" in these links (checked
// before writing), lists the lines it changed, and changes nothing when run again.
//
// Usage: node bin/changelog_pr_links.mjs [CHANGELOG.md]

import fs from "node:fs";

const file = process.argv[2] ?? "CHANGELOG.md";
const text = fs.readFileSync(file, "utf8");

// [#N](https://github.com/owner/repo/issues/N), also with an anchor like #issuecomment-123 after the number
const issueLinkSource = String.raw`\[#(\d+)\]\((https://github\.com/[^/\s)]+/[^/\s)]+)/issues/(\d+)([^\s)]*)\)`;
const linkSeparator = String.raw`(?:,? and |, )`;
// "PR [#N](...)", or "PRs [#N](...), [#M](...) and [#K](...)": the PR links.
// After "PR", only the first link is a PR: in "PR #1653, #657" the PR fixes issue 657.
const prLinks = new RegExp(String.raw`\bPR ${issueLinkSource}|\bPRs ${issueLinkSource}(?:${linkSeparator}${issueLinkSource})*`, "g");
const issueLink = new RegExp(issueLinkSource, "g");
// "[PR #N](...)"
const bracketedPrLink = new RegExp(String.raw`\[PR #(\d+)\]\((https://github\.com/[^/\s)]+/[^/\s)]+)/issues/(\d+)([^\s)]*)\)`, "g");

/**
 * Returns the link to the PR, or the link unchanged if its text and URL have different numbers.
 * @param {string} link the whole link, e.g. "[#12](https://github.com/owner/repo/issues/12)"
 * @param {string} label the text of the link without "#" and the number, e.g. "[" or "[PR "
 * @param {string} number the number in the link's text
 * @param {string} repo the URL up to the repository, e.g. "https://github.com/owner/repo"
 * @param {string} urlNumber the number in the URL
 * @param {string} anchor what follows the number in the URL, e.g. "#issuecomment-123", or ""
 */
function pullLink(link, label, number, repo, urlNumber, anchor) {
    return number === urlNumber ? `${label}#${number}](${repo}/pull/${number}${anchor})` : link;
}

const changedLines = [];
const fixedText = text.split("\n").map((line, index) => {
    const fixedLine = line
        .replace(prLinks, list => list.replace(issueLink, (link, ...groups) => pullLink(link, "[", ...groups)))
        .replace(bracketedPrLink, (link, ...groups) => pullLink(link, "[PR ", ...groups));
    if (fixedLine !== line) {
        changedLines.push(`${file}:${index + 1}`);
    }
    return fixedLine;
}).join("\n");

if (fixedText.replaceAll("/pull/", "/issues/") !== text.replaceAll("/pull/", "/issues/")) {
    console.error(`${file} not changed: linking the PRs to /pull/ would have changed more than the links.`);
    process.exitCode = 1;
} else if (fixedText !== text) {
    fs.writeFileSync(file, fixedText);
    console.log(`Linked the PRs to /pull/ instead of /issues/ in ${changedLines.length} lines:\n${changedLines.join("\n")}`);
} else {
    console.log(`No PR links to /issues/ in ${file}.`);
}
