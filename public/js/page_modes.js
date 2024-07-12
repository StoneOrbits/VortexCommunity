function filterModes() {
    const selectedDevices = Array.from(document.querySelectorAll('input[name="device"]:checked')).map(cb => cb.value);
    const searchQuery = document.querySelector('.search-input').value.toLowerCase();

    document.querySelectorAll('.mode-tile').forEach(tile => {
        const modeTitle = tile.querySelector('.mode-tile-title').textContent.toLowerCase();
        const deviceType = tile.getAttribute('data-device-type').toLowerCase(); // Get the device type from the data attribute

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

