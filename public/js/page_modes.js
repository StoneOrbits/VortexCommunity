import { initLightshow, getLedPositions } from './initLightshow.js';

const PAGE_SIZE = 40;
let currentPage = 1;

const checkboxes = document.querySelectorAll('input[name="device"]');
const modesList = document.getElementById('modes-list');
const allTiles = Array.from(document.querySelectorAll('.mode-tile'));

function filterModes() {
    const selectedDevices = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    allTiles.forEach(tile => {
        const deviceType = tile.getAttribute('data-device-type').toLowerCase();
        tile._visible = selectedDevices.length === 0 || selectedDevices.includes(deviceType);
    });
}

function updatePagination() {
    const visible = allTiles.filter(t => t._visible);
    const pageCount = Math.ceil(visible.length / PAGE_SIZE) || 1;
    if (currentPage > pageCount) currentPage = pageCount;

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const visibleOnPage = visible.slice(start, end);

    allTiles.forEach(tile => {
        tile.style.display = visibleOnPage.includes(tile) ? '' : 'none';
    });

    const container = document.getElementById('pagination-container');
    if (pageCount <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '<div class="pagination-wrapper"><ul class="pagination">';

    if (currentPage > 1) {
        html += `<li><a href="#" data-page="${currentPage - 1}">&laquo;</a></li>`;
    } else {
        html += '<li class="disabled"><span>&laquo;</span></li>';
    }

    for (let i = 1; i <= pageCount; i++) {
        const cls = i === currentPage ? 'active' : '';
        html += `<li class="${cls}"><a href="#" data-page="${i}">${i}</a></li>`;
    }

    if (currentPage < pageCount) {
        html += `<li><a href="#" data-page="${currentPage + 1}">&raquo;</a></li>`;
    } else {
        html += '<li class="disabled"><span>&raquo;</span></li>';
    }

    html += '</ul></div>';
    container.innerHTML = html;

    container.querySelectorAll('a[data-page]').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            currentPage = parseInt(a.getAttribute('data-page'), 10);
            updatePagination();
        });
    });
}

function onFilterChange() {
    filterModes();
    currentPage = 1;
    updatePagination();
}

checkboxes.forEach(cb => cb.addEventListener('change', onFilterChange));

onFilterChange();

function processModeTiles() {
    allTiles.forEach(tile => {
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
