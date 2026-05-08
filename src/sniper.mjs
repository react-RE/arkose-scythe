export class Sniper {
  #granary;
  #pending = new Map();
  #captured = [];
  #audioResolve = null;
  #audioPromise = null;
  #bdaPayloads = [];

  constructor(granary) {
    this.#granary = granary;
    this.#audioPromise = new Promise(r => { this.#audioResolve = r; });
  }

  arm(session) {
    session.on('Network.responseReceived', p => this.#onResponse(p));
    session.on('Network.loadingFinished', p => this.#onLoaded(p, session));
    session.on('Network.requestWillBeSent', p => this.#onRequest(p));
  }

  #match(url) {
    const u = url.toLowerCase();
    if ((u.includes('arkoselabs') || u.includes('funcaptcha')) && (u.endsWith('.js') || u.includes('.js?'))) return 'bundle';
    if (u.includes('/fc/gfct/')) return 'gfct';
    if (u.includes('/fc/gt2/')) return 'gt2';
    if (u.includes('/fc/ca/')) return 'ca';
    if (u.includes('/rtag/audio')) return 'audio';
    if (u.includes('/fc/a/')) return 'api';
    if (u.includes('/fc/init-load')) return 'api';
    if (u.includes('game-core') && u.endsWith('.js')) return 'bundle';
    if (u.includes('enforcement') && u.endsWith('.js')) return 'bundle';
    return null;
  }

  #onResponse(p) {
    const m = this.#match(p.response.url);
    if (!m) return;
    this.#pending.set(p.requestId, {
      requestId: p.requestId, url: p.response.url, type: m,
      headers: p.response.headers, mimeType: p.response.mimeType,
      timing: { start: Date.now() }, claimed: false,
    });
  }

  #onLoaded(p, session) {
    const e = this.#pending.get(p.requestId);
    if (!e || e.claimed) return;
    e.timing.end = Date.now();
    e.timing.duration = e.timing.end - e.timing.start;

    session.send('Network.getResponseBody', { requestId: p.requestId })
      .then(({ body, base64Encoded }) => {
        const buf = base64Encoded ? Buffer.from(body, 'base64') : Buffer.from(body);
        if (buf.length > 0) { e.claimed = true; this.#save(e, buf); }
      })
      .catch(() => { });
    this.#pending.delete(p.requestId);
  }

  #save(e, buf) {
    if (e.type === 'bundle') this.#granary.storeBundle(e.url, buf, e.headers, e.timing);
    else if (e.type === 'audio') {
      this.#granary.storeMedia(e.url, buf, e.headers, e.timing);
      if (this.#audioResolve) { this.#audioResolve(true); this.#audioResolve = null; }
    } else {
      let t; try { t = buf.toString('utf-8'); } catch { t = buf.toString(); }
      this.#granary.storeAPI(e.url, t, e.headers, e.timing);
    }
    this.#captured.push({ url: e.url, type: e.type, size: buf.length });
  }

  #onRequest(p) {
    if (p.method !== 'POST' || !p.request?.postData) return;
    const u = p.request.url;
    if (!u.includes('arkoselabs') && !u.includes('/fc/')) return;
    if (p.request.postData.length > 0) {
      this.#bdaPayloads.push(this.#granary.storePayload(u, p.request.postData));
    }
  }

  waitForAudioRequest(t = 30000) { return Promise.race([this.#audioPromise, new Promise(r => setTimeout(() => r(false), t))]); }

  summary() {
    return {
      totalCaptures: this.#captured.length, totalPayloads: this.#bdaPayloads.length,
      captures: this.#captured, payloads: this.#bdaPayloads,
    };
  }
}
