import { initLightshow, getLedPositions } from './initLightshow.js';

let currentPage = 1;

const patsList = document.querySelector('.pat-list');
const allTiles = Array.from(document.querySelectorAll('.pat-tile'));

function getPerPage() {
    const sel = document.getElementById('per-page-select') || document.getElementById('per-page-select-bottom');
    return sel ? parseInt(sel.value) : 40;
}

function syncPerPage(value) {
    const t = document.getElementById('per-page-select');
    const b = document.getElementById('per-page-select-bottom');
    if (t) t.value = value;
    if (b) b.value = value;
}

function updatePagination() {
    const pageSize = getPerPage();
    const effectiveSize = pageSize || allTiles.length;
    const pageCount = Math.ceil(allTiles.length / effectiveSize) || 1;
    if (currentPage > pageCount) currentPage = pageCount;

    const start = (currentPage - 1) * effectiveSize;
    const end = start + effectiveSize;
    const visibleOnPage = allTiles.slice(start, end);

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

['per-page-select', 'per-page-select-bottom'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', function() {
        syncPerPage(this.value);
        currentPage = 1;
        updatePagination();
    });
});

updatePagination();

function processPatTiles() {
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
        }).catch(error => {
            console.error('Error loading LED positions:', error);
        });
    });
}

initLightshow();
processPatTiles();
