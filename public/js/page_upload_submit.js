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

if (modeDetailPatterns) {
  modeDetailPatterns.addEventListener('mouseleave', function() {
    document.querySelectorAll('.led-circle').forEach(c => c.classList.remove('active-highlight'));
    document.querySelectorAll('.pat-item-submission').forEach(i => i.classList.remove('highlighted'));
  });
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
