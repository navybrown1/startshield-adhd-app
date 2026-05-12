/* StartShield — Onboarding flow */

// ── Helpers ────────────────────────────────────────────────
function setStorageValue(key, value) {
    try { localStorage.setItem(key, String(value)); } catch {}
}
function getStorageValue(key, fallback = '') {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch { return fallback; }
}

// ── State ──────────────────────────────────────────────────
let currentStep = 0;

// ── Theme ──────────────────────────────────────────────────
(function loadTheme() {
    const t = getStorageValue('theme', 'light');
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

// ── Navigation ─────────────────────────────────────────────
function goToStep(idx) {
    const steps = document.querySelectorAll('.ob-step');
    const dots  = document.querySelectorAll('.ob-dot');

    steps.forEach((s, i) => s.classList.toggle('active', i === idx));
    dots.forEach((d, i) => {
        d.classList.toggle('active', i === idx);
        d.setAttribute('aria-current', i === idx ? 'step' : 'false');
    });

    currentStep = idx;

    // Auto-focus first interactive element in the new step
    const step = steps[idx];
    if (step) {
        const first = step.querySelector('button:not(.ob-back), input');
        if (first) requestAnimationFrame(() => first.focus());
    }
}

// ── Step 1: Friction ───────────────────────────────────────
const frictionChips = document.querySelectorAll('#friction-chips .ob-chip');
frictionChips.forEach(chip => {
    chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        chip.setAttribute('aria-pressed', String(chip.classList.contains('active')));
    });
});

function saveFriction() {
    const selected = [...frictionChips]
        .filter(c => c.classList.contains('active'))
        .map(c => c.dataset.value);
    if (selected.length) setStorageValue('obFriction', JSON.stringify(selected));
    goToStep(2);
}

// ── Step 2: Rhythm ─────────────────────────────────────────
const rhythmChips = document.querySelectorAll('#rhythm-chips .ob-chip-radio');
rhythmChips.forEach(chip => {
    chip.addEventListener('click', () => {
        rhythmChips.forEach(c => {
            c.classList.remove('active');
            c.setAttribute('aria-checked', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-checked', 'true');
    });
});

function saveRhythm() {
    const selected = document.querySelector('#rhythm-chips .ob-chip-radio.active');
    if (selected) setStorageValue('obDefaultSession', selected.dataset.value);
    goToStep(3);
}

// ── Step 3: First task ─────────────────────────────────────
function handleTaskKey(e) {
    if (e.key === 'Enter') saveFirstTask();
}

function saveFirstTask() {
    const input = document.getElementById('first-task-input');
    const task  = (input ? input.value : '').trim();
    if (task) setStorageValue('currentTask', task);
    finishOnboarding();
}

// ── Finish ─────────────────────────────────────────────────
function finishOnboarding() {
    // Mark onboarding complete using the same key the app reads
    setStorageValue('startshieldOnboardingDismissed', 'true');

    // Apply the chosen default session length to the active preset
    const defaultSession = getStorageValue('obDefaultSession', '25');
    setStorageValue('obDefaultSession', defaultSession);

    window.location.href = 'index.html';
}
