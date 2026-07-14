import { initLightshow, getLedPositions } from './initLightshow.js';
initLightshow();

function processModeTiles() {
    document.querySelectorAll('.mode-tile').forEach(tile => {
        const svg = tile.querySelector('.device-svg');
        if (!svg) return;

        const imageHref = svg.querySelector('image').getAttribute('href');
        const deviceTypeMatch = imageHref.match(/\/images\/(.*?)\.svg/);
        const deviceType = deviceTypeMatch ? deviceTypeMatch[1] : null;

        if (!deviceType) return;

        getLedPositions(deviceType).then(data => {
            if (!data) return;
            const points = data.points;
            const circles = svg.querySelectorAll('.led-circle');
            circles.forEach((circle, index) => {
                if (!points[index]) return;
                circle.setAttribute('cx', points[index].x);
                circle.setAttribute('cy', points[index].y);
                const radii = { gloves: 14, orbit: 15, handle: 14, duo: 16, chromadeck: 13, spark: 14 };
                circle.setAttribute('r', radii[deviceType] || 14);
                circle.setAttribute('title', points[index].name);
                circle.setAttribute('data-index', index);
            });
        }).catch(error => {
            console.error('Error loading LED positions:', error);
        });
    });
}

processModeTiles();

document.getElementById('openOnLightshow').addEventListener('click', async (event) => {
  event.preventDefault();

  const patDataContainer = document.getElementById('pat-data-container');
  const patData = JSON.parse(patDataContainer.getAttribute('data-pat'));

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
      channel.postMessage({ type: 'importPattern', data: patData });
      channel.close();
      const w = window.open('', 'lightshowTab');
      if (w) w.focus();
      return;
    }
    channel.close();
  } catch (e) {
    console.log('BroadcastChannel not available, falling back to postMessage');
  }

  // Fallback: BroadcastChannel not available (cross-origin dev) — open new tab
  const patDataEncoded = btoa(JSON.stringify(patData));
  const lightshowWindow = window.open(lightshowUrl, '_blank');
  if (!lightshowWindow) {
    console.error('Popup blocked! Allow popups for this site.');
    return;
  }
  lightshowWindow.focus();

  const sendMessageInterval = setInterval(() => {
    try {
      lightshowWindow.postMessage(
        { type: 'pattern', data: patDataEncoded },
        lightshowOrigin
      );
      console.log('Sent data to lightshowTab');
      clearInterval(sendMessageInterval);
    } catch (error) {
      console.error('Error sending postMessage:', error);
    }
  }, 500);

  setTimeout(() => clearInterval(sendMessageInterval), 5000);
});
