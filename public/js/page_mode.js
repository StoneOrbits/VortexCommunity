import { initLightshow } from './initLightshow.js';
initLightshow();

const modeDataContainer = document.getElementById('mode-data-container');
const mode = JSON.parse(modeDataContainer.getAttribute('data-mode'));
const vortexMode = JSON.parse(modeDataContainer.getAttribute('data-vortex-mode'));

// Event listener for pattern items
const patternItems = document.querySelectorAll('.pat-item-submission');
const modeDetails = document.querySelector('.mode-details');

patternItems.forEach(item => {
  item.addEventListener('mouseover', function() {
    const index = this.dataset.index;
    highlightPattern(index);
  });

  item.addEventListener('dblclick', function() {
    const patternId = item.getAttribute('data-pattern-id');
    if (patternId) {
      window.location.href = `/pat/${patternId}`;
    }
  });
});

const newItems = document.querySelectorAll('.pat-item-submission:not(.duplicate)');
newItems.forEach(item => {
  // Add click event handler for non-duplicate patterns
  item.addEventListener('click', function() {
    event.stopPropagation();
    const index = this.dataset.index;
    selectPattern(index);
  });
});

// Add event listener for mouseleave on the mode patterns container
const modePatternsContainer = document.querySelector('.mode-patterns');
modePatternsContainer.addEventListener('mouseleave', function() {
  const highlights = document.querySelectorAll('.highlight');
  highlights.forEach(highlight => {
    highlight.classList.remove('active-highlight');
  });
  const highlights2 = document.querySelectorAll('.highlighted');
  highlights2.forEach(highlight => {
    highlight.classList.remove('highlighted');
  });
});
modePatternsContainer.addEventListener('click', function() {
  const highlights2 = document.querySelectorAll('.selected');
  highlights2.forEach(highlight => {
    highlight.classList.remove('selected');
  });
});

const deviceImage = document.querySelector('.upload-device-image');
const src = deviceImage.getAttribute('src');
const deviceTypeMatch = src.match(/\/images\/(.*?)-leds\.png/);
const deviceType = deviceTypeMatch ? deviceTypeMatch[1] : null;
const ledSize = deviceType == 'chromadeck' ? 21 : 'orbit' ? 28 : 26;
const highlightSize = 34;

if (deviceType) {
  fetch(`/data/${deviceType}-led-positions.json`)
    .then(response => response.json())
    .then(data => {
      const points = data.points;
      const originalWidth = data.original_width;
      const originalHeight = data.original_height;

      const actualWidth = deviceImage.offsetWidth;
      const actualHeight = deviceImage.offsetHeight;

      const scaleX = actualWidth / originalWidth;
      const scaleY = actualHeight / originalHeight;

      const ledPatternItems = document.querySelectorAll('.submission-preview-led-strip-container');
      ledPatternItems.forEach((item, index) => {
        if (!points[index]) {
          return;
        }

        let x = points[index].x;
        let y = points[index].y;
        x -= (ledSize / 2);
        y -= (ledSize / 2);
        x *= scaleX;
        y *= scaleY;
        item.style.position = 'absolute';
        item.style.left = `${x}px`;
        item.style.top = `${y}px`;
        item.style.width = `${ledSize}px`;
        item.style.height = `${ledSize}px`;

        if (deviceType == 'orbit') {
          if (index === 3 || index === 10 || index === 17 || index === 24) {
              item.style.width = '20px';
              item.style.height = '20px';
              item.style.left = `${x + 5}px`;
              item.style.top = `${y + 5}px`;
          }
          item.style.borderRadius = '50%';
        }
        if (deviceType == 'chromadeck') {
            item.style.borderRadius = '50%';
        }
        item.setAttribute('title', points[index].name);
        item.setAttribute('data-index', index);
      });
      const highlightItems = document.querySelectorAll('.submission-preview-highlight-container');
      highlightItems.forEach((item, index) => {
        if (!points[index]) {
          return;
        }
        let x = points[index].x;
        let y = points[index].y;
        x -= (highlightSize / 2);
        y -= (highlightSize / 2);
        x *= scaleX;
        y *= scaleY;
        item.style.position = 'absolute';
        item.style.left = `${x}px`;
        item.style.top = `${y}px`;
        item.style.width = `${highlightSize}px`;
        item.style.height = `${highlightSize}px`;
        if (deviceType == 'orbit') {
          item.style.borderRadius = '50%';
        }
        if (deviceType == 'chromadeck') {
            item.style.borderRadius = '50%';
        }
        item.setAttribute('title', points[index].name);
        item.setAttribute('data-index', index);
        item.classList.add('highlight'); // Ensure the highlight class is added here
      });
    })
    .catch(error => {
      console.error('Error loading LED positions:', error);
    });
} else {
  console.error('Device type not found.');
}

// NOTE: the index in mode.ejs is different from upload-submit, there they use the real index of the pattern
//       in the mode, here is the unique pattern index so we have to index the ledPatternOrder
function highlightPattern(index) {
  // Get the mode data from the data attribute
  const modeDataContainer = document.getElementById('mode-data-container');
  const mode = JSON.parse(modeDataContainer.getAttribute('data-mode'));

  // Highlight the selected item
  document.querySelectorAll('.pat-item-submission').forEach(i => i.classList.remove('highlighted'));
  const patItem = document.querySelector(`.pat-item-submission[data-index="${index}"]`);
  patItem.classList.add('highlighted');

  const patternIndex = patItem.getAttribute('data-index')

  // Highlight LEDs that use the selected pattern
  highlightLEDs(patternIndex);
}

function patternsEqual(pat1, pat2) {
  return JSON.stringify(pat1) === JSON.stringify(pat2);
}

function highlightLEDs(patternIndex) {
  const pat = vortexMode.single_pats[patternIndex];
  const highlights = document.querySelectorAll('.highlight');

  highlights.forEach(highlight => {
    const ledIndex = parseInt(highlight.getAttribute('data-index'));
    if (patternsEqual(vortexMode.single_pats[ledIndex], pat)) {
      highlight.classList.add('active-highlight');
    } else {
      highlight.classList.remove('active-highlight');
    }
  });
}

function selectPattern(index) {
  // Highlight the selected item
  document.querySelectorAll('.pat-item-submission').forEach(i => {
    i.classList.remove('selected');
    i.classList.remove('highlighted');
  });
  document.querySelector(`.pat-item-submission[data-index="${index}"]`).classList.add('selected');

  // Get the mode data from the data attribute
  const modeDataContainer = document.getElementById('mode-data-container');
  const mode = JSON.parse(modeDataContainer.getAttribute('data-mode'));

  // Find the index in ledPatternOrder that matches the provided index
  const ledPatternOrderIndex = mode.ledPatternOrder.indexOf(parseInt(index, 10));

  const highlights = document.querySelectorAll('.submission-preview-highlight-container');
  highlights.forEach(highlight => {
    const ledIndex = parseInt(highlight.getAttribute('data-index'));
    highlight.classList.remove('active-highlight');
    highlight.classList.remove('selected');

    if (patternsEqual(vortexMode.single_pats[ledIndex], vortexMode.single_pats[ledPatternOrderIndex])) {
      highlight.classList.add('selected');
    }
  });
}

document.getElementById('openOnLightshow').addEventListener('click', (event) => {
  event.preventDefault();

  const modeDataContainer = document.getElementById('mode-data-container');
  const modeDataEncoded = btoa(modeDataContainer.getAttribute('data-vortex-mode'));

  // Always open a new tab
  const lightshowWindow = window.open('https://lightshow.lol', '_blank');
  if (!lightshowWindow) {
    console.error('Popup blocked! Allow popups for this site.');
    return;
  }
  lightshowWindow.focus();

  const sendMessageInterval = setInterval(() => {
    try {
      lightshowWindow.postMessage(
        { type: 'mode', data: modeDataEncoded },
        'https://lightshow.lol'
      );
      console.log('Sent data to lightshowTab');
      clearInterval(sendMessageInterval); // Stop retrying
    } catch (error) {
      console.error('Error sending postMessage:', error);
    }
  }, 500);

  setTimeout(() => clearInterval(sendMessageInterval), 5000);                                                                                                                                                    });
