export default class Lightshow {
  static instanceCount = 0;

  // constructor for draw6
  constructor(vortexLib, canvasId, configurableSectionCount = 100) {
    this.id = Lightshow.instanceCount++;
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas with ID ${canvasId} not found`);
    }
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.modeId = canvasId.split('_')[1];
    this.ctx = this.canvas.getContext('2d');
    this.history = [];
    this.vortexLib = vortexLib;
    this.vortex = new vortexLib.Vortex();
    this.vortex.init();
    this.vortex.setLedCount(1);
    this.modes = this.vortex.engine().modes();
    // Run the first tick, at the moment I'm not quite sure why this first
    // tick is spitting out the color red instead of whatever it's supposed to be
    // I think it's just a wasm thing though so I'll find it later
    this.vortexLib.RunTick(this.vortex);
    this.animationFrameId = null;
    this.configurableSectionCount = configurableSectionCount;
    this.sectionWidth = this.canvas.width / this.configurableSectionCount;
    this.boundDraw = this.draw.bind(this);
    this.ctx.fillStyle = 'rgba(0, 0, 0)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.loadModeData();
  }

  loadModeData() {
    // Logic to load the JSON file for this.modeId
    // For example, fetch the JSON from the server
    fetch(`/modes/${this.modeId}.json`)
      .then(response => response.json())
      .then(modeData => {
        // hang onto the mode data but also apply it
        this.modeData = modeData;
        this.applyModeData();
      })
      .catch(error => {
        console.error('Error loading mode data:', error);
      });
  }

  applyModeData() {
    if (!this.modeData) {
      return;
    }
    var set = new this.vortexLib.Colorset();
    this.modeData.colorset.forEach(hexCode => {
      const normalizedHex = hexCode.replace('0x', '#');
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalizedHex);
      if (result) {
        set.addColor(new this.vortexLib.RGBColor(
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ));
      }
    });
    // grab the 'preview' mode for the current mode (randomizer)
    let demoMode = this.modes.curMode();
    if (!demoMode) {
      return;
    }
    // set the colorset of the demo mode
    demoMode.setColorset(set, this.ledCount());
    // set the pattern of the demo mode to the selected dropdown pattern on all LED positions
    // with null args and null colorset (so they are defaulted and won't change)
    demoMode.setPattern(this.modeData.pattern_id, this.ledCount(), null, null);
    let args = new this.vortexLib.PatternArgs();
    for (let i = 0; i < this.modeData.args.length; ++i) {
      args.addArgs(this.modeData.args[i]);
    }
    this.vortex.setPatternArgs(this.ledCount(), args, false);
    // re-initialize the demo mode so it takes the new args into consideration
    demoMode.init();
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

  ledCount() {
    return this.vortex.engine().leds().ledCount();
  }

  draw() {
    if (this._pause) return;

    // Clear the canvas with a slight opacity for a fading effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const sectionWidth = this.canvas.width / this.configurableSectionCount; // Define this value as per your requirement
    const movementSpeed = sectionWidth; // Each tick moves one section width

    // Generate a new color or create a gap
    const led = this.vortexLib.RunTick(this.vortex);
    if (led) {
      this.history.push({ color: led[0], x: 0, opacity: 1 });
    }

    // Draw the sections
    this.history.forEach((segment, index) => {
      if (segment.color.red !== 0 || segment.color.green !== 0 || segment.color.blue !== 0) { // Check if color is not 'off'
        this.ctx.fillStyle = `rgba(${segment.color.red}, ${segment.color.green}, ${segment.color.blue}, ${segment.opacity})`;
        this.ctx.fillRect(segment.x, 0, sectionWidth, this.canvas.height);
      }

      segment.x += movementSpeed;
    });

    // Remove segments that moved off the canvas
    this.history = this.history.filter(segment => segment.x < this.canvas.width);

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
