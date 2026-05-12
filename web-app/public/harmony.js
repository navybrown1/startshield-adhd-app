const page = document.documentElement;
const toggle = document.querySelector('[data-motion-toggle]');

if (toggle) {
    toggle.addEventListener('click', () => {
        const paused = page.classList.toggle('motion-paused');
        toggle.setAttribute('aria-pressed', String(paused));
        toggle.textContent = paused ? 'Resume motion' : 'Pause motion';
    });
}
