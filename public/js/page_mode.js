import { initLightshow, getLedPositions } from './initLightshow.js';
initLightshow();

const modeDataContainer = document.getElementById('mode-data-container');
const mode = JSON.parse(modeDataContainer.getAttribute('data-mode'));
const vortexMode = JSON.parse(modeDataContainer.getAttribute('data-vortex-mode'));

const patternItems = document.querySelectorAll('.pat-item-submission');

patternItems.forEach(item => {
  item.addEventListener('mouseover', function() {
    const index = this.dataset.index;
    highlightPattern(index);
  });

  item.addEventListener('dblclick', function() {
    const patternId = item.getAttribute('data-pattern-id');
    if (patternId) {
      window.location.href = (window.basePath || '') + `/pat/${patternId}`;
    }
  });
});

const newItems = document.querySelectorAll('.pat-item-submission:not(.duplicate)');
newItems.forEach(item => {
  item.addEventListener('click', function() {
    event.stopPropagation();
    const index = this.dataset.index;
    selectPattern(index);
  });
});

const modePatternsContainer = document.querySelector('.mode-patterns');
modePatternsContainer.addEventListener('mouseleave', function() {
  const circles = document.querySelectorAll('.led-circle');
  circles.forEach(circle => {
    circle.classList.remove('active-highlight');
  });
  const highlights2 = document.querySelectorAll('.highlighted');
  highlights2.forEach(highlight => {
    highlight.classList.remove('highlighted');
  });
});
modePatternsContainer.addEventListener('click', function() {
  const circles = document.querySelectorAll('.led-circle');
  circles.forEach(circle => {
    circle.classList.remove('selected');
  });
});

const svg = document.querySelector('.device-svg');
const imageEl = svg.querySelector('image');
const src = imageEl.getAttribute('href');
const deviceTypeMatch = src.match(/\/images\/(.*?)\.svg/);
const deviceType = deviceTypeMatch ? deviceTypeMatch[1] : null;

if (deviceType) {
  const radii = { gloves: 14, orbit: 15, handle: 14, duo: 16, chromadeck: 13, spark: 14 };
  const ledSize = radii[deviceType] || 14;

  getLedPositions(deviceType).then(data => {
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
      });
    })
    .catch(error => {
      console.error('Error loading LED positions:', error);
    });
} else {
  console.error('Device type not found.');
}

function highlightPattern(index) {
  const modeDataContainer = document.getElementById('mode-data-container');
  const mode = JSON.parse(modeDataContainer.getAttribute('data-mode'));

  document.querySelectorAll('.pat-item-submission').forEach(i => i.classList.remove('highlighted'));
  const patItem = document.querySelector(`.pat-item-submission[data-index="${index}"]`);
  patItem.classList.add('highlighted');

  const patternIndex = patItem.getAttribute('data-index')

  highlightLEDs(patternIndex);
}

function patternsEqual(pat1, pat2) {
  return JSON.stringify(pat1) === JSON.stringify(pat2);
}

function highlightLEDs(patternIndex) {
  const pat = vortexMode.single_pats[patternIndex];
  const circles = document.querySelectorAll('.led-circle');

  circles.forEach(circle => {
    const ledIndex = parseInt(circle.getAttribute('data-index'));
    if (patternsEqual(vortexMode.single_pats[ledIndex], pat)) {
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
  document.querySelector(`.pat-item-submission[data-index="${index}"]`).classList.add('selected');

  const modeDataContainer = document.getElementById('mode-data-container');
  const mode = JSON.parse(modeDataContainer.getAttribute('data-mode'));

  const ledPatternOrderIndex = mode.ledPatternOrder.indexOf(parseInt(index, 10));

  const circles = document.querySelectorAll('.led-circle');
  circles.forEach(circle => {
    const ledIndex = parseInt(circle.getAttribute('data-index'));
    circle.classList.remove('active-highlight');
    circle.classList.remove('selected');

    if (patternsEqual(vortexMode.single_pats[ledIndex], vortexMode.single_pats[ledPatternOrderIndex])) {
      circle.classList.add('selected');
    }
  });
}

document.getElementById('openOnLightshow').addEventListener('click', async (event) => {
  event.preventDefault();

  const modeDataContainer = document.getElementById('mode-data-container');
  const vortexMode = JSON.parse(modeDataContainer.getAttribute('data-vortex-mode'));

  const lightshowUrl = window.LIGHTSHOWLOL_URL || 'https://lightshow.lol';
  const lightshowOrigin = window.LIGHTSHOWLOL_ORIGIN || 'https://lightshow.lol';

  // Try BroadcastChannel first (same-origin cross-tab communication)
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
      return;
    }
    channel.close();
  } catch (e) {
    console.log('BroadcastChannel not available, falling back to postMessage');
  }

  // Fallback: BroadcastChannel not available (cross-origin dev) — open new tab
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
