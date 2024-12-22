import { initLightshow } from './initLightshow.js';
initLightshow();

document.getElementById('openOnLightshow').addEventListener('click', (event) => {
  event.preventDefault(); // Prevent default anchor click behavior

  const patDataContainer = document.getElementById('pat-data-container');
  const vortexPat = JSON.parse(patDataContainer.getAttribute('data-pat'));

  // Encode pat data to base64
  const patDataEncoded = btoa(JSON.stringify(vortexPat.data));

  // Use a named target to focus an existing tab if it exists
  const lightshowUrl = 'https://lightshow.lol';
  const lightshowWindow = window.open(lightshowUrl, 'lightshowTab'); // Use 'lightshowTab' as the unique name

  // Retry sending the message until it succeeds (up to 5 seconds)
  const sendMessageInterval = setInterval(() => {
    try {
      lightshowWindow.postMessage(
        { type: 'pattern', data: patDataEncoded },
        'https://lightshow.lol'
      );
      clearInterval(sendMessageInterval); // Stop retrying once successful
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, 500); // Retry every 500ms

  // Stop trying after 5 seconds
  setTimeout(() => clearInterval(sendMessageInterval), 5000);
});
