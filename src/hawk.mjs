export class Hawk {
  #frames = new Map();
  #timer = null;
  #onArkose = null;

  watch(session) {
    session.on('Page.frameAttached', ({ frameId, parentFrameId }) => {
      this.#frames.set(frameId, { id: frameId, parentId: parentFrameId, url: '', ts: Date.now() });
    });
    session.on('Page.frameNavigated', ({ frame }) => {
      const e = this.#frames.get(frame.id) || {};
      e.id = frame.id; e.url = frame.url || ''; e.parentId = frame.parentId || null; e.ts = Date.now();
      this.#frames.set(frame.id, e);
      if (frame.url?.includes('arkoselabs') && this.#onArkose) this.#onArkose(e);
    });
    session.on('Page.frameDetached', ({ frameId }) => this.#frames.delete(frameId));
  }

  poll(session, ms = 150) {
    this.#timer = setInterval(async () => {
      try {
        const { frameTree } = await session.send('Page.getFrameTree');
        this.#walk(frameTree.frame, null);
      } catch { }
    }, ms);
  }

  #walk(f, parentId) {
    if (!f) return;
    const e = this.#frames.get(f.id) || {};
    e.id = f.id; e.url = f.url || e.url; e.parentId = parentId; e.ts = Date.now();
    this.#frames.set(f.id, e);
    if (f.url?.includes('arkoselabs') && this.#onArkose) this.#onArkose(e);
    if (f.childFrames) for (const c of f.childFrames) this.#walk(c, f.id);
  }

  onArkoseFrame(cb) { this.#onArkose = cb; }

  getArkoseFrames() {
    return Array.from(this.#frames.values()).filter(f => f.url?.includes('arkoselabs')).map(f => ({
      id: f.id, url: f.url, parentId: f.parentId, foundAt: new Date(f.ts).toISOString(),
    }));
  }

  stop() { if (this.#timer) { clearInterval(this.#timer); this.#timer = null; } }
}
