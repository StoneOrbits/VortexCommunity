export default class Lightshow {
  static count = 0;

  constructor(vortexLib, canvasId, sectionCount = 100) {
    this.id = Lightshow.count++;
    this.setupCanvas(canvasId);
    this.initializeVortex(vortexLib);
    this.configureDisplay(sectionCount);
    this.loadModeData();
  }

  setupCanvas(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) throw new Error(`Canvas with ID ${canvasId} not found`);

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = this.canvas.getContext('2d');
    this.clearCanvas();
    this.modeId = canvasId.split('_')[1];
  }

  initializeVortex(vortexLib) {
    this.vortexLib = vortexLib;
    this.vortex = new vortexLib.Vortex();
    this.vortex.init();
    this.vortex.setLedCount(1);
    this.modes = this.vortex.engine().modes();
    this.vortexLib.RunTick(this.vortex); // Initial tick
  }

  configureDisplay(sectionCount) {
    this.sectionCount = sectionCount;
    this.sectionWidth = this.canvas.width / this.sectionCount;
    this.history = [];
    this.boundDraw = this.draw.bind(this);
    this.animationFrameId = null;
  }

  loadModeData() {
    const modeDataAttr = this.canvas.getAttribute('data-mode');
    if (modeDataAttr) {
      this.applyModeData(JSON.parse(modeDataAttr));
    } else {
      console.log("No mode data for lightshow " + this.canvas.id);
    }
  }

  clearCanvas() {
    this.ctx.fillStyle = 'rgba(0, 0, 0)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  applyModeData(modeData) {
    this.modeData = modeData;
    let colorSet = new this.vortexLib.Colorset();

    modeData.colorset.forEach(hex => {
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

  setPatternAndArgs(mode) {
    let patternId = this.vortexLib.intToPatternID(this.modeData.pattern_id);
    mode.setPattern(patternId, this.ledCount(), null, null);

    let patternArgs = new this.vortexLib.PatternArgs();
    this.modeData.args.forEach(arg => patternArgs.addArgs(arg));
    this.vortex.setPatternArgs(this.ledCount(), patternArgs, false);

    mode.init(); // Re-initialize to apply new args
  }

  ledCount() {
    return this.vortex.engine().leds().ledCount();
  }

  draw() {
    if (this._pause) return;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const newColor = this.vortexLib.RunTick(this.vortex);
    if (newColor) this.history.push({ color: newColor[0], x: 0, opacity: 1 });

    this.history.forEach(segment => this.drawSegment(segment));

    this.history = this.history.filter(segment => segment.x < this.canvas.width);
    this.animationFrameId = requestAnimationFrame(this.boundDraw);
  }

  drawSegment(segment) {
    if (segment.color.red !== 0 || segment.color.green !== 0 || segment.color.blue !== 0) {
      this.ctx.fillStyle = `rgba(${segment.color.red}, ${segment.color.green}, ${segment.color.blue}, ${segment.opacity})`;
      this.ctx.fillRect(segment.x, 0, this.sectionWidth, this.canvas.height);
    }
    segment.x += this.sectionWidth;
  }

  start() {
    this._pause = false;
    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(this.boundDraw);
    }
  }

  stop() {
    this._pause = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // get the pattern
  getPattern() {
    const demoMode = this.modes.curMode();
    return demoMode.getPattern(this.vortexLib.LedPos.LED_0);
  }

  // set the pattern
  setPattern(patternIDValue) {
    // the selected dropdown pattern
    const selectedPattern = this.vortexLib.PatternID.values[patternIDValue];
    // grab the 'preview' mode for the current mode (randomizer)
    let demoMode = this.modes.curMode();
    // set the pattern of the demo mode to the selected dropdown pattern on all LED positions
    // with null args and null colorset (so they are defaulted and won't change)
    demoMode.setPattern(selectedPattern, this.ledCount(), null, null);
    // re-initialize the demo mode so it takes the new args into consideration
    demoMode.init();
  }

  // get colorset
  getColorset() {
    const demoMode = this.modes.curMode();
    if (!demoMode) {
      return new this.vortexLib.Colorset();
    }
    return demoMode.getColorset(this.vortexLib.LedPos.LED_0);
  }

  // update colorset
  setColorset(colorset) {
    // grab the 'preview' mode for the current mode (randomizer)
    let demoMode = this.modes.curMode();
    if (!demoMode) {
      return;
    }
    // set the colorset of the demo mode
    demoMode.setColorset(colorset, this.ledCount());
    // re-initialize the demo mode because num colors may have changed
    demoMode.init();
  }

  // add a color to the colorset
  addColor(r, g, b) {
    let set = this.getColorset();
    set.addColor(new this.vortexLib.RGBColor(r, g, b));
    this.setColorset(set);
  }

  // delete a color from the colorset
  delColor(index) {
    let set = this.getColorset();
    if (set.numColors() <= 1) {
      return;
    }
    set.removeColor(index);
    this.setColorset(set);
  }

  // update a color in the colorset
  updateColor(index, r, g, b) {
    let set = this.getColorset();
    set.set(index, new this.vortexLib.RGBColor(r, g, b));
    this.setColorset(set);
  }

  // randomize the pattern
  randomize() {
    this.vortex.openRandomizer();
    this.vortex.longClick(0);
    this.vortex.shortClick(0);
    this.vortex.longClick(0);
    // whatever reason we need 3 ticks to clear through the longClick
    // randomize idk it really shouldn't take that long
    for (let i = 0; i < 3; ++i) {
      this.vortexLib.RunTick(this.vortex);
    }
  }
}
