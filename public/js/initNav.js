function toggleDropdown(event) {
    event.preventDefault();
    const parentLi = event.currentTarget.parentElement;
    parentLi.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', function () {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    hamburger.addEventListener('click', function () {
        navMenu.classList.toggle('active');
    });

    // Initialize dropdowns as closed
    const dropdowns = document.querySelectorAll('nav ul > li > ul.dropdown');
    dropdowns.forEach(function (dropdown) {
        dropdown.style.display = 'none';
    });

    const dropdownToggles = document.querySelectorAll('nav ul > li > a[href="#"]');
    dropdownToggles.forEach(function (toggle) {
        toggle.addEventListener('click', function (event) {
            event.preventDefault();
            const parentLi = event.currentTarget.parentElement;
            const dropdown = parentLi.querySelector('.dropdown');
            if (parentLi.classList.contains('open')) {
                parentLi.classList.remove('open');
                dropdown.style.display = 'none';
            } else {
                parentLi.classList.add('open');
                dropdown.style.display = 'block';
            }
        });
    });
});

