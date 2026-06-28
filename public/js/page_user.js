import { initLightshow } from './initLightshow.js';

function processModeTiles() {
    const modeTiles = document.querySelectorAll('.mode-tile');
    const promises = [];

    modeTiles.forEach(tile => {
        const deviceImage = tile.querySelector('.upload-device-image');
        const src = deviceImage.getAttribute('src');
        const deviceTypeMatch = src.match(/\/images\/(.*?)-leds\.png/);
        const deviceType = deviceTypeMatch ? deviceTypeMatch[1] : null;
        const ledSize = deviceType === 'orbit' ? 15 : 12;

        if (!deviceType) {
            console.error('Device type not found.');
            return;
        }

        const promise = fetch(`/data/${deviceType}-led-positions.json`)
            .then(response => response.json())
            .then(data => {
                const points = data.points;
                const originalWidth = data.original_width;
                const originalHeight = data.original_height;

                const elemW = deviceImage.offsetWidth;
                const elemH = deviceImage.offsetHeight;
                const elemAspect = elemW / elemH;
                const imgAspect = originalWidth / originalHeight;

                let renderW, renderH, offsetX, offsetY;
                if (imgAspect > elemAspect) {
                    renderW = elemW;
                    renderH = elemW / imgAspect;
                    offsetX = 0;
                    offsetY = (elemH - renderH) / 2;
                } else {
                    renderH = elemH;
                    renderW = elemH * imgAspect;
                    offsetX = (elemW - renderW) / 2;
                    offsetY = 0;
                }

                const scaleX = renderW / originalWidth;
                const scaleY = renderH / originalHeight;

                const ledPatternItems = tile.querySelectorAll('.mode-tile-preview-led-container');
                ledPatternItems.forEach((item, index) => {
                    if (!points[index]) return;

                    let x = points[index].x * scaleX + offsetX;
                    let y = points[index].y * scaleY + offsetY;
                    x -= ledSize / 2;
                    y -= ledSize / 2;

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
    });

    return Promise.all(promises);
}

processModeTiles().then(() => {
    initLightshow();
}).catch(error => {
    console.error('Error processing mode tiles:', error);
});
