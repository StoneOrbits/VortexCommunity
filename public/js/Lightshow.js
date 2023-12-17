export default class Lightshow {
  static instanceCount = 0;

  constructor(vortexLib, canvasId) {
    this.id = Lightshow.instanceCount++;
    this.tickRate = 10;
    this.trailSize = 100; // Adjust for desired trail length
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas with ID ${canvasId} not found`);
    }
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = this.canvas.getContext('2d');
    this.history = [];
    this.vortexLib = vortexLib;
    this.vortex = new vortexLib.Vortex();
    this.vortex.init();
    this.modes = this.vortex.engine().modes();
    this.animationFrameId = null;
    this.boundDraw = this.draw.bind(this);
    // erase the background
    this.ctx.fillStyle = 'rgba(0, 0, 0)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  set tickRate(value) {
    const intValue = parseInt(value, 10);
    this._tickRate = intValue > 0 ? intValue : 1;
  }

  get tickRate() {
    return this._tickRate || 1;
  }

  set trailSize(value) {
    const intValue = parseInt(value, 10);
    this._trailSize = intValue > 0 ? intValue : 1;
  }

  get trailSize() {
    return this._trailSize || 100;
  }

  draw() {
    if (this._pause) return;

    // Clear the canvas with a slight opacity to create a fading trail effect
    //this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    //this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Add a new segment
    const led = this.vortexLib.RunTick(this.vortex);
    if (led) {
      this.history.push({ color: led[0], x: 0 });
    }

    // Draw each segment and move it to the left
    this.history.forEach((segment, index) => {
      this.ctx.fillStyle = `rgba(${segment.color.red}, ${segment.color.green}, ${segment.color.blue}, 0.3)`;
      this.ctx.fillRect(segment.x, 0, this.canvas.width / this.trailSize, this.canvas.height);
      segment.x += this.tickRate;
    });

    // Remove segments that moved off the canvas
    this.history = this.history.filter(segment => segment.x < this.canvas.width);

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.boundDraw);
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
    demoMode.setPattern(selectedPattern, this.vortexLib.LedPos.LED_ALL, null, null);
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
