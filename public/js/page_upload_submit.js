import { initLightshow, getLedPositions } from './initLightshow.js';
initLightshow();

const modeDataContainer = document.getElementById('mode-data-container');
const modeData = JSON.parse(modeDataContainer.getAttribute('data-mode-data'));

const patternItems = document.querySelectorAll('.pat-item-submission');
const modeDetailPatterns = document.querySelector('.mode-detail-patterns');

patternItems.forEach(item => {
  item.addEventListener('mouseover', function() {
    const index = this.dataset.index;
    highlightPattern(index);
  });
});

const newItems = document.querySelectorAll('.pat-item-submission:not(.duplicate)');
newItems.forEach(item => {
  item.addEventListener('click', function(e) {
    e.stopPropagation();
    const index = this.dataset.index;
    selectPattern(index);
  });
});

if (modeDetailPatterns) {
  modeDetailPatterns.addEventListener('mouseleave', function() {
    document.querySelectorAll('.led-circle').forEach(c => c.classList.remove('active-highlight'));
    document.querySelectorAll('.pat-item-submission').forEach(i => i.classList.remove('highlighted'));
  });
  modeDetailPatterns.addEventListener('click', function() {
    document.querySelectorAll('.led-circle').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.pat-item-submission').forEach(i => i.classList.remove('selected'));
  });
}

const patternNameField = document.getElementById('pattern-name');
const patternDescriptionField = document.getElementById('pattern-description');

patternNameField.addEventListener('input', updatePatternData);
patternDescriptionField.addEventListener('input', updatePatternData);

function updatePatternData() {
  const selectedPatternElement = document.querySelector('.pat-item-submission.selected');
  if (!selectedPatternElement) return;

  const selectedPatternIndex = selectedPatternElement.dataset.index;

  if (selectedPatternIndex !== undefined) {
    modeData.patNames[selectedPatternIndex] = patternNameField.value;
    modeData.patDescriptions[selectedPatternIndex] = patternDescriptionField.value;

    document.getElementById(`patternName-${selectedPatternIndex}`).value = patternNameField.value;
    document.getElementById(`patternDescription-${selectedPatternIndex}`).value = patternDescriptionField.value;

    const patternNameElement = selectedPatternElement.querySelector('.pat-name');
    patternNameElement.textContent = patternNameField.value || 'Unnamed Pattern';
  }
}

const svg = document.querySelector('.device-svg');
const deviceType = svg ? svg.getAttribute('data-device-type') : null;
const radii = { Gloves: 14, Orbit: 15, Handle: 14, Duo: 16, Chromadeck: 13, Spark: 14 };

if (deviceType) {
  getLedPositions(deviceType.toLowerCase()).then(data => {
    const points = data.points;
    const circles = svg.querySelectorAll('.led-circle');
    circles.forEach((circle, index) => {
      if (!points[index]) return;
      circle.setAttribute('cx', points[index].x);
      circle.setAttribute('cy', points[index].y);
      circle.setAttribute('r', radii[deviceType] || 14);
      circle.setAttribute('title', points[index].name);
      circle.setAttribute('data-index', index);
    });
  }).catch(error => {
    console.error('Error loading LED positions:', error);
  });
}

function highlightPattern(index) {
  document.querySelectorAll('.pat-item-submission').forEach(i => i.classList.remove('highlighted'));
  const patItem = document.querySelector(`.pat-item-submission[data-index="${index}"]`);
  if (patItem) patItem.classList.add('highlighted');
  highlightLEDsForPattern(index);
}

function patternsEqual(pat1, pat2) {
  return JSON.stringify(pat1) === JSON.stringify(pat2);
}

function highlightLEDsForPattern(patternIndex) {
  const pat = modeData.jsonData.modes[0].single_pats[patternIndex];
  document.querySelectorAll('.led-circle').forEach(circle => {
    const ledIndex = parseInt(circle.getAttribute('data-index'));
    if (patternsEqual(modeData.jsonData.modes[0].single_pats[ledIndex], pat)) {
      circle.classList.add('active-highlight');
    } else {
      circle.classList.remove('active-highlight');
    }
  });
}

function selectPattern(index) {
  document.querySelectorAll('.pat-item-submission').forEach(i => {
    i.classList.remove('selected');
    i.classList.remove('highlighted');
  });
  const patItem = document.querySelector(`.pat-item-submission[data-index="${index}"]`);
  if (patItem) patItem.classList.add('selected');

  patternNameField.value = modeData.patNames[index] || 'Unnamed Pattern';
  patternDescriptionField.value = '';

  document.querySelectorAll('.led-circle').forEach(circle => {
    const ledIndex = parseInt(circle.getAttribute('data-index'));
    circle.classList.remove('active-highlight');
    circle.classList.remove('selected');
    if (patternsEqual(modeData.jsonData.modes[0].single_pats[ledIndex], modeData.jsonData.modes[0].single_pats[index])) {
      circle.classList.add('selected');
    }
  });
}