class LightshowController {
  constructor() {
    this.settings = { speed: 20, playMode: 'always', previewMode: 'device' };
    this.instances = [];
    this.loadFromStorage();
  }

  register(instance) {
    this.instances.push(instance);
    this.applySettings(instance);
  }

  unregister(instance) {
    this.instances = this.instances.filter(i => i !== instance);
  }

  applySettings(instance) {
    if (this.settings.speed === 0) {
      this.removeHover(instance);
      instance.stop();
      return;
    }
    if (instance.vortex) {
      instance.vortex.setTickrate(this.settings.speed);
    }
    instance._tickInterval = 1000 / this.settings.speed;
    instance._hoverEl = instance._hoverEl || this.resolveHoverEl(instance);
    if (this.settings.playMode === 'always') {
      this.removeHover(instance);
      instance.start();
    } else if (this.settings.playMode === 'hover') {
      instance.stop();
      this.addHover(instance);
    }
  }

  resolveHoverEl(instance) {
    if (instance.circle) {
      return instance.circle.closest('svg') || instance.circle;
    }
    if (instance.canvas) {
      return instance.canvas.closest('.mode-tile, .pat-item, [class*="led-strip"]') || instance.canvas.parentElement;
    }
    return null;
  }

  addHover(instance) {
    const el = instance._hoverEl;
    if (!el) return;
    instance._hoverStart = () => instance.start();
    instance._hoverStop = () => instance.stop();
    el.addEventListener('mouseenter', instance._hoverStart);
    el.addEventListener('mouseleave', instance._hoverStop);
  }

  removeHover(instance) {
    const el = instance._hoverEl;
    if (!el) return;
    if (instance._hoverStart) {
      el.removeEventListener('mouseenter', instance._hoverStart);
      el.removeEventListener('mouseleave', instance._hoverStop);
      delete instance._hoverStart;
      delete instance._hoverStop;
    }
  }

  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
    this.instances.forEach(inst => this.applySettings(inst));
    this.saveToStorage();
  }

  saveToStorage() {
    try {
      localStorage.setItem('lightshowSettings', JSON.stringify(this.settings));
    } catch (e) {}
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem('lightshowSettings');
      if (saved) Object.assign(this.settings, JSON.parse(saved));
    } catch (e) {}
  }
}

const controller = new LightshowController();
export default controller;
