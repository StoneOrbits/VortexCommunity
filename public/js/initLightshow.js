import VortexLib from './VortexLib.js';
import Lightshow from './Lightshow.js';

VortexLib().then(vortexLib => {
  const tiles = document.querySelectorAll('.lightshow-canvas');
  tiles.forEach(canvas => {
    const canvasId = canvas.getAttribute('id');
    const lightshow = new Lightshow(vortexLib, canvasId);

    //var set = lightshow.getColorset();
    //set.clear();
    //set.addColor(new vortexLib.RGBColor(255, 0, 0));
    //set.addColor(new vortexLib.RGBColor(0, 255, 0));
    //lightshow.setColorset(set);
    //for (var i = 0; i < (Math.random() * 500); ++i) {
    //  lightshow.randomize();
    //}

    canvas.addEventListener('mouseover', () => {
      lightshow.start();
    });
    //canvas.addEventListener('click', () => {
    //  lightshow.randomize();
    //});

    canvas.addEventListener('mouseout', () => {
      lightshow.stop();
    });
  });
});
