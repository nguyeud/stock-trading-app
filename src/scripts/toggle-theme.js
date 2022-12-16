const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
const toggleNavLogo = document.getElementById("nav-logo");
const toggleBody = document.querySelector("body");

// Change the icons inside the button based on previous settings
if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    themeToggleLightIcon.classList.remove('hidden');
} else {
    themeToggleDarkIcon.classList.remove('hidden');
}

const themeToggleBtn = document.getElementById('theme-toggle');

themeToggleBtn.addEventListener('click', function() {

    // toggle icons inside button
    themeToggleDarkIcon.classList.toggle('hidden');
    themeToggleLightIcon.classList.toggle('hidden');

    // if set via local storage previously
    if (localStorage.getItem('color-theme')) {
        if (localStorage.getItem('color-theme') === 'light') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
            toggleNavLogo.setAttribute("src", "../../public/images/logo.png");
            toggleBody.classList.add("bg-slate-900");
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
            toggleNavLogo.setAttribute("src", "../../public/images/logo-black.png");
            toggleBody.classList.remove("bg-slate-900");
        }

    // if NOT set via local storage previously
    } else {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
            toggleNavLogo.setAttribute("src", "../../public/images/logo-black.png");
            toggleBody.classList.remove("bg-slate-900");
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
            toggleNavLogo.setAttribute("src", "../../public/images/logo.png");
            toggleBody.classList.add("bg-slate-900");
        }
    }
    
});