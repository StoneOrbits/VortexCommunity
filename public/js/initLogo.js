import VortexLib from './VortexLib.js';
import LogoLightshow from './LogoLightshow.js';

const canvas = document.querySelector('.cog-canvas[data-logo]');
if (!canvas) throw new Error('Logo canvas not found');

const bp = window.basePath || '';

async function fetchRandomPat() {
  const meta = await fetch(bp + '/pats/json?page=1&pageSize=1').then(r => r.json());
  if (!meta || !meta.totalCount) return null;
  const totalPages = meta.pages || 1;
  const randPage = Math.floor(Math.random() * totalPages) + 1;
  const res = await fetch(bp + '/pats/json?page=' + randPage + '&pageSize=1');
  const data = await res.json();
  return data.data && data.data[0];
}

VortexLib().then(vortexLib => {
  const ls = new LogoLightshow(vortexLib, canvas);
  fetchRandomPat().then(pat => { if (pat) ls.loadPattern(pat); });
});
