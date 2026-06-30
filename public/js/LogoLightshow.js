import controller from './LightshowController.js';

const INNER = 0.12;
const OUTER = 0.9;
const TRAIL_LEN = 32;

export default class LogoLightshow {
  constructor(vortexLib, canvas) {
    this.canvas = canvas;
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    this.ctx = canvas.getContext('2d');
    this.vortexLib = vortexLib;
    this.vortex = new vortexLib.Vortex();
    this.vortex.init();
    this.vortex.setLedCount(1);
    this.modes = this.vortex.engine().modes();
    this.vortexLib.RunTick(this.vortex);

    this._lastTickTime = 0;
    this._tickInterval = 1000 / 24;
    this._pause = false;
    this._rafId = null;
    this._sweepAngle = 0;
    this._lastFrameTime = 0;
    this._colorHistory = new Array(TRAIL_LEN).fill({ r: 60, g: 60, b: 100 });
    this._head = 0;

    controller.register(this);
  }

  loadPattern(patData) {
    const pat = patData.data || patData;
    if (!pat || !pat.colorset) return;

    const colorSet = new this.vortexLib.Colorset();
    pat.colorset.forEach(hex => {
      const c = hex.replace('0x', '#');
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(c);
      if (m) {
        colorSet.addColor(new this.vortexLib.RGBColor(
          parseInt(m[1], 16),
          parseInt(m[2], 16),
          parseInt(m[3], 16)
        ));
      }
    });

    const demoMode = this.modes.curMode();
    demoMode.setColorset(colorSet, 1);

    if (pat.pattern_id !== undefined) {
      const pid = this.vortexLib.intToPatternID(pat.pattern_id);
      demoMode.setPattern(pid, 1, null, null);

      if (pat.args) {
        const args = new this.vortexLib.PatternArgs();
        pat.args.forEach(a => args.addArgs(a));
        this.vortex.setPatternArgs(1, args, false);
      }
    }

    demoMode.init();
    this.vortexLib.RunTick(this.vortex);
  }

  draw() {
    if (this._pause) return;

    const now = performance.now();
    if (now - this._lastTickTime >= this._tickInterval) {
      this._lastTickTime = now;
      const newColor = this.vortexLib.RunTick(this.vortex);
      if (newColor && newColor[0]) {
        this._colorHistory[this._head] = { r: newColor[0].red, g: newColor[0].green, b: newColor[0].blue };
        this._head = (this._head + 1) % TRAIL_LEN;
      }
    }

    const dt = this._lastFrameTime ? Math.min(now - this._lastFrameTime, 100) : 0;
    this._lastFrameTime = now;
    this._sweepAngle += dt * 0.003;
    if (this._sweepAngle > 2 * Math.PI) this._sweepAngle -= 2 * Math.PI;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const rMax = Math.min(w, h) / 2;
    const rIn = rMax * INNER;
    const rOut = rMax * OUTER;
    const rMid = (rIn + rOut) / 2;
    const rWidth = rOut - rIn;

    this.ctx.clearRect(0, 0, w, h);

    const imageData = this.ctx.createImageData(w, h);
    const d = imageData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx + 0.5;
        const dy = y - cy + 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < rIn || dist > rOut) continue;

        const angle = Math.atan2(dy, dx);
        const relAngle = ((angle - this._sweepAngle) / (2 * Math.PI) + 1) % 1;
        const trailIdx = Math.round(relAngle * (TRAIL_LEN - 1));
        const idx = (this._head - 1 - trailIdx + TRAIL_LEN * 2) % TRAIL_LEN;
        const c = this._colorHistory[idx];

        const radialPos = (dist - rIn) / rWidth;
        const falloff = 1 - Math.abs(radialPos - 0.5) * 1.4;
        const trailWeight = Math.max(0, 1 - (trailIdx / TRAIL_LEN) * 0.7);

        const alpha = Math.min(1, Math.max(0, trailWeight * falloff));
        if (alpha < 0.02) continue;

        const offset = (y * w + x) * 4;
        d[offset] = Math.round(c.r * alpha);
        d[offset + 1] = Math.round(c.g * alpha);
        d[offset + 2] = Math.round(c.b * alpha);
        d[offset + 3] = 255;
      }
    }

    this.ctx.putImageData(imageData, 0, 0);

    this._rafId = requestAnimationFrame(() => this.draw());
  }

  start() {
    this._pause = false;
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(() => this.draw());
    }
  }

  stop() {
    this._pause = true;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
}
