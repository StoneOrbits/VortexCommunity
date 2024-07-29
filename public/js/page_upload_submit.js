import './initLightshow.js';

const modeDataContainer = document.getElementById('mode-data-container');
const modeData = JSON.parse(modeDataContainer.getAttribute('data-mode-data'));

// Event listener for pattern items
const patternItems = document.querySelectorAll('.pat-item-submission');
const modeDetails = document.querySelector('.mode-details');

patternItems.forEach(item => {
  item.addEventListener('mouseover', function() {
    const index = this.dataset.index;
    highlightPattern(index);
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

const patternNameField = document.getElementById('pattern-name');
const patternDescriptionField = document.getElementById('pattern-description');

patternNameField.addEventListener('input', updatePatternData);
patternDescriptionField.addEventListener('input', updatePatternData);

function updatePatternData() {
  const selectedPatternElement = document.querySelector('.pat-item-submission.selected');
  if (!selectedPatternElement) return;

  const selectedPatternIndex = selectedPatternElement.dataset.index;

  if (selectedPatternIndex !== undefined) {
    // FIX HERE: TODO
    modeData.patNames[selectedPatternIndex] = patternNameField.value;
    modeData.patDescriptions[selectedPatternIndex] = patternDescriptionField.value;

    // Update the hidden input fields
    document.getElementById(`patternName-${selectedPatternIndex}`).value = patternNameField.value;
    document.getElementById(`patternDescription-${selectedPatternIndex}`).value = patternDescriptionField.value;

    // Update the name in the left list
    const patternNameElement = selectedPatternElement.querySelector('.pat-name');
    patternNameElement.textContent = patternNameField.value || 'Unnamed Pattern';
  }
}

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

// highlights patterns based on the index in the uniques list
function highlightPattern(index) {
  // Get the mode data from the data attribute
  const modeDataContainer = document.getElementById('mode-data-container');
  const mode = JSON.parse(modeDataContainer.getAttribute('data-mode'));

  // Highlight the selected item
  document.querySelectorAll('.pat-item-submission').forEach(i => i.classList.remove('highlighted'));
  const patItem = document.querySelector(`.pat-item-submission[data-index="${index}"]`);
  patItem.classList.add('highlighted');
  
  // get the index into the 'real pattern list' (ie the mode's list of patterns)
  const patternIndex = patItem.getAttribute('data-index')

  // Highlight LEDs that use the selected pattern
  highlightLEDsForPattern(patternIndex);
}

function patternsEqual(pat1, pat2) {
  return JSON.stringify(pat1) === JSON.stringify(pat2);
}

// highlights all the leds for the given pattern by comparing (no ledPatternMap)
function highlightLEDsForPattern(patternIndex) {
  const pat = modeData.jsonData.modes[0].single_pats[patternIndex];
  const highlights = document.querySelectorAll('.highlight');

  highlights.forEach(highlight => {
    const ledIndex = parseInt(highlight.getAttribute('data-index'));
    if (patternsEqual(modeData.jsonData.modes[0].single_pats[ledIndex], pat)) {
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

  const patternNameField = document.getElementById('pattern-name');
  const patternDescriptionField = document.getElementById('pattern-description');

  const patternName = modeData.patNames[index] || 'Unnamed Pattern';
  const patternDescription = '';

  // Update the pattern name and description fields
  patternNameField.value = patternName;
  patternDescriptionField.value = patternDescription;

  const highlights = document.querySelectorAll('.submission-preview-highlight-container');
  highlights.forEach(highlight => {
    const ledIndex = parseInt(highlight.getAttribute('data-index'));
    highlight.classList.remove('active-highlight');
    highlight.classList.remove('selected');

    if (patternsEqual(modeData.jsonData.modes[0].single_pats[ledIndex], modeData.jsonData.modes[0].single_pats[index])) {
      highlight.classList.add('selected');
    }
  });
}

