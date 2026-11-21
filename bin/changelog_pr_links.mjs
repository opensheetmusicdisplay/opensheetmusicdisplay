// Links the PRs in the changelog to /pull/N instead of /issues/N.
// conventional-changelog links every #N of a commit subject to the issue N, also a "(PR #N)". GitHub redirects such a
// link to the PR, but it should point there directly. This rewrites the link after "PR", each link of the list after
// "PRs" (e.g. "PRs [#1](...), [#2](...) and [#3](...)") and "[PR #N](...)", in the whole file.
// Runs after conventional-changelog in npm run changelog. It only changes "/issues/" to "/pull/" in these links (checked
// before writing), lists the lines it changed, and changes nothing when run again.
//
// Usage: node bin/changelog_pr_links.mjs [CHANGELOG.md]

import fs from "node:fs";

const file = process.argv[2] ?? "CHANGELOG.md";
const text = fs.readFileSync(file, "utf8");

const issueLink = String.raw`\[#(\d+)\]\((https://github\.com/[^/\s]+/[^/\s]+)/issues/\d+\)`;
// "PR [#N](...)", or "PRs [#N](...), [#M](...) and [#K](...)": the PR links, separated by ", " or " and ".
// After "PR", only the first link is a PR: in "PR #1653, #657" the PR fixes issue 657.
const prLinkList = new RegExp(String.raw`\bPR ${issueLink}|\bPRs ${issueLink}(?:(?:, | and )${issueLink})*`, "g");
const singleIssueLink = new RegExp(issueLink, "g");
// "[PR #N](...)"
const bracketedPrLink = /\[PR #(\d+)\]\((https:\/\/github\.com\/[^/\s]+\/[^/\s]+)\/issues\/\d+\)/g;

const changedLines = [];
const fixedText = text.split("\n").map((line, index) => {
    const fixedLine = line
        .replace(prLinkList, list => list.replace(singleIssueLink, (_, number, repo) => `[#${number}](${repo}/pull/${number})`))
        .replace(bracketedPrLink, (_, number, repo) => `[PR #${number}](${repo}/pull/${number})`);
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
