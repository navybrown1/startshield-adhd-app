const page = document.documentElement;
const video = document.querySelector('[data-harmony-video]');
const toggle = document.querySelector('[data-motion-toggle]');

const markVideoReady = () => {
    page.classList.add('video-ready');
};

if (video) {
    video.muted = true;
    video.playsInline = true;

    if (video.readyState >= 2) {
        markVideoReady();
    } else {
        video.addEventListener('loadeddata', markVideoReady, { once: true });
        video.addEventListener('canplay', markVideoReady, { once: true });
    }

    const startPlayback = () => {
        const playback = video.play();
        if (playback && typeof playback.catch === 'function') {
            playback.catch(() => {});
        }
    };

    startPlayback();
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
                playback.catch(() => {});
            }
        }
    });
}
