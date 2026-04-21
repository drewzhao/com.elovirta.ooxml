import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  BUILD_ROOT,
  ensureDir,
  extractPart,
  installPlugin,
  prepareDitaToolkit,
  run,
  zipPartPattern
} from './shared.mjs';

const RUN_NAME = 'image-policy';
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/azZ8fQAAAAASUVORK5CYII=',
  'base64'
);

function writeFixture(root) {
  const topics = path.join(root, 'topics');
  const assets = path.join(topics, 'assets');
  const mermaidAssets = path.join(topics, '_docx-mermaid');
  ensureDir(assets);
  ensureDir(mermaidAssets);
  fs.writeFileSync(path.join(assets, 'plain.png'), TINY_PNG);
  fs.writeFileSync(path.join(assets, 'shared.png'), TINY_PNG);
  fs.writeFileSync(path.join(assets, 'brand-a.png'), TINY_PNG);
  fs.writeFileSync(path.join(mermaidAssets, 'diagram.png'), TINY_PNG);
  fs.writeFileSync(
    path.join(root, 'image-policy.ditamap'),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE map PUBLIC "-//OASIS//DTD DITA Map//EN" "map.dtd">',
      '<map>',
      '  <title>DOCX Image Policy</title>',
      '  <topicref href="topics/image-policy.dita"/>',
      '</map>',
      ''
    ].join('\n'),
    'utf8'
  );
  fs.writeFileSync(
    path.join(topics, 'image-policy.dita'),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE topic PUBLIC "-//OASIS//DTD DITA Topic//EN" "topic.dtd">',
      '<topic id="image-policy">',
      '  <title>DOCX Image Policy</title>',
      '  <body>',
      '    <p>Plain image.</p>',
      '    <image href="assets/plain.png" placement="break"><alt>Plain screenshot</alt></image>',
      '    <p>Shared rescue image.</p>',
      '    <image href="assets/shared.png" placement="break" props="image_role(shared)"><alt>Shared screenshot</alt></image>',
      '    <p>Brand rescue image.</p>',
      '    <image href="assets/brand-a.png" placement="break" props="image_role(brand-a)"><alt>Brand screenshot</alt></image>',
      '    <p>Mermaid-rendered diagram image.</p>',
      '    <image href="_docx-mermaid/diagram.png" placement="break"><alt>Mermaid diagram</alt></image>',
      '  </body>',
      '</topic>',
      ''
    ].join('\n'),
    'utf8'
  );
}

function parseRelationshipTargets(relsXml) {
  return [...String(relsXml).matchAll(/<Relationship\b[^>]*\bType="[^"]*\/relationships\/image"[^>]*\bTarget="([^"]+)"/g)]
    .map((match) => match[1])
    .sort();
}

function listMediaParts(docxPath) {
  return run('unzip', ['-Z1', docxPath])
    .split(/\r?\n/)
    .filter((part) => part.startsWith('word/media/') && !part.endsWith('/'))
    .sort();
}

function buildDocx({ ditaBin, fixtureRoot, mode, mermaidMode = 'yes' }) {
  const outDir = path.join(BUILD_ROOT, RUN_NAME, `out-${mode}-${mermaidMode}`);
  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);
  run(
    ditaBin,
    [
      '-i',
      path.join(fixtureRoot, 'image-policy.ditamap'),
      '-f',
      'docx',
      '-o',
      outDir,
      `--args.image.output=${mode}`,
      '--args.image.role.group=image_role',
      `--args.docx.mermaid.output=${mermaidMode}`
    ],
    { stdio: 'pipe' }
  );
  const docxPath = path.join(outDir, 'image-policy.docx');
  assert.ok(fs.existsSync(docxPath), `expected DOCX at ${docxPath}`);
  const relationshipTargets = parseRelationshipTargets(extractPart(docxPath, 'word/_rels/document.xml.rels'));
  const mediaParts = listMediaParts(docxPath);
  const documentXml = extractPart(docxPath, 'word/document.xml');
  return { docxPath, relationshipTargets, mediaParts, documentXml };
}

const toolkit = prepareDitaToolkit({ runName: RUN_NAME });
installPlugin({ ditaBin: toolkit.ditaBin, ditaDir: toolkit.ditaDir, runName: RUN_NAME });
const fixtureRoot = path.join(BUILD_ROOT, RUN_NAME, 'fixture');
fs.rmSync(fixtureRoot, { recursive: true, force: true });
ensureDir(fixtureRoot);
writeFixture(fixtureRoot);

const keep = buildDocx({ ditaBin: toolkit.ditaBin, fixtureRoot, mode: 'yes' });
assert.deepEqual(keep.relationshipTargets, [
  'media/topics/_docx-mermaid/diagram.png',
  'media/topics/assets/brand-a.png',
  'media/topics/assets/plain.png',
  'media/topics/assets/shared.png'
]);
assert.deepEqual(keep.mediaParts, [
  'word/media/topics/_docx-mermaid/diagram.png',
  'word/media/topics/assets/brand-a.png',
  'word/media/topics/assets/plain.png',
  'word/media/topics/assets/shared.png'
]);

const strip = buildDocx({ ditaBin: toolkit.ditaBin, fixtureRoot, mode: 'no' });
assert.deepEqual(strip.relationshipTargets, ['media/topics/_docx-mermaid/diagram.png']);
assert.deepEqual(strip.mediaParts, ['word/media/topics/_docx-mermaid/diagram.png']);

const rescue = buildDocx({ ditaBin: toolkit.ditaBin, fixtureRoot, mode: 'rescue' });
assert.deepEqual(rescue.relationshipTargets, [
  'media/topics/_docx-mermaid/diagram.png',
  'media/topics/assets/brand-a.png',
  'media/topics/assets/shared.png'
]);
assert.deepEqual(rescue.mediaParts, [
  'word/media/topics/_docx-mermaid/diagram.png',
  'word/media/topics/assets/brand-a.png',
  'word/media/topics/assets/shared.png'
]);

const mermaidStrip = buildDocx({ ditaBin: toolkit.ditaBin, fixtureRoot, mode: 'no', mermaidMode: 'no' });
assert.deepEqual(mermaidStrip.relationshipTargets, []);
assert.deepEqual(mermaidStrip.mediaParts, []);
assert.doesNotMatch(mermaidStrip.documentXml, /r:embed="rId\d+"/);

console.log('DOCX image policy test passed');
