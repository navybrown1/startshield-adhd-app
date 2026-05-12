/* StartShield — Settings page */

// Web Audio API ambient noise generator — no CDN required
class AmbientSoundGenerator {
    constructor() { this._ctx = null; this._gain = null; this._source = null; }
    _ensureCtx() {
        if (!this._ctx || this._ctx.state === 'closed') {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
            this._gain = this._ctx.createGain();
            this._gain.connect(this._ctx.destination);
        }
        return this._ctx;
    }
    stop() {
        if (this._source) { try { this._source.stop(); } catch (e) {} this._source = null; }
        if (this._ctx) { this._ctx.close(); this._ctx = null; this._gain = null; }
    }
    setVolume(v) { if (this._gain) this._gain.gain.value = v; }
    play(type, volume) {
        this.stop();
        const ctx = this._ensureCtx();
        this._gain.gain.value = volume ?? 0.5;
        const len = 2 * ctx.sampleRate;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        if (type === 'white-noise' || type === 'rain') {
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        } else if (type === 'cafe') {
            let last = 0;
            for (let i = 0; i < len; i++) {
                const w = Math.random() * 2 - 1;
                d[i] = (last + 0.02 * w) / 1.02; last = d[i]; d[i] *= 3.5;
            }
        } else if (type === 'forest') {
            let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
            for (let i = 0; i < len; i++) {
                const w = Math.random() * 2 - 1;
                b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
                b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
                b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
                d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926;
            }
        }
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        if (type === 'rain') {
            const f = ctx.createBiquadFilter();
            f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 0.3;
            src.connect(f); f.connect(this._gain);
        } else { src.connect(this._gain); }
        if (ctx.state === 'suspended') ctx.resume();
        src.start(); this._source = src;
    }
}
const ambientGen = new AmbientSoundGenerator();

let toastTimer   = null;
let sessionApiKey = sessionStorage.getItem('mistralApiKey') || '';

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
function changeAmbientSound(sound) {
    if (sound === 'none') {
        ambientGen.stop();
    } else {
        const volume = document.getElementById('ambient-volume').value / 100;
        ambientGen.play(sound, volume);
    }
    setStorageValue('ambientSound', sound);
    showToast(sound === 'none' ? 'Sound off.' : `Ambient sound: ${sound}.`);
}

function changeVolume(value) {
    const display = document.getElementById('volume-display');
    if (display) display.textContent = `${value}%`;
    ambientGen.setVolume(value / 100);
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
    if (key) sessionStorage.setItem('mistralApiKey', key);
    else sessionStorage.removeItem('mistralApiKey');
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

    const apiKeyEl = document.getElementById('api-key-input');
    if (apiKeyEl && sessionApiKey) apiKeyEl.value = sessionApiKey;
})();
