import fs from 'node:fs';
import path from 'node:path';

import {
  BUILD_ROOT,
  GOLDEN_DOCX,
  GOLDEN_ROOT,
  REPO_ROOT,
  SNAPSHOT_PARTS,
  ensureDir,
  partSnapshotPath,
  prepareHarnessRun,
  writeManifest,
  writeSnapshots
} from './shared.mjs';

function requireGoldens() {
  const required = [
    GOLDEN_DOCX,
    path.join(GOLDEN_ROOT, 'manifest.json'),
    ...SNAPSHOT_PARTS.map((part) => path.join(GOLDEN_ROOT, partSnapshotPath(part)))
  ];
  const missing = required.filter((filePath) => !fs.existsSync(filePath));
  if (missing.length) {
    throw new Error(
      `Missing layout goldens:\n${missing.map((filePath) => `- ${path.relative(REPO_ROOT, filePath)}`).join('\n')}\nRun node test/layout-harness/capture-goldens.mjs first.`
    );
  }
}

function compareSnapshots(actualRoot) {
  const mismatches = [];
  for (const partName of SNAPSHOT_PARTS) {
    const relativePart = partSnapshotPath(partName);
    const goldenPath = path.join(GOLDEN_ROOT, relativePart);
    const actualPath = path.join(actualRoot, relativePart);
    const golden = fs.readFileSync(goldenPath, 'utf8');
    const actual = fs.readFileSync(actualPath, 'utf8');
    if (golden !== actual) {
      mismatches.push(partName);
    }
  }
  if (mismatches.length) {
    throw new Error(`Layout baseline mismatch in DOCX package parts:\n${mismatches.map((part) => `- ${part}`).join('\n')}`);
  }
}

requireGoldens();

const runName = 'gate';
const result = prepareHarnessRun(runName);
const snapshotRoot = path.join(BUILD_ROOT, runName, 'snapshots');
fs.rmSync(snapshotRoot, { recursive: true, force: true });
ensureDir(snapshotRoot);

const parts = writeSnapshots({ docxPath: result.docxPath, targetRoot: snapshotRoot });
writeManifest({
  docxPath: result.docxPath,
  targetRoot: snapshotRoot,
  parts,
  toolkit: result.toolkit,
  pluginZip: result.pluginZip
});

compareSnapshots(snapshotRoot);
console.log('DOCX layout baseline gate passed');
