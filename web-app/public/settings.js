/* StartShield — Settings page */

let ambientAudio = null;
let toastTimer   = null;
let sessionApiKey = '';

// ── Storage helpers ────────────────────────────────────────
function getStorageValue(key, fallback = '') {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch { return fallback; }
}
function setStorageValue(key, value) {
    try { localStorage.setItem(key, String(value)); return true; }
    catch { return false; }
}

// ── Toast ──────────────────────────────────────────────────
function showToast(msg, duration = 2600) {
    const el = document.getElementById('app-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

// ── Theme ──────────────────────────────────────────────────
function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
}

function changeTheme(theme) {
    applyTheme(theme);
    setStorageValue('theme', theme);
    showToast(`Theme set to ${theme}.`);
}

// ── Ambient sound ──────────────────────────────────────────
const soundFiles = {
    rain: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf09a.mp3',
    cafe: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3',
    'white-noise': 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_c610232532.mp3',
    forest: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_07d7e50e9e.mp3'
};

function changeAmbientSound(sound) {
    if (ambientAudio) { ambientAudio.pause(); ambientAudio = null; }
    if (sound !== 'none') {
        ambientAudio = new Audio(soundFiles[sound]);
        ambientAudio.loop   = true;
        ambientAudio.volume = document.getElementById('ambient-volume').value / 100;
        ambientAudio.play().catch(() => {});
    }
    setStorageValue('ambientSound', sound);
    showToast(sound === 'none' ? 'Sound off.' : `Ambient sound: ${sound}.`);
}

function changeVolume(value) {
    const display = document.getElementById('volume-display');
    if (display) display.textContent = `${value}%`;
    if (ambientAudio) ambientAudio.volume = value / 100;
    setStorageValue('ambientVolume', value);
}

// ── API key ────────────────────────────────────────────────
function saveApiKey() {
    const input = document.getElementById('api-key-input');
    const key   = input.value.trim();
    if (key && (key.length < 16 || /\s/.test(key))) {
        showToast('That key format looks wrong — please check and try again.');
        return;
    }
    sessionApiKey = key;
    showToast(key ? 'Key saved for this session.' : 'Key cleared.');
}

// ── Notifications toggle ───────────────────────────────────
const notifToggle = document.getElementById('notifications-toggle');
if (notifToggle) {
    notifToggle.addEventListener('change', () => {
        const enabled = notifToggle.checked;
        notifToggle.setAttribute('aria-checked', String(enabled));
        setStorageValue('notificationsEnabled', enabled ? 'true' : 'false');
        showToast(enabled ? 'Notifications on.' : 'Notifications off.');
    });
}

// ── Hydrate from storage ───────────────────────────────────
(function hydrate() {
    const theme  = getStorageValue('theme', 'light');
    const sound  = getStorageValue('ambientSound', 'none');
    const volume = getStorageValue('ambientVolume', '50');
    const notifs = getStorageValue('notificationsEnabled', 'true') !== 'false';

    applyTheme(theme);

    const themeEl = document.getElementById('theme-select');
    if (themeEl) themeEl.value = theme;

    const soundEl = document.getElementById('ambient-sound');
    if (soundEl) soundEl.value = sound;

    const volEl = document.getElementById('ambient-volume');
    if (volEl) { volEl.value = volume; }

    const volDisplay = document.getElementById('volume-display');
    if (volDisplay) volDisplay.textContent = `${volume}%`;

    if (notifToggle) {
        notifToggle.checked = notifs;
        notifToggle.setAttribute('aria-checked', String(notifs));
    }
})();
