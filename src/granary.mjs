import { mkdir, writeFile, symlink, unlink } from 'fs/promises';
import { join, extname } from 'path';
import { createHash } from 'crypto';

export class Granary {
  #basePath;
  #sessionDir;
  #sessionTimestamp;
  #manifest = { session: {}, frames: [], captures: [], payloads: [], missing: [] };

  constructor(basePath) {
    this.#basePath = basePath || '../arkose-scythe-data/bundles';
  }

  async init() {
    const now = new Date();
    this.#sessionTimestamp = now.toISOString().replace(/:/g, '-');
    this.#sessionDir = join(this.#basePath, this.#sessionTimestamp);

    await mkdir(join(this.#sessionDir, 'js'), { recursive: true });
    await mkdir(join(this.#sessionDir, 'api'), { recursive: true });
    await mkdir(join(this.#sessionDir, 'payloads'), { recursive: true });
    await mkdir(join(this.#sessionDir, 'media'), { recursive: true });

    this.#manifest.session = {
      timestamp: now.toISOString(),
      url: 'https://github.com/signup',
      userAgent: '',
      success: false,
      retryCount: 0,
    };

    return { sessionDir: this.#sessionDir, timestamp: this.#sessionTimestamp };
  }

  setUa(ua) {
    this.#manifest.session.userAgent = ua;
  }

  setRetry(n) {
    this.#manifest.session.retryCount = n;
  }

  set(key, val) {
    const keys = key.split('.');
    let target = this.#manifest;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = val;
  }

  #hash(url) {
    return createHash('sha256').update(url).digest('hex').slice(0, 8);
  }

  #label(url, body) {
    const u = url.toLowerCase();
    if (body) {
      if (body.includes('game-core')) return 'game-core';
      if (body.includes('enforcement')) return 'enforcement';
      if (body.includes('audio-ui') || body.includes('audio')) return 'audio-ui';
    }
    if (u.includes('game-core')) return 'game-core';
    if (u.includes('enforcement')) return 'enforcement';
    if (u.includes('audio')) return 'audio-ui';
    return 'unknown';
  }

  storeBundle(url, body, headers, timing) {
    const label = this.#label(url, body.toString());
    const h = this.#hash(url);
    const filename = `${label}_${h}.js`;
    const filepath = join(this.#sessionDir, 'js', filename);
    return this.#write(url, 'js-bundle', label, filepath, body, headers, timing, 'application/javascript');
  }

  storeAPI(url, body, headers, timing) {
    const u = url.toLowerCase();
    let label = 'api';
    if (u.includes('gfct')) label = 'gfct';
    else if (u.includes('gt2')) label = 'gt2';
    else if (u.includes('ca')) label = 'ca';
    else if (u.includes('rtag') || u.includes('audio')) label = 'rtag-audio';

    const ext = '.json';
    const filename = `${label}${ext}`;
    const filepath = join(this.#sessionDir, 'api', filename);
    return this.#write(url, 'api-response', label, filepath, body, headers, timing, 'application/json');
  }

  storeMedia(url, body, headers, timing) {
    const filename = 'audio_track.mp3';
    const filepath = join(this.#sessionDir, 'media', filename);
    return this.#write(url, 'media', 'audio', filepath, body, headers, timing, 'audio/mpeg');
  }

  storePayload(url, postData) {
    const entry = {
      url,
      method: 'POST',
      data: postData,
      timestamp: new Date().toISOString(),
    };
    this.#manifest.payloads.push(entry);
    return entry;
  }

  storeFrame(frame) {
    this.#manifest.frames.push(frame);
  }

  #write(url, type, label, filepath, body, headers, timing, mimeType) {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
    writeFile(filepath, buf).catch(err => {
      console.error(`[granary] write error ${filepath}: ${err.message}`);
    });

    const entry = {
      url,
      type,
      label,
      size: buf.length,
      path: filepath,
      timestamp: new Date().toISOString(),
      mimeType,
      headers: {
        etag: headers?.etag || null,
        lastModified: headers?.['last-modified'] || null,
        contentLength: headers?.['content-length'] || String(buf.length),
        contentType: headers?.['content-type'] || mimeType,
      },
      timing: {
        start: timing?.start ? new Date(timing.start).toISOString() : null,
        end: timing?.end ? new Date(timing.end).toISOString() : null,
        durationMs: timing?.duration || null,
      },
    };
    this.#manifest.captures.push(entry);
    return entry;
  }

  async writeManifest() {
    const path = join(this.#sessionDir, 'metadata.json');
    await writeFile(path, JSON.stringify(this.#manifest, null, 2));
  }

  async createLatestSymlink() {
    const latestPath = join(this.#basePath, 'latest');
    try {
      await unlink(latestPath);
    } catch { }
    try {
      await symlink(this.#sessionTimestamp, latestPath);
    } catch { }
  }

  get sessionDir() { return this.#sessionDir; }
  get manifest() { return this.#manifest; }
  get captures() { return this.#manifest.captures; }
  get payloads() { return this.#manifest.payloads; }
}
