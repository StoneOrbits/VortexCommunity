import './initLightshow.js';

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

const checkboxes = document.querySelectorAll('input[name="device"]');
const searchForm = document.getElementById('search-form');
const searchInput = document.querySelector('.search-input');

checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        filterModes();
    });
});

searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    filterModes();
});

filterModes(); // Initial filter based on default state

const modeTiles = document.querySelectorAll('.mode-tile');

modeTiles.forEach(tile => {
    const modeData = JSON.parse(tile.getAttribute('data-mode'));
    //const vortexMode = JSON.parse(tile.getAttribute('data-vortex-mode'));
    const deviceImage = tile.querySelector('.upload-device-image');

    const src = deviceImage.getAttribute('src');
    const deviceTypeMatch = src.match(/\/images\/(.*?)-leds\.png/);
    const deviceType = deviceTypeMatch ? deviceTypeMatch[1] : null;
    const ledSize = deviceType == 'orbit' ? 15 : 12;

    if (deviceType) {
        fetch(`/data/${deviceType}-led-positions.json`)
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

                    if (deviceType == 'orbit') {
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
    } else {
        console.error('Device type not found.');
    }
});

