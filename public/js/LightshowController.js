class LightshowController {
  constructor() {
    this.settings = { speed: 20, playMode: 'always', previewMode: 'device' };
    this.logoSettings = { speed: 20, playMode: 'always' };
    this.instances = [];
    this.logoInstances = [];
    this.loadFromStorage();
  }

  register(instance) {
    this.instances.push(instance);
    this.applySettings(instance);
    if (this.settings.playMode === 'always' && this.settings.speed !== 0) {
      setTimeout(() => { instance._pause = false; if (!instance._rafId) instance.start(); }, 50);
    }
  }

  registerLogo(instance) {
    instance._isLogo = true;
    this.logoInstances.push(instance);
    this.applyLogoSettings(instance);
    if (this.logoSettings.playMode === 'always' && this.logoSettings.speed !== 0) {
      setTimeout(() => { instance._pause = false; if (!instance._rafId) instance.start(); }, 50);
    }
  }

  unregister(instance) {
    if (instance._isLogo) {
      this.logoInstances = this.logoInstances.filter(i => i !== instance);
    } else {
      this.instances = this.instances.filter(i => i !== instance);
    }
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

  applyLogoSettings(instance) {
    if (this.logoSettings.speed === 0) {
      this.removeHover(instance);
      instance.stop();
      return;
    }
    if (instance.vortex) {
      instance.vortex.setTickrate(this.logoSettings.speed);
    }
    instance._tickInterval = 1000 / this.logoSettings.speed;
    instance._hoverEl = instance._hoverEl || this.resolveHoverEl(instance);
    if (this.logoSettings.playMode === 'always') {
      this.removeHover(instance);
      instance.start();
    } else if (this.logoSettings.playMode === 'hover') {
      instance.stop();
      this.addHover(instance);
    }
  }

  resolveHoverEl(instance) {
    if (instance._hoverEl) return instance._hoverEl;
    if (instance.circle) {
      return instance.circle.closest('svg') || instance.circle;
    }
    if (instance.canvas) {
      return instance.canvas.closest('.pat-tile, .mode-tile, .pat-item') || instance.canvas.closest('[class*="led-strip"]') || instance.canvas.parentElement;
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
    if (this.settings.playMode === 'always' && this.settings.speed !== 0) {
      setTimeout(() => this.instances.forEach(inst => { inst._pause = false; if (!inst._rafId) inst.start(); }), 50);
    }
  }

  updateLogoSettings(newSettings) {
    Object.assign(this.logoSettings, newSettings);
    this.logoInstances.forEach(inst => this.applyLogoSettings(inst));
    this.saveToStorage();
    if (this.logoSettings.playMode === 'always' && this.logoSettings.speed !== 0) {
      setTimeout(() => this.logoInstances.forEach(inst => { inst._pause = false; if (!inst._rafId) inst.start(); }), 50);
    }
  }

  saveToStorage() {
    try {
      const data = { main: this.settings, logo: this.logoSettings };
      localStorage.setItem('lightshowSettings', JSON.stringify(data));
    } catch (e) {}
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem('lightshowSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.main) {
          Object.assign(this.settings, parsed.main);
        } else {
          Object.assign(this.settings, parsed);
        }
        if (parsed.logo) Object.assign(this.logoSettings, parsed.logo);
      }
    } catch (e) {}
  }
}

const controller = new LightshowController();
export default controller;
