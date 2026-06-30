import controller from './LightshowController.js';

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
    this._tickInterval = 1000 / 20;
    this._pause = false;
    this._rafId = null;

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
      if (newColor) {
        const { red: r, green: g, blue: b } = newColor[0];
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const r2 = Math.max(w, h) / 2;

        const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, r2);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.15, 'rgba(0,0,0,0)');
        grad.addColorStop(0.35, `rgba(${r},${g},${b},0.5)`);
        grad.addColorStop(0.6, `rgb(${r},${g},${b})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, w, h);
      }
    }

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
