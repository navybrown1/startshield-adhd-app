const page = document.documentElement;
const video = document.querySelector('[data-harmony-video]');
const status = document.querySelector('[data-video-status]');
const toggle = document.querySelector('[data-motion-toggle]');

const markVideoReady = () => {
    page.classList.add('video-ready');
    if (status) status.textContent = 'Motion ready.';
};

const markVideoUnavailable = () => {
    page.classList.add('video-ready');
    if (status) status.textContent = 'Using calm fallback background.';
};

if (video) {
    video.addEventListener('canplay', markVideoReady, { once: true });
    video.addEventListener('loadeddata', markVideoReady, { once: true });
    video.addEventListener('error', markVideoUnavailable, { once: true });

    const startPlayback = () => {
        video.play().catch(() => {
            if (status) status.textContent = 'Tap to begin soft motion.';
        });
    };

    if (document.readyState === 'complete') {
        startPlayback();
    } else {
        window.addEventListener('load', startPlayback, { once: true });
    }

    setTimeout(() => {
        if (!page.classList.contains('video-ready')) {
            markVideoUnavailable();
        }
    }, 5000);
}

if (toggle && video) {
    toggle.addEventListener('click', () => {
        const paused = page.classList.toggle('motion-paused');
        toggle.setAttribute('aria-pressed', String(paused));
        toggle.textContent = paused ? 'Resume motion' : 'Pause motion';

        if (paused) {
            video.pause();
        } else {
            video.play().catch(() => {
                if (status) status.textContent = 'Motion is waiting for browser permission.';
            });
        }
    });
}
