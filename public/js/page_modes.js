import { initLightshow } from './initLightshow.js';

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
    checkbox.addEventListener('change', filterModes);
});

searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    filterModes();
});

filterModes();

function processModeTiles() {
    const modeTiles = document.querySelectorAll('.mode-tile');
    const promises = [];

    modeTiles.forEach(tile => {
        const svg = tile.querySelector('.device-svg');
        if (!svg) return;

        const imageHref = svg.querySelector('image').getAttribute('href');
        const deviceTypeMatch = imageHref.match(/\/images\/(.*?)\.svg/);
        const deviceType = deviceTypeMatch ? deviceTypeMatch[1] : null;

        if (!deviceType) return;

        const promise = fetch((window.basePath || '') + `/data/${deviceType}-led-positions.json`)
            .then(response => response.json())
            .then(data => {
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
            })
            .catch(error => {
                console.error('Error loading LED positions:', error);
            });

        promises.push(promise);
    });

    return Promise.all(promises);
}

processModeTiles().then(() => {
    initLightshow();
}).catch(error => {
    console.error('Error processing mode tiles:', error);
});
