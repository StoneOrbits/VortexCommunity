import { initLightshow } from './initLightshow.js';
initLightshow();

function filterPats() {
  const searchQuery = searchInput.value;

  const patTiles = document.querySelectorAll('.pat-tile');
  patTiles.forEach(tile => {
    const patName = tile.getAttribute('data-pat-name');
    const matchesSearch = !searchQuery || (patName && patName.includes(searchQuery));

    if (matchesSearch) {
      tile.style.display = 'block';
    } else {
      tile.style.display = 'none';
    }
  });
}

const searchInput = document.querySelector('.search-input');
const searchForm = document.getElementById('search-form');

searchInput.addEventListener('input', function() {
  filterPats();
});

searchForm.addEventListener('submit', function(e) {
  e.preventDefault();
  filterPats();
});

filterPats(); // Initial filter based on default state


