import Lightshow from './Lightshow.js';
import SvgLightshow from './SvgLightshow.js';

let vortexLibPromise = null;
let vortexLib = null;

function getVortexLib() {
    if (vortexLib) return Promise.resolve(vortexLib);
    if (!vortexLibPromise) {
        vortexLibPromise = import('./VortexLib.js').then(function(mod) {
            return mod.default();
        }).then(function(lib) {
            vortexLib = lib;
            return lib;
        });
    }
    return vortexLibPromise;
}

var ledCache = window._ledPositionsCache || (window._ledPositionsCache = {});

export function getLedPositions(deviceType) {
    if (!ledCache[deviceType]) {
        ledCache[deviceType] = fetch((window.basePath || '') + '/data/' + deviceType + '-led-positions.json').then(function(r) { return r.json(); });
    }
    return ledCache[deviceType];
}

export function initLightshow() {
    var canvases = document.querySelectorAll('.lightshow-canvas');
    var circles = document.querySelectorAll('.led-circle');

    if (!canvases.length && !circles.length) return;

    var pending = new Map();

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);

            var el = entry.target;
            var key = el;

            if (pending.has(key)) return;
            pending.set(key, true);

            getVortexLib().then(function(lib) {
                pending.delete(key);
                if (el.classList.contains('lightshow-canvas')) {
                    var canvasId = el.getAttribute('id');
                    var type = el.getAttribute('data-type') || 'scrolling';
                    var tile = el.closest('.pat-tile, .mode-tile, .pat-item');
                    var options = { type: type, hoverEl: tile || el.closest('[class*="led-strip"]') || el.parentElement };
                    new Lightshow(lib, canvasId, options);
                } else if (el.classList.contains('led-circle')) {
                    var type = el.getAttribute('data-type') || 'flashing';
                    new SvgLightshow(lib, el, { type: type });
                }
            });
        });
    }, { rootMargin: '200px' });

    canvases.forEach(function(c) { observer.observe(c); });
    circles.forEach(function(c) { observer.observe(c); });
}
