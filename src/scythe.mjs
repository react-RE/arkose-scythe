import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { launch, setupCDP, createPage, close as closeBrowser } from './forge.mjs';
import { Granary } from './granary.mjs';
import { Hawk } from './hawk.mjs';
import { Sniper } from './sniper.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
await readFile(join(__dirname, '..', 'config', 'selectors.json'), 'utf-8');

const CRITICAL = ['game-core', 'enforcement'];

function email() {
  return `sr.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}@mailbox.com`;
}

function validate(g) {
  const l = g.captures.map(c => c.label);
  const m = CRITICAL.filter(x => !l.includes(x));
  if (!l.includes('gfct')) m.push('gfct');
  return m;
}

async function findFrameId(s, sub, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const { frameTree } = await s.send('Page.getFrameTree');
    const q = [frameTree];
    while (q.length) {
      const n = q.shift();
      if (n.frame.url.toLowerCase().includes(sub)) return n.frame.id;
      if (n.childFrames) q.push(...n.childFrames);
    }
    await new Promise(r => setTimeout(r, 200));
  }
  return null;
}

async function clickInFrame(s, fid, sel) {
  const { executionContextId } = await s.send('Page.createIsolatedWorld', {
    frameId: fid, worldName: `sc_${Date.now()}`, grantUniversalAccess: true,
  });
  await s.send('Runtime.evaluate', {
    contextId: executionContextId,
    expression: `new Promise(r => {
      const check = () => {
        const e = document.querySelector(${JSON.stringify(sel)});
        if (e) { e.click(); r('OK'); }
        else setTimeout(check, 100);
      };
      check();
      setTimeout(() => r('TIMEOUT'), 8000);
    })`,
    awaitPromise: true,
  });
}

async function reap() {
  let browser = null;
  let retries = 0;

  while (retries < 2) {
    try {
      const { browser: b, ua } = await launch();
      browser = b; activeBrowser = b;
      const page = await createPage(browser);
      const session = await setupCDP(page);

      const granary = new Granary();
      await granary.init();
      granary.setUa(ua);
      granary.setRetry(retries);

      const hawk = new Hawk();
      hawk.watch(session);
      hawk.poll(session, 150);
      hawk.onArkoseFrame(f => granary.storeFrame({ id: f.id, url: f.url, parentId: f.parentId, foundAt: new Date().toISOString() }));

      const sniper = new Sniper(granary);
      sniper.arm(session);

      const em = email();
      const un = `sr${Date.now().toString(36)}`;

      await page.goto('https://github.com/signup', { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector('#email', { timeout: 15000 });
      await page.type('#email', em, { delay: 20 });
      await page.waitForSelector('#password', { timeout: 5000 });
      await page.type('#password', 'ScytheReaper2024!', { delay: 20 });
      await page.waitForSelector('#login', { timeout: 5000 });
      await page.type('#login', un, { delay: 20 });
      await new Promise(r => setTimeout(r, 600));

      await page.evaluate(() => document.querySelector('.js-octocaptcha-load-captcha')?.click());

      const gcId = await findFrameId(session, 'game-core', 60000);
      if (!gcId) { console.log('no gc'); continue; }

      await new Promise(r => setTimeout(r, 2000));
      await clickInFrame(session, gcId, 'button:last-of-type');

      await new Promise(r => setTimeout(r, 3000));
      await clickInFrame(session, gcId, 'button:first-of-type');

      await new Promise(r => setTimeout(r, 1000));
      await sniper.waitForAudioRequest(30000);
      await new Promise(r => setTimeout(r, 2000));

      const s = sniper.summary();
      const m = validate(granary);
      granary.set('session.success', !m.length);
      granary.set('missing', m);
      await granary.writeManifest();
      await granary.createLatestSymlink();

      await closeBrowser(browser); browser = null; activeBrowser = null;
      if (!m.length) return granary.sessionDir;
    } catch (err) {
      console.error(`e: ${err.message}`);
    } finally {
      if (browser) { await closeBrowser(browser); browser = null; activeBrowser = null; }
    }
    retries++;
  }
  return null;
}

let activeBrowser = null;
process.on('SIGINT', async () => { if (activeBrowser) await closeBrowser(activeBrowser); process.exit(130); });
process.on('SIGTERM', async () => { if (activeBrowser) await closeBrowser(activeBrowser); process.exit(143); });

try {
  const r = await reap();
  if (r) { console.log(r); process.exit(0); }
  else process.exit(1);
} catch (e) { process.exit(1); }
