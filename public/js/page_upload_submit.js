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
