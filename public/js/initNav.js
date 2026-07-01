(function () {
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.querySelector('.nav-links');
  var backdrop = document.querySelector('.nav-backdrop');

  if (!toggle || !menu) return;

  function open() {
    toggle.classList.add('open');
    menu.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    toggle.classList.remove('open');
    menu.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    if (menu.classList.contains('open')) {
      close();
    } else {
      open();
    }
  });

  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', close);
  });

  if (backdrop) {
    backdrop.addEventListener('click', close);
  }
})();
