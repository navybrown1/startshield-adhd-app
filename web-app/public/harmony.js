const page = document.documentElement;
const video = document.querySelector('[data-harmony-video]');
const status = document.querySelector('[data-video-status]');
const toggle = document.querySelector('[data-motion-toggle]');

const markVideoReady = () => {
    page.classList.remove('video-fallback');
    page.classList.add('video-ready');
    if (status) status.textContent = 'Motion ready.';
};

const markVideoUnavailable = () => {
    if (page.classList.contains('video-ready')) return;
    page.classList.add('video-fallback');
    if (status) status.textContent = 'Using calm fallback background.';
};

if (video) {
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('playing', markVideoReady, { once: true });
    video.addEventListener('canplay', markVideoReady, { once: true });
    video.addEventListener('loadeddata', markVideoReady, { once: true });
    video.addEventListener('error', markVideoUnavailable, { once: true });
    video.querySelectorAll('source').forEach((source) => {
        source.addEventListener('error', markVideoUnavailable, { once: true });
    });

    const startPlayback = () => {
        video.load();
        const playback = video.play();
        if (playback && typeof playback.catch === 'function') {
            playback.catch(() => {
                if (status) status.textContent = 'Tap resume motion to begin video.';
            });
        }
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
    }, 8000);
}

if (toggle && video) {
    toggle.addEventListener('click', () => {
        const paused = page.classList.toggle('motion-paused');
        toggle.setAttribute('aria-pressed', String(paused));
        toggle.textContent = paused ? 'Resume motion' : 'Pause motion';

        if (paused) {
            video.pause();
        } else {
            const playback = video.play();
            if (playback && typeof playback.catch === 'function') {
                playback.catch(() => {
                    if (status) status.textContent = 'Motion is waiting for browser permission.';
                });
            }
        }
    });
}
