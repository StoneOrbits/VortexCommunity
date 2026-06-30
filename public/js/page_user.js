import { initLightshow, getLedPositions } from './initLightshow.js';

function processModeTiles() {
    const modeTiles = document.querySelectorAll('.mode-tile');

    modeTiles.forEach(tile => {
        const svg = tile.querySelector('.device-svg');
        if (!svg) return;

        const imageHref = svg.querySelector('image').getAttribute('href');
        const deviceTypeMatch = imageHref.match(/\/images\/(.*?)\.svg/);
        const deviceType = deviceTypeMatch ? deviceTypeMatch[1] : null;

        if (!deviceType) return;

        getLedPositions(deviceType).then(data => {
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
    });
}

initLightshow();
processModeTiles();
