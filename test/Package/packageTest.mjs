/* Tests the npm package as its users get it: packs it (npm pack), unpacks it into the node_modules folder of an empty
 *   project in the temp folder, and loads it there.
 *   Needs the production build (npm run build:webpack), no network and no browser. Usage: npm run test:package
 *   Options: --keep (keep the temp folder and print its path)
 *
 * Checked:
 *   - the files of the package (package.json "files")
 *   - Node: require(), import (default export), and the build as a script (global variable)
 *   - TypeScript (strict, skipLibCheck off) finds the typings, also for deep imports of build/dist/src
 *   - the package needs none of its devDependencies: the project only gets the packages listed in "dependencies"
 *     (their typings are imported by the d.ts files), plus @types/node, which the typings of jszip need
 */
import { execFileSync } from "node:child_process";
import FS from "node:fs";
import OS from "node:os";
import Path from "node:path";
import { fileURLToPath } from "node:url";

const repoDirectory = Path.resolve(Path.dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(FS.readFileSync(Path.join(repoDirectory, "package.json"), "utf8"));
const packageName = packageJson.name;
const keepTempDirectory = process.argv.includes("--keep");

/** The files the package has to contain besides the d.ts files of build/dist/src. */
const expectedFiles = [
    "package.json",
    "README.md",
    "CHANGELOG.md",
    "AUTHORS",
    "LICENSE",
    "build/opensheetmusicdisplay.min.js",
    "build/opensheetmusicdisplay.min.js.LICENSE.txt",
    "build/dist/src/index.d.ts",
];

let failures = 0;
let checks = 0;

/** Counts a check and prints it if it failed. */
function check(condition, description) {
    checks++;
    if (!condition) {
        failures++;
        console.error("FAILED: " + description);
    }
}

/** Runs a command and returns its output, or undefined (and a failed check) if it exits with an error. */
function run(description, command, args, options) {
    checks++;
    try {
        return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
    } catch (error) {
        failures++;
        console.error("FAILED: " + description + "\n" + (error.stdout ?? "") + (error.stderr ?? error.message));
        return undefined;
    }
}

/** Runs a script of the test project with Node and returns what it printed as JSON. */
function runNodeScript(description, projectDirectory, fileName, source) {
    FS.writeFileSync(Path.join(projectDirectory, fileName), source);
    const output = run(description, process.execPath, [fileName], { cwd: projectDirectory });
    return output === undefined ? undefined : JSON.parse(output);
}

/** Makes a package of this checkout's node_modules available in the test project (a link, no copy). */
function linkPackage(projectDirectory, name) {
    const target = Path.join(repoDirectory, "node_modules", name);
    const link = Path.join(projectDirectory, "node_modules", name);
    if (FS.existsSync(link)) {
        return;
    }
    FS.mkdirSync(Path.dirname(link), { recursive: true });
    FS.symlinkSync(target, link, "junction");
    // what the linked package needs itself, e.g. undici-types for @types/node
    const dependencies = JSON.parse(FS.readFileSync(Path.join(target, "package.json"), "utf8")).dependencies ?? {};
    for (const dependency of Object.keys(dependencies)) {
        linkPackage(projectDirectory, dependency);
    }
}

for (const file of expectedFiles.filter((name) => name.startsWith("build/"))) {
    if (!FS.existsSync(Path.join(repoDirectory, file))) {
        console.error(`${file} is missing: run "npm run build:webpack" first.`);
        process.exit(1);
    }
}

const tempDirectory = FS.mkdtempSync(Path.join(OS.tmpdir(), "osmd-package-test-"));
try {
    // --- pack and unpack
    // one command line for the shell: npm is npm.cmd on Windows, which can't be started without one
    const packOutput = run("npm pack", `npm pack --ignore-scripts --json --pack-destination "${tempDirectory}"`, [],
        { cwd: repoDirectory, shell: true });
    if (packOutput === undefined) {
        throw new Error("npm pack failed");
    }
    const packInfo = JSON.parse(packOutput)[0];
    const packedFiles = packInfo.files.map((file) => file.path);
    for (const file of expectedFiles) {
        check(packedFiles.includes(file), `the package contains ${file}`);
    }
    const unexpectedFiles = packedFiles.filter((file) => !expectedFiles.includes(file) &&
        !(file.startsWith("build/dist/src/") && file.endsWith(".d.ts")));
    check(unexpectedFiles.length === 0, "the package contains no other files, but has: " + unexpectedFiles.join(", "));

    const projectDirectory = Path.join(tempDirectory, "project");
    const modulesDirectory = Path.join(projectDirectory, "node_modules");
    FS.mkdirSync(modulesDirectory, { recursive: true });
    FS.writeFileSync(Path.join(projectDirectory, "package.json"), JSON.stringify({ name: "osmd-package-test", private: true }));
    // a relative file name: GNU tar reads "C:" in a path as a remote host
    run("unpack", "tar", ["-xzf", packInfo.filename], { cwd: tempDirectory });
    FS.renameSync(Path.join(tempDirectory, "package"), Path.join(modulesDirectory, packageName));

    // --- Node: require, import, script. Only the package itself is in node_modules here: the build has to contain
    //   everything it needs (VexFlow, loglevel, jszip, typescript-collections)
    const cjs = runNodeScript("require", projectDirectory, "cjs.cjs", `
        const { OpenSheetMusicDisplay, Fraction } = require("${packageName}");
        console.log(JSON.stringify({
            named: typeof OpenSheetMusicDisplay,
            fraction: new Fraction(1, 4).toString(),
            names: Object.keys(require("${packageName}")).sort(),
        }));`);
    // the build is a UMD build, of which Node's import only provides a default export
    const esm = runNodeScript("import (default export)", projectDirectory, "esm.mjs", `
        import osmd from "${packageName}";
        console.log(JSON.stringify({
            named: typeof osmd.OpenSheetMusicDisplay,
            fraction: new osmd.Fraction(1, 4).toString(),
        }));`);
    const script = runNodeScript("script: global variable", projectDirectory, "script.cjs", `
        const vm = require("node:vm");
        const context = vm.createContext({}); // no "exports" and no "define": like a script tag
        vm.runInContext(require("node:fs").readFileSync(require.resolve("${packageName}/build/opensheetmusicdisplay.min.js"), "utf8"), context);
        console.log(JSON.stringify({
            named: typeof context.opensheetmusicdisplay?.OpenSheetMusicDisplay,
            names: Object.keys(context.opensheetmusicdisplay ?? {}).sort(),
        }));`);
    if (cjs && esm && script) {
        check(cjs.named === "function" && cjs.fraction === "1/4", "the classes work with require()");
        check(esm.named === "function" && esm.fraction === "1/4", "the classes work with import (default export)");
        check(script.named === "function", "the build sets the global variable opensheetmusicdisplay");
        check(cjs.names.length > 300, "the build exports its classes, but has only " + cjs.names.length + " names");
        check(script.names.join() === cjs.names.join(), "the global variable has the same names as require()");
    }

    // --- TypeScript
    for (const name of [...Object.keys(packageJson.dependencies ?? {}), "@types/node"]) {
        linkPackage(projectDirectory, name);
    }
    const typeScriptFiles = {
        "named.ts": `
            import { OpenSheetMusicDisplay, Fraction, type IOSMDOptions } from "${packageName}";
            const options: IOSMDOptions = { autoResize: false };
            export const fraction: Fraction = new Fraction(1, 4);
            export { options, OpenSheetMusicDisplay };`,
        // deep imports of the d.ts files: with and without file extension, and a folder (its index.d.ts)
        "deep.ts": `
            import type { Fraction } from "${packageName}/build/dist/src/Common/DataObjects/Fraction";
            import type { Pitch } from "${packageName}/build/dist/src/Common/DataObjects/Pitch.js";
            import type { PointF2D } from "${packageName}/build/dist/src/Common/DataObjects";
            import type { OpenSheetMusicDisplay } from "${packageName}/build/dist/src";
            export type Deep = Fraction | Pitch | PointF2D | OpenSheetMusicDisplay;`,
    };
    for (const [fileName, source] of Object.entries(typeScriptFiles)) {
        FS.writeFileSync(Path.join(projectDirectory, fileName), source);
    }
    const tsc = Path.join(repoDirectory, "node_modules", "typescript", "bin", "tsc");
    // node16: the project has no "type": "module", so its .ts files are CommonJS, as the package's typings are
    for (const [moduleResolution, module] of [["node16", "node16"], ["bundler", "esnext"]]) {
        run(`TypeScript, moduleResolution ${moduleResolution}`, process.execPath, [tsc, "--noEmit", "--strict",
            "--skipLibCheck", "false", "--target", "es2022", "--lib", "es2022,dom", "--types", "node",
            "--module", module, "--moduleResolution", moduleResolution, ...Object.keys(typeScriptFiles)],
        { cwd: projectDirectory });
    }
} finally {
    if (keepTempDirectory) {
        console.log("kept: " + tempDirectory);
    } else {
        FS.rmSync(tempDirectory, { recursive: true, force: true });
    }
}

if (failures > 0) {
    console.error(`package test: ${failures} of ${checks} checks failed`);
    process.exit(1);
}
console.log(`package test: ${checks} checks passed`);
