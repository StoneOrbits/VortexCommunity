import VortexLib from './VortexLib.js';
import Lightshow from './Lightshow.js';

VortexLib().then(vortexLib => {
  const tiles = document.querySelectorAll('.lightshow-canvas');
  tiles.forEach(canvas => {
    // the canvas ID is on the attribute and it contains the mode ID inside of it
    const canvasId = canvas.getAttribute('id');
    const lightshow = new Lightshow(vortexLib, canvasId);
    lightshow.start();
  });
});

