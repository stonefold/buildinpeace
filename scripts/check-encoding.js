const fs = require('fs');
const path = require('path');

const root = process.cwd();
const includeExt = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json', '.sql', '.md']);
const skipDirs = new Set(['node_modules', 'build', '.git', '.firebase']);
const suspiciousPatterns = [
  /(?:\u00C3[\u0080-\u00BF])/,
  /(?:\u00C2[\u0080-\u00BF])/,
  /\u00E2\u0080[\u0098-\u009F]/,
  /\u00EF\u00BF\u00BD/,
];

const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(root, fullPath);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!includeExt.has(ext)) continue;
    if (relativePath === path.join('scripts', 'check-encoding.js')) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (suspiciousPatterns.some((pattern) => pattern.test(line))) {
        findings.push(`${relativePath}:${index + 1}: ${line.trim()}`);
      }
    });
  }
}

walk(root);

if (findings.length) {
  console.error('Suspicious encoding artifacts found:\n');
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log('No suspicious encoding artifacts found.');
