import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  CORPUS_SCHEMA_VERSION,
  collectNonFiniteGeometryFaults,
  collectProvenance,
  createRunFingerprint,
  isReusableCheckpointRecord,
  loadCheckpoint,
  parseArgs,
  parseShard,
  readDependencyRevision,
  readGitSha,
  resolveDiagnosticLayers,
} from "./render-layout-corpus.mjs";

const temporaryDirectories = [];

function makeTemporaryDirectory() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "osmd-layout-corpus-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

describe("layout-corpus command line", () => {
  const requiredArguments = [
    "--input",
    "test/data",
    "--renderer",
    "current=build/opensheetmusicdisplay.min.js",
    "--output",
    "build/layout-corpus",
  ];

  it("composes diagnostic aliases and explicit layers", () => {
    const options = parseArgs([
      ...requiredArguments,
      "--layers",
      "stage6,fonts",
      "--feature",
      "slurs,tuplets",
      "--shard",
      "2/3",
      "--workers",
      "2",
      "--gallery",
      "paged",
      "--resume",
    ]);

    assert.deepEqual(options.layers, [
      "problems",
      "lyrics",
      "horizontal-spacing",
      "slurs",
      "skyline",
      "articulations",
      "fonts",
    ]);
    assert.deepEqual(options.requiredFeatures, ["slurs", "tuplets"]);
    assert.deepEqual(options.shard, { count: 3, index: 2 });
    assert.equal(options.workers, 2);
    assert.equal(options.gallery, "paged");
    assert.equal(options.resume, true);
  });

  it("rejects unknown layers, invalid shards, and excessive worker counts", () => {
    assert.throws(() => resolveDiagnosticLayers(["stage9"]), /Invalid diagnostic layer/);
    assert.throws(() => parseShard("0/2"), /index must be between/);
    assert.throws(() => parseArgs([...requiredArguments, "--workers", "3"]), /Invalid workers/);
  });
});

describe("layout-corpus provenance", () => {
  it("does not attribute a parent repository revision to an unpacked dependency", () => {
    const directory = makeTemporaryDirectory();
    assert.equal(readGitSha(directory), null);
  });

  it("records only OSMD and VexFlow revisions plus exact run inputs", () => {
    const repoRoot = path.resolve(import.meta.dirname, "..");
    const temporaryDirectory = makeTemporaryDirectory();
    const bundle = path.join(temporaryDirectory, "osmd.js");
    fs.writeFileSync(bundle, "bundle-under-test");
    const options = {
      annotations: "stage6",
      excludes: [],
      filters: [],
      gallery: "paged",
      inputs: [path.join(repoRoot, "test", "data")],
      layers: resolveDiagnosticLayers(["stage6"]),
      lyricPaddingFactor: null,
      maximumLyricsElongationFactor: null,
      renderers: [{ file: bundle, label: "current" }],
      shard: null,
      visibility: "all",
      widths: [1200],
      workers: 2,
    };
    const provenance = collectProvenance({
      browserOptions: { browser: "chromium", headless: true },
      browserVersion: "Chromium/123",
      gitShaReader: (directory) => `sha:${path.basename(directory)}`,
      options,
      repoRoot,
    });

    assert.deepEqual(provenance.git, {
      osmd: "sha:opensheetmusicdisplay",
      vexflow: "sha:vexflow",
    });
    assert.equal(provenance.harness.file, "scripts/render-layout-corpus.mjs");
    assert.match(provenance.harness.sha256, /^[a-f0-9]{64}$/);
    assert.equal(provenance.fonts.length, 5);
    assert.ok(provenance.fonts.every((font) => /^[a-f0-9]{64}$/.test(font.sha256)));
    assert.match(readDependencyRevision(repoRoot, "vexflow"), /^[a-f0-9]{40}$/);

    const fingerprint = createRunFingerprint({
      provenance,
      scores: [{ scoreId: "test/data/example.musicxml", sourceSha256: "first" }],
    });
    assert.equal(fingerprint.length, 64);
    assert.notEqual(
      createRunFingerprint({
        provenance,
        scores: [{ scoreId: "test/data/example.musicxml", sourceSha256: "second" }],
      }),
      fingerprint,
    );
  });
});

describe("layout-corpus objective checks and checkpoints", () => {
  it("reports non-finite values only in geometry fields", () => {
    assert.deepEqual(
      collectNonFiniteGeometryFaults({
        finalX: Number.NaN,
        measureNumber: Number.NaN,
        nested: [{ widthPx: Number.POSITIVE_INFINITY }, { widthPx: 12 }],
      }),
      ["geometry.finalX", "geometry.nested[0].widthPx"],
    );
  });

  it("reuses only compatible checkpoints with all five artifacts", () => {
    const directory = makeTemporaryDirectory();
    const checkpointFile = path.join(directory, "checkpoint.json");
    fs.writeFileSync(
      checkpointFile,
      JSON.stringify({ records: [], runFingerprint: "fingerprint", schemaVersion: CORPUS_SCHEMA_VERSION }),
    );
    assert.deepEqual(loadCheckpoint(checkpointFile, "fingerprint")?.records, []);
    assert.throws(() => loadCheckpoint(checkpointFile, "different"), /provenance or render selection differs/);

    const record = {
      annotatedPng: "score/render.annotated.png",
      annotatedSvg: "score/render.annotated.svg",
      metricsJson: "score/render.metrics.json",
      plainPng: "score/render.png",
      plainSvg: "score/render.svg",
    };
    for (const artifact of Object.values(record)) {
      const file = path.join(directory, artifact);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, "artifact");
    }
    assert.equal(isReusableCheckpointRecord(record, directory), true);
    assert.equal(
      isReusableCheckpointRecord({ ...record, objectiveFaults: [{ code: "rerender-drift" }] }, directory),
      false,
    );
  });
});
