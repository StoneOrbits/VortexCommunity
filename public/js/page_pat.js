import { initLightshow } from './initLightshow.js';
initLightshow();

document.getElementById('openOnLightshow').addEventListener('click', (event) => {
  event.preventDefault();

  const patDataContainer = document.getElementById('pat-data-container');
  const patDataEncoded = btoa(patDataContainer.getAttribute('data-pat'));

  const lightshowUrl = window.LIGHTSHOWLOL_URL || 'https://lightshow.lol';
  const lightshowOrigin = window.LIGHTSHOWLOL_ORIGIN || 'https://lightshow.lol';

  const lightshowWindow = window.open(lightshowUrl, 'lightshowTab');
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
