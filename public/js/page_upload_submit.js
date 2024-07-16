import './initLightshow.js';
document.querySelectorAll('.keep-button').forEach(button => {
  button.addEventListener('click', function() {
    const index = this.dataset.index;
    const tile = this.closest('.pat-tile');
    tile.classList.remove('duplicate');
    tile.classList.add('new');
    tile.querySelector('.duplicate-message').remove();
    this.remove();
  });
});

const patternItems = document.querySelectorAll('.pattern-item');
const deviceImage = document.querySelector('.device-image');
const patternStrip = document.querySelector('.pattern-strip');

patternItems.forEach(item => {
  item.addEventListener('click', function () {
    const patternName = this.querySelector('input[name="patternNames[]"]').value;
    const patternDescription = this.querySelector('textarea[name="patternDescriptions[]"]').value;
    const mainArea = document.querySelector('.mode-preview');

    mainArea.innerHTML = `
                <h3>${patternName}</h3>
                <p>${patternDescription}</p>
            `;
  });
});

// Render patterns on device image (mock implementation, update with actual logic)
patternStrip.innerHTML = `
        <div class="pattern-dot" style="left: 10%; top: 20%;"></div>
        <div class="pattern-dot" style="left: 30%; top: 40%;"></div>
        <div class="pattern-dot" style="left: 50%; top: 60%;"></div>
    `;
