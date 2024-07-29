import VortexLib from './VortexLib.js';
import Lightshow from './Lightshow.js';

export function initLightshow() {
    return VortexLib().then(vortexLib => {
        const tiles = document.querySelectorAll('.lightshow-canvas');
        tiles.forEach(canvas => {
            // the canvas ID is on the attribute and it contains the pat ID inside of it
            const canvasId = canvas.getAttribute('id');
            const type = canvas.getAttribute('data-type') || 'scrolling'; // Default to 'scrolling' if no type is provided
            const options = { type: type };
            const lightshow = new Lightshow(vortexLib, canvasId, options);
            lightshow.start();
        });
    });
}
