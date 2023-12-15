export default class Lightshow {
  constructor(vortexLib, canvasId) {
    this.dotSize = 25;
    this.blurFac = 5;
    this.tickRate = 3;
    this.trailSize = 100;
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas with ID ${canvasId} not found`);
    }
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = this.canvas.getContext('2d');
    this.angle = 0;
    this.history = [];
    this.needRefresh = true;
    this.sendDemoNow = false;
    this.currentTooltip = null;
    this.vortexLib = vortexLib;
    this.paused = false;
  }

  set tickRate(value) {
    this._tickRate = parseInt(value, 10);
  }

  get tickRate() {
    return this._tickRate;
  }

  set trailSize(value) {
    this._trailSize = parseInt(value, 10);
    if (this.history && this.history.length > this._trailSize) {
      const itemsToRemove = this.history.length - this._trailSize;
      this.history.splice(0, itemsToRemove);
    }
  }

  get trailSize() {
    return this._trailSize;
  }

  set dotSize(value) {
    this._dotSize = parseInt(value, 10);
  }

  get dotSize() {
    return this._dotSize;
  }

  set blurFac(value) {
    this._blurFac = parseInt(value, 10);
  }

  get blurFac() {
    return this._blurFac;
  }

  set width(value) {
    this.canvas.width = value;
  }

  get width() {
    return this.canvas.width;
  }

  set height(value) {
    this.canvas.height = value;
  }

  get height() {
    return this.canvas.height;
  }

  set paused(value) {
    this._pause = value;
  }
  
  get paused() {
    return this._pause;
  }

  init() {
    this.draw();
  }

  draw() {
    if (this._pause) {
      return;
    }

    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update history with new color
    const led = this.vortexLib.Tick();
    if (led) {
      this.history.push({ color: led[0], width: this.canvas.width / this.trailSize });
    }

    // Limit the history length
    if (this.history.length > this.trailSize) {
      this.history.shift(); // Remove the oldest segment to keep the trail size constant
    }

    // Calculate the total width of all segments in the history
    let totalWidth = this.history.reduce((sum, point) => sum + point.width, 0);

    // Start drawing from the rightmost part of the canvas
    let x = this.canvas.width - totalWidth;

    // Draw each segment of the progress bar
    this.history.forEach(point => {
      if (!point.color.red && !point.color.green && !point.color.blue) {
        x += point.width; // Skip drawing but update the x position
        return;
      }
      this.ctx.fillStyle = `rgba(${point.color.red}, ${point.color.green}, ${point.color.blue}, 1)`;
      this.ctx.fillRect(x, 0, point.width, this.canvas.height);
      x += point.width;
    });

    // Request next frame
    requestAnimationFrame(this.draw.bind(this));
  }

  // get the pattern
  getPattern() {
    const demoMode = this.vortexLib.Modes.curMode();
    return demoMode.getPattern(this.vortexLib.LedPos.LED_0);
  }

  // set the pattern
  setPattern(patternIDValue) {
    // the selected dropdown pattern
    const selectedPattern = this.vortexLib.PatternID.values[patternIDValue];
    // grab the 'preview' mode for the current mode (randomizer)
    let demoMode = this.vortexLib.Modes.curMode();
    // set the pattern of the demo mode to the selected dropdown pattern on all LED positions
    // with null args and null colorset (so they are defaulted and won't change)
    demoMode.setPattern(selectedPattern, this.vortexLib.LedPos.LED_ALL, null, null);
    // re-initialize the demo mode so it takes the new args into consideration
    demoMode.init();
  }

  // get colorset
  getColorset() {
    const demoMode = this.vortexLib.Modes.curMode();
    return demoMode.getColorset(this.vortexLib.LedPos.LED_0);
  }

  // update colorset
  setColorset(colorset) {
    // grab the 'preview' mode for the current mode (randomizer)
    let demoMode = this.vortexLib.Modes.curMode();
    // set the colorset of the demo mode
    demoMode.setColorset(colorset, this.vortexLib.LedPos.LED_ALL);
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
    this.vortexLib.Vortex.openRandomizer();
    this.vortexLib.Vortex.longClick(0);
    this.vortexLib.Vortex.shortClick(0);
    this.vortexLib.Vortex.longClick(0);
    // whatever reason we need 3 ticks to clear through the longClick
    // randomize idk it really shouldn't take that long
    for (let i = 0; i < 3; ++i) {
      this.vortexLib.Tick();
    }
  }
}
