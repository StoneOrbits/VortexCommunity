import { initLightshow, getLedPositions } from './initLightshow.js';

let PAGE_SIZE = parseInt(document.getElementById('per-page-select')?.value) || 40;
let currentPage = 1;

const checkboxes = document.querySelectorAll('input[name="device"]');
const modesList = document.getElementById('modes-list');
const allTiles = Array.from(document.querySelectorAll('.mode-tile'));

function getPerPage() {
    const sel = document.getElementById('per-page-select') || document.getElementById('per-page-select-bottom');
    return sel ? parseInt(sel.value) : 40;
}

function syncPerPage(value) {
    document.getElementById('per-page-select').value = value;
    document.getElementById('per-page-select-bottom').value = value;
}

function filterModes() {
    const selectedDevices = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    allTiles.forEach(tile => {
        const deviceType = tile.getAttribute('data-device-type').toLowerCase();
        tile._visible = selectedDevices.length === 0 || selectedDevices.includes(deviceType);
    });
}

function updatePagination() {
    PAGE_SIZE = getPerPage();
    const visible = allTiles.filter(t => t._visible);
    const effectiveSize = PAGE_SIZE || visible.length;
    const pageCount = Math.ceil(visible.length / effectiveSize) || 1;
    if (currentPage > pageCount) currentPage = pageCount;

    const start = (currentPage - 1) * effectiveSize;
    const end = start + effectiveSize;
    const visibleOnPage = visible.slice(start, end);

    allTiles.forEach(tile => {
        tile.style.display = visibleOnPage.includes(tile) ? '' : 'none';
    });

    if (pageCount <= 1) {
        ['pagination-container', 'pagination-container-top'].forEach(id => {
            const c = document.getElementById(id);
            if (c) c.innerHTML = '';
        });
        return;
    }

    let html = '<ul class="pagination">';

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

    html += '</ul>';

    ['pagination-container', 'pagination-container-top'].forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;
        container.innerHTML = html;
        container.querySelectorAll('a[data-page]').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                currentPage = parseInt(a.getAttribute('data-page'), 10);
                updatePagination();
            });
        });
    });
}

function onFilterChange() {
    filterModes();
    currentPage = 1;
    updatePagination();
}

checkboxes.forEach(cb => cb.addEventListener('change', onFilterChange));
['per-page-select', 'per-page-select-bottom'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', function() {
        syncPerPage(this.value);
        currentPage = 1;
        updatePagination();
    });
});

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
