import VortexLib from './VortexLib.js';
import Lightshow from './Lightshow.js';
import SvgLightshow from './SvgLightshow.js';

export function initLightshow() {
    return VortexLib().then(vortexLib => {
        const tiles = document.querySelectorAll('.lightshow-canvas');
        tiles.forEach(canvas => {
            const canvasId = canvas.getAttribute('id');
            const type = canvas.getAttribute('data-type') || 'scrolling';
            const options = { type: type };
            const lightshow = new Lightshow(vortexLib, canvasId, options);
            lightshow.start();
        });

        const circles = document.querySelectorAll('.led-circle');
        circles.forEach(circle => {
            const type = circle.getAttribute('data-type') || 'flashing';
            const options = { type: type };
            const lightshow = new SvgLightshow(vortexLib, circle, options);
            lightshow.start();
        });
    });
}
