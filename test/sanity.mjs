import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', '..', 'arkose-scythe-data', 'bundles');
const LATEST = join(DATA, 'latest');

const KEYWORDS = ['arkoselabs', 'funcaptcha', 'enforcement', 'game-core'];

let exitCode = 0;

async function checkSession(dir) {
  console.log(`\n=== sanity: ${dir} ===`);

  const metaPath = join(dir, 'metadata.json');
  if (!existsSync(metaPath)) { console.log('FAIL: no metadata.json'); return false; }

  const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
  const { session, captures, missing } = meta;

  if (!session.success) { console.log(`FAIL: session.success=false (retry ${session.retryCount})`); exitCode = 1; }

  if (missing?.length) { console.log(`FAIL: missing files: ${missing.join(', ')}`); exitCode = 1; }

  for (const c of captures) {
    const fullPath = c.path;

    if (!existsSync(fullPath)) {
      console.log(`FAIL: file missing: ${p}`);
      exitCode = 1;
      continue;
    }

    const stat = await readFile(fullPath);
    if (stat.length === 0) {
      console.log(`FAIL: 0 byte file: ${p}`);
      exitCode = 1;
      continue;
    }

    if (c.type === 'js-bundle') {
      const content = stat.toString('utf-8');
      const found = KEYWORDS.filter(kw => content.toLowerCase().includes(kw));
      if (found.length === 0) {
        console.log(`WARN: ${c.label} — no Arkose keyword found`);
      }
    }
  }

  const labels = captures.map(c => c.label);
  const checks = {
    'game-core': labels.includes('game-core'),
    'enforcement': labels.includes('enforcement'),
    'gfct': labels.includes('gfct'),
    'gt2': labels.includes('gt2'),
  };

  let pass = true;
  for (const [k, v] of Object.entries(checks)) {
    if (!v) { console.log(`FAIL: missing label "${k}"`); pass = false; exitCode = 1; }
  }
  if (pass) console.log('PASS: all critical labels present');

  console.log(`summary: ${captures.length} captures, ${captures.reduce((s, c) => s + c.size, 0)} bytes`);
  return pass;
}

async function main() {
  const target = existsSync(LATEST) ? await readFile(LATEST, 'utf-8').then(p => join(DATA, p.trim())).catch(() => null) : null;
  if (target) {
    await checkSession(target);
  } else {
    const dirs = (await readdir(DATA, { withFileTypes: true })).filter(d => d.isDirectory() && d.name !== 'latest').sort((a, b) => b.name.localeCompare(a.name));
    if (dirs.length === 0) { console.log('FAIL: no sessions to check'); process.exit(1); }
    await checkSession(join(DATA, dirs[0].name));
  }

  process.exit(exitCode);
}

main();
