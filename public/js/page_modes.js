import { initLightshow } from './initLightshow.js';

// Function to filter modes based on selected devices and search query
function filterModes() {
    const selectedDevices = Array.from(document.querySelectorAll('input[name="device"]:checked')).map(cb => cb.value);
    const searchQuery = document.querySelector('.search-input').value.toLowerCase();

    document.querySelectorAll('.mode-tile').forEach(tile => {
        const modeTitle = tile.querySelector('.mode-tile-title').textContent.toLowerCase();
        const deviceType = tile.getAttribute('data-device-type').toLowerCase();

        const matchesSearch = !searchQuery || modeTitle.includes(searchQuery);
        const matchesDevice = selectedDevices.includes(deviceType);

        if (matchesSearch && matchesDevice) {
            tile.style.display = 'block';
        } else {
            tile.style.display = 'none';
        }
    });
}

// Set up event listeners for filtering
const checkboxes = document.querySelectorAll('input[name="device"]');
const searchForm = document.getElementById('search-form');
const searchInput = document.querySelector('.search-input');

checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', filterModes);
});

searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    filterModes();
});

filterModes(); // Initial filter based on default state

// Process each mode tile and return a promise that resolves when all tiles are processed
function processModeTiles() {
    const modeTiles = document.querySelectorAll('.mode-tile');
    const promises = [];

    modeTiles.forEach(tile => {
        const modeData = JSON.parse(tile.getAttribute('data-mode'));
        const deviceImage = tile.querySelector('.upload-device-image');

        const src = deviceImage.getAttribute('src');
        const deviceTypeMatch = src.match(/\/images\/(.*?)-leds\.png/);
        const deviceType = deviceTypeMatch ? deviceTypeMatch[1] : null;
        const ledSize = deviceType === 'orbit' ? 15 : 12;

        if (deviceType) {
            const promise = fetch(`/data/${deviceType}-led-positions.json`)
                .then(response => response.json())
                .then(data => {
                    const points = data.points;
                    const originalWidth = data.original_width;
                    const originalHeight = data.original_height;

                    const actualWidth = deviceImage.offsetWidth;
                    const actualHeight = deviceImage.offsetHeight;

                    const scaleX = actualWidth / originalWidth;
                    const scaleY = actualHeight / originalHeight;

                    const ledPatternItems = tile.querySelectorAll('.mode-tile-preview-led-container');
                    ledPatternItems.forEach((item, index) => {
                        if (!points[index]) return;

                        let x = points[index].x;
                        let y = points[index].y;
                        x -= (ledSize);
                        y -= (ledSize);
                        x *= scaleX;
                        y *= scaleY;
                        item.style.position = 'absolute';
                        item.style.left = `${x}px`;
                        item.style.top = `${y}px`;
                        item.style.width = `${ledSize}px`;
                        item.style.height = `${ledSize}px`;
                        item.style.display = 'block';

                        if (deviceType === 'orbit') {
                            if (index === 3 || index === 10 || index === 17 || index === 24) {
                                item.style.width = '10px';
                                item.style.height = '10px';
                                item.style.left = `${x + 4}px`;
                                item.style.top = `${y + 4}px`;
                            }
                            item.style.borderRadius = '50%';
                        }
                        item.setAttribute('title', points[index].name);
                        item.setAttribute('data-index', index);
                    });
                })
                .catch(error => {
                    console.error('Error loading LED positions:', error);
                });

            promises.push(promise);
        } else {
            console.error('Device type not found.');
        }
    });

    return Promise.all(promises);
}

// Process mode tiles and initialize lightshows after all tiles are processed
processModeTiles().then(() => {
    console.log('All mode tiles processed. Initializing lightshows.');
    initLightshow().then(() => {
        console.log('Lightshows initialized.');
    }).catch(error => {
        console.error('Error initializing lightshows:', error);
    });
}).catch(error => {
    console.error('Error processing mode tiles:', error);
});

