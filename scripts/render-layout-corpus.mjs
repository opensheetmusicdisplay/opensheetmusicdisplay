#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import JSZip from "jszip";

export const CORPUS_SCHEMA_VERSION = 7;
const SCORE_EXTENSIONS = new Set([".mxl", ".musicxml", ".xml"]);
const SCORE_FEATURES = new Set([
  "lyrics",
  "extenders",
  "slurs",
  "articulations",
  "dynamics",
  "harmony",
  "beams",
  "tuplets",
  "multiple-parts",
  "multiple-staves",
]);
const DEFAULT_WIDTHS = [1200, 1600];
const CANONICAL_LAYERS = new Set([
  "problems",
  "lyrics",
  "horizontal-spacing",
  "slurs",
  "skyline",
  "fonts",
  "articulations",
  "slur-obstacles",
  "slur-anchors",
  "slur-candidates",
  "slur-rejections",
  "slur-scores",
  "slur-selected",
  "dynamics",
  "harmony",
]);
const LAYER_ALIASES = new Map([
  ["stage5", ["problems", "lyrics", "horizontal-spacing"]],
  ["stage6", ["problems", "lyrics", "horizontal-spacing", "slurs", "skyline", "articulations"]],
  [
    "slur-v2",
    [
      "slurs",
      "slur-obstacles",
      "slur-anchors",
      "slur-candidates",
      "slur-rejections",
      "slur-scores",
      "slur-selected",
    ],
  ],
]);
const HARNESS_FILE = path.resolve(import.meta.dirname, "render-layout-corpus.mjs");
const FONT_DEFINITIONS = [
  {
    family: "Bravura",
    file: "Bravura.woff2",
    style: "normal",
    weight: "400",
  },
  {
    family: "Bravura Text",
    file: "BravuraText-subset.woff2",
    style: "normal",
    weight: "400",
  },
  {
    family: "Academico",
    file: "Academico-Regular.woff2",
    style: "normal",
    weight: "400",
  },
  {
    family: "Academico",
    file: "Academico-Italic.woff2",
    style: "italic",
    weight: "400",
  },
  {
    family: "Academico",
    file: "Academico-Bold.woff2",
    style: "normal",
    weight: "700",
  },
];

export function resolveDiagnosticLayers(specifications) {
  const layers = [];
  const seen = new Set();
  const add = (layer) => {
    if (seen.has(layer)) return;
    seen.add(layer);
    layers.push(layer);
  };
  for (const specification of specifications) {
    for (const rawLayer of String(specification)
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)) {
      const alias = LAYER_ALIASES.get(rawLayer);
      if (alias) {
        alias.forEach(add);
      } else if (CANONICAL_LAYERS.has(rawLayer)) {
        add(rawLayer);
      } else {
        throw new Error(
          `Invalid diagnostic layer "${rawLayer}"; expected ${[
            ...CANONICAL_LAYERS,
            ...LAYER_ALIASES.keys(),
          ].join(", ")}`,
        );
      }
    }
  }
  if (layers.length === 0) throw new Error("At least one diagnostic layer is required.");
  return layers;
}

export function parseShard(value) {
  const match = /^(\d+)\/(\d+)$/.exec(String(value));
  if (!match) throw new Error(`Invalid shard "${value}"; expected a one-based value such as 1/2`);
  const index = Number.parseInt(match[1], 10);
  const count = Number.parseInt(match[2], 10);
  if (count < 1 || index < 1 || index > count) {
    throw new Error(`Invalid shard "${value}"; index must be between 1 and ${count}`);
  }
  return { count, index };
}

export function parseArgs(argv) {
  const options = {
    annotations: "problems",
    cdpUrl: process.env.MUSICXML_LAYOUT_CDP_URL || "",
    comparisonResults: [],
    excludes: [],
    filters: [],
    requiredFeatures: [],
    gallery: "inline",
    inputs: [],
    layers: [],
    lyricPaddingFactor: null,
    maximumLyricsElongationFactor: null,
    output: "",
    renderers: [],
    resume: false,
    shard: null,
    title: "MusicXML lyric-layout corpus",
    visibility: "all",
    widths: DEFAULT_WIDTHS,
    workers: 1,
  };
  const requestedLayers = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === "--annotations" && value) {
      if (!["problems", "stage5", "stage6"].includes(value)) {
        throw new Error(`Invalid annotations "${value}"; expected problems, stage5, or stage6`);
      }
      options.annotations = value;
      index += 1;
    } else if (arg === "--layers" && value) {
      requestedLayers.push(value);
      index += 1;
    } else if (arg === "--input" && value) {
      options.inputs.push(value);
      index += 1;
    } else if (arg === "--filter" && value) {
      options.filters.push(value);
      index += 1;
    } else if (arg === "--feature" && value) {
      const features = value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      const invalid = features.find((feature) => !SCORE_FEATURES.has(feature));
      if (features.length === 0 || invalid) {
        throw new Error(
          `Invalid score feature "${invalid || value}"; expected ${[...SCORE_FEATURES].join(", ")}`,
        );
      }
      options.requiredFeatures.push(...features);
      options.requiredFeatures = [...new Set(options.requiredFeatures)];
      index += 1;
    } else if (arg === "--exclude" && value) {
      options.excludes.push(value);
      index += 1;
    } else if (arg === "--gallery" && value) {
      if (!["inline", "paged"].includes(value)) {
        throw new Error(`Invalid gallery "${value}"; expected inline or paged`);
      }
      options.gallery = value;
      index += 1;
    } else if (arg === "--comparison-results" && value) {
      const separator = value.indexOf("=");
      if (separator <= 0 || separator === value.length - 1) {
        throw new Error(
          `Invalid --comparison-results "${value}"; expected renderer-label=/path/to/results.json`,
        );
      }
      options.comparisonResults.push({
        label: value.slice(0, separator),
        file: value.slice(separator + 1),
      });
      index += 1;
    } else if (arg === "--output" && value) {
      options.output = value;
      index += 1;
    } else if (arg === "--lyric-padding-factor" && value) {
      const factor = Number(value);
      if (!Number.isFinite(factor) || factor <= 0) {
        throw new Error(`Invalid lyric padding factor "${value}"`);
      }
      options.lyricPaddingFactor = factor;
      index += 1;
    } else if (arg === "--maximum-lyrics-elongation-factor" && value) {
      const factor = Number(value);
      if (!Number.isFinite(factor) || factor < 1) {
        throw new Error(`Invalid maximum lyric elongation factor "${value}"`);
      }
      options.maximumLyricsElongationFactor = factor;
      index += 1;
    } else if (arg === "--renderer" && value) {
      const separator = value.indexOf("=");
      if (separator <= 0 || separator === value.length - 1) {
        throw new Error(`Invalid --renderer "${value}"; expected label=/path/to/osmd.js`);
      }
      options.renderers.push({
        label: value.slice(0, separator),
        file: value.slice(separator + 1),
      });
      index += 1;
    } else if (arg === "--title" && value) {
      options.title = value;
      index += 1;
    } else if (arg === "--resume") {
      options.resume = true;
    } else if (arg === "--shard" && value) {
      options.shard = parseShard(value);
      index += 1;
    } else if (arg === "--visibility" && value) {
      if (!["all", "vocal-only"].includes(value)) {
        throw new Error(`Invalid visibility "${value}"; expected all or vocal-only`);
      }
      options.visibility = value;
      index += 1;
    } else if (arg === "--widths" && value) {
      options.widths = value
        .split(",")
        .map((entry) => Number.parseInt(entry, 10))
        .filter((entry) => Number.isFinite(entry) && entry > 0);
      index += 1;
    } else if (arg === "--workers" && value) {
      const workers = Number.parseInt(value, 10);
      if (![1, 2].includes(workers)) {
        throw new Error(`Invalid workers "${value}"; expected 1 or 2`);
      }
      options.workers = workers;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (options.inputs.length === 0 || !options.output || options.renderers.length === 0) {
    printUsage();
    throw new Error("At least one input, one renderer, and an output directory are required.");
  }
  if (options.widths.length === 0) {
    throw new Error("At least one positive width is required.");
  }
  options.layers = resolveDiagnosticLayers(
    requestedLayers.length > 0 ? requestedLayers : [options.annotations],
  );
  if (requestedLayers.length > 0) {
    const stage5 = resolveDiagnosticLayers(["stage5"]);
    const stage6 = resolveDiagnosticLayers(["stage6"]);
    options.annotations =
      JSON.stringify(options.layers) === JSON.stringify(stage5)
        ? "stage5"
        : JSON.stringify(options.layers) === JSON.stringify(stage6)
          ? "stage6"
          : options.layers.length === 1 && options.layers[0] === "problems"
            ? "problems"
            : "custom";
  }
  return options;
}

function printUsage() {
  console.log(`Usage:
  node scripts/render-layout-corpus.mjs \\
    --input <score-or-directory> [--input ...] \\
    --renderer <label=/path/to/opensheetmusicdisplay.min.js> [--renderer ...] \\
    --output <directory> [--widths 1200,1600] [--visibility all|vocal-only]
    [--annotations problems|stage5|stage6]
    [--layers <layer-or-alias[,layer...]>] [--filter <regex>] [--exclude <regex>]
    [--feature <feature[,feature...]>]
    [--shard <one-based-index/count>] [--workers 1|2] [--gallery inline|paged] [--resume]
    [--comparison-results <renderer-label=/path/to/earlier/results.json>]
    [--lyric-padding-factor 1.1] [--maximum-lyrics-elongation-factor 2.5]

The output contains standalone SVG and PNG renders, annotated counterparts,
per-render metrics JSON, and an index.html for side-by-side review. Layer aliases
stage5 and stage6 preserve their respective standard debugging views. Filters
are case-insensitive regular expressions matched against repository-relative
score IDs. Feature filters select scores by detected MusicXML content. A checkpoint is updated after every render; --resume reuses complete
artifacts from a compatible interrupted run.`);
}

export function collectScores(inputs) {
  const scores = [];
  const seen = new Set();
  const visit = (candidate) => {
    const resolved = path.resolve(candidate);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Input does not exist: ${candidate}`);
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(resolved).sort()) {
        visit(path.join(resolved, name));
      }
      return;
    }
    if (!stat.isFile() || !SCORE_EXTENSIONS.has(path.extname(resolved).toLowerCase())) return;
    if (seen.has(resolved)) return;
    seen.add(resolved);
    scores.push(resolved);
  };
  inputs.forEach(visit);
  return scores.sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

export function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function normaliseRelativePath(value) {
  return value.split(path.sep).join("/");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashFile(file) {
  return sha256(fs.readFileSync(file));
}

export function scoreIdForFile(scoreFile, repoRoot) {
  const resolvedFile = path.resolve(scoreFile);
  const resolvedRoot = path.resolve(repoRoot);
  const relative = path.relative(resolvedRoot, resolvedFile);
  if (
    relative &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  ) {
    return normaliseRelativePath(relative);
  }
  return `external/${sha256(resolvedFile).slice(0, 12)}/${path.basename(resolvedFile)}`;
}

export function createScoreDescriptors(scoreFiles, repoRoot) {
  const descriptors = scoreFiles
    .map((scoreFile) => {
      const scoreId = scoreIdForFile(scoreFile, repoRoot);
      const scoreName = path.basename(scoreFile).replace(/\.(mxl|musicxml|xml)$/i, "");
      return {
        file: path.resolve(scoreFile),
        outputSlug: slugify(scoreName),
        scoreId,
        scoreName,
      };
    })
    .sort((left, right) => left.scoreId.localeCompare(right.scoreId));
  const slugCounts = new Map();
  for (const descriptor of descriptors) {
    slugCounts.set(descriptor.outputSlug, (slugCounts.get(descriptor.outputSlug) || 0) + 1);
  }
  for (const descriptor of descriptors) {
    if ((slugCounts.get(descriptor.outputSlug) || 0) > 1) {
      descriptor.outputSlug = `${descriptor.outputSlug}-${sha256(descriptor.scoreId).slice(0, 8)}`;
    }
  }
  return descriptors;
}

function compilePatterns(patterns, optionName) {
  return patterns.map((pattern) => {
    try {
      return new RegExp(pattern, "i");
    } catch (error) {
      throw new Error(
        `Invalid ${optionName} regular expression "${pattern}": ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }
  });
}

export function selectScoreDescriptors(
  descriptors,
  { excludes = [], filters = [], requiredFeatures = [], shard = null },
) {
  const includePatterns = compilePatterns(filters, "--filter");
  const excludePatterns = compilePatterns(excludes, "--exclude");
  const selected = descriptors.filter((descriptor) => {
    const searchable = [descriptor.scoreId, descriptor.scoreName];
    const matches = (pattern) => searchable.some((value) => pattern.test(value));
    if (includePatterns.length > 0 && !includePatterns.some(matches)) {
      return false;
    }
    if (requiredFeatures.some((feature) => !descriptor.features?.includes(feature))) {
      return false;
    }
    return !excludePatterns.some(matches);
  });
  if (!shard) return selected;
  return selected.filter((_, index) => index % shard.count === shard.index - 1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function loadComparisonRecords(specifications, outputDirectory, scoreIdentities, widths) {
  const records = [];
  const rewriteArtifactPath = (sourceDirectory, artifactPath) => {
    if (!artifactPath) return artifactPath;
    const absolutePath = path.resolve(sourceDirectory, artifactPath);
    return path.relative(outputDirectory, absolutePath).split(path.sep).join("/");
  };
  for (const specification of specifications) {
    if (!fs.existsSync(specification.file)) {
      throw new Error(`Comparison results do not exist: ${specification.file}`);
    }
    const sourceDirectory = path.dirname(specification.file);
    const data = JSON.parse(fs.readFileSync(specification.file, "utf8"));
    const sourceRecords = Array.isArray(data) ? data : data.records;
    if (!Array.isArray(sourceRecords)) {
      throw new Error(`Comparison results contain no records array: ${specification.file}`);
    }
    for (const record of sourceRecords) {
      const matchingScore =
        scoreIdentities.get(record.scoreId) || scoreIdentities.get(record.scoreName);
      if (
        record.rendererLabel !== specification.label ||
        !matchingScore ||
        !widths.has(record.width)
      ) {
        continue;
      }
      records.push({
        ...record,
        scoreId: record.scoreId || matchingScore.scoreId,
        annotatedPng: rewriteArtifactPath(sourceDirectory, record.annotatedPng),
        annotatedSvg: rewriteArtifactPath(sourceDirectory, record.annotatedSvg),
        metricsJson: rewriteArtifactPath(sourceDirectory, record.metricsJson),
        plainPng: rewriteArtifactPath(sourceDirectory, record.plainPng),
        plainSvg: rewriteArtifactPath(sourceDirectory, record.plainSvg),
      });
    }
  }
  return records;
}

function displayPath(file, repoRoot) {
  const relative = path.relative(repoRoot, file);
  return relative && relative !== ".." && !relative.startsWith(`..${path.sep}`)
    ? normaliseRelativePath(relative)
    : path.resolve(file);
}

export function readGitSha(directory) {
  if (!fs.existsSync(path.join(directory, ".git"))) return null;
  try {
    return execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

export function readDependencyRevision(repoRoot, dependencyName) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
    const specification =
      packageJson.dependencies?.[dependencyName] ?? packageJson.devDependencies?.[dependencyName];
    const match = typeof specification === "string" ? /#([a-f0-9]{40})$/i.exec(specification) : null;
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function fontAssets(repoRoot) {
  return FONT_DEFINITIONS.map((definition) => {
    const file = path.join(repoRoot, "fonts", definition.file);
    const bytes = fs.readFileSync(file);
    return {
      ...definition,
      bytes,
      file,
      sha256: sha256(bytes),
    };
  });
}

function fontFaceCss(repoRoot) {
  return fontAssets(repoRoot)
    .map(({ family, file, style, weight }) => {
      const bytes = fs.readFileSync(file);
      return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${bytes.toString(
        "base64",
      )}) format("woff2");font-style:${style};font-weight:${weight};font-display:block;}`;
    })
    .join("\n");
}

function provenanceOptions(options, repoRoot) {
  return {
    annotations: options.annotations,
    excludes: [...options.excludes],
    filters: [...options.filters],
    gallery: options.gallery,
    inputs: options.inputs.map((input) => displayPath(input, repoRoot)),
    layers: [...options.layers],
    lyricPaddingFactor: options.lyricPaddingFactor,
    maximumLyricsElongationFactor: options.maximumLyricsElongationFactor,
    renderers: options.renderers.map((renderer) => ({
      file: displayPath(renderer.file, repoRoot),
      label: renderer.label,
    })),
    shard: options.shard,
    visibility: options.visibility,
    widths: [...options.widths],
    workers: options.workers,
  };
}

export function collectProvenance({
  browserOptions,
  browserVersion,
  gitShaReader = readGitSha,
  options,
  repoRoot,
}) {
  return {
    browser: {
      options: browserOptions,
      version: browserVersion,
    },
    bundles: options.renderers.map((renderer) => ({
      file: displayPath(renderer.file, repoRoot),
      label: renderer.label,
      sha256: hashFile(renderer.file),
    })),
    fonts: fontAssets(repoRoot).map(({ family, file, sha256: digest, style, weight }) => ({
      family,
      file: displayPath(file, repoRoot),
      sha256: digest,
      style,
      weight,
    })),
    harness: {
      file: displayPath(HARNESS_FILE, repoRoot),
      sha256: hashFile(HARNESS_FILE),
    },
    git: {
      osmd: gitShaReader(repoRoot),
      vexflow:
        gitShaReader(path.join(repoRoot, "node_modules", "vexflow")) ??
        readDependencyRevision(repoRoot, "vexflow"),
    },
    options: provenanceOptions(options, repoRoot),
  };
}

export function createRunFingerprint({ provenance, scores }) {
  return sha256(
    JSON.stringify({
      provenance,
      schemaVersion: CORPUS_SCHEMA_VERSION,
      scores,
    }),
  );
}

export function recordKey(record) {
  return [
    record.scoreId || record.scoreName,
    record.width,
    record.rendererLabel,
    record.visibility || "",
    (record.layers || []).join(","),
  ].join("\0");
}

function artifactPaths(record) {
  return [
    record.annotatedPng,
    record.annotatedSvg,
    record.metricsJson,
    record.plainPng,
    record.plainSvg,
  ].filter(Boolean);
}

export function isReusableCheckpointRecord(record, outputDirectory) {
  return (
    !record.error &&
    !record.objectiveFaults?.length &&
    !record.metrics?.objectiveFaults?.length &&
    artifactPaths(record).length === 5 &&
    artifactPaths(record).every((artifact) =>
      fs.existsSync(path.resolve(outputDirectory, artifact)),
    )
  );
}

function writeJsonAtomically(file, data) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

export function loadCheckpoint(file, runFingerprint) {
  if (!fs.existsSync(file)) return null;
  const checkpoint = JSON.parse(fs.readFileSync(file, "utf8"));
  if (checkpoint.schemaVersion !== CORPUS_SCHEMA_VERSION) {
    throw new Error(
      `Checkpoint schema ${checkpoint.schemaVersion} is incompatible with ${CORPUS_SCHEMA_VERSION}`,
    );
  }
  if (checkpoint.runFingerprint !== runFingerprint) {
    throw new Error(
      "Checkpoint provenance or render selection differs from this run; use a new output directory or omit --resume.",
    );
  }
  if (!Array.isArray(checkpoint.records)) {
    throw new Error(`Checkpoint contains no records array: ${file}`);
  }
  return checkpoint;
}

function writeCheckpoint({ complete, file, options, provenance, records, runFingerprint }) {
  writeJsonAtomically(file, {
    complete,
    generatedAt: new Date().toISOString(),
    options,
    provenance,
    records,
    runFingerprint,
    schemaVersion: CORPUS_SCHEMA_VERSION,
  });
}

function decodeScore(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString("utf16le");
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const body = Buffer.from(buffer.subarray(2));
    if (body.length % 2 === 0) body.swap16();
    return body.toString("utf16le");
  }
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString("utf8");
  }
  return buffer.toString("utf8");
}

export function detectMusicXmlFeatures(xml) {
  const tests = [
    ["lyrics", /<lyric(?:\s|>)/i],
    ["extenders", /<extend(?:\s|\/?>)/i],
    ["slurs", /<slur(?:\s|\/?>)/i],
    ["articulations", /<articulations(?:\s|\/?>)/i],
    ["dynamics", /<dynamics(?:\s|\/?>)/i],
    ["harmony", /<harmony(?:\s|\/?>)/i],
    ["beams", /<beam(?:\s|\/?>)/i],
    ["tuplets", /<tuplet(?:\s|\/?>)/i],
  ];
  const features = tests.filter(([, expression]) => expression.test(xml)).map(([name]) => name);
  const partCount = (xml.match(/<score-part(?:\s|>)/gi) || []).length;
  if (partCount > 1) features.push("multiple-parts");
  const staffCounts = [...xml.matchAll(/<staves>\s*(\d+)\s*<\/staves>/gi)].map((match) =>
    Number.parseInt(match[1], 10),
  );
  if (staffCounts.some((count) => count > 1)) features.push("multiple-staves");
  return features;
}

async function readMusicXmlText(scoreFile) {
  const bytes = fs.readFileSync(scoreFile);
  if (path.extname(scoreFile).toLowerCase() !== ".mxl") return decodeScore(bytes);
  const zip = await JSZip.loadAsync(bytes);
  const container = zip.file("META-INF/container.xml");
  let rootFile = null;
  if (container) {
    const containerXml = await container.async("string");
    rootFile = /<rootfile\b[^>]*\bfull-path\s*=\s*["']([^"']+)["']/i.exec(containerXml)?.[1];
  }
  const scoreEntry =
    (rootFile && zip.file(rootFile)) ||
    Object.values(zip.files).find(
      (entry) =>
        !entry.dir &&
        /\.(musicxml|xml)$/i.test(entry.name) &&
        entry.name.toLowerCase() !== "meta-inf/container.xml",
    );
  return scoreEntry ? scoreEntry.async("string") : "";
}

async function addScoreFeatures(descriptors) {
  return Promise.all(
    descriptors.map(async (descriptor) => ({
      ...descriptor,
      features: detectMusicXmlFeatures(await readMusicXmlText(descriptor.file)),
      sourceSha256: hashFile(descriptor.file),
    })),
  );
}

export function collectNonFiniteGeometryFaults(value, currentPath = "geometry", faults = []) {
  if (typeof value === "number") {
    const key = currentPath.split(".").at(-1) || "";
    const isGeometry =
      /(?:[XY]$|^(?:x|y)$|width|height|left|right|top|bottom|gap|distance|padding|position|size|spacing|anchor|shortfall)/i.test(
        key,
      );
    if (isGeometry && !Number.isFinite(value)) faults.push(currentPath);
    return faults;
  }
  if (!value || typeof value !== "object") return faults;
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectNonFiniteGeometryFaults(entry, `${currentPath}[${index}]`, faults),
    );
    return faults;
  }
  for (const [key, entry] of Object.entries(value)) {
    collectNonFiniteGeometryFaults(entry, `${currentPath}.${key}`, faults);
  }
  return faults;
}

async function renderScore({
  browser,
  bundle,
  fontCss,
  outputBase,
  scoreFile,
  visibility,
  width,
  lyricPaddingFactor,
  maximumLyricsElongationFactor,
  annotations,
  layers,
  runFingerprint,
  scoreId,
}) {
  const page = await browser.newPage({
    viewport: {
      width: width + 64,
      height: 900,
    },
  });
  const browserMessages = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      browserMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
    browserMessages.push(`pageerror: ${error.message}`);
  });
  await page.exposeFunction("__musicxmlLayoutSha256", (value) => sha256(value));

  try {
    await page.setContent(
      `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      ${fontCss}
      html, body { margin: 0; padding: 0; background: #fff; }
      body { width: ${width}px; overflow: visible; }
      #score { position: relative; width: ${width}px; background: #fff; }
      #score svg { display: block; }
    </style>
  </head>
  <body><div id="score"></div></body>
</html>`,
      { waitUntil: "load" },
    );
    const fontChecks = await page.evaluate(async () => {
      const requiredFonts = [
        { family: "Bravura", sample: "\uE0A4", specification: '30px "Bravura"' },
        { family: "Bravura Text", sample: "\uE870", specification: '30px "Bravura Text"' },
        { family: "Academico Regular", sample: "Ag", specification: '30px "Academico"' },
        {
          family: "Academico Italic",
          sample: "Ag",
          specification: 'italic 30px "Academico"',
        },
        {
          family: "Academico Bold",
          sample: "Ag",
          specification: '700 30px "Academico"',
        },
      ];
      const loadResults = await Promise.all(
        requiredFonts.map(async ({ family, sample, specification }) => {
          try {
            const faces = await document.fonts.load(specification, sample);
            return {
              check: document.fonts.check(specification, sample),
              error: null,
              family,
              loadedFaceCount: faces.length,
              loadedFaceStatuses: faces.map((face) => face.status),
              sample,
              specification,
            };
          } catch (error) {
            return {
              check: false,
              error: error instanceof Error ? error.message : String(error),
              family,
              loadedFaceCount: 0,
              loadedFaceStatuses: [],
              sample,
              specification,
            };
          }
        }),
      );
      await document.fonts.ready;
      return loadResults.map((result) => ({
        ...result,
        loaded:
          !result.error &&
          result.check &&
          result.loadedFaceCount > 0 &&
          result.loadedFaceStatuses.every((status) => status === "loaded"),
      }));
    });
    await page.addScriptTag({ path: bundle });

    const bytes = fs.readFileSync(scoreFile);
    const compressed = path.extname(scoreFile).toLowerCase() === ".mxl";
    const payload = compressed ? bytes.toString("base64") : decodeScore(bytes);
    const result = await page.evaluate(
      async ({
        compressed: isCompressed,
        filename,
        input,
        lyricPaddingFactor: requestedLyricPaddingFactor,
        maximumLyricsElongationFactor: requestedMaximumLyricsElongationFactor,
        requestedLayers,
        requestedVisibility,
      }) => {
        const lib = window.opensheetmusicdisplay;
        if (!lib?.OpenSheetMusicDisplay) {
          throw new Error("OpenSheetMusicDisplay browser bundle did not expose its API");
        }
        const container = document.getElementById("score");
        const osmd = new lib.OpenSheetMusicDisplay(container, {
          autoResize: false,
          backend: "svg",
          defaultColorLabel: "#181818",
          defaultColorMusic: "#111111",
          defaultColorNotehead: "#111111",
          defaultColorRest: "#111111",
          defaultColorStem: "#111111",
          defaultColorTitle: "#181818",
          defaultFontFamily: "Academico",
          drawComposer: false,
          drawCredits: false,
          drawLyricist: false,
          drawSubtitle: false,
          drawTitle: false,
          pageBackgroundColor: "#ffffff",
          pageFormat: "Endless",
        });
        osmd.TransposeCalculator = new lib.TransposeCalculator();
        let loadInput = input;
        if (isCompressed) {
          const binary = atob(input);
          const decoded = new Uint8Array(binary.length);
          for (let index = 0; index < binary.length; index += 1) {
            decoded[index] = binary.charCodeAt(index);
          }
          loadInput = new Blob([decoded], {
            type: "application/vnd.recordare.musicxml",
          });
        }
        await osmd.load(loadInput, filename);
        osmd.EngravingRules.SlurDiagnosticsLevel = requestedLayers.some((layer) =>
          [
            "slur-anchors",
            "slur-candidates",
            "slur-rejections",
            "slur-scores",
            "slur-selected",
          ].includes(layer),
        )
          ? "candidates"
          : requestedLayers.includes("slurs")
            ? "selected"
            : "off";
        if (Number.isFinite(requestedLyricPaddingFactor) && requestedLyricPaddingFactor > 0) {
          osmd.EngravingRules.LyricsXPaddingFactorForLongLyrics = requestedLyricPaddingFactor;
        }
        if (
          Number.isFinite(requestedMaximumLyricsElongationFactor) &&
          requestedMaximumLyricsElongationFactor >= 1
        ) {
          osmd.EngravingRules.MaximumLyricsElongationFactor =
            requestedMaximumLyricsElongationFactor;
        }

        const instruments = osmd.Sheet?.Instruments || [];
        const instrumentNames = instruments.map((instrument, index) => {
          const candidate =
            instrument?.Name ||
            instrument?.FullName ||
            instrument?.Label?.text ||
            instrument?.PartAbbreviation ||
            `Part ${index + 1}`;
          return String(candidate);
        });
        if (requestedVisibility === "vocal-only" && instruments.length > 1) {
          let pianoIndexes = instrumentNames
            .map((name, index) => (/piano|keyboard|accompaniment/i.test(name) ? index : -1))
            .filter((index) => index >= 0);
          if (pianoIndexes.length === 0) pianoIndexes = [instruments.length - 1];
          instruments.forEach((instrument, index) => {
            const visible = !pianoIndexes.includes(index);
            instrument.Visible = visible;
            for (const staff of instrument?.Staves || []) staff.Visible = visible;
            for (const voice of instrument?.Voices || []) voice.Visible = visible;
          });
        }

        const firstLayoutStarted = performance.now();
        osmd.updateGraphic();
        osmd.render();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const firstLayoutDurationMs = performance.now() - firstLayoutStarted;
        const captureRenderedSvg = async (pass) => {
          const directSvgs = [...container.querySelectorAll(":scope > svg")];
          const svgs = [...container.querySelectorAll("svg")];
          const geometryFaults = [];
          let geometryFaultCount = 0;
          const addGeometryFault = (fault) => {
            geometryFaultCount += 1;
            if (geometryFaults.length < 20) geometryFaults.push({ pass, ...fault });
          };
          const finite = (values, kind, elementIndex) => {
            values.forEach((value, valueIndex) => {
              if (!Number.isFinite(value)) {
                addGeometryFault({ elementIndex, kind, valueIndex, value: String(value) });
              }
            });
          };
          const primitives = [];
          const selector = "path,line,rect,circle,ellipse,polygon,polyline,text,tspan,use";
          svgs.forEach((svg, svgIndex) => {
            const viewBox = svg.viewBox?.baseVal;
            if (
              !viewBox ||
              ![viewBox.x, viewBox.y, viewBox.width, viewBox.height].every(Number.isFinite) ||
              viewBox.width <= 0 ||
              viewBox.height <= 0
            ) {
              addGeometryFault({ kind: "root-view-box", svgIndex });
            }
            [...svg.querySelectorAll(selector)].forEach((element, elementIndex) => {
              const style = getComputedStyle(element);
              if (style.display === "none" || style.visibility === "hidden") return;
              for (const attribute of element.attributes) {
                if (/(?:NaN|Infinity|undefined)/i.test(attribute.value)) {
                  addGeometryFault({
                    attribute: attribute.name,
                    elementIndex,
                    kind: "attribute",
                    value: attribute.value.slice(0, 160),
                  });
                }
              }
              const geometry = [];
              try {
                const box = element.getBBox();
                finite([box.x, box.y, box.width, box.height], "bbox", elementIndex);
                geometry.push(box.x, box.y, box.width, box.height);
              } catch (error) {
                addGeometryFault({
                  elementIndex,
                  kind: "bbox-error",
                  value: error instanceof Error ? error.message : String(error),
                });
              }
              const client = element.getBoundingClientRect();
              finite(
                [client.x, client.y, client.width, client.height],
                "client-rect",
                elementIndex,
              );
              geometry.push(client.x, client.y, client.width, client.height);
              const matrix = element.getCTM?.();
              if (matrix) {
                finite(
                  [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
                  "ctm",
                  elementIndex,
                );
                geometry.push(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
              }
              const attributes = [...element.attributes]
                .filter((attribute) => attribute.name !== "id")
                .sort((left, right) => left.name.localeCompare(right.name))
                .map(
                  (attribute) =>
                    `${attribute.name}=${attribute.value.replace(/vf-auto\d+/g, "vf-auto#")}`,
                )
                .join(";");
              const numbers = [...attributes.matchAll(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)].map(
                (match) => Number(match[0]),
              );
              primitives.push({
                attributes: attributes.replace(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi, "#"),
                geometry,
                numbers,
                tag: element.tagName,
                text: [...element.childNodes]
                  .filter((node) => node.nodeType === Node.TEXT_NODE)
                  .map((node) => node.textContent)
                  .join(""),
              });
            });
          });
          const serialized = svgs
            .map((svg) =>
              new XMLSerializer().serializeToString(svg).replace(/vf-auto\d+/g, "vf-auto#"),
            )
            .join("\n");
          const digest = await window.__musicxmlLayoutSha256(serialized);
          return {
            directSvgCount: directSvgs.length,
            geometryFaultCount,
            geometryFaults,
            primitives,
            sha256: digest,
            svgCount: svgs.length,
          };
        };
        const compareRenderSnapshots = (first, second) => {
          const mismatches = [];
          let mismatchCount = 0;
          let maxDelta = 0;
          const addMismatch = (mismatch) => {
            mismatchCount += 1;
            if (mismatches.length < 20) mismatches.push(mismatch);
          };
          if (
            first.svgCount !== second.svgCount ||
            first.directSvgCount !== second.directSvgCount ||
            first.primitives.length !== second.primitives.length
          ) {
            addMismatch({
              first: [first.directSvgCount, first.svgCount, first.primitives.length],
              kind: "topology",
              second: [second.directSvgCount, second.svgCount, second.primitives.length],
            });
          }
          const count = Math.min(first.primitives.length, second.primitives.length);
          for (let index = 0; index < count; index += 1) {
            const left = first.primitives[index];
            const right = second.primitives[index];
            if (
              left.tag !== right.tag ||
              left.text !== right.text ||
              left.attributes !== right.attributes ||
              left.numbers.length !== right.numbers.length ||
              left.geometry.length !== right.geometry.length
            ) {
              addMismatch({ index, kind: "structure" });
              continue;
            }
            const compareNumbers = (leftValues, rightValues, kind) => {
              for (let valueIndex = 0; valueIndex < leftValues.length; valueIndex += 1) {
                const delta = Math.abs(leftValues[valueIndex] - rightValues[valueIndex]);
                maxDelta = Math.max(maxDelta, delta);
                const isCtmScale = kind === "geometry" && valueIndex >= 8 && valueIndex <= 11;
                if (delta > (isCtmScale ? 0.000001 : 0.05)) {
                  addMismatch({ delta, index, kind, valueIndex });
                  break;
                }
              }
            };
            compareNumbers(left.numbers, right.numbers, "attributes");
            compareNumbers(left.geometry, right.geometry, "geometry");
          }
          return { drift: mismatchCount > 0, maxDelta, mismatchCount, mismatches };
        };
        const firstRender = await captureRenderedSvg("first");
        // Exercise the same rebuild path used by viewer resets, visibility
        // changes, and transposition. Corpus output should reflect a stable
        // rerender, not only the first graphical calculation after load.
        const secondLayoutStarted = performance.now();
        osmd.updateGraphic();
        osmd.render();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const secondLayoutDurationMs = performance.now() - secondLayoutStarted;
        const secondRender = await captureRenderedSvg("second");
        const renderComparison = compareRenderSnapshots(firstRender, secondRender);

        const rules = osmd.EngravingRules;
        const lyricEntries = [];
        const lyricPairs = [];
        const contextGaps = [];
        const layoutPaddingColumns = [];
        const lyricConnectors = [];
        const lyricDashes = [];
        const measureMetrics = [];
        const slurArticulations = [];
        const slurSegments = [];
        const skylineProfiles = [];
        const systemGeometries = [];
        const pages = osmd.GraphicSheet?.MusicPages || [];
        const horizontalSpacing = osmd.GraphicSheet?.HorizontalSpacingDiagnostics || null;
        let globalSystemIndex = 0;

        for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
          const systems = pages[pageIndex]?.MusicSystems || [];
          for (let systemIndex = 0; systemIndex < systems.length; systemIndex += 1) {
            const staffLines = systems[systemIndex]?.StaffLines || [];
            const firstStaffLineBox = staffLines[0]?.PositionAndShape;
            if (firstStaffLineBox) {
              const lastMeasureBox = staffLines[0]?.Measures?.at(-1)?.PositionAndShape;
              const usedWidth =
                Number(lastMeasureBox?.RelativePosition?.x || 0) +
                Number(lastMeasureBox?.Size?.width || 0);
              systemGeometries.push({
                heightPx: Number(firstStaffLineBox.Size?.height || 0) * 10,
                systemIndex: globalSystemIndex,
                widthPx:
                  (usedWidth > 0 ? usedWidth : Number(firstStaffLineBox.Size?.width || 0)) * 10,
                xPx: Number(firstStaffLineBox.AbsolutePosition?.x || 0) * 10,
                yPx: Number(firstStaffLineBox.AbsolutePosition?.y || 0) * 10,
              });
            }
            globalSystemIndex += 1;
            for (let staffLineIndex = 0; staffLineIndex < staffLines.length; staffLineIndex += 1) {
              const staffLine = staffLines[staffLineIndex];
              const staffLineLyricEntries = [];
              const collectedPaddingContexts = new Set();
              const staffLinePosition = staffLine?.PositionAndShape?.AbsolutePosition || {};
              const staffLineAbsoluteX = Number(staffLinePosition.x || 0);
              const staffLineAbsoluteY = Number(staffLinePosition.y || 0);
              const absolutePoint = (point) =>
                point
                  ? {
                      x: (staffLineAbsoluteX + Number(point.x || 0)) * 10,
                      y: (staffLineAbsoluteY + Number(point.y || 0)) * 10,
                    }
                  : null;
              const absoluteBounds = (bounds) =>
                bounds
                  ? {
                      bottom: (staffLineAbsoluteY + Number(bounds.bottom || 0)) * 10,
                      left: (staffLineAbsoluteX + Number(bounds.left || 0)) * 10,
                      right: (staffLineAbsoluteX + Number(bounds.right || 0)) * 10,
                      top: (staffLineAbsoluteY + Number(bounds.top || 0)) * 10,
                    }
                  : null;

              if (requestedLayers.includes("lyrics")) {
                for (const dash of staffLine?.LyricsDashes || []) {
                  const position = dash?.PositionAndShape?.AbsolutePosition || {};
                  lyricDashes.push({
                    connected: Boolean(dash?.SVGNode?.isConnected),
                    pageIndex,
                    staffLineIndex,
                    systemIndex: globalSystemIndex - 1,
                    x: Number(position.x || 0),
                    y: Number(position.y || 0),
                  });
                }
                for (const line of staffLine?.LyricLines || []) {
                  lyricConnectors.push({
                    // GraphicalLine geometry remains staff-relative and is
                    // converted here exactly as the idempotent drawer does.
                    endX: staffLineAbsoluteX + Number(line?.End?.x || 0),
                    pageIndex,
                    staffLineIndex,
                    startX: staffLineAbsoluteX + Number(line?.Start?.x || 0),
                    systemIndex: globalSystemIndex - 1,
                    y: staffLineAbsoluteY + Number(line?.Start?.y || 0),
                  });
                }
              }

              if (
                requestedLayers.includes("slurs") ||
                requestedLayers.includes("articulations") ||
                requestedLayers.some((layer) => layer.startsWith("slur-"))
              ) {
                for (const slur of staffLine?.GraphicalSlurs || []) {
                  const slurDiagnostics = slur?.diagnostics || {};
                  const points = {
                    end: absolutePoint(slur?.bezierEndPt),
                    endControl: absolutePoint(slur?.bezierEndControlPt),
                    start: absolutePoint(slur?.bezierStartPt),
                    startControl: absolutePoint(slur?.bezierStartControlPt),
                  };
                  const startNotehead = absoluteBounds(slurDiagnostics.startNotehead);
                  const endNotehead = absoluteBounds(slurDiagnostics.endNotehead);
                  const layoutContext = slur?.layoutContext;
                  const layoutResult = slur?.layoutResult;
                  const candidateGeometry = (geometry) =>
                    geometry
                      ? {
                          end: absolutePoint(geometry.p3),
                          endControl: absolutePoint(geometry.p2),
                          start: absolutePoint(geometry.p0),
                          startControl: absolutePoint(geometry.p1),
                        }
                      : null;
                  slurSegments.push({
                    anchors: (layoutResult?.candidates || []).flatMap((candidate) => [
                      {
                        ...candidate.startAnchor,
                        x: (staffLineAbsoluteX + Number(candidate.startAnchor?.x || 0)) * 10,
                        y: (staffLineAbsoluteY + Number(candidate.startAnchor?.y || 0)) * 10,
                      },
                      {
                        ...candidate.endAnchor,
                        x: (staffLineAbsoluteX + Number(candidate.endAnchor?.x || 0)) * 10,
                        y: (staffLineAbsoluteY + Number(candidate.endAnchor?.y || 0)) * 10,
                      },
                    ]),
                    candidateCount: Number(slurDiagnostics.candidateCount || 0),
                    candidates: (layoutResult?.candidates || []).map((candidate) => ({
                      family: candidate.family,
                      generationIndex: candidate.generationIndex,
                      geometry: candidateGeometry(candidate.geometry),
                      id: candidate.id,
                      rejected: Boolean(candidate.rejected),
                      rejectionReason: candidate.rejectionReason || null,
                      rejectionObstacleIds: candidate.rejectionObstacleIds || [],
                      score: candidate.score || null,
                    })),
                    endAttachment: slurDiagnostics.endAttachment || null,
                    endNotehead,
                    measureNumber: Number(
                      slur?.staffEntries?.[0]?.parentMeasure?.MeasureNumber ?? NaN,
                    ),
                    pageIndex,
                    placement: Number(slurDiagnostics.placement ?? NaN),
                    placementCandidateScores: slurDiagnostics.placementCandidateScores || null,
                    points,
                    faults: slurDiagnostics.faults || [],
                    structuredFaults: slurDiagnostics.structuredFaults || [],
                    linkedGroupId: slurDiagnostics.linkedGroupId || null,
                    continuationClearance: Number.isFinite(
                      Number(slurDiagnostics.continuationClearance),
                    )
                      ? Number(slurDiagnostics.continuationClearance) * 10
                      : null,
                    linkedTangentMismatch: Number.isFinite(
                      Number(slurDiagnostics.linkedTangentMismatch),
                    )
                      ? Number(slurDiagnostics.linkedTangentMismatch) * 10
                      : null,
                    obstacles: (layoutContext?.obstacles || []).map((obstacle) => ({
                      ...obstacle,
                      bounds: absoluteBounds(obstacle.bounds),
                      polygon: Array.isArray(obstacle.polygon)
                        ? obstacle.polygon.map(absolutePoint).filter(Boolean)
                        : undefined,
                    })),
                    selectedCandidateId:
                      slurDiagnostics.selectedCandidateId ||
                      layoutResult?.selectedCandidateId ||
                      null,
                    segmentCount: Number(slurDiagnostics.segmentCount || 1),
                    segmentIndex: Number(slurDiagnostics.segmentIndex || 0),
                    staffLineIndex,
                    startAttachment: slurDiagnostics.startAttachment || null,
                    startNotehead,
                    systemIndex: globalSystemIndex - 1,
                    unsupportedRouting: slurDiagnostics.unsupportedRouting || null,
                  });
                  for (const shift of slurDiagnostics.articulationShifts || []) {
                    const notehead = shift.endpoint === "start" ? startNotehead : endNotehead;
                    const attachment =
                      notehead && Number.isFinite(Number(slurDiagnostics.placement))
                        ? {
                            x: shift.endpoint === "start" ? notehead.right : notehead.left,
                            y:
                              Number(slurDiagnostics.placement) === 0
                                ? notehead.top - Number(rules.SlurNoteHeadYOffset || 0) * 10
                                : notehead.bottom + Number(rules.SlurNoteHeadYOffset || 0) * 10,
                          }
                        : null;
                    slurArticulations.push({
                      attachment,
                      bounds: absoluteBounds(shift.bounds),
                      endpoint: shift.endpoint,
                      finalShiftPx: Number(shift.finalShiftPx || 0),
                      glyph: String(shift.glyph || ""),
                      measureNumber: Number(
                        slur?.staffEntries?.[0]?.parentMeasure?.MeasureNumber ?? NaN,
                      ),
                      pageIndex,
                      previousShiftPx: Number(shift.previousShiftPx || 0),
                      staffLineIndex,
                      systemIndex: globalSystemIndex - 1,
                      type: String(shift.type || "unknown"),
                    });
                  }
                }

                // Grace-note slurs are VexFlow modifiers rather than OSMD
                // GraphicalSlurs. Collect the finalized geometry exposed by
                // GraceNoteGroup so they participate in the same visual and
                // objective-fault diagnostics instead of remaining invisible
                // to the slur harness.
                for (const measure of staffLine?.Measures || []) {
                  for (const staffEntry of measure?.staffEntries || []) {
                    for (const voiceEntry of staffEntry?.graphicalVoiceEntries || []) {
                      const vfNote = voiceEntry?.vfStaveNote;
                      for (const modifier of vfNote?.getModifiers?.() || []) {
                        if (modifier?.getCategory?.() !== "GraceNoteGroup") continue;
                        const graceLayout = modifier.getSlurLayout?.();
                        if (!graceLayout) continue;
                        for (
                          let curveIndex = 0;
                          curveIndex < graceLayout.curves.length;
                          curveIndex += 1
                        ) {
                          const curve = graceLayout.curves[curveIndex];
                          const cubicControl = (from, control) => ({
                            x: Number(from.x) + (2 / 3) * (Number(control.x) - Number(from.x)),
                            y: Number(from.y) + (2 / 3) * (Number(control.y) - Number(from.y)),
                          });
                          const points = {
                            start: curve.start,
                            startControl: cubicControl(curve.start, curve.topControl),
                            endControl: cubicControl(curve.end, curve.topControl),
                            end: curve.end,
                          };
                          const intersectionIds = graceLayout.intersectedEndpointIds || [];
                          const candidateId = `grace-${measure?.MeasureNumber}-${curveIndex}`;
                          const placement =
                            Number(curve.topControl.y) <
                            (Number(curve.start.y) + Number(curve.end.y)) / 2
                              ? 0
                              : 1;
                          slurSegments.push({
                            anchors: [
                              {
                                id: "grace-start",
                                type: graceLayout.startAttachment || "notehead",
                                ...curve.start,
                              },
                              {
                                id: "grace-end",
                                type: graceLayout.endAttachment || "notehead",
                                ...curve.end,
                              },
                            ],
                            candidateCount: 1,
                            candidates: [
                              {
                                family: "normal",
                                generationIndex: 0,
                                geometry: points,
                                id: candidateId,
                                rejected: intersectionIds.length > 0,
                                rejectionReason:
                                  intersectionIds.length > 0 ? "obstacle-intersection" : null,
                                rejectionObstacleIds: intersectionIds,
                                score: null,
                              },
                            ],
                            endAttachment: graceLayout.endAttachment || "notehead",
                            endNotehead: graceLayout.endNotehead,
                            faults: intersectionIds.map(
                              (id) => `grace-slur-notehead-intersection:${id}`,
                            ),
                            kind: "grace",
                            linkedGroupId: null,
                            measureNumber: Number(measure?.MeasureNumber ?? NaN),
                            mode: "vexflow-grace",
                            obstacles: [
                              {
                                bounds: graceLayout.startNotehead,
                                id: "start-notehead",
                                type: "notehead",
                              },
                              {
                                bounds: graceLayout.endNotehead,
                                id: "end-notehead",
                                type: "notehead",
                              },
                            ],
                            pageIndex,
                            placement,
                            points,
                            selectedCandidateId: candidateId,
                            segmentCount: 1,
                            segmentIndex: 0,
                            staffLineIndex,
                            startAttachment: graceLayout.startAttachment || "notehead",
                            startNotehead: graceLayout.startNotehead,
                            structuredFaults: [],
                            systemIndex: globalSystemIndex - 1,
                            unsupportedRouting: null,
                          });
                        }
                      }
                    }
                  }
                }
              }

              if (requestedLayers.includes("skyline")) {
                const samplingUnit = Number(staffLine?.SkyBottomLineCalculator?.SamplingUnit || 1);
                const skyline = staffLine?.SkyLine || [];
                const bottomline = staffLine?.BottomLine || [];
                const length = Math.max(skyline.length, bottomline.length);
                const stride = Math.max(1, Math.ceil(length / 320));
                const profile = (values) => {
                  const points = [];
                  for (let index = 0; index < values.length; index += stride) {
                    points.push({
                      x: (staffLineAbsoluteX + index / samplingUnit) * 10,
                      y: (staffLineAbsoluteY + Number(values[index] || 0)) * 10,
                    });
                  }
                  if (values.length > 1 && (values.length - 1) % stride !== 0) {
                    points.push({
                      x: (staffLineAbsoluteX + (values.length - 1) / samplingUnit) * 10,
                      y: (staffLineAbsoluteY + Number(values[values.length - 1] || 0)) * 10,
                    });
                  }
                  return points;
                };
                skylineProfiles.push({
                  bottomline: profile(bottomline),
                  pageIndex,
                  skyline: profile(skyline),
                  staffLineIndex,
                  systemIndex: globalSystemIndex - 1,
                });
              }
              for (const measure of staffLine?.Measures || []) {
                const measurePosition = measure?.PositionAndShape?.AbsolutePosition || {};
                for (const staffEntry of measure?.staffEntries || []) {
                  const staffPosition = staffEntry?.PositionAndShape?.RelativePosition || {};
                  for (const voiceEntry of staffEntry?.graphicalVoiceEntries || []) {
                    const note = voiceEntry?.vfStaveNote;
                    const context = note?.getTickContext?.();
                    if (!context || collectedPaddingContexts.has(context)) continue;
                    collectedPaddingContexts.add(context);
                    const contextMetrics = context.getMetrics?.() || {};
                    const leftPx = Number(contextMetrics.layoutPaddingLeftPx || 0);
                    const rightPx = Number(contextMetrics.layoutPaddingRightPx || 0);
                    const hardWidthPx = Number(context.getLayoutPaddingWidth?.() || 0);
                    if (leftPx <= 0.01 && rightPx <= 0.01 && hardWidthPx <= 0.01) continue;
                    layoutPaddingColumns.push({
                      anchorXPx:
                        (Number(measurePosition.x || 0) + Number(staffPosition.x || 0)) * 10,
                      hardWidthPx,
                      isRest: !!voiceEntry?.notes?.[0]?.sourceNote?.isRest?.(),
                      leftPx,
                      measureNumber: Number(measure?.MeasureNumber ?? NaN),
                      pageIndex,
                      rightPx,
                      staffLineIndex,
                      systemIndex,
                      yPx: (Number(measurePosition.y || 0) + 0.35) * 10,
                    });
                  }
                  for (const lyricEntry of staffEntry?.LyricsEntries || []) {
                    const labelBox = lyricEntry?.GraphicalLabel?.PositionAndShape;
                    if (!labelBox) continue;
                    const labelPosition = labelBox.RelativePosition || {};
                    const anchorX =
                      Number(measurePosition.x || 0) +
                      Number(staffPosition.x || 0) +
                      Number(labelPosition.x || 0);
                    const anchorY =
                      Number(measurePosition.y || 0) +
                      Number(staffPosition.y || 0) +
                      Number(labelPosition.y || 0);
                    const lineIdentity =
                      lyricEntry.getLineIdentity?.() ||
                      `verse:${lyricEntry?.LyricsEntry?.VerseNumber || "1"}`;
                    // A chorus can be centred into the same rendered row as a
                    // numbered verse. Semantic line identities are useful for
                    // layout bookkeeping, but collision detection must follow
                    // the final visible geometry across that hand-off.
                    const visualRowIdentity = `y:${(Math.round(anchorY * 20) / 20).toFixed(2)}`;
                    const owningVoiceEntry = (staffEntry?.graphicalVoiceEntries || []).find(
                      (entry) =>
                        entry?.parentVoiceEntry === lyricEntry?.LyricsEntry?.Parent &&
                        entry?.vfStaveNote,
                    );
                    const layoutPadding = owningVoiceEntry?.vfStaveNote?.getLayoutPadding?.() || {};
                    const bodyFootprint = lyricEntry.getBodyFootprint?.(
                      Number(staffPosition.x || 0),
                    );
                    const bodyAnchorX = bodyFootprint
                      ? Number(measurePosition.x || 0) + Number(bodyFootprint.anchorX || 0)
                      : anchorX;
                    const bodyLeft = bodyFootprint
                      ? Number(measurePosition.x || 0) + Number(bodyFootprint.leftEdgeX || 0)
                      : anchorX + Number(labelBox.BorderLeft || 0);
                    const bodyRight = bodyFootprint
                      ? Number(measurePosition.x || 0) + Number(bodyFootprint.rightEdgeX || 0)
                      : anchorX + Number(labelBox.BorderRight || 0);
                    const sourceLyric = lyricEntry?.LyricsEntry;
                    const graphicalWordEntries =
                      lyricEntry?.ParentLyricWord?.GraphicalLyricsEntries || [];
                    const metric = {
                      alignmentMode: String(sourceLyric?.AlignmentMode || "center"),
                      anchorX,
                      anchorY,
                      bodyAnchorX,
                      bodyLeft,
                      bodyRight,
                      bottom: anchorY + Number(labelBox.BorderBottom || 0),
                      extendType: String(sourceLyric?.ExtendType || "none"),
                      hasDash: !!lyricEntry.hasDashFromLyricWord?.(),
                      id: lyricEntries.length,
                      isChorus: !!lyricEntry?.LyricsEntry?.IsChorus,
                      isMelismatic: !!sourceLyric?.IsMelismatic,
                      layoutPaddingLeftPx: Number(layoutPadding.leftPx || 0),
                      layoutPaddingRightPx: Number(layoutPadding.rightPx || 0),
                      left: anchorX + Number(labelBox.BorderLeft || 0),
                      lineIdentity,
                      measureAbsoluteX: Number(measurePosition.x || 0),
                      measureBeginInstructionsWidth: Number(measure?.beginInstructionsWidth || 0),
                      measureNumber: Number(measure?.MeasureNumber ?? NaN),
                      measureWidth: Number(measure?.PositionAndShape?.Size?.width || 0),
                      pageIndex,
                      right: anchorX + Number(labelBox.BorderRight || 0),
                      staffEntryRelativeX: Number(staffPosition.x || 0),
                      staffLineIndex,
                      stanzaNumberPrefix: String(sourceLyric?.StanzaNumberPrefix || ""),
                      syllabic: String(sourceLyric?.Syllabic || "single"),
                      systemIndex,
                      text: String(lyricEntry?.LyricsEntry?.Text || ""),
                      lyricText: String(sourceLyric?.LyricText || sourceLyric?.Text || ""),
                      timestamp: Number(staffEntry?.relInMeasureTimestamp?.RealValue ?? NaN),
                      top: anchorY + Number(labelBox.BorderTop || 0),
                      dashWidth: Number(lyricEntry.getDashWidth?.() || 0),
                      vexFlowContextX: Number(
                        owningVoiceEntry?.vfStaveNote?.getTickContext?.()?.getX?.() ?? NaN,
                      ),
                      vexFlowNoteheadBeginX: Number(
                        owningVoiceEntry?.vfStaveNote?.getNoteHeadBeginX?.() ?? NaN,
                      ),
                      vexFlowNoteheadEndX: Number(
                        owningVoiceEntry?.vfStaveNote?.getNoteHeadEndX?.() ?? NaN,
                      ),
                      visualRowIdentity,
                      wordEntryCount: graphicalWordEntries.length,
                      wordEntryIndex: graphicalWordEntries.indexOf(lyricEntry),
                    };
                    lyricEntries.push(metric);
                    staffLineLyricEntries.push(metric);
                  }
                }
              }

              staffLineLyricEntries.sort(
                (left, right) =>
                  left.left - right.left ||
                  left.measureNumber - right.measureNumber ||
                  left.timestamp - right.timestamp,
              );
              for (let index = 1; index < staffLineLyricEntries.length; index += 1) {
                const current = staffLineLyricEntries[index];
                let previous = null;
                for (let candidateIndex = 0; candidateIndex < index; candidateIndex += 1) {
                  const candidate = staffLineLyricEntries[candidateIndex];
                  const verticalOverlap =
                    Math.min(candidate.bottom, current.bottom) -
                    Math.max(candidate.top, current.top);
                  if (verticalOverlap <= 0.01) continue;
                  if (
                    !previous ||
                    candidate.right > previous.right ||
                    (candidate.right === previous.right && candidate.left > previous.left)
                  ) {
                    previous = candidate;
                  }
                }
                if (!previous) continue;
                const isSemanticContinuation = previous.lineIdentity === current.lineIdentity;
                const requiredGap = previous.hasDash
                  ? Number(rules.BetweenSyllableMinimumDistance || 0) + previous.dashWidth
                  : Number(rules.HorizontalBetweenLyricsDistance || 0);
                const actualGap = current.left - previous.right;
                lyricPairs.push({
                  actualGap,
                  collision: actualGap < -0.01,
                  from: previous,
                  isSemanticContinuation,
                  requiredGap,
                  shortfall: actualGap + 0.01 < requiredGap,
                  to: current,
                  visualRowIdentity: `${previous.visualRowIdentity}→${current.visualRowIdentity}`,
                });
              }
            }
          }
        }

        const measureList = osmd.GraphicSheet?.MeasureList || osmd.GraphicSheet?.measureList || [];
        for (
          let sourceMeasureIndex = 0;
          sourceMeasureIndex < measureList.length;
          sourceMeasureIndex += 1
        ) {
          const verticalMeasures = (measureList[sourceMeasureIndex] || []).filter(
            (measure) => measure?.isVisible?.() !== false,
          );
          const contexts = new Set();
          for (const measure of verticalMeasures) {
            for (const staffEntry of measure?.staffEntries || []) {
              for (const voiceEntry of staffEntry?.graphicalVoiceEntries || []) {
                const context = voiceEntry?.vfStaveNote?.getTickContext?.();
                if (context) contexts.add(context);
              }
            }
          }
          const orderedContexts = [...contexts].sort((left, right) => left.getX() - right.getX());
          for (let index = 1; index < orderedContexts.length; index += 1) {
            const previous = orderedContexts[index - 1];
            const current = orderedContexts[index];
            const previousMetrics = previous.getMetrics();
            const currentMetrics = current.getMetrics();
            const rightEdge =
              previous.getX() + previousMetrics.notePx + previousMetrics.totalRightPx;
            const leftEdge = current.getX() - currentMetrics.totalLeftPx;
            contextGaps.push({
              currentLayoutPaddingLeftPx: currentMetrics.layoutPaddingLeftPx,
              currentLayoutPaddingWidthPx: Number(current.getLayoutPaddingWidth?.() || 0),
              gapPx: leftEdge - rightEdge,
              measureNumber: Number(verticalMeasures[0]?.MeasureNumber ?? sourceMeasureIndex + 1),
              previousLayoutPaddingRightPx: previousMetrics.layoutPaddingRightPx,
              previousLayoutPaddingWidthPx: Number(previous.getLayoutPaddingWidth?.() || 0),
              sourceMeasureIndex,
            });
          }
          const representative = verticalMeasures[0];
          if (representative) {
            measureMetrics.push({
              finalStaffEntriesWidthPx:
                (Number(representative?.PositionAndShape?.Size?.width || 0) -
                  Number(representative?.beginInstructionsWidth || 0) -
                  Number(representative?.endInstructionsWidth || 0)) *
                10,
              measureNumber: Number(representative.MeasureNumber ?? sourceMeasureIndex + 1),
              hardLayoutPaddingWidthPx: orderedContexts.reduce(
                (sum, context) => sum + Number(context.getLayoutPaddingWidth?.() || 0),
                0,
              ),
              minimumStaffEntriesWidthPx: Number(representative.minimumStaffEntriesWidth || 0) * 10,
              sourceMeasureIndex,
            });
          }
        }

        const lyricConnectorPairs = lyricConnectors.flatMap((connector) => {
          const nextEntry = lyricEntries
            .filter(
              (entry) =>
                entry.pageIndex === connector.pageIndex &&
                entry.systemIndex === connector.systemIndex &&
                entry.staffLineIndex === connector.staffLineIndex &&
                entry.bodyAnchorX > connector.endX + 0.01 &&
                Math.abs(entry.bottom - connector.y) < 1,
            )
            .sort((left, right) => left.bodyAnchorX - right.bodyAnchorX)[0];
          if (!nextEntry) return [];
          const requiredGap = Number(rules.BetweenSyllableMinimumDistance || 0);
          const actualGap = nextEntry.left - connector.endX;
          return [
            {
              actualGap,
              collision: actualGap < -0.01,
              connector,
              requiredGap,
              shortfall: actualGap + 0.01 < requiredGap,
              to: nextEntry,
            },
          ];
        });
        const collisions = lyricPairs.filter((pair) => pair.collision);
        const shortfalls = lyricPairs.filter((pair) => pair.shortfall);
        const connectorCollisions = lyricConnectorPairs.filter((pair) => pair.collision);
        const connectorShortfalls = lyricConnectorPairs.filter((pair) => pair.shortfall);
        const negativeContextGaps = contextGaps.filter((entry) => entry.gapPx < -0.01);
        const negativePaddedContextGaps = negativeContextGaps.filter(
          (entry) =>
            entry.previousLayoutPaddingRightPx > 0.01 || entry.currentLayoutPaddingLeftPx > 0.01,
        );
        const problemEntries = new Map();
        for (const pair of shortfalls) {
          const severity = pair.collision ? "collision" : "shortfall";
          for (const entry of [pair.from, pair.to]) {
            const existing = problemEntries.get(entry.id);
            if (existing !== "collision") problemEntries.set(entry.id, severity);
          }
        }
        for (const pair of connectorShortfalls) {
          const severity = pair.collision ? "collision" : "shortfall";
          const existing = problemEntries.get(pair.to.id);
          if (existing !== "collision") problemEntries.set(pair.to.id, severity);
        }
        const problemBoxes = [...problemEntries].map(([id, severity]) => ({
          ...lyricEntries[id],
          severity,
        }));

        return {
          diagnostics: {
            contextGaps,
            horizontalSpacing,
            instrumentNames,
            layoutPaddingColumns,
            lyricConnectors,
            lyricConnectorPairs,
            lyricDashes,
            lyricEntries,
            lyricPairs,
            measureMetrics,
            problemBoxes,
            slurArticulations,
            slurSegments,
            skylineProfiles,
            rules: {
              betweenSyllableMinimumDistance: Number(rules.BetweenSyllableMinimumDistance || 0),
              horizontalBetweenLyricsDistance: Number(rules.HorizontalBetweenLyricsDistance || 0),
              maximumLyricsElongationFactor: Number(rules.MaximumLyricsElongationFactor || 0),
              voiceSpacingMultiplierVexflow: Number(rules.VoiceSpacingMultiplierVexflow || 0),
            },
            systemGeometries,
            renderStability: {
              ...renderComparison,
              exactHashChanged: firstRender.sha256 !== secondRender.sha256,
              first: {
                directSvgCount: firstRender.directSvgCount,
                geometryFaultCount: firstRender.geometryFaultCount,
                geometryFaults: firstRender.geometryFaults,
                sha256: firstRender.sha256,
                svgCount: firstRender.svgCount,
              },
              second: {
                directSvgCount: secondRender.directSvgCount,
                geometryFaultCount: secondRender.geometryFaultCount,
                geometryFaults: secondRender.geometryFaults,
                sha256: secondRender.sha256,
                svgCount: secondRender.svgCount,
              },
            },
            performance: {
              firstLayoutDurationMs,
              secondLayoutDurationMs,
            },
            summary: {
              collisionCount: collisions.length,
              connectorCollisionCount: connectorCollisions.length,
              connectorShortfallCount: connectorShortfalls.length,
              contextOverlapCount: negativeContextGaps.length,
              hardSpacingWidthPx: Number(horizontalSpacing?.addedWidthPx || 0),
              paddedContextOverlapCount: negativePaddedContextGaps.length,
              lyricEntryCount: lyricEntries.length,
              lyricPairCount: lyricPairs.length,
              slurEndpointArticulationCount: slurArticulations.length,
              slurSegmentCount: slurSegments.length,
              minimumActualGap:
                lyricPairs.length > 0
                  ? Math.min(...lyricPairs.map((pair) => pair.actualGap))
                  : null,
              minimumConnectorGap:
                lyricConnectorPairs.length > 0
                  ? Math.min(...lyricConnectorPairs.map((pair) => pair.actualGap))
                  : null,
              shortfallCount: shortfalls.length,
              unsupportedSlurRoutingCount: slurSegments.filter(
                (segment) => segment.unsupportedRouting,
              ).length,
              slurLayoutFaultCount: slurSegments.reduce(
                (count, segment) => count + Number(segment.faults?.length || 0),
                0,
              ),
              structuredSlurFaultCount: slurSegments.reduce(
                (count, segment) => count + Number(segment.structuredFaults?.length || 0),
                0,
              ),
              worstShortfall:
                shortfalls.length > 0
                  ? Math.max(...shortfalls.map((pair) => pair.requiredGap - pair.actualGap))
                  : 0,
            },
          },
          svgCount: container.querySelectorAll("svg").length,
        };
      },
      {
        compressed,
        filename: path.basename(scoreFile),
        input: payload,
        lyricPaddingFactor,
        maximumLyricsElongationFactor,
        requestedLayers: layers,
        requestedVisibility: visibility,
      },
    );

    const score = page.locator("#score");
    await score.screenshot({ path: `${outputBase}.png`, animations: "disabled" });
    const plainSvg = await page.evaluate((embeddedFontCss) => {
      const svg = document.querySelector("#score svg");
      if (!svg) throw new Error("OSMD did not produce an SVG");
      const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
      style.setAttribute("data-corpus-fonts", "true");
      style.textContent = embeddedFontCss;
      svg.insertBefore(style, svg.firstChild);
      return new XMLSerializer().serializeToString(svg);
    }, fontCss);
    fs.writeFileSync(`${outputBase}.svg`, plainSvg);

    const annotatedSvg = await page.evaluate(
      ({
        annotationLayers,
        annotationMode,
        horizontalSpacing,
        layoutPaddingColumns,
        lyricConnectors,
        lyricEntries,
        problemBoxes,
        slurArticulations,
        slurSegments,
        skylineProfiles,
        systemGeometries,
      }) => {
        const svg = document.querySelector("#score svg");
        if (!svg) throw new Error("OSMD did not produce an SVG");
        const namespace = "http://www.w3.org/2000/svg";
        const group = document.createElementNS(namespace, "g");
        group.setAttribute("data-lyric-layout-diagnostics", "true");
        group.setAttribute("data-musicxml-layout-diagnostics", "true");
        group.setAttribute("data-annotation-mode", annotationMode);
        group.setAttribute("data-diagnostic-layers", annotationLayers.join(","));
        group.setAttribute("pointer-events", "none");
        if (annotationLayers.includes("problems")) {
          for (const box of problemBoxes) {
            const rect = document.createElementNS(namespace, "rect");
            const left = Number(box.left) * 10 - 2;
            const top = Number(box.top) * 10 - 2;
            const right = Number(box.right) * 10 + 2;
            const bottom = Number(box.bottom) * 10 + 2;
            rect.setAttribute("x", String(left));
            rect.setAttribute("y", String(top));
            rect.setAttribute("width", String(Math.max(4, right - left)));
            rect.setAttribute("height", String(Math.max(10, bottom - top)));
            rect.setAttribute("fill", "none");
            rect.setAttribute("stroke", box.severity === "collision" ? "#d00000" : "#ef8b00");
            rect.setAttribute("stroke-width", "2");
            rect.setAttribute("vector-effect", "non-scaling-stroke");
            group.appendChild(rect);
          }
        }
        if (annotationLayers.includes("lyrics")) {
          for (const connector of lyricConnectors) {
            const line = document.createElementNS(namespace, "line");
            line.setAttribute("x1", String(Number(connector.startX) * 10));
            line.setAttribute("x2", String(Number(connector.endX) * 10));
            line.setAttribute("y1", String(Number(connector.y) * 10));
            line.setAttribute("y2", String(Number(connector.y) * 10));
            line.setAttribute("stroke", "#a000c8");
            line.setAttribute("stroke-width", "2.5");
            line.setAttribute("stroke-dasharray", "5 3");
            line.setAttribute("vector-effect", "non-scaling-stroke");
            line.setAttribute("opacity", "0.75");
            const title = document.createElementNS(namespace, "title");
            title.textContent = "rendered lyric extender footprint";
            line.appendChild(title);
            group.appendChild(line);
          }
          for (const entry of lyricEntries) {
            const anchorX = Number(entry.bodyAnchorX) * 10;
            const left = Number(entry.bodyLeft) * 10;
            const right = Number(entry.bodyRight) * 10;
            const top = Number(entry.top) * 10;
            const bottom = Number(entry.bottom) * 10;
            const isLeftAligned = entry.alignmentMode === "melisma-left";
            const color = isLeftAligned ? "#008b45" : "#006ee6";

            const footprint = document.createElementNS(namespace, "line");
            footprint.setAttribute("x1", String(left));
            footprint.setAttribute("x2", String(right));
            footprint.setAttribute("y1", String(bottom + 4));
            footprint.setAttribute("y2", String(bottom + 4));
            footprint.setAttribute("stroke", color);
            footprint.setAttribute("stroke-width", "1.5");
            footprint.setAttribute("vector-effect", "non-scaling-stroke");
            footprint.setAttribute("opacity", "0.8");
            group.appendChild(footprint);

            const anchor = document.createElementNS(namespace, "line");
            anchor.setAttribute("x1", String(anchorX));
            anchor.setAttribute("x2", String(anchorX));
            anchor.setAttribute("y1", String(top - 2));
            anchor.setAttribute("y2", String(bottom + 7));
            anchor.setAttribute("stroke", color);
            anchor.setAttribute("stroke-width", "1.5");
            anchor.setAttribute("vector-effect", "non-scaling-stroke");
            anchor.setAttribute("opacity", "0.8");
            const title = document.createElementNS(namespace, "title");
            title.textContent = [
              entry.lyricText || entry.text,
              entry.alignmentMode,
              `syllabic=${entry.syllabic}`,
              `extend=${entry.extendType}`,
              `melisma=${entry.isMelismatic}`,
            ].join(" · ");
            anchor.appendChild(title);
            group.appendChild(anchor);
          }
        }
        if (annotationLayers.includes("horizontal-spacing")) {
          for (const column of layoutPaddingColumns) {
            const padding = document.createElementNS(namespace, "line");
            padding.setAttribute("x1", String(column.anchorXPx - column.leftPx));
            padding.setAttribute("x2", String(column.anchorXPx + column.rightPx));
            padding.setAttribute("y1", String(column.yPx));
            padding.setAttribute("y2", String(column.yPx));
            padding.setAttribute("stroke", "#9b35c8");
            padding.setAttribute("stroke-dasharray", "3 2");
            padding.setAttribute("stroke-width", "1.5");
            padding.setAttribute("vector-effect", "non-scaling-stroke");
            const paddingTitle = document.createElementNS(namespace, "title");
            paddingTitle.textContent = [
              `measure ${column.measureNumber}`,
              column.isRest ? "rest column" : "note column",
              `${column.leftPx.toFixed(2)}px left`,
              `${column.rightPx.toFixed(2)}px right`,
              `${column.hardWidthPx.toFixed(2)}px effective`,
            ].join(" · ");
            padding.appendChild(paddingTitle);
            group.appendChild(padding);
          }
          for (const system of horizontalSpacing?.selectedSystems || []) {
            const geometry = systemGeometries.find(
              (candidate) => candidate.systemIndex === system.systemIndex,
            );
            const columns = system.columns || [];
            const diagnosticWidthPx = Number(columns.at(-1)?.finalX || 0);
            if (!geometry || diagnosticWidthPx <= 0) continue;
            const scale = geometry.widthPx / diagnosticWidthPx;
            const columnX = new Map(
              columns.map((column) => [
                column.columnIndex,
                geometry.xPx + Number(column.finalX || 0) * scale,
              ]),
            );
            let lane = 0;
            for (const constraint of system.resolvedConstraints || []) {
              const isSemantic = ["lyric", "hyphen", "extender"].includes(constraint.reason);
              if (!isSemantic && Number(constraint.addedDistance || 0) <= 0.01) continue;
              const fromX = columnX.get(constraint.fromColumn);
              const toX = columnX.get(constraint.toColumn);
              if (!Number.isFinite(fromX) || !Number.isFinite(toX)) continue;
              const y = geometry.yPx - 5 - (lane % 3) * 3;
              lane += 1;
              const color = {
                extender: "#008b8b",
                hyphen: "#d36b00",
                lyric: "#006ee6",
                notation: "#666666",
                "system-edge": "#b33a5b",
              }[constraint.reason];
              const arc = document.createElementNS(namespace, "path");
              arc.setAttribute("d", `M ${fromX} ${y} Q ${(fromX + toX) / 2} ${y - 5} ${toX} ${y}`);
              arc.setAttribute("fill", "none");
              arc.setAttribute("stroke", color || "#666666");
              arc.setAttribute("stroke-width", isSemantic ? "1.4" : "1");
              arc.setAttribute("vector-effect", "non-scaling-stroke");
              arc.setAttribute("opacity", isSemantic ? "0.8" : "0.6");
              const constraintTitle = document.createElementNS(namespace, "title");
              constraintTitle.textContent = [
                constraint.reason,
                `minimum ${Number(constraint.minimumDistance || 0).toFixed(2)}px`,
                `final ${Number(constraint.finalDistance || 0).toFixed(2)}px`,
                `added ${Number(constraint.addedDistance || 0).toFixed(2)}px`,
              ].join(" · ");
              arc.appendChild(constraintTitle);
              group.appendChild(arc);
            }
          }
        }
        if (annotationLayers.includes("skyline")) {
          const addProfile = (points, color, label) => {
            if (!points?.length) return;
            const path = document.createElementNS(namespace, "path");
            path.setAttribute(
              "d",
              points
                .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
                .join(" "),
            );
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", color);
            path.setAttribute("stroke-width", "1");
            path.setAttribute("vector-effect", "non-scaling-stroke");
            path.setAttribute("opacity", "0.55");
            const title = document.createElementNS(namespace, "title");
            title.textContent = label;
            path.appendChild(title);
            group.appendChild(path);
          };
          for (const profile of skylineProfiles) {
            const identity = `system ${profile.systemIndex + 1}, staff ${profile.staffLineIndex + 1}`;
            addProfile(profile.skyline, "#00a6a6", `skyline · ${identity}`);
            addProfile(profile.bottomline, "#d47b00", `bottomline · ${identity}`);
          }
        }
        if (
          annotationLayers.includes("slurs") ||
          annotationLayers.some((layer) => layer.startsWith("slur-"))
        ) {
          const addBounds = (bounds, color, label) => {
            if (!bounds) return;
            const rect = document.createElementNS(namespace, "rect");
            rect.setAttribute("x", String(bounds.left));
            rect.setAttribute("y", String(bounds.top));
            rect.setAttribute("width", String(Math.max(1, bounds.right - bounds.left)));
            rect.setAttribute("height", String(Math.max(1, bounds.bottom - bounds.top)));
            rect.setAttribute("fill", "none");
            rect.setAttribute("stroke", color);
            rect.setAttribute("stroke-width", "1");
            rect.setAttribute("vector-effect", "non-scaling-stroke");
            rect.setAttribute("opacity", "0.8");
            const title = document.createElementNS(namespace, "title");
            title.textContent = label;
            rect.appendChild(title);
            group.appendChild(rect);
          };
          for (const segment of slurSegments) {
            const { end, endControl, start, startControl } = segment.points;
            if (start && startControl && endControl && end) {
              const path = document.createElementNS(namespace, "path");
              path.setAttribute(
                "d",
                `M ${start.x} ${start.y} C ${startControl.x} ${startControl.y} ` +
                  `${endControl.x} ${endControl.y} ${end.x} ${end.y}`,
              );
              path.setAttribute("fill", "none");
              path.setAttribute("stroke", "#b000b5");
              path.setAttribute("stroke-dasharray", "4 2");
              path.setAttribute("stroke-width", "1.2");
              path.setAttribute("vector-effect", "non-scaling-stroke");
              path.setAttribute("opacity", "0.9");
              const title = document.createElementNS(namespace, "title");
              title.textContent = [
                `${segment.kind === "grace" ? "grace slur" : "slur segment"} ` +
                  `${segment.segmentIndex + 1}/${segment.segmentCount}`,
                `measure ${segment.measureNumber}`,
                `mode ${segment.mode || "unknown"}`,
                segment.selectedCandidateId || "unidentified candidate",
                segment.placement === 0 ? "above" : segment.placement === 1 ? "below" : "unplaced",
                `attachments ${segment.startAttachment || "unknown"} → ${segment.endAttachment || "unknown"}`,
                segment.linkedGroupId || "unlinked",
                segment.continuationClearance == null
                  ? "no continuation"
                  : `continuation ${segment.continuationClearance.toFixed(1)}px`,
                segment.linkedTangentMismatch == null
                  ? ""
                  : `tangent mismatch ${segment.linkedTangentMismatch.toFixed(2)}px`,
                segment.unsupportedRouting || "supported route",
                ...(segment.structuredFaults || []).map((fault) => fault.code),
              ].join(" · ");
              path.appendChild(title);
              group.appendChild(path);
            }
            addBounds(
              segment.startNotehead,
              "#5a47d6",
              `selected start notehead · ${segment.startAttachment || "unknown"} attachment · ` +
                `segment ${segment.segmentIndex + 1}/${segment.segmentCount}`,
            );
            addBounds(
              segment.endNotehead,
              "#5a47d6",
              `selected end notehead · ${segment.endAttachment || "unknown"} attachment · ` +
                `segment ${segment.segmentIndex + 1}/${segment.segmentCount}`,
            );
            if (annotationLayers.includes("slur-obstacles")) {
              for (const obstacle of segment.obstacles || []) {
                addBounds(obstacle.bounds, "#00a6a6", `${obstacle.type} obstacle · ${obstacle.id}`);
              }
            }
            if (
              annotationLayers.includes("slur-candidates") ||
              annotationLayers.includes("slur-rejections") ||
              annotationLayers.includes("slur-selected")
            ) {
              for (const candidate of segment.candidates || []) {
                const selected = candidate.id === segment.selectedCandidateId;
                if (annotationLayers.includes("slur-selected") && !selected) continue;
                if (annotationLayers.includes("slur-rejections") && !candidate.rejected) continue;
                const candidatePoints = candidate.geometry;
                if (!candidatePoints) continue;
                const candidatePath = document.createElementNS(namespace, "path");
                candidatePath.setAttribute(
                  "d",
                  `M ${candidatePoints.start.x} ${candidatePoints.start.y} ` +
                    `C ${candidatePoints.startControl.x} ${candidatePoints.startControl.y} ` +
                    `${candidatePoints.endControl.x} ${candidatePoints.endControl.y} ` +
                    `${candidatePoints.end.x} ${candidatePoints.end.y}`,
                );
                candidatePath.setAttribute("fill", "none");
                candidatePath.setAttribute(
                  "stroke",
                  selected ? "#00a33a" : candidate.rejected ? "#d00000" : "#777777",
                );
                candidatePath.setAttribute("stroke-width", selected ? "1.8" : "0.7");
                candidatePath.setAttribute("vector-effect", "non-scaling-stroke");
                candidatePath.setAttribute("opacity", selected ? "0.95" : "0.22");
                const candidateTitle = document.createElementNS(namespace, "title");
                candidateTitle.textContent = [
                  candidate.id,
                  candidate.family,
                  candidate.rejectionReason ||
                    (annotationLayers.includes("slur-scores")
                      ? `score ${Number(candidate.score?.total || 0).toFixed(2)}`
                      : "accepted"),
                ].join(" · ");
                candidatePath.appendChild(candidateTitle);
                group.appendChild(candidatePath);
              }
            }
            if (annotationLayers.includes("slur-anchors")) {
              const anchorKeys = new Set();
              for (const anchor of segment.anchors || []) {
                const key = `${anchor.id}:${anchor.x}:${anchor.y}`;
                if (anchorKeys.has(key)) continue;
                anchorKeys.add(key);
                const circle = document.createElementNS(namespace, "circle");
                circle.setAttribute("cx", String(anchor.x));
                circle.setAttribute("cy", String(anchor.y));
                circle.setAttribute("r", "2.2");
                circle.setAttribute("fill", "#ffd400");
                circle.setAttribute("stroke", "#5b4900");
                circle.setAttribute("stroke-width", "0.8");
                circle.setAttribute("vector-effect", "non-scaling-stroke");
                const anchorTitle = document.createElementNS(namespace, "title");
                anchorTitle.textContent = `${anchor.side} ${anchor.type} · ${anchor.id}`;
                circle.appendChild(anchorTitle);
                group.appendChild(circle);
              }
            }
          }
        }
        if (annotationLayers.includes("articulations")) {
          for (const articulation of slurArticulations) {
            const bounds = articulation.bounds;
            if (!bounds) continue;
            const rect = document.createElementNS(namespace, "rect");
            rect.setAttribute("x", String(bounds.left));
            rect.setAttribute("y", String(bounds.top));
            rect.setAttribute("width", String(Math.max(1, bounds.right - bounds.left)));
            rect.setAttribute("height", String(Math.max(1, bounds.bottom - bounds.top)));
            rect.setAttribute("fill", "rgba(255, 140, 0, 0.08)");
            rect.setAttribute("stroke", "#f06c00");
            rect.setAttribute("stroke-width", "1.2");
            rect.setAttribute("vector-effect", "non-scaling-stroke");
            const title = document.createElementNS(namespace, "title");
            title.textContent = [
              articulation.type,
              articulation.endpoint,
              `${articulation.finalShiftPx.toFixed(2)}px outward`,
              `measure ${articulation.measureNumber}`,
            ].join(" · ");
            rect.appendChild(title);
            group.appendChild(rect);
            if (articulation.attachment) {
              const connector = document.createElementNS(namespace, "line");
              connector.setAttribute("x1", String(articulation.attachment.x));
              connector.setAttribute("y1", String(articulation.attachment.y));
              connector.setAttribute("x2", String((bounds.left + bounds.right) / 2));
              connector.setAttribute(
                "y2",
                String(
                  articulation.attachment.y < bounds.top
                    ? bounds.top
                    : articulation.attachment.y > bounds.bottom
                      ? bounds.bottom
                      : (bounds.top + bounds.bottom) / 2,
                ),
              );
              connector.setAttribute("stroke", "#f06c00");
              connector.setAttribute("stroke-dasharray", "2 2");
              connector.setAttribute("stroke-width", "1");
              connector.setAttribute("vector-effect", "non-scaling-stroke");
              group.appendChild(connector);
            }
          }
        }
        svg.appendChild(group);
        return new XMLSerializer().serializeToString(svg);
      },
      {
        annotationLayers: layers,
        annotationMode: annotations,
        horizontalSpacing: result.diagnostics.horizontalSpacing,
        layoutPaddingColumns: result.diagnostics.layoutPaddingColumns,
        lyricConnectors: result.diagnostics.lyricConnectors,
        lyricEntries: result.diagnostics.lyricEntries,
        problemBoxes: result.diagnostics.problemBoxes,
        slurArticulations: result.diagnostics.slurArticulations,
        slurSegments: result.diagnostics.slurSegments,
        skylineProfiles: result.diagnostics.skylineProfiles,
        systemGeometries: result.diagnostics.systemGeometries,
      },
    );
    await score.screenshot({
      path: `${outputBase}.annotated.png`,
      animations: "disabled",
    });
    fs.writeFileSync(`${outputBase}.annotated.svg`, annotatedSvg);

    const nonFiniteGeometry = collectNonFiniteGeometryFaults({
      contextGaps: result.diagnostics.contextGaps,
      horizontalSpacing: result.diagnostics.horizontalSpacing,
      layoutPaddingColumns: result.diagnostics.layoutPaddingColumns,
      lyricConnectors: result.diagnostics.lyricConnectors,
      lyricConnectorPairs: result.diagnostics.lyricConnectorPairs,
      lyricEntries: result.diagnostics.lyricEntries,
      measureMetrics: result.diagnostics.measureMetrics,
      slurArticulations: result.diagnostics.slurArticulations,
      slurSegments: result.diagnostics.slurSegments,
      skylineProfiles: result.diagnostics.skylineProfiles,
      systemGeometries: result.diagnostics.systemGeometries,
    });
    const objectiveFaults = [];
    const missingFonts = fontChecks.filter((font) => !font.loaded);
    if (missingFonts.length > 0) {
      objectiveFaults.push({
        code: "required-font-missing",
        message: `Required fonts unavailable: ${missingFonts.map((font) => font.family).join(", ")}`,
      });
    }
    const renderStability = result.diagnostics.renderStability;
    if (
      result.svgCount < 1 ||
      renderStability.first.svgCount < 1 ||
      renderStability.second.svgCount < 1
    ) {
      objectiveFaults.push({
        code: "missing-svg",
        message: "OSMD produced no SVG output during one or both render passes.",
      });
    }
    const svgGeometryFaultCount =
      renderStability.first.geometryFaultCount + renderStability.second.geometryFaultCount;
    if (nonFiniteGeometry.length > 0 || svgGeometryFaultCount > 0) {
      objectiveFaults.push({
        code: "non-finite-geometry",
        message: `${
          nonFiniteGeometry.length + svgGeometryFaultCount
        } metric or SVG geometry value(s) are invalid.`,
        paths: nonFiniteGeometry,
        svgFaults: [
          ...renderStability.first.geometryFaults,
          ...renderStability.second.geometryFaults,
        ],
      });
    }
    if (renderStability.drift) {
      objectiveFaults.push({
        code: "rerender-drift",
        message: `First and second render geometry differs (${renderStability.mismatchCount} mismatch(es), max delta ${renderStability.maxDelta}px).`,
      });
    }
    if (pageErrors.length > 0) {
      objectiveFaults.push({
        code: "page-error",
        message: `${pageErrors.length} uncaught browser page error(s).`,
        pageErrors,
      });
    }
    const metrics = {
      ...result.diagnostics,
      browserMessages,
      fontChecks,
      objectiveFaults,
      rendererBundle: bundle,
      scoreFile,
      scoreId,
      svgCount: result.svgCount,
      visibility,
      width,
      lyricPaddingFactor,
      maximumLyricsElongationFactor,
      annotations,
      layers,
      run: {
        provenance: "../results.json",
        runFingerprint,
        schemaVersion: CORPUS_SCHEMA_VERSION,
      },
    };
    metrics.summary.objectiveFaultCount = objectiveFaults.length;
    fs.writeFileSync(`${outputBase}.metrics.json`, `${JSON.stringify(metrics, null, 2)}\n`);
    return metrics;
  } finally {
    await page.close();
  }
}

function statusClass(summary) {
  if (!summary) return "error";
  if (
    summary.objectiveFaultCount > 0 ||
    summary.collisionCount > 0 ||
    summary.connectorCollisionCount > 0 ||
    summary.paddedContextOverlapCount > 0
  ) {
    return "bad";
  }
  if (
    summary.shortfallCount > 0 ||
    summary.connectorShortfallCount > 0 ||
    summary.unsupportedSlurRoutingCount > 0 ||
    summary.slurLayoutFaultCount > 0
  )
    return "warn";
  return "good";
}

function metricSummary(summary) {
  if (!summary) return "Render failed";
  const minimumGap =
    summary.minimumActualGap === null ? "n/a" : summary.minimumActualGap.toFixed(2);
  const hardSpacing =
    summary.hardSpacingWidthPx === undefined
      ? "constraint width n/a"
      : `${Number(summary.hardSpacingWidthPx).toFixed(1)}px constrained`;
  const minimumConnectorGap =
    summary.minimumConnectorGap === null || summary.minimumConnectorGap === undefined
      ? "n/a"
      : summary.minimumConnectorGap.toFixed(2);
  return `${summary.objectiveFaultCount || 0} objective faults · ${summary.collisionCount} lyric collisions · ${summary.shortfallCount} lyric shortfalls · ${summary.connectorCollisionCount || 0} connector collisions · ${summary.connectorShortfallCount || 0} connector shortfalls · ${summary.unsupportedSlurRoutingCount || 0} unsupported slur routes · ${summary.slurLayoutFaultCount || 0} slur layout faults · ${summary.slurSegmentCount || 0} slur segments · ${summary.paddedContextOverlapCount} padded-context overlaps (${summary.contextOverlapCount} total) · ${hardSpacing} · min lyric gap ${minimumGap} · min connector gap ${minimumConnectorGap}`;
}

function recordSeverity(record) {
  const summary = record.metrics?.summary;
  if (record.error || record.objectiveFaults?.length > 0 || summary?.objectiveFaultCount > 0) {
    return "error";
  }
  if (
    summary?.collisionCount > 0 ||
    summary?.connectorCollisionCount > 0 ||
    summary?.paddedContextOverlapCount > 0
  ) {
    return "collision";
  }
  if (
    summary?.shortfallCount > 0 ||
    summary?.connectorShortfallCount > 0 ||
    summary?.unsupportedSlurRoutingCount > 0 ||
    summary?.slurLayoutFaultCount > 0
  ) {
    return "warning";
  }
  return "clean";
}

function worstSeverity(records) {
  const ranks = { clean: 0, warning: 1, collision: 2, error: 3 };
  return records.map(recordSeverity).sort((left, right) => ranks[right] - ranks[left])[0];
}

function prefixedArtifact(prefix, artifact) {
  if (!artifact) return artifact;
  return `${prefix}${artifact}`;
}

function buildGalleryControls(records, { renderer = true, view = true } = {}) {
  const features = [...new Set(records.flatMap((record) => record.features || []))].sort();
  const renderers = [...new Set(records.map((record) => record.rendererLabel))].sort();
  return `<div class="filters">
    <label>Score <input id="score-filter" type="search" placeholder="Name or repository path"></label>
    <label>Feature <select id="feature-filter"><option value="">All features</option>${features
      .map((feature) => `<option value="${escapeHtml(feature)}">${escapeHtml(feature)}</option>`)
      .join("")}</select></label>
    <label>Severity <select id="severity-filter">
      <option value="">All severities</option>
      <option value="error">Objective/error</option>
      <option value="collision">Collision</option>
      <option value="warning">Warning</option>
      <option value="clean">Clean</option>
    </select></label>
    ${
      renderer
        ? `<label>Renderer <select id="renderer-filter"><option value="">All renderers</option>${renderers
            .map(
              (rendererLabel) =>
                `<option value="${escapeHtml(rendererLabel)}">${escapeHtml(rendererLabel)}</option>`,
            )
            .join("")}</select></label>`
        : ""
    }
    ${
      view
        ? `<label>View <select id="view-filter"><option value="annotated">Annotated</option><option value="plain">Plain</option></select></label>`
        : ""
    }
  </div>`;
}

function galleryScript() {
  return `<script>
    const queryInput = document.getElementById("score-filter");
    const featureInput = document.getElementById("feature-filter");
    const severityInput = document.getElementById("severity-filter");
    const rendererInput = document.getElementById("renderer-filter");
    const viewInput = document.getElementById("view-filter");
    const sections = [...document.querySelectorAll("main > section")];
    const applyFilters = () => {
      const query = queryInput?.value.trim().toLowerCase() || "";
      const feature = featureInput?.value || "";
      const severity = severityInput?.value || "";
      const renderer = rendererInput?.value || "";
      for (const section of sections) {
        const cards = [...section.querySelectorAll(".card")];
        for (const card of cards) {
          card.hidden =
            (!!renderer && card.dataset.renderer !== renderer) ||
            (!!severity && card.dataset.severity !== severity);
        }
        const rendererVisible = cards.length === 0 || cards.some((card) => !card.hidden);
        section.hidden =
          (!!query && !section.dataset.scoreSearch.includes(query)) ||
          (!!feature && !section.dataset.features.split(",").includes(feature)) ||
          !rendererVisible;
      }
    };
    for (const input of [queryInput, featureInput, severityInput, rendererInput]) {
      input?.addEventListener("input", applyFilters);
    }
    viewInput?.addEventListener("input", () => {
      const property = viewInput.value === "plain" ? "plainSrc" : "annotatedSrc";
      for (const image of document.querySelectorAll("img[data-annotated-src]")) {
        image.src = image.dataset[property];
      }
    });
  </script>`;
}

function galleryStyles(rendererCount) {
  return `<style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #171717; color: #f4f4f4; }
    header { position: sticky; top: 0; z-index: 2; padding: 1rem 1.25rem; background: #171717ee; border-bottom: 1px solid #555; backdrop-filter: blur(8px); }
    h1 { margin: 0 0 .35rem; font-size: 1.35rem; }
    header p { margin: 0; color: #bbb; }
    .filters { display: flex; flex-wrap: wrap; gap: .65rem; margin-top: .8rem; }
    .filters label { display: grid; gap: .2rem; color: #bbb; font-size: .75rem; }
    input, select { min-width: 9rem; padding: .45rem .55rem; color: inherit; background: #252525; border: 1px solid #666; border-radius: .35rem; }
    #score-filter { width: min(30rem, 70vw); }
    main { padding: 1rem; }
    section { margin: 0 0 2rem; }
    h2 { margin: 0 0 .75rem; font-size: 1.05rem; }
    h2 span { color: #aaa; font-weight: 400; }
    .comparison { display: grid; grid-template-columns: repeat(${Math.max(
      1,
      rendererCount,
    )}, minmax(0, 1fr)); gap: 1rem; align-items: start; }
    .card { min-width: 0; padding: .75rem; border: 1px solid #555; border-radius: .6rem; background: #222; }
    .card h3 { margin: 0 0 .5rem; font-size: .95rem; }
    .card img { display: block; width: 100%; height: auto; max-height: 75vh; object-fit: contain; object-position: top; background: white; }
    .overview { grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr)); }
    .overview .card img { height: 14rem; object-fit: contain; }
    .metrics { margin: 0 0 .55rem; padding: .45rem .6rem; border-radius: .35rem; font-size: .8rem; }
    .metrics.good { background: #164d2c; }
    .metrics.warn { background: #654300; }
    .metrics.bad, .metrics.error { background: #691e24; }
    .links, nav { display: flex; flex-wrap: wrap; gap: .75rem; margin: .6rem 0 0; font-size: .8rem; }
    a { color: #ff9bdd; }
    pre { overflow: auto; white-space: pre-wrap; color: #ffb5b5; }
    @media (max-width: 900px) { .comparison { grid-template-columns: 1fr; } }
  </style>`;
}

function pageDescription(options) {
  return `Red boxes mark actual lyric collisions; amber boxes mark gaps below the configured lyric breathing room. ${
    options.layers.includes("lyrics") || options.layers.includes("horizontal-spacing")
      ? "Blue anchors mark centred lyric bodies, green anchors mark left-aligned melismas, purple dashed spans show hard note padding, and arcs show active or semantic system constraints. "
      : ""
  }Each SVG embeds the project’s notation and text fonts. Layers: ${escapeHtml(
    options.layers.join(", "),
  )}.`;
}

function buildIndex({
  artifactPrefix = "",
  navigation = "",
  options,
  records,
  scorePageLinks = new Map(),
}) {
  const grouped = new Map();
  for (const record of records) {
    const scoreId = record.scoreId || record.scoreName;
    const key = `${scoreId}\0${record.width}`;
    const group = grouped.get(key) || {
      records: [],
      scoreId,
      scoreName: record.scoreName,
      width: record.width,
      features: new Set(),
    };
    group.records.push(record);
    for (const feature of record.features || []) group.features.add(feature);
    grouped.set(key, group);
  }

  const sections = [...grouped.values()]
    .map((group) => {
      const cards = group.records
        .map((record) => {
          const summary = record.metrics?.summary;
          const annotatedPng = prefixedArtifact(artifactPrefix, record.annotatedPng);
          const plainPng = prefixedArtifact(artifactPrefix, record.plainPng);
          const details = record.error
            ? `<p class="metrics error">error</p><pre>${escapeHtml(record.error)}</pre>`
            : `<p class="metrics ${statusClass(summary)}">${escapeHtml(
                record.severity || recordSeverity(record),
              )} · ${escapeHtml(metricSummary(summary))}</p>
               <img loading="lazy" src="${escapeHtml(
                 annotatedPng,
               )}" data-annotated-src="${escapeHtml(annotatedPng)}" data-plain-src="${escapeHtml(
                 plainPng,
               )}" alt="${escapeHtml(
                 `${record.rendererLabel} annotated render of ${record.scoreName}`,
               )}">
               <p class="links">
                 <a href="${escapeHtml(plainPng)}">plain PNG</a>
                 <a href="${escapeHtml(
                   prefixedArtifact(artifactPrefix, record.annotatedSvg),
                 )}">annotated SVG</a>
                 <a href="${escapeHtml(
                   prefixedArtifact(artifactPrefix, record.plainSvg),
                 )}">plain SVG</a>
                 <a href="${escapeHtml(
                   prefixedArtifact(artifactPrefix, record.metricsJson),
                 )}">metrics JSON</a>
               </p>`;
          return `<article class="card" data-renderer="${escapeHtml(
            record.rendererLabel,
          )}" data-severity="${escapeHtml(record.severity || recordSeverity(record))}">
            <h3>${escapeHtml(record.rendererLabel)}</h3>
            ${details}
          </article>`;
        })
        .join("\n");
      return `<section data-score-search="${escapeHtml(
        `${group.scoreId} ${group.scoreName}`.toLowerCase(),
      )}" data-features="${escapeHtml([...group.features].join(","))}" data-severity="${worstSeverity(
        group.records,
      )}">
        <h2>${
          scorePageLinks.has(group.scoreId)
            ? `<a href="${escapeHtml(scorePageLinks.get(group.scoreId))}">${escapeHtml(
                group.scoreName,
              )}</a>`
            : escapeHtml(group.scoreName)
        } <span>${group.width}px · ${escapeHtml(
          options.visibility,
        )} · ${escapeHtml(group.scoreId)}</span></h2>
        <div class="comparison">${cards}</div>
      </section>`;
    })
    .join("\n");

  const rendererCount = Math.max(1, ...[...grouped.values()].map((group) => group.records.length));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(options.title)}</title>
  ${galleryStyles(rendererCount)}
</head>
<body>
  <header>
    <h1>${escapeHtml(options.title)}</h1>
    <p>${pageDescription(options)}</p>
    ${navigation}
    ${buildGalleryControls(records)}
  </header>
  <main>${sections}</main>
  ${galleryScript()}
</body>
</html>`;
}

function buildOverview({ options, records, scorePageLinks }) {
  const grouped = new Map();
  for (const record of records) {
    const scoreId = record.scoreId || record.scoreName;
    const group = grouped.get(scoreId) || {
      features: new Set(),
      records: [],
      scoreId,
      scoreName: record.scoreName,
    };
    group.records.push(record);
    for (const feature of record.features || []) group.features.add(feature);
    grouped.set(scoreId, group);
  }
  const cards = [...grouped.values()]
    .map((group) => {
      const preview = group.records.find((record) => record.annotatedPng);
      const previewImage = preview
        ? `<img loading="lazy" src="${escapeHtml(
            preview.annotatedPng,
          )}" alt="Annotated preview of ${escapeHtml(group.scoreName)}">`
        : "";
      return `<section data-score-search="${escapeHtml(
        `${group.scoreId} ${group.scoreName}`.toLowerCase(),
      )}" data-features="${escapeHtml(
        [...group.features].join(","),
      )}" data-severity="${worstSeverity(group.records)}">
        <article class="card" data-severity="${escapeHtml(worstSeverity(group.records))}">
          <h2><a href="${escapeHtml(scorePageLinks.get(group.scoreId))}">${escapeHtml(
            group.scoreName,
          )}</a></h2>
          <p>${escapeHtml(group.scoreId)} · ${group.records.length} render(s) · ${escapeHtml(
            worstSeverity(group.records),
          )}</p>
          <a href="${escapeHtml(scorePageLinks.get(group.scoreId))}">${previewImage}</a>
        </article>
      </section>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(options.title)}</title>
  ${galleryStyles(1)}
</head>
<body>
  <header>
    <h1>${escapeHtml(options.title)}</h1>
    <p>${pageDescription(options)}</p>
    ${buildGalleryControls(records, { renderer: false, view: false })}
  </header>
  <main class="comparison overview">${cards}</main>
  ${galleryScript()}
</body>
</html>`;
}

function writeScorePages({ options, outputDirectory, records }) {
  const pagesDirectory = path.join(outputDirectory, "_scores");
  fs.mkdirSync(pagesDirectory, { recursive: true });
  const grouped = new Map();
  for (const record of records) {
    const scoreId = record.scoreId || record.scoreName;
    const group = grouped.get(scoreId) || [];
    group.push(record);
    grouped.set(scoreId, group);
  }
  const scoreIds = [...grouped.keys()].sort();
  const links = new Map(
    scoreIds.map((scoreId) => [
      scoreId,
      `_scores/${slugify(path.basename(scoreId).replace(/\.(mxl|musicxml|xml)$/i, ""))}-${sha256(
        scoreId,
      ).slice(0, 8)}.html`,
    ]),
  );
  scoreIds.forEach((scoreId, index) => {
    const scoreRecords = grouped.get(scoreId);
    const previous = scoreIds[index - 1];
    const next = scoreIds[index + 1];
    const navigation = `<nav>
      <a href="../index.html">Corpus index</a>
      ${previous ? `<a href="../${escapeHtml(links.get(previous))}">← Previous score</a>` : ""}
      ${next ? `<a href="../${escapeHtml(links.get(next))}">Next score →</a>` : ""}
    </nav>`;
    const html = buildIndex({
      artifactPrefix: "../",
      navigation,
      options: {
        ...options,
        title: `${scoreRecords[0].scoreName} — ${options.title}`,
      },
      records: scoreRecords,
    });
    fs.writeFileSync(path.join(outputDirectory, links.get(scoreId)), html);
  });
  return links;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const repoRoot = path.resolve(import.meta.dirname, "..");
  options.output = path.resolve(options.output);
  options.inputs = options.inputs.map((entry) => path.resolve(entry));
  options.comparisonResults = options.comparisonResults.map((comparison) => ({
    ...comparison,
    file: path.resolve(comparison.file),
  }));
  options.renderers = options.renderers.map((renderer) => ({
    ...renderer,
    file: path.resolve(renderer.file),
  }));
  const rendererVariants = options.renderers.map((renderer) => ({
    ...renderer,
    baseLabel: renderer.label,
  }));
  const discoveredScores = await addScoreFeatures(
    createScoreDescriptors(collectScores(options.inputs), repoRoot),
  );
  const scores = selectScoreDescriptors(discoveredScores, options);
  if (discoveredScores.length === 0) {
    throw new Error("No MusicXML scores found in the supplied inputs.");
  }
  if (scores.length === 0) {
    throw new Error("No MusicXML scores remain after applying filters, exclusions, and sharding.");
  }
  for (const renderer of options.renderers) {
    if (!fs.existsSync(renderer.file)) {
      throw new Error(`Renderer bundle does not exist: ${renderer.file}`);
    }
  }

  fs.mkdirSync(options.output, { recursive: true });
  const fontCss = fontFaceCss(repoRoot);
  const browserOptions = options.cdpUrl
    ? { connection: "cdp", headless: true }
    : { browser: "chromium", headless: true };
  const browser = options.cdpUrl
    ? await chromium.connectOverCDP(options.cdpUrl)
    : await chromium.launch({ headless: true });
  const provenance = collectProvenance({
    browserOptions,
    browserVersion: await browser.version(),
    options,
    repoRoot,
  });
  const runFingerprint = createRunFingerprint({
    provenance,
    scores: scores.map((score) => ({
      scoreId: score.scoreId,
      sourceSha256: score.sourceSha256,
    })),
  });
  const checkpointFile = path.join(options.output, "checkpoint.json");
  const checkpoint = options.resume ? loadCheckpoint(checkpointFile, runFingerprint) : null;
  const records = (checkpoint?.records || []).filter((record) =>
    isReusableCheckpointRecord(record, options.output),
  );
  const completedRecordKeys = new Set(records.map(recordKey));
  if (records.length > 0) {
    console.log(`Resuming with ${records.length} complete render(s) from ${checkpointFile}`);
  }
  writeCheckpoint({
    complete: false,
    file: checkpointFile,
    options: provenance.options,
    provenance,
    records,
    runFingerprint,
  });
  const jobs = [];
  const recordOrder = new Map();
  let order = 0;
  for (const score of scores) {
    const scoreOutput = path.join(options.output, score.outputSlug);
    fs.mkdirSync(scoreOutput, { recursive: true });
    for (const width of options.widths) {
      for (const renderer of rendererVariants) {
        const rendererSlug = slugify(renderer.label);
        const basename = `${rendererSlug}-${width}`;
        const identity = {
          features: score.features,
          layers: options.layers,
          rendererLabel: renderer.label,
          scoreId: score.scoreId,
          scoreName: score.scoreName,
          visibility: options.visibility,
          width,
        };
        const key = recordKey(identity);
        recordOrder.set(key, order);
        order += 1;
        if (completedRecordKeys.has(key)) {
          console.log(
            `Reusing ${score.scoreName} · ${width}px · ${renderer.label} · ${options.visibility}`,
          );
          continue;
        }
        jobs.push({
          identity,
          outputBase: path.join(scoreOutput, basename),
          relativeBase: `${score.outputSlug}/${basename}`,
          renderer,
          score,
          width,
        });
      }
    }
  }
  const sortRecords = () =>
    records.sort(
      (left, right) =>
        (recordOrder.get(recordKey(left)) ?? Number.MAX_SAFE_INTEGER) -
        (recordOrder.get(recordKey(right)) ?? Number.MAX_SAFE_INTEGER),
    );
  let nextJobIndex = 0;
  const renderNextJob = async () => {
    while (nextJobIndex < jobs.length) {
      const job = jobs[nextJobIndex];
      nextJobIndex += 1;
      const { identity, outputBase, relativeBase, renderer, score, width } = job;
      console.log(
        `Rendering ${score.scoreName} · ${width}px · ${renderer.label} · ${options.visibility} ...`,
      );
      try {
        const metrics = await renderScore({
          annotations: options.annotations,
          browser,
          bundle: renderer.file,
          fontCss,
          layers: options.layers,
          lyricPaddingFactor: options.lyricPaddingFactor,
          maximumLyricsElongationFactor: options.maximumLyricsElongationFactor,
          outputBase,
          runFingerprint,
          scoreFile: score.file,
          scoreId: score.scoreId,
          visibility: options.visibility,
          width,
        });
        const record = {
          annotatedPng: `${relativeBase}.annotated.png`,
          annotatedSvg: `${relativeBase}.annotated.svg`,
          faultCodes: metrics.objectiveFaults.map((fault) => fault.code),
          metrics,
          metricsJson: `${relativeBase}.metrics.json`,
          objectiveFaults: metrics.objectiveFaults,
          plainPng: `${relativeBase}.png`,
          plainSvg: `${relativeBase}.svg`,
          ...identity,
        };
        record.severity = recordSeverity(record);
        records.push(record);
        console.log(
          `Finished ${score.scoreName} · ${width}px · ${renderer.label}: ${metricSummary(
            metrics.summary,
          )}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.stack || error.message : String(error);
        const record = {
          error: message,
          faultCodes: ["render-error"],
          ...identity,
        };
        record.severity = recordSeverity(record);
        records.push(record);
        console.log(
          `FAILED ${score.scoreName} · ${width}px · ${renderer.label}: ${message.split("\n")[0]}`,
        );
      }
      sortRecords();
      writeCheckpoint({
        complete: false,
        file: checkpointFile,
        options: provenance.options,
        provenance,
        records,
        runFingerprint,
      });
    }
  };
  try {
    await Promise.all(
      Array.from({ length: Math.min(options.workers, Math.max(1, jobs.length)) }, renderNextJob),
    );
  } finally {
    await browser.close();
  }

  const comparisonRecords = loadComparisonRecords(
    options.comparisonResults,
    options.output,
    new Map(
      scores.flatMap((score) => [
        [score.scoreId, score],
        [score.scoreName, score],
      ]),
    ),
    new Set(options.widths),
  );
  const galleryRecords = [...comparisonRecords, ...records];
  for (const record of galleryRecords) {
    record.faultCodes ||= (record.objectiveFaults || []).map((fault) => fault.code);
    record.severity ||= recordSeverity(record);
  }

  writeCheckpoint({
    complete: true,
    file: checkpointFile,
    options: provenance.options,
    provenance,
    records,
    runFingerprint,
  });
  writeJsonAtomically(path.join(options.output, "results.json"), {
    generatedAt: new Date().toISOString(),
    options,
    provenance,
    records: galleryRecords,
    runFingerprint,
    schemaVersion: CORPUS_SCHEMA_VERSION,
  });
  const scorePageLinks = writeScorePages({
    options,
    outputDirectory: options.output,
    records: galleryRecords,
  });
  fs.writeFileSync(
    path.join(options.output, "index.html"),
    options.gallery === "paged"
      ? buildOverview({ options, records: galleryRecords, scorePageLinks })
      : buildIndex({ options, records: galleryRecords, scorePageLinks }),
  );

  const failed = records.filter(
    (record) => record.error || record.objectiveFaults?.length > 0,
  ).length;
  console.log(
    `Wrote ${records.length - failed} current renders (${failed} current failed; ${
      comparisonRecords.length
    } comparison) to ${path.join(options.output, "index.html")}`,
  );
  if (failed > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}
