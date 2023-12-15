import VortexLib from './VortexLib.js';
import Lightshow from './Lightshow.js';

VortexLib().then(vortexLib => {
  vortexLib.Init();
  const tiles = document.querySelectorAll('.lightshow-canvas');
  tiles.forEach(canvas => {
    const canvasId = canvas.getAttribute('id');
    const lightshow = new Lightshow(vortexLib, canvasId);
    lightshow.canvas = canvas;
    lightshow.init();
    lightshow.paused = true;

    canvas.addEventListener('mouseover', () => {
      // Start animation
      if (lightshow.paused) {
        lightshow.paused = false;
        lightshow.draw();
      }
    });

    canvas.addEventListener('mouseout', () => {
      if (!lightshow.paused) {
        // Stop/pause animation
        lightshow.paused = true;
      }
    });
  });
});
