import { initLightshow, getLedPositions } from './initLightshow.js';
initLightshow();

const modeDataContainer = document.getElementById('mode-data-container');
const mode = JSON.parse(modeDataContainer.getAttribute('data-mode'));
const vortexMode = JSON.parse(modeDataContainer.getAttribute('data-vortex-mode'));

function patternsEqual(pat1, pat2) {
  return JSON.stringify(pat1) === JSON.stringify(pat2);
}

function findPatternsForLed(ledIndex) {
  const pat = vortexMode.single_pats[ledIndex];
  const matches = [];
  document.querySelectorAll('.pat-item-submission').forEach(item => {
    const idx = parseInt(item.dataset.index);
    if (patternsEqual(vortexMode.single_pats[idx], pat)) {
      matches.push(item);
    }
  });
  return matches;
}

function findLedsForPattern(patternIndex) {
  const pat = vortexMode.single_pats[patternIndex];
  const matches = [];
  document.querySelectorAll('.led-circle').forEach(circle => {
    const ledIndex = parseInt(circle.getAttribute('data-index'));
    if (patternsEqual(vortexMode.single_pats[ledIndex], pat)) {
      matches.push(circle);
    }
  });
  return matches;
}

// --- Pattern hover → blue LEDs ---
document.querySelectorAll('.pat-item-submission').forEach(item => {
  item.addEventListener('mouseover', function() {
    const index = parseInt(this.dataset.index);
    clearHighlights();
    findLedsForPattern(index).forEach(c => c.classList.add('active-highlight'));
    this.classList.add('highlighted');
  });

  item.addEventListener('mouseout', function() {
    clearHighlights();
  });

  item.addEventListener('dblclick', function() {
    const patternId = this.getAttribute('data-pattern-id');
    if (patternId) {
      window.location.href = (window.basePath || '') + '/pat/' + patternId;
    }
  });
});

// --- Pattern click → yellow LEDs ---
document.querySelectorAll('.pat-item-submission:not(.duplicate)').forEach(item => {
  item.addEventListener('click', function(e) {
    e.stopPropagation();
    const index = parseInt(this.dataset.index);

    if (this.classList.contains('selected')) {
      clearSelection();
      return;
    }

    clearSelection();
    selectPattern(index);
  });
});

// --- LED hover → blue patterns ---
// --- LED click → yellow patterns ---
const svg = document.querySelector('.device-svg');
const imageEl = svg.querySelector('image');
const src = imageEl.getAttribute('href');
const deviceTypeMatch = src.match(/\/images\/(.*?)\.svg/);
const deviceType = deviceTypeMatch ? deviceTypeMatch[1] : null;

if (deviceType) {
  const radii = { gloves: 14, orbit: 15, handle: 14, duo: 16, chromadeck: 13, spark: 14 };
  const ledSize = radii[deviceType] || 14;

  getLedPositions(deviceType).then(data => {
      if (!data) return;
      const points = data.points;
      const circles = svg.querySelectorAll('.led-circle');
      circles.forEach((circle, index) => {
        if (!points[index]) return;
        circle.setAttribute('cx', points[index].x);
        circle.setAttribute('cy', points[index].y);
        circle.setAttribute('r', ledSize);
        if (deviceType === 'orbit') {
          if (index === 3 || index === 10 || index === 17 || index === 24) {
            circle.setAttribute('r', 16);
          }
        }
        circle.setAttribute('title', points[index].name);
        circle.setAttribute('data-index', index);

        // LED hover → blue patterns + all matching LEDs
        circle.addEventListener('mouseover', function() {
          const ledIdx = parseInt(this.getAttribute('data-index'));
          clearHighlights();
          findPatternsForLed(ledIdx).forEach(p => p.classList.add('highlighted'));
          findLedsForPattern(ledIdx).forEach(c => c.classList.add('active-highlight'));
        });

        circle.addEventListener('mouseout', function() {
          clearHighlights();
        });

        // LED click → yellow patterns + all matching LEDs
        circle.addEventListener('click', function(e) {
          e.stopPropagation();
          const ledIdx = parseInt(this.getAttribute('data-index'));

          if (this.classList.contains('selected')) {
            clearSelection();
            return;
          }

          clearSelection();
          findPatternsForLed(ledIdx).forEach(p => p.classList.add('selected'));
          findLedsForPattern(ledIdx).forEach(c => c.classList.add('selected'));
        });
      });
    })
    .catch(error => {
      console.error('Error loading LED positions:', error);
    });
} else {
  console.error('Device type not found.');
}

function selectPattern(index) {
  const item = document.querySelector('.pat-item-submission[data-index="' + index + '"]');
  item.classList.remove('highlighted');
  item.classList.add('selected');
  findLedsForPattern(index).forEach(c => c.classList.add('selected'));
}

function clearHighlights() {
  document.querySelectorAll('.led-circle.active-highlight').forEach(c => c.classList.remove('active-highlight'));
  document.querySelectorAll('.pat-item-submission.highlighted').forEach(p => p.classList.remove('highlighted'));
}

function clearSelection() {
  document.querySelectorAll('.led-circle.selected').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.pat-item-submission.selected').forEach(p => p.classList.remove('selected'));
}

// Clear on background click
document.querySelector('.mode-patterns').addEventListener('click', function() {
  clearSelection();
});

document.getElementById('openOnLightshow').addEventListener('click', async (event) => {
  event.preventDefault();

  const vortexMode = JSON.parse(modeDataContainer.getAttribute('data-vortex-mode'));
  const lightshowUrl = window.LIGHTSHOWLOL_URL || 'https://lightshow.lol';
  const lightshowOrigin = window.LIGHTSHOWLOL_ORIGIN || 'https://lightshow.lol';

  try {
    const channel = new BroadcastChannel('vortex-bridge');
    const found = await new Promise((resolve) => {
      const handler = (e) => {
        if (e.data.type === 'pong') {
          channel.removeEventListener('message', handler);
          resolve(true);
        }
      };
      channel.addEventListener('message', handler);
      channel.postMessage({ type: 'ping' });
      setTimeout(() => {
        channel.removeEventListener('message', handler);
        resolve(false);
      }, 300);
    });

    if (found) {
      channel.postMessage({ type: 'importMode', data: vortexMode });
      channel.close();
      const w = window.open('', 'lightshowTab');
      if (w) w.focus();
      return;
    }
    channel.close();
  } catch (e) {
    console.log('BroadcastChannel not available, falling back to postMessage');
  }

  const modeDataEncoded = btoa(JSON.stringify(vortexMode));
  const lightshowWindow = window.open(lightshowUrl, '_blank');
  if (!lightshowWindow) {
    console.error('Popup blocked! Allow popups for this site.');
    return;
  }
  lightshowWindow.focus();

  const sendMessageInterval = setInterval(() => {
    try {
      lightshowWindow.postMessage(
        { type: 'mode', data: modeDataEncoded },
        lightshowOrigin
      );
      clearInterval(sendMessageInterval);
    } catch (error) {
      console.error('Error sending postMessage:', error);
    }
  }, 500);

  setTimeout(() => clearInterval(sendMessageInterval), 5000);
});
