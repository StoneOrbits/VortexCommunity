import VortexLib from './VortexLib.js';
import Lightshow from './Lightshow.js';
import SvgLightshow from './SvgLightshow.js';

const vortexLibPromise = VortexLib();

export function getLedPositions(deviceType) {
    const cache = window._ledPositionsCache || (window._ledPositionsCache = {});
    if (!cache[deviceType]) {
        cache[deviceType] = fetch((window.basePath || '') + `/data/${deviceType}-led-positions.json`).then(r => r.json());
    }
    return cache[deviceType];
}

export function initLightshow() {
    return vortexLibPromise.then(vortexLib => {
        const tiles = document.querySelectorAll('.lightshow-canvas');
        tiles.forEach(canvas => {
            const canvasId = canvas.getAttribute('id');
            const type = canvas.getAttribute('data-type') || 'scrolling';
            const options = { type: type };
            new Lightshow(vortexLib, canvasId, options);
        });

        const circles = document.querySelectorAll('.led-circle');
        circles.forEach(circle => {
            const type = circle.getAttribute('data-type') || 'flashing';
            const options = { type: type };
            new SvgLightshow(vortexLib, circle, options);
        });
    });
}
