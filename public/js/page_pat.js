import { initLightshow } from './initLightshow.js';
initLightshow();

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
