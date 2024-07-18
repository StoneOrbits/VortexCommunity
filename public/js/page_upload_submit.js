import './initLightshow.js';

// Event listener for pattern items
const patternItems = document.querySelectorAll('.pat-item-submission:not(.duplicate)');
const modeDetails = document.querySelector('.mode-details');

patternItems.forEach(item => {
  item.addEventListener('click', function() {
    const index = this.dataset.index;
    const patName = this.querySelector('.pat-name').innerText;
    const patDescription = this.querySelector('.pat-description-input')?.value || '';

    document.getElementById('pattern-name').value = patName;
    document.getElementById('pattern-description').value = patDescription;

    // Highlight the selected item
    document.querySelectorAll('.pat-item-submission').forEach(i => i.classList.remove('selected'));
    this.classList.add('selected');
  });
});

// Render patterns on device image (mock implementation, update with actual logic)
const patternStrip = document.querySelector('.pattern-strip');
patternStrip.innerHTML = `
  <div class="pattern-dot" style="left: 10%; top: 20%;"></div>
  <div class="pattern-dot" style="left: 30%; top: 40%;"></div>
  <div class="pattern-dot" style="left: 50%; top: 60%;"></div>
`;

