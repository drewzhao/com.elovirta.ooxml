import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DITA_VERSION = '4.4';
export const DITA_DIR_NAME = `dita-ot-${DITA_VERSION}`;
export const DITA_ZIP_NAME = `${DITA_DIR_NAME}.zip`;
export const DITA_DOWNLOAD_URL = `https://github.com/dita-ot/dita-ot/releases/download/${DITA_VERSION}/${DITA_ZIP_NAME}`;

export const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HARNESS_DIR, '..', '..');
export const CACHE_ROOT = path.join(REPO_ROOT, '.tools-cache');
export const DOWNLOADS_ROOT = path.join(CACHE_ROOT, 'downloads');
export const DITA_ZIP_PATH = path.join(DOWNLOADS_ROOT, DITA_ZIP_NAME);
export const BUILD_ROOT = path.join(REPO_ROOT, 'build', 'layout-harness');
export const PACKAGE_ROOT = path.join(BUILD_ROOT, 'packages');
export const FIXTURE_MAP = path.join(REPO_ROOT, 'test', 'layout-fixtures', 'layout.ditamap');
export const GOLDEN_ROOT = path.join(REPO_ROOT, 'test', 'layout-goldens');
export const GOLDEN_DOCX = path.join(GOLDEN_ROOT, 'layout-baseline.docx');
export const SNAPSHOT_PARTS = [
  '[Content_Types].xml',
  'word/document.xml',
  'word/numbering.xml',
  'word/_rels/document.xml.rels'
];

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    ...options
  });
}

export function requireCommand(command, versionArgs = ['--version']) {
  try {
    run(command, versionArgs);
  } catch (error) {
    throw new Error(`Required command not available: ${command}`);
  }
}

export function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function sha256Text(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export function partSnapshotPath(partName) {
  return path.join(...partName.split('/'));
}

export function zipPartPattern(partName) {
  return partName.replaceAll('[', '[[]');
}

export function normalizeXml(xml) {
  const compact = xml.replace(/\r\n?/g, '\n').trim().replace(/>\s+</g, '><');
  if (!compact) {
    return '\n';
  }
  const lines = compact.replace(/></g, '>\n<').split('\n');
  let depth = 0;
  const formatted = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const isClosing = /^<\//.test(trimmed);
    const isDeclaration = /^<\?/.test(trimmed);
    const isComment = /^<!--/.test(trimmed);
    const isSelfClosing = /\/>$/.test(trimmed);
    const isSingleLineElement = /^<[^!?/][^>]*>[^<]*<\/[^>]+>$/.test(trimmed);
    if (isClosing) {
      depth = Math.max(depth - 1, 0);
    }
    formatted.push(`${'  '.repeat(depth)}${trimmed}`);
    if (!isClosing && !isDeclaration && !isComment && !isSelfClosing && !isSingleLineElement) {
      depth += 1;
    }
  }
  return `${formatted.join('\n')}\n`;
}

export function checkPrerequisites() {
  requireCommand('curl');
  requireCommand('unzip', ['-v']);
  requireCommand('zip', ['-v']);
  requireCommand('java', ['-version']);
}

export function javaVersion() {
  const result = spawnSync('java', ['-version'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (result.status !== 0) {
    throw new Error(output || 'java -version failed');
  }
  return output;
}

export function gitRevision() {
  return run('git', ['rev-parse', '--short=12', 'HEAD']).trim();
}

export function ensureDitaZip() {
  ensureDir(DOWNLOADS_ROOT);
  if (!fs.existsSync(DITA_ZIP_PATH)) {
    run('curl', ['-L', '-o', DITA_ZIP_PATH, DITA_DOWNLOAD_URL], { stdio: 'inherit' });
  }
  return DITA_ZIP_PATH;
}

export function prepareDitaToolkit({ runName }) {
  const runRoot = path.join(BUILD_ROOT, runName);
  const extractRoot = path.join(runRoot, 'toolkit');
  if (process.env.DITA_OT_DIR) {
    const overrideSource = path.resolve(process.env.DITA_OT_DIR);
    const sourceDitaBin = path.join(overrideSource, 'bin', 'dita');
    if (!fs.existsSync(sourceDitaBin)) {
      throw new Error(`DITA_OT_DIR does not contain bin/dita: ${overrideSource}`);
    }
    fs.rmSync(extractRoot, { recursive: true, force: true });
    ensureDir(extractRoot);
    const ditaDir = path.join(extractRoot, path.basename(overrideSource));
    fs.cpSync(overrideSource, ditaDir, { recursive: true });
    return {
      ditaDir,
      ditaBin: path.join(ditaDir, 'bin', 'dita'),
      override: true,
      overrideSource
    };
  }

  checkPrerequisites();
  ensureDitaZip();

  const ditaDir = path.join(extractRoot, DITA_DIR_NAME);
  fs.rmSync(extractRoot, { recursive: true, force: true });
  ensureDir(extractRoot);
  run('unzip', ['-q', '-o', DITA_ZIP_PATH, '-d', extractRoot]);
  const ditaBin = path.join(ditaDir, 'bin', 'dita');
  if (!fs.existsSync(ditaBin)) {
    throw new Error(`DITA-OT extraction failed; missing ${ditaBin}`);
  }
  return { ditaDir, ditaBin, override: false };
}

export function packagePlugin({ runName }) {
  ensureDir(PACKAGE_ROOT);
  const zipPath = path.join(PACKAGE_ROOT, `com.elovirta.ooxml-${runName}.zip`);
  fs.rmSync(zipPath, { force: true });
  const repoParent = path.dirname(REPO_ROOT);
  const repoName = path.basename(REPO_ROOT);
  run(
    'zip',
    [
      '-qr',
      zipPath,
      repoName,
      '-x',
      `${repoName}/.git/*`,
      `${repoName}/.tools-cache/*`,
      `${repoName}/build/*`
    ],
    { cwd: repoParent }
  );
  return zipPath;
}

export function installPlugin({ ditaBin, ditaDir, runName }) {
  const pluginZip = packagePlugin({ runName });
  run(ditaBin, ['install', pluginZip, '--force'], { cwd: ditaDir, stdio: 'inherit' });
  return pluginZip;
}

export function buildFixtureDocx({ ditaBin, runName }) {
  const outDir = path.join(BUILD_ROOT, runName, 'out');
  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);
  run(ditaBin, ['-i', FIXTURE_MAP, '-f', 'docx', '-o', outDir], { stdio: 'inherit' });
  const docxPath = path.join(outDir, 'layout.docx');
  if (!fs.existsSync(docxPath)) {
    throw new Error(`DOCX build did not produce expected file: ${docxPath}`);
  }
  return { outDir, docxPath };
}

export function extractPart(docxPath, partName) {
  return run('unzip', ['-p', docxPath, zipPartPattern(partName)]);
}

export function writeSnapshots({ docxPath, targetRoot }) {
  const parts = {};
  for (const partName of SNAPSHOT_PARTS) {
    const normalized = normalizeXml(extractPart(docxPath, partName));
    const snapshotPath = path.join(targetRoot, partSnapshotPath(partName));
    ensureDir(path.dirname(snapshotPath));
    fs.writeFileSync(snapshotPath, normalized, 'utf8');
    parts[partName] = {
      path: path.relative(REPO_ROOT, snapshotPath),
      sha256: sha256Text(normalized)
    };
  }
  return parts;
}

export function writeManifest({ docxPath, targetRoot, parts, toolkit, pluginZip }) {
  const ditaDir = toolkit.override ? toolkit.ditaDir : path.relative(REPO_ROOT, toolkit.ditaDir);
  const manifest = {
    fixture: path.relative(REPO_ROOT, FIXTURE_MAP),
    generatedDocx: path.relative(REPO_ROOT, docxPath),
    baselineDocx: path.relative(REPO_ROOT, GOLDEN_DOCX),
    forkRevision: gitRevision(),
    ditaVersion: DITA_VERSION,
    ditaDownloadUrl: DITA_DOWNLOAD_URL,
    ditaOverride: toolkit.override,
    ditaOverrideSource: toolkit.override ? toolkit.overrideSource : null,
    ditaDir,
    javaVersion: javaVersion(),
    pluginZip: path.relative(REPO_ROOT, pluginZip),
    docxSha256: sha256File(docxPath),
    parts
  };
  fs.writeFileSync(path.join(targetRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

export function prepareHarnessRun(runName) {
  const toolkit = prepareDitaToolkit({ runName });
  const pluginZip = installPlugin({ ditaBin: toolkit.ditaBin, ditaDir: toolkit.ditaDir, runName });
  const build = buildFixtureDocx({ ditaBin: toolkit.ditaBin, runName });
  return { toolkit, pluginZip, ...build };
}
