import fs from 'node:fs';
import path from 'node:path';

import {
  GOLDEN_DOCX,
  GOLDEN_ROOT,
  ensureDir,
  prepareHarnessRun,
  writeManifest,
  writeSnapshots
} from './shared.mjs';

const runName = 'capture';
const result = prepareHarnessRun(runName);

fs.rmSync(GOLDEN_ROOT, { recursive: true, force: true });
ensureDir(GOLDEN_ROOT);
fs.copyFileSync(result.docxPath, GOLDEN_DOCX);

const parts = writeSnapshots({ docxPath: result.docxPath, targetRoot: GOLDEN_ROOT });
writeManifest({
  docxPath: result.docxPath,
  targetRoot: GOLDEN_ROOT,
  parts,
  toolkit: result.toolkit,
  pluginZip: result.pluginZip
});

console.log(`Captured DOCX baseline: ${path.relative(process.cwd(), GOLDEN_DOCX)}`);
