let timer = null;
let timeLeft = 25 * 60;
let totalTime = 25 * 60;
let isBreak = false;
let sessionCount = getIntFromStorage('sessionCount', 0);
let currentStreak = getIntFromStorage('currentStreak', 0);
let xpPoints = getIntFromStorage('xpPoints', 0);
let userLevel = getIntFromStorage('userLevel', 1);
let badges = JSON.parse(localStorage.getItem('badges') || '[]');
let ambientAudio = null;
let activeModalId = null;
let restoreFocusElement = null;
let toastTimer = null;
// Web mode intentionally keeps this in-memory only to avoid persistent key storage in browser storage.
let sessionApiKey = '';

const FOCUSABLE_SELECTOR = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
const DEFAULT_TOAST_DURATION = 2600;
const STORAGE = {
    onboardingDismissed: 'startshieldOnboardingDismissed'
};

function getIntFromStorage(key, fallback) {
    return parseInt(localStorage.getItem(key) || String(fallback), 10);
}

const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const taskInput = document.getElementById('task-input');
const setTaskBtn = document.getElementById('set-task-btn');
const activeTaskDisplay = document.getElementById('active-task-display');
const progressRing = document.getElementById('progress-ring');
const progressCircle = progressRing.querySelector('.progress-circle');
const modeToggle = document.getElementById('mode-toggle');
const modeLabel = document.getElementById('mode-label');
const presetBtns = document.querySelectorAll('.preset-btn');
const sessionCountDisplay = document.getElementById('session-count');
const quickStreak = document.getElementById('quick-streak');
const quickLevel = document.getElementById('quick-level');
const focusTaskOverlay = document.getElementById('focus-task-overlay');
const toastElement = document.getElementById('app-toast');
const onboardingCard = document.getElementById('onboarding-card');
const dismissOnboardingBtn = document.getElementById('dismiss-onboarding');

sessionCountDisplay.textContent = sessionCount;
updateQuickStats();
loadTheme();
loadAmbientSound();

function showToast(message, duration = DEFAULT_TOAST_DURATION) {
    if (!toastElement || !message) return;
    toastElement.textContent = message;
    toastElement.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastElement.classList.add('hidden'), duration);
}

function updateOnboardingState() {
    if (!onboardingCard) return;
    const dismissed = localStorage.getItem(STORAGE.onboardingDismissed) === 'true';
    onboardingCard.classList.toggle('hidden', dismissed || sessionCount > 0);
}

function saveTask(task, options = {}) {
    const value = (task || '').trim();
    if (!value) return false;
    localStorage.setItem('currentTask', value);
    activeTaskDisplay.textContent = `Current Focus: ${value}`;
    if (focusTaskOverlay) {
        focusTaskOverlay.textContent = value;
        focusTaskOverlay.classList.remove('hidden');
    }
    if (!options.silent) showToast('Task saved on this device.');
    return true;
}

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    updateProgress();
}

function updateProgress() {
    const percent = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percent / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
}

function updateModeUI() {
    modeLabel.textContent = isBreak ? '☕ Break Mode' : '🧠 Focus Mode';
    modeToggle.textContent = isBreak ? 'Switch to Focus' : 'Switch to Break';
}

function updateStartButtonLabel() {
    if (timer) {
        startBtn.textContent = 'Pause';
    } else if (timeLeft < totalTime) {
        startBtn.textContent = 'Resume';
    } else {
        startBtn.textContent = isBreak ? 'Start Break' : 'Start Focus';
    }
}

function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (error) {
        console.log('Audio not supported or blocked', error);
    }
}

function sendDesktopNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                new Notification(title, { body });
            }
        });
    }
}

function addXP(amount) {
    xpPoints += amount;
    const xpForNextLevel = userLevel * 500;
    if (xpPoints >= xpForNextLevel) {
        userLevel += 1;
        xpPoints -= xpForNextLevel;
        showLevelUpNotification(userLevel);
    }
    localStorage.setItem('xpPoints', xpPoints);
    localStorage.setItem('userLevel', userLevel);
    updateStatsDisplay();
    updateQuickStats();
}

function checkBadges() {
    const newBadges = [];
    if (sessionCount >= 1 && !badges.includes('first-session')) newBadges.push({ id: 'first-session', name: 'First Steps', icon: '🎯' });
    if (sessionCount >= 10 && !badges.includes('ten-sessions')) newBadges.push({ id: 'ten-sessions', name: 'Getting Serious', icon: '🔥' });
    if (sessionCount >= 50 && !badges.includes('fifty-sessions')) newBadges.push({ id: 'fifty-sessions', name: 'Focus Master', icon: '⭐' });
    if (currentStreak >= 7 && !badges.includes('week-warrior')) newBadges.push({ id: 'week-warrior', name: 'Week Warrior', icon: '💪' });
    if (currentStreak >= 30 && !badges.includes('month-master')) newBadges.push({ id: 'month-master', name: 'Month Master', icon: '🏆' });

    if (newBadges.length > 0) {
        badges.push(...newBadges.map((badge) => badge.id));
        localStorage.setItem('badges', JSON.stringify(badges));
        showBadgeNotification(newBadges[0]);
        updateStatsDisplay();
    }
}

function showBadgeNotification(badge) {
    const notification = document.getElementById('badge-notification');
    const badgeName = document.getElementById('badge-name');
    badgeName.textContent = `${badge.icon} ${badge.name}`;
    notification.classList.remove('hidden');
    showToast(`New badge unlocked: ${badge.name}`);
    setTimeout(() => notification.classList.add('hidden'), 4000);
}

function showLevelUpNotification(level) {
    showToast(`🎉 Level up! You are now level ${level}.`, 3200);
}

function updateStatsDisplay() {
    document.getElementById('streak-display').textContent = currentStreak;
    document.getElementById('level-display').textContent = userLevel;
    document.getElementById('xp-display').textContent = xpPoints;
    document.getElementById('total-sessions-display').textContent = sessionCount;

    const xpForNextLevel = userLevel * 500;
    const progress = (xpPoints / xpForNextLevel) * 100;
    document.getElementById('level-progress').style.width = `${progress}%`;
    document.getElementById('level-progress-text').textContent = `${xpPoints}/${xpForNextLevel} XP to next level`;

    const badgesContainer = document.getElementById('badges-container');
    if (badges.length === 0) {
        badgesContainer.innerHTML = '<p class="no-badges">Complete sessions to earn badges!</p>';
        return;
    }

    const allBadges = [
        { id: 'first-session', name: 'First Steps', icon: '🎯' },
        { id: 'ten-sessions', name: 'Getting Serious', icon: '🔥' },
        { id: 'fifty-sessions', name: 'Focus Master', icon: '⭐' },
        { id: 'week-warrior', name: 'Week Warrior', icon: '💪' },
        { id: 'month-master', name: 'Month Master', icon: '🏆' }
    ];

    badgesContainer.innerHTML = '<div class="badges-grid">' +
        allBadges
            .filter((badge) => badges.includes(badge.id))
            .map((badge) => `<div class="badge-item" title="${badge.name}">${badge.icon}</div>`)
            .join('') +
        '</div>';
}

function updateQuickStats() {
    quickStreak.textContent = currentStreak;
    quickLevel.textContent = userLevel;
}

function switchMode() {
    isBreak = !isBreak;
    resetTimer();
    timerDisplay.classList.toggle('break-mode', isBreak);
    document.querySelector('.timer-wrapper').classList.toggle('break-mode', isBreak);
    modeLabel.parentElement.classList.toggle('break-mode', isBreak);
    updateModeUI();

    if (isBreak) {
        const breakMinutes = (sessionCount > 0 && sessionCount % 4 === 0) ? 15 : 5;
        timeLeft = breakMinutes * 60;
        totalTime = breakMinutes * 60;
    } else {
        const activePreset = document.querySelector('.preset-btn.active');
        const focusMinutes = activePreset ? parseInt(activePreset.dataset.minutes, 10) : 25;
        timeLeft = focusMinutes * 60;
        totalTime = focusMinutes * 60;
    }

    updateDisplay();
    updateStartButtonLabel();
}

function resetTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    updateStartButtonLabel();
}

function startTimer() {
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

    saveTask(taskInput.value, { silent: true });

    if (timer) {
        clearInterval(timer);
        timer = null;
        updateStartButtonLabel();
        return;
    }

    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft -= 1;
            updateDisplay();
            return;
        }

        clearInterval(timer);
        timer = null;
        updateStartButtonLabel();
        playNotificationSound();

        if (isBreak) {
            sendDesktopNotification('Break Over!', 'Time to get back to focus.');
            switchMode();
            return;
        }

        sendDesktopNotification('Focus Complete!', 'Great job! Time for a break.');
        sessionCount += 1;
        localStorage.setItem('sessionCount', sessionCount);
        sessionCountDisplay.textContent = sessionCount;
        updateOnboardingState();

        const lastSession = localStorage.getItem('lastSessionDate');
        const today = new Date().toDateString();
        if (lastSession !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            currentStreak = lastSession === yesterday.toDateString() ? currentStreak + 1 : 1;
            localStorage.setItem('currentStreak', currentStreak);
            localStorage.setItem('lastSessionDate', today);
        }

        addXP(50);
        checkBadges();
        updateQuickStats();
        switchMode();
    }, 1000);

    updateStartButtonLabel();
}

function reset() {
    resetTimer();
    if (isBreak) {
        const breakMinutes = (sessionCount > 0 && sessionCount % 4 === 0) ? 15 : 5;
        timeLeft = breakMinutes * 60;
    } else {
        const activePreset = document.querySelector('.preset-btn.active');
        const focusMinutes = activePreset ? parseInt(activePreset.dataset.minutes, 10) : 25;
        timeLeft = focusMinutes * 60;
    }
    totalTime = timeLeft;
    updateDisplay();
    updateStartButtonLabel();
}

presetBtns.forEach((btn) => {
    btn.addEventListener('click', (event) => {
        presetBtns.forEach((button) => button.classList.remove('active'));
        event.target.classList.add('active');
        if (isBreak) switchMode();
        const minutes = parseInt(event.target.dataset.minutes, 10);
        resetTimer();
        timeLeft = minutes * 60;
        totalTime = timeLeft;
        updateDisplay();
        updateStartButtonLabel();
    });
});

startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', reset);
modeToggle.addEventListener('click', switchMode);

setTaskBtn.addEventListener('click', () => {
    const saved = saveTask(taskInput.value);
    if (saved) taskInput.value = '';
});

taskInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        const saved = saveTask(taskInput.value);
        if (saved) taskInput.value = '';
    }
});

taskInput.addEventListener('blur', () => {
    saveTask(taskInput.value, { silent: true });
});

const savedTask = localStorage.getItem('currentTask');
if (savedTask) {
    activeTaskDisplay.textContent = `Current Focus: ${savedTask}`;
    if (focusTaskOverlay) {
        focusTaskOverlay.textContent = savedTask;
        focusTaskOverlay.classList.remove('hidden');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    restoreFocusElement = document.activeElement;
    activeModalId = modalId;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    const content = modal.querySelector('.modal-content');
    if (content) content.focus();
    if (modalId === 'stats-modal') updateStatsDisplay();
    if (modalId === 'settings-modal') hydrateSettings();
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    if (activeModalId === modalId) {
        activeModalId = null;
        if (restoreFocusElement && typeof restoreFocusElement.focus === 'function') {
            restoreFocusElement.focus();
        }
        restoreFocusElement = null;
    }
}

function trapModalFocus(event) {
    if (!activeModalId) return;
    const modal = document.getElementById(activeModalId);
    if (!modal || modal.classList.contains('hidden')) return;

    if (event.key === 'Escape') {
        event.preventDefault();
        closeModal(activeModalId);
        return;
    }

    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll(FOCUSABLE_SELECTOR)].filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

function hydrateSettings() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedSound = localStorage.getItem('ambientSound') || 'none';
    const savedVolume = localStorage.getItem('ambientVolume') || '50';
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') !== 'false';

    document.getElementById('theme-select').value = savedTheme;
    document.getElementById('ambient-sound').value = savedSound;
    document.getElementById('ambient-volume').value = savedVolume;
    document.getElementById('volume-display').textContent = `${savedVolume}%`;
    document.getElementById('api-key-input').value = sessionApiKey;
    document.getElementById('notifications-toggle').checked = notificationsEnabled;
}

function saveApiKey() {
    const input = document.getElementById('api-key-input');
    const key = input.value.trim();
    sessionApiKey = key;
    showToast(key ? 'API key available for this page session only.' : 'Session API key cleared.');
}

function changeTheme(theme) {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('theme', theme);
    showToast(`Theme set to ${theme}.`);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.className = `theme-${savedTheme}`;
    document.getElementById('theme-select').value = savedTheme;
}

function changeAmbientSound(sound) {
    if (ambientAudio) {
        ambientAudio.pause();
        ambientAudio = null;
    }

    if (sound !== 'none') {
        const soundFiles = {
            rain: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf09a.mp3',
            cafe: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3',
            'white-noise': 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_c610232532.mp3',
            forest: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_07d7e50e9e.mp3'
        };
        ambientAudio = new Audio(soundFiles[sound]);
        ambientAudio.loop = true;
        ambientAudio.volume = document.getElementById('ambient-volume').value / 100;
        ambientAudio.play().catch((error) => console.log('Audio autoplay blocked:', error));
    }

    localStorage.setItem('ambientSound', sound);
    showToast(sound === 'none' ? 'Ambient sound turned off.' : `Ambient sound set to ${sound}.`);
}

function changeVolume(value) {
    document.getElementById('volume-display').textContent = `${value}%`;
    if (ambientAudio) ambientAudio.volume = value / 100;
    localStorage.setItem('ambientVolume', value);
}

function loadAmbientSound() {
    const savedSound = localStorage.getItem('ambientSound') || 'none';
    const savedVolume = localStorage.getItem('ambientVolume') || '50';
    document.getElementById('ambient-sound').value = savedSound;
    document.getElementById('ambient-volume').value = savedVolume;
    document.getElementById('volume-display').textContent = `${savedVolume}%`;
    if (savedSound !== 'none') changeAmbientSound(savedSound);
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    addMessageToChat('user', message);
    input.value = '';
    const loadingId = addMessageToChat('ai', 'Thinking...', true);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                context: {
                    task: localStorage.getItem('currentTask') || '',
                    sessionCount,
                    streak: currentStreak
                }
            })
        });

        removeMessageFromChat(loadingId);
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        addMessageToChat('ai', data.response);
    } catch (error) {
        removeMessageFromChat(loadingId);
        addMessageToChat('ai', 'Could not reach the AI coach. Try again in a moment.');
        showToast('AI coach is temporarily unavailable.');
        console.error('Chat error:', error);
    }
}

function addMessageToChat(role, content, isLoading = false) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageId = `msg-${Date.now()}`;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message${isLoading ? ' loading' : ''}`;
    messageDiv.id = messageId;
    messageDiv.innerHTML = `<p>${content}</p>`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return messageId;
}

function removeMessageFromChat(messageId) {
    const message = document.getElementById(messageId);
    if (message) message.remove();
}

function handleChatKey(event) {
    if (event.key === 'Enter') sendChatMessage();
}

async function getAiSuggestion() {
    const suggestionBox = document.getElementById('ai-suggestion');
    suggestionBox.innerHTML = '<p>Getting a fresh suggestion...</p>';
    try {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        const response = await fetch('/api/suggestion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                context: {
                    task: localStorage.getItem('currentTask') || '',
                    timeOfDay
                }
            })
        });

        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        suggestionBox.innerHTML = `<p>${data.suggestion}</p><button type="button" class="ask-ai-btn" onclick="getAiSuggestion()">Ask Again</button>`;
    } catch (error) {
        suggestionBox.innerHTML = '<p>Could not get a suggestion right now. Try again in a moment.</p><button type="button" class="ask-ai-btn" onclick="getAiSuggestion()">Try Again</button>';
        showToast('Suggestion service is currently unavailable.');
        console.error('Suggestion error:', error);
    }
}

document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
        event.preventDefault();
        startTimer();
    }
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyR') {
        event.preventDefault();
        reset();
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyA') {
        event.preventDefault();
        openModal('ai-coach-modal');
    }
});

document.addEventListener('keydown', trapModalFocus);

document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('mousedown', (event) => {
        if (event.target === modal) closeModal(modal.id);
    });
});

const notificationsToggle = document.getElementById('notifications-toggle');
if (notificationsToggle) {
    notificationsToggle.addEventListener('change', (event) => {
        localStorage.setItem('notificationsEnabled', event.target.checked ? 'true' : 'false');
        showToast(event.target.checked ? 'Notifications enabled.' : 'Notifications disabled.');
    });
}

if (dismissOnboardingBtn) {
    dismissOnboardingBtn.addEventListener('click', () => {
        localStorage.setItem(STORAGE.onboardingDismissed, 'true');
        updateOnboardingState();
    });
}

updateModeUI();
updateOnboardingState();
updateDisplay();
updateStartButtonLabel();
