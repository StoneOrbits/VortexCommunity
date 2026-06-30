import controller from './LightshowController.js';

const panel = document.getElementById('control-panel');
const toggle = document.getElementById('control-panel-toggle');
const speedSlider = document.getElementById('control-speed');
const modeBtns = document.querySelectorAll('.control-panel-play-btn');
const previewBtns = document.querySelectorAll('.control-panel-preview-btn');

let collapsed = localStorage.getItem('controlPanelCollapsed') === 'true';

function setCollapsed(val) {
  collapsed = val;
  panel.classList.toggle('expanded', !collapsed);
  localStorage.setItem('controlPanelCollapsed', val);
}

toggle.addEventListener('click', () => setCollapsed(!collapsed));

speedSlider.addEventListener('change', () => {
  controller.updateSettings({ speed: parseInt(speedSlider.value) });
});

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    controller.updateSettings({ playMode: btn.dataset.mode });
  });
});

previewBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    previewBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    controller.updateSettings({ previewMode: btn.dataset.mode });
    document.body.classList.toggle('preview-mode-info', btn.dataset.mode === 'info');
  });
});

speedSlider.value = controller.settings.speed;
modeBtns.forEach(btn => {
  btn.classList.toggle('active', btn.dataset.mode === controller.settings.playMode);
});
previewBtns.forEach(btn => {
  btn.classList.toggle('active', btn.dataset.mode === controller.settings.previewMode);
});
document.body.classList.toggle('preview-mode-info', controller.settings.previewMode === 'info');

setCollapsed(collapsed);
