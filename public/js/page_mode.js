import './initLightshow.js';

// Function to generate the lightshow.lol URL
function generateLightshowUrl() {
  const modeData = serializeModeData(JSON.stringify(mode));
  const baseUrl = 'https://lightshow.lol/loadMode?data=';
  return baseUrl;
}

// Setup the link on page load
const link = document.getElementById('openOnLightshow');
link.href = generateLightshowUrl();
