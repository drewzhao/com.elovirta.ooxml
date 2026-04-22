import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  BUILD_ROOT,
  ensureDir,
  extractPart,
  installPlugin,
  prepareDitaToolkit,
  run
} from './shared.mjs';

const RUN_NAME = 'native-svg';
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/azZ8fQAAAAASUVORK5CYII=',
  'base64'
);
const TINY_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10">',
  '  <rect width="10" height="10" fill="#111111"/>',
  '</svg>',
  ''
].join('\n');

function writeFixture(root) {
  const topics = path.join(root, 'topics');
  const assets = path.join(topics, '_docx-svg');
  ensureDir(assets);
  fs.writeFileSync(path.join(assets, 'native.svg'), TINY_SVG, 'utf8');
  fs.writeFileSync(path.join(assets, 'native.png'), TINY_PNG);
  fs.writeFileSync(
    path.join(root, 'native-svg.ditamap'),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE map PUBLIC "-//OASIS//DTD DITA Map//EN" "map.dtd">',
      '<map>',
      '  <title>DOCX Native SVG</title>',
      '  <topicref href="topics/native-svg.dita"/>',
      '</map>',
      ''
    ].join('\n'),
    'utf8'
  );
  fs.writeFileSync(
    path.join(topics, 'native-svg.dita'),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE topic PUBLIC "-//OASIS//DTD DITA Topic//EN" "topic.dtd">',
      '<topic id="native-svg">',
      '  <title>DOCX Native SVG</title>',
      '  <body>',
      '    <p>Native SVG image.</p>',
      '    <image href="_docx-svg/native.svg" placement="break"><alt>Native SVG</alt></image>',
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

function buildDocx({ ditaBin, fixtureRoot, imageMode }) {
  const outDir = path.join(BUILD_ROOT, RUN_NAME, `out-${imageMode}`);
  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);
  run(
    ditaBin,
    [
      '-i',
      path.join(fixtureRoot, 'native-svg.ditamap'),
      '-f',
      'docx',
      '-o',
      outDir,
      `--args.image.output=${imageMode}`,
      '--docx.svg.policy=native',
      '--docx.inkscape.skip=true'
    ],
    { stdio: 'pipe' }
  );
  const docxPath = path.join(outDir, 'native-svg.docx');
  assert.ok(fs.existsSync(docxPath), `expected DOCX at ${docxPath}`);
  return {
    docxPath,
    contentTypesXml: extractPart(docxPath, '[Content_Types].xml'),
    documentXml: extractPart(docxPath, 'word/document.xml'),
    relationshipsXml: extractPart(docxPath, 'word/_rels/document.xml.rels'),
    relationshipTargets: parseRelationshipTargets(extractPart(docxPath, 'word/_rels/document.xml.rels')),
    mediaParts: listMediaParts(docxPath)
  };
}

const toolkit = prepareDitaToolkit({ runName: RUN_NAME });
installPlugin({ ditaBin: toolkit.ditaBin, ditaDir: toolkit.ditaDir, runName: RUN_NAME });
const fixtureRoot = path.join(BUILD_ROOT, RUN_NAME, 'fixture');
fs.rmSync(fixtureRoot, { recursive: true, force: true });
ensureDir(fixtureRoot);
writeFixture(fixtureRoot);

const keep = buildDocx({ ditaBin: toolkit.ditaBin, fixtureRoot, imageMode: 'yes' });
assert.match(keep.contentTypesXml, /Extension="svg" ContentType="image\/svg\+xml"/);
assert.match(keep.documentXml, /asvg:svgBlip\b[^>]*r:embed="rIdSvg\d+"/);
assert.match(keep.documentXml, /<a:blip\b[^>]*r:embed="rId\d+"/);
assert.deepEqual(keep.relationshipTargets, [
  'media/topics/_docx-svg/native.png',
  'media/topics/_docx-svg/native.svg'
]);
assert.deepEqual(keep.mediaParts, [
  'word/media/topics/_docx-svg/native.png',
  'word/media/topics/_docx-svg/native.svg'
]);
assert.doesNotMatch(keep.relationshipsXml, /\.emf/);

const strip = buildDocx({ ditaBin: toolkit.ditaBin, fixtureRoot, imageMode: 'no' });
assert.doesNotMatch(strip.documentXml, /asvg:svgBlip\b/);
assert.deepEqual(strip.relationshipTargets, []);
assert.deepEqual(strip.mediaParts, []);

console.log('DOCX native SVG test passed');
