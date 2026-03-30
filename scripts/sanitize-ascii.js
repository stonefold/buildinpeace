const fs = require('fs');
const path = require('path');

const root = process.cwd();
const skipDirs = new Set(['node_modules', 'build', '.git', '.firebase']);
const textExts = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.css',
  '.html',
  '.json',
  '.md',
  '.sql',
  '.txt',
  '.yml',
  '.yaml',
  '.svg',
]);
const skipFiles = new Set([
  path.join('scripts', 'sanitize-ascii.js'),
]);

const unicodeEscapeMap = new Map([
  ['\\u00c0', 'A'],
  ['\\u00c1', 'A'],
  ['\\u00c2', 'A'],
  ['\\u00c3', 'A'],
  ['\\u00c4', 'A'],
  ['\\u00c7', 'C'],
  ['\\u00c8', 'E'],
  ['\\u00c9', 'E'],
  ['\\u00ca', 'E'],
  ['\\u00cb', 'E'],
  ['\\u00ce', 'I'],
  ['\\u00cf', 'I'],
  ['\\u00d4', 'O'],
  ['\\u00d6', 'O'],
  ['\\u00d9', 'U'],
  ['\\u00da', 'U'],
  ['\\u00db', 'U'],
  ['\\u00dc', 'U'],
  ['\\u00e0', 'a'],
  ['\\u00e1', 'a'],
  ['\\u00e2', 'a'],
  ['\\u00e3', 'a'],
  ['\\u00e4', 'a'],
  ['\\u00e7', 'c'],
  ['\\u00e8', 'e'],
  ['\\u00e9', 'e'],
  ['\\u00ea', 'e'],
  ['\\u00eb', 'e'],
  ['\\u00ee', 'i'],
  ['\\u00ef', 'i'],
  ['\\u00f4', 'o'],
  ['\\u00f6', 'o'],
  ['\\u00f9', 'u'],
  ['\\u00fa', 'u'],
  ['\\u00fb', 'u'],
  ['\\u00fc', 'u'],
  ['\\u0152', 'OE'],
  ['\\u0153', 'oe'],
  ['\\u2018', "'"],
  ['\\u2019', "'"],
  ['\\u201c', '"'],
  ['\\u201d', '"'],
  ['\\u2022', '-'],
  ['\\u2026', '...'],
  ['\\u00b0', 'deg'],
]);

const charMap = new Map([
  ['\u2018', "'"],
  ['\u2019', "'"],
  ['\u201c', '"'],
  ['\u201d', '"'],
  ['\u00ab', '"'],
  ['\u00bb', '"'],
  ['\u2013', '-'],
  ['\u2014', '-'],
  ['\u2212', '-'],
  ['\u2022', '-'],
  ['\u00b7', '-'],
  ['\u2026', '...'],
  ['\u00b0', 'deg'],
  ['\u0153', 'oe'],
  ['\u0152', 'OE'],
  ['\u00e6', 'ae'],
  ['\u00c6', 'AE'],
  ['\u20ac', 'EUR'],
  ['\u00a0', ' '],
]);

function isTextFile(filePath) {
  const base = path.basename(filePath);
  if (base.startsWith('.env')) return true;
  return textExts.has(path.extname(filePath));
}

function suspiciousScore(value) {
  const matches = value.match(/(?:\u00C3[\u0080-\u00BF])|(?:\u00C2[\u0080-\u00BF])|\u00E2\u0080[\u0098-\u009F]|\u00EF\u00BF\u00BD/g);
  return matches ? matches.length : 0;
}

function maybeFixMojibake(value) {
  let current = value;
  for (let i = 0; i < 3; i += 1) {
    const candidate = Buffer.from(current, 'latin1').toString('utf8');
    if (candidate === current) break;
    if (suspiciousScore(candidate) < suspiciousScore(current)) {
      current = candidate;
      continue;
    }
    break;
  }
  return current;
}

function replaceUnicodeEscapes(value) {
  let output = value;
  for (const [from, to] of unicodeEscapeMap.entries()) {
    output = output.replaceAll(from, to);
  }
  return output;
}

function transliterateAscii(value) {
  let output = value;
  for (const [from, to] of charMap.entries()) {
    output = output.replaceAll(from, to);
  }
  output = output.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  output = output.replace(/[^\x00-\x7F]/g, '');
  return output;
}

function walk(dir, changedFiles) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(root, fullPath);
    if (entry.isDirectory()) {
      walk(fullPath, changedFiles);
      continue;
    }
    if (skipFiles.has(relativePath)) continue;
    if (!isTextFile(fullPath)) continue;

    const original = fs.readFileSync(fullPath, 'utf8');
    const cleaned = transliterateAscii(replaceUnicodeEscapes(maybeFixMojibake(original)));

    if (cleaned !== original) {
      fs.writeFileSync(fullPath, cleaned, 'utf8');
      changedFiles.push(relativePath);
    }
  }
}

const changedFiles = [];
walk(root, changedFiles);

if (!changedFiles.length) {
  console.log('No files changed.');
  process.exit(0);
}

console.log(`Sanitized ${changedFiles.length} files:`);
for (const file of changedFiles) {
  console.log(`- ${file}`);
}
