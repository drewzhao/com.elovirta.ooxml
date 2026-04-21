import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  normalizeXml,
  partSnapshotPath,
  sha256File,
  zipPartPattern
} from './shared.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ooxml-layout-self-test-'));
const sample = path.join(tmp, 'sample.txt');
fs.writeFileSync(sample, 'sample\n', 'utf8');

assert.equal(
  normalizeXml('<?xml version="1.0"?><root><item b="2" a="1"> x </item></root>'),
  '<?xml version="1.0"?>\n<root>\n  <item b="2" a="1"> x </item>\n</root>\n'
);

assert.equal(
  partSnapshotPath('word/_rels/document.xml.rels'),
  path.join('word', '_rels', 'document.xml.rels')
);

assert.equal(
  partSnapshotPath('[Content_Types].xml'),
  '[Content_Types].xml'
);

assert.equal(
  zipPartPattern('[Content_Types].xml'),
  '[[]Content_Types].xml'
);

assert.equal(
  zipPartPattern('word/document.xml'),
  'word/document.xml'
);

assert.equal(
  sha256File(sample),
  'aaf9ff488e0767da5ea1d56118e6f65a16c5633b0cefc1fa089bd3ab1810613d'
);

console.log('layout harness self-test passed');
