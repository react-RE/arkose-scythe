import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

const FLAGS = [
  '--disable-site-isolation-trials',
  '--disable-blink-features=AutomationControlled',
  '--remote-debugging-port=0',
  '--no-sandbox',
  '--disable-features=IsolateOrigins,site-per-process',
  '--enable-features=NetworkService,NetworkServiceInProcess',
  '--window-size=1920,1080',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-breakpad',
  '--disable-component-update',
  '--disable-domain-reliability',
  '--disable-sync',
];

function findChrome() {
  const env = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (env) return env;
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable']) {
    try { execSync(`test -x ${p}`); return p; } catch { }
  }
  try {
    const w = execSync('which chromium chromium-browser google-chrome google-chrome-stable 2>/dev/null', { encoding: 'utf-8' }).trim().split('\n')[0];
    if (w) return w;
  } catch { }
  return null;
}

function genUA() {
  const list = [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  ];
  return list[Math.floor(Math.random() * list.length)];
}

function headlessMode() {
  const e = process.env.SCYTHE_HEADLESS;
  if (e === 'true' || e === '1') return 'new';
  if (!process.env.DISPLAY) return 'new';
  return false;
}

export async function launch(retries = 3) {
  const chromePath = findChrome();
  for (let i = 0; i < retries; i++) {
    try {
      const opts = { headless: headlessMode(), args: FLAGS, defaultViewport: { width: 1920, height: 1080 } };
      if (chromePath) opts.executablePath = chromePath;
      return { browser: await puppeteer.launch(opts), ua: genUA() };
    } catch (err) {
      console.error(`[forge] ${i + 1}/${retries} fail: ${err.message}`);
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

export async function setupCDP(page) {
  const s = await page.target().createCDPSession();
  await s.send('Runtime.enable');
  await s.send('Network.enable', { maxTotalBufferSize: 500_000_000, maxResourceBufferSize: 50_000_000 });
  await s.send('Page.enable');
  await s.send('Network.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' });
  return s;
}

export async function createPage(b) { return b.newPage(); }
export async function close(b) { try { await b.close(); } catch { } }
