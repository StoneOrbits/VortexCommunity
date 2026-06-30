import controller from './LightshowController.js';

export default class SvgLightshow {
  static count = 0;

  constructor(vortexLib, circleElement, options = {}) {
    this.id = SvgLightshow.count++;
    this.type = options.type || 'flashing';
    this.circle = circleElement;
    this.initializeVortex(vortexLib);
    this.loadPatData();
    this.boundFlashDraw = this.flashDraw.bind(this);
    this._lastTickTime = 0;
    this._tickInterval = 1000 / 20;
    this.gradient = null;
    this.stop1 = null;
    this.stop2 = null;
    this.stop3 = null;
    controller.register(this);
  }

  initializeVortex(vortexLib) {
    this.vortexLib = vortexLib;
    this.vortex = new vortexLib.Vortex();
    this.vortex.init();
    this.vortex.setLedCount(1);
    this.modes = this.vortex.engine().modes();
    this.vortexLib.RunTick(this.vortex);
  }

  loadPatData() {
    const patDataAttr = this.circle.getAttribute('data-pat');
    if (patDataAttr) {
      this.applyPatData(JSON.parse(patDataAttr));
    }
  }

  applyPatData(patData) {
    this.patData = patData;
    let colorSet = new this.vortexLib.Colorset();

    patData.colorset.forEach(hex => {
      let color = hex.replace('0x', '#');
      let rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
      if (rgb) {
        colorSet.addColor(new this.vortexLib.RGBColor(
          parseInt(rgb[1], 16),
          parseInt(rgb[2], 16),
          parseInt(rgb[3], 16)
        ));
      }
    });

    let previewMode = this.getCurrentMode();
    if (!previewMode) return;

    previewMode.setColorset(colorSet, this.ledCount());
    this.setPatternAndArgs(previewMode);
  }

  getCurrentMode() {
    return this.modes.curMode();
  }

  ledCount() {
    return this.vortex.engine().leds().ledCount();
  }

  setPatternAndArgs(mode) {
    let patternId = this.vortexLib.intToPatternID(this.patData.pattern_id);
    mode.setPattern(patternId, this.ledCount(), null, null);

    let patternArgs = new this.vortexLib.PatternArgs();
    this.patData.args.forEach(arg => patternArgs.addArgs(arg));
    this.vortex.setPatternArgs(this.ledCount(), patternArgs, false);

    mode.init();
  }

  ensureGradient() {
    if (this.gradient) return;
    const svg = this.circle.ownerSVGElement;
    if (!svg) return;
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }
    this.gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    this.gradient.id = `led-grad-${this.id}`;
    this.gradient.setAttribute('cx', '50%');
    this.gradient.setAttribute('cy', '50%');
    this.gradient.setAttribute('r', '50%');
    this.gradient.setAttribute('fx', '50%');
    this.gradient.setAttribute('fy', '50%');
    this.stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    this.stop1.setAttribute('offset', '0%');
    this.stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    this.stop2.setAttribute('offset', '65%');
    this.stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    this.stop3.setAttribute('offset', '100%');
    this.stop3.setAttribute('stop-opacity', '0');
    this.gradient.appendChild(this.stop1);
    this.gradient.appendChild(this.stop2);
    this.gradient.appendChild(this.stop3);
    defs.appendChild(this.gradient);
    this.circle.style.fill = `url(#${this.gradient.id})`;
  }

  flashDraw() {
    if (this._pause) return;

    const now = performance.now();
    if (now - this._lastTickTime >= this._tickInterval) {
      this._lastTickTime = now;
      const newColor = this.vortexLib.RunTick(this.vortex);
      if (newColor) {
        const r = newColor[0].red;
        const g = newColor[0].green;
        const b = newColor[0].blue;
        this.ensureGradient();
        if (this.stop1) {
          const color = `rgb(${r},${g},${b})`;
          this.stop1.setAttribute('stop-color', color);
          this.stop2.setAttribute('stop-color', color);
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(this.boundFlashDraw);
  }

  start() {
    this._pause = false;
    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(this.boundFlashDraw);
    }
  }

  stop() {
    this._pause = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
