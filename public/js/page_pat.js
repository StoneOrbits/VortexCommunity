import { initLightshow } from './initLightshow.js';
initLightshow();

document.getElementById('openOnLightshow').addEventListener('click', (event) => {
  event.preventDefault();

  const patDataContainer = document.getElementById('pat-data-container');
  const patDataEncoded = btoa(patDataContainer.getAttribute('data-pat'));

  const lightshowWindow = window.open('https://lightshow.lol', 'lightshowTab');
  lightshowWindow.focus();

  const sendMessageInterval = setInterval(() => {
    try {
      lightshowWindow.postMessage(
        { type: 'pattern', data: patDataEncoded },
        'https://lightshow.lol'
      );
      console.log('Sent data to lightshowTab');
      clearInterval(sendMessageInterval); // Stop retrying
    } catch (error) {
      console.error('Error sending postMessage:', error);
    }
  }, 500);

  setTimeout(() => clearInterval(sendMessageInterval), 5000);
});
