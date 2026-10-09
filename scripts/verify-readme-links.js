'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const readmePath = path.join(root, 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');
const failures = [];
const seen = new Set();
let checked = 0;

function assertFileExists(target, label) {
  const normalized = decodeURIComponent(target).replace(/^\.\//, '');
  const resolved = path.resolve(root, normalized);
  if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) {
    failures.push(`${label} -> missing repository path: ${target}`);
    return;
  }
  if (!fs.statSync(resolved).isFile()) {
    failures.push(`${label} -> target is not a file: ${target}`);
  }
}

for (const match of readme.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
  const rawTarget = match[1].trim().replace(/^<|>$/g, '');
  const target = rawTarget.split('#')[0].split('?')[0];
  if (!target || target.startsWith('#') || target.startsWith('mailto:')) continue;

  if (/^https?:\/\//i.test(target)) {
    const repoUrl = target.match(/^https:\/\/github\.com\/littlepxyek-crypto\/([^/]+)(?:\/blob\/main\/|\/actions\/workflows\/)(.+)$/i);
    if (/^https:\/\/github\.com\/littlepxyek-crypto\/HAHAWEEK(?:\/|$)/i.test(target)) {
      failures.push(`Repository URL must use lowercase repo slug: ${target}`);
    }
    if (repoUrl && repoUrl[1].toLowerCase() === 'hahaweek') {
      if (target.includes('/blob/main/')) {
        assertFileExists(repoUrl[2], rawTarget);
      } else if (target.includes('/actions/workflows/')) {
        const workflowName = repoUrl[2].replace(/\.svg$/i, '');
        const workflowPath = `.github/workflows/${workflowName}`;
        assertFileExists(workflowPath, rawTarget);
      }
    }
    continue;
  }

  if (target.startsWith('//')) continue;
  if (!seen.has(target)) {
    seen.add(target);
    assertFileExists(target, rawTarget);
  }
}

if (failures.length) {
  console.error('README internal-link verification FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`README internal-link verification PASSED (${checked} links checked; ${seen.size} relative targets; canonical GitHub paths validated)`);
}
