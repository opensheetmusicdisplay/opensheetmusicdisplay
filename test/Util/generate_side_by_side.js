/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function processImagePair(name, blessedPath, currentPath, outputDir) {
  const imgBlessed = await loadImage(blessedPath);
  const imgCurrent = await loadImage(currentPath);

  const w = Math.max(imgBlessed.width, imgCurrent.width);
  const commonH = Math.min(imgBlessed.height, imgCurrent.height);
  const h = Math.max(imgBlessed.height, imgCurrent.height);

  // Canvas for Blessed
  const cB = createCanvas(w, h);
  const ctxB = cB.getContext('2d');
  ctxB.drawImage(imgBlessed, 0, 0);
  const dataB = ctxB.getImageData(0, 0, w, h).data;

  // Canvas for Current
  const cC = createCanvas(w, h);
  const ctxC = cC.getContext('2d');
  ctxC.drawImage(imgCurrent, 0, 0);
  const dataC = ctxC.getImageData(0, 0, w, h).data;

  // Collect all changed pixels
  const diffRows = new Map(); // y -> { minX, maxX, count }
  let totalDiffCount = 0;

  for (let y = 0; y < commonH; y++) {
    let rowMinX = w, rowMaxX = 0, rowCount = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r1 = dataB[idx], g1 = dataB[idx+1], b1 = dataB[idx+2], a1 = dataB[idx+3];
      const r2 = dataC[idx], g2 = dataC[idx+1], b2 = dataC[idx+2], a2 = dataC[idx+3];

      if (r1 !== r2 || g1 !== g2 || b1 !== b2 || a1 !== a2) {
        rowCount++;
        totalDiffCount++;
        if (x < rowMinX) rowMinX = x;
        if (x > rowMaxX) rowMaxX = x;
      }
    }
    if (rowCount > 0) {
      diffRows.set(y, { minX: rowMinX, maxX: rowMaxX, count: rowCount });
    }
  }

  if (totalDiffCount === 0) {
    return [];
  }

  // Cluster changed rows vertically (gap > 50px creates a new cluster/system)
  const sortedYs = Array.from(diffRows.keys()).sort((a, b) => a - b);
  const clusters = [];
  let currentCluster = null;
  // Cluster by staff system row: gap > 50px separates different staff lines
  const GAP_THRESHOLD = 50;

  for (const y of sortedYs) {
    const rowInfo = diffRows.get(y);
    if (!currentCluster) {
      currentCluster = {
        minY: y,
        maxY: y,
        minX: rowInfo.minX,
        maxX: rowInfo.maxX,
        count: rowInfo.count
      };
    } else if (y - currentCluster.maxY <= GAP_THRESHOLD) {
      currentCluster.maxY = y;
      currentCluster.minX = Math.min(currentCluster.minX, rowInfo.minX);
      currentCluster.maxX = Math.max(currentCluster.maxX, rowInfo.maxX);
      currentCluster.count += rowInfo.count;
    } else {
      clusters.push(currentCluster);
      currentCluster = {
        minY: y,
        maxY: y,
        minX: rowInfo.minX,
        maxX: rowInfo.maxX,
        count: rowInfo.count
      };
    }
  }
  if (currentCluster) {
    clusters.push(currentCluster);
  }

  // Filter out tiny noise clusters (< 5 diff pixels)
  const validClusters = clusters.filter(c => c.count >= 5);
  const baseName = path.basename(name, '.png');
  const generatedFiles = [];

  for (let idx = 0; idx < validClusters.length; idx++) {
    const cluster = validClusters[idx];
    const n = idx + 1;

    // Vertical crop range with padding
    const padY = 60;
    const cropY = Math.max(0, cluster.minY - padY);
    const cropH = Math.min(h - cropY, (cluster.maxY - cluster.minY) + padY * 2);

    const cropX = 0;
    const cropW = w;

    // Layout dimensions
    const headerH = 40;
    const labelH = 26;
    const gap = 16;
    const margin = 20;
    const cardW = w + margin * 2;
    const cardH = headerH + (labelH + cropH) * 2 + gap * 2 + margin * 2;

    const cardCanvas = createCanvas(cardW, cardH);
    const ctx = cardCanvas.getContext('2d');

    // Dark slate background
    ctx.fillStyle = '#181825';
    ctx.fillRect(0, 0, cardW, cardH);

    // Card Outer Border
    ctx.strokeStyle = '#313244';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, cardW - 2, cardH - 2);

    // Header Bar
    ctx.fillStyle = '#11111b';
    ctx.fillRect(0, 0, cardW, headerH);
    ctx.fillStyle = '#cdd6f4';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`${baseName} (Diff #${n} of ${validClusters.length})`, margin, 26);

    ctx.fillStyle = '#f38ba8';
    ctx.font = '12px monospace';
    ctx.fillText(`Changed pixels: ${cluster.count.toLocaleString()}`, cardW - margin - 220, 26);

    let curY = headerH + margin;

    // --- BLESSED SECTION (TOP) ---
    ctx.fillStyle = '#a6e3a1'; // Soft green for Blessed / develop
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('BLESSED (Baseline - develop)', margin, curY + 16);
    curY += labelH;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(margin, curY, w, cropH);
    ctx.drawImage(cB, cropX, cropY, cropW, cropH, margin, curY, cropW, cropH);

    curY += cropH + gap;

    // --- CURRENT SECTION (BOTTOM) ---
    ctx.fillStyle = '#89b4fa'; // Soft blue for Current / PR
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('CURRENT (PR Branch - fix-extreme-ledger-beams)', margin, curY + 16);
    curY += labelH;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(margin, curY, w, cropH);
    ctx.drawImage(cC, cropX, cropY, cropW, cropH, margin, curY, cropW, cropH);

    // Output directly to visual_regression/diff/<name>_SideBySide_<n>.png
    const outFileName = `${baseName}_SideBySide_${n}.png`;
    const outPath = path.join(outputDir, outFileName);

    const outBuffer = cardCanvas.toBuffer('image/png');
    fs.writeFileSync(outPath, outBuffer);

    generatedFiles.push({
      outFileName,
      outPath,
      diffCount: cluster.count
    });
  }

  return generatedFiles;
}

async function main() {
  const blessedDir = path.resolve('visual_regression/blessed');
  const currentDir = path.resolve('visual_regression/current');
  const diffDir = path.resolve('visual_regression/diff');

  if (!fs.existsSync(blessedDir) || !fs.existsSync(currentDir)) {
    console.error('Error: visual_regression/blessed or visual_regression/current does not exist');
    process.exit(1);
  }

  if (!fs.existsSync(diffDir)) {
    fs.mkdirSync(diffDir, { recursive: true });
  }

  const files = fs.readdirSync(currentDir).filter(f => f.endsWith('.png'));
  console.log(`Analyzing ${files.length} test image pairs for side-by-side diff extraction...`);

  let totalCards = 0;
  for (const f of files) {
    const blessedPath = path.join(blessedDir, f);
    const currentPath = path.join(currentDir, f);
    if (!fs.existsSync(blessedPath)) continue;

    try {
      const results = await processImagePair(f, blessedPath, currentPath, diffDir);
      for (const res of results) {
        console.log(`Generated: visual_regression/diff/${res.outFileName} (${res.diffCount} pixels)`);
        totalCards++;
      }
    } catch (e) {
      console.error(`Error processing ${f}:`, e);
    }
  }

  console.log(`\nDone! Generated ${totalCards} side-by-side diff card(s) in visual_regression/diff/`);
}

main();
