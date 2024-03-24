import VortexLib from './VortexLib.js';
import Lightshow from './Lightshow.js';

// Example control panel object
const lightshowSettings = {
  sectionCount: 20,
  opacity: 0.4,
  speed: 1, // This could control how fast the animation frame updates or segment speed
  useSegmentOpacity: true // Whether to use segment.opacity or just 1 in fillStyle
};

// Create control panel container with styling for floating bottom left
const controlPanel = document.createElement('div');
controlPanel.id = 'lightshowControls';
controlPanel.style.position = 'fixed';
controlPanel.style.left = '0';
controlPanel.style.top = '0';
controlPanel.style.backgroundColor = 'rgba(20, 20, 20, 0.9)';
controlPanel.style.padding = '10px';
controlPanel.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
controlPanel.style.borderRadius = '5px';
controlPanel.style.zIndex = '1000'; // Ensure it floats above other content

// Section Count as a slider
const sectionCountLabel = document.createElement('label');
sectionCountLabel.htmlFor = 'sectionCount';
sectionCountLabel.innerText = 'Resolution:';
const sectionCountInput = document.createElement('input');
sectionCountInput.type = 'range';
sectionCountInput.id = 'sectionCount';
sectionCountInput.value = '20'; // default value
sectionCountInput.min = '1';
sectionCountInput.max = '100';
sectionCountInput.style.marginLeft = '10px'; // Add some spacing

// Create Opacity control
const opacityLabel = document.createElement('label');
opacityLabel.htmlFor = 'opacity';
opacityLabel.innerText = 'Opacity:';
const opacityInput = document.createElement('input');
opacityInput.type = 'range';
opacityInput.id = 'opacity';
opacityInput.value = '0.4';
opacityInput.min = '0.05';
opacityInput.max = '0.5';
opacityInput.step = '0.01';

// Create Use Segment Opacity control
const useSegmentOpacityLabel = document.createElement('label');
useSegmentOpacityLabel.htmlFor = 'useSegmentOpacity';
useSegmentOpacityLabel.innerText = 'Use Segment Opacity:';
const useSegmentOpacityInput = document.createElement('input');
useSegmentOpacityInput.type = 'checkbox';
useSegmentOpacityInput.id = 'useSegmentOpacity';
useSegmentOpacityInput.checked = true;

// Create Speed control
const speedLabel = document.createElement('label');
speedLabel.htmlFor = 'speed';
speedLabel.innerText = 'Speed:';
const speedInput = document.createElement('input');
speedInput.type = 'range';
speedInput.id = 'speed';
speedInput.value = '1'; // Default value
speedInput.min = '-10'; // Minimum speed
speedInput.max = '1'; // Maximum speed
speedInput.step = '1';
speedInput.style.marginLeft = '10px'; // Add some spacing

// Append Speed control to panel
controlPanel.appendChild(document.createElement('br')); // Line break for styling
controlPanel.appendChild(speedLabel);
controlPanel.appendChild(speedInput);
//controlPanel.appendChild(sectionCountLabel);
//controlPanel.appendChild(sectionCountInput);
controlPanel.appendChild(document.createElement('br')); // Line break for styling
controlPanel.appendChild(opacityLabel);
controlPanel.appendChild(opacityInput);
controlPanel.appendChild(document.createElement('br')); // Line break for styling
controlPanel.appendChild(useSegmentOpacityLabel);
controlPanel.appendChild(useSegmentOpacityInput);

// Append the control panel to the body or a specific container
document.body.appendChild(controlPanel); // Append to body or replace 'document.body' with a specific container selector

// Event listeners for controls
// Modify event listener for sectionCountInput as it's now a range slider
sectionCountInput.addEventListener('input', function() {
  lightshowSettings.sectionCount = parseInt(this.value, 10);
});

sectionCountInput.addEventListener('input', function() {
  lightshowSettings.sectionCount = parseInt(this.value, 10);
});

opacityInput.addEventListener('input', function() {
  lightshowSettings.opacity = parseFloat(this.value);
});

useSegmentOpacityInput.addEventListener('change', function() {
  lightshowSettings.useSegmentOpacity = this.checked;
});

speedInput.addEventListener('input', function() {
  lightshowSettings.speed = parseFloat(this.value);
});

// Initialize lightshows here as before
VortexLib().then(vortexLib => {
  const tiles = document.querySelectorAll('.lightshow-canvas');
  tiles.forEach(canvas => {
    const canvasId = canvas.getAttribute('id');
    const lightshow = new Lightshow(vortexLib, canvasId, lightshowSettings); // Ensure lightshowSettings is defined
    lightshow.start();
  });
});

