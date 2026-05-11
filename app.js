let timer = null;
let timeLeft = 25 * 60;
let totalTime = 25 * 60;
let isBreak = false;

const hasElectronBridge = Boolean(window.electronAPI);
const STORAGE_KEYS = {
    sessionCount: 'sessionCount',
    currentTask: 'currentTask',
    apiKey: 'mistralApiKey',
    settings: 'startshieldSettings',
    stats: 'startshieldStats'
};

const DEFAULT_SETTINGS = {
    theme: 'dark',
    soundEnabled: true,
    ambientSound: 'none',
    ambientVolume: 50,
    notificationsEnabled: true,
    breakReminders: true
};

const DEFAULT_STATS = {
    totalSessions: 0,
    totalFocusMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    level: 1,
    xp: 0,
    badges: [],
    sessionsToday: 0,
    lastSessionDate: null,
    sessionHistory: []
};

const BADGE_LABELS = {
    first_session: 'First Session',
    dedicated_10: 'Dedicated 10',
    master_50: 'Master 50',
    streak_3: '3 Day Streak',
    streak_7: 'Week Warrior',
    streak_30: 'Month Master',
    level_5: 'Level 5 Achiever',
    level_10: 'Level 10 Expert'
};

let sessionCount = parseInt(localStorage.getItem(STORAGE_KEYS.sessionCount) || '0', 10);
let currentSettings = loadLocalSettings();

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

sessionCountDisplay.textContent = sessionCount;

function getTodayKey() {
    return new Date().toDateString();
}

function loadLocalSettings() {
    try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}') };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function saveLocalSettings(settings) {
    currentSettings = { ...DEFAULT_SETTINGS, ...settings };
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(currentSettings));
}

function loadLocalStats() {
    try {
        return { ...DEFAULT_STATS, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.stats) || '{}') };
    } catch {
        return { ...DEFAULT_STATS };
    }
}

function saveLocalStats(stats) {
    localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
}

function cleanAiText(text) {
    return String(text || '')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s*>\s?/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '• ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
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

function playNotificationSound() {
    if (!currentSettings.soundEnabled) return;

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
    if (!currentSettings.notificationsEnabled || typeof Notification === 'undefined') return;

    if (hasElectronBridge && window.electronAPI.sendNotification) {
        window.electronAPI.sendNotification(title, body);
        return;
    }

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

function switchMode() {
    isBreak = !isBreak;
    resetTimer();

    timerDisplay.classList.toggle('break-mode', isBreak);
    document.querySelector('.timer-wrapper').classList.toggle('break-mode', isBreak);
    modeLabel.parentElement.classList.toggle('break-mode', isBreak);

    modeLabel.textContent = isBreak ? 'Break Mode' : 'Focus Mode';
    modeToggle.textContent = isBreak ? 'Switch to Focus' : 'Switch to Break';

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
}

function resetTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    startBtn.textContent = 'Start';
}

async function recordCompletedFocusSession() {
    const activeTask = localStorage.getItem(STORAGE_KEYS.currentTask) || 'Untitled';
    const durationMinutes = Math.round(totalTime / 60);

    sessionCount += 1;
    localStorage.setItem(STORAGE_KEYS.sessionCount, String(sessionCount));
    sessionCountDisplay.textContent = sessionCount;

    if (hasElectronBridge && window.electronAPI.logFocusSession) {
        try {
            const result = await window.electronAPI.logFocusSession({ durationMinutes, task: activeTask });
            if (result && result.success) {
                renderStats(result.stats);
                showNewBadges(result.newBadges || []);
                return;
            }
        } catch (error) {
            console.log('Electron stats save failed, using browser storage instead', error);
        }
    }

    const today = getTodayKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const stats = loadLocalStats();
    stats.totalSessions += 1;
    stats.totalFocusMinutes += durationMinutes;
    stats.xp += durationMinutes * 10;
    stats.level = Math.floor(stats.xp / 500) + 1;

    if (stats.lastSessionDate === today) {
        stats.sessionsToday += 1;
    } else {
        stats.currentStreak = stats.lastSessionDate === yesterday.toDateString() ? stats.currentStreak + 1 : 1;
        stats.sessionsToday = 1;
    }

    stats.lastSessionDate = today;
    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    stats.sessionHistory = stats.sessionHistory || [];
    stats.sessionHistory.push({
        date: new Date().toISOString(),
        duration: durationMinutes,
        task: activeTask
    });
    stats.sessionHistory = stats.sessionHistory.slice(-100);

    const previousBadges = new Set(stats.badges || []);
    const earnedBadges = [];

    if (stats.totalSessions >= 1) earnedBadges.push('first_session');
    if (stats.totalSessions >= 10) earnedBadges.push('dedicated_10');
    if (stats.totalSessions >= 50) earnedBadges.push('master_50');
    if (stats.currentStreak >= 3) earnedBadges.push('streak_3');
    if (stats.currentStreak >= 7) earnedBadges.push('streak_7');
    if (stats.currentStreak >= 30) earnedBadges.push('streak_30');
    if (stats.level >= 5) earnedBadges.push('level_5');
    if (stats.level >= 10) earnedBadges.push('level_10');

    stats.badges = [...new Set([...(stats.badges || []), ...earnedBadges])];
    const newBadges = stats.badges.filter((badge) => !previousBadges.has(badge));

    saveLocalStats(stats);
    renderStats(stats);
    showNewBadges(newBadges);
}

function startTimer() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    if (timer) {
        clearInterval(timer);
        timer = null;
        startBtn.textContent = 'Start';
        return;
    }

    timer = setInterval(async () => {
        if (timeLeft > 0) {
            timeLeft -= 1;
            updateDisplay();
            return;
        }

        clearInterval(timer);
        timer = null;
        startBtn.textContent = 'Start';
        playNotificationSound();

        if (isBreak) {
            sendDesktopNotification('Break Over!', 'Time to get back to focus.');
            switchMode();
        } else {
            sendDesktopNotification('Focus Complete!', 'Great job! Time for a break.');
            await recordCompletedFocusSession();
            switchMode();
        }
    }, 1000);

    startBtn.textContent = 'Pause';
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
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    modal.classList.remove('hidden');

    if (id === 'settings-modal') {
        hydrateSettingsModal();
    }

    if (id === 'stats-modal') {
        loadAndRenderStats();
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}

async function getStoredApiKey() {
    if (hasElectronBridge && window.electronAPI.getApiKey) {
        try {
            return await window.electronAPI.getApiKey();
        } catch (error) {
            console.log('Electron API key read failed, using browser storage instead', error);
        }
    }

    return localStorage.getItem(STORAGE_KEYS.apiKey) || '';
}

async function saveStoredApiKey(apiKey) {
    if (hasElectronBridge && window.electronAPI.saveApiKey) {
        try {
            return await window.electronAPI.saveApiKey(apiKey);
        } catch (error) {
            console.log('Electron API key save failed, using browser storage instead', error);
        }
    }

    localStorage.setItem(STORAGE_KEYS.apiKey, apiKey);
    return true;
}

async function hydrateSettingsModal() {
    const apiKeyInput = document.getElementById('api-key-input');
    const themeSelect = document.getElementById('theme-select');
    const ambientSound = document.getElementById('ambient-sound');
    const ambientVolume = document.getElementById('ambient-volume');
    const volumeDisplay = document.getElementById('volume-display');
    const notificationsToggle = document.getElementById('notifications-toggle');

    if (apiKeyInput) apiKeyInput.value = await getStoredApiKey();
    if (themeSelect) themeSelect.value = currentSettings.theme;
    if (ambientSound) ambientSound.value = currentSettings.ambientSound;
    if (ambientVolume) ambientVolume.value = currentSettings.ambientVolume;
    if (volumeDisplay) volumeDisplay.textContent = `${currentSettings.ambientVolume}%`;
    if (notificationsToggle) notificationsToggle.checked = Boolean(currentSettings.notificationsEnabled);
}

async function saveApiKey() {
    const input = document.getElementById('api-key-input');
    if (!input) return;

    const apiKey = input.value.trim();
    await saveStoredApiKey(apiKey);
    showInlineStatus(input, apiKey ? 'API key saved for this browser.' : 'API key cleared.');
}

function showInlineStatus(anchorElement, message) {
    const existing = anchorElement.parentElement.querySelector('.inline-status');
    if (existing) existing.remove();

    const status = document.createElement('p');
    status.className = 'setting-hint inline-status';
    status.textContent = message;
    anchorElement.parentElement.appendChild(status);

    setTimeout(() => status.remove(), 3500);
}

function changeTheme(theme) {
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-ocean', 'theme-forest');
    document.body.classList.add(`theme-${theme}`);
    saveLocalSettings({ ...currentSettings, theme });
}

function changeAmbientSound(sound) {
    saveLocalSettings({ ...currentSettings, ambientSound: sound });
}

function changeVolume(volume) {
    const numericVolume = parseInt(volume, 10);
    const volumeDisplay = document.getElementById('volume-display');
    if (volumeDisplay) volumeDisplay.textContent = `${numericVolume}%`;
    saveLocalSettings({ ...currentSettings, ambientVolume: numericVolume });
}

async function loadAndRenderStats() {
    if (hasElectronBridge && window.electronAPI.getUserStats) {
        try {
            renderStats(await window.electronAPI.getUserStats());
            return;
        } catch (error) {
            console.log('Electron stats read failed, using browser storage instead', error);
        }
    }

    renderStats(loadLocalStats());
}

function renderStats(stats = DEFAULT_STATS) {
    const safeStats = { ...DEFAULT_STATS, ...stats };
    const levelXpBase = (safeStats.level - 1) * 500;
    const progressXp = safeStats.xp - levelXpBase;
    const progressPercent = Math.max(0, Math.min(100, (progressXp / 500) * 100));

    setText('streak-display', safeStats.currentStreak);
    setText('level-display', safeStats.level);
    setText('xp-display', safeStats.xp);
    setText('total-sessions-display', safeStats.totalSessions);
    setText('quick-streak', safeStats.currentStreak);
    setText('quick-level', safeStats.level);
    setText('level-progress-text', `${progressXp}/500 XP to next level`);

    const levelProgress = document.getElementById('level-progress');
    if (levelProgress) levelProgress.style.width = `${progressPercent}%`;

    const badgesContainer = document.getElementById('badges-container');
    if (badgesContainer) {
        badgesContainer.innerHTML = '';
        if (!safeStats.badges || safeStats.badges.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'no-badges';
            empty.textContent = 'Complete sessions to earn badges!';
            badgesContainer.appendChild(empty);
        } else {
            safeStats.badges.forEach((badge) => {
                const badgeElement = document.createElement('span');
                badgeElement.className = 'badge';
                badgeElement.title = BADGE_LABELS[badge] || badge;
                badgeElement.textContent = '🏆';
                badgesContainer.appendChild(badgeElement);
            });
        }
    }
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function showNewBadges(badges) {
    if (!badges || badges.length === 0) return;

    const notification = document.getElementById('badge-notification');
    const badgeName = document.getElementById('badge-name');
    if (!notification || !badgeName) return;

    badgeName.textContent = BADGE_LABELS[badges[0]] || badges[0];
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 4000);
}

function appendChatMessage(text, type = 'ai') {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return null;

    const message = document.createElement('div');
    message.className = `message ${type}-message`;

    const paragraph = document.createElement('p');
    paragraph.textContent = type === 'user' ? text : cleanAiText(text);
    message.appendChild(paragraph);
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
}

function handleChatKey(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    if (!chatInput) return;

    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';
    appendChatMessage(message, 'user');

    const loadingMessage = appendChatMessage('Thinking...', 'ai-loading');

    try {
        const reply = await askMistral(message);
        loadingMessage.className = 'message ai-message';
        loadingMessage.querySelector('p').textContent = cleanAiText(reply);
    } catch (error) {
        loadingMessage.className = 'message ai-error';
        loadingMessage.querySelector('p').textContent = cleanAiText(error.message);
    }
}

async function getAiSuggestion() {
    const activeTask = localStorage.getItem(STORAGE_KEYS.currentTask) || taskInput.value.trim() || 'my current task';
    const suggestionBox = document.getElementById('ai-suggestion');
    if (!suggestionBox) return;

    suggestionBox.innerHTML = '<p>Thinking...</p>';

    try {
        const reply = await askMistral(`Give me one short, practical focus tip for this task: ${activeTask}`);
        suggestionBox.innerHTML = '';

        const paragraph = document.createElement('p');
        paragraph.textContent = cleanAiText(reply);

        const button = document.createElement('button');
        button.className = 'ask-ai-btn';
        button.textContent = 'Ask Again';
        button.onclick = getAiSuggestion;

        suggestionBox.appendChild(paragraph);
        suggestionBox.appendChild(button);
    } catch (error) {
        suggestionBox.innerHTML = '';

        const paragraph = document.createElement('p');
        paragraph.textContent = cleanAiText(error.message);

        const button = document.createElement('button');
        button.className = 'ask-ai-btn';
        button.textContent = 'Try Again';
        button.onclick = getAiSuggestion;

        suggestionBox.appendChild(paragraph);
        suggestionBox.appendChild(button);
    }
}

async function askMistral(userMessage) {
    const apiKey = await getStoredApiKey();

    if (!apiKey) {
        throw new Error('Add your Mistral API key in Settings first.');
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'mistral-small-latest',
            messages: [
                {
                    role: 'system',
                    content: 'You are a concise, encouraging focus coach. Give practical ADHD-friendly advice in plain text only. Do not use Markdown, asterisks, bold syntax, headings, code formatting, or bullet markers.'
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            temperature: 0.6,
            max_tokens: 180
        })
    });

    if (!response.ok) {
        throw new Error('AI request failed. Check your API key and try again.');
    }

    const data = await response.json();
    return cleanAiText(data.choices?.[0]?.message?.content || 'I could not generate a response.');
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
    });
});

startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', reset);
modeToggle.addEventListener('click', switchMode);

setTaskBtn.addEventListener('click', () => {
    const task = taskInput.value.trim();
    if (task) {
        activeTaskDisplay.textContent = `Current Focus: ${task}`;
        taskInput.value = '';
        localStorage.setItem(STORAGE_KEYS.currentTask, task);
    }
});

taskInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        setTaskBtn.click();
    }
});

const notificationsToggle = document.getElementById('notifications-toggle');
if (notificationsToggle) {
    notificationsToggle.addEventListener('change', (event) => {
        saveLocalSettings({ ...currentSettings, notificationsEnabled: event.target.checked });
    });
}

const savedTask = localStorage.getItem(STORAGE_KEYS.currentTask);
if (savedTask) {
    activeTaskDisplay.textContent = `Current Focus: ${savedTask}`;
}

if (hasElectronBridge && window.electronAPI.onTimerUpdate) {
    window.electronAPI.onTimerUpdate((action) => {
        if (action === 'toggle') {
            startTimer();
        } else if (action === 'reset') {
            reset();
        } else if (action === 'switch') {
            switchMode();
        }
    });

    if (window.electronAPI.onOpenAiCoach) {
        window.electronAPI.onOpenAiCoach(() => openModal('ai-coach-modal'));
    }
}

changeTheme(currentSettings.theme);
loadAndRenderStats();
updateDisplay();
