import './initLightshow.js';

// Event listener for pattern items
const patternItems = document.querySelectorAll('.pat-item-submission:not(.duplicate)');
const modeDetails = document.querySelector('.mode-details');

patternItems.forEach(item => {
  item.addEventListener('click', function() {
    const index = this.dataset.index;
    const patName = this.querySelector('.pat-name').innerText;
    const patDescription = this.querySelector('.pat-description-input')?.value || '';

    document.getElementById('pattern-name').value = patName;
    document.getElementById('pattern-description').value = patDescription;

    // Highlight the selected item
    document.querySelectorAll('.pat-item-submission').forEach(i => i.classList.remove('selected'));
    this.classList.add('selected');
  });
});


const deviceImage = document.querySelector('.upload-device-image');
const src = deviceImage.getAttribute('src');
const deviceTypeMatch = src.match(/\/images\/(.*?)-leds\.png/);
const deviceType = deviceTypeMatch ? deviceTypeMatch[1] : null;
const ledSize = 22;
if (deviceType) {
  // Function to load LED points from JSON and render lightshows
  fetch(`/data/${deviceType}-led-positions.json`)
    .then(response => response.json())
    .then(data => {
      const points = data["points"];
      const originalWidth = data["original_width"];
      const originalHeight = data["original_height"];

      // Get the actual dimensions of the device image
      const actualWidth = deviceImage.offsetWidth;
      const actualHeight = deviceImage.offsetHeight;

      // Calculate the scaling factors
      const scaleX = actualWidth / originalWidth;
      const scaleY = actualHeight / originalHeight;

      const ledPatternItems = document.querySelectorAll('.submission-preview-led-strip-container');
      ledPatternItems.forEach((item, index) => {
        if (!points[index]) {
          return;
        }
        // adjust for led circle size
        points[index].x -= (ledSize / 2);
        points[index].y -= (ledSize / 2);
        // scale the points
        points[index].x *= scaleX;
        points[index].y *= scaleY;
        const canvas = item.querySelector('.lightshow-canvas');
        console.log(canvas.width);
        item.style.position = 'absolute'; // Ensure the canvas has absolute positioning
        item.style.left = `${points[index].x}px`; // Set left position with scaling
        item.style.top = `${points[index].y}px`; // Set top position with scaling
        item.setAttribute('title', points[index].name);
      });
    })
    .catch(error => {
      console.error('Error loading LED positions:', error);
    });
} else {
  console.error('Device type not found.');
}
